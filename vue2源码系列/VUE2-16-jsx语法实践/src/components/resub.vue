<template>
  <el-menu-item :key="data.title" v-if="!data.children">{{ data.title }}</el-menu-item>
  <el-submenu v-else>
    <template #title>{{ data.title }}</template>
    <template v-for="d in data.children">
      <resub :data="d"></resub>
    </template>
  </el-submenu>
</template>

<script>
import elMenu from "./el-menu.vue";
import elMenuItem from "./el-menu-item.vue";
import elSubmenu from "./el-submenu.vue";
export default {
  name: "resub",
  props: {
    data: {},
  },
  components: {
    elMenu,
    elMenuItem,
    elSubmenu,
  },
};
</script>
