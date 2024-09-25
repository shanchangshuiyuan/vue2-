import axios from "axios";
import store from '../store';
import * as Types from '@/store/action-types.js'

class HttpRequest {
  constructor() {
    this.baseUrl = process.env.NODE_ENV === "production" ? "/" : "https://lacalhost:7001";
    this.timeout = 3000;
    //loading 需要加

    this.queue = {}; //用于维护请求队列的
    //页面切换，我需要取消请求
  }

  setInterceptor(instance, url) {
    instance.interceptors.request.use((config) => {
      if (Object.keys(this.queue).length == 0) {
        // a -> 显示loading  -》 马上关闭了  2-》  显示loading
        // 开loading
      }

      //可以记录请求的取消函数
      let CancelToken = axios.CancelToken;
      config.cancelToken = new CancelToken((c) => {
        //存在vuex中,页面切换的时候 组件销毁的时候执行
        //c就是当前取消请求的token
        store.commit(Types.SET_TOKEN,c); // 同步将取消方法存入到vuex中
      });

      this.queue[url] = true;
      return config;
    });

    instance.interceptors.response.use(
      (res) => {
        if (Object.keys(this.queue).length == 0) {
          // a -> 显示loading  -》 马上关闭了  2-》  显示loading
          // 关loading
        }
        delete this.queue[url]; //一旦响应了 就从队列删除

        if (res.data.err === 0) {
          //一般使用 swtichCase 状态码
          return res.data.data;
        } else {
          return Promise.reject(res.data); //失败抛出异常即可
        }
      },
      (err) => {
        if (Object.keys(this.queue).length == 0) {
          // a -> 显示loading  -》 马上关闭了  2-》  显示loading
          // 关loading
        }
        delete this.queue[url];
        return Promise.reject(err);
      }
    );
  }

  request(options) {
    //通过request方法来请求操作
    //每次请求可以创建一个新的实例，如果业务不复杂你可以不创建实例 直接使用axios
    let instance = axios.create();
    let config = {
      baseUrl: this.baseUrl,
      timeout: this.timeout,
      ...options,
    };
    this.setInterceptor(instance);
    return instance(config);
  }

  get(url, data) {
    //url, {}  axios.get('xxx',{params；xxx})
    return this.request({
      url,
      method: "get",
      ...data,
    });
  }

  post(url, data) {
    //axios.post('/xxx', {data})
    return this.request({
      url,
      method: "post",
      data,
    });
  }
}

export default new HttpRequest();
