网络技术的快速发展，带来了层出不穷的新概念和框架，尤其是在前端开发领域，新技术的出现如同浪潮般一波接一波，例如 Vue3 和 Vite 的组合。而在这种技术快速更新的环境中，Web Components 作为一项已经存在一段时间的技术，为什么如今值得我们抓紧时间，去深入学习和探讨呢？

---- 文章的篇幅可能较长，借助目录效果更好。

![img](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/05b28d0a425f450da892dea989c24967~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=478&h=500&s=7128&e=webp&b=f7f7f7) 

`Web Components` 是由 W3C 推动的标准化技术。如今，它得到了包括 Chrome、Firefox、Safari 和 Edge 在内的主流浏览器的广泛支持。不仅 **Vue3** 的更新就包括了对 `Web Components` 的原生支持，现在也出现了很多由`Web Components`封装的**组件**和**库**，尤其是现在**面试**也成为了常问的话题，其中更为频频出现的是 `Shadow DOM`。

这项技术的魅力在于，**它允许开发者创建自定义、可重用的元素，这些元素可以在任何符合标准的 Web 应用中无缝使用，而不受限于特定的框架（React、Vue）**。如果你还对 Web Components 比较陌生，那么现在是时候开始了解这项技术了。

## Web Components 核心概念

Web Components 是一种浏览器原生支持的 Web 组件化技术，它允许开发者创建可重用的**自定义元素**，并且可以在任何支持 Web Components 的浏览器中使用。

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1f930989bdcd4e7fb6a561f30c66bda4~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=3232&h=1464&s=285492&e=png&b=ffffff)

Web Components 包括以下几个核心概念：

1. **Custom Elements**（自定义元素）：允许开发者创建新的 HTML 元素，并且可以定义它的行为和样式。
2. **Shadow DOM**（影子 DOM）：允许开发者封装组件的内部结构和样式，避免全局命名空间的污染。
3. **Templates**（模板）：允许开发者定义一个可以在多个组件中重用的 HTML 结构。
4. **Slots**（插槽）：允许开发者创建一个可插入内容的占位符，以便在不同的组件中使用。

今天将围绕这4个核心概念以及相关拓展，通过例子演示重点说一下 Web Components 是如何创建可重用的自定义元素的。

## Custom Elements（自定义元素）

Web Components 最大的特性之一就是能将 HTML 封装成 Custom Elements（自定义元素）。下面我们通过一个简单的按钮例子，看下它是怎么实现的。

### 创建自定义元素

首先，我们需要定义一个自定义元素。这可以通过使用 `customElements.define()` 方法来实现。在这个例子中，我们将创建一个名为 `my-button` 的自定义元素。

```javascript
javascript 代码解读复制代码// main.js
class MyButton extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        button {
          background-color: #4CAF50;
          border: none;
          color: white;
          text-align: center;
          text-decoration: none;
          display: inline-block;
          font-size: 16px;
          margin: 4px 2px;
          cursor: pointer;
          padding: 10px 24px;
          border-radius: 4px;
        }
      </style>
      <button>Click Me!</button>
    `;
  }
}
customElements.define('my-button', MyButton);
```

现在我们已经定义了一个名为 `my-button` 的自定义元素，我们可以在 HTML 文件中直接使用它。

```html
html 代码解读复制代码<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Web Components Example</title>
</head>
<body>
  <my-button></my-button>
  
  <script src="./main.js"></script>
</body>
</html>
```

在这个例子中，我们创建了一个名为 `my-button` 的自定义元素，并在 HTML 文件中直接使用它。这个自定义元素将渲染为一个绿色的按钮，上面写着“Click Me!”。

不止如此，CustomElements还支持自定义元素行为（如添加点击事件），也就是说既能封装UI样式，也是封装UI交互。

```js
js 代码解读复制代码const shadowRoot = this.attachShadow({ mode: 'open' });
shadowRoot.querySelector('button').addEventListener('click', () => {
    alert('按钮被点击了！');
});
```

到这里为止，便实现了一个简单的 Web Components，详细代码见[CustomElements](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2FSailingCoder%2Fweb-components%2Fblob%2Fmain%2FCustomElements%2Findex.html)。

### 生命周期回调方法

Custom Elements 也有一组生命周期回调方法（`到这里是不是感觉 Web Component 就像 Vue、React似得，怎么还有生命周期？`），这些方法在元素的不同生命周期阶段被调用。这些生命周期方法允许你在元素的创建、插入文档、更新和删除等时刻执行操作。

以下是自定义元素的一些主要生命周期回调方法：

1. **constructor()**: 构造函数，在创建元素实例时调用。适用于执行初始化操作，例如设置初始属性、添加事件监听器或创建 Shadow DOM。
2. **connectedCallback()**: 当自定义元素被插入到上下文时调用。适用于元素被插入到 DOM 时执行的操作，例如获取数据、渲染内容或启动定时器。
3. **disconnectedCallback()**: 当自定义元素从文档中移除时调用。适用于元素从 DOM 中移除时执行的操作，例如移除事件监听器或停止定时器。
4. **attributeChangedCallback(attributeName, oldValue, newValue)**: 当自定义元素的属性被添加、移除或更改时调用。要使用这个回调，你需要在类中定义一个静态的 `observedAttributes` 属性，列出你想要监听的属性。

下面是一个简单的例子，展示了如何在自定义元素中使用这些生命周期方法：

```javascript
javascript 代码解读复制代码class MyCustomElement extends HTMLElement {
  constructor() {
    super();
    // 初始化操作，例如创建 Shadow DOM
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = '<p>这是一个自定义元素</p>';
  }
  connectedCallback() {
    // 元素被插入到 DOM 时执行的操作
    console.log('Custom element connected to the DOM');
  }
  disconnectedCallback() {
    // 元素从 DOM 中移除时执行的操作
    console.log('Custom element disconnected from the DOM');
  }
  attributeChangedCallback(name, oldValue, newValue) {
    // 监听的属性发生变化时执行的操作
    console.log(`Attribute ${name} changed from ${oldValue} to ${newValue}`);
  }
  static get observedAttributes() {
    // 返回一个数组，包含需要监听的属性
    return ['my-attribute'];
  }
}
customElements.define('my-custom-element', MyCustomElement);
```

在 HTML 中使用这个自定义元素：

```html
html

 代码解读
复制代码<my-custom-element my-attribute="value"></my-custom-element>
```

当 `my-custom-element` 被插入到 DOM 中时，`connectedCallback` 会被调用。如果元素被从 DOM 中移除，`disconnectedCallback` 会被调用。如果元素的 `my-attribute` 属性发生变化，`attributeChangedCallback` 会被调用。

> **注意**：监听的同时，也记得停止监听。比如说你可能需要在元素连接到 DOM 时开始监听事件，但是在元素断开连接时停止监听，避免内存泄漏。

## Shadow DOM（影子 DOM）

下面我们将继续探讨 Shadow DOM，它是 Web Components 的核心特性之一。

![img](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/453675b4a459442d85d2d7a81dfe54f4~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=1606\&h=548\&s=87514\&e=png\&b=ffffff) 

### Shadow DOM

Shadow DOM 允许开发者创建一个封闭的 DOM 子树，这个子树与主文档的 DOM 分离，这意味着 Shadow DOM 内部的样式和结构不会受到外部的影响，也不会影响到外部。

在“Custom Elements（自定义元素）”的例子中，我们已经简单使用了 Shadow DOM。

**1、使用 innerHTML**

通过设置 Shadow DOM 的 innerHTML 属性，可以直接添加一个或多个元素。这种方式适用于从字符串模板快速填充 Shadow DOM。

```javascript
javascript 代码解读复制代码class MyElementInnerHTML extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        p { color: black; }
      </style>
      <p>使用 innerHTML</p>
    `;
  }
}
customElements.define('my-element-inner', MyElementInnerHTML);
```

**2、使用 createElement 和 appendChild**

也可以使用 document.createElement 方法创建一个新元素，然后使用 appendChild 方法将其添加到 Shadow DOM 中。

```js
js 代码解读复制代码const wrapper = document.createElement('p');
wrapper.textContent = '使用 createElement 和 appendChild';

var style = document.createElement('style');
style.textContent = `
p { color: gray; }
`;
// 引入外部样式同样可以使用 appendChild
// const linkElement = document.createElement('link');
// linkElement.setAttribute('rel', 'stylesheet');
// linkElement.setAttribute('href', 'style.css');
class MyElementAppend extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    
    shadowRoot.appendChild(wrapper);
    shadowRoot.appendChild(style);
    // shadowRoot.appendChild(linkElement);
  }
}
customElements.define('my-element-append', MyElementAppend);
```

3、template方式

除上面两种方式外，还可以使用模板元素 (`<template>`)添加，具体见下方 **“Templates（模版）”**。

### Shadow Mode

其中在自定义元素的构造函数中，我们调用了 `attachShadow()` 方法，并传入了一个对象 `{ mode: 'open' }`。这里的 `mode` 属性决定了 Shadow DOM 的封装模式，它有两个可能的值：

- `open`：允许外部访问 Shadow DOM 的 API。
- `closed`：不允许外部访问 Shadow DOM 的 API。

在这个例子中，我们创建了一个 Shadow DOM，并向其中添加了一行文字和相关的样式。由于 Shadow DOM 的封装性，这些样式只会在 `my-element` 元素内部生效，不会影响到页面上的其他元素（样式隔离）。

下面我们更详细地探讨 Shadow DOM 是否允许外部访问,的两种封装模式：`open` 和 `closed`。

**1、Shadow Mode：open 模式**

当使用 `open` 模式创建 Shadow DOM 时，外部脚本可以通过 `Element.shadowRoot` 属性访问 Shadow DOM 的根节点。

这意味着你可以从外部查询、修改 Shadow DOM 内部的元素和样式。下面是一个使用 `open` 模式的例子：

```javascript
javascript 代码解读复制代码class OpenMyElement extends HTMLElement {
  constructor() {
    super();
    // 创建一个 open 模式的 Shadow DOM
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        p { color: red; }
      </style>
      <p>这是一个 open 模式的 Shadow DOM</p>
    `;
  }
}
customElements.define('open-my-element', OpenMyElement);

// 在外部访问 Shadow DOM
const element = document.querySelector('open-my-element');
console.log(element.shadowRoot); // 输出 ShadowRoot 对象
```

在这个例子中，我们创建了一个自定义元素 `open-my-element`，它有一个 `open` 模式的 Shadow DOM。由于模式是 `open`，我们可以在外部通过 `element.shadowRoot` 访问 Shadow DOM 的根节点，并进行进一步的操作，比如添加或删除子元素，修改样式等。

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8654b1fdd7464131861c14fb8ee93b3a~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=821&h=162&s=65031&e=png&b=fefefe)

**2、Shadow Mode：closed 模式**

当使用 `closed` 模式创建 Shadow DOM 时，外部脚本无法通过 `Element.shadowRoot` 属性访问 Shadow DOM 的根节点。

这意味着 Shadow DOM 内部的元素和样式对外部是完全隐藏的，无法从外部直接访问或修改。 下面是一个使用 `closed` 模式的例子：

```javascript
javascript 代码解读复制代码class ClosedMyElement extends HTMLElement {
  constructor() {
    super();
    // 创建一个 closed 模式的 Shadow DOM
    const shadowRoot = this.attachShadow({ mode: 'closed' });
    shadowRoot.innerHTML = `
      <style>
        p { color: blue; }
      </style>
      <p>这是一个 closed 模式的 Shadow DOM</p>
    `;
  }
}
customElements.define('closed-my-element', ClosedMyElement);

// 在外部尝试访问 Shadow DOM
const element = document.querySelector('closed-my-element');
console.log(element.shadowRoot); // 输出 null
```

在这个例子中，我们创建了一个自定义元素 `closed-mode-element`，它有一个 `closed` 模式的 Shadow DOM。由于模式是 `closed`，当我们尝试在外部通过 `element.shadowRoot` 访问 Shadow DOM 的根节点时，将得到 `null`。

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cb0628c1189e427c8c0d090adf4b3f51~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=755&h=134&s=44086&e=png&b=fefefe)

`open` 和 `closed` 模式决定了 Shadow DOM 的封装程度：

- `open` 模式允许外部访问 Shadow DOM 的 API，这意味着你可以从外部查询和修改 Shadow DOM 内部的元素和样式。
- `closed` 模式不允许外部访问 Shadow DOM 的 API，这意味着 Shadow DOM 内部的元素和样式对外部是完全隐藏的，无法从外部直接访问或修改。

选择哪种模式取决于你的具体需求。如果你希望组件的内部结构和样式完全对外部隐藏，使用 `closed` 模式是更好的选择。如果你需要从外部访问和修改组件的内部结构和样式，使用 `open` 模式会更合适。

完整代码，详见[ShadowDOM](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2FSailingCoder%2Fweb-components%2Fblob%2Fmain%2FShadowDOM%2Findex.html)。

其外，Shadow DOM 还支持更高级的用法，比如可以将 Shadow DOM 分割成多个 Shadow Trees，使用 slots（插槽）来插入内容，以及使用 template（模板）来定义可重用的 HTML 结构。

## Slots（插槽）

Slots 是一种特殊类型的元素，它允许你将内容从组件的一个部分传递到另一个部分，增加了组件的灵活性。它使得 Web Components 自定义元素，更加的灵活。

### 基础使用

例如，我们可以修改 `my-button` 组件，使其允许用户自定义按钮文本：

```javascript
javascript 代码解读复制代码class MyButton extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        /* ...样式代码保持不变... */
      </style>
      <button>
          <slot>Click Me!</slot>
      </button>
    `;
  }
}
customElements.define('my-button', MyButton);
```

现在，当我们在 HTML 中使用 `my-button` 时，我们可以向其中插入任何内容，它会替换掉 `<slot>` 标签：

```html
html

 代码解读
复制代码<my-button>Slots Custom Text</my-button>
```

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5562695857e54ed8aad4d4b1f2b10ca0~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=412&h=94&s=8836&e=png&b=fbfbfb)

### 命名插槽

在开发中，我们更多的还会遇到不同情况下，选择插入的内容，这里就用到了命名插槽，使用起来非常方便。

```js
js 代码解读复制代码class MyButtonName extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.innerHTML = `
      <style>
        /* ...样式代码保持不变... */
      </style>
      <button>
        <slot name="element-name"></slot>
        <slot name="element-age"></slot>
        <slot name="element-email"></slot>
      </button>
    `;
  }
}
customElements.define('my-button-name', MyButtonName);
html 代码解读复制代码<my-button-name>
    <span slot="element-name">element-name</span>
</my-button-name>
<my-button-name>
    <span slot="element-age">element-age</span>
</my-button-name>
<my-button-name>
    <span slot="element-email">element-email</span>
</my-button-name>
```

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8254f3c8018341b7a2565183905b69e6~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=902&h=202&s=17676&e=png&b=fdfdfd)

是不是很方便，很灵活！！具体代码详见[Web Components Slots](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2FSailingCoder%2Fweb-components%2Fblob%2Fmain%2FSlots%2Findex.html)。

## Templates（模板）

Templates 允许你定义一个可以在多个组件中重用的 HTML 结构。你可以将模板放在 HTML 文件中的任何位置，并通过 JavaScript 动态地实例化它们：

```html
html 代码解读复制代码<my-button></my-button>

<template id="my-button-template">
  <style>
    /* ...样式代码保持不变... */
  </style>
  <button>
      <slot>Click Me!</slot>
  </button>
</template>
```

在 JavaScript 中，你可以这样使用模板：

```javascript
javascript 代码解读复制代码class MyButton extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    const template = document.getElementById('my-button-template');
    // 使用`cloneNode()` 方法添加了拷贝到 Shadow root 根节点上。
    shadowRoot.appendChild(template.content.cloneNode(true));
  }
}
customElements.define('my-button', MyButton);
```

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c9816d3ae232480495b844ee30ccf8f7~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=342&h=98&s=7052&e=png&b=fcfcfc)

这样，你就可以在不同的组件中重用同一个模板，从而提高代码的可维护性和重用性。具体代码下详见[Web Components Templates](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2FSailingCoder%2Fweb-components%2Fblob%2Fmain%2FTemplates%2Findex.html)。

## 相关拓展

### Web Components 兼容性

Web Components 是一组用于构建可复用组件的技术，包括 Custom Elements, Shadow DOM, HTML Templates 等。这些技术的出现，使得开发者能够更好地组织，去开发复杂的网页应用。然而，由于这些技术相对较新，不同浏览器的支持情况不尽相同，因此兼容性问题也是我们需要重点关注的方向。

Custom Elements

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ed98f46efe5c47e783247c5cea906172~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=2632&h=1056&s=323703&e=png&b=eee6d5)

Shadow DOM

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6b4d58619ef64e1eb6fa57c2410eca2c~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=2652&h=1172&s=340591&e=png&b=eee5d4)

HTML Templates

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/06fdeecdaa7642939b5c833330e8b175~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=2650&h=1016&s=282558&e=png&b=eee5d4)

从上面可以看出，现阶段市场上大部分的浏览器已经都原生支持了 Web Components 的规范标准。**但是如果说出现了兼容性问题，我们应该怎么处理？**

### Polyfills

对于旧版浏览器不支持的兼容性情况，可以考虑使用 polyfill 来实现兼容性。Polyfills 是一种代码注入技术，使得浏览器可以支持新的标准 API。对于不支持 Web Components 的浏览器，我们可以用 Polyfills 让这些浏览器可以支持 Web Components。

这里我们可以用到 [webcomponents.js](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Fwebcomponents%2Fpolyfills%2Ftree%2Fmaster%2Fpackages%2Fwebcomponentsjs) 库，它可以实现兼容 Custom Elements、Shadow DOM 和 HTML Templates 标准，让我们在开发时不必考虑兼容性问题。

```sh
sh

 代码解读
复制代码npm install @webcomponents/webcomponentsjs
js 代码解读复制代码<!-- load webcomponents bundle, which includes all the necessary polyfills -->
<script src="node_modules/@webcomponents/webcomponentsjs/webcomponents-bundle.js"></script>

<!-- load the element -->
<script type="module" src="my-element.js"></script>

<!-- use the element -->
<my-element></my-element>
```

具体配置详情，见[polyfills webcomponents](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Fwebcomponents%2Fpolyfills%2Ftree%2Fmaster%2Fpackages%2Fwebcomponentsjs)。

### React 与 Vue

相信大家也比较关心 Web Components 与现有框架（如 React、Vue）相比有哪些优势？以及各自适用场景？

首先，Web Components 是一组 Web 平台 API，允许开发者创建可重用的自定义元素，而无需依赖于任何特定的框架。与现有的前端框架，Web Components 有以下几个优势：

1. **标准化**：Web Components 是基于 Web 标准（如 Custom Elements、Shadow DOM 和 HTML Templates）构建的，这意味着它们得到了浏览器厂商的直接支持，而不依赖于任何特定的库或框架。
2. **轻量级**：Web Components 不需要额外的库或框架即可工作，这可以减少应用程序的依赖性和大小，特别是在不需要框架其他功能的情况下。
3. **封装性**：通过 Shadow DOM，Web Components 可以将标记结构、样式和脚本封装在一起，避免全局样式和脚本的冲突，保证了组件的独立性和重用性。
4. **易于集成**：Web Components 可以与现有的框架（如 React 和 Vue）集成，开发者可以在这些框架中使用 Web Components，或者将现有的框架组件封装成 Web Components 以供其他项目使用。

然而，Web Components 也有其局限性，例如：

- **生态系统**：与 React 和 Vue 等成熟框架相比，Web Components 的生态系统较小，社区支持和资源可能不如这些框架丰富。
- **功能限制**：Web Components 本身不提供状态管理、路由等高级功能，这些通常需要额外的库或框架来实现。
- **性能**：对于复杂的应用程序，一些框架（如 React）通过虚拟 DOM 等技术提供了更高的性能优化，而 Web Components 需要开发者手动优化。

总的来说，**Web Components 提供了一种标准化且框架无关的方式来构建组件，适合组件库的开发**。而框架如 **React、Vue 则在生态系统支持、开发体验和数据处理方面有明显优势，适合快速开发复杂的应用程序**。

### 实际应用案例

1. **Vue3**: Vue3 引入了对 Web Components 的原生支持，通过所谓的 “Vue Components”，它允许将 Vue 组件转换为 Web Components。
2. [MicroApp](https://link.juejin.cn?target=https%3A%2F%2Flink.zhihu.com%2F%3Ftarget%3Dhttps%3A%2F%2Fzeroing.jd.com%2F)：基于 Web Components 的一款简约、高效、功能强大的微前端框架。
3. [Twitter](https://link.juejin.cn?target=https%3A%2F%2Fdevcommunity.x.com%2Ft%2Fupcoming-change-to-embedded-tweet-display-on-web%2F66215)：Twitter 2016 年开始将自己的嵌入式推文  从 iframe 切换成  ShadowDOM，减少了内存消耗、加快了渲染速度，并批量渲染的时候保持丝滑。
4. [svelte + vite 开发 Web Components](https://link.juejin.cn?target=https%3A%2F%2Fzhuanlan.zhihu.com%2Fp%2F618025277)：通过svelte + vite快速搭建 web components 的项目。
5. [使用Polymer构建Web Components](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2FPolymer%2Fpolymer)：用于构建Web Component，它提供了一套工具和API，能够更容易地创建自定义元素。

## 参考资料

1. [**MDN Web Docs - Web Components 入门**](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fzh-CN%2Fdocs%2FWeb%2FAPI%2FWeb_components)
2. [你不知道的Web Components - 现状](https://link.juejin.cn?target=https%3A%2F%2Fwww.albertaz.com%2Fblog%2Fweb-components-ststus)
3. [自定义元素 v1 - 可重复使用的网络组件](https://link.juejin.cn?target=https%3A%2F%2Fweb.dev%2Farticles%2Fcustom-elements-v1%3Fhl%3Dzh-cn%23extending_native_html_elements)
4. [Web Components Tutorial for Beginners [2019\]](https://link.juejin.cn?target=https%3A%2F%2Fwww.robinwieruch.de%2Fweb-components-tutorial%2F)

## 总结

Web Components 是 W3C 推动的标准化技术，它通过自定义元素的方式，允许开发者在浏览器中直接使用。这种技术通过 Shadow DOM 实现了组件化 DOM 隔离和样式隔离，确保了组件的独立性和可重用性，这些特性被现有很多借鉴和使用。

希望这篇文章对你有所帮助！！！欢迎在评论区，一起讨论。



作者：Sailing
链接：https://juejin.cn/post/7350502488493867042
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。