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

    //Watcher的唯一标识
    this.id = id++;

    // 默认应该让 exprOrFn 执行 exprOrFn 方法做了什么？ render (去vm上取值)
    this.getter = exprOrFn;

    this.deps = []; //存放deps
    this.depsId = new Set(); //去重

    this.get(); //默认初始化,要取值
  }

  get() {
    //稍后用户更新时,可以直接调用 get 方法
    // defineProperity.get, 每个属性都可以收集自己的watcher
    // 一个属性对应多个watcher 同时一个 watcher 可以对应多个属性
    pushTarget(this); //Dep.target = watcher
    this.getter(); // render 方法会去vm上取值 vm._update(vm._render())
    popTarget(); //Dep.target = null 如果Dep.target 有值，说明在template中使用
  }

  update() {
    // Vue中的更新操作时异步的
    // 每个更新时 this
    queueWatcher(this); //多次调用update，只会执行一次
  }

  run() { // 后续有其他功能
    // console.log("run");
    this.get();
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
