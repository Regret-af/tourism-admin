<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExampleDetailApi, saveExampleApi } from '@/api/example'
import { IS_MOCK_ENABLED } from '@/constants/app'
import { useMetaStore } from '@/stores/meta'
import { getApiErrorMessage } from '@/types/api'
import type { MetaOptionValue } from '@/types/meta'

interface ExampleFormState {
  id: string
  name: string
  category: string
  description: string
  status: MetaOptionValue | ''
}

const route = useRoute()
const router = useRouter()
const metaStore = useMetaStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const loadingDetail = ref(false)

const formState = reactive<ExampleFormState>({
  id: '',
  name: '',
  category: '景点推荐',
  description: '',
  status: ''
})

const isEdit = computed(() => Boolean(route.params.id))
const statusOptions = computed(() => metaStore.getOptions('userStatuses'))

watch(
  statusOptions,
  (options) => {
    if (!isEdit.value && (formState.status === '' || formState.status === undefined) && options.length > 0) {
      formState.status = options[0].value
    }
  },
  { immediate: true }
)

const rules: FormRules<ExampleFormState> = {
  name: [{ required: true, message: '请输入示例名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  description: [{ required: true, message: '请输入描述信息', trigger: 'blur' }]
}

const loadDetail = async () => {
  const id = route.params.id as string | undefined

  if (!id) {
    return
  }

  loadingDetail.value = true

  try {
    const detail = await getExampleDetailApi(id)
    Object.assign(formState, detail)
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    loadingDetail.value = false
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid || formState.status === '') {
    return
  }

  submitting.value = true

  try {
    await saveExampleApi({
      ...formState,
      status: formState.status,
      id: route.params.id as string | undefined
    })
    ElMessage.success(isEdit.value ? '示例更新成功' : '示例创建成功')
    await router.replace('/example/list')
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    submitting.value = false
  }
}

void loadDetail()
</script>

<template>
  <section>
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ isEdit ? '示例表单页 / 编辑' : '示例表单页 / 新建' }}</h1>
        <p class="page-subtitle">状态选项已接入全局元数据中心，提交时使用 value，展示时使用 label。</p>
      </div>
    </div>

    <el-alert
      class="replace-alert"
      type="warning"
      :closable="false"
      show-icon
      :title="
        IS_MOCK_ENABLED
          ? '当前保存逻辑写入本地 Mock 数据源，固定字典仍统一来自 /api/v1/admin/meta/options。'
          : '当前表单已切换到真实接口模式，请按业务接口完成字段映射。'
      "
    />

    <el-alert
      v-if="metaStore.errorMessage"
      class="replace-alert"
      type="warning"
      :closable="false"
      show-icon
      :title="metaStore.errorMessage"
    />

    <section class="page-card form-card" v-loading="loadingDetail">
      <el-form ref="formRef" label-width="100px" :model="formState" :rules="rules">
        <el-form-item label="示例名称" prop="name">
          <el-input v-model="formState.name" maxlength="50" show-word-limit />
        </el-form-item>

        <el-form-item label="所属分类" prop="category">
          <el-select v-model="formState.category" style="width: 220px">
            <el-option label="景点推荐" value="景点推荐" />
            <el-option label="内容运营" value="内容运营" />
            <el-option label="系统设置" value="系统设置" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formState.status">
            <el-radio
              v-for="option in statusOptions"
              :key="String(option.value)"
              :value="option.value"
            >
              {{ option.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="描述信息" prop="description">
          <el-input
            v-model="formState.description"
            type="textarea"
            :rows="5"
            maxlength="300"
            show-word-limit
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
          <el-button @click="router.back()">返回</el-button>
        </el-form-item>
      </el-form>
    </section>
  </section>
</template>

<style scoped lang="scss">
.replace-alert {
  margin-bottom: 18px;
}

.form-card {
  padding: 24px;
}
</style>
