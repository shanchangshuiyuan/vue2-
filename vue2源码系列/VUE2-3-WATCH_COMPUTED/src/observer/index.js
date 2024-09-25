import { isObject } from "../utils";
import { arrayMethods } from "./array";
import Dep from "./dep";

//1.如果数据是对象，会将对象不停递归，进行劫持
//2.如果数据是数组，会重写劫持数组的方法，并对数组中不是基本数据类型的数据进行劫持

//检测数据变化，类有类型， 对象无类型
class Observe {
  constructor(data) {

    this.dep = new Dep(); // 数据可能是对象或者数组

    Object.defineProperty(data, "__ob__", {
      enumerable: false, //不可枚举
      //  值指代的就是Observer的实例
      value: this
    })
    // data.__ob__ = this; //所有被劫持过的属性都有__ob__属性

    if (Array.isArray(data)) {
      //数组劫持逻辑
      //对数组原来的方法进行改写，切片编程 高阶函数
      data.__proto__ = arrayMethods;
      //如果数组中的数据是对象类型，需要监控对象的变化
      this.observeArray(data);
    } else {
      //对象劫持逻辑
      //对对象中的所有属性 进行劫持
      this.walk(data);
    }
  }

  //对我们数组中的数组 和 数组的对象再次劫持 递归了
  observeArray(data) {
    data.forEach((item) => {
      observe(item);
    });
  }

  walk(data) {
    // 对象上的所有属性依次进行观测
    Object.keys(data).forEach((key) => {
      defineReactive(data, key, data[key]);
    });
  }
}

//数组内部的依赖收集
function dependArray(value){
  for(let i = 0; i < value.length; i++){
    let current = value[i]; //current是数组里面的数组或者对象[[[[1,2,3]]]]
    current.__ob__ && current.__ob__.dep.depend();
    if(Array.isArray(current)){ //递归收集
      dependArray(current);
    }
  }
}
// vue2 会对对象进行遍历，将每个属性 用defineProperty 重新定义, 性能差
function defineReactive(data, key, value) {
  //value 有可能是对象
  let childob = observe(value); //用户默认值是对象套对象，需要递归处理(性能较差)
  let dep = new Dep(); //每个属性都有一个Dep

  Object.defineProperty(data, key, {
    get() {
      //取值时，我希望将watcher 和 dep 对应起来
      if(Dep.target){  //此值是在模版中取得
        dep.depend(); // 让dep 记住watcher (依赖收集)
        if(childob){ // 可能是数组，可能是对象 对象也要收集依赖 后续写$set 方法时需要触发他自己的更新操作
          childob.dep.depend(); // 让数组与对象也记录watcher

          if(Array.isArray(value)){ // 如果是数组，就让数组的依赖也记录watcher
            dependArray(value); // 递归 让数组的依赖也记录watcher
          }
        }
      } 
      return value;
    },
    set(newV) {
      observe(newV); //如果用户赋值一个新对象，需要将这个对象进行劫持
      value = newV;
      dep.notify();//告诉当前的属性存放的watcher执行
    },
  });
}
export function observe(data) {
  //如果是对象才观测

  //不是对象直接跳出
  if (!isObject(data)) {
    return;
  }

  //如果对象被观测过，直接跳出
  if (data.__ob__) {
    return data.__ob__;
  }

  //默认最外层的data必须是个对象
  return new Observe(data);
}
