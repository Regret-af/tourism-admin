import type { PageResult } from '@/types/api'
import type {
  OperationLogDetail,
  OperationLogListItem,
  OperationLogListQuery
} from '@/types/operationLog'
import request from '@/utils/request'

export const getOperationLogPageApi = (params: OperationLogListQuery) => {
  return request.get<PageResult<OperationLogListItem>>(
    '/admin/operation-logs',
    {
      params
    }
  )
}

export const getOperationLogDetailApi = (id: string) => {
  return request.get<OperationLogDetail>(`/admin/operation-logs/${id}`)
}
