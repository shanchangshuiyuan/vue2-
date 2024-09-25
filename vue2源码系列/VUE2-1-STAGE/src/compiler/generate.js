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
export function generate(el) {

  let children = genChildren(el);

  //遍历树，将树拼接成字符串
  let code = `_c('${el.tag}',${el.attrs.length ? genProps(el.attrs) : "undefined"}${
    children ? `,${children}` : ""
  })`;

  return code;
}
