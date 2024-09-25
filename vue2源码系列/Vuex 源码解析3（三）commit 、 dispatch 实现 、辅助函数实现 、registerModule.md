# Vuex 源码解析（三）commit 、 dispatch 实现 、辅助函数实现 、registerModule

## commit

> ```
> /src/store.js
> ```

```js
js 代码解读复制代码  /**
   * store.commit 方法
   * 最终还是执行 mutation 方法
   * @param {String} _type 方法名
   * @param {Object} _payload 参数
   * @param {Object} _options 
   */
  commit (_type, _payload, _options) {
    // check object-style commit
    // 统一参数规范并解构
    const {
      type,
      payload,
      options
    } = unifyObjectStyle(_type, _payload, _options)

    const mutation = { type, payload }
    // 找到对应的 mutations => [addFn,addFn,...]
    const entry = this._mutations[type]
    if (!entry) {
      // 不存在对应的 mutation
      if (__DEV__) {
        console.error(`[vuex] unknown mutation type: ${type}`)
      }
      return
    }
    // 保证此处修改是符合规则的
    this._withCommit(() => {
      // 遍历 mutation 数组执行里面的 commit 方法
      entry.forEach(function commitIterator (handler) {
        handler(payload)
      })
    })

    // 执行收集的 subscribe 的所有方法
    this._subscribers
      .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
      .forEach(sub => sub(mutation, this.state))

    if (
      __DEV__ &&
      options && options.silent
    ) {
      console.warn(
        `[vuex] mutation type: ${type}. Silent option has been removed. ` +
        'Use the filter functionality in the vue-devtools'
      )
    }
  }
```

## dispatch

> ```
> /src/store.js
> ```

```js
js 代码解读复制代码  /**
   * store.dispatch 方法
   * 最终还是执行 action 方法
   * @param {String} _type 方法名
   * @param {Object} _payload 参数
   */
  dispatch (_type, _payload) {
    // check object-style dispatch
    // 统一参数规范并解构
    const {
      type,
      payload
    } = unifyObjectStyle(_type, _payload)

    const action = { type, payload }
    // 获取对应的 actions
    const entry = this._actions[type]
    if (!entry) {
      // 不存在
      if (__DEV__) {
        console.error(`[vuex] unknown action type: ${type}`)
      }
      return
    }

    try {
      // 执行收集的所有 subscribeAction.before action 触发前执行
      this._actionSubscribers
        .slice() // shallow copy to prevent iterator invalidation if subscriber synchronously calls unsubscribe
        .filter(sub => sub.before)
        .forEach(sub => sub.before(action, this.state))
    } catch (e) {
      if (__DEV__) {
        console.warn(`[vuex] error in before action subscribers: `)
        console.error(e)
      }
    }
    // 若对应的 action 大于 1 用 Promise.all 创建一个 promise 迭代器 否则直接执行
    const result = entry.length > 1
      ? Promise.all(entry.map(handler => handler(payload)))
      : entry[0](payload)
    // 返回一个 Promise 里面执行 promise 迭代器
    return new Promise((resolve, reject) => {
      result.then(res => {
        // subscribeAction.after action 触发后执行
        try {
          this._actionSubscribers
            .filter(sub => sub.after)
            .forEach(sub => sub.after(action, this.state))
        } catch (e) {
          if (__DEV__) {
            console.warn(`[vuex] error in after action subscribers: `)
            console.error(e)
          }
        }
        resolve(res)
      }, error => {
        // subscribeAction.error action 触发后执行
        try {
          this._actionSubscribers
            .filter(sub => sub.error)
            .forEach(sub => sub.error(action, this.state, error))
        } catch (e) {
          if (__DEV__) {
            console.warn(`[vuex] error in error action subscribers: `)
            console.error(e)
          }
        }
        reject(error)
      })
    })
  }
```

## 辅助函数实现

### mapState

> ```
> /src/helper.js
> ```

```js
js 代码解读复制代码/**
 * mapState
 * 标准化传入的参数,将其变为 key val 的形式，遍历挂载到res上
 * 如果访问该属性判断是否有命名空间，如果有根据命名空间去获取对应的 module 将 state getters 对应的值返回
 * @param {String} namespace 命名空间
 * @param {Object|Array} states state getters
 */
export const mapState = normalizeNamespace((namespace, states) => {
  const res = {};
  if (__DEV__ && !isValidMap(states)) {
    console.error("[vuex] mapState: mapper parameter must be either an Array or an Object");
  }
  console.log('namespace',namespace);
  console.log('states',states);
  // 标准化传入的值，将其变为 key val 的形式
  normalizeMap(states).forEach(({ key, val }) => {
    res[key] = function mappedState() {
      let state = this.$store.state;
      let getters = this.$store.getters;
      if (namespace) {
        // 获取命名空间对应的 module
        const module = getModuleByNamespace(this.$store, "mapState", namespace);
        if (!module) {
          return;
        }
        state = module.context.state;
        getters = module.context.getters;
      }
      return typeof val === "function" ? val.call(this, state, getters) : state[val];
    };
    // mark vuex getter for devtools
    res[key].vuex = true;
  });
  return res;
});
```

### mapGetters

> ```
> /src/helper.js
> ```

```js
js 代码解读复制代码/**
 * mapGetters
 * 标准化传入的参数,将其变为 key val 的形式，遍历挂载到res上
 * 重新赋值 val 因为 命名空间已经被 normalizeNamespace 破坏了
 * 获取对应的 getter 返回
 * @param {String} namespace 命名空间
 * @param {Object|Array} getters getters
 */
export const mapGetters = normalizeNamespace((namespace, getters) => {
  const res = {};
  if (__DEV__ && !isValidMap(getters)) {
    console.error("[vuex] mapGetters: mapper parameter must be either an Array or an Object");
  }
  normalizeMap(getters).forEach(({ key, val }) => {
    // The namespace has been mutated by normalizeNamespace
    val = namespace + val;
    res[key] = function mappedGetter() {
      if (namespace && !getModuleByNamespace(this.$store, "mapGetters", namespace)) {
        return;
      }
      if (__DEV__ && !(val in this.$store.getters)) {
        console.error(`[vuex] unknown getter: ${val}`);
        return;
      }
      return this.$store.getters[val];
    };
    // mark vuex getter for devtools
    res[key].vuex = true;
  });
  return res;
});
```

### mapMutations

> ```
> /src/helper.js
> ```

```js
js 代码解读复制代码/**
 * mapMutations
 * 标准化传入的参数,将其变为 key val 的形式，遍历挂载到res上
 * 如果访问该属性判断是否有命名空间，如果有根据命名空间去获取对应的 module 通过 apply 执行对应的函数
 * @param {String} namespace 命名空间
 * @param {Object|Array} mutations mutations
 */
export const mapMutations = normalizeNamespace((namespace, mutations) => {
  const res = {};
  if (__DEV__ && !isValidMap(mutations)) {
    console.error("[vuex] mapMutations: mapper parameter must be either an Array or an Object");
  }
  normalizeMap(mutations).forEach(({ key, val }) => {
    res[key] = function mappedMutation(...args) {
      // Get the commit method from store
      let commit = this.$store.commit;
      if (namespace) {
        const module = getModuleByNamespace(this.$store, "mapMutations", namespace);
        if (!module) {
          return;
        }
        commit = module.context.commit;
      }
      return typeof val === "function" ? val.apply(this, [commit].concat(args)) : commit.apply(this.$store, [val].concat(args));
    };
  });
  return res;
});
```

### mapActions

> ```
> /src/helper.js
> ```

```js
js 代码解读复制代码/**
 * mapActions
 * 标准化传入的参数,将其变为 key val 的形式，遍历挂载到res上
 * 如果访问该属性判断是否有命名空间，如果有根据命名空间去获取对应的 module 通过 apply 执行对应的函数
 * @param {String} namespace 命名空间
 * @param {Object|Array} actions actions
 */
export const mapActions = normalizeNamespace((namespace, actions) => {
  const res = {};
  if (__DEV__ && !isValidMap(actions)) {
    console.error("[vuex] mapActions: mapper parameter must be either an Array or an Object");
  }
  normalizeMap(actions).forEach(({ key, val }) => {
    res[key] = function mappedAction(...args) {
      // get dispatch function from store
      let dispatch = this.$store.dispatch;
      if (namespace) {
        const module = getModuleByNamespace(this.$store, "mapActions", namespace);
        if (!module) {
          return;
        }
        dispatch = module.context.dispatch;
      }
      return typeof val === "function" ? val.apply(this, [dispatch].concat(args)) : dispatch.apply(this.$store, [val].concat(args));
    };
  });
  return res;
});
```

## registerModule

> ```
> /src/store.js
> ```

```js
js 代码解读复制代码  /**
   * 注册 module
   * @param {Array<String>[]} path 路径
   * @param {Module} rawModule module 原
   * @param {Object} options 配置
   */
  registerModule (path, rawModule, options = {}) {
    // 判断 path 是不是字符串 如果是就将其变为数组
    if (typeof path === 'string') path = [path]

    if (__DEV__) {
      assert(Array.isArray(path), `module path must be a string or an Array.`)
      assert(path.length > 0, 'cannot register the root module by using registerModule.')
    }

    this._modules.register(path, rawModule)
    installModule(this, this.state, path, this._modules.get(path), options.preserveState)
    // reset store to update getters...
    resetStoreVM(this, this.state)
  }
```

## 总结

### commit 、 dispatch 实现原理

- 在 installModule 将对应的 mutation 、 action 添加到 _mutations 、 _actions 中。
- 调用 commit 执行就去 _mutations 中找到对应的 mutation 函数并执行。
- 调用 dispatch 执行就去 _actions 中找到对应的 action 函数并执行,而 action 中又是执行 commit 就是执行 mutation。

### 辅助函数的实现原理

- 通过解构辅助函数传入的参数得到对应命名空间和模块，返回对应的 state 、 getter 、 mutation 、 action。

### 怎么样区别 state 是否为 mutation 改变

- 通过 store._withCommit 方法，store 声明了 commiting 属性值为 boolean ，每次更改 state 前都通过 _withCommit 将其变更为 true ，当函数体执行完，再将其置为 false。如 state 改变而 commiting 为 false 说明不是规则允许的更改则抛错。



作者：KnowledgeHasNoLimit
链接：https://juejin.cn/post/7229220276847083578
来源：稀土掘金
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。