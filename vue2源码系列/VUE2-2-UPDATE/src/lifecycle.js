import Watcher from "./observer/watcher";
import { nextTick } from "./utils";
import { patch } from "./vdom/patch";

export function lifecycleMixin(Vue) {
  Vue.prototype._update = function (vnode) {
    //根据虚拟dom创建真实dom

    //既有初始化，又有更新
    const vm = this;
    vm.$el = patch(vm.$el, vnode);
  };

  Vue.prototype.$nextTick = nextTick;
}

export function mountComponent(vm, el) {
  // 上一步模板编译解析生成了render函数
  // 下一步就是执行vm._render()方法 调用生成的render函数 生成虚拟dom
  // 最后使用vm._update()方法把虚拟dom渲染到页面

  //更新函数，数据变化时，会再次调用此函数
  let updateComponent = () => {
    // 调用_render函数，生成虚拟dom
    vm._update(vm._render()); //后续更新可以调用updateComponent 方法
    // 用虚拟dom 生成真实dom
  };

  // 观察者模式，属性是被观察者。 刷新页面 观察者
  // updateComponent();
  new Watcher(
    vm,
    updateComponent,
    () => {
      console.log("数据更新了");
    },
    true
  ); //他是一个渲染Watcher,后续有其他Watcher
}
