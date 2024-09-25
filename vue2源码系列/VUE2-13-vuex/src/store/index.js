import Vue from "vue";
import Vuex from "@/vuex";
// import Vuex from "vuex";

import { createLogger } from "vuex";

Vue.use(Vuex);

function logger() {
  return function(store) {
    let prevState = JSON.stringify(store.state);

    store.subscribe((mutation, state) => {
      console.log("preState", prevState);
      console.log("mutation", JSON.stringify(mutation));
      console.log("currentState", JSON.stringify(state));
      prevState = JSON.stringify(state);
    });
  };
}

function persist() {
  return function(store) {
    //vuex-persist
    let localState = JSON.parse(localStorage.getItem("VUEX:STATE")) ;
    if(localState){
      store.replaceState(localState);
    }

    store.subscribe((mutation, rootState) => {
      //状态发生变化就存localStorage
      //防抖
      localStorage.setItem("VUEX:STATE", JSON.stringify(rootState));
    });
  };
}

const store = new Vuex.Store({
  plugins: [
    // logger(),
    persist("localStorage"),
  ],

  state: {
    name: "zgy",
    age: 12,
  },
  mutations: {
    //methods  commit 同步更改状态
    changeAge(state, payload) {
      state.age += payload;
    },
  },
  actions: {
    // 异步操作 调用api接口 dispatch
    changeAge1({ commit }, payload) {
      setTimeout(() => {
        commit("changeAge", payload);
      }, 1000);
    },
  },
  getters: {
    // 计算属性
    myAge(state) {
      // console.log("ok");
      return state.age + 10;
    },
  },
  strict: true,
  modules: {
    //namespaced 能解决子模块与父模块的命名冲突，相当于增加了一个命名空间
    //如果没有namespace,默认getters都会被定义到父模块上
    //mutations会被合并在一块，最终一起调用 有了命名空间就没有这个问题了
    //子模块的名字 不能和父模块的状态 重名

    // 模块分割
    a: {
      namespaced: true,
      state: {
        name: "a",
        age: 12,
      },

      getters: {
        myAge(state) {
          return state.age + 10;
        },
      },

      mutations: {
        changeAge(state, payload) {
          state.age += payload;
        },
      },

      modules: {
        c: {
          namespaced: true,
          state: {
            name: "c",
            age: 100,
          },
          mutations: {
            changeAge(state, payload) {
              state.age += payload;
            },
          },
        },
      },
    },

    // b: {
    //   namespaced: true,
    //   state: {
    //     name: "a",
    //     age: 12,
    //   },
    // },
  },
});
export default store;
