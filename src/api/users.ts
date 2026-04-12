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

export const getUserPageApi = (params: UserListQuery) => {
  return request.get<PageResult<UserListItem>>('/admin/users', { params })
}

export const getUserDetailApi = (userId: string) => {
  return request.get<UserDetail>(`/admin/users/${userId}`)
}

export const updateUserStatusApi = (userId: string, payload: UpdateUserStatusPayload) => {
  return request.patch<boolean, UpdateUserStatusPayload>(`/admin/users/${userId}/status`, payload)
}

export const getUserOptionsApi = (params?: UserOptionQuery) => {
  return request.get<UserOptionItem[]>('/admin/users/options', { params })
}
