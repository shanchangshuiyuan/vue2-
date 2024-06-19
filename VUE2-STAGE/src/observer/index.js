import { isObject } from "../utils";
import { arrayMethods } from "./array";

//1.如果数据是对象，会将对象不停递归，进行劫持
//2.如果数据是数组，会重写劫持数组的方法，并对数组中不是基本数据类型的数据进行劫持

//检测数据变化，类有类型， 对象无类型
class Observe {
  constructor(data) {

    Object.defineProperty(data, "__ob__", {
      enumerable: false, //不可枚举
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
    Object.keys(data).forEach((key) => {
      defineReactive(data, key, data[key]);
    });
  }
}

// vue2 会对对象进行遍历，将每个属性 用defineProperty 重新定义, 性能差
function defineReactive(data, key, value) {
  //value 有可能是对象
  observe(value); //用户默认值是对象套对象，需要递归处理(性能较差)
  Object.defineProperty(data, key, {
    get() {
      return value;
    },
    set(newV) {
      observe(newV); //如果用户赋值一个新对象，需要将这个对象进行劫持
      value = newV;
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
    return;
  }

  //默认最外层的data必须是个对象
  return new Observe(data);
}
