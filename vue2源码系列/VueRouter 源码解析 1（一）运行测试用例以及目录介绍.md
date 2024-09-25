# ueRouter 源码解析（一）运行测试用例以及目录介绍

## 基于 VueRouter 3.6.3 版本

## 下载

> 可能不是文章对应的版本

```bash
bash

 代码解读
复制代码git clone https://github.com/vuejs/vue-router
```

若官网最新的非 3.6.3 版本，[下载 3.6.3](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Fvuejs%2Fvue-router%2Freleases%2Ftag%2Fv3.6.3) 下载源码压缩包

## 目录

```bash
bash 代码解读复制代码├── CHANGELOG.md
├── LICENSE
├── README.en.md
├── README.md
├── assets
├── build
├── dist
├── docs
├── docs-gitbook
├── examples        //官方给的示例
├── flow        //类型声明
├── netlify.toml
├── package.json
├── scripts
├── src     //源码核心位置
├── test
├── types   //类型声明
├── vetur
└── yarn.lock       //版本文件
```

### examples

此处放了官方给的实例，如何跑起来进行调试

- 安装依赖

```bash
bash 代码解读复制代码// 根目录
yarn
```

- 运行项目

```bash
bash

 代码解读
复制代码yarn dev
```

在源码里打上断点 即可调试

### `src` 目录

```js
js 代码解读复制代码├── components
├── composables
├── entries
├── history
├── util
├── create-matcher.js
├── create-route-map.js
├── index.js
├── install.js
└── router.js
```

- `components` 存放 `router-link router-view` 组件
- `entries` `vueRouter` 入口 最终实例声明还是在 `router.js`
- `history` 存放路由模式实体类 `History 、HashHistory 、 HTML5History 、 AbstractHistory` 实体类
- `util` 里面存放了很多工具函数
- `creat-matcher.js`  创建匹配器
- `create-route-map.js` 创建 `pathMap 、 pathList 、nameMap` 等的方法
- `install.js` `VueRouter` 的 `install` 方法
- `router.js` `VueRouter` 实例存放位置



作者：KnowledgeHasNoLimit
链接：https://juejin.cn/post/7224334902325346362
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。