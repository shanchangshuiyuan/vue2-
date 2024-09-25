### 前言

此篇主要手写 Vue2.0 源码-**Mixin 混入原理**

上一篇咱们主要介绍了 Vue [diff算法原理 ](https://juejin.cn/post/6953433215218483236) 核心是运用 diff算法来进行渲染优化 此篇主要包含 Mixin 混入 这是 Vue 里面非常关键的一个 api 在 Vue 初始化的时候起到了合并选项的重要作用

**适用人群：**

1.想要深入理解 vue 源码更好的进行日常业务开发

2.想要在简历写上精通 vue 框架源码（再也不怕面试官的连环夺命问 哈哈）

3.没时间去看官方源码或者初看源码觉得难以理解的同学

------

### 正文

```javascript
Vue.mixin({
  created() {
    console.log("我是全局混入");
  },
});

// Vue实例化
let vm = new Vue({
  el: "#app",
  data() {
    return {
      a: { a: { a: { b: 456 } } },
      aa: 1,
      bb: 2,
    };
  },
  created() {
    console.log("我是自己的");
  },
  template: `<div id="a">hello 这是我自己写的Vue{{name}}
          </div>`,
});
```

当我们在 Vue 里面想要复用一段业务代码逻辑时经常用到的就是混入的方法 但是对于混入的原理 混入的先后顺序以及不同选项的合并策略大家是否都清楚呢 让我们一起来手写一遍就都清楚了

#### 1.定义全局 Mixin 函数

```javascript
// src/global-api/mixin.js

import {mergeOptions} from '../util/index'
export default function initMixin(Vue){
  Vue.mixin = function (mixin) {
    //   合并对象
      this.options=mergeOptions(this.options,mixin)
  };
}
};
```

新建 global-api 文件夹 把 mixin 定义为 Vue 的全局方法 核心方法就是利用 mergeOptions 把传入的选项混入到自己的 options 上面

```javascript
// src/index.js
import { initMixin } from "./init.js";
// Vue就是一个构造函数 通过new关键字进行实例化
function Vue(options) {
  // 这里开始进行Vue初始化工作
  this._init(options);
}
// 此做法有利于代码分割
initMixin(Vue);
export default Vue;
```

然后在 Vue 的入口文件里面引入 initMixin 方法

#### 2.mergeOptions 方法

```javascript
// src/util/index.js
// 定义生命周期
export const LIFECYCLE_HOOKS = [
  "beforeCreate",
  "created",
  "beforeMount",
  "mounted",
  "beforeUpdate",
  "updated",
  "beforeDestroy",
  "destroyed",
];

// 合并策略
const strats = {};

//生命周期合并策略
function mergeHook(parentVal, childVal) {
  // 如果有儿子
  if (childVal) {
    if (parentVal) {
      // 合并成一个数组
      return parentVal.concat(childVal);
    } else {
      // 包装成一个数组
      return [childVal];
    }
  } else {
    return parentVal;
  }
}

// 为生命周期添加合并策略
LIFECYCLE_HOOKS.forEach((hook) => {
  strats[hook] = mergeHook;
});

// mixin核心方法
export function mergeOptions(parent, child) {
  const options = {};
  // 遍历父亲
  for (let k in parent) {
    mergeFiled(k);
  }
  // 父亲没有 儿子有
  for (let k in child) {
    if (!parent.hasOwnProperty(k)) {
      mergeFiled(k);
    }
  }

  //真正合并字段方法
  function mergeFiled(k) {
    if (strats[k]) {
      options[k] = strats[k](parent[k], child[k]);
    } else {
      // 默认策略
      options[k] = child[k] ? child[k] : parent[k];
    }
  }
  return options;
}
```

我们先着重看下 mergeOptions 方法 主要是遍历父亲和儿子的属性 进行合并 如果合并的选项有自己的合并策略 那么就是用相应的合并策略

再来看看 我们这里的生命周期的合并策略 mergeHook 很明显是把全部的生命周期都各自混入成了数组的形式依次调用

#### 3.生命周期的调用

```javascript
// src/lifecycle.js

export function callHook(vm, hook) {
  // 依次执行生命周期对应的方法
  const handlers = vm.$options[hook];
  if (handlers) {
    for (let i = 0; i < handlers.length; i++) {
      handlers[i].call(vm); //生命周期里面的this指向当前实例
    }
  }
}
```

把$options 上面的生命周期依次遍历进行调用

```javascript
javascript 代码解读复制代码// src/init.js

Vue.prototype._init = function (options) {
  const vm = this;
  // 这里的this代表调用_init方法的对象(实例对象)
  //  this.$options就是用户new Vue的时候传入的属性和全局的Vue.options合并之后的结果

  vm.$options = mergeOptions(vm.constructor.options, options);
  callHook(vm, "beforeCreate"); //初始化数据之前
  // 初始化状态
  initState(vm);
  callHook(vm, "created"); //初始化数据之后
  // 如果有el属性 进行模板渲染
  if (vm.$options.el) {
    vm.$mount(vm.$options.el);
  }
};
```

在 init 初始化的时候调用 mergeOptions 来进行选项合并 之后在需要调用生命周期的地方运用 callHook 来执行用户传入的相关方法

```javascript
// src/lifecycle.js
export function mountComponent(vm, el) {
  vm.$el = el;
  // 引入watcher的概念 这里注册一个渲染watcher 执行vm._update(vm._render())方法渲染视图
  callHook(vm, "beforeMount"); //初始渲染之前
  let updateComponent = () => {
    vm._update(vm._render());
  };
  new Watcher(
    vm,
    updateComponent,
    () => {
      callHook(vm, "beforeUpdate"); //更新之前
    },
    true
  );
  callHook(vm, "mounted"); //渲染完成之后
}
```

在 mountComponent 方法里面调用相关的生命周期 callHook

#### 4.混入的思维导图

![Vue2.0源码-mixin原理.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d80ad9361be64258b70c578cb3b14b74~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

## 小结

至此 Vue 的混入原型已经手写完毕 其实最核心的就是对象合并以及不同选项的合并策略 目前只是演示了生命周期的合并策略 后续到组件的时候会讲到组件相关的合并策略 大家可以看着思维导图自己动手写一遍核心代码哈 遇到不懂或者有争议的地方欢迎评论留言