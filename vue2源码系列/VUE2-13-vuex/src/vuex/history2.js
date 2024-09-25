import { Vue } from "./install";
import ModuleCollection from "./module/module-collection";
import { forEach } from "./utils";

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
    Vue.set(parent, path[path.length - 1], module.state);
  }

  //收集getters
  module.forEachGetters((fn, key) => {
    store.wrapperGetters[ns + key] = () => {
      return fn.call(store, module.state);
    };
  });

  //收集mutations
  module.forEachMutations((fn, key) => {
    //{{myAge:[fn, fn, fn]}
    store.mutations[ns + key] = store.mutations[ns + key] || [];

    store.mutations[ns + key].push((payload) => {
      return fn.call(store, module.state, payload);
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
class Store {
  constructor(options) {
    //对用户的模块进行整合
    this._modules = new ModuleCollection(options); // 对用户的参数进行格式化操作

    this.wrapperGetters = {}; //需要将模块中的所有getters，mutations actions 进行收集
    this.getters = {};
    this.mutations = {};
    this.actions = {};

    const computed = {};

    let state = options.state;
    //没有namespaced属性的时候 getters放在根上，actions，mutations 会被合并数组
    installModules(this, state, [], this._modules.root);

    forEach(this.wrapperGetters, (getter, key) => {
      computed[key] = getter;

      Object.defineProperty(this.getters, key, {
        get: () => {
          return this._vm[key];
        },
      });
    });

    //根据用户传递的state进行格式化
    this._vm = new Vue({
      data: {
        $$state: state,
      },
      computed,
    });

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
    this.mutations[mutationName] &&
      this.mutations[mutationName].forEach(fn=>fn(payload));
  };

  /**
   * actions: actions实现逻辑
   */
  //   这儿有 this 丢失的问题
  dispatch = (actionName, payload) => {
    this.actions[actionName] &&
      this.actions[actionName].forEach(fn=>fn(payload));
  };
}

//state, mutations, actions, getters, (modules 分层),
export default Store;
