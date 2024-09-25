# Vuex 源码解析（二）install 、 store 初始化 、 模块安装 、 state 、getters 实现原理

## Vuex 是什么？

Vuex 是一个专为 Vue.js 应用程序开发的状态管理模式。它采用集中式存储管理应用的所有组件的状态，并以相应的规则保证状态以一种可预测的方式发生变化。

## Vuex 实现思路

> - module 默认没有作用域，只要 mutation 方法一样都会出发调用
> - 状态不要和模块的名称相同，模块优先级大于状态，如果名称相同默认取模块名称

在说思路前先看下官方给的图解

 ![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ee3248d67be643cfbf3cbdc04ee5239c~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

- Vuex 是由多个 Store 组成的。
  - 每个 Store 由 state 、 mutations 、 actions 、 getters 、 moduleCollection 【 modules 】 组成。
- 对于 state 的修改只能通过 mutation 方法。
- action 本质上还是调用 mutation 方法更改的状态。
- 为了精准调用每个模块的 state 、 mutaion ... 等方法，其实就是通过 path 路径列表匹配去找到对应的 module

## install

> ```
> /src/store.js
> ```
>
> - install 方法默认接收到 Vue 也是 Vue.use 的方法完成的。【 Vue.use 会定义一个参数列表将 this => Vue 添加到参数数组的第一位，在通过 apply 方法执行插件的 install 方法 】

```js
js 代码解读复制代码/**
 * install 方法
 * @param {Vue} _Vue vue 实例
 * 防止重复安装
 * 通过 mixin 在 Vue beforeCreate 创建时初始化 vuex
 */
export function install (_Vue) {
  // install 方法默认有个参数是 Vue 实例 是 Vue.use 实现的
  if (Vue && _Vue === Vue) {
    if (__DEV__) {
      console.error(
        '[vuex] already installed. Vue.use(Vuex) should be called only once.'
      )
    }
    return
  }
  Vue = _Vue
  applyMixin(Vue)
}
```

### applyMixin

> ```
> /src/mixin.js
> ```

```js
js 代码解读复制代码/**
 * vuex 初始化
 * @param {*} Vue vue 实例
 */
export default function (Vue) {
  const version = Number(Vue.version.split('.')[0])

  if (version >= 2) {
    // 通过 Vue.mixin beforeCreate 将 vuexInit 混入
    Vue.mixin({ beforeCreate: vuexInit })
  } else {
    // 兼容 Vue 1.x
    // override init and inject vuex init procedure
    // for 1.x backwards compatibility.
    const _init = Vue.prototype._init
    Vue.prototype._init = function (options = {}) {
      options.init = options.init
        ? [vuexInit].concat(options.init)
        : vuexInit
      _init.call(this, options)
    }
  }
  /**
   * vuex 初始化
   * 获取 Vue 上的 options 选项 判断是否有 store 选项
   * 有 ： 判断 store 是不是一个函数 若是函数执行函数，否则就是 option.store
   * 若组件有父组件，父组件上有 $store 属性 则将父组件的 $store 属性赋值到 this.$store
   */
  function vuexInit () {
    // 获取 option 这里的 this => Vue
    const options = this.$options
    // store injection
    // 判断有无 store 选项
    if (options.store) {
      // 判断 store 是不是一个函数 若是函数执行函数，否则就是 option.store
      this.$store = typeof options.store === 'function'
        ? options.store()
        : options.store
    } else if (options.parent && options.parent.$store) {
      // 子组件，有父组件，且父组件上有 $store 属性
      this.$store = options.parent.$store
    }
  }
}  
```

## Store

> ```
> /src/store.js
> ```
>
> - store 声明了 store 类，以及我们常用的 getters 、 state 、 mutaion 、 action 、commit 、 dispatch 等方法。
> - commit 、 dispatch 、 subscribe 、 subscribeAction 都是通过发布订阅的模式来实现的。
> - 限制只能通过 mutation 更改 state 则是通过 _withCommit 方法来实现的
> - getter 的缓存是通过 vue 的 computed 属性实现的
> - state 的响应式则是通过 vue 的 data 属性实现的

```js
js 代码解读复制代码/**
 * Store 类
 */
export class Store {
  // options 选项
  constructor (options = {}) {
    // Auto install if it is not done yet and `window` has `Vue`.
    // To allow users to avoid auto-installation in some cases,
    // this code should be placed here. See #731
    if (!Vue && typeof window !== 'undefined' && window.Vue) {
      // 插件 install 方法
      install(window.Vue)
    }

    if (__DEV__) {
      assert(Vue, `must call Vue.use(Vuex) before creating a store instance.`)
      assert(typeof Promise !== 'undefined', `vuex requires a Promise polyfill in this browser.`)
      assert(this instanceof Store, `store must be called with the new operator.`)
    }
    // 解构 plugins 和 strict 选项
    const {
      plugins = [],
      strict = false
    } = options

    // store internal state
    // 后续用以判断 是否为 mutation 改变状态的重要属性
    this._committing = false
    // 收集所有 action 方法 => { xx : [fn , fn,  ...] }
    this._actions = Object.create(null)
    this._actionSubscribers = []
    // 收集所有 mutatoin 方法 => { xx : [fn , fn,  ...] }
    this._mutations = Object.create(null)
    // 收集所有 getter 方法 => { xx : [fn , fn,  ...] }
    this._wrappedGetters = Object.create(null)
    // module 集合
    this._modules = new ModuleCollection(options)
    // 收集模块命名空间 用以完成 根据模块区分 state mutation 等功能的 { moduleName : Module }
    this._modulesNamespaceMap = Object.create(null)
    // 收集subscribe 方法 [ fn , fn ...]
    this._subscribers = []
    this._watcherVM = new Vue()
    // getter 缓存
    this._makeLocalGettersCache = Object.create(null)

    // bind commit and dispatch to self
    const store = this
    // 从 this 里解构 commit dispatch
    const { dispatch, commit } = this
    // 重写 dispatch 和 commit
    this.dispatch = function boundDispatch (type, payload) {
      return dispatch.call(store, type, payload)
    }
    this.commit = function boundCommit (type, payload, options) {
      return commit.call(store, type, payload, options)
    }

    // strict mode
    // 严格模式
    this.strict = strict

    // 缓存根 module 状态
    const state = this._modules.root.state

    // init root module.
    // this also recursively registers all sub-modules
    // and collects all module getters inside this._wrappedGetters
    // 注册模块
    installModule(this, state, [], this._modules.root)

    // initialize the store vm, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    // 初始化 state 和 getter 【 state 、 getters 响应式变化也是在这里实现的 】
    resetStoreVM(this, state)

    // apply plugins
    // 插件调用 这里将 this => store 传入了 就是为什么 plugin 有个 store 参数
    plugins.forEach(plugin => plugin(this))

    const useDevtools = options.devtools !== undefined ? options.devtools : Vue.config.devtools
    if (useDevtools) {
      devtoolPlugin(this)
    }
  }
  // 代理 state 访问 返回 Vue 挂载的 $$state
  get state () {
    return this._vm._data.$$state
  }
  // set state 拦截
  set state (v) {
    if (__DEV__) {
      assert(false, `use store.replaceState() to explicit replace store state.`)
    }
  }

  /**
   * store.commit 方法
   * 最终还是执行 mutation 方法
   * @param {String} _type 方法名
   * @param {Object} _payload 参数
   * @param {Object} _options 
   */
  commit (_type, _payload, _options) {
    // check object-style commit
    // 统一参数规范并解构
    const {
      type,
      payload,
      options
    } = unifyObjectStyle(_type, _payload, _options)

    const mutation = { type, payload }
    // 找到对应的 mutations => [addFn,addFn,...]
    const entry = this._mutations[type]
    if (!entry) {
      // 不存在对应的 mutation
      if (__DEV__) {
        console.error(`[vuex] unknown mutation type: ${type}`)
      }
      return
    }
    // 保证此处修改是符合规则的
    this._withCommit(() => {
      // 遍历 mutation 数组执行里面�� commit 方法
      entry.forEach(function commitIterator (handler) {
        handler(payload)
      })
    })

    // 执行收集的 subscribe 的所有方法
    this._subscribers
      .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
      .forEach(sub => sub(mutation, this.state))

    if (
      __DEV__ &&
      options && options.silent
    ) {
      console.warn(
        `[vuex] mutation type: ${type}. Silent option has been removed. ` +
        'Use the filter functionality in the vue-devtools'
      )
    }
  }

  /**
   * store.dispatch 方法
   * @param {String} _type 方法名
   * @param {Object} _payload 参数
   */
  dispatch (_type, _payload) {
    // check object-style dispatch
    // 统一参数规范并解构
    const {
      type,
      payload
    } = unifyObjectStyle(_type, _payload)

    const action = { type, payload }
    // 获取对应的 actions
    const entry = this._actions[type]
    if (!entry) {
      // 不存在
      if (__DEV__) {
        console.error(`[vuex] unknown action type: ${type}`)
      }
      return
    }

    try {
      // 执行收集的所有 subscribeAction.before action 触发前执行
      this._actionSubscribers
        .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
        .filter(sub => sub.before)
        .forEach(sub => sub.before(action, this.state))
    } catch (e) {
      if (__DEV__) {
        console.warn(`[vuex] error in before action subscribers: `)
        console.error(e)
      }
    }
    // 若对应的 action 大于 1 用 Promise.all 创建一个 promise 迭代器 否则直接执行
    const result = entry.length > 1
      ? Promise.all(entry.map(handler => handler(payload)))
      : entry[0](payload)
    // 返回一个 Promise 里面执行 promise 迭代器
    return new Promise((resolve, reject) => {
      result.then(res => {
        // subscribeAction.after action 触发后执行
        try {
          this._actionSubscribers
            .filter(sub => sub.after)
            .forEach(sub => sub.after(action, this.state))
        } catch (e) {
          if (__DEV__) {
            console.warn(`[vuex] error in after action subscribers: `)
            console.error(e)
          }
        }
        resolve(res)
      }, error => {
        // subscribeAction.error action 触发后执行
        try {
          this._actionSubscribers
            .filter(sub => sub.error)
            .forEach(sub => sub.error(action, this.state, error))
        } catch (e) {
          if (__DEV__) {
            console.warn(`[vuex] error in error action subscribers: `)
            console.error(e)
          }
        }
        reject(error)
      })
    })
  }
  /**
   * 订阅 store mutation 方法
   * @param {*} fn 回调函数
   * @param {*} options 配置项
   */
  subscribe (fn, options) {
    return genericSubscribe(fn, this._subscribers, options)
  }

  /**
   * 订阅 store action 方法
   * @param {*} fn 回调函数
   * @param {*} options 配置项
   */
  subscribeAction (fn, options) {
    const subs = typeof fn === 'function' ? { before: fn } : fn
    return genericSubscribe(subs, this._actionSubscribers, options)
  }
  /**
   * 响应式监听 state  getter 的变化
   * @param {Function} getter 函数
   * @param {Function} cb 回调
   * @param {Object} options Vue.watch 的配置项
   */
  watch (getter, cb, options) {
    if (__DEV__) {
      assert(typeof getter === 'function', `store.watch only accepts a function.`)
    }
    return this._watcherVM.$watch(() => getter(this.state, this.getters), cb, options)
  }
  /**
   * 替换 store 的根状态
   * @param {*} state 根state
   * 在符合规则下替换 state
   */
  replaceState (state) {
    this._withCommit(() => {
      this._vm._data.$$state = state
    })
  }
  /**
   * 注册 module
   * @param {Array<String>[]} path 路径
   * @param {Module} rawModule module 原
   * @param {Object} options 配置
   */
  registerModule (path, rawModule, options = {}) {
    // 判断 path 是不是字符串 如果是就将其变为数组
    if (typeof path === 'string') path = [path]

    if (__DEV__) {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
      assert(path.length > 0, 'cannot register the root module by using registerModule.')
    }

    this._modules.register(path, rawModule)
    installModule(this, this.state, path, this._modules.get(path), options.preserveState)
    // reset store to update getters...
    resetStoreVM(this, this.state)
  }
  /**
   * 卸载 module
   * @param {Array<String>[]} path 路径
   */
  unregisterModule (path) {
    if (typeof path === 'string') path = [path]

    if (__DEV__) {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
    }

    this._modules.unregister(path)
    this._withCommit(() => {
      const parentState = getNestedState(this.state, path.slice(0, -1))
      Vue.delete(parentState, path[path.length - 1])
    })
    resetStore(this)
  }

  hasModule (path) {
    if (typeof path === 'string') path = [path]

    if (__DEV__) {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
    }

    return this._modules.isRegistered(path)
  }

  hotUpdate (newOptions) {
    this._modules.update(newOptions)
    resetStore(this, true)
  }
  /**
   * 标识在 Vuex 符合的规则更改状态
   * @param {Function} fn 回调
   */
  _withCommit (fn) {
    const committing = this._committing
    this._committing = true
    fn()
    this._committing = committing
  }
}
```

## 模块安装

### installModule

> ```
> /src/store.js
> ```

```js
js 代码解读复制代码/**
 * 安装模块
 * 根据路径长度判断是否为根模块，获取命名空间，判断当前模块是否有命名空间，如果有则将其加入 _modulesNamespaceMap 中
 * 判断是否为根模块，如果不是则先获取父模块再获取子模块，用 Vue.set 将模块添加到父模块中，使其为响应式的数据
 * 获取上下文环境信息
 * 依次遍历 getters 、 mutation 、 action 将其分别加入对应的收集队列数组中
 * 判断是是否还有 modules 如果则遍历执行 installModule 完成深度遍历 module
 * @param {Store} store store 实例
 * @param {Store.state} rootState 根 module state
 * @param {Array<String>[]} path 模块路径
 * @param {Module} module 注册的模块实例
 * @param {Boolean} hot 
 */
function installModule (store, rootState, path, module, hot) {
  // 根据路径判断是否为根模块
  const isRoot = !path.length
  // 获取命名空间
  const namespace = store._modules.getNamespace(path)
  // 注册命名空间 map
  // register in namespace map
  if (module.namespaced) {
    // namespaced = true
    if (store._modulesNamespaceMap[namespace] && __DEV__) {
      console.error(`[vuex] duplicate namespace ${namespace} for the namespaced module ${path.join('/')}`)
    }
    store._modulesNamespaceMap[namespace] = module
  }

  // set state
  // 不是根模块设置 state
  if (!isRoot && !hot) {
    // 获取父模块 state
    const parentState = getNestedState(rootState, path.slice(0, -1))
    // 获取模块名称 path = ['a','c'] 这里就是 c ， c 是子模块名 a 是他的父模块
    const moduleName = path[path.length - 1]
    // _withCommit 保证此处是符合规则的修改 state
    store._withCommit(() => {
      if (__DEV__) {
        if (moduleName in parentState) {
          console.warn(
            `[vuex] state field "${moduleName}" was overridden by a module with the same name at "${path.join('.')}"`
          )
        }
      }
      // 将对应的 module 变为响应式的
      Vue.set(parentState, moduleName, module.state)
    })
  }

  // 获取本地上下文信息
  const local = module.context = makeLocalContext(store, namespace, path)

  module.forEachMutation((mutation, key) => {
    const namespacedType = namespace + key
    registerMutation(store, namespacedType, mutation, local)
  })

  module.forEachAction((action, key) => {
    const type = action.root ? key : namespace + key
    const handler = action.handler || action
    registerAction(store, type, handler, local)
  })

  module.forEachGetter((getter, key) => {
    const namespacedType = namespace + key
    registerGetter(store, namespacedType, getter, local)
  })

  module.forEachChild((child, key) => {
    installModule(store, rootState, path.concat(key), child, hot)
  })
}
```

### forEachValue

> ```
> /src/util.js
> ```

```js
js 代码解读复制代码/**
 * 遍历对象
 * @param {Object} obj 对象
 * @param {Function} fn 函数
 */
export function forEachValue (obj, fn) {
  Object.keys(obj).forEach(key => fn(obj[key], key))
}
```

### forEachMutation

> ```
> /src/module/module.js
> ```

```js
js 代码解读复制代码  forEachMutation (fn) {
    if (this._rawModule.mutations) {
      forEachValue(this._rawModule.mutations, fn)
    }
  }
```

### forEachAction

> ```
> /src/module/module.js
> ```

```js
js 代码解读复制代码  forEachAction (fn) {
    if (this._rawModule.actions) {
      forEachValue(this._rawModule.actions, fn)
    }
  }
```

### forEachGetter

> ```
> /src/module/module.js
> ```

```js
js 代码解读复制代码  forEachGetter (fn) {
    if (this._rawModule.getters) {
      forEachValue(this._rawModule.getters, fn)
    }
  }
```

### forEachChild

> ```
> /src/module/module.js
> ```

```js
js 代码解读复制代码  forEachChild (fn) {
    forEachValue(this._children, fn)
  }
```

## state 、 getter 实现原理

### resetStoreVM

> ```
> /src/store.js
> ```

```js
js 代码解读复制代码/**
 * 重置 store
 * 遍历 _wrappedGetters 的属性，代理对 store.getters 的访问
 * 将 state 放到 Vue 实例的 $$state 上【 $ 开头的属性无法直接通过 this.xx 访问】
 * 将 getters 的懒执行 也是依赖 computed
 * 判读是不是严格模式，若是则只能在 mutation 方法更改 state
 * 判断 是否存在 vue 实例如果有在 nextTicker 中销毁旧实例
 * @param {Store} store store
 * @param {Store.state} state state
 * @param {Boolean} hot 
 */
function resetStoreVM (store, state, hot) {
  const oldVm = store._vm

  // bind store public getters
  store.getters = {}
  // reset local getters cache
  store._makeLocalGettersCache = Object.create(null)
  const wrappedGetters = store._wrappedGetters
  const computed = {}
  // 遍历 wrappedGetters 给每个属性做代理
  forEachValue(wrappedGetters, (fn, key) => {
    // use computed to leverage its lazy-caching mechanism
    // direct inline function use will lead to closure preserving oldVm.
    // using partial to return function with only arguments preserved in closure environment.
    computed[key] = partial(fn, store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })

  // use a Vue instance to store the state tree
  // suppress warnings just in case the user has added
  // some funky global mixins
  const silent = Vue.config.silent
  Vue.config.silent = true
  // 将 state 和 getters 挂载到 Vue 实例上
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  Vue.config.silent = silent

  // enable strict mode for new vm
  // 是否为严格模式 如果是则 state 只能通过 mutation 更改 通过其他
  if (store.strict) {
    enableStrictMode(store)
  }
  // 老 vue 实例是否存在
  if (oldVm) {
    if (hot) {
      // dispatch changes in all subscribed watchers
      // to force getter re-evaluation for hot reloading.
      store._withCommit(() => {
        oldVm._data.$$state = null
      })
    }
    // 销毁老的实例
    Vue.nextTick(() => oldVm.$destroy())
  }
}
```

## 总结

### Vuex 安装过程

- install 方法是依赖安装方法，是由 Vue.use 执行的，Vue.use 回传了 Vue 实例，具体做什么由依赖的 install 方法自己决定。

### install 做了什么

- 判断 Vue 是否存在，如果 Vue 存在则抛出警告：Vuex 已经安装。
- 将 Vue 挂载到全局变量 Vue 上【缓存 Vue 避免将 Vue 做为依赖打包到 Vuex 中】
- 获取 Vue 的版本号
  - 若是 2.x 版本则通过 Vue.Mixin 将 vuexInit 方法混入到 生命周期钩子 beforeCreate 中。
  - vuexInit:获取 Vue 的 options 选项，判断是否有 store 属性
    - 有 store 属性，判断 store 是不是一个函数，如果是函数就执行函数，否则就是本身，将其挂载到 Vue 的 $store 上
    - 如果 Vue 有 parent 属性且 parent 也有 store 属性【有父组件，父组件上也有 store】，将父组件的 store挂载到当前的store 挂载到当前的 store挂载到当前的store 上。

### state 、 getters 的实现原理

> Vue computed 本质是一个 watcher ，这个 watcher 在新建时传入了 { lazy：true } 的配置，是不可更改的，执行  watcher.evaluate 方法，获取值并将 dirty 置为 false。当第二次访问时，发现 dirty 为 false 就直接讲 watcher.value 返回。只有当 watch.update 触发时才会再次将 dirty 置为 true。

- state 、 getters 的实现其实都是依赖 Vue，Vuex 缓存了 Vue
- 在 resetStoreVM 将 state 值放到了一个 new Vue 的 data上的 $$state 属性上，使其具有响应式能力。
- 将 getters 进行处理成符合 Vue 的 computed 属性的形式，将其放到 computed 属性上，使其具有懒执行的能力。
- 当再次调用 resetStoreVM 方法会判断是否有 vm 实例，如果有就继续 new Vue 重复之前的操作完成 state 、 getters 更新，并在 Vue.nextTicker 完成对老 Vue 实例的销毁。

### 命名空间的计算

- Vuex 的命名空间计算是在 installModule 阶段完成的，通过 getNamespace 方法去计算命名空间，其实就是通过 path 字段，利用 reduce 递归拼接 module 名称。

### 命名空间的区分 getter state mutation action 怎么实现的

- 在通过 getNamespace 计算出命名空间后，判断 module.namespaced 是否为 true，若果是则将其放入 store._modulesNamespaceMap 形成映射 map。这个映射 map 主要用于实现辅助函数。
- 而不通过辅助函数调用 commit 、 dispatch 在内部都是通过 {命名空间 + 方法名 :[fn ... ]} 去精准获取的函数队列数组。再遍历执行调用。

## Vuex 插件的实现和调用原理

- Vuex 插件会默认有个 store 参数，是在 store 构造函数里完成的，在执行完 installModule 、 resetStoreVM 会遍历执行传入的 plugins 默认传入 this => store 。
- Vuex 插件肯定是一个函数，能拿到 store 后，即可对其 state 做处理完成想要的功能



作者：KnowledgeHasNoLimit
链接：https://juejin.cn/post/7229178686431199290
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。