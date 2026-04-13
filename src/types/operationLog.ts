import type { PageQuery } from '@/types/api'

export interface OperationLogListQuery extends PageQuery {
  userId?: string
  module?: string
  action?: string
  source?: string
  requestIp: string
  createdStart?: string
  createdEnd?: string
}

export interface OperationLogListItem {
  id: string
  userId?: string | null
  userNickname?: string | null
  module: string
  action: string
  bizId?: string | null
  description: string
  source: string
  requestIp?: string | null
  createdAt: string
}

export interface OperationLogDetail extends OperationLogListItem {
  userAgent?: string | null
}
