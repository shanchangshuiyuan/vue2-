<template>
  <div id="app">
    <level type="1"><span slot="a">ok</span>ok</level>
    <level type="2">ok</level>

    <!-- <el-menu>
      <el-menu-item>菜单1</el-menu-item>
      <el-menu-item>菜单2</el-menu-item>
      <el-submenu>
        <template #title>标题3</template>
        <el-menu-item>菜单3-1</el-menu-item>
        <el-menu-item>菜单3-2</el-menu-item>
      </el-submenu>
    </el-menu> -->

    <my-munu :data="tree"></my-munu>
  </div>
</template>

<script>
import level from "./components/level.js";
import elMenu from "./components/el-menu.vue";
import elMenuItem from "./components/el-menu-item.vue";
import elSubmenu from "./components/el-submenu.vue";
import myMunu from "./components/my-munu.jsx";
export default {
  components: {
    level,
    elMenu,
    elMenuItem,
    elSubmenu,
    myMunu,
  },

  data() {
    return {
      tree: [
        {
          title: "菜单1",
          children: [
            {
              title: "菜单1-1",
              children: [
                {
                  title: "菜单1-1-1",
                },
              ],
            },
          ],
        },
        {
          title: "菜单2",
          children: [
            {
              title: "菜单2-1",
            },
          ],
        },
        {
          title: "菜单3",
          children: [
            {
              title: "菜单3-1",
            },
            {
              title: "菜单3-2",
            },
          ],
        },
      ],
    };
  },
};
</script>
