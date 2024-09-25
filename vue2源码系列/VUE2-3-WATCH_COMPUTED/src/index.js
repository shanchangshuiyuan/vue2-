import { initMixin } from "./init";
import { lifecycleMixin } from "./lifecycle";
import { renderMixin } from "./render";
import { stateMixin } from "./state";

function Vue(options) {
    //options 为用户传入的选项
    this._init(options); //初始化操作，组件
}

// 扩展原型
// initMixin 把_init 方法挂载在 Vue 原型 供 Vue 实例调用
initMixin(Vue)

renderMixin(Vue); //_render 方法
lifecycleMixin(Vue) //_update 方法
stateMixin(Vue); //_watch 方法

export default Vue;