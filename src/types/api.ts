export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  requestId?: string
  timestamp?: string
}

export interface PageResult<T> {
  pageNum: number
  pageSize: number
  total: number
  pages: number
  list: T[]
}

export interface PageQuery {
  pageNum: number
  pageSize: number
}

export type ApiRequestErrorKind = 'business' | 'http' | 'network'

interface ApiRequestErrorOptions {
  message: string
  code?: number
  status?: number
  requestId?: string
  timestamp?: string
  kind: ApiRequestErrorKind
  handledByRequest?: boolean
  cause?: unknown
}

export class ApiRequestError extends Error {
  code?: number
  status?: number
  requestId?: string
  timestamp?: string
  kind: ApiRequestErrorKind
  handledByRequest: boolean
  cause?: unknown

  constructor(options: ApiRequestErrorOptions) {
    super(options.message)
    this.name = 'ApiRequestError'
    this.code = options.code
    this.status = options.status
    this.requestId = options.requestId
    this.timestamp = options.timestamp
    this.kind = options.kind
    this.handledByRequest = Boolean(options.handledByRequest)
    this.cause = options.cause
  }
}

export const isApiRequestError = (error: unknown): error is ApiRequestError =>
  error instanceof ApiRequestError

export const getApiErrorMessage = (
  error: unknown,
  fallback = '请求失败，请稍后重试'
) => {
  if (isApiRequestError(error) && error.message) {
    return error.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
