const context = typeof window !== "undefined" ? window : global;

let defer: (f: () => void) => void;
if ("requestAnimationFrame" in context) {
  defer = requestAnimationFrame.bind(context);
} else if ("setImmediate" in context) {
  defer = setImmediate.bind(context);
} else {
  defer = setTimeout.bind(context);
}

const TIME_LIFE_FRAME = 16; // 16ms === 60fps

export const P_LOWER = 1;
export const P_LOW = 3;
export const P_NORMAL = 5;
export const P_HIGH = 7;
export const P_IMPORTANT = 10;

interface IListNode {
  value: () => void;
  next: IListNode | null;
}

class LinkedList {
  private length: number;
  private head: IListNode | null;
  private last: IListNode;

  constructor() {
    this.head = null;
    this.length = 0;
  }

  public push(value: () => void) {
    const node: IListNode = {
      next: null,
      value,
    };

    if (this.length === 0) {
      this.head = node;
      this.last = node;
    } else {
      this.last.next = node;
      this.last = node;
    }

    this.length++;
  }

  public shift() {
    const currentHead = this.head as IListNode;
    const value = currentHead.value;

    this.head = currentHead.next;
    this.length--;

    return value;
  }

  public isEmpty() {
    return this.length === 0;
  }
}

const frameScheduling = () => {
  const listJobs: { [l: string]: LinkedList } = {};
  let deferScheduled = false;

  let jobsSortCached: string[];
  let jobsSortActual = false;

  const sortJobsByNumber = (jobs: object) => {
    if (!jobsSortActual) {
      jobsSortCached = Object.keys(jobs).sort(
        (left: string, right: string) => Number(left) - Number(right),
      );
      jobsSortActual = true;
    }

    return jobsSortCached;
  };

  const runDefer = () => {
    if (!deferScheduled) {
      defer(runJobs);
    }

    deferScheduled = true;
  };

  const addJob = (callback: () => void, priority: number) => {
    if (!listJobs[priority]) {
      listJobs[priority] = new LinkedList();
      jobsSortActual = false;
    }
    listJobs[priority].push(callback);
  };

  const raisingOfJob = () => {
    const keys = sortJobsByNumber(listJobs);

    for (let i = keys.length; i > 0; i--) {
      const key = keys[i - 1];

      listJobs[Number(key) + 1] = listJobs[key];
      delete listJobs[key];
    }

    jobsSortActual = false;
  };

  const runJobs = () => {
    const timeRun = Date.now();
    let keysJobs = sortJobsByNumber(listJobs);

    while (true) {
      if (!keysJobs.length || Date.now() - timeRun > TIME_LIFE_FRAME) {
        break;
      } else {
        const keyJob = keysJobs[keysJobs.length - 1];
        const jobs = listJobs[keyJob];
        const job = jobs.shift();

        try {
          job();
        } catch (e) {
          console.error(e); // tslint:disable-line
        }

        if (jobs.isEmpty()) {
          delete listJobs[keyJob];
          keysJobs.length = keysJobs.length - 1;
          jobsSortActual = false;
        }
      }
    }

    keysJobs = sortJobsByNumber(listJobs);
    deferScheduled = false;

    if (!!keysJobs.length) {
      raisingOfJob();

      runDefer();
    }
  };

  return function scheduling(callback: () => void, { priority = P_NORMAL } = {}) {
    addJob(callback, priority);

    runDefer();
  };
};

export default frameScheduling();
