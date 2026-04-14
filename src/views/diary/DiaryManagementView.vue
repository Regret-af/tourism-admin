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
import RemoteUserSelect from '@/components/form/RemoteUserSelect.vue'
import { useMetaStore } from '@/stores/meta'
import {
  clampAdminPageSize,
  getApiErrorMessage,
  isApiRequestError,
  normalizePageResult,
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
const visibilityOptions = computed(() => metaStore.getOptions('diaryVisibilities'))
const topOptions = computed(() => metaStore.getOptions('diaryTopStatuses'))
const deletedOptions = computed(() => metaStore.getOptions('diaryDeletedStatuses'))
const detailTitle = computed(() => detailData.value?.title || '日记详情')

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

const getDeletedTagType = (isDeleted: number) => (Number(isDeleted) === 1 ? 'danger' : 'success')

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
    pageData.value = normalizePageResult(
      await getDiaryPageApi({
        ...queryState,
        contentType: queryState.contentType?.trim() || undefined
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
    authorOptions.value = await getUserOptionsApi({
      keyword: trimmedKeyword,
      pageSize: 20
    })
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
  queryState.pageSize = clampAdminPageSize(pageSize, 10)
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
  const actionText = nextDeletedStatus === 1 ? '删除' : '恢复'
  const nextDeletedLabel = metaStore.getLabel(
    'diaryDeletedStatuses',
    nextDeletedStatus,
    String(nextDeletedStatus)
  )

  try {
    await ElMessageBox.confirm(
      nextDeletedStatus === 1
        ? `确认删除日记“${row.title}”吗？`
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
            placeholder="标题 / 摘要"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="作者">
          <RemoteUserSelect
            v-model="queryState.authorId"
            :disabled="loading"
            :loading="authorLoading"
            :options="authorOptions"
            placeholder="搜索作者昵称 / 邮箱"
            style="width: 240px"
            @search="loadAuthorOptions"
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
              :value="Number(option.value)"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="内容类型">
          <el-input
            v-model="queryState.contentType"
            :disabled="loading"
            clearable
            placeholder="按原值筛选"
            style="width: 160px"
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
          <el-button :loading="loading" type="primary" @click="handleSearch">查询</el-button>
          <el-button :disabled="loading" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </section>

    <section class="page-card table-card">
      <div class="table-toolbar">
        <div class="table-summary">
          共 <span class="table-summary-value">{{ pageData.total }}</span> 篇日记
        </div>
      </div>

      <el-table :data="pageData.list" :loading="loading" row-key="id" empty-text="暂无日记数据">
        <el-table-column label="作品封面" width="120" align="center">
          <template #default="{ row }">
            <div class="cover-box">
              <el-image
                v-if="row.coverUrl"
                :src="row.coverUrl"
                fit="cover"
                class="cover-image"
              />
              <div v-else class="cover-placeholder">暂无封面</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="diary-title">{{ row.title || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="作者" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="author-name">{{ row.author?.nickname || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="类型" width="120" align="center">
          <template #default="{ row }">
            {{ getContentTypeText(row.contentType) }}
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getDiaryStatusTagType(row.status)" effect="light">
              {{ metaStore.getLabel('diaryStatuses', row.status, String(row.status)) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="发布时间" width="170" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.publishedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" width="300" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewDetail(row)">详情</el-button>
            <el-button link type="primary" @click="openStatusDialog(row)">修改状态</el-button>
            <el-button
              link
              :loading="updatingDeletedId === row.id"
              :type="Number(row.isDeleted) === 1 ? 'success' : 'danger'"
              @click="handleToggleDeleted(row)"
            >
              {{ Number(row.isDeleted) === 1 ? '恢复' : '删除' }}
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
                <el-tag :type="getDiaryStatusTagType(detailData.status)" effect="light">
                  {{ metaStore.getLabel('diaryStatuses', detailData.status, String(detailData.status)) }}
                </el-tag>
                <el-tag :type="getDeletedTagType(detailData.isDeleted)" effect="light">
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
                作者：{{ detailData.author?.nickname || '--' }} / {{ detailData.author?.id || '--' }}
              </div>

              <div class="tag-group detail-tag-group">
                <el-tag effect="plain">类型：{{ getContentTypeText(detailData.contentType) }}</el-tag>
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
                  {{ metaStore.getLabel('diaryTopStatuses', detailData.isTop, String(detailData.isTop)) }}
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
              <el-descriptions-item label="日记 ID">{{ detailData.id }}</el-descriptions-item>
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
            <div class="text-block content-block">{{ detailData.content || '暂无正文内容' }}</div>
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

      <template #footer>
        <span class="dialog-footer">
          <el-button :disabled="statusSubmitting" @click="statusDialogVisible = false">取消</el-button>
          <el-button :loading="statusSubmitting" type="primary" @click="handleSubmitStatus">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
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

.cover-box {
  overflow: hidden;
  width: 72px;
  height: 72px;
  border: 1px solid var(--app-border);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.04);
}

.cover-image {
  display: block;
  width: 100%;
  height: 100%;
}

.cover-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  line-height: 1.4;
  text-align: center;
}

.diary-content,
.detail-hero-content {
  min-width: 0;
}

.diary-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.diary-summary,
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
  -webkit-line-clamp: 1;
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-tag-group {
  margin-top: 12px;
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

.detail-cover-box {
  overflow: hidden;
  width: 180px;
  height: 128px;
  flex-shrink: 0;
  border: 1px solid var(--app-border);
  border-radius: 22px;
  background: rgba(15, 23, 42, 0.04);
}

.detail-cover-image {
  display: block;
  width: 100%;
  height: 100%;
}

.detail-cover-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
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

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .detail-hero {
    flex-direction: column;
  }

  .detail-cover-box {
    width: 100%;
    height: 180px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

