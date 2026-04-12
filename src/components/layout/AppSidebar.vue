<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { APP_TITLE, IS_MOCK_ENABLED } from '@/constants/app'
import { useAppStore } from '@/stores/app'
import { usePermissionStore } from '@/stores/permission'

const appStore = useAppStore()
const permissionStore = usePermissionStore()
const route = useRoute()

const activeMenu = computed(() => (route.meta.activeMenu as string) || route.path)
</script>

<template>
  <aside
    class="sidebar-shell"
    :style="{
      width: appStore.sidebarCollapsed
        ? 'var(--app-sidebar-collapsed-width)'
        : 'var(--app-sidebar-width)'
    }"
  >
    <div class="brand-block">
      <div class="brand-mark">TA</div>
      <div v-if="!appStore.sidebarCollapsed" class="brand-content">
        <div class="brand-title">{{ APP_TITLE }}</div>
        <div class="brand-meta">
          独立工程骨架
          <span v-if="IS_MOCK_ENABLED" class="mock-badge">Mock</span>
        </div>
      </div>
    </div>

    <el-scrollbar>
      <el-menu
        router
        class="sidebar-menu"
        :collapse="appStore.sidebarCollapsed"
        :collapse-transition="false"
        :default-active="activeMenu"
      >
        <SidebarMenuItem
          v-for="menu in permissionStore.menus"
          :key="menu.path"
          :route="menu"
          :base-path="menu.path"
        />
      </el-menu>
    </el-scrollbar>
  </aside>
</template>

<style scoped lang="scss">
.sidebar-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 14px;
  background: linear-gradient(180deg, #123a36 0%, #0f2623 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  transition: width 0.2s ease;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 8px 10px 18px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: linear-gradient(135deg, #14b8a6 0%, #f59e0b 100%);
  color: #082f2b;
  font-weight: 800;
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
}

.brand-meta {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
}

.mock-badge {
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.18);
  color: #fbbf24;
}

:deep(.sidebar-menu) {
  border-right: none;
  background: transparent;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  margin-bottom: 6px;
  border-radius: 14px;
  color: rgba(248, 250, 252, 0.82);
}

:deep(.el-menu-item.is-active) {
  background: rgba(20, 184, 166, 0.18);
  color: #ffffff;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}
</style>
