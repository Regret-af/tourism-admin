<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="not-found-page page-card">
    <div class="code">404</div>
    <h1>页面不存在</h1>
    <p>当前访问的地址没有匹配到有效页面，请检查路由配置或返回首页继续操作。</p>
    <div class="actions">
      <el-button type="primary" @click="router.push('/dashboard')">返回首页</el-button>
      <el-button @click="router.back()">返回上一页</el-button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.not-found-page {
  display: grid;
  place-items: center;
  min-height: calc(100vh - 120px);
  padding: 40px;
  text-align: center;
}

.code {
  font-size: var(--app-typo-display-size);
  font-weight: var(--app-typo-display-weight);
  line-height: var(--app-typo-display-line-height);
  letter-spacing: var(--app-typo-display-letter-spacing);
  color: var(--app-brand);
}

h1 {
  margin: 0;
  font-size: var(--app-typo-headline-2-size);
  font-weight: var(--app-typo-headline-2-weight);
  line-height: var(--app-typo-headline-2-line-height);
  letter-spacing: var(--app-typo-headline-2-letter-spacing);
}

p {
  max-width: 480px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-md-size);
  font-weight: var(--app-typo-body-md-weight);
  line-height: var(--app-line-height-relaxed);
  letter-spacing: var(--app-typo-body-md-letter-spacing);
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}
</style>
