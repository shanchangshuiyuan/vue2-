export function isFunction(val) {
  return typeof val === "function";
}

export function isObject(val) {
  return typeof val === "object" && val !== null;
}

//防抖
let waiting = false;

const callbacks = [];
function flushCallbacks() {
  callbacks.forEach((cb) => cb());
  waiting = false;
}

// 兼容性处理
function timer(flushCallbacks) {
  let timeFn = () => {};

  // 如果支持promise
  if (Promise) {
    timeFn = () => {
      Promise.resolve().then(flushCallbacks);
    };
    // MutationObserver 主要是监听dom变化 也是一个异步方法
  } else if (MutationObserver) {
    let textNode = document.createTextNode(1);

    let observer = new MutationObserver(flushCallbacks);
    observer.observe(textNode, {
      characterData: true,
    });

    timeFn = () => {
      textNode.textContent = 2;
    };
    //微任务   // 如果前面都不支持 判断setImmediate
  } else if (setImmediate) {
    timeFn = () => {
      setImmediate(flushCallbacks);
    };
  } else {
    timeFn = () => {
      setTimeout(flushCallbacks, 0);
    };
  }

  timeFn();
  waiting = false;
}

export function nextTick(cb) {
  // 除了渲染watcher  还有用户自己手动调用的nextTick 一起被收集到数组
  callbacks.push(cb);
  if (!waiting) {
    timer(flushCallbacks); //vue2考虑了兼容性问题  vue3不考虑兼容性问题
    waiting = true;
  }
}
