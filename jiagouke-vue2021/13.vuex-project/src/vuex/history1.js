import { Vue } from "./install";
import { forEach } from "./utils";

class Store {
  constructor(options) {
    // 这些变量都是用户传递的

    /**
     * state: state实现逻辑------------------------------------------
     */
    let { state, mutations, actions, getters, modules, strict } = options;

    /**
     * getters: getters实现逻辑------------------------------------------
     */
    //这些变量都是用户访问的
    this.getters = {}; // 我在去getters属性的时候,把他代理到计算属性上

    // 定义在实例上的计算属性
    const computed = {};
    forEach(getters, (fn, key) => {
      computed[key] = () => {
        return fn(this.state); //为了保证参数是state
      };

      //当我们去getters上取值, 需要对computed取值// 重定义属性
      Object.defineProperty(this.getters, key, {
        get: () => {
          return this._vm[key]; //具备了缓存的功能
        },
      });
    });

    /**
     * mutations: mutations实现逻辑------------------------------------------
     */
    // 用户传的我事先保存起来，然后用户调用commmit的时候去执行这些方法，发布订阅模式
    this.mutations = {};

    forEach(mutations, (fn, key) => {
      console.log(key);
      this.mutations[key] = (payload) => {
        // commit('changeAge','10')
        // this.mutations = { changeAge: ()=>{} };
        return fn.call(this, this.state, payload);
      };
    });

    /**
     * actions: actions实现逻辑------------------------------------------
     */
    // dispatch中派发的是动作,里面可以有异步逻辑，更改状态都要通过mutation,mutation是同步更改的
    // 与mutations相似，用户调用dispatch的时候去执行这些方法
    this.actions = {};

    forEach(actions, (fn, key) => {
      this.actions[key] = (payload) => {
        // commit('changeAge','10')
        // this.mutations = { changeAge: ()=>{} };
        return fn.call(this, this, payload);
      };
    });

    //这个状态在页面渲染时需要收集对应的渲染watcher，这样状态更新才会更新视图
    this._vm = new Vue({
      data: {
        //$符号开头的数据不会被挂在上实例上,但是会挂在到_data上，减少了一次代理
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
  commit = (type, payload) => {
    this.mutations[type](payload);
  };

  /**
   * actions: actions实现逻辑
   */
  //   这儿有 this 丢失的问题
  dispatch = (type, payload) => {
    this.actions[type](payload);
  };
}

//state, mutations, actions, getters, (modules 分层),
export default Store;
