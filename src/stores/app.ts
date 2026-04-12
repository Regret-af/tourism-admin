import { defineStore } from 'pinia'

interface AppState {
  sidebarCollapsed: boolean
  theme: 'light'
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    sidebarCollapsed: false,
    theme: 'light'
  }),
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    }
  }
})
