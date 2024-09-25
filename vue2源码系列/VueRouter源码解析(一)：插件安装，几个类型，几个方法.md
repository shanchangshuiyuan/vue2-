# VueRouter源码解析(一)：插件安装，几个类型，几个方法

## 插件注册

老生常谈的问题了，在Vuex分析的文章中，就有插件功能的分析([juejin.cn/user/208432…](https://juejin.cn/user/2084329778852557)。)

### Vue.use

[cn.vuejs.org/v2/api/#Vue…](https://link.juejin.cn/?target=https%3A%2F%2Fcn.vuejs.org%2Fv2%2Fapi%2F%23Vue-use%EF%BC%8C%E6%9C%AC%E8%B4%A8%E4%B8%8A%E5%B0%B1%E6%98%AF%E8%B0%83%E7%94%A8%E4%BA%86install%E6%96%B9%E6%B3%95)

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/baf2aaf3bf4b4b78b1b239467139dd7a~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### install

\1. 为install函数添加静态属性installed，以此来防止插件多次安装

\2. 调用Vue.mixin，全局混入beforeCreate与destoryed方法。

  2.1在beforeCreate方法中通过组件之间的父子关系，让根组件(app.vue)的后代们都可以访      问到根组件的VueRouter实例。

  2.2 **调用VueRouter实例的init方法。**

  2.2 利用Vue.util.defineReactive方法向根组件添加_route属性，其值为Vue应用当前的路       由地址，如此一来根据【当前路由地址】的变化来驱动视图改变。

\3. 在Vue的原型链上添加router属性与*ro**u**t**er*属性与route属性，两个属性都为【只读】属性。其中router的值为VueRouter实例，*ro**u**t**er*的值为*V**u**e**R**o**u**t**er*实例，route当前路由地址。

\4. 注册RouterView，RouterLink组件

\5. beforeRouter/beforeRouteLeave/beforeRouterUpdate的合并策略与created的合并策略一致。

![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/afd13b99cfc141208c760352402800cb~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### this._router.init(this)

VueRouter自带对滚动轴的控制功能，init主要做的事情是：1）对scroll事件进行监听；2）可以向多个组件传入router，但是要保证不会重复监听scorll事件。

![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/26f2c3f9af054247a2ba430f227639f2~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

## new VueRouter

直接看构造函数吧，最主要是是createMatcher方法与history实例。

\1. VueRouter路由模式一般来说是由两种hash模式与html5模式，当然，这个是在浏览器端。在非浏览器环境下还有abstract模式。

\2. createMatcher方法。返回addRouters与matcher方法。这两个是VueRouter最核心的方法。

![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9fefe4d0392b489886aa862f440ff7ef~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### createMatcher

在分析createMatcher方法之前，先给几个基本信息。有了这些信息会更好地了解VueRouter是如何工作的。

Vue全家桶的开发都用了Facebook的flow，下面就来看几个类型。

在我分析VueRouter源码的时候有写地方看着很迷糊，又是record又是location的。最后我发现这些都是有不同用处的。而类型也都在flow内声明了。

这里最值得注意的是RouteRecord类型(对应源码中的变量为record)含有components属性，其值肯定是Vue组件。

Route类型(对应源码中的变量为route)含有matched属性，其值为一连串具有父子关系的record组成的数组。

RawLocation(对应源码中的变量为raw)是字符串或者Route类型，为路由跳转的目的地。

![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c15ea3a071944755bf2c18fbffa0f1c4~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

现在正式分析createMatcher方法

\1. 将用户自定义的路由传入createRouteMap函数得到，所有自定义路由path组成的数组pathList；path为key，route为值组成的pathMap；name为key，route为值组成的nameMap

\2. 定义 addRoutes方法，其核心就是调用createRouteMap方法(传入旧的pathList，pathMap，nameMap)。

\3. 定义 match方法

![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ae7bf4e261b54b49af01f928430253ab~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### 1. createRouteMap 与 addRouteRecord

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7f6bdab5203d4497aeeca023d04ac6a5~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

\1. createRouteMap会遍历用户自定义路由数组调用addRouteRecord方法。

\2. 用户可以传入通配符*，保证*出现在路径数组pathList的最后

![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b7feb630d7f34a99acfa1f55c5a00d1a~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

addRouteRecord

\1. 标准化用户自定义路径

\2. 定义record对象，其含有components对象，一般我们都会在自定义路由内使用component而非components，如果写了component，会被转换为coomponents，其key为default，value为用户引入的组件

\3. 如果自定义路由有children属性就遍历子元素递归调用addRouteRecord函数

\4. pathMap对象，pathList数组添加元素(同样的key不会被二次加入)

\5. 如果自定义了**alias**的值，那么就**把用户自定义的alias当成path**，再执行一遍addRouteRecord函数

\6. 如果用户自定义了name的值，就往nameMap属性内添加元素(相同的name不会被二次加入，如果非生产环境下，会提示重复添加相同名称的路由，这里只是提示，其实根本不用处理，因为在官方issure下看见有人提了，所以特地看了一下这方面的源码，其实只要开发中保证每一个路由地址都有独一无二的name值，就不会出现问题。issure地址：)

\7. 函数是没有返回值的，因为传入的pathList，pathMap，nameMap都是引用对象

![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f607f22d489f464da7f7622d351d2ebc~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### 2. addRoutes

pathList，pathMap，nameMap为引用对象，其值为初次创建路由时会产生的。

用词方法我们可以动态添加路由，动态添加路由的时候会出现重复添加名称相同路由的问题，第一部分已经详细说过，不再赘述。 

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9ecabe97e06f4378b1e3bdb7a55e947d~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### 3. match

match方法有三个参数，分别是要跳转到路径，现在的路径，重定向参数

\1. normalizeLocation根据跳转路径与现在路径获取标准化的目标路径，其为Location类型

\2. 如果要跳转的标准化路径对象有name属性就直接获取name对应的record并创建route类型的对象返回

\3. 没有name属性就获取path对应的record并创建爱你route类型的对象返回

\4. 如果既没有name也没有path就返回一个空的route类型对象

**注：跳转的时候可以传入name属性，name优先级高于path/alias**

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/86291f6dc05345aa81523be0cfc91abc~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### 4. _createRoute与createRoute

上小节提到根据record常见route类型的对象，正是利用了_createRoute函数。

redirect与alias就先略过了，重点 看createRoute方法

![img](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/836f95ea81fb4ee595fee73c5c8f28b7~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

createRoute方法中最需要关注的route的matched属性，如果有match函数执行后匹配到的record对象，那么就会调用formatMatch函数返回值并赋给matched属性。

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7b9f74a65fb2473f931d16124633d15d~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### 5. formarMatch

其实formatMatch很简单，在用户定义的routes对象内都有父子关系，record之间也会建立斧子关系，那么route类型的matched属性的值就是一个record类型组成的数组，数组index从0是祖先，最后一个是匹配到的record。

这个伏笔在RouterView组件会再次出现。

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f6535ea5206c49da979bdd37900eb61a~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

## 最后

文章大概会分3-4个篇。

这篇先介绍了一个组件的安装与初始化。介绍了Location，record，raw，route的类型，为后续的分析打下基础。

随后分析了addRoutes与match方法。知道了addRoutes其实就是往pathList，pathMap，nameMap对象添加用户自定义路由；match就是根据传入的目标路由与现在的路径获取route对象，其中牵扯到了location，record，raw，route几个类型的值，在有前面的类型介绍之后会容易理解很多。

下篇文章会分析一下history类。