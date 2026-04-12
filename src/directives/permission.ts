import type { App, DirectiveBinding } from 'vue'
import { usePermissionStore } from '@/stores/permission'

const toggleVisibility = (el: HTMLElement, binding: DirectiveBinding<string | string[]>) => {
  const permissionStore = usePermissionStore()
  const targetPermissions = binding.value

  if (!targetPermissions) {
    return
  }

  const allow = permissionStore.hasAnyPermission(targetPermissions)

  if (!allow) {
    el.parentNode?.removeChild(el)
  }
}

export const setupPermissionDirective = (app: App) => {
  app.directive('permission', {
    mounted(el, binding) {
      toggleVisibility(el, binding)
    }
  })
}
