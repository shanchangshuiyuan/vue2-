<template>
  <el-menu>
    <template v-for="item in data">
      <resub :data="item"></resub>
    </template>
  </el-menu>
</template>
