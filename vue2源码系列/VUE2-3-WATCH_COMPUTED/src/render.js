import { createElement, createTextElement } from "./vdom/index";

export function renderMixin(Vue) {

  // render函数里面有_c _v _s方法需要定义

  //处理元素(元素名称,属性,子节点) //产生虚拟节点
  Vue.prototype._c = function () {
    return createElement(this, ...arguments);
  };

  //处理文本
  Vue.prototype._v = function (text) {
    return createTextElement(this, text);
  };

  //处理属性(防止用户定义的属性是对象，将对象进行关联)
  Vue.prototype._s = function (value) {
    if (typeof value == "object") {
      return JSON.stringify(value);
    }

    return value;
  };

  // 获取render函数
  Vue.prototype._render = function () {
    const vm = this;

    //此时render是渲染函数
    let render = vm.$options.render;

    let vnode = render.call(vm);

    return vnode;
  };
}
