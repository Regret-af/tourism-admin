<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const breadcrumbItems = computed(() =>
  route.matched.filter((item) => item.meta?.title && item.path !== '/')
)
</script>

<template>
  <el-breadcrumb separator="/">
    <el-breadcrumb-item
      v-for="item in breadcrumbItems"
      :key="item.path"
      :to="item.meta.hidden ? undefined : item.path"
    >
      {{ item.meta.title }}
    </el-breadcrumb-item>
  </el-breadcrumb>
</template>
