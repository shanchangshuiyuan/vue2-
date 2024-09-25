//webpack 内置
const files = require.context(".", true, /\.js$/); //获取当前路径的所有文件的名称

const modules = {};
files.keys().forEach((key) => {
  const path = key.replace(/\.\/|\.js/g, ""); //去除名称中的 ./ 或 .js ./home/state.js => home/state
  if (path === "index") return; //自己不做任何处理  
  let [namespace, type] = path.split("/");  // home/state
  if (!modules[namespace]) {
    modules[namespace] = {
      namespaced: true, //增加命名空间
    };
  }

  //{home:{namespace:true, state:{}},user:{namespace:true, state:{}},}
  modules[namespace][type] = files(key).default; //获取文件导出的结果

});

export default modules;
