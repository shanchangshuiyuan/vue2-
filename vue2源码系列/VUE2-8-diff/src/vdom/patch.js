export function patch(oldVnode, vnode) {
  if (!oldVnode) {
    return createElm(vnode); // 如果没有el元素，那就直接根据虚拟节点返回真实节点
  }

  if (oldVnode.nodeType == 1) {
    // oldVnode是真实dom元素 就代表初次渲染
    // 用vnode  来生成真实dom 替换原本的dom元素
    const parentElm = oldVnode.parentNode; // 找到他的父亲
    let elm = createElm(vnode); //根据虚拟节点 创建元素

    // 在第一次渲染后 是删除掉节点，下次在使用无法获取
    parentElm.insertBefore(elm, oldVnode.nextSibling);

    parentElm.removeChild(oldVnode);

    return elm;
  } else {
    // oldVnode是虚拟dom 就是更新过程 使用diff算法
    // 如果标签名称不一样 直接删掉老的换成新的即可
    if (oldVnode.tag !== vnode.tag) {
      // 可以通过vnode.el属性。获取现在真实的dom元素
      return oldVnode.el.parentNode.replaceChild(createElm(vnode), oldVnode.el);
    }

    // 如果标签一样比较属性 , 传入新的新的虚拟节点 ，和老的属性 。用新的属性 更新老的
    let el = (vnode.el = oldVnode.el); // 表示当前新节点 复用老节点

    // 如果两个虚拟节点是文本节点  比较文本内容 ...

    if (vnode.tag == undefined) {
      // 新老都是文本
      if (oldVnode.text !== vnode.text) {
        el.textContent = vnode.text;
      }
      return;
    }

    // 不符合上面两种 代表标签一致 并且不是文本节点
    // 为了节点复用 所以直接把旧的虚拟dom对应的真实dom赋值给新的虚拟dom的el属性

    // 更新属性
    patchProps(vnode, oldVnode.data);
    // 属性可能有删除的情况

    // 一方有儿子 ， 一方没儿子
    let oldChildren = oldVnode.children || [];
    let newChildren = vnode.children || [];

    if (oldChildren.length > 0 && newChildren.length > 0) {
      // 双方都有儿子
      //  vue用了双指针的方式 来比对
      patchChildren(el, oldChildren, newChildren);
    } else if (newChildren.length > 0) {
      // 老的没儿子 但是新的有儿子
      for (let i = 0; i < newChildren.length; i++) {
        let child = createElm(newChildren[i]);
        el.appendChild(child); // 循环创建新节点
      }
    } else if (oldChildren.length > 0) {
      // 老的有儿子 新的没儿子
      el.innerHTML = ``; // 直接删除老节点
    }
    // vue的特点是每个组件都有一个watcher，当前组件中数据变化 只需要更新当前组件
    return el;
  }
}

function isSameVnode(oldVnode, newVnode) {
  return oldVnode.tag == newVnode.tag && oldVnode.key == newVnode.key;
}

// dom的生成 ast => render方法 => 虚拟节点 => 真实dom
// 更新时需要重新创建ast语法树吗？
// 如果动态的添加了节点 （绕过vue添加的vue监控不到的） 难道不需要重新ast吗？
// 后续数据变了，只会操作自己管理的dom元素
// 如果直接操作dom 和 vue无关，不需要重新创建ast语法树

function patchChildren(el, oldChildren, newChildren) {
  let oldStartIndex = 0; //老儿子的起始下标
  let oldStartVnode = oldChildren[0]; //老儿子的第一个节点
  let oldEndIndex = oldChildren.length - 1; //老儿子的结束下标
  let oldEndVnode = oldChildren[oldEndIndex]; //老儿子的起结束节点
  let newStartIndex = 0; //同上  新儿子的
  let newStartVnode = newChildren[0];
  let newEndIndex = newChildren.length - 1;
  let newEndVnode = newChildren[newEndIndex];

  // 根据key来创建老的儿子的index映射表  类似 {'a':0,'b':1} 代表key为'a'的节点在第一个位置 key为'b'的节点在第二个位置
  const makeIndexByKey = (children) => {
    return children.reduce((memo, current, index) => {
      if (current.key) {
        memo[current.key] = index;
      }
      return memo;
    }, {});
  };
  const keysMap = makeIndexByKey(oldChildren);

  // 只有当新老儿子的双指标的起始位置不大于结束位置的时候  才能循环 一方停止了就需要结束循环
  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    // 头头比较 尾尾比较 头尾比较 尾头比较
    // 优化了 向后添加， 向前添加，尾巴移动到头部，头部移动到尾部 ，反转
    // 因为暴力对比过程把移动的vnode置为 undefined 如果不存在vnode节点 直接跳过
    if (!oldStartVnode) {
      // 已经被移动走了
      oldStartVnode = oldChildren[++oldStartIndex];
    } else if (!oldEndVnode) {
      oldEndVnode = oldChildren[--oldEndIndex];
    }
    // 同时循环新的节点和 老的节点，有一方循环完毕就结束了
    if (isSameVnode(oldStartVnode, newStartVnode)) {
      // 头头比较，发现标签一致，
      patch(oldStartVnode, newStartVnode);
      oldStartVnode = oldChildren[++oldStartIndex];
      newStartVnode = newChildren[++newStartIndex];
    } else if (isSameVnode(oldEndVnode, newEndVnode)) {
      // 从尾部开始比较
      patch(oldEndVnode, newEndVnode);
      oldEndVnode = oldChildren[--oldEndIndex];
      newEndVnode = newChildren[--newEndIndex];
    }
    // 头尾比较  =》 reverse
    // 老的头和新的尾相同 把老的头部移动到尾部
    else if (isSameVnode(oldStartVnode, newEndVnode)) {
      patch(oldStartVnode, newEndVnode);
      el.insertBefore(oldStartVnode.el, oldEndVnode.el.nextSibling); // 移动老的元素，老的元素就被移动走了，不用删除
      oldStartVnode = oldChildren[++oldStartIndex];
      newEndVnode = newChildren[--newEndIndex];
    } else if (isSameVnode(oldEndVnode, newStartVnode)) {
      // 尾头比较
      // 老的尾和新的头相同 把老的尾部移动到头部
      patch(oldEndVnode, newStartVnode);
      el.insertBefore(oldEndVnode.el, oldStartVnode.el);
      oldEndVnode = oldChildren[--oldEndIndex];
      newStartVnode = newChildren[++newStartIndex];
    } else {
      // 上述四种情况都不满足 那么需要暴力对比
      // 根据老的子节点的key和index的映射表 从新的开始子节点进行查找 如果可以找到就进行移动操作 如果找不到则直接进行插入
      // 乱序比对   核心diff
      // 1.需要根据key和 对应的索引将老的内容生成程映射表
      let moveIndex = keysMap[newStartVnode.key]; // 用新的去老的中查找
      if (moveIndex == undefined) {
        // 如果不能复用直接创建新的插入到老的节点开头处
        el.insertBefore(createElm(newStartVnode), oldStartVnode.el);
      } else {
        let moveNode = oldChildren[moveIndex];
        oldChildren[moveIndex] = null; // 此节点已经被移动走了
        el.insertBefore(moveNode.el, oldStartVnode.el);
        patch(moveNode, newStartVnode); // 比较两个节点的属性
      }
      newStartVnode = newChildren[++newStartIndex];
    }
  }
  // 如果用户追加了一个怎么办？

  // 这里是没有比对完的
  // 如果老节点循环完毕了 但是新节点还有  证明  新节点需要被添加到头部或者尾部
  if (newStartIndex <= newEndIndex) {
    for (let i = newStartIndex; i <= newEndIndex; i++) {
      // el.appendChild(createElm(newChildren[i]))
      // insertBefore方法 他可以appendChild功能 insertBefore(节点,null)  dom api

      // 这是一个优化写法 insertBefore的第一个参数是null等同于appendChild作用

      //  看一下为指针的下一个元素是否存在
      let anchor = newChildren[newEndIndex + 1] == null ? null : newChildren[newEndIndex + 1].el;
      el.insertBefore(createElm(newChildren[i]), anchor);
    }
  }
  //   如果新节点循环完毕 老节点还有  证明老的节点需要直接被删除
  if (oldStartIndex <= oldEndIndex) {
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      //  如果老的多 将老节点删除 ， 但是可能里面有null 的情况
      if (oldChildren[i] !== null) el.removeChild(oldChildren[i].el);
    }
  }
}
// 创建真实节点的
function patchProps(vnode, oldProps = {}) {
  // 初次渲染时可以调用此方法，后续更新也可以调用此方法
  let newProps = vnode.data || {};
  let el = vnode.el; // 真实节点

  // 对style样式做特殊处理 如果新的没有 需要把老的style值置为空
  // 如果老的属性有，新的没有直接删除
  let newStyle = newProps.style || {};
  let oldStyle = oldProps.style || {};
  for (let key in oldStyle) {
    if (!newStyle[key]) {
      // 新的里面不存在这个样式
      el.style[key] = "";
    }
  }

  // 如果新的节点没有 需要把老的节点属性移除
  for (let key in oldProps) {
    if (!newProps[key]) {
      el.removeAttribute(key);
    }
  }

  // 遍历新的属性 进行增加操作
  // 直接用新的生成到元素上
  for (let key in newProps) {
    if (key === "style") {
      for (let styleName in newProps.style) {
        el.style[styleName] = newProps.style[styleName];
      }
    } else {
      el.setAttribute(key, newProps[key]);
    }
  }
}

function createComponent(vnode) {
  let i = vnode.data; //  vnode.data.hook.init
  if ((i = i.hook) && (i = i.init)) {
    i(vnode); // 调用init方法
  }
  if (vnode.componentInstance) {
    // 有属性说明子组件new完毕了，并且组件对应的真实DOM挂载到了componentInstance.$el
    return true;
  }
}
export function createElm(vnode) {
  let { tag, data, children, text, vm } = vnode;
  if (typeof tag === "string") {
    // 元素
    if (createComponent(vnode)) {
      // 返回组件对应的真实节点
      return vnode.componentInstance.$el;
    }
    vnode.el = document.createElement(tag); // 虚拟节点会有一个el属性 对应真实节点
    patchProps(vnode);
    children.forEach((child) => {
      vnode.el.appendChild(createElm(child));
    });
  } else {
    vnode.el = document.createTextNode(text);
  }
  return vnode.el;
}
