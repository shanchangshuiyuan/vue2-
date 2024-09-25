# VueRouter源码解析(二)：History基类与异步执行

## base

./src/history/base.js

base.js文件内是History基类，定义了一系列通用方法。这里分析两个重要的方法transitionTo与confirmTransition。

### 几个基本函数

### transitionTo

函数有三个参数：1. 目标路径；2. 成功的回调函数onComplete；3.失败的回调函数onAbort

\1. 通过VueRouter实例的matcher方法返回匹配到route对象

\2. 调用confirmTransition方法(传入参数为成功的回调函数，失败的回调函数)。

\3. 成功的回调函数：1）更新history.current属性的值为匹配后的router；2）调用onComplete函数；3. **调用全局的** `**afterEach**` **钩子**。

\4. 失败的回调函数：1）触发失败的回调onAbort

![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1f11ec95daa24156b9e14a1dad00a30d~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### confirmTransition

confirmTransition是一个很重要的函数方法，文档内**[完整的导航解析流程](https://link.juejin.cn/?target=https%3A%2F%2Frouter.vuejs.org%2Fzh%2Fguide%2Fadvanced%2Fnavigation-guards.html%23%E7%BB%84%E4%BB%B6%E5%86%85%E7%9A%84%E5%AE%88%E5%8D%AB)**就在此函数内定义。

具体分析已经在途中的注释了。

这里提一下，在transitionTo函数执行的时调用confirmTransition函数，往confirmTransition函数传入一个成功的回调，该回调会**调用全局的** `**afterEach**` **钩子**(就是下图注释中缺失的第九点)。

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/64f4af38fc9b47f4a942d764e18ed075~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

## 几个工具函数

在梳理路由导航流程的时候，有几个工具函数看着比较绕，那么就在此处分析一下。

### runQueue

异步调用钩子函数，其中fn为confirmTransition中定义的iterator函数

![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/edead5cae36845af93173f32f38023f7~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### iterator

iterator，“迭代器”。这里的hook就是我们自己定义全局/组件内部的路由钩子函数，支持三个参数to，from，next。

其中组件的beforeRouterEnter比较特殊，在介绍它之前，先看一下queue参数。

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bef725cf89f24fca85fdf578e84682b6~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### queue1

queue包含了所有的路由钩子函数。

下图是第一段queue

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/decf62b655854a3fb42ab6ffddeafb96~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### queue1

在第一段queue执行完毕后，会再调用一次runQueue，其参数为第二段queue。

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/75db5a7827bf4e8bbd98337413b9bb50~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### 组件内置路由钩子函数提取

对于全局钩子函数直接存储在VueRouter实例中，直接调用就可以了，所有不分析了。

而对于内置路由钩子需要进行一番处理。

### extractGuards

提取匹配到的所有钩子函数

![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e91b3fb8526a42a59582db1f0f8fbd4e~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4a741809418d4a3786a4b88ad1041726~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

以beforeRouteUpdate为例

利用bindGuard绑定了上下文。

![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/09d58a42e6b2459eaa8e07c46a42d757~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### beforeRouteEnter

在有了上面的铺垫之后看一下beforeRouteEnter的特殊所在。

与别的内置钩子函数不同，这里没有传入bindGuard，而是自定义了一个回调函数

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fabfac3d7fd54260817bdb5a7c73f16e~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

VueRouter帮助用户做了一层wrapped，将beforeRouteEnter钩子的next(vm=>{//...略})中传入的函数收集到postEntercbs数组中，再在最后调用。

![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ef6aa98a73ab4f8fba43281b88308aaa~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

## 最后

runQueue其实不难，它只是利用了回到函数与递归完成异步的功能

beforeRouteEnter这里其实最关键的就是对用户自定义的钩子做了一层wrapped，以便可以在整个导航流程末尾异步执行next函数内传入的函数。

另外，runQueue的执行与钩子函数的next，可能有点绕，只要区分开，整体都很简单

本文只介绍了基类的方法，abstract/hash/history都继承了基类方法，其push等方法也都会调用transitionTo方法。因此掌握了基本的方法，其他问题不大。

本系列最后一篇，将分析两个组件vuerouter/vuelink，值得一提的是这两个组件使用了JSX的写法。