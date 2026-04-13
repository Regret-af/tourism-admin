<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createAttractionCategoryApi,
  getAttractionCategoryDetailApi,
  getAttractionCategoryPageApi,
  updateAttractionCategoryApi,
  updateAttractionCategorySortOrderApi,
  updateAttractionCategoryStatusApi
} from '@/api/attractionCategories'
import { useMetaStore } from '@/stores/meta'
import { getApiErrorMessage, isApiRequestError, type PageResult } from '@/types/api'
import type {
  AttractionCategoryDetail,
  AttractionCategoryListItem,
  AttractionCategoryListQuery
} from '@/types/attractionCategory'
import { formatDateTime } from '@/utils/format'

type EditMode = 'create' | 'edit'

interface CategoryFormState {
  id: string
  name: string
  code: string
  sortOrder: number
  status: number
}

interface SortFormState {
  id: string
  name: string
  sortOrder: number
}

const metaStore = useMetaStore()
const loading = ref(false)
const detailLoading = ref(false)
const submitLoading = ref(false)
const sortSubmitting = ref(false)
const detailVisible = ref(false)
const formVisible = ref(false)
const sortVisible = ref(false)
const updatingStatusId = ref('')
const dialogMode = ref<EditMode>('create')
const detailData = ref<AttractionCategoryDetail | null>(null)
const formRef = ref<FormInstance>()
const sortFormRef = ref<FormInstance>()
const pageData = ref<PageResult<AttractionCategoryListItem>>({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  pages: 1,
  list: []
})

const queryState = reactive<AttractionCategoryListQuery>({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  status: undefined
})

const createDefaultFormState = (): CategoryFormState => ({
  id: '',
  name: '',
  code: '',
  sortOrder: 0,
  status: 1
})

const createDefaultSortState = (): SortFormState => ({
  id: '',
  name: '',
  sortOrder: 0
})

const formState = reactive<CategoryFormState>(createDefaultFormState())
const sortState = reactive<SortFormState>(createDefaultSortState())

const statusOptions = computed(() => metaStore.getOptions('attractionCategoryStatuses'))
const dialogTitle = computed(() => (dialogMode.value === 'create' ? '新增景点分类' : '编辑景点分类'))
const detailTitle = computed(() => detailData.value?.name || '分类详情')

const integerValidator = (_rule: unknown, value: number, callback: (error?: Error) => void) => {
  if (!Number.isInteger(value) || value < 0) {
    callback(new Error('排序值必须为大于等于 0 的整数'))
    return
  }

  callback()
}

const formRules: FormRules<CategoryFormState> = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入分类编码', trigger: 'blur' }],
  sortOrder: [
    { required: true, message: '请输入排序值', trigger: 'blur' },
    { validator: integerValidator, trigger: 'blur' }
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}

const sortRules: FormRules<SortFormState> = {
  sortOrder: [
    { required: true, message: '请输入排序值', trigger: 'blur' },
    { validator: integerValidator, trigger: 'blur' }
  ]
}

const resetFormState = () => {
  Object.assign(formState, createDefaultFormState())
}

const resetSortState = () => {
  Object.assign(sortState, createDefaultSortState())
}

const showRequestError = (error: unknown, fallback: string) => {
  if (isApiRequestError(error) && error.handledByRequest) {
    return
  }

  ElMessage.error(getApiErrorMessage(error, fallback))
}

const getStatusTagType = (status: number) => (Number(status) === 1 ? 'success' : 'info')

const isCategoryEnabled = (status: number) => Number(status) === 1

const getNextStatus = (status: number) => (isCategoryEnabled(status) ? 0 : 1)

const loadData = async () => {
  loading.value = true

  try {
    pageData.value = await getAttractionCategoryPageApi({
      ...queryState
    })
  } catch (error) {
    showRequestError(error, '景点分类列表加载失败')
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
  queryState.pageNum = 1
  queryState.pageSize = 10
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
    detailData.value = await getAttractionCategoryDetailApi(id)
  } catch (error) {
    showRequestError(error, '景点分类详情加载失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

const handleViewDetail = (row: AttractionCategoryListItem) => {
  void openDetail(row.id)
}

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetFormState()
  formVisible.value = true
}

const openEditDialog = (row: AttractionCategoryListItem) => {
  dialogMode.value = 'edit'
  Object.assign(formState, {
    id: row.id,
    name: row.name,
    code: row.code,
    sortOrder: row.sortOrder,
    status: row.status
  })
  formVisible.value = true
}

const handleDialogClosed = () => {
  resetFormState()
  formRef.value?.clearValidate()
}

const handleSortDialogClosed = () => {
  resetSortState()
  sortFormRef.value?.clearValidate()
}

const handleSubmitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  submitLoading.value = true

  try {
    if (dialogMode.value === 'create') {
      await createAttractionCategoryApi({
        name: formState.name,
        code: formState.code,
        sortOrder: formState.sortOrder,
        status: formState.status
      })

      queryState.pageNum = 1
      ElMessage.success('景点分类创建成功')
    } else {
      await updateAttractionCategoryApi(formState.id, {
        name: formState.name,
        code: formState.code
      })

      if (detailData.value?.id === formState.id) {
        detailData.value.name = formState.name
        detailData.value.code = formState.code
      }

      ElMessage.success('景点分类更新成功')
    }

    formVisible.value = false
    await loadData()
  } catch (error) {
    showRequestError(error, dialogMode.value === 'create' ? '景点分类创建失败' : '景点分类更新失败')
  } finally {
    submitLoading.value = false
  }
}

const openSortDialog = (row: AttractionCategoryListItem) => {
  Object.assign(sortState, {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder
  })
  sortVisible.value = true
}

const handleSubmitSort = async () => {
  const valid = await sortFormRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  sortSubmitting.value = true

  try {
    await updateAttractionCategorySortOrderApi(sortState.id, {
      sortOrder: sortState.sortOrder
    })

    if (detailData.value?.id === sortState.id) {
      detailData.value.sortOrder = sortState.sortOrder
    }

    sortVisible.value = false
    await loadData()
    ElMessage.success('景点分类排序已更新')
  } catch (error) {
    showRequestError(error, '景点分类排序更新失败')
  } finally {
    sortSubmitting.value = false
  }
}

const handleToggleStatus = async (row: AttractionCategoryListItem) => {
  const nextStatus = getNextStatus(row.status)
  const actionText = nextStatus === 1 ? '启用' : '停用'
  const nextStatusLabel = metaStore.getLabel(
    'attractionCategoryStatuses',
    nextStatus,
    String(nextStatus)
  )

  try {
    await ElMessageBox.confirm(
      nextStatus === 1
        ? `确认启用分类“${row.name}”吗？`
        : '确认停用该分类吗？若该分类下仍存在上架景点，后端将拒绝本次停用。',
      `${actionText}景点分类`,
      {
        type: 'warning',
        confirmButtonText: '确认',
        cancelButtonText: '取消'
      }
    )
  } catch {
    return
  }

  updatingStatusId.value = row.id

  try {
    await updateAttractionCategoryStatusApi(row.id, { status: nextStatus })

    if (detailData.value?.id === row.id) {
      detailData.value.status = nextStatus
    }

    await loadData()
    ElMessage.success(`景点分类已${nextStatusLabel}`)
  } catch (error) {
    showRequestError(error, `景点分类${actionText}失败`)
  } finally {
    updatingStatusId.value = ''
  }
}

void loadData()
</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">景点分类管理</h1>
        <p class="page-subtitle">
          对接 `/api/v1/admin/attraction-categories`，支持分类查询、详情查看、新增、编辑、状态切换与排序调整。
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

    <section v-loading="loading" class="page-card filter-card">
      <el-form :inline="true" :model="queryState">
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            :disabled="loading"
            clearable
            placeholder="分类名称 / 分类编码"
            @keyup.enter="handleSearch"
          />
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

        <el-form-item>
          <el-button :loading="loading" type="primary" @click="handleSearch">查询</el-button>
          <el-button :disabled="loading" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </section>

    <section class="page-card table-card">
      <div class="table-toolbar">
        <div class="table-summary">
          共 <span class="table-summary-value">{{ pageData.total }}</span> 个景点分类
        </div>

        <el-button type="primary" @click="openCreateDialog">新增景点分类</el-button>
      </div>

      <el-table
        :data="pageData.list"
        :loading="loading"
        row-key="id"
        empty-text="暂无景点分类数据"
      >
        <el-table-column label="分类信息" min-width="240">
          <template #default="{ row }">
            <div class="category-cell">
              <div class="category-symbol">{{ row.name.slice(0, 1) }}</div>
              <div class="category-content">
                <div class="category-name">{{ row.name }}</div>
                <div class="category-code">编码：{{ row.code }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="排序值" min-width="120" align="center">
          <template #default="{ row }">
            <span class="sort-chip">{{ row.sortOrder }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" min-width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" effect="light">
              {{ metaStore.getLabel('attractionCategoryStatuses', row.status, String(row.status)) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="关联景点数" min-width="120" align="center">
          <template #default="{ row }">
            {{ row.attractionCount ?? 0 }}
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

        <el-table-column label="操作" fixed="right" min-width="260">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewDetail(row)">详情</el-button>
            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="primary" @click="openSortDialog(row)">排序</el-button>
            <el-button
              link
              :loading="updatingStatusId === row.id"
              :type="isCategoryEnabled(row.status) ? 'danger' : 'success'"
              @click="handleToggleStatus(row)"
            >
              {{ isCategoryEnabled(row.status) ? '停用' : '启用' }}
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
      size="520px"
      destroy-on-close
      append-to-body
    >
      <div v-loading="detailLoading" class="detail-shell">
        <template v-if="detailData">
          <section class="detail-hero">
            <div class="detail-symbol">{{ detailData.name.slice(0, 1) }}</div>
            <div class="detail-hero-content">
              <div class="detail-name-row">
                <span class="detail-name">{{ detailData.name }}</span>
                <el-tag :type="getStatusTagType(detailData.status)" effect="light">
                  {{
                    metaStore.getLabel(
                      'attractionCategoryStatuses',
                      detailData.status,
                      String(detailData.status)
                    )
                  }}
                </el-tag>
              </div>
              <div class="detail-subline">分类编码：{{ detailData.code }}</div>
            </div>
          </section>

          <div class="stats-grid">
            <article class="stat-card">
              <div class="stat-label">关联景点</div>
              <div class="stat-value">{{ detailData.attractionCount ?? 0 }}</div>
            </article>
            <article class="stat-card">
              <div class="stat-label">排序值</div>
              <div class="stat-value">{{ detailData.sortOrder }}</div>
            </article>
          </div>

          <section class="detail-card">
            <div class="detail-card-title">分类信息</div>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="分类 ID">{{ detailData.id }}</el-descriptions-item>
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

    <el-dialog
      v-model="formVisible"
      :title="dialogTitle"
      width="520px"
      destroy-on-close
      @closed="handleDialogClosed"
    >
      <el-form ref="formRef" :model="formState" :rules="formRules" label-width="96px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="formState.name" maxlength="50" placeholder="请输入分类名称" />
        </el-form-item>

        <el-form-item label="分类编码" prop="code">
          <el-input v-model="formState.code" maxlength="50" placeholder="请输入分类编码" />
        </el-form-item>

        <el-form-item v-if="dialogMode === 'create'" label="排序值" prop="sortOrder">
          <el-input-number v-model="formState.sortOrder" :min="0" :precision="0" />
        </el-form-item>

        <el-form-item v-if="dialogMode === 'create'" label="状态" prop="status">
          <el-radio-group v-model="formState.status">
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
        {{
          dialogMode === 'create'
            ? '新增接口提交字段为 name、code、sortOrder、status。'
            : '编辑接口仅提交 name、code，不在此处修改状态和排序。'
        }}
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button :disabled="submitLoading" @click="formVisible = false">取消</el-button>
          <el-button :loading="submitLoading" type="primary" @click="handleSubmitForm">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog
      v-model="sortVisible"
      title="调整分类排序"
      width="420px"
      destroy-on-close
      @closed="handleSortDialogClosed"
    >
      <el-form ref="sortFormRef" :model="sortState" :rules="sortRules" label-width="88px">
        <el-form-item label="分类名称">
          <el-input :model-value="sortState.name" disabled />
        </el-form-item>

        <el-form-item label="排序值" prop="sortOrder">
          <el-input-number v-model="sortState.sortOrder" :min="0" :precision="0" />
        </el-form-item>
      </el-form>

      <div class="dialog-tip">排序接口仅提交 `sortOrder`，不会修改分类状态或基础信息。</div>

      <template #footer>
        <span class="dialog-footer">
          <el-button :disabled="sortSubmitting" @click="sortVisible = false">取消</el-button>
          <el-button :loading="sortSubmitting" type="primary" @click="handleSubmitSort">
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

.category-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-symbol,
.detail-symbol {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.18), rgba(59, 130, 246, 0.14));
  color: #0f766e;
  font-weight: var(--app-font-weight-extrabold);
}

.category-symbol {
  width: 44px;
  height: 44px;
}

.detail-symbol {
  width: 72px;
  height: 72px;
  border-radius: 22px;
  font-size: var(--app-typo-title-lg-size);
}

.category-content {
  min-width: 0;
}

.category-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.category-code {
  margin-top: 6px;
  overflow: hidden;
  color: var(--app-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

.sort-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  font-weight: var(--app-font-weight-bold);
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
  margin-top: 8px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.dialog-tip {
  margin-top: 8px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

@media (max-width: 960px) {
  .table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
