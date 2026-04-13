import { clampAdminPageSize, type PageResult } from '@/types/api'
import type {
  OperationLogDetail,
  OperationLogListItem,
  OperationLogListQuery
} from '@/types/operationLog'
import request from '@/utils/request'

export const getOperationLogPageApi = (params: OperationLogListQuery) => {
  const normalizedParams: OperationLogListQuery = {
    ...params,
    pageSize: clampAdminPageSize(params.pageSize, 10)
  }

  return request.get<PageResult<OperationLogListItem>>(
    '/admin/operation-logs',
    {
      params: normalizedParams
    }
  )
}

export const getOperationLogDetailApi = (id: string) => {
  return request.get<OperationLogDetail>(`/admin/operation-logs/${id}`)
}
