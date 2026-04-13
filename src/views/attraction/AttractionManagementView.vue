<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import {
  createAttractionApi,
  fillAttractionPoiApi,
  getAttractionDetailApi,
  getAttractionPageApi,
  searchAttractionPoiApi,
  updateAttractionApi,
  updateAttractionStatusApi
} from '@/api/attractions'
import { getAttractionCategoryPageApi } from '@/api/attractionCategories'
import { useMetaStore } from '@/stores/meta'
import {
  getApiErrorMessage,
  isApiRequestError,
  normalizePageResult,
  type PageResult
} from '@/types/api'
import type {
  AttractionCategorySummary,
  AttractionDetail,
  AttractionListItem,
  AttractionListQuery,
  AttractionPayload,
  AttractionPoiSearchItem
} from '@/types/attraction'
import type { AttractionCategoryListItem } from '@/types/attractionCategory'
import { formatDateTime } from '@/utils/format'

type EditMode = 'create' | 'edit'

interface AttractionFormState {
  id: string
  categoryId: string
  name: string
  summary: string
  description: string
  coverUrl: string
  locationText: string
  addressDetail: string
  telephone: string
  openingHours: string
  baiduUid: string
  sourceSyncedAt: string
  longitude?: number
  latitude?: number
  status: number
}

interface PoiState {
  selectedUid: string
}

const MAX_PAGE_SIZE = 50
const DEFAULT_PAGE_SIZE = 10

const metaStore = useMetaStore()
const loading = ref(false)
const detailLoading = ref(false)
const formLoading = ref(false)
const submitLoading = ref(false)
const categoryLoading = ref(false)
const poiSearchLoading = ref(false)
const poiFillLoading = ref(false)
const detailVisible = ref(false)
const formVisible = ref(false)
const updatingStatusId = ref('')
const createdRange = ref<[string, string] | []>([])
const dialogMode = ref<EditMode>('create')
const formRef = ref<FormInstance>()
const detailData = ref<AttractionDetail | null>(null)
const categoryOptions = ref<AttractionCategoryListItem[]>([])
const poiOptions = ref<AttractionPoiSearchItem[]>([])
const pageData = ref<PageResult<AttractionListItem>>({
  pageNum: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  pages: 1,
  list: []
})

const queryState = reactive<AttractionListQuery>({
  pageNum: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  keyword: '',
  categoryId: undefined,
  status: undefined,
  createdStart: undefined,
  createdEnd: undefined
})

const createDefaultFormState = (): AttractionFormState => ({
  id: '',
  categoryId: '',
  name: '',
  summary: '',
  description: '',
  coverUrl: '',
  locationText: '',
  addressDetail: '',
  telephone: '',
  openingHours: '',
  baiduUid: '',
  sourceSyncedAt: '',
  longitude: undefined,
  latitude: undefined,
  status: 1
})

const formState = reactive<AttractionFormState>(createDefaultFormState())
const poiState = reactive<PoiState>({ selectedUid: '' })
const statusOptions = computed(() => metaStore.getOptions('attractionStatuses'))
const dialogTitle = computed(() => (dialogMode.value === 'create' ? '新增景点' : '编辑景点'))
const detailTitle = computed(() => detailData.value?.name || '景点详情')

const rangeValidator =
  (min: number, max: number, label: string) =>
  (_rule: unknown, value: number | undefined, callback: (error?: Error) => void) => {
    if (value === undefined || value === null) {
      callback()
      return
    }

    if (!Number.isFinite(value) || value < min || value > max) {
      callback(new Error(`${label}范围必须在 ${min} 到 ${max} 之间`))
      return
    }

    callback()
  }

const formRules: FormRules<AttractionFormState> = {
  categoryId: [{ required: true, message: '请选择景点分类', trigger: 'change' }],
  name: [{ required: true, message: '请输入景点名称', trigger: 'blur' }],
  addressDetail: [{ required: true, message: '请输入详细地址', trigger: 'blur' }],
  status: [{ required: true, message: '请选择景点状态', trigger: 'change' }],
  longitude: [{ validator: rangeValidator(-180, 180, '经度'), trigger: 'blur' }],
  latitude: [{ validator: rangeValidator(-90, 90, '纬度'), trigger: 'blur' }]
}

const resetFormState = () => {
  Object.assign(formState, createDefaultFormState())
}

const resetPoiState = () => {
  poiState.selectedUid = ''
  poiOptions.value = []
}

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

const isCategoryObject = (
  category: AttractionCategorySummary | string | null | undefined
): category is AttractionCategorySummary => Boolean(category) && typeof category === 'object'

const getCategoryName = (category: AttractionCategorySummary | string | null | undefined) => {
  if (typeof category === 'string') {
    return category || '--'
  }

  if (isCategoryObject(category)) {
    return category.name || category.code || '--'
  }

  return '--'
}

const getCategoryCode = (category: AttractionCategorySummary | string | null | undefined) =>
  isCategoryObject(category) ? category.code || '--' : '--'

const getCategoryId = (category: AttractionCategorySummary | string | null | undefined) =>
  isCategoryObject(category) && category.id ? String(category.id) : ''

const mergeCategoryOptions = (items: AttractionCategoryListItem[]) => {
  const map = new Map(categoryOptions.value.map((item) => [item.id, item]))
  items.forEach((item) => map.set(item.id, item))
  categoryOptions.value = Array.from(map.values())
}

const ensureCategoryOption = (category: AttractionCategorySummary | string | null | undefined) => {
  if (!isCategoryObject(category) || !category.id) {
    return
  }

  if (categoryOptions.value.some((item) => item.id === String(category.id))) {
    return
  }

  mergeCategoryOptions([
    {
      id: String(category.id),
      name: category.name || category.code || String(category.id),
      code: category.code || '',
      sortOrder: 0,
      status: 1,
      createdAt: '',
      updatedAt: '',
      attractionCount: 0
    }
  ])
}

const getStatusTagType = (status: number) => (Number(status) === 1 ? 'success' : 'info')
const isAttractionOnline = (status: number) => Number(status) === 1
const getNextStatus = (status: number) => (isAttractionOnline(status) ? 0 : 1)

const normalizeOptionalText = (value: string) => {
  const trimmed = value.trim()
  return trimmed || undefined
}

const buildPayload = (): AttractionPayload => ({
  categoryId: formState.categoryId,
  name: formState.name.trim(),
  summary: normalizeOptionalText(formState.summary),
  description: normalizeOptionalText(formState.description),
  coverUrl: normalizeOptionalText(formState.coverUrl),
  locationText: normalizeOptionalText(formState.locationText),
  addressDetail: formState.addressDetail.trim(),
  telephone: normalizeOptionalText(formState.telephone),
  openingHours: normalizeOptionalText(formState.openingHours),
  baiduUid: normalizeOptionalText(formState.baiduUid),
  sourceSyncedAt: normalizeOptionalText(formState.sourceSyncedAt),
  longitude: formState.longitude,
  latitude: formState.latitude,
  status: formState.status
})

const applyPoiFillResult = async (uid: string) => {
  poiFillLoading.value = true

  try {
    const result = await fillAttractionPoiApi(uid)
    formState.name = result.name ?? ''
    formState.locationText = result.locationText ?? ''
    formState.addressDetail = result.addressDetail ?? ''
    formState.telephone = result.telephone ?? ''
    formState.openingHours = result.openingHours ?? ''
    formState.baiduUid = result.baiduUid ?? ''
    formState.sourceSyncedAt = result.sourceSyncedAt ?? ''
    formState.longitude = result.longitude ?? undefined
    formState.latitude = result.latitude ?? undefined
    ElMessage.success('百度地点信息已回填到表单')
  } catch (error) {
    showRequestError(error, '百度地点回填失败')
  } finally {
    poiFillLoading.value = false
  }
}

const loadData = async () => {
  syncCreatedRangeToQuery()
  loading.value = true

  try {
    pageData.value = normalizePageResult(
      await getAttractionPageApi({
        ...queryState,
        keyword: queryState.keyword.trim()
      }),
      {
        pageNum: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        total: 0,
        pages: 1
      }
    )
    queryState.pageNum = pageData.value.pageNum
    queryState.pageSize = pageData.value.pageSize
  } catch (error) {
    showRequestError(error, '景点列表加载失败')
  } finally {
    loading.value = false
  }
}

const loadCategoryOptions = async (keyword = '') => {
  categoryLoading.value = true

  try {
    const normalizedKeyword = keyword.trim()
    let pageNum = 1
    let pages = 1
    const items: AttractionCategoryListItem[] = []

    while (pageNum <= pages) {
      const response = normalizePageResult(
        await getAttractionCategoryPageApi({
          pageNum,
          pageSize: MAX_PAGE_SIZE,
          keyword: normalizedKeyword,
          status: undefined
        }),
        {
          pageNum: 1,
          pageSize: MAX_PAGE_SIZE,
          total: 0,
          pages: 1
        }
      )

      items.push(...response.list)
      pages = Math.max(response.pages, 1)
      pageNum += 1
    }

    mergeCategoryOptions(items)
  } catch (error) {
    showRequestError(error, '景点分类选项加载失败')
  } finally {
    categoryLoading.value = false
  }
}

const handleSearch = () => {
  queryState.pageNum = 1
  void loadData()
}

const handleReset = () => {
  queryState.keyword = ''
  queryState.categoryId = undefined
  queryState.status = undefined
  queryState.pageNum = 1
  queryState.pageSize = DEFAULT_PAGE_SIZE
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
  queryState.pageSize = Math.min(pageSize, MAX_PAGE_SIZE)
  queryState.pageNum = 1
  void loadData()
}

const openDetail = async (id: string) => {
  detailVisible.value = true
  detailLoading.value = true

  try {
    detailData.value = await getAttractionDetailApi(id)
    ensureCategoryOption(detailData.value.category)
  } catch (error) {
    showRequestError(error, '景点详情加载失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

const handleViewDetail = (row: AttractionListItem) => {
  void openDetail(row.id)
}

const openCreateDialog = async () => {
  dialogMode.value = 'create'
  resetFormState()
  resetPoiState()
  formVisible.value = true

  if (categoryOptions.value.length === 0) {
    await loadCategoryOptions()
  }
}

const openEditDialog = async (row: AttractionListItem) => {
  dialogMode.value = 'edit'
  resetFormState()
  resetPoiState()
  formVisible.value = true
  formLoading.value = true

  try {
    if (categoryOptions.value.length === 0) {
      await loadCategoryOptions()
    }

    const detail = await getAttractionDetailApi(row.id)
    const categoryId = getCategoryId(detail.category) || getCategoryId(row.category)

    if (!categoryId) {
      ElMessage.error('景点详情未返回分类 ID，无法回填编辑表单')
      formVisible.value = false
      return
    }

    ensureCategoryOption(detail.category)
    Object.assign(formState, {
      id: detail.id,
      categoryId,
      name: detail.name || '',
      summary: detail.summary || '',
      description: detail.description || '',
      coverUrl: detail.coverUrl || '',
      locationText: detail.locationText || '',
      addressDetail: detail.addressDetail || '',
      telephone: detail.telephone || '',
      openingHours: detail.openingHours || '',
      baiduUid: detail.baiduUid || '',
      sourceSyncedAt: detail.sourceSyncedAt || '',
      longitude: detail.longitude ?? undefined,
      latitude: detail.latitude ?? undefined,
      status: Number(detail.status)
    })
  } catch (error) {
    showRequestError(error, '景点详情加载失败，无法编辑')
    formVisible.value = false
  } finally {
    formLoading.value = false
  }
}

const handleDialogClosed = () => {
  resetFormState()
  resetPoiState()
  formLoading.value = false
  formRef.value?.clearValidate()
}

const handlePoiRemoteSearch = async (keyword: string) => {
  const normalizedKeyword = keyword.trim()

  if (!normalizedKeyword) {
    poiOptions.value = []
    return
  }

  poiSearchLoading.value = true

  try {
    poiOptions.value = await searchAttractionPoiApi({ keyword: normalizedKeyword })
  } catch (error) {
    showRequestError(error, '百度地点搜索失败')
  } finally {
    poiSearchLoading.value = false
  }
}

const handleFillPoi = () => {
  if (!poiState.selectedUid) {
    ElMessage.warning('请先选择一个百度地点')
    return
  }

  void applyPoiFillResult(poiState.selectedUid)
}

const handleSubmitForm = async () => {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  submitLoading.value = true

  try {
    const payload = buildPayload()

    if (dialogMode.value === 'create') {
      await createAttractionApi(payload)
      queryState.pageNum = 1
      ElMessage.success('景点创建成功')
    } else {
      await updateAttractionApi(formState.id, payload)
      ElMessage.success('景点更新成功')

      if (detailData.value?.id === formState.id) {
        detailData.value = await getAttractionDetailApi(formState.id)
      }
    }

    formVisible.value = false
    await loadData()
  } catch (error) {
    showRequestError(error, dialogMode.value === 'create' ? '景点创建失败' : '景点更新失败')
  } finally {
    submitLoading.value = false
  }
}

const handleToggleStatus = async (row: AttractionListItem) => {
  const nextStatus = getNextStatus(row.status)
  const actionText = nextStatus === 1 ? '上架' : '下架'
  const nextStatusLabel = metaStore.getLabel('attractionStatuses', nextStatus, String(nextStatus))

  try {
    await ElMessageBox.confirm(`确认${actionText}景点“${row.name}”吗？`, `${actionText}景点`, {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }

  updatingStatusId.value = row.id

  try {
    await updateAttractionStatusApi(row.id, { status: nextStatus })

    if (detailData.value?.id === row.id) {
      detailData.value.status = nextStatus
    }

    await loadData()
    ElMessage.success(`景点已${nextStatusLabel}`)
  } catch (error) {
    showRequestError(error, `景点${actionText}失败`)
  } finally {
    updatingStatusId.value = ''
  }
}

void loadData()
void loadCategoryOptions()
</script>

<template>
  <section>
    <div class="page-header">
      <h1 class="page-title">景点管理</h1>
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
            placeholder="名称 / 摘要 / 地点文本 / 详细地址"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="景点分类">
          <el-select
            v-model="queryState.categoryId"
            :disabled="loading"
            :loading="categoryLoading"
            clearable
            filterable
            placeholder="全部分类"
            style="width: 220px"
          >
            <el-option
              v-for="item in categoryOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select
            v-model="queryState.status"
            :disabled="loading"
            clearable
            placeholder="全部状态"
            style="width: 150px"
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
          共 <span class="table-summary-value">{{ pageData.total }}</span> 个景点
        </div>

        <el-button type="primary" @click="openCreateDialog">新增景点</el-button>
      </div>

      <el-table :data="pageData.list" :loading="loading" row-key="id" empty-text="暂无景点数据">
        <el-table-column label="封面" width="120" align="center">
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

        <el-table-column label="景点信息" min-width="280">
          <template #default="{ row }">
            <div class="attraction-content">
              <div class="attraction-title-row">
                <div class="attraction-name">{{ row.name || '--' }}</div>
                <el-tag effect="plain">{{ getCategoryName(row.category) }}</el-tag>
              </div>
              <div class="attraction-summary">{{ row.summary || '暂无摘要' }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="地点信息" min-width="260">
          <template #default="{ row }">
            <div class="location-line">{{ row.locationText || '--' }}</div>
            <div class="location-subline">{{ row.addressDetail || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="电话 / 开放时间" min-width="180">
          <template #default="{ row }">
            <div class="location-line">{{ row.telephone || '--' }}</div>
            <div class="location-subline">{{ row.openingHours || '--' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" effect="light">
              {{ metaStore.getLabel('attractionStatuses', row.status, String(row.status)) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="浏览量" width="100" align="center">
          <template #default="{ row }">
            {{ row.viewCount ?? 0 }}
          </template>
        </el-table-column>

        <el-table-column label="百度同步时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.sourceSyncedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="更新时间" width="180" align="center">
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" width="250" align="center">
          <template #default="{ row }">
            <div class="operation-actions">
              <el-button link type="primary" @click="handleViewDetail(row)">详情</el-button>
              <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>
              <el-button
                link
                :loading="updatingStatusId === row.id"
                :type="isAttractionOnline(row.status) ? 'danger' : 'success'"
                @click="handleToggleStatus(row)"
              >
                {{ isAttractionOnline(row.status) ? '下架' : '上架' }}
              </el-button>
            </div>
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
      size="760px"
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
                <span class="detail-name">{{ detailData.name || '--' }}</span>
                <el-tag :type="getStatusTagType(detailData.status)" effect="light">
                  {{
                    metaStore.getLabel(
                      'attractionStatuses',
                      detailData.status,
                      String(detailData.status)
                    )
                  }}
                </el-tag>
                <el-tag effect="plain">{{ getCategoryName(detailData.category) }}</el-tag>
              </div>

              <div class="detail-subline">{{ detailData.summary || '暂无摘要' }}</div>

              <div class="tag-group detail-tag-group">
                <el-tag effect="plain">分类编码：{{ getCategoryCode(detailData.category) }}</el-tag>
                <el-tag effect="plain">地点文本：{{ detailData.locationText || '--' }}</el-tag>
              </div>
            </div>
          </section>

          <div class="stats-grid">
            <article class="stat-card">
              <div class="stat-label">浏览量</div>
              <div class="stat-value">{{ detailData.viewCount ?? 0 }}</div>
            </article>
            <article class="stat-card">
              <div class="stat-label">经度</div>
              <div class="stat-value">{{ detailData.longitude ?? '--' }}</div>
            </article>
            <article class="stat-card">
              <div class="stat-label">纬度</div>
              <div class="stat-value">{{ detailData.latitude ?? '--' }}</div>
            </article>
          </div>

          <section class="detail-card">
            <div class="detail-card-title">基础信息</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="景点 ID">{{ detailData.id }}</el-descriptions-item>
              <el-descriptions-item label="百度 UID">
                {{ detailData.baiduUid || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="详细地址">
                {{ detailData.addressDetail || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="电话">
                {{ detailData.telephone || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="开放时间">
                {{ detailData.openingHours || '--' }}
              </el-descriptions-item>
              <el-descriptions-item label="百度同步时间">
                {{ formatDateTime(detailData.sourceSyncedAt) }}
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
            <div class="detail-card-title">详情描述</div>
            <div class="text-block">{{ detailData.description || '暂无详情描述' }}</div>
          </section>
        </template>
      </div>
    </el-drawer>

    <el-dialog
      v-model="formVisible"
      :title="dialogTitle"
      width="920px"
      destroy-on-close
      @closed="handleDialogClosed"
    >
      <div v-loading="formLoading">
        <section class="poi-panel">
          <div class="panel-title">百度地点辅助</div>
          <div class="poi-toolbar">
            <el-select
              v-model="poiState.selectedUid"
              clearable
              filterable
              remote
              reserve-keyword
              :loading="poiSearchLoading"
              popper-class="poi-select-dropdown"
              placeholder="输入地点名称后搜索百度地点"
              style="width: 100%"
              :remote-method="handlePoiRemoteSearch"
            >
              <el-option
                v-for="item in poiOptions"
                :key="item.uid"
                :label="item.name"
                :value="item.uid"
              >
                <div class="poi-dropdown-option">
                  <div class="poi-option-title">{{ item.name }}</div>
                  <div class="poi-option-grid">
                    <div class="poi-option-field">
                      <span class="poi-option-label">省份</span>
                      <span class="poi-option-value">{{ item.province || '--' }}</span>
                    </div>
                    <div class="poi-option-field">
                      <span class="poi-option-label">城市</span>
                      <span class="poi-option-value">{{ item.city || '--' }}</span>
                    </div>
                    <div class="poi-option-field poi-option-field-full">
                      <span class="poi-option-label">地址</span>
                      <span class="poi-option-value">{{ item.address || '--' }}</span>
                    </div>
                  </div>
                </div>
              </el-option>
            </el-select>
            <el-button
              :disabled="!poiState.selectedUid"
              :loading="poiFillLoading"
              type="primary"
              plain
              @click="handleFillPoi"
            >
              回填表单
            </el-button>
          </div>
        </section>

        <el-form ref="formRef" :model="formState" :rules="formRules" label-width="104px">
          <div class="form-grid">
            <el-form-item label="景点分类" prop="categoryId">
              <el-select
                v-model="formState.categoryId"
                :loading="categoryLoading"
                filterable
                placeholder="请选择景点分类"
              >
                <el-option
                  v-for="item in categoryOptions"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="景点状态" prop="status">
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
          </div>

          <div class="form-grid">
            <el-form-item label="景点名称" prop="name">
              <el-input v-model="formState.name" maxlength="100" placeholder="请输入景点名称" />
            </el-form-item>

            <el-form-item label="封面地址">
              <el-input
                v-model="formState.coverUrl"
                maxlength="500"
                placeholder="请输入封面图片 URL"
              />
            </el-form-item>
          </div>

          <el-form-item label="景点摘要">
            <el-input
              v-model="formState.summary"
              type="textarea"
              :rows="2"
              maxlength="255"
              show-word-limit
              placeholder="请输入景点摘要"
            />
          </el-form-item>

          <el-form-item label="详情描述">
            <el-input
              v-model="formState.description"
              type="textarea"
              :rows="5"
              placeholder="请输入景点详情描述"
            />
          </el-form-item>

          <div class="form-grid">
            <el-form-item label="地点文本">
              <el-input
                v-model="formState.locationText"
                maxlength="255"
                placeholder="请输入地点文本"
              />
            </el-form-item>

            <el-form-item label="详细地址" prop="addressDetail">
              <el-input
                v-model="formState.addressDetail"
                maxlength="255"
                placeholder="请输入详细地址"
              />
            </el-form-item>
          </div>

          <div class="form-grid form-grid-3">
            <el-form-item label="联系电话">
              <el-input
                v-model="formState.telephone"
                maxlength="255"
                placeholder="请输入联系电话"
              />
            </el-form-item>

            <el-form-item label="开放时间">
              <el-input
                v-model="formState.openingHours"
                maxlength="255"
                placeholder="请输入开放时间"
              />
            </el-form-item>

            <el-form-item label="百度 UID">
              <el-input v-model="formState.baiduUid" maxlength="64" placeholder="可由百度回填" />
            </el-form-item>
          </div>

          <div class="form-grid form-grid-3">
            <el-form-item label="同步时间">
              <el-input
                v-model="formState.sourceSyncedAt"
                maxlength="19"
                placeholder="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>

            <el-form-item label="经度" prop="longitude">
              <el-input-number
                v-model="formState.longitude"
                :precision="7"
                :step="0.0000001"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="纬度" prop="latitude">
              <el-input-number
                v-model="formState.latitude"
                :precision="7"
                :step="0.0000001"
                style="width: 100%"
              />
            </el-form-item>
          </div>
        </el-form>
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

.cover-image,
.detail-cover-image {
  display: block;
  width: 100%;
  height: 100%;
}

.cover-placeholder,
.detail-cover-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  line-height: 1.4;
  text-align: center;
}

.attraction-content,
.detail-hero-content {
  min-width: 0;
}

.attraction-title-row,
.detail-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.attraction-name,
.detail-name {
  font-size: var(--app-typo-title-lg-size);
  font-weight: var(--app-typo-title-lg-weight);
  line-height: var(--app-typo-title-lg-line-height);
  letter-spacing: var(--app-typo-title-lg-letter-spacing);
}

.attraction-summary,
.location-subline,
.detail-subline,
.poi-option-meta,
.poi-option-uid {
  margin-top: 6px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

.attraction-summary {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.location-line {
  color: var(--app-text-primary);
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.operation-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  vertical-align: middle;
}

.operation-actions :deep(.el-button + .el-button) {
  margin-left: 0;
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
  width: 200px;
  height: 144px;
  flex-shrink: 0;
  border: 1px solid var(--app-border);
  border-radius: 22px;
  background: rgba(15, 23, 42, 0.04);
}

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-tag-group {
  margin-top: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stat-card,
.detail-card,
.poi-panel {
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

.detail-card,
.poi-panel {
  margin-top: 16px;
  padding: 16px;
}

.detail-card-title,
.panel-title {
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
  white-space: pre-wrap;
  word-break: break-word;
}

.poi-panel {
  margin-bottom: 18px;
}

.poi-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.poi-dropdown-option {
  padding: 4px 0;
}

.poi-option-title {
  color: var(--app-text-primary);
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.poi-option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 12px;
  margin-top: 6px;
}

.poi-option-field {
  min-width: 0;
}

.poi-option-field-full {
  grid-column: 1 / -1;
}

.poi-option-label {
  display: inline-block;
  min-width: 32px;
  margin-right: 6px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-xs-size);
}

.poi-option-value {
  color: var(--app-text-primary);
  font-size: var(--app-typo-body-sm-size);
  line-height: var(--app-typo-body-sm-line-height);
  word-break: break-word;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.form-grid-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 1200px) {
  .stats-grid,
  .form-grid-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .table-toolbar,
  .detail-hero {
    flex-direction: column;
  }

  .poi-toolbar,
  .form-grid,
  .form-grid-3,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .detail-cover-box {
    width: 100%;
    height: 200px;
  }
}
</style>

<style lang="scss">
.poi-select-dropdown .el-select-dropdown__item {
  height: auto;
  padding-top: 10px;
  padding-bottom: 10px;
  line-height: 1.5;
  white-space: normal;
}

.poi-select-dropdown .poi-dropdown-option {
  width: 100%;
}
</style>
