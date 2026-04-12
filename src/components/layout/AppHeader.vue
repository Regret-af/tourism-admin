<script setup lang="ts">
import { Expand, Fold, SwitchButton } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { LOGIN_PATH } from '@/constants/app'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useMetaStore } from '@/stores/meta'
import { usePermissionStore } from '@/stores/permission'

const appStore = useAppStore()
const authStore = useAuthStore()
const metaStore = useMetaStore()
const permissionStore = usePermissionStore()
const router = useRouter()

const currentRole = computed(() => {
  const roleCode = permissionStore.roles[0]

  if (!roleCode) {
    return '未分配角色'
  }

  return metaStore.getLabel('roleCodes', roleCode, roleCode)
})

const handleLogout = async () => {
  await authStore.logout()
  permissionStore.reset()
  metaStore.reset()
  await router.replace(LOGIN_PATH)
}
</script>

<template>
  <header class="header-shell page-card">
    <div class="header-left">
      <el-button circle plain @click="appStore.toggleSidebar">
        <el-icon>
          <component :is="appStore.sidebarCollapsed ? Expand : Fold" />
        </el-icon>
      </el-button>

      <AppBreadcrumb />
    </div>

    <div class="header-right">
      <div class="account-meta">
        <div class="account-name">{{ authStore.user?.nickname || '未登录' }}</div>
        <div class="account-role">{{ currentRole }}</div>
      </div>

      <el-dropdown trigger="click">
        <div class="account-avatar">
          {{ (authStore.user?.nickname || 'A').slice(0, 1) }}
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item :icon="SwitchButton" @click="handleLogout">
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<style scoped lang="scss">
.header-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--app-header-height);
  padding: 0 20px;
  border-radius: 22px;
}

.header-left,
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.account-meta {
  text-align: right;
}

.account-name {
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.account-role {
  margin-top: 4px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-label-sm-size);
  font-weight: var(--app-typo-label-sm-weight);
  line-height: var(--app-typo-label-sm-line-height);
  letter-spacing: var(--app-typo-label-sm-letter-spacing);
}

.account-avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #14b8a6 0%, #f59e0b 100%);
  color: #082f2b;
  font-size: var(--app-typo-title-md-size);
  font-weight: var(--app-font-weight-extrabold);
  line-height: 1;
  cursor: pointer;
}
</style>
