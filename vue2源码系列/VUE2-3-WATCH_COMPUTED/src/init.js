import { compileToFunction } from "./compiler/index.js";
import { mountComponent } from "./lifecycle.js";
import { initState } from "./state";

export function initMixin(Vue) {

  //表示在vue的基础上做一次混合操作
  Vue.prototype._init = function (options) {
    //el data
    const vm = this;
    vm.$options = options; //会对options进行扩展

    //对数据进行初始化 watch computed props data ...
    initState(vm); //vue.$options.data 数据劫持

    // 如果有el属性，进行模版渲染(初次渲染？)
    if (vm.$options.el) {
      vm.$mount(vm.$options.el);
    }
  };


  //挂载操作
  Vue.prototype.$mount = function (el) {
    const vm = this;
    const options = vm.$options;

    //挂载位置
    el = document.querySelector(el);
    vm.$el = el;

    // 把模版转换为 对应的渲染函数 => 虚拟dom概念 vnode =>diff算法 更新虚拟dom => 产生真实节点，更新
    if (!options.render) {

      // 如果没有render函数，则使用template 目前没有render
      // 用户也没有传递template 就取el的内容作为模板
      let template = options.template;
      if (!template && el) {
        // 如果没有template，但是有el，则使用el
        template = el.outerHTML;

        // 最终需要把tempalte模板转化成render函数
        let render = compileToFunction(template);
        options.render = render;
      }
    }


    //options.render就是渲染函数  代表了与生命周期相关
    //调用render方法，渲染成真实dom 替换掉页面的内容
    mountComponent(vm, el);
  };
}
