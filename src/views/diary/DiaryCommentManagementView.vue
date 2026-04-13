<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import { getDiaryCommentPageApi, updateDiaryCommentStatusApi } from '@/api/comments'
import { getUserOptionsApi } from '@/api/users'
import { useMetaStore } from '@/stores/meta'
import { getApiErrorMessage, isApiRequestError, type PageResult } from '@/types/api'
import type { DiaryCommentListItem, DiaryCommentListQuery } from '@/types/comment'
import type { UserOptionItem } from '@/types/user'
import { formatDateTime } from '@/utils/format'

const metaStore = useMetaStore()
const loading = ref(false)
const authorLoading = ref(false)
const detailVisible = ref(false)
const updatingCommentId = ref('')
const createdRange = ref<[string, string] | []>([])
const detailData = ref<DiaryCommentListItem | null>(null)
const userOptions = ref<UserOptionItem[]>([])
const pageData = ref<PageResult<DiaryCommentListItem>>({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  pages: 1,
  list: []
})

const queryState = reactive<DiaryCommentListQuery>({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  diaryId: '',
  userId: undefined,
  status: undefined,
  createdStart: undefined,
  createdEnd: undefined
})

const statusOptions = computed(() => metaStore.getOptions('diaryCommentStatuses'))
const detailTitle = computed(() => {
  if (!detailData.value) {
    return '评论详情'
  }

  return detailData.value.diaryTitle
    ? `评论详情 · ${detailData.value.diaryTitle}`
    : `评论详情 · ${detailData.value.id}`
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

const isCommentVisible = (status: number) => Number(status) === 1

const getStatusTagType = (status: number) => (isCommentVisible(status) ? 'success' : 'info')

const getNextStatus = (status: number) => (isCommentVisible(status) ? 0 : 1)

const getCommentPreview = (content?: string | null) => {
  if (!content) {
    return '--'
  }

  return content
}

const loadData = async () => {
  syncCreatedRangeToQuery()
  loading.value = true

  try {
    pageData.value = await getDiaryCommentPageApi({
      ...queryState,
      keyword: queryState.keyword.trim(),
      diaryId: queryState.diaryId?.trim() || undefined
    })
  } catch (error) {
    showRequestError(error, '评论列表加载失败')
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

  authorLoading.value = true

  try {
    userOptions.value = await getUserOptionsApi({
      keyword: trimmedKeyword,
      pageSize: 20
    })
  } catch (error) {
    showRequestError(error, '评论用户选项加载失败')
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
  queryState.diaryId = ''
  queryState.userId = undefined
  queryState.status = undefined
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
  queryState.pageSize = pageSize
  queryState.pageNum = 1
  void loadData()
}

const handleViewDetail = (row: DiaryCommentListItem) => {
  detailData.value = { ...row }
  detailVisible.value = true
}

const handleToggleStatus = async (row: DiaryCommentListItem) => {
  const nextStatus = getNextStatus(row.status)
  const actionText = nextStatus === 1 ? '恢复显示' : '隐藏'
  const nextStatusLabel = metaStore.getLabel('diaryCommentStatuses', nextStatus, String(nextStatus))

  try {
    await ElMessageBox.confirm(
      nextStatus === 1
        ? `确认恢复该评论的前台显示状态吗？`
        : `确认隐藏该评论吗？隐藏后前台将不再展示该评论。`,
      `${actionText}评论`,
      {
        type: 'warning',
        confirmButtonText: '确认',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  updatingCommentId.value = row.id

  try {
    await updateDiaryCommentStatusApi(row.id, {
      status: nextStatus
    })

    if (detailData.value?.id === row.id) {
      detailData.value.status = nextStatus
    }

    await loadData()
    ElMessage.success(`评论已${nextStatusLabel}`)
  } catch (error) {
    showRequestError(error, `评论${actionText}失败`)
  } finally {
    updatingCommentId.value = ''
  }
}

void loadData()
</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">评论管理</h1>
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
      class="filter-alert"
      type="info"
      :closable="false"
      show-icon
      title="评论用户支持远程搜索；接口文档未提供日记选项接口，因此日记筛选按日记 ID 精确查询。"
    />

    <section v-loading="loading" class="page-card filter-card">
      <el-form :inline="true" :model="queryState">
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            :disabled="loading"
            clearable
            placeholder="评论内容"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="日记 ID">
          <el-input
            v-model="queryState.diaryId"
            :disabled="loading"
            clearable
            placeholder="请输入日记 ID"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="评论用户">
          <el-select
            v-model="queryState.userId"
            :disabled="loading"
            :loading="authorLoading"
            clearable
            filterable
            remote
            reserve-keyword
            placeholder="搜索昵称 / 邮箱"
            style="width: 240px"
            :remote-method="loadUserOptions"
          >
            <el-option
              v-for="option in userOptions"
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
            style="width: 160px"
          >
            <el-option
              v-for="option in statusOptions"
              :key="String(option.value)"
              :label="option.label"
              :value="Number(option.value)"
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
          共 <span class="table-summary-value">{{ pageData.total }}</span> 条评论
        </div>
      </div>

      <el-table :data="pageData.list" :loading="loading" row-key="id" empty-text="暂无评论数据">
        <el-table-column label="日记信息" min-width="240">
          <template #default="{ row }">
            <div class="entity-title">{{ row.diaryTitle || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="评论用户" min-width="180">
          <template #default="{ row }">
            <div class="entity-title">{{ row.userNickname || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="评论内容" min-width="320">
          <template #default="{ row }">
            <div class="comment-content">{{ getCommentPreview(row.content) }}</div>
          </template>
        </el-table-column>

        <el-table-column label="评论关系" min-width="180">
          <template #default="{ row }">
            <div class="relation-line">父评论：{{ row.parentId || '--' }}</div>
            <div class="relation-line">回复用户：{{ row.replyToUserId || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="状态" min-width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" effect="light">
              {{ metaStore.getLabel('diaryCommentStatuses', row.status, String(row.status)) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" min-width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" min-width="180">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewDetail(row)">详情</el-button>
            <el-button
              link
              :loading="updatingCommentId === row.id"
              :type="isCommentVisible(row.status) ? 'danger' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ isCommentVisible(row.status) ? '隐藏' : '恢复显示' }}
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
      size="560px"
      destroy-on-close
      append-to-body
    >
      <div class="detail-shell">
        <template v-if="detailData">
          <section class="detail-hero">
            <div class="detail-hero-content">
              <div class="detail-name-row">
                <span class="detail-name">{{ detailData.diaryTitle || '未命名日记' }}</span>
                <el-tag :type="getStatusTagType(detailData.status)" effect="light">
                  {{
                    metaStore.getLabel(
                      'diaryCommentStatuses',
                      detailData.status,
                      String(detailData.status)
                    )
                  }}
                </el-tag>
              </div>
              <div class="detail-subline">
                评论用户：{{ detailData.userNickname || '--' }} / {{ detailData.userId || '--' }}
              </div>
            </div>
          </section>

          <section class="detail-card">
            <div class="detail-card-title">评论信息</div>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="评论 ID">{{ detailData.id }}</el-descriptions-item>
              <el-descriptions-item label="日记 ID">{{ detailData.diaryId || '--' }}</el-descriptions-item>
              <el-descriptions-item label="父评论 ID">
                {{ detailData.parentId || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="回复用户 ID">
                {{ detailData.replyToUserId || '--' }}
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
            <div class="detail-card-title">评论内容</div>
            <div class="text-block">{{ detailData.content || '暂无评论内容' }}</div>
          </section>
        </template>
      </div>
    </el-drawer>
  </section>
</template>

<style scoped lang="scss">
.meta-alert,
.filter-alert,
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

.entity-meta,
.relation-line,
.detail-subline {
  margin-top: 6px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

.comment-content,
.text-block {
  display: -webkit-box;
  overflow: hidden;
  color: var(--app-text-primary);
  line-height: 1.75;
  word-break: break-word;
  -webkit-box-orient: vertical;
}

.comment-content {
  -webkit-line-clamp: 3;
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

.text-block {
  white-space: pre-wrap;
  -webkit-line-clamp: unset;
}

@media (max-width: 960px) {
  .table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
