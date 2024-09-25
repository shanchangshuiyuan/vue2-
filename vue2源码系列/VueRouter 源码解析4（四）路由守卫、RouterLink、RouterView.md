# VueRouter 源码解析（四）路由守卫、RouterLink、RouterView

在了解路由守卫之前我们先来看看 VueRouter 官方是怎么解释完整的[导航流程](https://link.juejin.cn?target=https%3A%2F%2Fv3.router.vuejs.org%2Fzh%2Fguide%2Fadvanced%2Fnavigation-guards.html%23%E5%AE%8C%E6%95%B4%E7%9A%84%E5%AF%BC%E8%88%AA%E8%A7%A3%E6%9E%90%E6%B5%81%E7%A8%8B)

## 完整的导航解析流程

- 导航被触发。
- 在失活的组件里调用 beforeRouteLeave 守卫。
- 调用全局的 beforeEach 守卫。
- 在重用的组件里调用 beforeRouteUpdate 守卫 。
- 在路由配置里调用 beforeEnter。
- 解析异步路由组件。
- 在被激活的组件里调用 beforeRouteEnter。
- 调用全局的 beforeResolve 守卫 。
- 导航被确认。
- 调用全局的 afterEach 钩子。
- 触发 DOM 更新。
- 调用 beforeRouteEnter 守卫中传给 next 的回调函数，创建好的组件实例会作为回调函数的参数传入。

## 路由守卫

- 全局前置守卫 [beforeEach]
- 全局解析守卫 [beforeResolve]
- 全局解析守卫 [afterEach]
- 路由独享的守卫 [beforeEnter]
- 组件内的守卫
  - beforeRouteEnter
  - beforeRouteUpdate
  - beforeRouteLeave

详细介绍参见[此处](https://link.juejin.cn?target=https%3A%2F%2Fv3.router.vuejs.org%2Fzh%2Fguide%2Fadvanced%2Fnavigation-guards.html%23%E7%BB%84%E4%BB%B6%E5%86%85%E7%9A%84%E5%AE%88%E5%8D%AB)

## 路由守卫的入口

> '/src/history/base.js'
>
> - confirmTransition 函数调用了执行钩子函数队列的方法，声明队列并没有 afterEach，afterEach 钩子其实在 onComplete 函数体中，调用了 onComplete 其实就执行了 afterEach 钩子数组。

```js
js 代码解读复制代码  /**
   * 确认跳转
   * 完成钩子函数的调用
   * @param route 路由
   * @param onComplete 完成回调函数
   * @param onAbort 中止回调函数【出错的回调】
   * */
  confirmTransition (route: Route, onComplete: Function, onAbort?: Function) {
    ...

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

### runQueue

> ```
> /src/util/async.js
> ```

```js
js 代码解读复制代码/* @flow */
/**
 * 执行钩子队列
 * 通过 step 函数，按顺序调用 queue 队列的函数
 * @param {*} queue 存放路由钩子函数的队列数组
 * @param {*} fn iterator 函数
 * @param {*} cb 回调函数
 */
export function runQueue (queue: Array<?NavigationGuard>, fn: Function, cb: Function) {
  const step = index => {
    if (index >= queue.length) {
      cb()
    } else {
      if (queue[index]) {
        fn(queue[index], () => {
          step(index + 1)
        })
      } else {
        step(index + 1)
      }
    }
  }
  step(0)
}
```

### extractGuards

> ```
> /src/history/base.js
> ```
>
> - extractLeaveGuards 、 extractUpdateHooks 、extractEnterGuards 都是调用 extractGuards 提取守卫方法的
> - extractGuards 内部又是调用 extractGuard 方法来提取组件声明的路由钩子

```js
js 代码解读复制代码/**
 * 提起路由守卫钩子数组
 * @param {*} records 路由匹配记录
 * @param {*} name 钩子函数名称
 * @param {*} bind bindEnterGuard 函数
 * @param {*} reverse
 */
function extractGuards (
  records: Array<RouteRecord>,
  name: string,
  bind: Function,
  reverse?: boolean
): Array<?Function> {
  const guards = flatMapComponents(records, (def, instance, match, key) => {
    // def 路由组件 Vue 实例
    // match 符合路径的匹配项
    // key 路由组件【 router-link 】最后都是当匿名插槽处理所以 key 默认为 default
    // 获取路由钩子函数
    debugger
    const guard = extractGuard(def, name)
    if (guard) {// 钩子函数存在
      return Array.isArray(guard)
        ? guard.map(guard => bind(guard, instance, match, key))
        : bind(guard, instance, match, key)
    }
  })
  return flatten(reverse ? guards.reverse() : guards)
}
```

## extractGuard

> ```
> /src/history/base.js
> ```

```js
js 代码解读复制代码/**
 * 提取路由钩子
 * 若传递的组件不是一个函数，就使用 Vue.extend 方法拓展为组件
 * 从组件 option 将对应的函数返回
 * @param {*} def 路由组件 => { template:'<div>Home</div>',data:{...},beforeRouteLeave:()=>{...} }
 * @param {*} key 钩子函数名称 => beforeRouteLeave
 */
function extractGuard (
  def: Object | Function,
  key: string
): NavigationGuard | Array<NavigationGuard> {
  if (typeof def !== 'function') {
    // extend now so that global mixins are applied.
    def = _Vue.extend(def)
  }
  return def.options[key]
}
```

### flatMapComponents

> ```
> /src/util/resolve-components.js
> ```

```js
js 代码解读复制代码/**
 * 处理匹配项的路由信息将其作为参数传给 fn 回调
 * @param {*} matched 路由匹配项
 * @param {*} fn 回调函数
 */
export function flatMapComponents (
  matched: Array<RouteRecord>,
  fn: Function
): Array<?Function> {
  return flatten(matched.map(m => {
    return Object.keys(m.components).map(key => fn(
      m.components[key],
      m.instances[key],
      m, key
    ))
  }))
}
```

### bindEnterGuard

> ```
> /src/history/base.js
> ```

```js
js 代码解读复制代码/**
 * 绑定进入守卫
 * 最后都是挂载到 matched.enteredCbs:{default:[fn(){...},...]}
 * 这里的 fn 都是 beforeRouteEnter 的 next 回调
 * @param {*} guard 守卫
 * @param {*} match 匹配记录
 * @param {*} key
 */
function bindEnterGuard(
  guard: NavigationGuard,
  match: RouteRecord,
  key: string
): NavigationGuard {
  return function routeEnterGuard(to, from, next) {
    return guard(to, from, cb => {
      if (typeof cb === 'function') {
        if (!match.enteredCbs[key]) {
          match.enteredCbs[key] = []
        }
        match.enteredCbs[key].push(cb)
      }
      next(cb)
    })
  }
}
```

## router-link

> ```
> /src/components/link.js
> ```
>
> - router-link 是一个 name 为 router-link 的组件，组件内容都被当作插槽处理了，默认渲染为 a 标签，且取消了 a 标签的默认跳转功能。

```js
js 代码解读复制代码export default {
  name: 'RouterLink',
  props: {
    // to 目标路径
    to: {
      type: toTypes,
      required: true
    },
    // 标签名
    tag: {
      type: String,
      default: 'a'
    },
    custom: Boolean,
    exact: Boolean,
    exactPath: Boolean,
    append: Boolean,
    replace: Boolean,
    activeClass: String,
    exactActiveClass: String,
    ariaCurrentValue: {
      type: String,
      default: 'page'
    },
    event: {
      type: eventTypes,
      default: 'click'
    }
  },
  render(h: Function) {
    // 获取 router 实例
    const router = this.$router
    // 获取当前路由
    const current = this.$route
    const { location, route, href } = router.resolve(
      this.to,
      current,
      this.append
    )
    // 声明 classes 类
    const classes = {}
    // 路由样式动态变化
    const globalActiveClass = router.options.linkActiveClass
    const globalExactActiveClass = router.options.linkExactActiveClass
    // Support global empty active class
    const activeClassFallback =
      globalActiveClass == null ? 'router-link-active' : globalActiveClass
    const exactActiveClassFallback =
      globalExactActiveClass == null
        ? 'router-link-exact-active'
        : globalExactActiveClass
    const activeClass =
      this.activeClass == null ? activeClassFallback : this.activeClass
    const exactActiveClass =
      this.exactActiveClass == null
        ? exactActiveClassFallback
        : this.exactActiveClass

    // 是否重定向 是就创建新路由 否则返回结构的路由
    const compareTarget = route.redirectedFrom
      ? createRoute(null, normalizeLocation(route.redirectedFrom), null, router)
      : route

    classes[exactActiveClass] = isSameRoute(
      current,
      compareTarget,
      this.exactPath
    )
    classes[activeClass] =
      this.exact || this.exactPath
        ? classes[exactActiveClass]
        : isIncludedRoute(current, compareTarget)

    const ariaCurrentValue = classes[exactActiveClass]
      ? this.ariaCurrentValue
      : null

    // 处理事件
    const handler = e => {
      if (guardEvent(e)) {
        if (this.replace) {
          router.replace(location, noop)
        } else {
          router.push(location, noop)
        }
      }
    }
    // 声明 on 对象 【 事件 】
    const on = { click: guardEvent }
    if (Array.isArray(this.event)) {
      this.event.forEach(e => {
        on[e] = handler
      })
    } else {
      on[this.event] = handler
    }

    const data: any = { class: classes }

    // 默认作为插槽处理
    const scopedSlot =
      !this.$scopedSlots.$hasNormal &&
      this.$scopedSlots.default &&
      this.$scopedSlots.default({
        href,
        route,
        navigate: handler,
        isActive: classes[activeClass],
        isExactActive: classes[exactActiveClass]
      })

    // 异常处理部分
    if (scopedSlot) {
      if (process.env.NODE_ENV !== 'production' && !this.custom) {
        !warnedCustomSlot &&
          warn(
            false,
            'In Vue Router 4, the v-slot API will by default wrap its content with an <a> element. Use the custom prop to remove this warning:\n<router-link v-slot="{ navigate, href }" custom></router-link>\n'
          )
        warnedCustomSlot = true
      }
      if (scopedSlot.length === 1) {
        return scopedSlot[0]
      } else if (scopedSlot.length > 1 || !scopedSlot.length) {
        if (process.env.NODE_ENV !== 'production') {
          warn(
            false,
            `<router-link> with to="${this.to}" is trying to use a scoped slot but it didn't provide exactly one child. Wrapping the content with a span element.`
          )
        }
        return scopedSlot.length === 0 ? h() : h('span', {}, scopedSlot)
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      if ('tag' in this.$options.propsData && !warnedTagProp) {
        warn(
          false,
          `<router-link>'s tag prop is deprecated and has been removed in Vue Router 4. Use the v-slot API to remove this warning: https://next.router.vuejs.org/guide/migration/#removal-of-event-and-tag-props-in-router-link.`
        )
        warnedTagProp = true
      }
      if ('event' in this.$options.propsData && !warnedEventProp) {
        warn(
          false,
          `<router-link>'s event prop is deprecated and has been removed in Vue Router 4. Use the v-slot API to remove this warning: https://next.router.vuejs.org/guide/migration/#removal-of-event-and-tag-props-in-router-link.`
        )
        warnedEventProp = true
      }
    }
    // 插槽内容默认作为 a 标签
    if (this.tag === 'a') {
      data.on = on
      data.attrs = { href, 'aria-current': ariaCurrentValue }
    } else {
      // find the first <a> child and apply listener and href
      // 找到子元素的第一个 a 标签 监听
      const a = findAnchor(this.$slots.default)
      if (a) { // 若果 a 标签存在
        // in case the <a> is a static node
        a.isStatic = false
        const aData = (a.data = extend({}, a.data))
        aData.on = aData.on || {}
        // transform existing events in both objects into arrays so we can push later
        for (const event in aData.on) {
          const handler = aData.on[event]
          if (event in on) {
            aData.on[event] = Array.isArray(handler) ? handler : [handler]
          }
        }
        // append new listeners for router-link
        for (const event in on) {
          if (event in aData.on) {
            // on[event] is always a function
            aData.on[event].push(on[event])
          } else {
            aData.on[event] = handler
          }
        }

        const aAttrs = (a.data.attrs = extend({}, a.data.attrs))
        aAttrs.href = href
        aAttrs['aria-current'] = ariaCurrentValue
      } else {
        // doesn't have <a> child, apply listener to self
        // 没有 a 标签的元素就监听自己
        data.on = on
      }
    }

    return h(this.tag, data, this.$slots.default)
  }
}
```

## router-view

> ```
> /src/components/view.js
> ```
>
> - router-view 是一个 Vue 函数式组件，在内部重写了 data.hook.init/prepatch 方法，在 patch 阶段会调用【 Vue（2.x） 源码 createComponent installComponentHooks 方法】
> - data.hook.init 是为了执行 beforeRouterEnter 的回调函数

```js
js 代码解读复制代码export default {
  name: 'RouterView',
  functional: true,
  props: {
    // 名称
    name: {
      type: String,
      default: 'default'
    }
  },
  render(_, { props, children, parent, data }) {
    // 从 context 结构的 { props, children, parent, data }
    // used by devtools to display a router-view badge
    // 将 routerView 置为 true 标记当前组件是 router-view
    data.routerView = true

    // directly use parent context's createElement() function
    // so that components rendered by router-view can resolve named slots
    // 使用父上下文的createElement()函数

    const h = parent.$createElement
    const name = props.name
    const route = parent.$route
    const cache = parent._routerViewCache || (parent._routerViewCache = {})

    // determine current view depth, also check to see if the tree
    // has been toggled inactive but kept-alive.

    // 定义一个深度
    let depth = 0
    // 不活动
    let inactive = false

    // 通过 parent 属性 判断当前节点是否为最顶层节点
    while (parent && parent._routerRoot !== parent) {
      const vnodeData = parent.$vnode ? parent.$vnode.data : {}
      if (vnodeData.routerView) { // 且是 router-view 组件 深度 ++
        depth++
      }
      if (vnodeData.keepAlive && parent._directInactive && parent._inactive) {
        inactive = true
      }
      parent = parent.$parent
    }
    data.routerViewDepth = depth

    // render previous view if the tree is inactive and kept-alive

    
    if (inactive) { // 若是不活动状态 渲染上一个路由
      const cachedData = cache[name]
      const cachedComponent = cachedData && cachedData.component
      if (cachedComponent) { // 缓存的组件
        // #2301
        // pass props
        if (cachedData.configProps) {
          fillPropsinData(
            cachedComponent,
            data,
            cachedData.route,
            cachedData.configProps
          )
        }
        // 渲染缓存的路由组件
        return h(cachedComponent, data, children)
      } else {
        // render previous empty view
        // 渲染一个空组件
        return h()
      }
    }
    // 获取匹配项
    const matched = route.matched[depth]
    // 获取匹配的组件
    const component = matched && matched.components[name]

    // render empty node if no matched route or no config component
    // 若 matched 和 component 都不存在 则渲染空
    if (!matched || !component) {
      cache[name] = null
      return h()
    }

    // cache component
    // 缓存的组件
    cache[name] = { component }

    // attach instance registration hook
    // this will be called in the instance's injected lifecycle hooks
    // 注册路由组件实例 => Vue 实例非 VueRouter
    data.registerRouteInstance = (vm, val) => {
      // val could be undefined for unregistration
      const current = matched.instances[name]
      if ((val && current !== vm) || (!val && current === vm)) {
        matched.instances[name] = val
      }
    }

    // also register instance in prepatch hook
    // in case the same component instance is reused across different routes
    // Vue 在注册普通组件时会在组件的 data.hook 上 添加 init、prepatch、insert、destroy，在组件的 patch 阶段会被调用，而在函数式组件没有这个操作，这里就是为当前 router-view 也注册了 prepatch，init 方法，在 Vue patch 阶段会调用
    ;(data.hook || (data.hook = {})).prepatch = (_, vnode) => {
      matched.instances[name] = vnode.componentInstance
    }

    // register instance in init hook
    // in case kept-alive component be actived when routes changed
    data.hook.init = vnode => {
      if (
        vnode.data.keepAlive &&
        vnode.componentInstance &&
        vnode.componentInstance !== matched.instances[name]
      ) {
        matched.instances[name] = vnode.componentInstance
      }

      // if the route transition has already been confirmed then we weren't
      // able to call the cbs during confirmation as the component was not
      // registered yet, so we call it here.
      handleRouteEntered(route)
    }
    
    const configProps = matched.props && matched.props[name]
    // save route and configProps in cache
    if (configProps) {
      extend(cache[name], {
        route,
        configProps
      })
      fillPropsinData(component, data, route, configProps)
    }

    return h(component, data, children)
  }
}
```

