import { ElMessage } from 'element-plus'
import { defineStore } from 'pinia'
import { getAdminMetaOptionsApi } from '@/api/meta'
import { getApiErrorMessage } from '@/types/api'
import type { AdminMetaOptionKey, AdminMetaOptions, MetaOptionItem, MetaOptionValue } from '@/types/meta'

interface MetaState {
  dictionaries: Partial<AdminMetaOptions>
  loading: boolean
  loaded: boolean
  initialized: boolean
  errorMessage: string
}

let loadPromise: Promise<void> | null = null

export const useMetaStore = defineStore('meta', {
  state: (): MetaState => ({
    dictionaries: {},
    loading: false,
    loaded: false,
    initialized: false,
    errorMessage: ''
  }),
  actions: {
    reset() {
      this.dictionaries = {}
      this.loading = false
      this.loaded = false
      this.initialized = false
      this.errorMessage = ''
      loadPromise = null
    },
    async loadMeta(force = false) {
      if (this.loaded && !force) {
        return
      }

      if (loadPromise && !force) {
        return loadPromise
      }

      this.loading = true
      this.errorMessage = ''

      loadPromise = (async () => {
        try {
          const data = await getAdminMetaOptionsApi()
          this.dictionaries = data
          this.loaded = true
          this.initialized = true
        } catch (error) {
          this.loaded = false
          this.initialized = true
          this.errorMessage = getApiErrorMessage(error, '管理端基础字典加载失败')
          ElMessage.warning(this.errorMessage)
          throw error
        } finally {
          this.loading = false
          loadPromise = null
        }
      })()

      return loadPromise
    },
    async ensureLoaded() {
      if (this.loaded || this.loading || this.initialized) {
        return
      }

      try {
        await this.loadMeta()
      } catch {
        // 保持静默，页面通过 errorMessage 和空 options 做兜底。
      }
    },
    getOptions(key: AdminMetaOptionKey): MetaOptionItem[] {
      return this.dictionaries[key] ?? []
    },
    getLabel(
      key: AdminMetaOptionKey,
      value: MetaOptionValue | null | undefined,
      fallback = '--'
    ) {
      if (value === undefined || value === null || value === '') {
        return fallback
      }

      const matched = this.getOptions(key).find((item) => String(item.value) === String(value))
      return matched?.label ?? String(value)
    }
  }
})
