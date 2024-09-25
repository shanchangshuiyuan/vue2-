### 前言

此篇主要手写 Vue2.0 源码-**计算属性**

上一篇咱们主要介绍了 Vue [侦听属性原理](https://juejin.cn/post/6954925963226382367) 知道了用户定义的 watch 如何被创建 此篇我们介绍他的兄弟-计算属性 主要特性是如果计算属性依赖的值不发生变化 页面更新的时候不会重新计算 计算结果会被缓存 可以用此 api 来优化性能

# 计算属性Watcher

在初始化Vue实例时，我们会给每个计算属性都创建一个对应watcher（我们称之为计算属性watcher，除此之外还有 [渲染watcher](https://juejin.cn/post/7213672268152324151) 和 [侦听器watcher](https://juejin.cn/post/7220035506989514809) ），他有一个 value 属性用于缓存计算属性方法的返回值。

默认标识 lazy: true，懒的，代表计算属性watcher，创建时不会立即执行 get方法

默认标识 dirty: true，脏的，当我们劫持到计算属性访问时，如果是脏的，我们会通过`watcher.evaluate`重新计算 watcher 的 value值 并将其标识为干净的；如果是干净的，则直接取 watcher 缓存值

depend 方法，会让计算属性watcher 订阅的dep去收集上层watcher，可能是渲染watcher，也可能是计算属性watcher（计算属性嵌套的情况），实现洋葱模型的核心方法

update 方法，当计算属性依赖的对象发生变化时，会触发`dep.notify`派发更新 并 调用 update 方法，只需更新 dirty 为 true即可。我们会在后续的渲染watcher 更新时，劫持到计算属性的访问操作，并通过 `watcher.evaluate`重新计算其 value值

```javascript
javascript复制代码class Watcher {
  constructor(vm, fn, options) {
    // 计算属性watcher 用到的属性
    this.vm = vm
    this.lazy = options.lazy // 懒的，不会立即执行get方法
    this.dirty = this.lazy // 脏的，决定重新读取get返回值 还是 读取缓存值

    this.value = this.lazy ? undefined : this.get() // 存储 get返回值
  }

  // 重新渲染
  update() {
    console.log('watcher-update')
    if (this.lazy) {
      // 计算属性依赖的值发生改变，触发 setter 通知 watcher 更新，将计算属性watcher 标识为脏值即可
      // 后面还会触发渲染watcher，会走 evaluate 重新读取返回值
      this.dirty = true
    } else {
      queueWatcher(this) // 把当前的watcher 暂存起来，异步队列渲染
      // this.get(); // 重新渲染
    }
  }

  // 计算属性watcher为脏时，执行 evaluate，并将其标识为干净的
  evaluate() {
    this.value = this.get() // 重新获取到用户函数的返回值
    this.dirty = false
  }
  
  // 用于洋葱模型中计算属性watcher 订阅的dep去 depend收集上层watcher 即Dep.target（可能是计算属性watcher，也可能是渲染watcher)
  depend() {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }
}
```

# 缓存原理

计算属性是基于它们的响应式依赖进行缓存的。只在相关响应式依赖发生改变时它们才会重新求值。 缓存原理如下：

在初始化计算属性时，我们使用`Object.defineProperty`劫持了计算属性，并做了一些 getter/setter操作

计算属性watcher 有一个 dirty脏值属性，默认为 true

当我们劫持到计算属性被访问时，如果 dirty 为 true，则执行 evaluate 更新 watcher 的 value值 并 将 dirty 标识为 false；如果为 false，则直接取 watcher 的缓存值

当计算属性依赖的属性变化时，会通知 watcher 调用 update方法，此时我们将 dirty 标识为 true。这样再次取值时会重新进行计算

# 洋葱模型

在初始化Vue实例时，我们会给每个计算属性都创建一个对应的懒的watcher，不会立即调用计算属性方法

当我们访问计算属性时，会通过`watcher.evaluate()`让其直接依赖的属性去收集当前的计算属性watcher，并且还会通过`watcher.depend()`让其订阅的所有 dep都去收集上层watcher，可能是渲染watcher，也可能是计算属性watcher（如果存在计算属性嵌套计算属性的话）。这样依赖的属性发生变化也可以让视图进行更新

让我们一起来分析下计算属性嵌套的例子

```javascript
javascript复制代码<p>{{fullName}}</p>

computed: {
  fullAge() {
    return '今年' + this.age
  },
  fullName() {
    console.log('run')
    return this.firstName + ' ' + this.lastName  + ' ' + this.fullAge
  },
}
```

1. 初始化组件时，渲染watcher 入栈
   - `stack:[渲染watcher]`
2. 当执行 render方法并初次访问 fullName时，执行`computed watcher1.evaluate()`，`watcher1`入栈
   - `stack:[渲染watcher, watcher1]`
3. 当执行`watcher1`的 get方法时，其直接依赖的 firstName 和 lastName 会去收集当前的 watcher1；然后又访问 fullAge 并执行`computed watcher2.evaluate()`，`watcher2`入栈
   - `watcher1：[firstName, lastName]`
   - `stack:[渲染watcher, watcher1, watcher2]`
4. 执行`watcher2`的 get方法时，其直接依赖的 age 会去收集当前的 watcher2
   - `watcher2：[age]`
5. `watcher2`出栈，并执行`watcher2.depend()`，让`watcher2`订阅的 dep再去收集当前watcher1
   - `stack:[渲染watcher, watcher1]`
   - `watcher1：[firstName, lastName, age]`
6. `watcher1`出栈，执行`watcher1.depend()`，让`watcher1`订阅的 dep再去收集当前的渲染watcher
   - `stack:[渲染watcher]`
   - `渲染watcher：[firstName, lastName, age]`

![computed-洋葱模型v2.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/04797ebaf9d34ee493906feba0389933~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp?)



作者：柏成
链接：https://juejin.cn/post/7220020535299539002
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。

------

### 正文

```html
html复制代码<script>
  // Vue实例化
  let vm = new Vue({
    el: "#app",
    data() {
      return {
        aa: 1,
        bb: 2,
        cc: 3,
      };
    },
    // render(h) {
    //   return h('div',{id:'a'},'hello')
    // },
    template: `<div id="a">hello 这是我自己写的Vue{{computedName}}{{cc}}</div>`,
    computed: {
      computedName() {
        return this.aa + this.bb;
      },
    },
  });
  // 当我们每一次改变数据的时候  渲染watcher都会执行一次 这个是影响性能的
  setTimeout(() => {
    vm.cc = 4;
  }, 2000);
  console.log(vm);
</script>
```

上述例子 就是计算属性的基础用法 我们在两秒之后改变了模板里面的 cc 但是计算属性依赖的 aa 和 bb 都没变化 所以计算属性不会重新计算 还是保留的上次计算结果

#### 1.计算属性的初始化

```javascript
javascript复制代码// src/state.js

function initComputed(vm) {
  const computed = vm.$options.computed;

  const watchers = (vm._computedWatchers = {}); //用来存放计算watcher

  for (let k in computed) {
    const userDef = computed[k]; //获取用户定义的计算属性
    const getter = typeof userDef === "function" ? userDef : userDef.get; //创建计算属性watcher使用
    // 创建计算watcher  lazy设置为true
    watchers[k] = new Watcher(vm, getter, () => {}, { lazy: true });
    defineComputed(vm, k, userDef);
  }
}
```

计算属性可以写成一个函数也可以写成一个对象 对象的形式 get 属性就代表的是计算属性依赖的值 set 代表修改计算属性的依赖项的值 我们主要关心 get 属性 然后类似侦听属性 我们把 lazy:true 传给构造函数 Watcher 用来创建计算属性 Watcher 那么 defineComputed 是什么意思呢

> 思考？ 计算属性是可以缓存计算结果的 我们应该怎么做？

#### 2.对计算属性进行属性劫持

```javascript
javascript复制代码//  src/state.js

// 定义普通对象用来劫持计算属性
const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: () => {},
  set: () => {},
};

// 重新定义计算属性  对get和set劫持
function defineComputed(target, key, userDef) {
  if (typeof userDef === "function") {
    // 如果是一个函数  需要手动赋值到get上
    sharedPropertyDefinition.get = createComputedGetter(key);
  } else {
    sharedPropertyDefinition.get = createComputedGetter(key);
    sharedPropertyDefinition.set = userDef.set;
  }
  //   利用Object.defineProperty来对计算属性的get和set进行劫持
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

// 重写计算属性的get方法 来判断是否需要进行重新计算
function createComputedGetter(key) {
  return function () {
    const watcher = this._computedWatchers[key]; //获取对应的计算属性watcher
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate(); //计算属性取值的时候 如果是脏的  需要重新求值
      }
      return watcher.value;
    }
  };
}
```

defineComputed 方法主要是重新定义计算属性 其实最主要的是劫持 get 方法 也就是计算属性依赖的值 为啥要劫持呢 因为我们需要根据依赖值是否发生变化来判断计算属性是否需要重新计算

createComputedGetter 方法就是判断计算属性依赖的值是否变化的核心了 我们在计算属性创建的 Watcher 增加 dirty 标志位 如果标志变为 true 代表需要调用 watcher.evaluate 来进行重新计算了

#### 3.Watcher 改造

```javascript
javascript复制代码// src/observer/watcher.js

// import { pushTarget, popTarget } from "./dep";
// import { queueWatcher } from "./scheduler";
// import {isObject} from '../util/index'
// // 全局变量id  每次new Watcher都会自增
// let id = 0;

export default class Watcher {
  constructor(vm, exprOrFn, cb, options) {
    // this.vm = vm;
    // this.exprOrFn = exprOrFn;
    // this.cb = cb; //回调函数 比如在watcher更新之前可以执行beforeUpdate方法
    // this.options = options; //额外的选项 true代表渲染watcher
    // this.id = id++; // watcher的唯一标识
    // this.deps = []; //存放dep的容器
    // this.depsId = new Set(); //用来去重dep
    // this.user = options.user; //标识用户watcher
    this.lazy = options.lazy; //标识计算属性watcher
    this.dirty = this.lazy; //dirty可变  表示计算watcher是否需要重新计算 默认值是true

    // 如果表达式是一个函数
    // if (typeof exprOrFn === "function") {
    //   this.getter = exprOrFn;
    // } else {
    //   this.getter = function () {
    //     //用户watcher传过来的可能是一个字符串   类似a.a.a.a.b
    //     let path = exprOrFn.split(".");
    //     let obj = vm;
    //     for (let i = 0; i < path.length; i++) {
    //       obj = obj[path[i]]; //vm.a.a.a.a.b
    //     }
    //     return obj;
    //   };
    // }
    // 非计算属性实例化就会默认调用get方法 进行取值  保留结果 计算属性实例化的时候不会去调用get
    this.value = this.lazy ? undefined : this.get();
  }
  get() {
    pushTarget(this); // 在调用方法之前先把当前watcher实例推到全局Dep.target上
    const res = this.getter.call(this.vm); //计算属性在这里执行用户定义的get函数 访问计算属性的依赖项 从而把自身计算Watcher添加到依赖项dep里面收集起来
    popTarget(); // 在调用方法之后把当前watcher实例从全局Dep.target移除
    return res;
  }
  //   把dep放到deps里面 同时保证同一个dep只被保存到watcher一次  同样的  同一个watcher也只会保存在dep一次
  //   addDep(dep) {
  //     let id = dep.id;
  //     if (!this.depsId.has(id)) {
  //       this.depsId.add(id);
  //       this.deps.push(dep);
  //       //   直接调用dep的addSub方法  把自己--watcher实例添加到dep的subs容器里面
  //       dep.addSub(this);
  //     }
  //   }
  //   这里简单的就执行以下get方法  之后涉及到计算属性就不一样了
  update() {
    // 计算属性依赖的值发生变化 只需要把dirty置为true  下次访问到了重新计算
    if (this.lazy) {
      this.dirty = true;
    } else {
      // 每次watcher进行更新的时候  可以让他们先缓存起来  之后再一起调用
      // 异步队列机制
      queueWatcher(this);
    }
  }
  //   计算属性重新进行计算 并且计算完成把dirty置为false
  evaluate() {
    this.value = this.get();
    this.dirty = false;
  }
  depend() {
    // 计算属性的watcher存储了依赖项的dep
    let i = this.deps.length;
    while (i--) {
      this.deps[i].depend(); //调用依赖项的dep去收集渲染watcher
    }
  }
  //   run() {
  //     const newVal = this.get(); //新值
  //     const oldVal = this.value; //老值
  //     this.value = newVal; //跟着之后  老值就成为了现在的值
  //     if (this.user) {
  //       if(newVal!==oldVal||isObject(newVal)){
  //         this.cb.call(this.vm, newVal, oldVal);
  //       }
  //     } else {
  //       // 渲染watcher
  //       this.cb.call(this.vm);
  //     }
  //   }
}
```

我们主要看没被注释的代码 这里主要改造有四点

1.实例化的时候如果是计算属性 不会去调用 get 方法访问值进行依赖收集

2.update 方法只是把计算 watcher 的 dirty 标识为 true 只有当下次访问到了计算属性的时候才会重新计算

3.新增 evaluate 方法专门用于计算属性重新计算

4.新增 depend 方法 让计算属性的依赖值收集外层 watcher--这个方法非常重要 我们接下来分析

#### 4.外层 Watcher 的依赖收集

```javascript
javascript复制代码// src/state.js

function createComputedGetter(key) {
//   return function () {
//     const watcher = this._computedWatchers[key]; //获取对应的计算属性watcher
//     if (watcher) {
//       if (watcher.dirty) {
//         watcher.evaluate(); //计算属性取值的时候 如果是脏的  需要重新求值
        if (Dep.target) {
    // 如果Dep还存在target 这个时候一般为渲染watcher 计算属性依赖的数据也需要收集
          watcher.depend()
        }
//       }
//       return watcher.value;
//     }
//   };
// }
```

这里就体现了 watcher.depend 方法的重要性了 我们试想一下 当我们计算属性依赖的值发生了改变 这时候 watcher 的 dirty 为 true 下次访问计算属性 他确实也重新计算了 但是 我们从头到尾都没有触发视图更新 也就是数据改变了 视图没有重新渲染

这是为什么呢？

因为模板里面只有计算属性 而计算属性的依赖值的 dep 里面只收集了计算 watcher 的依赖 自身变化也只是通知了计算 watcher 调用 update 把 dirty 置为 true 所以我们要想个办法把计算属性的依赖项也添加渲染 watcher 的依赖 让自身变化之后首先通知计算 watcher 进行重新计算 然后通知渲染 watcher 进行视图更新

怎么做呢？我们来看看下面的代码就清楚了

```javascript
javascript复制代码// src/observer/dep.js

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

可见最初设计存放 watcher 的容器就是一个栈结构 因为整个 Vue 生命周期的过程中会存在很多的 watcher 比如渲染 watcher 计算 watcher 侦听 watcher 等 而每个 watcher 在调用了自身的 get 方法前后会分别调用 pushTarget 入栈和 popTarget 出栈 这样子当计算属性重新计算之后就立马会出栈 那么外层的 watcher 就会成为新的 Dep.target 我们使用 watcher.depend 方法让计算属性依赖的值收集一遍外层的渲染 watcher 这样子当计算属性依赖的值改变了既可以重新计算又可以刷新视图

> 对于渲染更新不了解的同学建议看看小编这篇 [手写 Vue2.0 源码（四）-渲染更新原理](https://juejin.cn/post/6938221715281575973)

#### 5.计算属性的思维导图

![Vue2.0源码-计算属性.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2133fd4375c445a6adc8d7426c0bc2ca~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

## 小结

至此 Vue 的 计算属性原理已经完结 和侦听属性还是有很大区别的 计算属性一般用在需要对依赖项进行计算并且可以缓存下来 当依赖项变化会自动执行计算属性的逻辑 一般用在模板里面较多 而侦听属性用法是对某个响应式的值进行观察（也可以观察计算属性的值） 一旦变化之后就可以执行自己定义的方法 大家可以看着思维导图自己动手写一遍核心代码哈 遇到不懂或者有争议的地方欢迎评论留言