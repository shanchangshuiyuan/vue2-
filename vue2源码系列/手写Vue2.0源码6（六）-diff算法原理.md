### 前言

此篇主要手写 Vue2.0 源码-**diff 算法原理**

上一篇咱们主要介绍了 Vue [异步更新原理](https://juejin.cn/post/6939704519668432910) 是对视图更新的性能优化 此篇同样是对渲染更新的优化 当模板发生变化之后 我们可以利用 diff 算法 对比新老虚拟 dom 看是否能进行节点复用 diff 算法也是 vue 面试比较热门的考点哈

**适用人群：**

1.想要深入理解 vue 源码更好的进行日常业务开发

2.想要在简历写上精通 vue 框架源码（再也不怕面试官的连环夺命问 哈哈）

3.没时间去看官方源码或者初看源码觉得难以理解的同学

------

### 正文

```html
<script>
  // Vue实例化
  let vm = new Vue({
    el: "#app",
    data() {
      return {
        a: 123,
      };
    },
    template: `<div id="a">hello {{a}}</div>`,
  });

  setTimeout(() => {
    vm.a = 1;
  }, 1000);
</script>
```

大家思考一下 如果我们当初始渲染完成 1 秒后改变了一下模板里面 a 的值 vue 会怎么处理来显示最新的值呢?

1.把上次渲染的真实 dom 删除 然后重新渲染一个新的 dom 节点来应用最新的 a 的值

2.把老的 dom 进行复用 改变一下内部文本节点的 textContent 的值

> 这两种方案 很明显后者的性能开销更小 一起来看看 vue 怎么使用 diff 算法来进行渲染更新的吧

#### 1.patch 核心渲染方法改写

```javascript
// src/vdom/patch.js

export function patch(oldVnode, vnode) {
  const isRealElement = oldVnode.nodeType;
  if (isRealElement) {
    // oldVnode是真实dom元素 就代表初次渲染
  } else {
    // oldVnode是虚拟dom 就是更新过程 使用diff算法
    if (oldVnode.tag !== vnode.tag) {
      // 如果新旧标签不一致 用新的替换旧的 oldVnode.el代表的是真实dom节点--同级比较
      oldVnode.el.parentNode.replaceChild(createElm(vnode), oldVnode.el);
    }
    // 如果旧节点是一个文本节点
    if (!oldVnode.tag) {
      if (oldVnode.text !== vnode.text) {
        oldVnode.el.textContent = vnode.text;
      }
    }
    // 不符合上面两种 代表标签一致 并且不是文本节点
    // 为了节点复用 所以直接把旧的虚拟dom对应的真实dom赋值给新的虚拟dom的el属性
    const el = (vnode.el = oldVnode.el);
    updateProperties(vnode, oldVnode.data); // 更新属性
    const oldCh = oldVnode.children || []; // 老的儿子
    const newCh = vnode.children || []; // 新的儿子
    if (oldCh.length > 0 && newCh.length > 0) {
      // 新老都存在子节点
      updateChildren(el, oldCh, newCh);
    } else if (oldCh.length) {
      // 老的有儿子新的没有
      el.innerHTML = "";
    } else if (newCh.length) {
      // 新的有儿子
      for (let i = 0; i < newCh.length; i++) {
        const child = newCh[i];
        el.appendChild(createElm(child));
      }
    }
  }
}
```

我们直接看 else 分支 代表的是渲染更新过程 可以分为以下几步

1.diff 只进行同级比较 ![diff同级对比.jpg](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5a856bf3d3fa49698f70122bc0c09ab3~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

2.根据新老 vnode 子节点不同情况分别处理 ![diff流程.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/90304a24ceab464abe2eafcef9490091~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

#### 2.updateProperties 更新属性

```javascript
//  src/vdom/patch.js

// 解析vnode的data属性 映射到真实dom上
function updateProperties(vnode, oldProps = {}) {
  const newProps = vnode.data || {}; //新的vnode的属性
  const el = vnode.el; // 真实节点
  // 如果新的节点没有 需要把老的节点属性移除
  for (const k in oldProps) {
    if (!newProps[k]) {
      el.removeAttribute(k);
    }
  }
  // 对style样式做特殊处理 如果新的没有 需要把老的style值置为空
  const newStyle = newProps.style || {};
  const oldStyle = oldProps.style || {};
  for (const key in oldStyle) {
    if (!newStyle[key]) {
      el.style[key] = "";
    }
  }
  // 遍历新的属性 进行增加操作
  for (const key in newProps) {
    if (key === "style") {
      for (const styleName in newProps.style) {
        el.style[styleName] = newProps.style[styleName];
      }
    } else if (key === "class") {
      el.className = newProps.class;
    } else {
      // 给这个元素添加属性 值就是对应的值
      el.setAttribute(key, newProps[key]);
    }
  }
}
```

对比新老 vnode 进行属性更新

#### 3.updateChildren 更新子节点-diff 核心方法

```javascript
// src/vdom/patch.js

// 判断两个vnode的标签和key是否相同 如果相同 就可以认为是同一节点就地复用
function isSameVnode(oldVnode, newVnode) {
  return oldVnode.tag === newVnode.tag && oldVnode.key === newVnode.key;
}
// diff算法核心 采用双指针的方式 对比新老vnode的儿子节点
function updateChildren(parent, oldCh, newCh) {
  let oldStartIndex = 0; //老儿子的起始下标
  let oldStartVnode = oldCh[0]; //老儿子的第一个节点
  let oldEndIndex = oldCh.length - 1; //老儿子的结束下标
  let oldEndVnode = oldCh[oldEndIndex]; //老儿子的起结束节点

  let newStartIndex = 0; //同上  新儿子的
  let newStartVnode = newCh[0];
  let newEndIndex = newCh.length - 1;
  let newEndVnode = newCh[newEndIndex];

  // 根据key来创建老的儿子的index映射表  类似 {'a':0,'b':1} 代表key为'a'的节点在第一个位置 key为'b'的节点在第二个位置
  function makeIndexByKey(children) {
    let map = {};
    children.forEach((item, index) => {
      map[item.key] = index;
    });
    return map;
  }
  // 生成的映射表
  let map = makeIndexByKey(oldCh);

  // 只有当新老儿子的双指标的起始位置不大于结束位置的时候  才能循环 一方停止了就需要结束循环
  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    // 因为暴力对比过程把移动的vnode置为 undefined 如果不存在vnode节点 直接跳过
    if (!oldStartVnode) {
      oldStartVnode = oldCh[++oldStartIndex];
    } else if (!oldEndVnode) {
      oldEndVnode = oldCh[--oldEndIndex];
    } else if (isSameVnode(oldStartVnode, newStartVnode)) {
      // 头和头对比 依次向后追加
      patch(oldStartVnode, newStartVnode); //递归比较儿子以及他们的子节点
      oldStartVnode = oldCh[++oldStartIndex];
      newStartVnode = newCh[++newStartIndex];
    } else if (isSameVnode(oldEndVnode, newEndVnode)) {
      //尾和尾对比 依次向前追加
      patch(oldEndVnode, newEndVnode);
      oldEndVnode = oldCh[--oldEndIndex];
      newEndVnode = newCh[--newEndIndex];
    } else if (isSameVnode(oldStartVnode, newEndVnode)) {
      // 老的头和新的尾相同 把老的头部移动到尾部
      patch(oldStartVnode, newEndVnode);
      parent.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling); //insertBefore可以移动或者插入真实dom
      oldStartVnode = oldCh[++oldStartIndex];
      newEndVnode = newCh[--newEndIndex];
    } else if (isSameVnode(oldEndVnode, newStartVnode)) {
      // 老的尾和新的头相同 把老的尾部移动到头部
      patch(oldEndVnode, newStartVnode);
      parent.insertBefore(oldEndVnode.el, oldStartVnode.el);
      oldEndVnode = oldCh[--oldEndIndex];
      newStartVnode = newCh[++newStartIndex];
    } else {
      // 上述四种情况都不满足 那么需要暴力对比
      // 根据老的子节点的key和index的映射表 从新的开始子节点进行查找 如果可以找到就进行移动操作 如果找不到则直接进行插入
      let moveIndex = map[newStartVnode.key];
      if (!moveIndex) {
        // 老的节点找不到  直接插入
        parent.insertBefore(createElm(newStartVnode), oldStartVnode.el);
      } else {
        let moveVnode = oldCh[moveIndex]; //找得到就拿到老的节点
        oldCh[moveIndex] = undefined; //这个是占位操作 避免数组塌陷  防止老节点移动走了之后破坏了初始的映射表位置
        parent.insertBefore(moveVnode.el, oldStartVnode.el); //把找到的节点移动到最前面
        patch(moveVnode, newStartVnode);
      }
    }
  }
  // 如果老节点循环完毕了 但是新节点还有  证明  新节点需要被添加到头部或者尾部
  if (newStartIndex <= newEndIndex) {
    for (let i = newStartIndex; i <= newEndIndex; i++) {
      // 这是一个优化写法 insertBefore的第一个参数是null等同于appendChild作用
      const ele =
        newCh[newEndIndex + 1] == null ? null : newCh[newEndIndex + 1].el;
      parent.insertBefore(createElm(newCh[i]), ele);
    }
  }
  // 如果新节点循环完毕 老节点还有  证明老的节点需要直接被删除
  if (oldStartIndex <= oldEndIndex) {
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      let child = oldCh[i];
      if (child != undefined) {
        parent.removeChild(child.el);
      }
    }
  }
}
```

这段代码特别长 但是理解起来其实可以简单的分为以下几点

1.使用双指针移动来进行新老节点的对比 ![diff双指针.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5d3aa437b5724cbfbdb0cf4503e7aa12~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

2.用 isSameVnode 来判断新老子节点的头头 尾尾 头尾 尾头 是否是同一节点 如果满足就进行相应的移动指针(头头 尾尾)或者移动 dom 节点(头尾 尾头)操作

3.如果全都不相等 进行暴力对比 如果找到了利用 key 和 index 的映射表来移动老的子节点到前面去 如果找不到就直接插入

![diff暴力对比.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c790b59c7c6f4708912be3598c42811f~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

4.对老的子节点进行递归 patch 处理

5.最后老的子节点有多的就删掉 新的子节点有多的就添加到相应的位置

#### 4.改造原型渲染更新方法_update

```javascript
// src/lifecycle.js

export function lifecycleMixin(Vue) {
  // 把_update挂载在Vue的原型
  Vue.prototype._update = function (vnode) {
    const vm = this;
    const prevVnode = vm._vnode; // 保留上一次的vnode
    vm._vnode = vnode;
    if (!prevVnode) {
      // patch是渲染vnode为真实dom核心
      vm.$el = patch(vm.$el, vnode); // 初次渲染 vm._vnode肯定不存在 要通过虚拟节点 渲染出真实的dom 赋值给$el属性
    } else {
      vm.$el = patch(prevVnode, vnode); // 更新时把上次的vnode和这次更新的vnode穿进去 进行diff算法
    }
  };
}
```

改造_update 方法 在 Vue 实例的_vnode 保留上次的 vnode 节点 以供 patch 进行新老虚拟 dom 的对比

#### 5.diff 算法的思维导图

![Vue2.0源码-diff算法.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f964567d4dbc4228bf9bdbdb4ad70c06~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

## 小结

至此 Vue 的 diff 算法源码已经完结 大家主要理解 diff 整个过程 此篇代码量和难度稍微偏大 建议大家反复看 因为 diff 算法是 vue 里面非常核心的知识点 也是面试的常考点 大家可以看着思维导图自己动手写一遍核心代码哈 遇到不懂或者有争议的地方欢迎评论留言



作者：前端鲨鱼哥
链接：https://juejin.cn/post/6953433215218483236
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。