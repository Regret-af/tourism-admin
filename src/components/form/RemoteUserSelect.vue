<script setup lang="ts">
import { computed } from 'vue'
import type { UserOptionItem } from '@/types/user'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    options: UserOptionItem[]
    loading?: boolean
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    modelValue: undefined,
    loading: false,
    disabled: false,
    placeholder: '搜索昵称 / 邮箱'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | undefined): void
  (e: 'search', keyword: string): void
}>()

const selectValue = computed({
  get: () => props.modelValue,
  set: (value?: string) => {
    emit('update:modelValue', value || undefined)
  }
})

const getUserOptionLabel = (option: UserOptionItem) => {
  const nickname = option.nickname || '--'
  const email = option.email || '--'
  return `${nickname}（${email}）`
}

const getUserOptionInitial = (option: UserOptionItem) => {
  const source = option.nickname || option.email || '?'
  return source.slice(0, 1).toUpperCase()
}

const handleSearch = (keyword: string) => {
  emit('search', keyword)
}
</script>

<template>
  <el-select
    v-model="selectValue"
    :disabled="disabled"
    :loading="loading"
    clearable
    filterable
    remote
    reserve-keyword
    :placeholder="placeholder"
    popper-class="remote-user-select-dropdown"
    :remote-method="handleSearch"
  >
    <el-option
      v-for="option in options"
      :key="option.id"
      :label="getUserOptionLabel(option)"
      :value="option.id"
    >
      <div class="remote-user-option">
        <el-avatar :size="32" :src="option.avatarUrl || undefined">
          {{ getUserOptionInitial(option) }}
        </el-avatar>
        <div class="remote-user-option-content">
          <div class="remote-user-option-title">
            {{ option.nickname || '--' }}
          </div>
          <div class="remote-user-option-meta">
            {{ option.email || '--' }}
          </div>
        </div>
      </div>
    </el-option>
  </el-select>
</template>

<style scoped lang="scss">
.remote-user-option {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  min-height: 44px;
}

.remote-user-option-content {
  min-width: 0;
  flex: 1;
}

.remote-user-option-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
}

.remote-user-option-meta {
  margin-top: 4px;
  overflow: hidden;
  color: var(--app-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

:global(.remote-user-select-dropdown .el-select-dropdown__item) {
  height: auto;
  padding-top: 8px;
  padding-bottom: 8px;
  line-height: normal;
}
</style>
