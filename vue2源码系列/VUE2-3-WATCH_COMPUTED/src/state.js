import { observe } from "./observer/index.js";
import { isFunction } from "./utils";
import Watcher from "./observer/watcher";
import Dep from "./observer/dep.js";

export function stateMixin(Vue) {
  Vue.prototype.$watch = function (key, handler, options = {}) {
    options.user = true; // 为了区分用户传入的watch

    //vm, name 用户回调 options
    new Watcher(this, key, handler, options);
  };
}

export function initState(vm) {
  const opts = vm.$options;
  // 这里初始化的顺序依次是 prop>methods>data>computed>watch
  if (opts.data) {
    initData(vm);
  }
  if (opts.computed) {
    initComputed(vm, opts.computed);
  }
  if (opts.watch) {
    //初始化watch
    initWatch(vm, opts.watch);
  }
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

function initWatch(vm, watch) {
  for (let key in watch) {
    let handler = watch[key]; //用户自定义watch的写法可能是数组 对象 函数 字符串

    if (Array.isArray(handler)) {
      // 如果是数组就遍历进行创建
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i]);
      }
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

function createWatcher(vm, key, handler) {
  return vm.$watch(key, handler);
}

function initComputed(vm, computed) {
  //用来存放计算watcher
  const watchers = (vm._computedWatchers = {});

  for (let key in computed) {
    let userDef = computed[key]; //获取用户定义的计算属性

    // 依赖的属性变化就重新取值 get  // 兼容不同写法 函数方式 和 对象getter/setter方式
    let getter = typeof userDef == "function" ? userDef : userDef.get; //创建计算属性watcher使用

    //每个计算属性本质就是watcher
    // 将watcher和属性做一个映射
    watchers[key] = new Watcher(vm, getter, () => {}, { lazy: true }); // 默认不执行

    //定义计算属性 将key定义在vm上  // 劫持计算属性getter/setter
    defineComputed(vm, key, userDef);
  }
}

function defineComputed(vm, key, userDef) {
  let sharedProperty = {
    enumerable: true,
    configurable: true,
    get: () => {},
    set: () => {},
  }; // 定义普通对象用来劫持计算属性

  if (typeof userDef === "function") {
    sharedProperty.get = userDef;   // 如果是一个函数  需要手动赋值到get上
  } else {
    sharedProperty.get = createComputedGetter(key);
    // sharedProperty.get = userDef.get;
    sharedProperty.set = userDef.set || function () {};
  }

  //   利用Object.defineProperty来对计算属性的get和set进行劫持
  Object.defineProperty(vm, key, sharedProperty); // computed就是一个defineProperty
}

function createComputedGetter(key) {
  return function computedGetter() {
    let watcher = this._computedWatchers[key]; //获取对应的计算属性watcher

    // 脏就是 要调用用户的getter  不脏就是不要调用getter
    if (watcher.dirty) {
      //根据dirty属性判断是否需要重新计算
      watcher.evaluate();
    }

    // 如果当前取完值后 Dep.target还有值  需要继续向上收集
    if (Dep.target) {
      // 计算属性watcher 内部 有两个dep  firstName,lastName
      watcher.depend(); // watcher 里 对应了 多个dep
    }

    return watcher.value;
  };
}
