<template>
  <div>
    <homeHeader v-model="currentCategory"></homeHeader>
    {{ category }}
  </div>
</template>

<script>
import homeHeader from "./home-header";
import { createNamespacedHelpers } from "vuex";
import * as Types from "@/store/action-types";
//拿到的都是home模块下的
let { mapState: mapState, mapMutations, mapActions } = createNamespacedHelpers("home");

export default {
  data() {
    //全部课程 -1 node 0 react课程 1 vue课程 2
    return {
      value: -1,
    };
  },
  components: {
    homeHeader,
  },

  async mounted() {
    // // 一面一加载就开始获取数据
    // if (this.slides.length == 0) {
    //   // 如果vuex中有数据，直接拿来用
    //   try {
    //     await this[Types.SET_SLIDES]();
    //   } catch (e) {
    //     console.log(e); // 错误处理 、 或者异常处理
    //   }
    // }
  },

  computed: {
    ...mapState(["category"]), //获取vuex的状态绑定到实例
    currentCategory: {
      get() {
        //取值走他
        return this.category;
      },
      set(value) {
        //修改值 默认走mutations
        this[Types.SET_CATEGORY](value);
      },
    },
  },

  methods: {
    ...mapMutations([Types.SET_CATEGORY]),
    ...mapActions([Types.SET_SLIDES]),
  },
};
</script>
