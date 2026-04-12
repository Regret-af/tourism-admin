<script setup lang="ts">
import { onMounted } from 'vue'
import { useMetaStore } from '@/stores/meta'

const metaStore = useMetaStore()

onMounted(() => {
  void metaStore.ensureLoaded()
})
</script>

<template>
  <div class="layout-shell">
    <AppSidebar />

    <div class="layout-main">
      <AppHeader />

      <main class="layout-content">
        <router-view v-slot="{ Component, route }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.layout-shell {
  display: flex;
  min-height: 100vh;
}

.layout-main {
  flex: 1;
  min-width: 0;
  padding: 16px 18px;
}

.layout-content {
  margin-top: 16px;
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
