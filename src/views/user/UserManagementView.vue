<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import { getUserDetailApi, getUserPageApi, updateUserStatusApi } from '@/api/users'
import { useMetaStore } from '@/stores/meta'
import {
  clampAdminPageSize,
  getApiErrorMessage,
  isApiRequestError,
  normalizePageResult
} from '@/types/api'
import type { PageResult } from '@/types/api'
import type { UserDetail, UserListItem, UserListQuery } from '@/types/user'
import { formatDateTime } from '@/utils/format'

const metaStore = useMetaStore()
const loading = ref(false)
const detailLoading = ref(false)
const detailVisible = ref(false)
const updatingUserId = ref('')
const createdRange = ref<[string, string] | []>([])
const detailData = ref<UserDetail | null>(null)
const pageData = ref<PageResult<UserListItem>>({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  pages: 1,
  list: []
})

const queryState = reactive<UserListQuery>({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  status: undefined,
  roleCode: undefined,
  createdStart: undefined,
  createdEnd: undefined
})

const statusOptions = computed(() => metaStore.getOptions('userStatuses'))
const roleOptions = computed(() => metaStore.getOptions('roleCodes'))
const detailTitle = computed(() => {
  if (!detailData.value) {
    return '用户详情'
  }

  return detailData.value.nickname || detailData.value.username || '用户详情'
})

const syncCreatedRangeToQuery = () => {
  if (createdRange.value.length === 2) {
    queryState.createdStart = createdRange.value[0]
    queryState.createdEnd = createdRange.value[1]
    return
  }

  queryState.createdStart = undefined
  queryState.createdEnd = undefined
}

const showRequestError = (error: unknown, fallback: string) => {
  if (isApiRequestError(error) && error.handledByRequest) {
    return
  }

  ElMessage.error(getApiErrorMessage(error, fallback))
}

const getStatusTagType = (status: number) => (Number(status) === 1 ? 'success' : 'danger')

const isUserEnabled = (status: number) => Number(status) === 1

const getRoleLabel = (roleCode: string) => metaStore.getLabel('roleCodes', roleCode, roleCode)

const getNextStatus = (status: number) => (isUserEnabled(status) ? 0 : 1)

const loadData = async () => {
  syncCreatedRangeToQuery()
  loading.value = true

  try {
    pageData.value = normalizePageResult(await getUserPageApi({ ...queryState }))
    queryState.pageNum = pageData.value.pageNum
    queryState.pageSize = pageData.value.pageSize
  } catch (error) {
    showRequestError(error, '用户列表加载失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryState.pageNum = 1
  void loadData()
}

const handleReset = () => {
  queryState.keyword = ''
  queryState.status = undefined
  queryState.roleCode = undefined
  queryState.pageNum = 1
  queryState.pageSize = 10
  queryState.createdStart = undefined
  queryState.createdEnd = undefined
  createdRange.value = []
  void loadData()
}

const handlePageChange = (pageNum: number) => {
  queryState.pageNum = pageNum
  void loadData()
}

const handlePageSizeChange = (pageSize: number) => {
  queryState.pageSize = clampAdminPageSize(pageSize, 10)
  queryState.pageNum = 1
  void loadData()
}

const openDetail = async (userId: string) => {
  detailVisible.value = true
  detailLoading.value = true

  try {
    detailData.value = await getUserDetailApi(userId)
  } catch (error) {
    showRequestError(error, '用户详情加载失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

const handleViewDetail = (row: UserListItem) => {
  void openDetail(row.id)
}

const handleToggleStatus = async (row: UserListItem) => {
  const nextStatus = getNextStatus(row.status)
  const nextStatusLabel = metaStore.getLabel('userStatuses', nextStatus, String(nextStatus))
  const actionText = nextStatus === 1 ? '启用' : '禁用'

  try {
    await ElMessageBox.confirm(
      nextStatus === 1
        ? `确认启用用户“${row.nickname || row.username}”吗？`
        : `确认禁用用户“${row.nickname || row.username}”吗？禁用后该用户无法登录系统。`,
      `${actionText}用户`,
      {
        type: 'warning',
        confirmButtonText: '确认',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  updatingUserId.value = row.id

  try {
    await updateUserStatusApi(row.id, { status: nextStatus })
    row.status = nextStatus

    if (detailData.value?.id === row.id) {
      detailData.value.status = nextStatus
    }

    ElMessage.success(`用户已${nextStatusLabel}`)
  } catch (error) {
    showRequestError(error, `用户${actionText}失败`)
  } finally {
    updatingUserId.value = ''
  }
}

void loadData()
</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">用户管理</h1>
      </div>
    </div>

    <el-alert
      v-if="metaStore.errorMessage"
      class="meta-alert"
      type="warning"
      :closable="false"
      show-icon
      :title="metaStore.errorMessage"
    />

    <section v-loading="loading" class="page-card filter-card">
      <el-form :inline="true" :model="queryState">
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            :disabled="loading"
            clearable
            placeholder="邮箱 / 用户名 / 昵称"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select
            v-model="queryState.status"
            :disabled="loading"
            clearable
            placeholder="全部状态"
            style="width: 140px"
          >
            <el-option
              v-for="option in statusOptions"
              :key="String(option.value)"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="角色">
          <el-select
            v-model="queryState.roleCode"
            :disabled="loading"
            clearable
            placeholder="全部角色"
            style="width: 160px"
          >
            <el-option
              v-for="option in roleOptions"
              :key="String(option.value)"
              :label="option.label"
              :value="String(option.value)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="创建时间">
          <el-date-picker
            v-model="createdRange"
            :disabled="loading"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>

        <el-form-item>
          <el-button :loading="loading" type="primary" @click="handleSearch">查询</el-button>
          <el-button :disabled="loading" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </section>

    <section class="page-card table-card">
      <div class="table-toolbar">
        <div class="table-summary">
          共 <span class="table-summary-value">{{ pageData.total }}</span> 位用户
        </div>
      </div>

      <el-table :data="pageData.list" :loading="loading" row-key="id" empty-text="暂无用户数据">
        <el-table-column label="用户信息" min-width="280">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="44" :src="row.avatarUrl || undefined">
                {{ (row.nickname || row.username || '?').slice(0, 1) }}
              </el-avatar>
              <div class="user-cell-content">
                <div class="user-cell-title">{{ row.nickname || '--' }}</div>
                <div class="user-cell-meta">{{ row.username || '--' }}</div>
                <div class="user-cell-meta">{{ row.email || '--' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="角色" min-width="180">
          <template #default="{ row }">
            <div v-if="row.roles?.length" class="role-tags">
              <el-tag
                v-for="role in row.roles"
                :key="`${row.id}-${role}`"
                class="role-tag"
                effect="plain"
              >
                {{ getRoleLabel(role) }}
              </el-tag>
            </div>
            <span v-else>--</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" min-width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" effect="light">
              {{ metaStore.getLabel('userStatuses', row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="bio" label="简介" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.bio || '--' }}
          </template>
        </el-table-column>

        <el-table-column label="创建时间" min-width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="更新时间" min-width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" min-width="180">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewDetail(row)">详情</el-button>
            <el-button
              link
              :loading="updatingUserId === row.id"
              :type="isUserEnabled(row.status) ? 'danger' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ isUserEnabled(row.status) ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :current-page="pageData.pageNum"
          :page-size="pageData.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pageData.total"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </section>

    <el-drawer
      v-model="detailVisible"
      :title="detailTitle"
      size="560px"
      destroy-on-close
      append-to-body
    >
      <div v-loading="detailLoading" class="detail-shell">
        <template v-if="detailData">
          <section class="detail-hero">
            <el-avatar :size="72" :src="detailData.avatarUrl || undefined">
              {{ (detailData.nickname || detailData.username || '?').slice(0, 1) }}
            </el-avatar>
            <div class="detail-hero-content">
              <div class="detail-name-row">
                <span class="detail-name">{{ detailData.nickname || '--' }}</span>
                <el-tag :type="getStatusTagType(detailData.status)" effect="light">
                  {{ metaStore.getLabel('userStatuses', detailData.status) }}
                </el-tag>
              </div>
              <div class="detail-subline">{{ detailData.username || '--' }}</div>
              <div class="detail-subline">{{ detailData.email || '--' }}</div>
              <div v-if="detailData.roles?.length" class="role-tags">
                <el-tag
                  v-for="role in detailData.roles"
                  :key="`detail-${role}`"
                  class="role-tag"
                  effect="plain"
                >
                  {{ getRoleLabel(role) }}
                </el-tag>
              </div>
            </div>
          </section>

          <div class="stats-grid">
            <article class="stat-card">
              <div class="stat-label">日记数</div>
              <div class="stat-value">{{ detailData.diaryCount ?? 0 }}</div>
            </article>
            <article class="stat-card">
              <div class="stat-label">评论数</div>
              <div class="stat-value">{{ detailData.commentCount ?? 0 }}</div>
            </article>
            <article class="stat-card">
              <div class="stat-label">上传数</div>
              <div class="stat-value">{{ detailData.uploadCount ?? 0 }}</div>
            </article>
          </div>

          <section class="detail-card">
            <div class="detail-card-title">基础信息</div>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="用户 ID">{{ detailData.id }}</el-descriptions-item>
              <el-descriptions-item label="用户简介">
                {{ detailData.bio || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ formatDateTime(detailData.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ formatDateTime(detailData.updatedAt) }}
              </el-descriptions-item>
            </el-descriptions>
          </section>
        </template>
      </div>
    </el-drawer>
  </section>
</template>

<style scoped lang="scss">
.meta-alert,
.filter-card,
.table-card {
  margin-bottom: 18px;
}

.filter-card,
.table-card {
  padding: 20px 22px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.table-summary {
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

.table-summary-value {
  color: var(--app-text-primary);
  font-weight: var(--app-font-weight-bold);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-cell-content {
  min-width: 0;
}

.user-cell-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.user-cell-meta {
  overflow: hidden;
  color: var(--app-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.role-tag {
  margin-right: 0;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.detail-shell {
  min-height: 220px;
}

.detail-hero {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 4px 0 20px;
}

.detail-hero-content {
  min-width: 0;
  flex: 1;
}

.detail-name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.detail-name {
  font-size: var(--app-typo-title-lg-size);
  font-weight: var(--app-typo-title-lg-weight);
  line-height: var(--app-typo-title-lg-line-height);
  letter-spacing: var(--app-typo-title-lg-letter-spacing);
}

.detail-subline {
  margin-top: 6px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stat-card,
.detail-card {
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}

.stat-card {
  padding: 16px;
}

.stat-label {
  color: var(--app-text-secondary);
  font-size: var(--app-typo-label-sm-size);
  font-weight: var(--app-typo-label-sm-weight);
  line-height: var(--app-typo-label-sm-line-height);
  letter-spacing: var(--app-typo-label-sm-letter-spacing);
}

.stat-value {
  margin-top: 8px;
  font-size: var(--app-typo-title-lg-size);
  font-weight: var(--app-typo-title-lg-weight);
  line-height: var(--app-typo-title-lg-line-height);
  letter-spacing: var(--app-typo-title-lg-letter-spacing);
}

.detail-card {
  margin-top: 16px;
  padding: 16px;
}

.detail-card-title {
  margin-bottom: 12px;
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

@media (max-width: 960px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
