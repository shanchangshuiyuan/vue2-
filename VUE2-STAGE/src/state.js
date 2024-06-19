import { observe } from "./observer/index.js";
import { isFunction } from "./utils";

export function initState(vm) {
  const opts = vm.$options;
  if (opts.data) {
    initData(vm);
  }
  if (opts.computed) {
    initComputed();
  }
  if (opts.watch) {
    initWatch();
  }
}

function initData(vm) {
  let data = vm.$options.data;
  // vue2中会将data的所有数据 进行数据劫持 Object.defineProperty

  //data.call(vm) 将this指向vm并调用一下该方法 通过_data进行关联
  data = vm._data = isFunction(data) ? data.call(vm) : data;

  for (let key in data) {
    proxy(vm, "_data", key); //vm.name == 'xxx'
  }

  //对数据进行观测
  observe(data);
}

//代理函数
function proxy(vm, source, key) {
  Object.defineProperty(vm, key, {
    get() {
      return vm[source][key];
    },
    set(newValue) {
      vm[source][key] = newValue;
    },
  });
}
