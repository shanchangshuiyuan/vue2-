(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';

  const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g; //匹配花括号 {{  }} 捕获花括号里面的内容
  // 处理attrs属性
  function genProps(attrs) {
    //[{name:'id',value:'app'}]
    let str = "";
    for (let i = 0; i < attrs.length; i++) {
      let attr = attrs[i];

      //对attr中的style单独进行处理
      if (attr.name === "style") {
        let styleObj = {};
        attr.value.replace(/([^;:]+)\:([^;:]+)/g, function () {
          // 以;分割
          styleObj[arguments[1]] = arguments[2];
        });
        attr.value = styleObj;
      }
      str += `${attr.name}:${JSON.stringify(attr.value)},`;
    }

    return `{${str.slice(0, -1)}}`;
  }

  function gen(el) {

    // 判断节点类型
    // 主要包含处理文本核心
    // 源码这块包含了复杂的处理  比如 v-once v-for v-if 自定义指令 slot等等  咱们这里只考虑普通文本和变量表达式{{}}的处理

    //如果是元素,则递归生成
    if (el.type === 1) {
      //   递归创建
      return generate(el);
    } else {
      //   如果是文本节点
      let text = el.text;

      // 不存在花括号变量表达式
      if (!defaultTagRE.test(text)) {
        return `_v('${text}')`;
      } else {
        // 有花括号变量表达式 {{attr}}
        let tokens = [];

        let match;

        // 正则是全局模式 每次需要重置正则的lastIndex属性  不然会引发匹配bug
        let lastIndex = (defaultTagRE.lastIndex = 0);

        while ((match = defaultTagRE.exec(text))) {
          //看有没有匹配到
          let index = match.index; //开始索引

          if (index > lastIndex) {
            //   匹配到的{{位置  在tokens里面放入普通文本
            tokens.push(JSON.stringify(text.slice(lastIndex, index)));
          }
           //   放入捕获到的变量内容
          tokens.push(`_s(${match[1].trim()})`); //防止拼的变量是对象类型  JSON.stringify()

          //   匹配指针后移
          lastIndex = index + match[0].length; //结尾索引
        }

        // 如果匹配完了花括号  text里面还有剩余的普通文本 那么继续push
        if (lastIndex < text.length) {
          tokens.push(JSON.stringify(text.slice(lastIndex)));
        }

        // _v表示创建文本
        return `_v(${tokens.join("+")})`;
      }
    }
  }

  // 生成子节点 调用gen函数进行递归创建
  function genChildren(el) {
    let children = el.children;

    if (children) {
      return children.map((c) => gen(c)).join(",");
    }
  }

  // html字符串=>字符串_c('div',{id:'app',a:1},"hello")
  function generate(el) {

    let children = genChildren(el);

    //遍历树，将树拼接成字符串
    let code = `_c('${el.tag}',${el.attrs.length ? genProps(el.attrs) : "undefined"}${
    children ? `,${children}` : ""
  })`;

    return code;
  }

  // 以下为源码的正则  对正则表达式不清楚的同学可以参考小编之前写的文章(前端进阶高薪必看 - 正则篇);
  const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`; //匹配标签名 形如 abc-123
  const qnameCapture = `((?:${ncname}\\:)?${ncname})`; //匹配特殊标签 形如 abc:234 前面的abc:可有可无
  const startTagOpen = new RegExp(`^<${qnameCapture}`); // 匹配开始标签 形如 <abc-123 捕获里面的标签名
  const startTagClose = /^\s*(\/?)>/; // 匹配标签结束  >
  const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配标签结尾 如 </abc-123> 捕获里面的标签名
  const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性  形如 id="app"

  // 将解析后的结果 组装成一个树结构 栈

  // 生成ast方法
  function createAstElement(tagName, attrs) {
    return {
      tag: tagName,
      type: 1, //元素类型
      children: [],
      parent: null,
      attrs,
    };
  }

  //根节点
  let root = null;
  //判断标签关系的栈
  let stack = [];

  function start(tagName, attributes) {

    let parent = stack[stack.length - 1];

    let element = createAstElement(tagName, attributes);

    //如若没有根节点，将次元素作为根节点
    if (!root) {
      root = element;
    }
    element.parent = parent; //当放入栈中，继续父亲是谁

    //形成树结构
    if (parent) {
      parent.children.push(element);
    }
    stack.push(element);
  }

  function end(tagName) {
    let last = stack.pop();
    if (last.tag !== tagName) {
      throw new Error("标签有误");
    }
  }

  function chars(text) {
    text = text.replace(/\s/g, "");// 去掉空格
    let parent = stack[stack.length - 1];
    if (text) {
      parent.children.push({
        type: 3, //文本类型
        text,
      });
    }
  }

  // 利用正则 匹配 html 字符串 遇到开始标签 结束标签和文本 解析完毕之后生成对应的 
  // ast 并建立相应的父子关联 不断的 advance 截取剩余的字符串 直到 html 全部解析完毕 
  // 咱们这里主要写了对于开始标签里面的属性的处理--parseStartTag



  // html字符串解析成对应的脚本来触发
  function parserHTML(html) {
    //截取html字符串 每次匹配到了就往前继续匹配
    function advance(len) {
      html = html.substring(len);
    }

    // 匹配开始标签
    function parseStartTag() {
      const start = html.match(startTagOpen);

      if (start) {
        const match = {
          tagName: start[1], //捕获标签名
          attrs: [], //标签属性
        };

        //匹配到了开始标签 就截取掉
        advance(start[0].length);

        // 开始匹配属性
        // end代表结束符号>  如果不是匹配到了结束标签
        // attr 表示匹配的属性

        //判断是否遇到标签结尾
        let end;
        let attr;
        //如果没有遇到标签结尾就不停的解析,并且匹配到属性
        while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
          //存储开始标签中的属性值与属性名
          match.attrs.push({
            name: attr[1],
            //这里是因为正则捕获支持双引号 单引号 和无引号的属性值
            value: attr[3] || attr[4] || attr[5],
          });
          advance(attr[0].length);
        }
        //   代表一个标签匹配到结束的>了 代表开始标签解析完毕
        if (end) {
          advance(end[0].length);
        }

        return match;
      }

      return false; //不是开始标签
    }

    //循环解析html中字符串
    while (html) {
      //看解析的内容是否存在，如果存在就不停的解析，直到html为空

      // 查找<
      let textEnd = html.indexOf("<"); //当前解析的开头是<

      // 如果<在第一个 那么证明接下来就是一个标签 不管是开始还是结束标签
      if (textEnd === 0) {
        // 匹配开始标签<  解析开始标签
        const startTagMatch = parseStartTag();

        //处理开始标签<div id="app">
        if (startTagMatch) {
          // 每次遇到<xxx>,都会调用start方法形成树结构
          start(startTagMatch.tagName, startTagMatch.attrs);
          continue;
        }

        // 处理结束标签 </div>
        const endTagMatch = html.match(endTag);
        if (endTagMatch) {
          end(endTagMatch[1]);
          advance(endTagMatch[0].length);
        }
      }

      //处理开始标签后跟的文本
      let text;
      if (textEnd > 0) {
        text = html.substring(0, textEnd);
      }

      if (text) {
        chars(text);
        advance(text.length);
      }
    }

    //   返回生成的ast
    return root;
  }

  function compileToFunction(template) {
    // 我们需要把html字符串变成render函数
    // 1.把html代码转成ast语法树  ast用来描述代码本身形成树结构 不仅可以描述html 也能描述css以及js语法
    // 很多库都运用到了ast 比如 webpack babel eslint等等
    let root = parserHTML(template);

    // 2.优化静态节点
    // 这个有兴趣的可以去看源码  不影响核心功能就不实现了
    //   if (options.optimize !== false) {
    //     optimize(ast, options);
    //   }

    // 3.通过ast重新生成代码
    // 我们最后生成的代码需要和render函数一样
    // 类似_c('div',{id:"app"},_c('div',undefined,_v("hello"+_s(name)),_c('span',undefined,_v("world"))))
    // _c代表创建元素 _v代表创建文本 _s代表文Json.stringify--把对象解析成文本
    let code = generate(root);

    //   使用with语法改变作用域为this  之后调用render函数可以使用call改变this 方便code里面的变量取值
    let render = new Function(`with(this){return ${code}}`);

    return render;
  }

  // html => ast (只能描述语法,语法不存在的属性无法描述) => render函数 + (with + new Function) => 虚拟dom
  // (增加额外的属性) => 产生真实dom

  // patch用来渲染和更新视图 今天只介绍初次渲染的逻辑
  function patch(oldVnode, vnode) {
    // 判断传入的oldVnode是否是一个真实元素
    // 这里很关键  初次渲染 传入的vm.$el就是咱们传入的el选项  所以是真实dom
    // 如果不是初始渲染而是视图更新的时候  vm.$el就被替换成了更新之前的老的虚拟dom

    if (oldVnode.nodeType === 1) {
      //用vnode来生成真实dom 替换成原本的dom元素

      const parentElm = oldVnode.parentNode; //找到父元素

      let elm = createElement$1(vnode); //根据虚拟节点 创建元素
      // 这里不直接使用父元素appendChild是为了不破坏替换的位置
      parentElm.insertBefore(elm, oldVnode.nextSibling); //在原来的dom元素创建新的dom元素
      parentElm.removeChild(oldVnode); //删除原来的dom元素
    }
  }

  //创建元素
  function createElement$1(vnode) {
    let { tag, data, children, text, vm } = vnode;

    //判断虚拟dom 是元素节点还是文本节点
    if (typeof tag === "string") {
      vnode.el = document.createElement(tag); //虚拟节点会有一个el属性对应真实节点

      // 解析虚拟dom属性
      updateProperties(vnode);
      //递归遍历孩子
      children.forEach((child) => {
        vnode.el.appendChild(createElement$1(child));
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

  function lifecycleMixin(Vue) {
    Vue.prototype._update = function (vnode) {
      //根据虚拟dom创建真实dom
      //既有初始化，又有更新
      const vm = this;
      patch(vm.$el, vnode);
    };
  }

  function mountComponent(vm, el) {

    // 上一步模板编译解析生成了render函数
    // 下一步就是执行vm._render()方法 调用生成的render函数 生成虚拟dom
    // 最后使用vm._update()方法把虚拟dom渲染到页面

    //更新函数，数据变化时，会再次调用此函数
    let updateComponent = () => {
      // 调用_render函数，生成虚拟dom
      vm._update(vm._render()); //后续更新可以调用updateComponent 方法
      // 用虚拟dom 生成真实dom
    };

    updateComponent();
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

      // 如果有el属性，进行模版渲染(初次渲染？)
      if (vm.$options.el) {
        vm.$mount(vm.$options.el);
      }
    };


    //挂载操作
    Vue.prototype.$mount = function (el) {
      const vm = this;
      const options = vm.$options;

      //挂载位置
      el = document.querySelector(el);
      vm.$el = el;

      // 把模版转换为 对应的渲染函数 => 虚拟dom概念 vnode =>diff算法 更新虚拟dom => 产生真实节点，更新
      if (!options.render) {

        // 如果没有render函数，则使用template 目前没有render
        // 用户也没有传递template 就取el的内容作为模板
        let template = options.template;
        if (!template && el) {
          // 如果没有template，但是有el，则使用el
          template = el.outerHTML;

          // 最终需要把tempalte模板转化成render函数
          let render = compileToFunction(template);
          options.render = render;
        }
      }


      //options.render就是渲染函数  代表了与生命周期相关
      //调用render方法，渲染成真实dom 替换掉页面的内容
      mountComponent(vm);
    };
  }

  //处理元素(元素名称,属性,子节点) //产生虚拟节点
  function createElement(vm, tag, data = {}, ...children) {
    return vnode(vm, tag, data, data.key, children, undefined);
  }

  //处理文本
  function createTextElement(vm, text) {
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

  function renderMixin(Vue) {

    // render函数里面有_c _v _s方法需要定义

    //处理元素(元素名称,属性,子节点) //产生虚拟节点
    Vue.prototype._c = function () {
      return createElement(this, ...arguments);
    };

    //处理文本
    Vue.prototype._v = function (text) {
      return createTextElement(this, text);
    };

    //处理属性(防止用户定义的属性是对象，将对象进行关联)
    Vue.prototype._s = function (value) {
      if (typeof value == "object") {
        return JSON.stringify(value);
      }

      return value;
    };

    // 获取render函数
    Vue.prototype._render = function () {
      const vm = this;

      //此时render是渲染函数
      let render = vm.$options.render;

      let vnode = render.call(vm);

      return vnode;
    };
  }

  function Vue(options) {
      //options 为用户传入的选项
      this._init(options); //初始化操作，组件
  }

  // 扩展原型
  // initMixin 把_init 方法挂载在 Vue 原型 供 Vue 实例调用
  initMixin(Vue);

  renderMixin(Vue); //_render 方法
  lifecycleMixin(Vue); //_update 方法

  return Vue;

}));
//# sourceMappingURL=vue.js.map
