<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import {
  getDiaryDetailApi,
  getDiaryPageApi,
  updateDiaryDeletedStatusApi,
  updateDiaryStatusApi
} from '@/api/diaries'
import { getUserOptionsApi } from '@/api/users'
import { useMetaStore } from '@/stores/meta'
import {
  getApiErrorMessage,
  isApiRequestError,
  type PageResult
} from '@/types/api'
import type { DiaryDetail, DiaryListItem, DiaryListQuery } from '@/types/diary'
import type { UserOptionItem } from '@/types/user'
import { formatDateTime } from '@/utils/format'

interface StatusFormState {
  id: string
  title: string
  status?: number
}

const metaStore = useMetaStore()
const loading = ref(false)
const detailLoading = ref(false)
const authorLoading = ref(false)
const statusSubmitting = ref(false)
const detailVisible = ref(false)
const statusDialogVisible = ref(false)
const updatingDeletedId = ref('')
const publishedRange = ref<[string, string] | []>([])
const detailData = ref<DiaryDetail | null>(null)
const authorOptions = ref<UserOptionItem[]>([])
const pageData = ref<PageResult<DiaryListItem>>({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  pages: 1,
  list: []
})

const queryState = reactive<DiaryListQuery>({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  authorId: undefined,
  status: undefined,
  contentType: '',
  visibility: undefined,
  isTop: undefined,
  isDeleted: undefined,
  publishedStart: undefined,
  publishedEnd: undefined
})

const statusForm = reactive<StatusFormState>({
  id: '',
  title: '',
  status: undefined
})

const statusOptions = computed(() => metaStore.getOptions('diaryStatuses'))
const visibilityOptions = computed(() =>
  metaStore.getOptions('diaryVisibilities')
)
const topOptions = computed(() => metaStore.getOptions('diaryTopStatuses'))
const deletedOptions = computed(() =>
  metaStore.getOptions('diaryDeletedStatuses')
)
const detailTitle = computed(() => detailData.value?.title || '日记详情')
const selectedAuthorLabel = computed(
  () =>
    authorOptions.value.find((item) => item.id === queryState.authorId)
      ?.nickname || ''
)

const syncPublishedRangeToQuery = () => {
  if (publishedRange.value.length === 2) {
    queryState.publishedStart = publishedRange.value[0]
    queryState.publishedEnd = publishedRange.value[1]
    return
  }

  queryState.publishedStart = undefined
  queryState.publishedEnd = undefined
}

const resetStatusForm = () => {
  statusForm.id = ''
  statusForm.title = ''
  statusForm.status = undefined
}

const showRequestError = (error: unknown, fallback: string) => {
  if (isApiRequestError(error) && error.handledByRequest) {
    return
  }

  ElMessage.error(getApiErrorMessage(error, fallback))
}

const getDiaryStatusTagType = (status: number) => {
  const normalizedStatus = Number(status)

  if (normalizedStatus === 1) {
    return 'success'
  }

  if (normalizedStatus === 2) {
    return 'warning'
  }

  if (normalizedStatus === 3) {
    return 'danger'
  }

  return 'info'
}

const getDeletedTagType = (isDeleted: number) =>
  Number(isDeleted) === 1 ? 'danger' : 'success'

const getContentTypeText = (value: string | number | null | undefined) => {
  if (value === undefined || value === null || value === '') {
    return '--'
  }

  return String(value)
}

const loadData = async () => {
  syncPublishedRangeToQuery()
  loading.value = true

  try {
    pageData.value = await getDiaryPageApi({
      ...queryState,
      contentType: queryState.contentType?.trim() || undefined
    })
  } catch (error) {
    showRequestError(error, '日记列表加载失败')
  } finally {
    loading.value = false
  }
}

const loadAuthorOptions = async (keyword = '') => {
  const trimmedKeyword = keyword.trim()

  if (!trimmedKeyword) {
    authorOptions.value = queryState.authorId
      ? authorOptions.value.filter((item) => item.id === queryState.authorId)
      : []
    return
  }

  authorLoading.value = true

  try {
    const options = await getUserOptionsApi({
      keyword: trimmedKeyword,
      pageSize: 20
    })

    authorOptions.value = options
  } catch (error) {
    showRequestError(error, '作者选项加载失败')
  } finally {
    authorLoading.value = false
  }
}

const handleSearch = () => {
  queryState.pageNum = 1
  void loadData()
}

const handleReset = () => {
  queryState.keyword = ''
  queryState.authorId = undefined
  queryState.status = undefined
  queryState.contentType = ''
  queryState.visibility = undefined
  queryState.isTop = undefined
  queryState.isDeleted = undefined
  queryState.pageNum = 1
  queryState.pageSize = 10
  queryState.publishedStart = undefined
  queryState.publishedEnd = undefined
  publishedRange.value = []
  authorOptions.value = []
  void loadData()
}

const handlePageChange = (pageNum: number) => {
  queryState.pageNum = pageNum
  void loadData()
}

const handlePageSizeChange = (pageSize: number) => {
  queryState.pageSize = pageSize
  queryState.pageNum = 1
  void loadData()
}

const openDetail = async (id: string) => {
  detailVisible.value = true
  detailLoading.value = true

  try {
    detailData.value = await getDiaryDetailApi(id)
  } catch (error) {
    showRequestError(error, '日记详情加载失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

const handleViewDetail = (row: DiaryListItem) => {
  void openDetail(row.id)
}

const openStatusDialog = (row: DiaryListItem) => {
  statusForm.id = row.id
  statusForm.title = row.title
  statusForm.status = Number(row.status)
  statusDialogVisible.value = true
}

const handleStatusDialogClosed = () => {
  resetStatusForm()
}

const handleSubmitStatus = async () => {
  if (!statusForm.id || statusForm.status === undefined) {
    ElMessage.warning('请选择目标状态')
    return
  }

  statusSubmitting.value = true

  try {
    await updateDiaryStatusApi(statusForm.id, {
      status: statusForm.status
    })

    if (detailData.value?.id === statusForm.id) {
      detailData.value.status = statusForm.status
    }

    statusDialogVisible.value = false
    await loadData()
    ElMessage.success('日记状态更新成功')
  } catch (error) {
    showRequestError(error, '日记状态更新失败')
  } finally {
    statusSubmitting.value = false
  }
}

const handleToggleDeleted = async (row: DiaryListItem) => {
  const nextDeletedStatus = Number(row.isDeleted) === 1 ? 0 : 1
  const actionText = nextDeletedStatus === 1 ? '逻辑删除' : '恢复'
  const nextDeletedLabel = metaStore.getLabel(
    'diaryDeletedStatuses',
    nextDeletedStatus,
    String(nextDeletedStatus)
  )

  try {
    await ElMessageBox.confirm(
      nextDeletedStatus === 1
        ? `确认将日记“${row.title}”标记为逻辑删除吗？`
        : `确认恢复日记“${row.title}”吗？`,
      `${actionText}日记`,
      {
        type: 'warning',
        confirmButtonText: '确认',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  updatingDeletedId.value = row.id

  try {
    await updateDiaryDeletedStatusApi(row.id, {
      isDeleted: nextDeletedStatus
    })

    if (detailData.value?.id === row.id) {
      detailData.value.isDeleted = nextDeletedStatus
    }

    await loadData()
    ElMessage.success(`日记已${nextDeletedLabel}`)
  } catch (error) {
    showRequestError(error, `日记${actionText}失败`)
  } finally {
    updatingDeletedId.value = ''
  }
}

void loadData()
</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">日记管理</h1>
        <p class="page-subtitle">
          对接
          `/api/v1/admin/travel-diaries`，支持筛选查询、详情查看、状态修改与逻辑删除切换。
        </p>
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

    <el-alert
      class="content-type-alert"
      type="info"
      :closable="false"
      show-icon
      title="内容类型 contentType 来源于业务表 diary_category，当前接口文档未提供类型选项接口，因此本页按原值查询与展示。"
    />

    <section v-loading="loading" class="page-card filter-card">
      <el-form :inline="true" :model="queryState">
        <el-form-item label="关键字">
          <el-input
            v-model="queryState.keyword"
            :disabled="loading"
            clearable
            placeholder="标题 / 摘要"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="作者">
          <el-select
            v-model="queryState.authorId"
            :disabled="loading"
            :loading="authorLoading"
            clearable
            filterable
            remote
            reserve-keyword
            placeholder="搜索作者昵称 / 邮箱"
            style="width: 240px"
            :remote-method="loadAuthorOptions"
          >
            <el-option
              v-for="option in authorOptions"
              :key="option.id"
              :label="`${option.nickname || '--'}（${option.email || '--'}）`"
              :value="option.id"
            />
          </el-select>
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
              :value="Number(option.value)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="内容类型">
          <el-input
            v-model="queryState.contentType"
            :disabled="loading"
            clearable
            placeholder="原值筛选"
            style="width: 140px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="可见性">
          <el-select
            v-model="queryState.visibility"
            :disabled="loading"
            clearable
            placeholder="全部可见性"
            style="width: 150px"
          >
            <el-option
              v-for="option in visibilityOptions"
              :key="String(option.value)"
              :label="option.label"
              :value="Number(option.value)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="置顶状态">
          <el-select
            v-model="queryState.isTop"
            :disabled="loading"
            clearable
            placeholder="全部置顶状态"
            style="width: 150px"
          >
            <el-option
              v-for="option in topOptions"
              :key="String(option.value)"
              :label="option.label"
              :value="Number(option.value)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="删除状态">
          <el-select
            v-model="queryState.isDeleted"
            :disabled="loading"
            clearable
            placeholder="全部删除状态"
            style="width: 150px"
          >
            <el-option
              v-for="option in deletedOptions"
              :key="String(option.value)"
              :label="option.label"
              :value="Number(option.value)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="发布时间">
          <el-date-picker
            v-model="publishedRange"
            :disabled="loading"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>

        <el-form-item>
          <el-button :loading="loading" type="primary" @click="handleSearch"
            >查询</el-button
          >
          <el-button :disabled="loading" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </section>

    <section class="page-card table-card">
      <div class="table-toolbar">
        <div class="table-summary">
          共
          <span class="table-summary-value">{{ pageData.total }}</span> 篇日记
        </div>
        <div v-if="queryState.authorId" class="filter-chip">
          当前作者：{{ selectedAuthorLabel || queryState.authorId }}
        </div>
      </div>
      <el-table
        :data="pageData.list"
        :loading="loading"
        row-key="id"
        empty-text="暂无日记数据"
      >
        <el-table-column label="日记信息" min-width="340">
          <template #default="{ row }">
            <div class="diary-cell">
              <div class="cover-box">
                <el-image
                  v-if="row.coverUrl"
                  :src="row.coverUrl"
                  fit="cover"
                  class="cover-image"
                />
                <div v-else class="cover-placeholder">无封面</div>
              </div>

              <div class="diary-content">
                <div class="diary-title">{{ row.title || '--' }}</div>
                <div class="diary-summary">{{ row.summary || '暂无摘要' }}</div>
                <div class="diary-meta">ID：{{ row.id }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="作者" min-width="160">
          <template #default="{ row }">
            <div class="author-cell">
              <div class="author-name">{{ row.author?.nickname || '--' }}</div>
              <div class="author-meta">
                用户 ID：{{ row.author?.id || '--' }}
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="内容属性" min-width="220">
          <template #default="{ row }">
            <div class="tag-group">
              <el-tag effect="plain"
                >类型：{{ getContentTypeText(row.contentType) }}</el-tag
              >

              <el-tag effect="plain">
                {{
                  metaStore.getLabel(
                    'diaryVisibilities',
                    row.visibility,
                    String(row.visibility)
                  )
                }}
              </el-tag>
              <el-tag effect="plain">
                {{
                  metaStore.getLabel(
                    'diaryTopStatuses',
                    row.isTop,
                    String(row.isTop)
                  )
                }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="互动数据" min-width="200">
          <template #default="{ row }">
            <div class="metric-grid">
              <span>浏览 {{ row.viewCount ?? 0 }}</span>
              <span>点赞 {{ row.likeCount ?? 0 }}</span>
              <span>收藏 {{ row.favoriteCount ?? 0 }}</span>
              <span>评论 {{ row.commentCount ?? 0 }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" min-width="180">
          <template #default="{ row }">
            <div class="status-stack">
              <el-tag :type="getDiaryStatusTagType(row.status)" effect="light">
                {{
                  metaStore.getLabel(
                    'diaryStatuses',
                    row.status,
                    String(row.status)
                  )
                }}
              </el-tag>
              <el-tag :type="getDeletedTagType(row.isDeleted)" effect="light">
                {{
                  metaStore.getLabel(
                    'diaryDeletedStatuses',
                    row.isDeleted,
                    String(row.isDeleted)
                  )
                }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="发布时间" min-width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.publishedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="更新时间" min-width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" min-width="220">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewDetail(row)"
              >详情</el-button
            >

            <el-button link type="primary" @click="openStatusDialog(row)"
              >修改状态</el-button
            >

            <el-button
              link
              :loading="updatingDeletedId === row.id"
              :type="Number(row.isDeleted) === 1 ? 'success' : 'danger'"
              @click="handleToggleDeleted(row)"
            >
              {{ Number(row.isDeleted) === 1 ? '恢复' : '逻辑删除' }}
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
          :page-sizes="[10, 20, 50, 100]"
          :total="pageData.total"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </section>

    <el-drawer
      v-model="detailVisible"
      :title="detailTitle"
      size="720px"
      destroy-on-close
      append-to-body
    >
      <div v-loading="detailLoading" class="detail-shell">
        <template v-if="detailData">
          <section class="detail-hero">
            <div class="detail-cover-box">
              <el-image
                v-if="detailData.coverUrl"
                :src="detailData.coverUrl"
                fit="cover"
                class="detail-cover-image"
              />
              <div v-else class="detail-cover-placeholder">暂无封面</div>
            </div>

            <div class="detail-hero-content">
              <div class="detail-title-row">
                <span class="detail-name">{{ detailData.title || '--' }}</span>
                <el-tag
                  :type="getDiaryStatusTagType(detailData.status)"
                  effect="light"
                >
                  {{
                    metaStore.getLabel(
                      'diaryStatuses',
                      detailData.status,
                      String(detailData.status)
                    )
                  }}
                </el-tag>
                <el-tag
                  :type="getDeletedTagType(detailData.isDeleted)"
                  effect="light"
                >
                  {{
                    metaStore.getLabel(
                      'diaryDeletedStatuses',
                      detailData.isDeleted,
                      String(detailData.isDeleted)
                    )
                  }}
                </el-tag>
              </div>

              <div class="detail-subline">
                作者：{{ detailData.author?.nickname || '--' }} /
                {{ detailData.author?.id || '--' }}
              </div>

              <div class="tag-group detail-tag-group">
                <el-tag effect="plain"
                  >类型：{{
                    getContentTypeText(detailData.contentType)
                  }}</el-tag
                >

                >
                <el-tag effect="plain">
                  {{
                    metaStore.getLabel(
                      'diaryVisibilities',
                      detailData.visibility,
                      String(detailData.visibility)
                    )
                  }}
                </el-tag>
                <el-tag effect="plain">
                  {{
                    metaStore.getLabel(
                      'diaryTopStatuses',
                      detailData.isTop,
                      String(detailData.isTop)
                    )
                  }}
                </el-tag>
              </div>
            </div>
          </section>

          <div class="stats-grid">
            <article class="stat-card">
              <div class="stat-label">浏览量</div>
              <div class="stat-value">{{ detailData.viewCount ?? 0 }}</div>
            </article>
            <article class="stat-card">
              <div class="stat-label">点赞数</div>
              <div class="stat-value">{{ detailData.likeCount ?? 0 }}</div>
            </article>
            <article class="stat-card">
              <div class="stat-label">收藏数</div>
              <div class="stat-value">{{ detailData.favoriteCount ?? 0 }}</div>
            </article>
            <article class="stat-card">
              <div class="stat-label">评论数</div>
              <div class="stat-value">{{ detailData.commentCount ?? 0 }}</div>
            </article>
          </div>

          <section class="detail-card">
            <div class="detail-card-title">基础信息</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="日记 ID">{{
                detailData.id
              }}</el-descriptions-item>

              <el-descriptions-item label="发布时间">
                {{ formatDateTime(detailData.publishedAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ formatDateTime(detailData.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ formatDateTime(detailData.updatedAt) }}
              </el-descriptions-item>
            </el-descriptions>
          </section>

          <section class="detail-card">
            <div class="detail-card-title">摘要</div>
            <div class="text-block">{{ detailData.summary || '暂无摘要' }}</div>
          </section>

          <section class="detail-card">
            <div class="detail-card-title">正文</div>
            <div class="text-block content-block">
              {{ detailData.content || '暂无正文内容' }}
            </div>
          </section>
        </template>
      </div>
    </el-drawer>

    <el-dialog
      v-model="statusDialogVisible"
      title="修改日记状态"
      width="460px"
      destroy-on-close
      @closed="handleStatusDialogClosed"
    >
      <el-form label-width="88px">
        <el-form-item label="日记标题">
          <el-input :model-value="statusForm.title" disabled />
        </el-form-item>

        <el-form-item label="目标状态">
          <el-radio-group v-model="statusForm.status">
            <el-radio
              v-for="option in statusOptions"
              :key="String(option.value)"
              :value="Number(option.value)"
            >
              {{ option.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <div class="dialog-tip">
        接口仅提交 `status` 字段，不包含审核备注、审核人或审核时间。
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button
            :disabled="statusSubmitting"
            @click="statusDialogVisible = false"
          >
            取消
          </el-button>
          <el-button
            :loading="statusSubmitting"
            type="primary"
            @click="handleSubmitStatus"
          >
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped lang="scss">
.meta-alert,
.content-type-alert,
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

.filter-chip {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(14, 116, 144, 0.08);
  color: #0f766e;
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
}

.diary-cell {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.cover-box,
.detail-cover-box {
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.04);
}

.cover-box {
  width: 92px;
  height: 68px;
}

.detail-cover-box {
  width: 180px;
  height: 128px;
  border-radius: 22px;
}

.cover-image,
.detail-cover-image {
  width: 100%;
  height: 100%;
  display: block;
}

.cover-placeholder,
.detail-cover-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
}

.diary-content,
.author-cell,
.detail-hero-content {
  min-width: 0;
}

.diary-title,
.author-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.diary-summary,
.diary-meta,
.author-meta,
.detail-subline {
  margin-top: 6px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

.diary-summary {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-tag-group {
  margin-top: 12px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
}

.status-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.detail-shell {
  min-height: 260px;
}

.detail-hero {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  padding: 4px 0 20px;
}

.detail-title-row {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
  color: var(--app-text-primary);
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.text-block {
  color: var(--app-text-primary);
  font-size: var(--app-typo-body-md-size);
  font-weight: var(--app-typo-body-md-weight);
  line-height: 1.8;
  letter-spacing: var(--app-typo-body-md-letter-spacing);
}

.content-block {
  white-space: pre-wrap;
  word-break: break-word;
}

.dialog-tip {
  margin-top: 8px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .table-toolbar,
  .detail-hero {
    flex-direction: column;
  }

  .detail-cover-box {
    width: 100%;
    height: 180px;
  }

  .stats-grid,
  .metric-grid {
    grid-template-columns: 1fr;
  }
}
</style>
