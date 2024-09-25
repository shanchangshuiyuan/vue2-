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

  </div>
</template>

<script>
export default {
  name: 'App',
  mounted(){

  }
}
</script>

<style>
</style>
