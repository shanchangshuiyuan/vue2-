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
export function parserHTML(html) {
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

