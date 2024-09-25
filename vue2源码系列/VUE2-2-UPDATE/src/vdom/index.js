//处理元素(元素名称,属性,子节点) //产生虚拟节点
export function createElement(vm, tag, data = {}, ...children) {
  return vnode(vm, tag, data, data.key, children, undefined);
}

//处理文本
export function createTextElement(vm, text) {
  return vnode(vm, undefined, undefined, undefined, undefined, text);
}

//实例对象 名称 属性  属性值 后代  文本
function vnode(vm, tag, data, key, children, text) {
  return {
    vm,
    tag,
    data,
    key,
    children,
    text, //....
  };
}
