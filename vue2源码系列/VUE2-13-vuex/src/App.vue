<template>
  <div id="app">
    名字--{{ name }} 
    <br>
    年龄--{{ myAge }}
    <br>
    <button @click="changeAge(10)">更改年龄</button>
    <button @click="changeAge1(10)">异步更改年龄</button>


  </div>
</template>

<script>
import store from './store';
import { mapState, mapGetters, mapActions, mapMutations } from './vuex/index.js';

export default {
  name: 'App',
  computed:{
    ...mapState(['name']), //返回的是个对象
    ...mapGetters(['myAge'])
  },
  methods:{

    ...mapActions(['changeAge1']),
    ...mapMutations(['changeAge']),
    // changeAge(payload){
    //   this.$store.commit('changeAge', payload)
    // },
    // changeAgeAsync(payload){
    //   this.$store.dispatch('changeAge', payload)
    // }
  }
}
</script>

<style>
</style>
