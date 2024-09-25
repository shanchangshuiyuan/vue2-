import { popTarget, pushTarget } from "./dep";
import { queueWatcher } from "./scheduler";

let id = 0;
class Watcher {
  // vm,updateComponent,() => {console.log("数据更新了");},true
  constructor(vm, exprOrFn, cb, options) {
    this.vm = vm;
    this.exprOrFn = exprOrFn;
    this.cb = cb;
    this.options = options;
    this.user = !!options.user; // 是不是用户 watcher

    this.lazy = !!options.lazy; //判断是不是 computed 立即执行
    this.dirty = options.lazy; // 如果是计算属性，那么默认值lazy:true, dirty:true

    //Watcher的唯一标识
    this.id = id++;

    // 默认应该让 exprOrFn 执行 exprOrFn 方法做了什么？ render (去vm上取值)
    if (typeof exprOrFn === "string") {
      this.getter = function () {
        // age.n vm['age']['n']  用户watcher传过来的可能是一个字符串   类似a.a.a.a.b
        let path = exprOrFn.split("."); //[age,n]
        let obj = vm;
        for (let i = 0; i < path.length; i++) {
          obj = obj[path[i]];
        }

        //将表达式转换为函数
        return obj; // get方法
      };
    } else {
      this.getter = exprOrFn; //updateComponent
    }

    this.deps = []; //存放deps
    this.depsId = new Set(); //去重

    // 第一次的value // 实例化就进行一次取值操作 进行依赖收集过程
    this.value = this.lazy ? undefined : this.get(); // 默认初始化 要取值
  }

  get() {
    //稍后用户更新时,可以直接调用 get 方法
    // defineProperity.get, 每个属性都可以收集自己的watcher
    // 一个属性对应多个watcher 同时一个 watcher 可以对应多个属性
    pushTarget(this); //Dep.target = watcher
    const value = this.getter.call(this.vm); // render 方法会去vm上取值 vm._update(vm._render())  //计算属性在这里执行用户定义的get函数 访问计算属性的依赖项 从而把自身计算Watcher添加到依赖项dep里面收集起来
    popTarget(); //Dep.target = null 如果Dep.target 有值，说明在template中使用

    return value;
  }

  update() {
    // Vue中的更新操作时异步的
    // 每个更新时 this

    // 计算属性依赖的值发生变化 只需要把dirty置为true  下次访问到了重新计算
    if (this.lazy) {
      this.dirty = true;
    }

    queueWatcher(this); //多次调用update，只会执行一次
  }

  run() {
    // 后续有其他功能
    // console.log("run");
    let newValue = this.get();
    let oldValue = this.value;
    this.value = newValue; //为了保证下一次更新时上一次的最新值是下一次的老值

    if (this.user) {
      this.cb.call(this.vm, newValue, oldValue);
    } // 如果是用户watcher，执行cb
  }

  //watcher 可以收集依赖dep (去重，防止重复收集)
  addDep(dep) {
    let id = dep.id;
    if (!this.depsId.has(id)) {
      this.depsId.add(id);
      this.deps.push(dep);
      dep.addSub(this);
    }
  }

  evaluate() {
    this.dirty = false; // 表示取到值了
    this.value = this.get(); // 用户的 getter 执行
  }

  depend() {
    // 计算属性的watcher存储了依赖项的dep
    let i = this.deps.length;
    while (i--) {
      this.deps[i].depend(); //lastName,firstName 收集渲染watcher
    }
  }
}

//watcher 和 dep
// 我们将更新的功能封装了一个watcher
// 渲染页面前,会将当前watcher放到Dep类上

// 在vue中页面渲染时使用的属性,需要进行依赖收集,收集对象渲染的watcher
// 取值时, 给每个属性都加了个dep属性，用于存储这个渲染watcher(用一个watcher对应多个dep)
// 每个属性可能对应多个视图,(一个属性对应多个watcher)
// dep.depend => 通知 dep 存放watcher => Dep.target.addDep(dep)  => 通知 watcher存放dep

//双向存储
export default Watcher;
