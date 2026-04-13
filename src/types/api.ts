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

export interface PageResultLike<T> {
  pageNum: number | string | null | undefined
  pageSize: number | string | null | undefined
  total: number | string | null | undefined
  pages: number | string | null | undefined
  list: T[] | null | undefined
}

export interface PageQuery {
  pageNum: number
  pageSize: number
}

export const ADMIN_PAGE_SIZE_MAX = 50

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

export const toSafeNumber = (value: unknown, fallback: number) => {
  const parsedValue =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)

  return Number.isFinite(parsedValue) ? parsedValue : fallback
}

export const clampAdminPageSize = (value: unknown, fallback = 10) => {
  const normalizedValue = toSafeNumber(value, fallback)
  return Math.min(Math.max(normalizedValue, 1), ADMIN_PAGE_SIZE_MAX)
}

export const normalizeAdminPageQuery = <T extends PageQuery>(params: T, fallback = 10): T => ({
  ...params,
  pageSize: clampAdminPageSize(params.pageSize, fallback)
})

export const normalizePageResult = <T>(
  result: PageResultLike<T>,
  defaults: Pick<PageResult<T>, 'pageNum' | 'pageSize' | 'total' | 'pages'> = {
    pageNum: 1,
    pageSize: 10,
    total: 0,
    pages: 1
  }
): PageResult<T> => ({
  pageNum: toSafeNumber(result.pageNum, defaults.pageNum),
  pageSize: clampAdminPageSize(result.pageSize, defaults.pageSize),
  total: toSafeNumber(result.total, defaults.total),
  pages: toSafeNumber(result.pages, defaults.pages),
  list: Array.isArray(result.list) ? result.list : []
})
