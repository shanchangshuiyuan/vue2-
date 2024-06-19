(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

    function compileToFunction(template){
        console.log(template);
    }

    function isFunction(val){
        return typeof val === 'function';
    }

    function isObject(val){
        return typeof val === 'object' && val !== null;
    }

    let oldArrayPrototype = Array.prototype;
    let arrayMethods = Object.create(oldArrayPrototype);
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
      };
    });

    //1.如果数据是对象，会将对象不停递归，进行劫持
    //2.如果数据是数组，会重写劫持数组的方法，并对数组中不是基本数据类型的数据进行劫持

    //检测数据变化，类有类型， 对象无类型
    class Observe {
      constructor(data) {

        Object.defineProperty(data, "__ob__", {
          enumerable: false, //不可枚举
          //  值指代的就是Observer的实例
          value: this
        });
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
    function observe(data) {
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

    function initState(vm) {
      const opts = vm.$options;
      // 这里初始化的顺序依次是 prop>methods>data>computed>watch
      if (opts.data) {
        initData(vm);
      }
      if (opts.computed) {
        initComputed();
      }
      if (opts.watch) {
        initWatch();
      }
    }

    // 初始化data数据
    function initData(vm) {
      let data = vm.$options.data;
      // vue2中会将data的所有数据 进行数据劫持 Object.defineProperty

      //data.call(vm) 将this指向vm并调用一下该方法保证返回的是一个对象 通过_data进行关联
      data = vm._data = isFunction(data) ? data.call(vm) : data;

      // 把data数据代理到vm 也就是Vue实例上面 我们可以使用this.a来访问this._data.a
      for (let key in data) {
        proxy(vm, "_data", key); //vm.name == 'xxx'
      }

      //对数据进行观测 --响应式数据核心
      observe(data);
    }

    //代理函数
    // Object.defineProperty(object, key, { ... })：
    // 在目标对象 object 上定义一个新的属性 key，并通过配置属性描述符（descriptor）来设置它的 getter 和 setter。
    function proxy(vm, source, key) {
      Object.defineProperty(vm, key, {
        get() {
          return vm[source][key];
        },
        set(newValue) {
          vm[source][key] = newValue;
        },
      });
    }

    function initMixin(Vue) {
      //表示在vue的基础上做一次混合操作
      Vue.prototype._init = function (options) {
        //el data
        const vm = this;
        vm.$options = options; //会对options进行扩展

        //对数据进行初始化 watch computed props data ...
        initState(vm); //vue.$options.data 数据劫持

        if (vm.$options.el) {
          vm.$mount(vm.$options.el);
        }
      };

      Vue.prototype.$mount = function (el) {
        const vm = this;
        const options = vm.$options;
        el = document.querySelector(el);

        // 把模版转换为 对应的渲染函数 => 虚拟dom概念 vnode =>diff算法 更新虚拟dom => 产生真实节点，更新
        if (!options.render) {
          // 如果没有render函数，则使用template 目前没有render
          let template = options.template;
          if (!template && el) {
            // 如果没有template，但是有el，则使用el
            template = el.outerHTML;
            let render = compileToFunction(template);
            options.render = render;
          }
        }
        //options.render就是渲染函数
      };
    }

    function Vue(options) {
        //options 为用户传入的选项
        this._init(options); //初始化操作，组件
    }

    // 扩展原型
    // initMixin 把_init 方法挂载在 Vue 原型 供 Vue 实例调用
    initMixin(Vue);

    return Vue;

}));
//# sourceMappingURL=vue.js.map
