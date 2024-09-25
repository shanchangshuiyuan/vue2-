<template>
  <div id="app">
    名字--{{ this.$store.state.name }} 
    <br>
    年龄--{{ this.$store.state.age }}
    <br>
    getter年龄 -- {{ this.$store.getters.myAge }}
    getter年龄 -- {{ this.$store.getters.myAge }}
    <br>
    <button @click="$store.commit('changeAge', 10)">更改年龄</button>
    <button @click="$store.state.age++">非法更改年龄</button>
    <button @click="$store.dispatch('changeAge', 10)">异步更改年龄</button>

    <hr>
    a的年龄--{{ this.$store.state.a.name }}--{{ this.$store.state.a.age }}

    <br>
    a的计算年龄--{{ this.$store.getters['a/myAge'] }}
    <button @click="$store.commit('a/changeAge', 10)">更改年龄</button>

    <br>

    <hr>
    c的计算年龄--{{ this.$store.state.a.c.age }}
    <button @click="$store.commit('a/c/changeAge', 10)">更改年龄</button>
    <!-- <button @click="$store.commit('a/c/changeAge', 10)">更改年龄</button> -->

    <hr>
    <button @click="registerModule">动态注册模块</button>
    b模块 -- {{ this.$store.state.B && this.$store.state.B.name }} -- {{ this.$store.state.B && this.$store.state.B.age }}
    {{ this.$store.getters && this.$store.getters.bAge}}
  </div>
</template>

<script>
import store from './store';
export default {
  name: 'App',
  mounted(){

  },

  methods:{
    registerModule(){
      store.registerModule('B', {
        state:{
          name:'b',
          age:20
        },
        getters:{
          bAge(state){
            return state.age + 10
          }
        }
      })
    }
  }
}
</script>

<style>
</style>
