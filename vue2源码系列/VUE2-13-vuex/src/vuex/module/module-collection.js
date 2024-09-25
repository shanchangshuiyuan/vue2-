import { forEach } from "../utils";
import Module from "./module";

class ModuleCollection {
  constructor(options) {
    //对数据进行格式化操作
    this.root = null;
    //注册模块
    this.register([], options);
  }

  getNamespaced(path) {
    //返回一个字符串 a/b/c
    let root = this.root;

    let ns = path.reduce((ns, key) => {
      //this.root.c.namespaced
      let module = root.getChild(key);
      root = module;
      return module.namespaced ? ns + key + "/" : ns;
    }, "");

    // console.log(ns);
    return ns;
  }

  register(path, rawModule) {
    let newModule = new Module(rawModule);
    // {
    //   _raw: rootModule,
    //   _children: {},
    //   state: rootModule.state,
    // };
    rawModule.newModule = newModule;
    //树根
    if (path.length == 0) {
      this.root = newModule;
    } else {
      // [a] [a,b]  [a,b,c]  //栈表示父子关系
      // 找父亲
      let parent = path.slice(0, -1).reduce((memo, current) => {
        return memo.getChild(current);
        // return memo._children[current];
      }, this.root);
      parent.addChild(path[path.length - 1], newModule);
      // parent._children[path[path.length - 1]] = newModule;
    }
    //注册完毕当前模块，开始注册根模块
    if (rawModule.modules) {
      forEach(rawModule.modules, (module, key) => {
        this.register(path.concat(key), module);
      });
    }
  }
}

export default ModuleCollection;

// this.root = {
//   _raw: 用户定义的模块,
//   state: 当前模块自己的状态,
//   _children: { //孩子列表
//     a: {
//       _raw: 用户定义的模块,
//       state: 当前模块自己的状态,
//       _children: {

//       },
//     },
//   },
// };
