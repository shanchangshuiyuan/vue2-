# Vuex 源码解析（一） 运行测试用例以及目录介绍

> 希望你认真仔细的学完该系列能说自己精通 Vuex 3.6.2 ，本文会全面的带你深入 Vuex 底层去探索各个方法的实现原理。源码解读系列结束后会有一个手写 Vuex 系列带你最大限度的去还原 Vuex 3.6.2 【 基于 Vue 项目框架 】。

### 你能学到的内容

- install 做了什么？
- Store 类以及自带的核心方法实现。
- state 、 getters 、 commit 、 dispatch 实现
- 命名空间的计算原理，命名空间的区分 getter state mutation action 怎么实现的？
- 动态注册安装模块 registerModule 原理做了什么
- Vuex 插件的实现和调用原理
- 辅助函数的实现【 mapState 、mapGetter 、 mapMutation 、 mapAction 】

## 源码解析版本基于 3.6.2

> Vuex 3.x 是对于 Vue 2.x 版本的 [源码下载地址](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fvuejs%2Fvuex%2Freleases)

## 目录

![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/952c1f82aa73461ab4910290693ab9a0~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

- 虽然目录很多，其实核心只有 `src` 目录。源码核心都在这里
- examples 是官方给的示例文件夹

## examples

在项目根目录先安装依赖

```bash
yarn
```

在项目根目录运行

```bash
 yarn dev
```

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/74f497e806c049f3bbb86516cd1e3ae9~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

说明运行项目成功，之后可以在源码里 `debugger` 进行调试。

## src 目录

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c86d227e8bcc4e43a6f452cc8a23b405~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

### 目录内容

- `modules` 存放 `moduleCollection` 类和 `module` 类
- `plugin` 插件
- `helper.js` 实现 `mapState, mapGetters, mapActions, mapMutations` 方法的
- `index.js 、 index.cjs 、 index.mjs` 引用 Vuex 入口，导出了 `store 、install ...` 方法
- `mixin.js` `install` 核心，其实就是 `applyMixin` 方法
- `store.js` `Store` 实现核心。