let id = 0;
class Dep {
  // 每个属性都给他分配一个dep, dep可以存放watcher, watcher还要存放这个dep
  constructor() {
    this.id = id++;
    this.subs = []; //用来存放watcher的
  }

  //通知watcher 收集 dep
  depend() {
    //Dep.target dep里要存放这个watcher, watcher要存放这个dep 多对多
    if (Dep.target) {
      Dep.target.addDep(this);
    }
  }

  // 让 dep 收集 watcher
  addSub(watcher) {
    this.subs.push(watcher);
  }

  //通知subs中的所有watcher去更新
  notify() {
    this.subs.forEach((watcher) => watcher.update());
  }
}

// 当前渲染的 watcher，静态变量
Dep.target = null;
export function pushTarget(watcher) {
  Dep.target = watcher;
}

export function popTarget() {
  Dep.target = null;
}

export default Dep;
