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
  <div class="sidebar-shell" :class="{ 'is-collapsed': appStore.sidebarCollapsed }">
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

    <el-scrollbar class="menu-scrollbar">
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
  </div>
</template>

<style scoped lang="scss">
.sidebar-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 14px 12px;
  overflow: hidden;
  background: linear-gradient(180deg, var(--app-sidebar-bg-start) 0%, var(--app-sidebar-bg-end) 100%);
  border-right: 1px solid rgba(15, 23, 42, 0.06);
  color: var(--app-sidebar-text);
}

.sidebar-shell.is-collapsed {
  padding-left: 10px;
  padding-right: 10px;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 8px 10px 18px;
  flex-shrink: 0;
}

.sidebar-shell.is-collapsed .brand-block {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}

.brand-mark {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    var(--app-sidebar-accent) 0%,
    var(--app-sidebar-accent-light) 100%
  );
  color: #f8fbff;
  font-size: var(--app-typo-title-md-size);
  font-weight: var(--app-font-weight-extrabold);
  line-height: 1;
}

.brand-content {
  min-width: 0;
}

.brand-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.brand-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  font-size: var(--app-typo-label-sm-size);
  font-weight: var(--app-typo-label-sm-weight);
  line-height: var(--app-typo-label-sm-line-height);
  letter-spacing: var(--app-typo-label-sm-letter-spacing);
  color: rgba(68, 84, 101, 0.72);
}

.mock-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(53, 96, 122, 0.12);
  color: var(--app-sidebar-accent);
}

.menu-scrollbar {
  flex: 1;
  min-height: 0;
}

:deep(.menu-scrollbar .el-scrollbar__view) {
  min-height: 100%;
}

:deep(.sidebar-menu) {
  width: 100%;
  border-right: none;
  background: transparent;
  color: var(--app-sidebar-text);
}

:deep(.sidebar-menu .el-menu-item),
:deep(.sidebar-menu .el-sub-menu__title) {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 46px;
  margin-bottom: 6px;
  border-radius: 14px;
  color: var(--app-sidebar-text);
  line-height: 46px;
}

:deep(.sidebar-menu .el-sub-menu .el-menu) {
  margin: 2px 0 10px;
  padding: 8px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.6);
}

:deep(.sidebar-menu .el-sub-menu .el-menu .el-menu-item) {
  margin-bottom: 4px;
  padding-left: 14px !important;
  background: transparent;
  color: var(--app-sidebar-text);
}

:deep(.sidebar-menu .el-sub-menu .el-menu .el-menu-item:last-child) {
  margin-bottom: 0;
}

:deep(.sidebar-menu .el-menu-item .el-icon),
:deep(.sidebar-menu .el-sub-menu__title .el-icon) {
  width: 18px;
  margin-right: 0;
  font-size: 18px;
  text-align: center;
}

:deep(.sidebar-menu .el-menu-item span),
:deep(.sidebar-menu .el-sub-menu__title span) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.sidebar-menu.el-menu--collapse .el-menu-item),
:deep(.sidebar-menu.el-menu--collapse .el-sub-menu__title) {
  justify-content: center;
  padding: 0 !important;
}

:deep(.sidebar-menu.el-menu--collapse .el-sub-menu__title span),
:deep(.sidebar-menu.el-menu--collapse .el-menu-item span) {
  display: none;
}

:deep(.sidebar-menu.el-menu--collapse .el-sub-menu__icon-arrow) {
  display: none;
}

:deep(.el-menu-item.is-active) {
  background: var(--app-sidebar-active-bg);
  color: var(--app-sidebar-accent);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.62);
  color: var(--app-sidebar-text-strong);
}
</style>
