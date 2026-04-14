<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import {
  getOperationLogDetailApi,
  getOperationLogPageApi
} from '@/api/operationLogs'
import { getUserOptionsApi } from '@/api/users'
import RemoteUserSelect from '@/components/form/RemoteUserSelect.vue'
import { useMetaStore } from '@/stores/meta'
import {
  clampAdminPageSize,
  getApiErrorMessage,
  isApiRequestError,
  normalizePageResult,
  type PageResult
} from '@/types/api'
import type {
  OperationLogDetail,
  OperationLogListItem,
  OperationLogListQuery
} from '@/types/operationLog'
import type { UserOptionItem } from '@/types/user'
import { formatDateTime } from '@/utils/format'

const metaStore = useMetaStore()
const loading = ref(false)
const detailLoading = ref(false)
const userLoading = ref(false)
const detailVisible = ref(false)
const createdRange = ref<[string, string] | []>([])
const detailData = ref<OperationLogDetail | null>(null)
const userOptions = ref<UserOptionItem[]>([])
const pageData = ref<PageResult<OperationLogListItem>>({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  pages: 1,
  list: []
})

const queryState = reactive<OperationLogListQuery>({
  pageNum: 1,
  pageSize: 10,
  userId: undefined,
  module: undefined,
  action: undefined,
  source: undefined,
  requestIp: '',
  createdStart: undefined,
  createdEnd: undefined
})

const moduleOptions = computed(() =>
  metaStore.getOptions('operationLogModules')
)
const actionOptions = computed(() =>
  metaStore.getOptions('operationLogActions')
)
const sourceOptions = computed(() =>
  metaStore.getOptions('operationLogSources')
)
const detailTitle = computed(
  () => detailData.value?.description || '操作日志详情'
)

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

const getLogUserText = (
  row: Pick<OperationLogListItem, 'userNickname' | 'userId'>
) => {
  return row.userNickname || row.userId || '匿名用户'
}

const getTagTypeBySource = (source: string) => {
  return String(source).toUpperCase() === 'ADMIN' ? 'success' : 'info'
}

const loadData = async () => {
  syncCreatedRangeToQuery()
  loading.value = true

  try {
    pageData.value = normalizePageResult(
      await getOperationLogPageApi({
        ...queryState,
        requestIp: queryState.requestIp.trim()
      }),
      {
        pageNum: 1,
        pageSize: 10,
        total: 0,
        pages: 1
      }
    )
    queryState.pageNum = pageData.value.pageNum
    queryState.pageSize = pageData.value.pageSize
  } catch (error) {
    showRequestError(error, '操作日志列表加载失败')
  } finally {
    loading.value = false
  }
}

const loadUserOptions = async (keyword = '') => {
  const trimmedKeyword = keyword.trim()

  if (!trimmedKeyword) {
    userOptions.value = queryState.userId
      ? userOptions.value.filter((item) => item.id === queryState.userId)
      : []
    return
  }

  userLoading.value = true

  try {
    userOptions.value = await getUserOptionsApi({
      keyword: trimmedKeyword,
      pageSize: 20
    })
  } catch (error) {
    showRequestError(error, '操作用户选项加载失败')
  } finally {
    userLoading.value = false
  }
}

const handleSearch = () => {
  queryState.pageNum = 1
  void loadData()
}

const handleReset = () => {
  queryState.userId = undefined
  queryState.module = undefined
  queryState.action = undefined
  queryState.source = undefined
  queryState.requestIp = ''
  queryState.pageNum = 1
  queryState.pageSize = 10
  queryState.createdStart = undefined
  queryState.createdEnd = undefined
  createdRange.value = []
  userOptions.value = []
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

const openDetail = async (id: string) => {
  detailVisible.value = true
  detailLoading.value = true

  try {
    detailData.value = await getOperationLogDetailApi(id)
  } catch (error) {
    showRequestError(error, '操作日志详情加载失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

const handleViewDetail = (row: OperationLogListItem) => {
  void openDetail(row.id)
}

void loadData()
</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">操作日志管理</h1>
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
        <el-form-item label="操作用户">
          <RemoteUserSelect
            v-model="queryState.userId"
            :disabled="loading"
            :loading="userLoading"
            :options="userOptions"
            placeholder="搜索昵称 / 邮箱"
            style="width: 280px"
            @search="loadUserOptions"
          />
        </el-form-item>

        <el-form-item label="模块">
          <el-select
            v-model="queryState.module"
            :disabled="loading"
            clearable
            placeholder="全部模块"
            style="width: 170px"
          >
            <el-option
              v-for="option in moduleOptions"
              :key="String(option.value)"
              :label="option.label"
              :value="String(option.value)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="动作">
          <el-select
            v-model="queryState.action"
            :disabled="loading"
            clearable
            placeholder="全部动作"
            style="width: 180px"
          >
            <el-option
              v-for="option in actionOptions"
              :key="String(option.value)"
              :label="option.label"
              :value="String(option.value)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="来源">
          <el-select
            v-model="queryState.source"
            :disabled="loading"
            clearable
            placeholder="全部来源"
            style="width: 150px"
          >
            <el-option
              v-for="option in sourceOptions"
              :key="String(option.value)"
              :label="option.label"
              :value="String(option.value)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="请求 IP">
          <el-input
            v-model="queryState.requestIp"
            :disabled="loading"
            clearable
            placeholder="请输入请求 IP"
            style="width: 180px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="操作时间">
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
          <el-button :loading="loading" type="primary" @click="handleSearch">
            查询
          </el-button>
          <el-button :disabled="loading" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </section>

    <section class="page-card table-card">
      <div class="table-toolbar">
        <div class="table-summary">
          共<span class="table-summary-value">{{ pageData.total }}</span>
          条日志记录
        </div>
      </div>

      <el-table
        :data="pageData.list"
        :loading="loading"
        row-key="id"
        empty-text="暂无操作日志数据"
      >
        <el-table-column label="操作用户" min-width="120" align="center">
          <template #default="{ row }">
            <div class="entity-title">{{ getLogUserText(row) }}</div>
          </template>
        </el-table-column>

        <el-table-column label="模块" min-width="120" align="center">
          <template #default="{ row }">
            <el-tag effect="plain">
              {{
                metaStore.getLabel(
                  'operationLogModules',
                  row.module,
                  row.module
                )
              }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="动作" min-width="180" align="center">
          <template #default="{ row }">
            <el-tag effect="plain" type="warning">
              {{
                metaStore.getLabel(
                  'operationLogActions',
                  row.action,
                  row.action
                )
              }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          label="业务 ID"
          min-width="80"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ row.bizId || '--' }}
          </template>
        </el-table-column>

        <el-table-column
          label="操作描述"
          min-width="200"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <div class="description-text">{{ row.description || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="来源" min-width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getTagTypeBySource(row.source)" effect="light">
              {{
                metaStore.getLabel(
                  'operationLogSources',
                  row.source,
                  row.source
                )
              }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="请求 IP" min-width="150" align="center">
          <template #default="{ row }">
            {{ row.requestIp || '--' }}
          </template>
        </el-table-column>

        <el-table-column label="操作时间" min-width="180" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" width="100" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="queryState.pageNum"
          v-model:page-size="queryState.pageSize"
          background
          layout="total, sizes, prev, pager, next, jumper"
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
      size="620px"
      destroy-on-close
      append-to-body
    >
      <div v-loading="detailLoading" class="detail-shell">
        <template v-if="detailData">
          <section class="detail-hero">
            <div class="detail-hero-content">
              <div class="detail-name-row">
                <span class="detail-name">{{
                  detailData.description || '--'
                }}</span>
                <el-tag effect="plain">
                  {{
                    metaStore.getLabel(
                      'operationLogModules',
                      detailData.module,
                      detailData.module
                    )
                  }}
                </el-tag>
                <el-tag effect="plain" type="warning">
                  {{
                    metaStore.getLabel(
                      'operationLogActions',
                      detailData.action,
                      detailData.action
                    )
                  }}
                </el-tag>
              </div>

              <div class="detail-subline">
                操作用户：{{ getLogUserText(detailData) }}
              </div>
              <div class="detail-subline">
                日志来源：{{
                  metaStore.getLabel(
                    'operationLogSources',
                    detailData.source,
                    detailData.source
                  )
                }}
              </div>
            </div>
          </section>

          <section class="detail-card">
            <div class="detail-card-title">日志信息</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="日志 ID">
                {{ detailData.id }}
              </el-descriptions-item>
              <el-descriptions-item label="用户 ID">
                {{ detailData.userId || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="业务 ID">
                {{ detailData.bizId || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="请求 IP">
                {{ detailData.requestIp || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="操作时间" :span="2">
                {{ formatDateTime(detailData.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="User-Agent" :span="2">
                <div class="text-block user-agent-text">
                  {{ detailData.userAgent || '--' }}
                </div>
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

.detail-hero-content {
  min-width: 0;
  flex: 1;
}

.entity-title,
.detail-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.detail-subline {
  margin-top: 4px;
  overflow: hidden;
  color: var(--app-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

.description-text,
.text-block {
  color: var(--app-text-primary);
  line-height: 1.7;
  word-break: break-word;
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

.detail-card {
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--app-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
}

.detail-card-title {
  margin-bottom: 12px;
  color: var(--app-text-primary);
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.user-agent-text {
  white-space: pre-wrap;
}


@media (max-width: 1200px) {
  .table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}

@media (max-width: 960px) {
  .detail-name-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

