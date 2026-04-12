import type { AdminMetaOptions } from '@/types/meta'
import request from '@/utils/request'

export const getAdminMetaOptionsApi = () => {
  return request.get<AdminMetaOptions>('/admin/meta/options')
}
