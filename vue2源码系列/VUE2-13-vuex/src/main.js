import Vue from 'vue'
import App from './App.vue'
import store from './store'


Vue.config.productionTip = false

let vm = new Vue({
  name: 'root',
  store,
  render: h => h(App)
}).$mount('#app')


// 所有组件都能执行的方法 Vue.mixin({beforeCreate}), 拿到store挂载到自己的身上
