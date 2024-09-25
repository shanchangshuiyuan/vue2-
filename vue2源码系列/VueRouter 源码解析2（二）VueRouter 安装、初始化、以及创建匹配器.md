# VueRouter 源码解析（二）VueRouter 安装、初始化、以及创建匹配器

## 设计思路

### 什么是路由

维基是这样定义的:路由（routing）就是通过互联的网络把信息从源地址传输到目的地址的活动。路由发生在OSI网络参考模型中的第三层即网络层。路由引导分组转送，经过一些中间的节点后，到它们最后的目的地。作成硬件的话，则称为路由器。路由通常根据路由表——一个存储到各个目的地的最佳路径的表——来引导分组转送

### 什么是前端路由

前端路由即响应页面内容的任务是由前端来做的，根据不同的url更新页面的内容，随着SPA（单页面应用）的普遍使用，前后端开发分离，项目中基本都使用前端路由，通过路由实现页面的变化。例如，通过vue开发的SPA中，切换路由，并不刷新页面，而是根据路由在虚拟DOM中加载所需要的数据，实现页面内容的改变。

### 实现思路

- 首先在 Vue 中使用，我们都需要传入 VueRouter 的配置项

  ```js
  js 代码解读复制代码const router = new Router({
    routes: [{
        path: "/",
        name: "home",
        component: Home
        },
        {
        path: "/about",
        name: "about",
        // route level code-splitting
        // this generates a separate chunk (about.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () => import( /* webpackChunkName: "about" */ "../views/About.vue"),
        children: [{
            path: 'a',
            component: () => import("../views/about/A.vue")
            },
            {
            path: 'b',
            component: () => import("../views/about/B.vue")
            },
        ]
        }
    ]
  });
  ```

- 在实例化 VueRouter 后 我们需要拿到 url 对 url 解析得到 pathList 、 pathMap 等属性 在根据传入的 routes 依次生成 record 对象。

  - record 对象 包含了 path 、 matched 、 component 等属性

- 在得到 url 和 传入路由的映射关系，我们就方便 通过 '/about' 去渲染 About 组件到界面上了

下面我们就揭开 VueRouter 的真面目。

> 以下内容都是基于 Hash 模式的视角去举例注释

## install

> ```
> /src/install.js
> ```
>
> - Vue.use 的本质就是执行插件的 install 方法。
> - VueRouter 的安装方法，判断插件有没有安装，避免重复安装【这里 Vue 框架也做了此判断。Vue.use 会去安装的插件添加到 installedPlugins 数组，每次执行 Vue.use 方法会先去 installedPlugins 数组中查找是否有插件，若有就返回当前实例并结束执行】
> - install 方法默认接收到 Vue 也是 Vue.use 的方法完成的。【Vue.use 会定义一个参数列表将 this => Vue 添加到参数数组的第一位，在通过 apply 方法执行插件的 install 方法】

```js
js 代码解读复制代码import View from './components/view'
import Link from './components/link'

// 提前声明 Vue，后续 Vue 会做为参数传入，为此将其缓存， 避免 Vue 做为依赖在之后的 build 将 Vue 打包进来
export let _Vue

/**
 * 插件的 install 方法
 * @param {*} Vue Vue 实例
 */
export function install(Vue) {
  // 避免重复安装
  if (install.installed && _Vue === Vue) return
  install.installed = true

  // 将 Vue 实例缓存
  _Vue = Vue
  /** 检测属性是否为未定义 */
  const isDef = v => v !== undefined

  /**
   * 为 router-view 组件关联路由组件
   * @param {*} vm Vue 实例
   * @param {*} callVal Vue 实例
   */
  const registerInstance = (vm, callVal) => {
    // 获取父节点的 vnode
    let i = vm.$options._parentVnode
    // 这里的 i 就是 registerRouteInstance 函数
    if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
      i(vm, callVal)
    }
  }

  // Vue 的混入方法 VueRouter 实现的核心
  Vue.mixin({
    // this => Vue 实例
    // Vue 生命周期钩子函数
    beforeCreate() {
      if (isDef(this.$options.router)) {
        // 将 Vue 根实例赋值给 _routerRoot
        this._routerRoot = this
        // 这里的 router 就已经是 VueRouter 的实例
        this._router = this.$options.router
        // 调用 VueRouter 的 init 方法
        this._router.init(this)
        // Vue 的响应式处理
        Vue.util.defineReactive(this, '_route', this._router.history.current)
      } else {
        // 若实例上没有 router 属性 说明不是 VueRouter 根组件是需要渲染组件
        this._routerRoot = (this.$parent && this.$parent._routerRoot) || this
      }
      registerInstance(this, this)
    },
    destroyed() {
      registerInstance(this)
    }
  })

  // 劫持对 $router 的访问，使其返回 _routerRoot._router
  Object.defineProperty(Vue.prototype, '$router', {
    get() {
      return this._routerRoot._router
    }
  })

  // 劫持对 $router 的访问，使其返回 _routerRoot._route
  Object.defineProperty(Vue.prototype, '$route', {
    get() {
      return this._routerRoot._route
    }
  })

  // 将 RouterView 和 ROuterLink 变成 Vue 全局组件
  Vue.component('RouterView', View)
  Vue.component('RouterLink', Link)

  const strats = Vue.config.optionMergeStrategies
  // use the same hook merging strategy for route hooks
  // 对路由钩子使用相同的钩子合并策略
  strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created
}
```

## new VueRouter

> ```
> /src/router.js
> ```
>
> - VueRouter 的实体类，router.push 、 router.replace 、 路由的模式（hash 、 HTML5History） 都是在此定义的。

```js
js 代码解读复制代码/* @flow */

import { install } from './install'
import { START } from './util/route'
import { assert, warn } from './util/warn'
import { inBrowser } from './util/dom'
import { cleanPath } from './util/path'
import { createMatcher } from './create-matcher'
import { normalizeLocation } from './util/location'
import { supportsPushState } from './util/push-state'
import { handleScroll } from './util/scroll'
import { isNavigationFailure, NavigationFailureType } from './util/errors'

import { HashHistory } from './history/hash'
import { HTML5History } from './history/html5'
import { AbstractHistory } from './history/abstract'

import type { Matcher } from './create-matcher'

/**
 * VueRouter 实例
 */
export default class VueRouter {
  // install 方法
  static install: () => void
  // 版本信息
  static version: string
  // 导航失败的类型信息
  static isNavigationFailure: Function
  // 导航状态的信息 （重定向、取消 ...）
  static NavigationFailureType: any
  // 开始位置的导航
  static START_LOCATION: Route

  // Vue 实例
  app: any
  apps: Array<any>
  ready: boolean
  readyCbs: Array<Function>
  // 配置项
  options: RouterOptions
  //模式
  mode: string
  // 路由模式对应的实例 history hash abstract
  history: HashHistory | HTML5History | AbstractHistory
  // 匹配器
  matcher: Matcher
  fallback: boolean
  // 全局路由前置守卫钩子
  beforeHooks: Array<?NavigationGuard>
  // 全局路由解析守卫钩子
  resolveHooks: Array<?NavigationGuard>
  // 全局路由守卫钩子
  afterHooks: Array<?AfterNavigationHook>

  /**
   * @param {*} options VueRouter 的配置项
   */
  constructor(options: RouterOptions = {}) {
    if (process.env.NODE_ENV !== 'production') {
      warn(
        this instanceof VueRouter,
        `Router must be called with the new operator.`
      )
    }

    // 当前 Vue 实例 => app.vue
    this.app = null
    // 一个路由可能对应多个组件
    this.apps = []
    // 配置项
    this.options = options
    this.beforeHooks = []
    this.resolveHooks = []
    this.afterHooks = []
    // 创造匹配器
    // matcher 中 含有 addroutes match ... 方法
    this.matcher = createMatcher(options.routes || [], this)

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

  /**
   * 匹配路径的方法
   * 这里只是方便后续调用，本质还是调用 matcher.match
   * @param {*} raw 原始的位置信息 path => '/about'
   * @param {*} current 当前路由
   * @param {*} redirectedFrom
   * @returns
   */
  match(raw: RawLocation, current?: Route, redirectedFrom?: Location): Route {
    return this.matcher.match(raw, current, redirectedFrom)
  }

  // 当前路由
  get currentRoute(): ?Route {
    return this.history && this.history.current
  }

  // VueRouter 初始化方法
  init(app: any /* Vue component instance */) {
    process.env.NODE_ENV !== 'production' &&
      assert(
        install.installed,
        `not installed. Make sure to call \`Vue.use(VueRouter)\` ` +
          `before creating root instance.`
      )

    this.apps.push(app)

    // set up app destroyed handler
    // https://github.com/vuejs/vue-router/issues/2639
    app.$once('hook:destroyed', () => {
      // clean out app from this.apps array once destroyed
      const index = this.apps.indexOf(app)
      if (index > -1) this.apps.splice(index, 1)
      // ensure we still have a main app or null if no apps
      // we do not release the router so it can be reused
      if (this.app === app) this.app = this.apps[0] || null

      if (!this.app) this.history.teardown()
    })

    // main app previously initialized
    // return as we don't need to set up new history listener
    if (this.app) {
      return
    }

    this.app = app

    const history = this.history

    if (history instanceof HTML5History || history instanceof HashHistory) {
      const handleInitialScroll = routeOrError => {
        const from = history.current
        const expectScroll = this.options.scrollBehavior
        const supportsScroll = supportsPushState && expectScroll

        if (supportsScroll && 'fullPath' in routeOrError) {
          handleScroll(this, routeOrError, from, false)
        }
      }
      const setupListeners = routeOrError => {
        history.setupListeners()
        handleInitialScroll(routeOrError)
      }
      history.transitionTo(
        history.getCurrentLocation(),
        setupListeners,
        setupListeners
      )
    }
    // 通过发布订阅模式，更改 _route 的值
    history.listen(route => {
      this.apps.forEach(app => {
        app._route = route
      })
    })
  }

  // beforeEach 钩子函数
  beforeEach(fn: Function): Function {
    return registerHook(this.beforeHooks, fn)
  }
  // resolve 钩子函数
  beforeResolve(fn: Function): Function {
    return registerHook(this.resolveHooks, fn)
  }
  // afterEach 钩子函数
  afterEach(fn: Function): Function {
    return registerHook(this.afterHooks, fn)
  }

  onReady(cb: Function, errorCb?: Function) {
    this.history.onReady(cb, errorCb)
  }

  onError(errorCb: Function) {
    this.history.onError(errorCb)
  }

  // router.push 方法
  push(location: RawLocation, onComplete?: Function, onAbort?: Function) {
    // $flow-disable-line
    if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
      return new Promise((resolve, reject) => {
        this.history.push(location, resolve, reject)
      })
    } else {
      this.history.push(location, onComplete, onAbort)
    }
  }

  // router.replace 方法
  replace(location: RawLocation, onComplete?: Function, onAbort?: Function) {
    // $flow-disable-line
    if (!onComplete && !onAbort && typeof Promise !== 'undefined') {
      return new Promise((resolve, reject) => {
        this.history.replace(location, resolve, reject)
      })
    } else {
      this.history.replace(location, onComplete, onAbort)
    }
  }

  go(n: number) {
    this.history.go(n)
  }

  back() {
    this.go(-1)
  }

  forward() {
    this.go(1)
  }

  // 获取匹配的组件 没找到引用处 暂时是无用的
  getMatchedComponents(to?: RawLocation | Route): Array<any> {
    const route: any = to
      ? to.matched
        ? to
        : this.resolve(to).route
      : this.currentRoute
    if (!route) {
      return []
    }
    return [].concat.apply(
      [],
      route.matched.map(m => {
        return Object.keys(m.components).map(key => {
          return m.components[key]
        })
      })
    )
  }

  /**
   * 解析目标路由位置
   * @param {*} to 目标位置
   * @param {*} current 当前默认的路由
   * @param {*} append 是否允许你在当前默认的路由上附加路径
   */
  resolve(
    to: RawLocation,
    current?: Route,
    append?: boolean
  ): {
    location: Location,
    route: Route,
    href: string,
    // for backwards compat
    normalizedTo: Location,
    resolved: Route
  } {
    current = current || this.history.current
    const location = normalizeLocation(to, current, append, this)
    const route = this.match(location, current)
    const fullPath = route.redirectedFrom || route.fullPath
    const base = this.history.base
    const href = createHref(base, fullPath, this.mode)
    return {
      location,
      route,
      href,
      // for backwards compat
      normalizedTo: location,
      resolved: route
    }
  }

  /**
   * 获取路由方法
   * 和 match 方法，都是为了方便使用，本质还是调用 matcher 的 getRoutes 方法
   */
  getRoutes() {
    return this.matcher.getRoutes()
  }

  // 添加 route
  addRoute(parentOrRoute: string | RouteConfig, route?: RouteConfig) {
    this.matcher.addRoute(parentOrRoute, route)
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation())
    }
  }

  // 动态添加路由
  addRoutes(routes: Array<RouteConfig>) {
    if (process.env.NODE_ENV !== 'production') {
      warn(
        false,
        'router.addRoutes() is deprecated and has been removed in Vue Router 4. Use router.addRoute() instead.'
      )
    }
    this.matcher.addRoutes(routes)
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation())
    }
  }
}
/**
 * 注册 hook 钩子方法
 * @param {*} list hook 队列数组
 * @param {*} fn hook 方法函数体
 */
function registerHook(list: Array<any>, fn: Function): Function {
  list.push(fn)
  return () => {
    const i = list.indexOf(fn)
    if (i > -1) list.splice(i, 1)
  }
}

/**
 * 创建路径
 * @param {*} base 基础路径 => /hash-mode
 * @param {*} fullPath 完整路径 => /about
 * @param {*} mode 路由模式 => hash
 */
function createHref(base: string, fullPath: string, mode) {
  var path = mode === 'hash' ? '#' + fullPath : fullPath
  return base ? cleanPath(base + '/' + path) : path
}

// We cannot remove this as it would be a breaking change
// 插件的 install 方法
VueRouter.install = install

// 版本
VueRouter.version = '__VERSION__'

// 导航失败的类型信息
VueRouter.isNavigationFailure = isNavigationFailure

// 导航状态的信息 （重定向、取消 ...）
VueRouter.NavigationFailureType = NavigationFailureType

VueRouter.START_LOCATION = START

// 是否在浏览器环境
if (inBrowser && window.Vue) {
  window.Vue.use(VueRouter)
}
```

## createMatcher

> ```
> /src/create-matcher.js
> ```
>
> - createMatcher 内置的核心方法会抽离出介绍

```js
js 代码解读复制代码/**
 * 会创建一个匹配器
 * 转化用户传入的的 router 结构为易于处理的结构
 * { '/':xx , '/ablout':About }
 * @param {*} routes 用户传递的 routes
 * @param {*} router VueRouter 实例
 */
export function createMatcher(
  routes: Array<RouteConfig>,
  router: VueRouter
): Matcher {
  // 根据路由创建映射关系
  const { pathList, pathMap, nameMap } = createRouteMap(routes)

  function addRoutes(routes) {...}

  function addRoute(parentOrRoute, route) {...}

  function getRoutes() {...}

  function match(
    raw: RawLocation,
    currentRoute?: Route,
    redirectedFrom?: Location
  ): Route {...}

  function redirect(record: RouteRecord, location: Location): Route {...}


  function alias(
    record: RouteRecord,
    location: Location,
    matchAs: string
  ): Route {...}

  function _createRoute(
    record: ?RouteRecord,
    location: Location,
    redirectedFrom?: Location
  ): Route {...}

  return {
    match,
    addRoute,
    getRoutes,
    addRoutes
  }
}
```

### addRoutes

> ```
> /src/create-matcher.js
> ```

```js
js 代码解读复制代码  /**
   * 动态添加路由的方法
   * 将新增的记录 添加到 pathList 、 pathMap 中
   * @param {*} routes
   */
  function addRoutes(routes) {
    createRouteMap(routes, pathList, pathMap, nameMap)
  }
```

### addRoute

> ```
> /src/create-matcher.js
> ```

```js
js 代码解读复制代码  /**
   * 动态添加路由的方法 功能同 addRoutes
   * 将新增的记录 添加到 pathList 、 pathMap 中
   * @param {*} parentOrRoute
   * @param {*} route 路由
   */
  function addRoute(parentOrRoute, route) {
    // 若 parentOrRoute 是对象，则从 nameMap 获取对应的 val 否则为 undefind
    const parent =
      typeof parentOrRoute !== 'object' ? nameMap[parentOrRoute] : undefined
    // $flow-disable-line
    createRouteMap([route || parentOrRoute], pathList, pathMap, nameMap, parent)

    // add aliases of parent
    // 添加别名
    if (parent && parent.alias.length) {
      createRouteMap(
        // $flow-disable-line route is defined if parent is
        parent.alias.map(alias => ({ path: alias, children: [route] })),
        pathList,
        pathMap,
        nameMap,
        parent
      )
    }
  }
```

### getRoutes

> ```
> /src/create-matcher.js
> ```

```js
js 代码解读复制代码  /**
   * 获取所有路由记录列表
   */
  function getRoutes() {
    return pathList.map(path => pathMap[path])
  }
```

### match

> ```
> /src/create-matcher.js
> ```

```js
js 代码解读复制代码  /**
   * 用路由匹配对应记录的方法
   * 根据当前的路径找到 pathMap 里面的记录
   * @param {*} raw location
   * @param {*} currentRoute 当前路由
   * @param {*} redirectedFrom 
   */
  function match(
    raw: RawLocation,
    currentRoute?: Route,
    redirectedFrom?: Location
  ): Route {
    // 标准化路径信息返回标准化之后的 localtion （防止访问 http：//xxx:8080 不带/ 不识别）
    const location = normalizeLocation(raw, currentRoute, false, router)
    // 解构得到 name
    const { name } = location

    if (name) { // 若 name 存在
      // 从 nameMap 获取对应的记录
      const record = nameMap[name]
      if (process.env.NODE_ENV !== 'production') {
        warn(record, `Route with name '${name}' does not exist`)
      }
      // 若记录不存在，则新增路由，结束函数执行
      if (!record) return _createRoute(null, location)
      // 记录的正则匹配
      const paramNames = record.regex.keys
        .filter(key => !key.optional)
        .map(key => key.name)

        // 若获取的参数不是对象，则将其赋值为空对象
      if (typeof location.params !== 'object') {
        location.params = {}
      }
      // 若当前路由存在且参数为对象
      if (currentRoute && typeof currentRoute.params === 'object') {
        // 遍历当前路由的参数对象
        for (const key in currentRoute.params) {
          // 当前路由的参数在路由的正则匹配后的参数能找到
          if (!(key in location.params) && paramNames.indexOf(key) > -1) {
            // 将当前路由对应参数的值赋值给匹配到路由参数的值
            location.params[key] = currentRoute.params[key]
          }
        }
      }
      // 填充路由信息的参数
      location.path = fillParams(
        record.path,
        location.params,
        `named route "${name}"`
      )
      return _createRoute(record, location, redirectedFrom)
    } else if (location.path) { // 没有 name
      location.params = {}
      // 遍历 pathList 创建 route 
      for (let i = 0; i < pathList.length; i++) {
        const path = pathList[i]
        const record = pathMap[path]
        // 判断路由是否有参数
        if (matchRoute(record.regex, location.path, location.params)) {
          return _createRoute(record, location, redirectedFrom)
        }
      }
    }
    // no match
    // 若没有 name 和 path 则创建一个空路由
    return _createRoute(null, location)
  }
```

### _createRoute

> ```
> /src/create-matcher.js
> ```

```js
js 代码解读复制代码  /**
   * 创建路由信息的前置方法 用以判断路由是否重定向等
   * @param {*} record 匹配地址的记录 =>{name:'',path:'/',component:Home,...}
   * @param {*} location 位置信息 =>{path:'/',params:{},...}
   * @param {*} redirectedFrom 
   * @returns 
   */
  function _createRoute(
    record: ?RouteRecord,
    location: Location,
    redirectedFrom?: Location
  ): Route {
    // 是否重定向
    if (record && record.redirect) {
      return redirect(record, redirectedFrom || location)
    }
    if (record && record.matchAs) {
      return alias(record, location, record.matchAs)
    }
    // 创建 route
    return createRoute(record, location, redirectedFrom, router)
  }
```

### createRoute

> ```
> /src/util/route.js
> ```

```js
js 代码解读复制代码/**
 * 创建路由
 * @param {*} record 
 * @param {*} location 
 * @param {*} redirectedFrom 
 * @param {*} router 
 */
export function createRoute(
  record: ?RouteRecord,
  location: Location,
  redirectedFrom?: ?Location,
  router?: VueRouter
): Route {
  // 获取字符串参数
  const stringifyQuery = router && router.options.stringifyQuery

  let query: any = location.query || {}
  try {
    query = clone(query)
  } catch (e) {}
  // { path:'/about/a' ,component : A } 需要先渲染 /about 对应路径的组件 再渲染 /about/a 对应的组件 ，需要创建一个匹配数组
  const route: Route = {
    name: location.name || (record && record.name),
    meta: (record && record.meta) || {},
    path: location.path || '/',
    hash: location.hash || '',
    query,
    params: location.params || {},
    fullPath: getFullPath(location, stringifyQuery),
    // 匹配路径的路由 /about/a => About A
    matched: record ? formatMatch(record) : []
  }
  if (redirectedFrom) {
    route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery)
  }
  // 返回一个不能修改的 route 对象
  return Object.freeze(route)
}
```

### formatMatch

> ```
> /src/util/router.js
> ```

```js
js 代码解读复制代码/**
 * 根据路径匹配的路由
 * '/about/a' => About A
 * @param {*} record 记录
 */
function formatMatch(record: ?RouteRecord): Array<RouteRecord> {
  // 创建一个空的匹配数组
  const res = []
  // 根据记录是否存在循环
  while (record) {
    // 将记录添加进入匹配集合
    res.unshift(record)
    // 将父路由赋值为当前记录
    record = record.parent
  }
  return res
}
```

## createRouteMap

> ```
> /src/create-router-map.js
> ```

```js
js 代码解读复制代码/**
 * 扁平化(格式化)用户传进来的 routes
 * 创建路由映射 map
 * ['/','/about','/about/a']  => {'/':记录,'/about':记录,'/about/a':记录}
 * @param routes 用户传入的 routes
 * @param oldPathList 老的路径数组
 * @param oldPathMap 老的路由对应关系 Pathmap
 * @param oldNameMap 老的路由对应关系 Namemap
 * @param parentRoute 路由记录 record
 */
export function createRouteMap(
  routes: Array<RouteConfig>,
  oldPathList?: Array<string>,
  oldPathMap?: Dictionary<RouteRecord>,
  oldNameMap?: Dictionary<RouteRecord>,
  parentRoute?: RouteRecord
): {
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>
} {
  // the path list is used to control path matching priority
  // path 匹配数组 => ['/','/about','/about/a']
  const pathList: Array<string> = oldPathList || []
  // $flow-disable-line
  // path 匹配的对象 => {'/':记录,'/about':记录,'/about/a':记录}
  const pathMap: Dictionary<RouteRecord> = oldPathMap || Object.create(null)
  // $flow-disable-line
  // name 匹配的对象
  const nameMap: Dictionary<RouteRecord> = oldNameMap || Object.create(null)
  // 遍历 用户传入的 routes 添加记录到 pathList 、 pathMap 、 nameMap
  routes.forEach(route => {
    addRouteRecord(pathList, pathMap, nameMap, route, parentRoute)
  })

  // ensure wildcard routes are always at the end
  // 确保通配符路由始终在末尾
  for (let i = 0, l = pathList.length; i < l; i++) {
    if (pathList[i] === '*') {
      pathList.push(pathList.splice(i, 1)[0])
      l--
      i--
    }
  }

  if (process.env.NODE_ENV === 'development') {
    // warn if routes do not include leading slashes
    const found = pathList
      // check for missing leading slash
      .filter(path => path && path.charAt(0) !== '*' && path.charAt(0) !== '/')

    if (found.length > 0) {
      const pathNames = found.map(path => `- ${path}`).join('\n')
      warn(
        false,
        `Non-nested routes must include a leading slash character. Fix the following routes: \n${pathNames}`
      )
    }
  }

  return {
    pathList,
    pathMap,
    nameMap
  }
}
```

### addRouteRecord

> ```
> /src/create-router-map.js
> ```

```js
js 代码解读复制代码/**
 * 添加路由记录
 * @param {*} pathList 路径数组
 * @param {*} pathMap 路径映射关系
 * @param {*} nameMap 名称映射关系
 * @param {*} route 路由信息
 * @param {*} parent 父路由
 * @param {*} matchAs
 */
function addRouteRecord(
  pathList: Array<string>,
  pathMap: Dictionary<RouteRecord>,
  nameMap: Dictionary<RouteRecord>,
  route: RouteConfig,
  parent?: RouteRecord,
  matchAs?: string
) {
  // 解构得到 path 和 name
  const { path, name } = route
  if (process.env.NODE_ENV !== 'production') {
    assert(path != null, `"path" is required in a route configuration.`)
    assert(
      typeof route.component !== 'string',
      `route config "component" for path: ${String(
        path || name
      )} cannot be a ` + `string id. Use an actual component instead.`
    )

    warn(
      // eslint-disable-next-line no-control-regex
      !/[^\u0000-\u007F]+/.test(path),
      `Route with path "${path}" contains unencoded characters, make sure ` +
        `your path is correctly encoded before passing it to the router. Use ` +
        `encodeURI to encode static segments of your path.`
    )
  }

  const pathToRegexpOptions: PathToRegexpOptions =
    route.pathToRegexpOptions || {}
  // 标准化 path 信息
  const normalizedPath = normalizePath(path, parent, pathToRegexpOptions.strict)

  if (typeof route.caseSensitive === 'boolean') {
    pathToRegexpOptions.sensitive = route.caseSensitive
  }

  // 路由记录
  const record: RouteRecord = {
    path: normalizedPath,
    regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
    components: route.components || { default: route.component },
    alias: route.alias
      ? typeof route.alias === 'string'
        ? [route.alias]
        : route.alias
      : [],
    instances: {},
    enteredCbs: {},
    name,
    parent,
    matchAs,
    redirect: route.redirect,
    beforeEnter: route.beforeEnter,
    meta: route.meta || {},
    props:
      route.props == null
        ? {}
        : route.components
        ? route.props
        : { default: route.props }
  }

  // 如果该路由还有子路由
  if (route.children) {
    // Warn if route is named, does not redirect and has a default child route.
    // If users navigate to this route by name, the default child will
    // not be rendered (GH Issue #629)
    if (process.env.NODE_ENV !== 'production') {
      if (
        route.name &&
        !route.redirect &&
        route.children.some(child => /^\/?$/.test(child.path))
      ) {
        warn(
          false,
          `Named Route '${route.name}' has a default child route. ` +
            `When navigating to this named route (:to="{name: '${route.name}'}"), ` +
            `the default child route will not be rendered. Remove the name from ` +
            `this route and use the name of the default child route for named ` +
            `links instead.`
        )
      }
    }
    // 遍历添加子路由
    route.children.forEach(child => {
      const childMatchAs = matchAs
        ? cleanPath(`${matchAs}/${child.path}`)
        : undefined
      addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs)
    })
  }

  if (!pathMap[record.path]) {
    pathList.push(record.path)
    pathMap[record.path] = record
  }

  // 若果路由别名存在
  if (route.alias !== undefined) {
    // 判断别名是否为一个数组
    const aliases = Array.isArray(route.alias) ? route.alias : [route.alias]
    // 遍历别名数组
    for (let i = 0; i < aliases.length; ++i) {
      const alias = aliases[i]
      if (process.env.NODE_ENV !== 'production' && alias === path) {
        warn(
          false,
          `Found an alias with the same value as the path: "${path}". You have to remove that alias. It will be ignored in development.`
        )
        // skip in dev to make it work
        continue
      }

      const aliasRoute = {
        path: alias,
        children: route.children
      }
      addRouteRecord(
        pathList,
        pathMap,
        nameMap,
        aliasRoute,
        parent,
        record.path || '/' // matchAs
      )
    }
  }

  // 如果 name 存在
  if (name) {
    if (!nameMap[name]) {// 在 nameMap 找不到该 name 路由的对应关系
      // 赋值
      nameMap[name] = record
    } else if (process.env.NODE_ENV !== 'production' && !matchAs) {
      warn(
        false,
        `Duplicate named routes definition: ` +
          `{ name: "${name}", path: "${record.path}" }`
      )
    }
  }
}
```

