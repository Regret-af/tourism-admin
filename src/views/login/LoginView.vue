<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DEFAULT_HOME_PATH, IS_MOCK_ENABLED } from '@/constants/app'
import { MOCK_LOGIN_CREDENTIALS } from '@/mock/auth'
import { useAuthStore } from '@/stores/auth'
import { getApiErrorMessage } from '@/types/api'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const loading = ref(false)

const formState = reactive({
  email: MOCK_LOGIN_CREDENTIALS.email,
  password: MOCK_LOGIN_CREDENTIALS.password
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入登录邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)

  if (!valid) {
    return
  }

  loading.value = true

  try {
    await authStore.login(formState)
    ElMessage.success('登录成功')
    await router.replace((route.query.redirect as string) || DEFAULT_HOME_PATH)
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-intro">
      <div class="intro-badge">Tourism Admin Console</div>
      <h1>旅游后台管理端</h1>
      <p>
        当前阶段已完成基础骨架、权限占位、路由守卫、Token 持久化和示例模块，可直接作为独立工程继续扩展真实业务。
      </p>
      <ul>
        <li>技术栈：Vue 3 + TypeScript + Vite + Pinia + Element Plus</li>
        <li>接口策略：支持真实接口与本地 Mock 切换</li>
        <li>骨架范围：登录、首页、后台布局、404、示例列表、示例表单</li>
      </ul>
    </div>

    <div class="login-panel page-card">
      <div class="panel-header">
        <h2>账号登录</h2>
        <p>输入管理员账号进入控制台</p>
      </div>

      <el-alert
        v-if="IS_MOCK_ENABLED"
        type="success"
        :closable="false"
        title="当前为 Mock 模式，可直接使用预置演示账号登录。"
        show-icon
      />

      <el-form ref="formRef" class="login-form" :model="formState" :rules="rules" label-position="top">
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formState.email" placeholder="请输入管理员邮箱" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="formState.password"
            type="password"
            show-password
            placeholder="请输入登录密码"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-button class="submit-button" type="primary" :loading="loading" @click="handleLogin">
          进入后台
        </el-button>
      </el-form>

      <div v-if="IS_MOCK_ENABLED" class="mock-tip">
        演示账号：{{ MOCK_LOGIN_CREDENTIALS.email }} / {{ MOCK_LOGIN_CREDENTIALS.password }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  display: grid;
  grid-template-columns: minmax(320px, 1.1fr) minmax(360px, 460px);
  gap: 28px;
  min-height: 100vh;
  padding: 48px;
  background:
    radial-gradient(circle at 20% 15%, rgba(20, 184, 166, 0.2), transparent 22%),
    radial-gradient(circle at 80% 10%, rgba(245, 158, 11, 0.18), transparent 18%),
    linear-gradient(135deg, #f5faf5 0%, #eef4f0 45%, #e8f5f3 100%);
}

.login-intro {
  align-self: center;
  padding: 24px;
}

.intro-badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: var(--app-brand);
  font-size: 13px;
  font-weight: 700;
}

.login-intro h1 {
  margin: 20px 0 16px;
  font-size: 52px;
  line-height: 1.1;
}

.login-intro p,
.login-intro li {
  color: var(--app-text-secondary);
  font-size: 15px;
  line-height: 1.8;
}

.login-intro ul {
  margin: 22px 0 0;
  padding-left: 20px;
}

.login-panel {
  align-self: center;
  padding: 28px;
}

.panel-header h2 {
  margin: 0;
  font-size: 30px;
}

.panel-header p {
  margin: 10px 0 20px;
  color: var(--app-text-secondary);
}

.login-form {
  margin-top: 20px;
}

.submit-button {
  width: 100%;
  height: 44px;
  margin-top: 10px;
}

.mock-tip {
  margin-top: 18px;
  color: var(--app-text-secondary);
  font-size: 13px;
}

@media (max-width: 960px) {
  .login-page {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .login-intro {
    padding: 8px;
  }

  .login-intro h1 {
    font-size: 36px;
  }
}
</style>
