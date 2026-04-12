<script setup lang="ts">
import type { RouteRecordRaw } from 'vue-router'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { Menu } from '@element-plus/icons-vue'
import { computed } from 'vue'

const props = defineProps<{
  route: RouteRecordRaw
  basePath?: string
}>()

const visibleChildren = computed(() =>
  (props.route.children ?? []).filter((item) => !item.meta?.hidden)
)

const hasOneShowingChild = computed(
  () => visibleChildren.value.length === 1 && !props.route.meta?.alwaysShow
)

const isLeaf = computed(
  () => visibleChildren.value.length === 0 || hasOneShowingChild.value
)

const resolvePath = (path: string) => {
  if (path.startsWith('/')) {
    return path
  }

  if (!path) {
    return props.basePath || '/'
  }

  const base = (props.basePath || '').replace(/\/$/, '')
  return `${base}/${path}`.replace(/\/+/g, '/')
}

const activeRoute = computed(() => {
  if (hasOneShowingChild.value) {
    return visibleChildren.value[0]
  }

  return props.route
})

const activeTitle = computed(
  () =>
    (typeof activeRoute.value.meta?.title === 'string' && activeRoute.value.meta.title) ||
    (typeof props.route.meta?.title === 'string' && props.route.meta.title) ||
    '未命名菜单'
)

const activeIcon = computed(
  () =>
    (typeof activeRoute.value.meta?.icon === 'string' && activeRoute.value.meta.icon) ||
    (typeof props.route.meta?.icon === 'string' && props.route.meta.icon) ||
    'Menu'
)

const activePath = computed(() => resolvePath(activeRoute.value.path))

const resolveIcon = (icon?: string) =>
  (icon && ElementPlusIconsVue[icon as keyof typeof ElementPlusIconsVue]) || Menu
</script>

<template>
  <el-menu-item v-if="isLeaf" :index="activePath">
    <el-icon><component :is="resolveIcon(activeIcon)" /></el-icon>
    <span>{{ activeTitle }}</span>
  </el-menu-item>

  <el-sub-menu v-else :index="resolvePath(route.path)">
    <template #title>
      <el-icon><component :is="resolveIcon(activeIcon)" /></el-icon>
      <span>{{ route.meta?.title }}</span>
    </template>

    <SidebarMenuItem
      v-for="child in visibleChildren"
      :key="resolvePath(child.path)"
      :route="child"
      :base-path="resolvePath(route.path)"
    />
  </el-sub-menu>
</template>
