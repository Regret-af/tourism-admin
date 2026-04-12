<script setup lang="ts">
import {
  CircleCheckFilled,
  Compass,
  Hide,
  Lock,
  User,
  View
} from '@element-plus/icons-vue'
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
const rememberMe = ref(true)
const showPassword = ref(false)

const coverImageUrl =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuB4fyo7xjkPRVGCcL-oe5cKVvuRp19TcUd4523EQUQ1fOKw8DnAiPdNEjksRRsk1Q_Vp8D05n7Tl-tfhZxNa0Xc1vv-SNsLBwu0FINn9eUcuyMGipR7xeLMR3U8EE7Ho2auPW4bf0KKzJ3GC9cUnivY_eUhMv30t2W3iFvVMt_06Uv-NaLOrnngh1lJX121U17sNWgps63T5RzQ5roaipNyLLi9Cko1J3Izyltm354DQCwesCOLftEXn9ID9x87Kv-0FqKToyawl8wI'

const formState = reactive({
  email: MOCK_LOGIN_CREDENTIALS.email,
  password: MOCK_LOGIN_CREDENTIALS.password
})

const rules: FormRules = {
  email: [
    { required: true, message: '请输入管理员邮箱', trigger: 'blur' },
    {
      type: 'email',
      message: '请输入正确的邮箱格式',
      trigger: ['blur', 'change']
    }
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
    <div class="page-glow page-glow-left"></div>
    <div class="page-glow page-glow-right"></div>

    <div class="login-shell">
      <section class="editorial-panel">
        <img
          class="editorial-image"
          :src="coverImageUrl"
          alt="暖色海岸旅行风景"
        />
        <div class="editorial-overlay"></div>

        <div class="editorial-content">
          <div class="brand-mark">
            <div class="brand-icon">
              <el-icon><Compass /></el-icon>
            </div>
            <span class="brand-text">旅迹</span>
          </div>

          <div class="editorial-copy">
            <h2>发现世界，<br />记录每一刻温暖。</h2>
            <div class="copy-divider"></div>
          </div>
        </div>
      </section>

      <section class="login-panel">
        <div class="panel-header">
          <h1>旅迹后台管理系统</h1>
          <p>欢迎回来，请登录您的账号</p>
        </div>

        <el-form
          ref="formRef"
          class="login-form"
          :model="formState"
          :rules="rules"
          label-position="top"
          @submit.prevent
        >
          <el-form-item label="邮箱" prop="email" class="field-item">
            <el-input
              v-model.trim="formState.email"
              class="auth-input"
              placeholder="请输入管理员邮箱"
              autocomplete="username"
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon><User /></el-icon>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="密码" prop="password" class="field-item">
            <el-input
              v-model="formState.password"
              class="auth-input"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入您的密码"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            >
              <template #prefix>
                <el-icon><Lock /></el-icon>
              </template>
              <template #suffix>
                <button
                  type="button"
                  class="visibility-toggle"
                  :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                  @click="showPassword = !showPassword"
                >
                  <el-icon>
                    <View v-if="!showPassword" />
                    <Hide v-else />
                  </el-icon>
                </button>
              </template>
            </el-input>
          </el-form-item>

          <div class="form-row">
            <el-checkbox v-model="rememberMe" size="large">记住我</el-checkbox>
          </div>

          <el-button
            class="submit-button"
            :loading="loading"
            @click="handleLogin"
          >
            立即登录
          </el-button>
        </el-form>

        <div v-if="IS_MOCK_ENABLED" class="mock-card">
          <div class="mock-card-header">
            <el-icon><CircleCheckFilled /></el-icon>
            <span>当前为 Mock 模式</span>
          </div>
          <p>演示账号：{{ MOCK_LOGIN_CREDENTIALS.email }}</p>
          <p>演示密码：{{ MOCK_LOGIN_CREDENTIALS.password }}</p>
        </div>

        <div class="panel-footer">
          <div class="security-tip">
            <el-icon><CircleCheckFilled /></el-icon>
            <span>Secure Access Only</span>
          </div>

          <div class="footer-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  --login-primary: #8c7355;
  --login-primary-strong: #a68c6a;
  --login-secondary: #bd9e5f;
  --login-bg: #fffbf7;
  --login-surface: #ffffff;
  --login-panel-bg: #f8f1e6;
  --login-surface-soft: #fff9f2;
  --login-text: #1e1b16;
  --login-text-soft: #4d4639;
  --login-border: #cfc5b4;

  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  overflow: hidden;
  background: var(--login-bg);
  color: var(--login-text);
}

.page-glow {
  position: fixed;
  z-index: 0;
  border-radius: 999px;
  filter: blur(120px);
  pointer-events: none;
}

.page-glow-left {
  top: -10%;
  left: -5%;
  width: 40vw;
  height: 40vw;
  background: rgba(140, 115, 85, 0.12);
}

.page-glow-right {
  right: -5%;
  bottom: -10%;
  width: 30vw;
  height: 30vw;
  background: rgba(189, 158, 95, 0.12);
}

.login-shell {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(100%, 1200px);
  min-height: 870px;
  overflow: hidden;
  border-radius: 32px;
  background: var(--login-surface);
  box-shadow: 0 32px 80px rgba(30, 27, 22, 0.12);
}

.editorial-panel {
  position: relative;
  display: flex;
  flex: 1 1 45%;
  min-height: 870px;
  overflow: hidden;
}

.editorial-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1);
  transition: transform 0.7s ease;
}

.editorial-panel:hover .editorial-image {
  transform: scale(1.05);
}

.editorial-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      135deg,
      rgba(140, 115, 85, 0.32) 0%,
      rgba(140, 115, 85, 0.04) 52%
    ),
    linear-gradient(
      180deg,
      rgba(18, 14, 8, 0.12) 0%,
      rgba(18, 14, 8, 0.25) 100%
    );
  mix-blend-mode: multiply;
}

.editorial-content {
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
  flex-direction: column;
  justify-content: space-between;
  padding: 64px;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(14px);
  font-size: var(--app-font-size-xl);
}

.brand-text {
  color: #fff;
  font-size: var(--app-typo-title-lg-size);
  font-weight: var(--app-typo-title-lg-weight);
  line-height: var(--app-typo-title-lg-line-height);
  letter-spacing: var(--app-typo-overline-letter-spacing);
}

.editorial-copy {
  max-width: 280px;
}

.editorial-copy h2 {
  margin: 0;
  color: #fff;
  font-size: var(--app-typo-headline-1-size);
  font-weight: var(--app-typo-headline-1-weight);
  line-height: var(--app-typo-headline-1-line-height);
  letter-spacing: var(--app-typo-headline-1-letter-spacing);
}

.copy-divider {
  width: 48px;
  height: 4px;
  margin-top: 28px;
  border-radius: 999px;
  background: rgba(233, 226, 211, 0.95);
}

.login-panel {
  display: flex;
  flex: 1 1 55%;
  flex-direction: column;
  justify-content: center;
  padding: 56px 80px;
  background: var(--login-panel-bg);
}

.panel-header {
  margin-bottom: 40px;
}

.panel-header h1 {
  margin: 0 0 12px;
  font-size: var(--app-typo-headline-2-size);
  font-weight: var(--app-typo-headline-2-weight);
  line-height: var(--app-typo-headline-2-line-height);
  letter-spacing: var(--app-typo-headline-2-letter-spacing);
}

.panel-header p {
  margin: 0;
  color: var(--login-text-soft);
  font-size: var(--app-typo-body-md-size);
  font-weight: var(--app-typo-body-md-weight);
  line-height: var(--app-typo-body-md-line-height);
  letter-spacing: var(--app-typo-body-md-letter-spacing);
}

.login-form {
  width: 100%;
}

.field-item {
  margin-bottom: 24px;
}

.form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 0;
}

.visibility-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  color: rgba(77, 70, 57, 0.6);
  cursor: pointer;
  transition: color 0.2s ease;
}

.visibility-toggle:hover {
  color: var(--login-primary);
}

.submit-button {
  width: 100%;
  height: 58px;
  margin-top: 24px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(
    135deg,
    var(--login-primary) 0%,
    var(--login-primary-strong) 100%
  );
  color: #fff;
  font-size: var(--app-typo-title-md-size);
  font-weight: var(--app-typo-title-md-weight);
  line-height: var(--app-typo-title-md-line-height);
  letter-spacing: var(--app-typo-title-md-letter-spacing);
  box-shadow: 0 18px 28px rgba(166, 140, 106, 0.28);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.submit-button:hover {
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 22px 34px rgba(166, 140, 106, 0.34);
}

.submit-button:active {
  transform: scale(0.98);
}

.mock-card {
  margin-top: 28px;
  padding: 18px 20px;
  border: 1px solid rgba(140, 115, 85, 0.16);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.58);
  color: var(--login-text-soft);
}

.mock-card-header {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--login-primary);
  font-size: var(--app-typo-label-sm-size);
  font-weight: var(--app-typo-label-sm-weight);
  line-height: var(--app-typo-label-sm-line-height);
  letter-spacing: var(--app-typo-label-sm-letter-spacing);
}

.mock-card p {
  margin: 6px 0 0;
  font-size: var(--app-typo-body-xs-size);
  font-weight: var(--app-typo-body-xs-weight);
  line-height: var(--app-typo-body-xs-line-height);
  letter-spacing: var(--app-typo-body-xs-letter-spacing);
}

.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 44px;
  padding-top: 28px;
  border-top: 1px solid rgba(126, 118, 103, 0.24);
}

.security-tip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(77, 70, 57, 0.44);
  font-size: var(--app-typo-overline-size);
  font-weight: var(--app-typo-overline-weight);
  line-height: var(--app-typo-overline-line-height);
  letter-spacing: var(--app-typo-overline-letter-spacing);
  text-transform: uppercase;
}

.footer-dots {
  display: flex;
  gap: 16px;
}

.footer-dots span {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.footer-dots span:nth-child(1) {
  background: var(--login-secondary);
}

.footer-dots span:nth-child(2) {
  background: rgba(166, 140, 106, 0.4);
}

.footer-dots span:nth-child(3) {
  background: var(--login-border);
}

:deep(.login-form .el-form-item__label) {
  padding-bottom: 8px;
  color: var(--login-text-soft);
  font-size: var(--app-typo-overline-size);
  font-weight: var(--app-typo-overline-weight);
  line-height: var(--app-typo-overline-line-height);
  letter-spacing: var(--app-typo-overline-letter-spacing);
  text-transform: uppercase;
}

:deep(.auth-input .el-input__wrapper) {
  min-height: 58px;
  border-radius: 16px;
  background: var(--login-surface);
  box-shadow:
    inset 0 0 0 1px transparent,
    0 10px 20px rgba(30, 27, 22, 0.05);
  transition:
    box-shadow 0.3s ease,
    transform 0.3s ease;
}

:deep(.auth-input .el-input__wrapper.is-focus) {
  box-shadow:
    inset 0 -2px 0 var(--login-primary),
    0 14px 28px rgba(30, 27, 22, 0.08);
  transform: translateY(-1px);
}

:deep(.auth-input .el-input__inner) {
  color: var(--login-text);
  font-size: var(--app-typo-body-md-size);
  font-weight: var(--app-typo-body-md-weight);
  line-height: var(--app-typo-body-md-line-height);
  letter-spacing: var(--app-typo-body-md-letter-spacing);
}

:deep(.auth-input .el-input__inner::placeholder) {
  color: rgba(77, 70, 57, 0.34);
}

:deep(.auth-input .el-input__prefix),
:deep(.auth-input .el-input__suffix) {
  color: rgba(77, 70, 57, 0.52);
  font-size: var(--app-font-size-xl);
}

:deep(.login-form .el-form-item.is-error .el-input__wrapper) {
  box-shadow:
    inset 0 0 0 1px rgba(186, 26, 26, 0.38),
    0 10px 20px rgba(186, 26, 26, 0.08);
}

:deep(.login-form .el-form-item__error) {
  padding-top: 8px;
  font-size: var(--app-typo-body-xs-size);
  font-weight: var(--app-typo-body-xs-weight);
  line-height: var(--app-typo-body-xs-line-height);
  letter-spacing: var(--app-typo-body-xs-letter-spacing);
}

:deep(.form-row .el-checkbox) {
  --el-checkbox-checked-text-color: var(--login-text-soft);
  --el-checkbox-text-color: var(--login-text-soft);
  --el-checkbox-input-border-color: rgba(126, 118, 103, 0.6);
  --el-checkbox-checked-input-border-color: var(--login-primary);
  --el-checkbox-checked-bg-color: var(--login-primary);
  font-size: var(--app-typo-body-md-size);
  font-weight: var(--app-typo-body-md-weight);
  line-height: var(--app-typo-body-md-line-height);
  letter-spacing: var(--app-typo-body-md-letter-spacing);
}

@media (max-width: 1080px) {
  .login-shell {
    min-height: auto;
  }

  .login-panel {
    padding: 48px;
  }
}

@media (max-width: 960px) {
  .login-page {
    padding: 16px;
  }

  .login-shell {
    width: 100%;
    flex-direction: column;
    border-radius: 28px;
  }

  .editorial-panel {
    min-height: 320px;
  }

  .editorial-content {
    padding: 32px 28px;
  }

  .editorial-copy h2 {
    font-size: var(--app-typo-headline-2-size);
  }

  .login-panel {
    padding: 32px 24px;
  }

  .panel-header {
    margin-bottom: 28px;
  }

  .panel-header h1 {
    font-size: var(--app-typo-headline-3-size);
  }
}

@media (max-width: 640px) {
  .editorial-panel {
    display: none;
  }

  .login-panel {
    min-height: calc(100vh - 32px);
    padding: 28px 20px;
  }

  .panel-header h1 {
    font-size: var(--app-typo-headline-3-size);
  }

  .panel-footer {
    margin-top: 36px;
  }
}
</style>
