import { nextTick } from "../utils";

let queue = [];
let has = {}; // 做列表的 列表维护存放的那些watcher

let pending = false;

function flushSchedulerQueue() {
  for (let i = 0; i < queue.length; i++) {
    queue[i].run();
  }
  // 执行完之后清空队列
  queue = [];
  has = {};
  pending = false;
}

// 去重 防抖    要等待同步代码执行完毕后,才执行异步逻辑
// 实现异步队列机制
export function queueWatcher(watcher) {
  const id = watcher.id;
  if (has[id] == null) {
    //  同步代码执行 把全部的watcher都放到队列里面去
    queue.push(watcher);
    has[id] = true;

    // 开启一次更新操作 批处理 (防抖)
    if (!pending) {
      pending = true;
      nextTick(flushSchedulerQueue, 0);
    }
  }
}
