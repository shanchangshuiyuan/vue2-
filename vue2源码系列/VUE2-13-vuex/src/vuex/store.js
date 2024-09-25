import { Vue } from "./install";
import ModuleCollection from "./module/module-collection";
import { forEach } from "./utils";

function getNewState(store, path) {
  return path.reduce((memo, current) => {
    return memo[current];
  }, store.state);
}

// [a,b,c,d] => b/c
function installModules(store, rootState, path, module) {
  //   module.state => 放到rootState对应的儿子里

  // 获取moduleCollection类的实例
  let ns = store._modules.getNamespaced(path);

  //将状态设置为响应式
  if (path.length > 0) {
    // [a] [a,c]
    //儿子模块 {name: 'zgy', age: 12, a:{aState}}

    // 需要找到对应夫模块，将状态声明上去
    let parent = path.slice(0, -1).reduce((memo, current) => {
      return memo[current];
    }, rootState);
    //修改状态
    store._withCommiting(() => {
      Vue.set(parent, path[path.length - 1], module.state);
    });
  }

  //收集getters
  module.forEachGetters((fn, key) => {
    store.wrapperGetters[ns + key] = function() {
      return fn.call(store, getNewState(store, path));
    };
  });

  //收集mutations
  module.forEachMutations((fn, key) => {
    //{{myAge:[fn, fn, fn]}
    store.mutations[ns + key] = store.mutations[ns + key] || [];

    store.mutations[ns + key].push((payload) => {
      //利用同步逻辑与异步逻辑实现strict
      store._withCommiting(() => {
        fn.call(store, getNewState(store, path), payload); // 先mutations 在subscribers
      });

      //replaceStae 实现原理
      store._subscribers.forEach((fn) => {
        fn({ type: ns + key, payload: payload }, store.state);
      });
    });
  });

  //收集actions
  module.forEachActions((fn, key) => {
    store.actions[ns + key] = store.actions[ns + key] || [];

    store.actions[ns + key].push((payload) => {
      return fn.call(store, store, payload);
    });
  });

  //digui收集子模块
  module.forEachChilds((child, key) => {
    installModules(store, rootState, path.concat(key), child);
  });
}

function resetVM(store, state) {
  let oldVm = store._vm;

  const computed = {};
  store.getters = {};
  forEach(store.wrapperGetters, (getter, key) => {
    computed[key] = getter;

    Object.defineProperty(store.getters, key, {
      get: () => {
        return store._vm[key];
      },
    });
  });

  //根据用户传递的state进行格式化
  store._vm = new Vue({
    data: {
      $$state: state,
    },
    computed,
  });

  if (store.strict) {
    //说明是严格模式,我要监控状态
    //如果状态更新
    store._vm.$watch(
      () => store._vm._data.$$state,
      () => {
        //我希望状态变化后，直接就能监控到
        console.assert(store._committing, "no mutate in mutation hander outside");
      },
      { deep: true, sync: true }
    );
  }

  if (oldVm) {
    //如果有旧的vm，说明替换了状态，需要销毁旧的vm
    Vue.nextTick(() => {
      oldVm.$destroy();
    });
  }
}
class Store {
  constructor(options) {
    //对用户的模块进行整合
    this._modules = new ModuleCollection(options); // 对用户的参数进行格式化操作

    this.wrapperGetters = {}; //需要将模块中的所有getters，mutations actions 进行收集
    this.getters = {};
    this.mutations = {};
    this.actions = {};
    this._subscribers = []; //插件订阅者

    this._committing = false; //严格模式,默认不是在mutation中更改的

    this.strict = options.strict;

    let state = options.state;
    //没有namespaced属性的时候 getters放在根上，actions，mutations 会被合并数组
    installModules(this, state, [], this._modules.root);

    //初始化VM
    resetVM(this, state);

    //plugins
    if (options.plugins) {
      //说明用户使用了插件
      options.plugins.forEach((plugin) => {
        plugin(this);
      });
    }
  }

  // 类的属性访问器
  /**
   * state: state实现逻辑
   */
  get state() {
    // this.$store.state

    //依赖于vue的响应式原理
    return this._vm._data.$$state;
  }

  /**
   * mutations: mutations实现逻辑
   */
  commit = (mutationName, payload) => {
    // console.log('commit', mutationName, payload);
    // console.log(this.state);
    //发布
    this.mutations[mutationName] && this.mutations[mutationName].forEach((fn) => fn(payload));
  };

  /**
   * actions: actions实现逻辑
   */
  //   这儿有 this 丢失的问题
  dispatch = (actionName, payload) => {
    this.actions[actionName] && this.actions[actionName].forEach((fn) => fn(payload));
  };

  //注册插件 subscribe
  subscribe(fn) {
    this._subscribers.push(fn);
  }

  //插件中的replaceState方法
  replaceState(newState) {
    this._withCommiting(() => {
      // 虽然替换了状态，但是mutations 与 getters 在初始化的时候 已经被绑定死了状态
      this._vm.$data.$$state = newState;
    });
  }

  // 模块动态注册
  registerModule(path, rawModule) {
    if (typeof path === "string") {
      path = [path];
    }

    //[], module
    this._modules.register(path, rawModule); //注册模块

    // 将用户的module
    installModules(this, this.state, path, rawModule.newModule); //安装模块

    //vuex内部重新注册的话，会生成实例， 虽然重新安装了，只解决了状态的问题，但是computed丢失了
    resetVM(this, this.state); //销毁还原
  }

  _withCommiting(fn) {
    //严格模式跳过断言
    this._committing = true;
    fn(); //这个函数是同步的  获取_committing 就是 true 如果是异步的 就会打印日志
    this._committing = false;
  }
}

//state, mutations, actions, getters, (modules 分层),
export default Store;
