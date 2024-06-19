import { observe } from "./observer/index.js";
import { isFunction } from "./utils";

export function initState(vm) {
  const opts = vm.$options;
  // 这里初始化的顺序依次是 prop>methods>data>computed>watch
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

// 初始化data数据
function initData(vm) {
  let data = vm.$options.data;
  // vue2中会将data的所有数据 进行数据劫持 Object.defineProperty

  //data.call(vm) 将this指向vm并调用一下该方法保证返回的是一个对象 通过_data进行关联
  data = vm._data = isFunction(data) ? data.call(vm) : data;

  // 把data数据代理到vm 也就是Vue实例上面 我们可以使用this.a来访问this._data.a
  for (let key in data) {
    proxy(vm, "_data", key); //vm.name == 'xxx'
  }

  //对数据进行观测 --响应式数据核心
  observe(data);
}

//代理函数
// Object.defineProperty(object, key, { ... })：
// 在目标对象 object 上定义一个新的属性 key，并通过配置属性描述符（descriptor）来设置它的 getter 和 setter。
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
