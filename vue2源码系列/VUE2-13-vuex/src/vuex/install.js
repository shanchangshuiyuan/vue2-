export let Vue;


/**
 * install 方法
 * @param {Vue} _Vue vue 实例
 * 防止重复安装
 * 通过 mixin 在 Vue beforeCreate 创建时初始化 vuex
 */
function install(_Vue) {
  Vue = _Vue;
  Vue.mixin({
    beforeCreate() {
      // this代表的是每个组件实例

      //获取根组件上的store 将他共享给每个组件
      //每个组件中应该有$store
      let options = this.$options;
      if (options.store) {
        this.$store = options.store;
      } else {
        //先保证他是一个子组件，并且父亲有$store
        if (options.parent && options.parent.$store) {
          this.$store = options.parent.$store;
        }
      }
    },
  });
}
// 父 this.$store => 子 this.$store => 孙子 this.$store
export default install;
