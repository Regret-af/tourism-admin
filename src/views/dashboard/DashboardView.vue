<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed } from 'vue'
import { ADMIN_META_DICTIONARY_LABELS, ADMIN_META_PRIORITY_KEYS } from '@/constants/meta'
import { IS_MOCK_ENABLED } from '@/constants/app'
import { useAuthStore } from '@/stores/auth'
import { useMetaStore } from '@/stores/meta'
import type { AdminMetaOptionKey } from '@/types/meta'

const authStore = useAuthStore()
const metaStore = useMetaStore()

const currentRoleLabel = computed(() => {
  const roleCode = authStore.user?.roles[0]
  return roleCode ? metaStore.getLabel('roleCodes', roleCode, roleCode) : '--'
})

const cards = computed(() => [
  {
    label: '在线模块',
    value: '06',
    tips: '登录、首页、布局、示例列表、示例表单、404'
  },
  {
    label: '当前角色',
    value: currentRoleLabel.value,
    tips: '角色编码展示已切换到全局元数据中心'
  },
  {
    label: '请求模式',
    value: IS_MOCK_ENABLED ? 'Mock + Meta API' : 'API',
    tips: '固定字典走 /api/v1/admin/meta/options，业务数据仍走各自接口'
  },
  {
    label: '元数据状态',
    value: metaStore.loaded ? '已加载' : metaStore.loading ? '加载中' : '未加载',
    tips: metaStore.errorMessage || '进入后台后会自动初始化一次并在内存中缓存'
  }
])

const metaPreviewGroups = computed(() =>
  ADMIN_META_PRIORITY_KEYS.map((key) => ({
    key,
    title: ADMIN_META_DICTIONARY_LABELS[key],
    options: metaStore.getOptions(key)
  }))
)

const handleReloadMeta = async () => {
  try {
    await metaStore.loadMeta(true)
    ElMessage.success('管理端基础字典已刷新')
  } catch {
    // 失败提示由 store 内统一处理
  }
}

const getGroupKeyLabel = (key: AdminMetaOptionKey) => `dict:${key}`
</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">首页</h1>
        <p class="page-subtitle">
          管理端基础骨架已可运行，固定字典已接入全局元数据中心，后续页面可统一复用。
        </p>
      </div>

      <el-button :loading="metaStore.loading" @click="handleReloadMeta">刷新基础字典</el-button>
    </div>

    <el-alert
      v-if="metaStore.errorMessage"
      class="meta-alert"
      type="warning"
      :closable="false"
      show-icon
      :title="metaStore.errorMessage"
      description="页面不会使用本地硬编码字典兜底，固定枚举会优先展示接口返回的 label；未加载成功时退回原始 value。"
    />

    <div class="overview-grid">
      <article v-for="card in cards" :key="card.label" class="overview-card page-card">
        <div class="overview-label">{{ card.label }}</div>
        <div class="overview-value">{{ card.value }}</div>
        <div class="overview-tips">{{ card.tips }}</div>
      </article>
    </div>

    <div class="content-grid">
      <section class="page-card highlight-card">
        <div class="block-title">当前阶段交付</div>
        <ul>
          <li>独立 Vue3 管理端工程初始化完成</li>
          <li>路由、守卫、Pinia、Axios、权限占位已接入</li>
          <li>固定字典统一接入 `/api/v1/admin/meta/options`</li>
          <li>页面展示、筛选项、角色文案已复用元数据中心能力</li>
        </ul>
      </section>

      <section class="page-card roadmap-card">
        <div class="block-title">后续接入建议</div>
        <ol>
          <li>补充管理员用户、角色、菜单、按钮权限接口。</li>
          <li>将用户、景点、日记、评论、操作日志页面逐步切换到元数据中心。</li>
          <li>保留固定字典与业务远程选项的分层，不要混用。</li>
          <li>若字典新增项，仅需后端补充 meta/options 响应，无需逐页改 label。</li>
        </ol>
      </section>
    </div>

    <section class="page-card meta-card">
      <div class="block-title">固定字典预览</div>
      <div class="meta-grid">
        <article v-for="group in metaPreviewGroups" :key="getGroupKeyLabel(group.key)" class="meta-group">
          <div class="meta-group-title">{{ group.title }}</div>
          <div class="meta-group-body">
            <el-tag
              v-for="option in group.options"
              :key="`${group.key}-${String(option.value)}`"
              class="meta-tag"
              effect="plain"
            >
              {{ option.label }} / {{ option.value }}
            </el-tag>
            <span v-if="group.options.length === 0" class="meta-empty">暂无数据</span>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped lang="scss">
.meta-alert {
  margin-bottom: 18px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.overview-card {
  padding: 24px;
}

.overview-label {
  color: var(--app-text-secondary);
  font-size: var(--app-typo-label-md-size);
  font-weight: var(--app-typo-label-md-weight);
  line-height: var(--app-typo-label-md-line-height);
  letter-spacing: var(--app-typo-label-md-letter-spacing);
}

.overview-value {
  margin-top: 18px;
  font-size: var(--app-typo-metric-lg-size);
  font-weight: var(--app-typo-metric-lg-weight);
  line-height: var(--app-typo-metric-lg-line-height);
  letter-spacing: var(--app-typo-metric-lg-letter-spacing);
}

.overview-tips {
  margin-top: 12px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

.content-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 18px;
  margin-top: 18px;
}

.highlight-card,
.roadmap-card,
.meta-card {
  padding: 24px;
}

.block-title {
  margin-bottom: 14px;
  font-size: var(--app-typo-title-lg-size);
  font-weight: var(--app-typo-title-lg-weight);
  line-height: var(--app-typo-title-lg-line-height);
  letter-spacing: var(--app-typo-title-lg-letter-spacing);
}

.highlight-card ul,
.roadmap-card ol {
  margin: 0;
  padding-left: 20px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-md-size);
  font-weight: var(--app-typo-body-md-weight);
  line-height: var(--app-line-height-relaxed);
  letter-spacing: var(--app-typo-body-md-letter-spacing);
}

.meta-card {
  margin-top: 18px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.meta-group {
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}

.meta-group-title {
  margin-bottom: 12px;
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.meta-group-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-tag {
  margin-right: 0;
}

.meta-empty {
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

@media (max-width: 1200px) {
  .overview-grid,
  .content-grid,
  .meta-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .overview-grid,
  .content-grid,
  .meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
