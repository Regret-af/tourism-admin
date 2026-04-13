<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getExamplePageApi } from '@/api/example'
import { IS_MOCK_ENABLED } from '@/constants/app'
import { useMetaStore } from '@/stores/meta'
import { getApiErrorMessage, normalizePageResult, type PageResult } from '@/types/api'
import type { ExampleItem, ExampleQuery } from '@/types/example'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const metaStore = useMetaStore()
const loading = ref(false)
const pageData = ref<PageResult<ExampleItem>>({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  pages: 1,
  list: []
})

const queryState = reactive<ExampleQuery>({
  pageNum: 1,
  pageSize: 10,
  keyword: '',
  status: undefined
})

const statusOptions = computed(() => metaStore.getOptions('userStatuses'))

const loadData = async () => {
  loading.value = true

  try {
    pageData.value = normalizePageResult(await getExamplePageApi({ ...queryState }))
    queryState.pageNum = pageData.value.pageNum
    queryState.pageSize = pageData.value.pageSize
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
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
  void loadData()
}

const handlePageChange = (pageNum: number) => {
  queryState.pageNum = pageNum
  void loadData()
}

const goCreate = () => {
  void router.push('/example/form')
}

const goEdit = (row: ExampleItem) => {
  void router.push(`/example/form/${row.id}`)
}

void loadData()
</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">示例列表页</h1>
        <p class="page-subtitle">
          当前示例页已接入全局元数据中心，状态筛选与状态展示不再硬编码 label。
        </p>
      </div>

      <el-button v-permission="'demo:create'" type="primary" @click="goCreate">新增示例</el-button>
    </div>

    <el-alert
      class="replace-alert"
      type="info"
      :closable="false"
      show-icon
      :title="
        IS_MOCK_ENABLED
          ? '当前列表数据来自本地 Mock，固定字典仍统一来自 /api/v1/admin/meta/options。'
          : '当前已切换到真实接口模式，固定字典统一走全局元数据中心。'
      "
    />

    <el-alert
      v-if="metaStore.errorMessage"
      class="replace-alert"
      type="warning"
      :closable="false"
      show-icon
      :title="metaStore.errorMessage"
      description="筛选项为空时不会使用本地硬编码字典替代后端结果。"
    />

    <section class="page-card filter-card">
      <el-form :inline="true" :model="queryState">
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            clearable
            placeholder="名称 / 描述"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="queryState.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option
              v-for="option in statusOptions"
              :key="String(option.value)"
              :value="option.value"
              :label="option.label"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </section>

    <section class="page-card table-card">
      <el-table :data="pageData.list" :loading="loading">
        <el-table-column prop="id" label="ID" min-width="120" />
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column prop="category" label="分类" min-width="140" />
        <el-table-column label="状态" min-width="140">
          <template #default="{ row }">
            <el-tag effect="plain">
              {{ metaStore.getLabel('userStatuses', row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" min-width="260" show-overflow-tooltip />
        <el-table-column label="创建时间" min-width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" min-width="120">
          <template #default="{ row }">
            <el-button v-permission="'demo:edit'" link type="primary" @click="goEdit(row)">
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :current-page="pageData.pageNum"
          :page-size="pageData.pageSize"
          :total="pageData.total"
          @current-change="handlePageChange"
        />
      </div>
    </section>
  </section>
</template>

<style scoped lang="scss">
.replace-alert {
  margin-bottom: 18px;
}

.filter-card,
.table-card {
  padding: 18px 20px;
}

.table-card {
  margin-top: 18px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}
</style>
