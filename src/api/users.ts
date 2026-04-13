import type { PageResult } from '@/types/api'
import type {
  UpdateUserStatusPayload,
  UserDetail,
  UserListItem,
  UserListQuery,
  UserOptionItem,
  UserOptionQuery
} from '@/types/user'
import request from '@/utils/request'

const USER_PAGE_SIZE_MAX = 50

const toNumber = (value: unknown, fallback = 0) => {
  const normalized = Number(value)
  return Number.isFinite(normalized) ? normalized : fallback
}

const clampPageSize = (value: unknown, fallback = 10) => {
  const normalized = toNumber(value, fallback)
  return Math.min(Math.max(normalized, 1), USER_PAGE_SIZE_MAX)
}

const normalizeUserListItem = (item: UserListItem): UserListItem => ({
  ...item,
  status: toNumber(item.status),
  roles: Array.isArray(item.roles) ? item.roles : []
})

const normalizeUserDetail = (detail: UserDetail): UserDetail => ({
  ...normalizeUserListItem(detail),
  diaryCount: toNumber(detail.diaryCount),
  commentCount: toNumber(detail.commentCount),
  uploadCount: toNumber(detail.uploadCount)
})

const normalizeUserPage = (page: PageResult<UserListItem>): PageResult<UserListItem> => ({
  pageNum: toNumber(page.pageNum, 1),
  pageSize: clampPageSize(page.pageSize, 10),
  total: toNumber(page.total, 0),
  pages: toNumber(page.pages, 1),
  list: Array.isArray(page.list) ? page.list.map(normalizeUserListItem) : []
})

export const getUserPageApi = (params: UserListQuery) => {
  const normalizedParams: UserListQuery = {
    ...params,
    pageSize: clampPageSize(params.pageSize, 10)
  }

  return request
    .get<PageResult<UserListItem>>('/admin/users', { params: normalizedParams })
    .then(normalizeUserPage)
}

export const getUserDetailApi = (userId: string) => {
  return request.get<UserDetail>(`/admin/users/${userId}`).then(normalizeUserDetail)
}

export const updateUserStatusApi = (userId: string, payload: UpdateUserStatusPayload) => {
  return request.patch<boolean, UpdateUserStatusPayload>(`/admin/users/${userId}/status`, payload)
}

export const getUserOptionsApi = (params?: UserOptionQuery) => {
  return request.get<UserOptionItem[]>('/admin/users/options', { params })
}
