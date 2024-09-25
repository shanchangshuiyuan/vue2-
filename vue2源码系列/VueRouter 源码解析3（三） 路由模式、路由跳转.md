# VueRouter 源码解析（三） 路由模式、路由跳转

## 路由模式

> ```
> /src/router.js
> ```
>
> - 入口是 VueRouter 的构造函数就已经声明了
> - 路由模式都是继承了基类 History ，基于 History 做拓展
> - 路由模式分为 3 种
>   - HTML5History h5 history 模式
>   - HashHistory  hash 模式
>   - AbstractHistory abstract 模式 非浏览器环境下使用

```js
js 代码解读复制代码export default class VueRouter {
  ...
  constructor (options: RouterOptions = {}) {
    ...
    // 路由模式 若配置项没有传递 默认为 hash 模式
    let mode = options.mode || 'hash'
    this.fallback =
      mode === 'history' && !supportsPushState && options.fallback !== false
    if (this.fallback) {
      mode = 'hash'
    }
    // 在非浏览器环境
    if (!inBrowser) {
      mode = 'abstract'
    }
    this.mode = mode
    // 根据 mode 值来判断 VueRouter 的模式
    switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base)
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback)
        break
      case 'abstract':
        this.history = new AbstractHistory(this, options.base)
        break
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, `invalid mode: ${mode}`)
        }
    }
  } 
}   
```

## History

> ```
> /src/history/base.js
> ```
>
> - 定义了 HashHistory 、 HTML5History 、 AbstractHistory 共用的方法 例如 ：transitionTo 、 confirmTransition ...

```js
js 代码解读复制代码/**
 * History 类
 */
export class History {
  // VueRouter 实例
  router: Router
  base: string
  // 当前路由
  current: Route
  pending: ?Route
  cb: (r: Route) => void
  ready: boolean
  readyCbs: Array<Function>
  readyErrorCbs: Array<Function>
  errorCbs: Array<Function>
  // 监听函数回调函数的数组【 存放了取消监听的函数 => window.removeEventListener 】
  listeners: Array<Function>
  cleanupListeners: Function

  // implemented by sub-classes
  +go: (n: number) => void
  +push: (loc: RawLocation, onComplete?: Function, onAbort?: Function) => void
  +replace: (
    loc: RawLocation,
    onComplete?: Function,
    onAbort?: Function
  ) => void
  /** 确保 url 地址是正常的可匹配的 => localhost:8080 => localhost:8080/#/ */
  +ensureURL: (push?: boolean) => void
  /** 获取当前位置 => '/about' */
  +getCurrentLocation: () => string
  /** 设置监听器 基类里是空实现在 对应的子类里重写了 */
  +setupListeners: Function

  constructor(router: Router, base: ?string) {
    this.router = router
    this.base = normalizeBase(base)
    // start with a route object that stands for "nowhere"
    // 开始的路由 { path:'/',... }
    this.current = START
    this.pending = null
    this.ready = false
    this.readyCbs = []
    this.readyErrorCbs = []
    this.errorCbs = []
    // 监听函数回调函数的数组【 存放了取消监听的函数 => window.removeEventListener 】
    this.listeners = []
  }
  // _route 动态赋值的函数
  listen(cb: Function) {
    this.cb = cb
  }

  onReady(cb: Function, errorCb: ?Function) {
    if (this.ready) {
      cb()
    } else {
      this.readyCbs.push(cb)
      if (errorCb) {
        this.readyErrorCbs.push(errorCb)
      }
    }
  }

  onError(errorCb: Function) {
    this.errorCbs.push(errorCb)
  }
  /**
   * 跳转路由方法
   * @param location 位置 => '/about'
   * @param onComplete 完成回调函数
   * @param onAbort 中止回调函数【出错的回调】
   * */
  transitionTo(
    location: RawLocation,
    onComplete?: Function,
    onAbort?: Function
  ) {
    let route
    // catch redirect option https://github.com/vuejs/vue-router/issues/3201
    try {
      // 根据路径匹配生成对应的路由对象
      route = this.router.match(location, this.current)
    } catch (e) {
      this.errorCbs.forEach(cb => {
        cb(e)
      })
      // Exception should still be thrown
      throw e
    }
    // 缓存当前路由
    const prev = this.current
    // 核对路由相关条件 跳转路由
    this.confirmTransition(
      route,
      () => {
        this.updateRoute(route)
        onComplete && onComplete(route)
        this.ensureURL()
        this.router.afterHooks.forEach(hook => {
          hook && hook(route, prev)
        })

        // fire ready cbs once
        if (!this.ready) {
          this.ready = true
          this.readyCbs.forEach(cb => {
            cb(route)
          })
        }
      },
      err => {
        if (onAbort) {
          onAbort(err)
        }
        if (err && !this.ready) {
          // Initial redirection should not mark the history as ready yet
          // because it's triggered by the redirection instead
          // https://github.com/vuejs/vue-router/issues/3225
          // https://github.com/vuejs/vue-router/issues/3331
          if (
            !isNavigationFailure(err, NavigationFailureType.redirected) ||
            prev !== START
          ) {
            this.ready = true
            this.readyErrorCbs.forEach(cb => {
              cb(err)
            })
          }
        }
      }
    )
  }
  /**
   * 确认跳转
   * @param route 路由
   * @param onComplete 完成回调函数
   * @param onAbort 中止回调函数【出错的回调】
   * */
  confirmTransition(route: Route, onComplete: Function, onAbort?: Function) {
    // 缓存当前路由
    const current = this.current
    // 将传入的路由赋值给 pending
    this.pending = route
    // 定义中止函数
    const abort = err => {
      // changed after adding errors with
      // https://github.com/vuejs/vue-router/pull/3047 before that change,
      // redirect and aborted navigation would produce an err == null
      if (!isNavigationFailure(err) && isError(err)) {
        if (this.errorCbs.length) {
          this.errorCbs.forEach(cb => {
            cb(err)
          })
        } else {
          if (process.env.NODE_ENV !== 'production') {
            warn(false, 'uncaught error during route navigation:')
          }
          console.error(err)
        }
      }
      onAbort && onAbort(err)
    }
    // 传入 route 的 matched 最后一位的索引
    const lastRouteIndex = route.matched.length - 1
    // 当前 route 的 matched 最后一位的索引
    const lastCurrentIndex = current.matched.length - 1

    // 判断是否为同一个路由，如果是同一个路由就不在跳转了
    if (
      // 判断是否是同一个路由
      isSameRoute(route, current) &&
      // in the case the route map has been dynamically appended to
      // route 对应匹配数组长度相同
      lastRouteIndex === lastCurrentIndex &&
      // route 对应匹配数组的最后一项相同
      route.matched[lastRouteIndex] === current.matched[lastCurrentIndex]
    ) {
      this.ensureURL()
      if (route.hash) {
        handleScroll(this.router, current, route, false)
      }
      return abort(createNavigationDuplicatedError(current, route))
    }

    // 走到这里说明需要跳转的路由和当前路由并不相等

    // 这里是路由钩子部分
    // 解构 updated 、 deactivated 、 activated 用以抽取钩子函数
    const { updated, deactivated, activated } = resolveQueue(
      this.current.matched,
      route.matched
    )

    // 定义路由钩子队列数组
    const queue: Array<?NavigationGuard> = [].concat(
      // in-component leave guards
      // 失效组件的beforeRouterLeave
      extractLeaveGuards(deactivated),
      // global before hooks
      // beforeEach 钩子
      this.router.beforeHooks,
      // in-component update hooks
      // 重用的组件beforeRouteUpdate
      extractUpdateHooks(updated),
      // in-config enter guards
      // 路由配置的beforeRouteEnter
      activated.map(m => m.beforeEnter),
      // async components
      // 路由组件懒加载
      resolveAsyncComponents(activated)
    )

    /**
     * 迭代器函数
     * 执行钩子函数队列数组的钩子函数 例如 beforeHooks [fn(to,form,next)=>{...}]
     * @param {*} hook hook 函数 例如 beforeEach 函数
     * @param {*} next next 回调用以执行 queue 的下一项
     */
    const iterator = (hook: NavigationGuard, next) => {
      if (this.pending !== route) {
        return abort(createNavigationCancelledError(current, route))
      }
      try {
        hook(route, current, (to: any) => {
          if (to === false) {
            // next(false) -> abort navigation, ensure current URL
            this.ensureURL(true)
            abort(createNavigationAbortedError(current, route))
          } else if (isError(to)) {
            this.ensureURL(true)
            abort(to)
          } else if (
            typeof to === 'string' ||
            (typeof to === 'object' &&
              (typeof to.path === 'string' || typeof to.name === 'string'))
          ) {
            // next('/') or next({ path: '/' }) -> redirect
            abort(createNavigationRedirectedError(current, route))
            if (typeof to === 'object' && to.replace) {
              this.replace(to)
            } else {
              this.push(to)
            }
          } else {
            // confirm transition and pass on the value
            // 这里传值，在 runQueue 方法里并未接受和使用
            next(to)
          }
        })
      } catch (e) {
        abort(e)
      }
    }

    runQueue(queue, iterator, () => {
      // wait until async components are resolved before
      // extracting in-component enter guards
      const enterGuards = extractEnterGuards(activated)
      const queue = enterGuards.concat(this.router.resolveHooks)
      runQueue(queue, iterator, () => {
        if (this.pending !== route) {
          return abort(createNavigationCancelledError(current, route))
        }
        this.pending = null
        onComplete(route)
        if (this.router.app) {
          this.router.app.$nextTick(() => {
            handleRouteEntered(route)
          })
        }
      })
    })
  }

  updateRoute(route: Route) {
    this.current = route
    this.cb && this.cb(route)
  }
  /** 默认实现为空 */
  setupListeners() {
    // Default implementation is empty
  }

  teardown() {
    // clean up event listeners
    // https://github.com/vuejs/vue-router/issues/2341
    this.listeners.forEach(cleanupListener => {
      cleanupListener()
    })
    this.listeners = []

    // reset current history route
    // https://github.com/vuejs/vue-router/issues/3294
    this.current = START
    this.pending = null
  }
}
```

### HashHistory

> ```
> /src/history/hash.js
> ```

```js
js 代码解读复制代码/**
 * HashHistory 类
 * 重写了 History 类的一些方法，完成了 hash 模式的功能
 */
export class HashHistory extends History {
  constructor(router: Router, base: ?string, fallback: boolean) {
    // 继承 History 类属性方法，并将 router 和 base 传给 History
    super(router, base)
    // check history fallback deeplinking
    if (fallback && checkFallback(this.base)) {
      return
    }
    // 确保 url 是可以正常匹配的
    ensureSlash()
  }

  // this is delayed until the app mounts
  // to avoid the hashchange listener being fired too early
  // 设置监听器 监听 hash 改变
  setupListeners() {
    if (this.listeners.length > 0) {
      return
    }
    // VueRouter 实体类
    const router = this.router
    const expectScroll = router.options.scrollBehavior
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
      this.listeners.push(setupScroll())
    }

    // 处理路由事件【跳转】
    const handleRoutingEvent = () => {
      const current = this.current
      if (!ensureSlash()) {
        return
      }
      this.transitionTo(getHash(), route => {
        if (supportsScroll) {
          handleScroll(this.router, route, current, true)
        }
        if (!supportsPushState) {
          replaceHash(route.fullPath)
        }
      })
    }
    const eventType = supportsPushState ? 'popstate' : 'hashchange'
    // 监听路由变化
    window.addEventListener(eventType, handleRoutingEvent)
    // 取消监听 添加到 listeners 中 在 terdown 方法会调用
    this.listeners.push(() => {
      window.removeEventListener(eventType, handleRoutingEvent)
    })
  }

  push(location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(
      location,
      route => {
        pushHash(route.fullPath)
        handleScroll(this.router, route, fromRoute, false)
        onComplete && onComplete(route)
      },
      onAbort
    )
  }

  replace(location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(
      location,
      route => {
        replaceHash(route.fullPath)
        handleScroll(this.router, route, fromRoute, false)
        onComplete && onComplete(route)
      },
      onAbort
    )
  }

  go(n: number) {
    window.history.go(n)
  }

  /** 确保 url 地址是正常的可匹配的 => localhost:8080 => localhost:8080/#/ */
  ensureURL(push?: boolean) {
    const current = this.current.fullPath
    if (getHash() !== current) {
      push ? pushHash(current) : replaceHash(current)
    }
  }

  /** 获取当前 hash 地址 */
  getCurrentLocation() {
    return getHash()
  }
}
```

### HTML5History

> ```
> /src/history/html5.js
> ```

```js
js 代码解读复制代码/**
 * HTML5Hitstory 类
 */
export class HTML5History extends History {
  _startLocation: string

  constructor (router: Router, base: ?string) {
    super(router, base)

    this._startLocation = getLocation(this.base)
  }
  // 设置监听器
  setupListeners () {
    // 如移除监听事件的数组有函数 结束执行
    if (this.listeners.length > 0) {
      return
    }
    // VueRouter 实例
    const router = this.router
    const expectScroll = router.options.scrollBehavior
    const supportsScroll = supportsPushState && expectScroll

    if (supportsScroll) {
      this.listeners.push(setupScroll())
    }
    // 处理路由事件
    // 通过 window.addEventListener 监听路径改变
    const handleRoutingEvent = () => {
      // 当前路由
      const current = this.current

      // Avoiding first `popstate` event dispatched in some browsers but first
      // history route not updated since async guard at the same time.
      const location = getLocation(this.base)
      if (this.current === START && location === this._startLocation) {
        return
      }
      // 跳转
      this.transitionTo(location, route => {
        if (supportsScroll) {
          handleScroll(router, route, current, true)
        }
      })
    }
    window.addEventListener('popstate', handleRoutingEvent)
    this.listeners.push(() => {
      window.removeEventListener('popstate', handleRoutingEvent)
    })
  }

  go (n: number) {
    window.history.go(n)
  }

  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      pushState(cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    const { current: fromRoute } = this
    this.transitionTo(location, route => {
      replaceState(cleanPath(this.base + route.fullPath))
      handleScroll(this.router, route, fromRoute, false)
      onComplete && onComplete(route)
    }, onAbort)
  }

  ensureURL (push?: boolean) {
    if (getLocation(this.base) !== this.current.fullPath) {
      const current = cleanPath(this.base + this.current.fullPath)
      push ? pushState(current) : replaceState(current)
    }
  }

  getCurrentLocation (): string {
    return getLocation(this.base)
  }
}
```

### AbstractHistory

> ```
> /src/history/abstract.js
> ```

```js
js 代码解读复制代码export class AbstractHistory extends History {
  index: number
  stack: Array<Route>

  constructor (router: Router, base: ?string) {
    super(router, base)
    this.stack = []
    this.index = -1
  }

  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    this.transitionTo(
      location,
      route => {
        this.stack = this.stack.slice(0, this.index + 1).concat(route)
        this.index++
        onComplete && onComplete(route)
      },
      onAbort
    )
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    this.transitionTo(
      location,
      route => {
        this.stack = this.stack.slice(0, this.index).concat(route)
        onComplete && onComplete(route)
      },
      onAbort
    )
  }

  go (n: number) {
    const targetIndex = this.index + n
    if (targetIndex < 0 || targetIndex >= this.stack.length) {
      return
    }
    const route = this.stack[targetIndex]
    this.confirmTransition(
      route,
      () => {
        const prev = this.current
        this.index = targetIndex
        this.updateRoute(route)
        this.router.afterHooks.forEach(hook => {
          hook && hook(route, prev)
        })
      },
      err => {
        if (isNavigationFailure(err, NavigationFailureType.duplicated)) {
          this.index = targetIndex
        }
      }
    )
  }

  getCurrentLocation () {
    const current = this.stack[this.stack.length - 1]
    return current ? current.fullPath : '/'
  }

  ensureURL () {
    // noop
  }
}
```

## 路由跳转

> ```
> /src/router.js
> ```
>
> - 入口是 VueRouter 实例下的 init 方法

```js
js 代码解读复制代码export default class VueRouter {
    ...
    init(){
        ...
        history.transitionTo(
            history.getCurrentLocation(),
            setupListeners,
            setupListeners
        )
        ...
    }
}
```

## transitionTo

> ```
> /src/history/base.js
> ```

```js
js 代码解读复制代码  /**
   * 跳转路由方法
   * @param location 位置 => '/about'
   * @param onComplete 完成回调函数
   * @param onAbort 中止回调函数【出错的回调】
   * */
  transitionTo(
    location: RawLocation,
    onComplete?: Function,
    onAbort?: Function
  ) {
    let route
    // catch redirect option https://github.com/vuejs/vue-router/issues/3201
    try {
      // 根据路径匹配生成对应的路由对象
      route = this.router.match(location, this.current)
    } catch (e) {
      this.errorCbs.forEach(cb => {
        cb(e)
      })
      // Exception should still be thrown
      throw e
    }
    // 缓存当前路由
    const prev = this.current
    // 核对路由相关条件 跳转路由
    this.confirmTransition(
      route,
      () => {
        // 更新路由
        this.updateRoute(route)
        // 完成回调执行
        onComplete && onComplete(route)
        // 确保 url 是正确的
        this.ensureURL()
        // afterEach 钩子函数执行
        this.router.afterHooks.forEach(hook => {
          hook && hook(route, prev)
        })

        // fire ready cbs once
        if (!this.ready) {
          this.ready = true
          this.readyCbs.forEach(cb => {
            cb(route)
          })
        }
      },
      err => {
        if (onAbort) {
          onAbort(err)
        }
        if (err && !this.ready) {
          // Initial redirection should not mark the history as ready yet
          // because it's triggered by the redirection instead
          // https://github.com/vuejs/vue-router/issues/3225
          // https://github.com/vuejs/vue-router/issues/3331
          if (
            !isNavigationFailure(err, NavigationFailureType.redirected) ||
            prev !== START
          ) {
            this.ready = true
            this.readyErrorCbs.forEach(cb => {
              cb(err)
            })
          }
        }
      }
    )
  }
```

### confirmTransition

> ```
> /src/history/base.js
> ```

```js
js 代码解读复制代码  /**
   * 确认跳转
   * 完成钩子函数的调用
   * @param route 路由
   * @param onComplete 完成回调函数
   * @param onAbort 中止回调函数【出错的回调】
   * */
  confirmTransition(route: Route, onComplete: Function, onAbort?: Function) {
    // 缓存当前路由
    const current = this.current
    // 将传入的路由赋值给 pending
    this.pending = route
    // 定义中止函数
    const abort = err => {
      // changed after adding errors with
      // https://github.com/vuejs/vue-router/pull/3047 before that change,
      // redirect and aborted navigation would produce an err == null
      if (!isNavigationFailure(err) && isError(err)) {
        if (this.errorCbs.length) {
          this.errorCbs.forEach(cb => {
            cb(err)
          })
        } else {
          if (process.env.NODE_ENV !== 'production') {
            warn(false, 'uncaught error during route navigation:')
          }
          console.error(err)
        }
      }
      onAbort && onAbort(err)
    }
    // 传入 route 的 matched 最后一位的索引
    const lastRouteIndex = route.matched.length - 1
    // 当前 route 的 matched 最后一位的索引
    const lastCurrentIndex = current.matched.length - 1

    // 判断是否为同一个路由，如果是同一个路由就不在跳转了
    if (
      // 判断是否是同一个路由
      isSameRoute(route, current) &&
      // in the case the route map has been dynamically appended to
      // route 对应匹配数组长度相同
      lastRouteIndex === lastCurrentIndex &&
      // route 对应匹配数组的最后一项相同
      route.matched[lastRouteIndex] === current.matched[lastCurrentIndex]
    ) {
      this.ensureURL()
      if (route.hash) {
        handleScroll(this.router, current, route, false)
      }
      return abort(createNavigationDuplicatedError(current, route))
    }

    // 走到这里说明需要跳转的路由和当前路由并不相等

    // 这里是路由钩子部分
    // 解构 updated 、 deactivated 、 activated 用以抽取钩子函数
    const { updated, deactivated, activated } = resolveQueue(
      this.current.matched,
      route.matched
    )

    // 定义路由钩子队列数组
    const queue: Array<?NavigationGuard> = [].concat(
      // in-component leave guards
      // 失效组件的beforeRouterLeave
      extractLeaveGuards(deactivated),
      // global before hooks
      // beforeEach 钩子
      this.router.beforeHooks,
      // in-component update hooks
      // 重用的组件beforeRouteUpdate
      extractUpdateHooks(updated),
      // in-config enter guards
      // 路由配置的beforeRouteEnter
      activated.map(m => m.beforeEnter),
      // async components
      // 路由组件懒加载
      resolveAsyncComponents(activated)
    )

    /**
     * 迭代器函数
     * 执行钩子函数队列数组的钩子函数 例如 beforeHooks [fn(to,form,next)=>{...}]
     * @param {*} hook hook 函数 例如 beforeEach 函数
     * @param {*} next next 回调用以执行 queue 的下一项
     */
    const iterator = (hook: NavigationGuard, next) => {
      if (this.pending !== route) {
        return abort(createNavigationCancelledError(current, route))
      }
      try {
        hook(route, current, (to: any) => {
          if (to === false) {
            // next(false) -> abort navigation, ensure current URL
            this.ensureURL(true)
            abort(createNavigationAbortedError(current, route))
          } else if (isError(to)) {
            this.ensureURL(true)
            abort(to)
          } else if (
            typeof to === 'string' ||
            (typeof to === 'object' &&
              (typeof to.path === 'string' || typeof to.name === 'string'))
          ) {
            // next('/') or next({ path: '/' }) -> redirect
            abort(createNavigationRedirectedError(current, route))
            if (typeof to === 'object' && to.replace) {
              this.replace(to)
            } else {
              this.push(to)
            }
          } else {
            // confirm transition and pass on the value
            // 这里传值，在 runQueue 方法里并未接受和使用
            next(to)
          }
        })
      } catch (e) {
        abort(e)
      }
    }

    runQueue(queue, iterator, () => {
      // wait until async components are resolved before
      // extracting in-component enter guards
      const enterGuards = extractEnterGuards(activated)
      const queue = enterGuards.concat(this.router.resolveHooks)
      runQueue(queue, iterator, () => {
        if (this.pending !== route) {
          return abort(createNavigationCancelledError(current, route))
        }
        this.pending = null
        onComplete(route)
        if (this.router.app) {
          this.router.app.$nextTick(() => {
            handleRouteEntered(route)
          })
        }
      })
    })
  }
```

### updateRoute

> ```
> /src/history/base.js
> ```
>
> - 这里给 current 赋值了最新的路由
> - this.cb => VueRouter init里调用了 history.listen 更新 Vue._route 的值触发视图更新

```js
js 代码解读复制代码  updateRoute(route: Route) {
    this.current = route
    this.cb && this.cb(route)
  }
```

