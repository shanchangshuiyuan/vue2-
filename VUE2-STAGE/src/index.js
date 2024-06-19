import { initMixin } from "./init";

function Vue(options) {
    //options 为用户传入的选项
    this._init(options); //初始化操作，组件
}

// 扩展原型
// initMixin 把_init 方法挂载在 Vue 原型 供 Vue 实例调用
initMixin(Vue)

export default Vue;