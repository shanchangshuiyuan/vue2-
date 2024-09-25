// patch用来渲染和更新视图 今天只介绍初次渲染的逻辑
export function patch(oldVnode, vnode) {
  // 判断传入的oldVnode是否是一个真实元素
  // 这里很关键  初次渲染 传入的vm.$el就是咱们传入的el选项  所以是真实dom
  // 如果不是初始渲染而是视图更新的时候  vm.$el就被替换成了更新之前的老的虚拟dom

  if (oldVnode.nodeType === 1) {
    //用vnode来生成真实dom 替换成原本的dom元素

    const parentElm = oldVnode.parentNode; //找到父元素

    let elm = createElement(vnode); //根据虚拟节点 创建元素
    // 这里不直接使用父元素appendChild是为了不破坏替换的位置
    parentElm.insertBefore(elm, oldVnode.nextSibling); //在原来的dom元素创建新的dom元素
    parentElm.removeChild(oldVnode); //删除原来的dom元素
  }
}

//创建元素
function createElement(vnode) {
  let { tag, data, children, text, vm } = vnode;

  //判断虚拟dom 是元素节点还是文本节点
  if (typeof tag === "string") {
    vnode.el = document.createElement(tag); //虚拟节点会有一个el属性对应真实节点

    // 解析虚拟dom属性
    updateProperties(vnode);
    //递归遍历孩子
    children.forEach((child) => {
      vnode.el.appendChild(createElement(child));
    });
  } else {
    vnode.el = document.createTextNode(text); //文本节点
  }

  return vnode.el;
}

// 解析vnode的data属性 映射到真实dom上
function updateProperties(vnode) {
  let newProps = vnode.data || {};
  let el = vnode.el; //真实节点
  for (let key in newProps) {
    // style需要特殊处理下
    if (key === "style") {
      for (let styleName in newProps.style) {
        if (styleName.match(/-/g)) {
          styleName.split("-").map((word, index) =>index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)).join("");
          el.style[styleName] = newProps.style[styleName];
        } else {
          el.style[styleName] = newProps.style[styleName];
        }
      }
    } else if (key === "class") {
      el.className = newProps.class;
    } else {
      // 给这个元素添加属性 值就是对应的值
      el.setAttribute(key, newProps[key]);
    }
  }
}
