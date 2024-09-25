# VueRouter源码解析(三)：router-link/router-view组件

## router-link

在vue中，平常都不会写render函数，组件的render函数是静态模板编译后得到的。然而，Vue中也支持用户编写render函数。[cn.vuejs.org/v2/guide/re…](https://link.juejin.cn/?target=https%3A%2F%2Fcn.vuejs.org%2Fv2%2Fguide%2Frender-function.html%3F%23%E8%8A%82%E7%82%B9%E3%80%81%E6%A0%91%E4%BB%A5%E5%8F%8A%E8%99%9A%E6%8B%9F-DOM)

### props

![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3f2dbf04cf0f4269adfd59227a6b70ec~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### router-link

router-link作为一个组件也是会渲染内容的。其渲染内容的优先级是**作用域插槽>默认的a标签>插槽中的a标签>父组件定义的其他类型的标签。**

当然，给这些渲染内容都添加了handler事件，其事件就是router.replace/router.push方法。点击router-link渲染出的内容，改变router，因为*ro**u**t**er*，因为router加入了响应式系统，因此界面就会重新渲染了。

![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/be7cfc1fcbfa41b4b13056a720d53d53~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

## router-view

routerView是一个函数式组件，函数式组件没有data，没有组件实例。因此使用了父组件中的$createElement函数，用以渲染组件。

整体上router-view并不难，就是在组件渲染的各个时期注册了hook，理解这些hook需要在了解一些Vue源码基础上更好。

h函数第一个参数就是component，其值就是用户自定义的那些组件。

### hooks

registerRouteInstance，init，prepatch三个钩子函数都是往record.instances对象中存入/更新组件实例，以供后续调用。

### 嵌套路由实现

但是仔细思考会发现，自定义的routes是有层级关系的，那么router-view是如何判断层级关系并精准渲染出视图的？

在第一篇文章中，我反复强调了matched是一个由record类型元素组成的，其index由0到最后因此是父--->子。而routerView的render函数通过定义一个depth参数，来判断当前嵌套的路由是位于matched函数的哪个index，然后取出对应的record对象，渲染器对应的组件。

### keep-alive

在首次渲染组件的时候，内部cache对象就会缓存component。如果父组件被keep-alive了就会读取缓存然后渲染component。

而在router-view外层套上keep-alive是用keep-alive内部的缓存所有路由组件(而，router-view内部的对象缓存有限制，incluede/excluede/max)

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1106f5358caa4ac2915d4f6f3f299a69~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

## 最后

在充分理解history，matched数组，record，rawLocation类型，match，transitionTo，confirmTransition方法之后，再结合将$route加入响应式系统。我们就可以知道为何路由变化会导致视图更新。这时候需要router-view来实现视图的渲染。而router-link则是给用户以交互，来出发路由变化。

router-view/router-link两组件，其实并没有很复杂的地方，只不过对于一个框架级别的插件需靠考虑的点比较多，而分析源码只要抓住最核心的思路就可以。在组件render函数中提到了插槽，事件等，正好之前写过几篇文章。

Vue中的插槽解析之作用域插槽：[juejin.cn/post/686792…](https://juejin.cn/post/6867921071950004231)

Vue中的插槽解析之普通插槽：[juejin.cn/post/686679…](https://juejin.cn/post/6866791720172912653)

vue中的事件：原生事件与自定义事件：[juejin.cn/post/686120…](https://juejin.cn/post/6861206075744452622)

VueRouter源码解析(一)：插件安装，几个类型，几个方法：[juejin.cn/post/687273…](https://juejin.cn/post/6872733826012217351)

VueRouter源码解析(二)：History基类与异步执行：
[juejin.cn/post/687347…](https://juejin.cn/post/6873479973681037325)