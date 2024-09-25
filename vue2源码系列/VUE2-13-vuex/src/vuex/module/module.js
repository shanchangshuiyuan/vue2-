import { forEach } from "../utils";
export default class Module {
  constructor(rawModule) {
    // {
    //   _raw: rootModule,
    //   _children: {},
    //   state: rootModule.state,
    // };
    // rawModule是用户定义的模块
    this._raw = rawModule;
    this._children = {};
    this.state = rawModule.state;
  }

  getChild(childName) {
    return this._children[childName];
  }
  addChild(childName, module) {
    this._children[childName] = module;
  }

  //收集getters
  forEachGetters(cb){
    this._raw.getters &&forEach(this._raw.getters, cb);
  }

  //收集actions
  forEachActions(cb){
    this._raw.actions && forEach(this._raw.actions, cb);
  }

  //收集mutations
  forEachMutations(cb){
    this._raw.mutations && forEach(this._raw.mutations, cb);
  }


  //收集孩子
  forEachChilds(cb){
    this._children && forEach(this._children, cb);
  }

  //用于标识他自己是否写了namespace
  get namespaced(){  //module.namespaced
    return !!this._raw.namespaced;
  }
}
