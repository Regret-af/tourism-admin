<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { useMetaStore } from '@/stores/meta'

const appStore = useAppStore()
const metaStore = useMetaStore()

const sidebarWidth = computed(() =>
  appStore.sidebarCollapsed ? 'var(--app-sidebar-collapsed-width)' : 'var(--app-sidebar-width)'
)

onMounted(() => {
  void metaStore.ensureLoaded()
})
</script>

<template>
  <el-container class="layout-shell">
    <el-aside class="layout-aside" :width="sidebarWidth">
      <AppSidebar />
    </el-aside>

    <el-container class="layout-main-shell">
      <el-header class="layout-header">
        <AppHeader />
      </el-header>

      <el-main class="layout-main">
        <div class="layout-content">
          <router-view v-slot="{ Component, route }">
            <transition name="fade-slide" mode="out-in">
              <component :is="Component" :key="route.fullPath" />
            </transition>
          </router-view>
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="scss">
.layout-shell {
  height: 100vh;
  overflow: hidden;
  background: var(--app-bg);
}

.layout-aside {
  flex-shrink: 0;
  height: 100vh;
  overflow: hidden;
}

.layout-main-shell {
  min-width: 0;
  height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(15, 23, 42, 0.04), transparent 20%),
    linear-gradient(180deg, #f8fafc 0%, #f3f6f9 100%);
}

.layout-header {
  height: auto;
  padding: 16px 18px 0;
  overflow: hidden;
}

.layout-main {
  min-width: 0;
  min-height: 0;
  padding: 16px 18px 18px;
  overflow: auto;
}

.layout-content {
  min-height: 100%;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.18s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
