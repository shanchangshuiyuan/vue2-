import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker' // serviceworker的配置文件 pwa 离线缓存-》manifest + sw.js  
import router from './router'
import store from './store'
import 'lib-flexible'; // 对应设置根的字体


import Vant from 'vant';
import 'vant/lib/index.css';
Vue.use(Vant);

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
