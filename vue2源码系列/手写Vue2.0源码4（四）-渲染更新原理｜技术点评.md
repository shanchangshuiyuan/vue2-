# 手写Vue2.0源码（四）-渲染更新原理｜技术点评

### 前言

此篇主要手写 Vue2.0 源码-**渲染更新原理**

上一篇咱们主要介绍了 Vue [初始渲染原理](https://juejin.cn/post/6937120983765483528) 完成了数据到视图层的映射过程 但是当我们改变数据的时候发现页面并不会自动更新 我们知道 Vue 的一个特性就是数据驱动 当数据改变的时候 我们无需手动操作 dom 视图会自动更新 回顾第一篇 [响应式数据原理](https://juejin.cn/post/6935344605424517128) 此篇主要采用观察者模式 定义 Watcher 和 Dep 完成依赖收集和派发更新 从而实现渲染更新

**适用人群：** 没时间去看官方源码或者看源码看的比较懵而不想去看的同学

> 提示：此篇难度稍大 是整个 Vue 源码非常核心的内容 后续的计算属性和自定义 watcher 以及$set $delete 等 Api 的实现 都需要理解此篇的思路 小编看源码这块也是看了有好几遍才搞懂 希望大家克服困难一起去实现一遍吧！

------

### 正文

```javascript
javascript复制代码    <script>
      // Vue实例化
      let vm = new Vue({
        el: "#app",
        data() {
          return {
            a: 123,
          };
        },
        // render(h) {
        //   return h('div',{id:'a'},'hello')
        // },
        template: `<div id="a">hello {{a}}</div>`,
      });

        // 我们在这里模拟更新
      setTimeout(() => {
        vm.a = 456;
        // 此方法是刷新视图的核心
        vm._update(vm._render());
      }, 1000);
    </script>
```

上段代码 我们在 setTimeout 里面调用 vm._update(vm._render())来实现更新功能 因为从上一篇初始渲染的原理可知 此方法就是渲染的核心 但是我们不可能每次数据变化都要求用户自己去调用渲染方法更新视图 我们需要一个机制在数据变动的时候自动去更新

#### 1.定义 Watcher

```javascript
javascript复制代码// src/observer/watcher.js

// 全局变量id  每次new Watcher都会自增
let id = 0;

export default class Watcher {
  constructor(vm, exprOrFn, cb, options) {
    this.vm = vm;
    this.exprOrFn = exprOrFn;
    this.cb = cb; //回调函数 比如在watcher更新之前可以执行beforeUpdate方法
    this.options = options; //额外的选项 true代表渲染watcher
    this.id = id++; // watcher的唯一标识
    // 如果表达式是一个函数
    if (typeof exprOrFn === "function") {
      this.getter = exprOrFn;
    }
    // 实例化就会默认调用get方法
    this.get();
  }
  get() {
    this.getter();
  }
}
```

在 observer 文件夹下新建 watcher.js 代表和观察者相关 这里首先介绍 Vue 里面使用到的[观察者模式](https://link.juejin.cn?target=https%3A%2F%2Fwww.cnblogs.com%2Fzhengyufeng%2Fp%2F10985321.html) 我们可以把 Watcher 当做观察者 它需要订阅数据的变动 当数据变动之后 通知它去执行某些方法 其实本质就是一个构造函数 初始化的时候会去执行 get 方法

#### 2.创建渲染 Watcher

```javascript
javascript复制代码// src/lifecycle.js
export function mountComponent(vm, el) {
  //   _update和._render方法都是挂载在Vue原型的方法  类似_init

  // 引入watcher的概念 这里注册一个渲染watcher 执行vm._update(vm._render())方法渲染视图

  let updateComponent = () => {
    console.log("刷新页面");
    vm._update(vm._render());
  };
  new Watcher(vm, updateComponent, null, true);
}
```

我们在组件挂载方法里面 定义一个渲染 Watcher 主要功能就是执行核心渲染页面的方法

#### 3.定义 Dep

```javascript
javascript复制代码// src/observer/dep.js

// dep和watcher是多对多的关系

// 每个属性都有自己的dep

let id = 0; //dep实例的唯一标识
export default class Dep {
  constructor() {
    this.id = id++;
    this.subs = []; // 这个是存放watcher的容器
  }
}
// 默认Dep.target为null
Dep.target = null;
```

Dep 也是一个构造函数 可以把他理解为观察者模式里面的被观察者 在 subs 里面收集 watcher 当数据变动的时候通知自身 subs 所有的 watcher 更新

Dep.target 是一个全局 Watcher 指向 初始状态是 null

#### 4.对象的依赖收集

```javascript
javascript复制代码// src/observer/index.js

// Object.defineProperty数据劫持核心 兼容性在ie9以及以上
function defineReactive(data, key, value) {
  observe(value);

  let dep = new Dep(); // 为每个属性实例化一个Dep

  Object.defineProperty(data, key, {
    get() {
      // 页面取值的时候 可以把watcher收集到dep里面--依赖收集
      if (Dep.target) {
        // 如果有watcher dep就会保存watcher 同时watcher也会保存dep
        dep.depend();
      }
      return value;
    },
    set(newValue) {
      if (newValue === value) return;
      // 如果赋值的新值也是一个对象  需要观测
      observe(newValue);
      value = newValue;
      dep.notify(); // 通知渲染watcher去更新--派发更新
    },
  });
}
```

上诉代码就是依赖收集和派发更新的核心 其实就是在数据被访问的时候 把我们定义好的渲染 Watcher 放到 dep 的 subs 数组里面 同时把 dep 实例对象也放到渲染 Watcher 里面去 数据更新时就可以通知 dep 的 subs 存储的 watcher 更新

#### 5.完善 watcher

```javascript
javascript复制代码// src/observer/watcher.js

import { pushTarget, popTarget } from "./dep";

// 全局变量id  每次new Watcher都会自增
let id = 0;

export default class Watcher {
  constructor(vm, exprOrFn, cb, options) {
    this.vm = vm;
    this.exprOrFn = exprOrFn;
    this.cb = cb; //回调函数 比如在watcher更新之前可以执行beforeUpdate方法
    this.options = options; //额外的选项 true代表渲染watcher
    this.id = id++; // watcher的唯一标识
    this.deps = []; //存放dep的容器
    this.depsId = new Set(); //用来去重dep
    // 如果表达式是一个函数
    if (typeof exprOrFn === "function") {
      this.getter = exprOrFn;
    }
    // 实例化就会默认调用get方法
    this.get();
  }
  get() {
    pushTarget(this); // 在调用方法之前先把当前watcher实例推到全局Dep.target上
    this.getter(); //如果watcher是渲染watcher 那么就相当于执行  vm._update(vm._render()) 这个方法在render函数执行的时候会取值 从而实现依赖收集
    popTarget(); // 在调用方法之后把当前watcher实例从全局Dep.target移除
  }
  //   把dep放到deps里面 同时保证同一个dep只被保存到watcher一次  同样的  同一个watcher也只会保存在dep一次
  addDep(dep) {
    let id = dep.id;
    if (!this.depsId.has(id)) {
      this.depsId.add(id);
      this.deps.push(dep);
      //   直接调用dep的addSub方法  把自己--watcher实例添加到dep的subs容器里面
      dep.addSub(this);
    }
  }
  //   这里简单的就执行以下get方法  之后涉及到计算属性就不一样了
  update() {
    this.get();
  }
}
```

watcher 在调用 getter 方法前后分别把自身赋值给 Dep.target 方便进行依赖收集 update 方法用来更新

#### 6.完善 dep

```javascript
javascript复制代码// src/observer/dep.js

// dep和watcher是多对多的关系
// 每个属性都有自己的dep
let id = 0; //dep实例的唯一标识
export default class Dep {
  constructor() {
    this.id = id++;
    this.subs = []; // 这个是存放watcher的容器
  }
  depend() {
    //   如果当前存在watcher
    if (Dep.target) {
      Dep.target.addDep(this); // 把自身-dep实例存放在watcher里面
    }
  }
  notify() {
    //   依次执行subs里面的watcher更新方法
    this.subs.forEach((watcher) => watcher.update());
  }
  addSub(watcher) {
    //   把watcher加入到自身的subs容器
    this.subs.push(watcher);
  }
}
// 默认Dep.target为null
Dep.target = null;
// 栈结构用来存watcher
const targetStack = [];

export function pushTarget(watcher) {
  targetStack.push(watcher);
  Dep.target = watcher; // Dep.target指向当前watcher
}
export function popTarget() {
  targetStack.pop(); // 当前watcher出栈 拿到上一个watcher
  Dep.target = targetStack[targetStack.length - 1];
}
```

定义相关的方法把收集依赖的同时把自身也放到 watcher 的 deps 容器里面去

> 思考？ 这时对象的更新已经可以满足了 但是如果是数组 类似{a:[1,2,3]} a.push(4) 并不会触发自动更新 因为我们数组并没有收集依赖

#### 7.数组的依赖收集

```javascript
javascript复制代码// src/observer/index.js

// Object.defineProperty数据劫持核心 兼容性在ie9以及以上
function defineReactive(data, key, value) {
  let childOb = observe(value); // childOb就是Observer实例

  let dep = new Dep(); // 为每个属性实例化一个Dep

  Object.defineProperty(data, key, {
    get() {
      // 页面取值的时候 可以把watcher收集到dep里面--依赖收集
      if (Dep.target) {
        // 如果有watcher dep就会保存watcher 同时watcher也会保存dep
        dep.depend();
        if (childOb) {
          // 这里表示 属性的值依然是一个对象 包含数组和对象 childOb指代的就是Observer实例对象  里面的dep进行依赖收集
          // 比如{a:[1,2,3]} 属性a对应的值是一个数组 观测数组的返回值就是对应数组的Observer实例对象
          childOb.dep.depend();
          if (Array.isArray(value)) {
            // 如果数据结构类似 {a:[1,2,[3,4,[5,6]]]} 这种数组多层嵌套  数组包含数组的情况  那么我们访问a的时候 只是对第一层的数组进行了依赖收集 里面的数组因为没访问到  所以五大收集依赖  但是如果我们改变了a里面的第二层数组的值  是需要更新页面的  所以需要对数组递归进行依赖收集
            if (Array.isArray(value)) {
              // 如果内部还是数组
              dependArray(value); // 不停的进行依赖收集
            }
          }
        }
      }
      return value;
    },
    set(newValue) {
      if (newValue === value) return;
      // 如果赋值的新值也是一个对象  需要观测
      observe(newValue);
      value = newValue;
      dep.notify(); // 通知渲染watcher去更新--派发更新
    },
  });
}
// 递归收集数组依赖
function dependArray(value) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i];
    // e.__ob__代表e已经被响应式观测了 但是没有收集依赖 所以把他们收集到自己的Observer实例的dep里面
    e && e.__ob__ && e.__ob__.dep.depend();
    if (Array.isArray(e)) {
      // 如果数组里面还有数组  就递归去收集依赖
      dependArray(e);
    }
  }
}
```

如果对象属性的值是一个数组 那么执行 childOb.dep.depend()收集数组的依赖 如果数组里面还包含数组 需要递归遍历收集 因为只有访问数据触发了 get 才会去收集依赖 一开始只是递归对数据进行响应式处理无法收集依赖 这两点需要分清

#### 8.数组的派发更新

```javascript
javascript复制代码// src/observer/array.js

methodsToPatch.forEach((method) => {
  arrayMethods[method] = function (...args) {
    //   这里保留原型方法的执行结果
    const result = arrayProto[method].apply(this, args);
    // 这句话是关键
    // this代表的就是数据本身 比如数据是{a:[1,2,3]} 那么我们使用a.push(4)  this就是a  ob就是a.__ob__ 这个属性代表的是该数据已经被响应式观察过了 __ob__对象指的就是Observer实例
    const ob = this.__ob__;
    let inserted;
    switch (method) {
      case "push":
      case "unshift":
        inserted = args;
        break;
      case "splice":
        inserted = args.slice(2);
      default:
        break;
    }
    if (inserted) ob.observeArray(inserted); // 对新增的每一项进行观测
    ob.dep.notify(); //数组派发更新 ob指的就是数组对应的Observer实例 我们在get的时候判断如果属性的值还是对象那么就在Observer实例的dep收集依赖 所以这里是一一对应的  可以直接更新
    return result;
  };
});
```

关键代码就是 ob.dep.notify()

#### 9.渲染更新的思维导图

![渲染更新](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/677a42dfc3b64ccf9fe4ad536ede74f3~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

## 小结

![整体流程](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2351d651b8384153b19215a0297fd6e6~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

这里放一张 整个 Vue 响应式原理的图片 咱们从数据劫持-->模板解析-->模板渲染-->数据变化视图自动更新整个流程已经手写了一遍 尤其是此篇介绍的渲染更新相关的知识点 建议反复理解原理之后自己动手实现一遍 因为Vue 很多核心原理和 api 都跟这里的知识点相关哈



作者：前端鲨鱼哥
链接：https://juejin.cn/post/6938221715281575973
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。