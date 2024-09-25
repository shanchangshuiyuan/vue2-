let oldArrayPrototype = Array.prototype;
export let arrayMethods = Object.create(oldArrayPrototype);
// arrayMethods.__proto__ = Array.prototype 继承

let methods = ["push", "shift", "unshift", "pop", "reverse", "sort", "splice"];

methods.forEach((method) => {
  //用户调用的如果是以上的七个方法会用我自己重写的，否则用原来的数组方法
  arrayMethods[method] = function (...args) {
    //args 是参数列表 arr.push(1,2,3)
    //相当于数组调用了重写后的方法。
    oldArrayPrototype[method].call(this, ...args); //arr.push(1,2,3)

    let inserted;
    let ob = this.__ob__; //this.__ob__ 根据当前数组是数组的observer对象的实例, 获取到observeArray这个方法;
    switch (method) {
      case "push":
      case "unshift":
        inserted = args; //新增的内容
        break;
      case "splice":
        inserted = args.slice(2);
        break;
    }

    //如果有新增的内容要继续进行劫持 我需要观测数组的中的每一项(每一项可能是数组或对象) 而不是整个数组
    if(inserted) ob.observeArray(inserted);

    //数组自己的dep
    ob.dep.notify();
  };
});