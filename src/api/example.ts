import { IS_MOCK_ENABLED } from '@/constants/app'
import {
  mockGetExampleDetailApi,
  mockGetExamplePageApi,
  mockSaveExampleApi
} from '@/mock/example'
import type { PageResult } from '@/types/api'
import type { ExampleFormPayload, ExampleItem, ExampleQuery } from '@/types/example'
import request from '@/utils/request'

export const getExamplePageApi = (params: ExampleQuery) => {
  if (IS_MOCK_ENABLED) {
    return mockGetExamplePageApi(params)
  }

  // TODO: 替换为后台管理端真实列表接口，例如 GET /admin/examples
  return request.get<PageResult<ExampleItem>>('/admin/examples', { params })
}

export const getExampleDetailApi = (id: string) => {
  if (IS_MOCK_ENABLED) {
    return mockGetExampleDetailApi(id)
  }

  // TODO: 替换为后台管理端真实详情接口
  return request.get<ExampleItem>(`/admin/examples/${id}`)
}

export const saveExampleApi = (payload: ExampleFormPayload) => {
  if (IS_MOCK_ENABLED) {
    return mockSaveExampleApi(payload)
  }

  // TODO: 替换为后台管理端真实新增/编辑接口
  return payload.id
    ? request.put<ExampleItem, ExampleFormPayload>(`/admin/examples/${payload.id}`, payload)
    : request.post<ExampleItem, ExampleFormPayload>('/admin/examples', payload)
}
