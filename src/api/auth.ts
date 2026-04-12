import { IS_MOCK_ENABLED } from '@/constants/app'
import { mockGetProfileApi, mockLoginApi, mockLogoutApi } from '@/mock/auth'
import type { AdminUser, LoginPayload, LoginResult } from '@/types/auth'
import request from '@/utils/request'
import { getToken } from '@/utils/auth'

export const loginApi = (payload: LoginPayload) => {
  if (IS_MOCK_ENABLED) {
    return mockLoginApi(payload)
  }

  // TODO: 替换为后台管理端真实登录接口，例如 /admin/auth/login
  return request.post<LoginResult, LoginPayload>('/auth/login', payload, {
    skipAuth: true
  })
}

export const getProfileApi = () => {
  if (IS_MOCK_ENABLED) {
    return mockGetProfileApi(getToken())
  }

  // TODO: 替换为后台管理端真实当前管理员信息接口，例如 /admin/users/me
  return request.get<AdminUser>('/users/me')
}

export const logoutApi = () => {
  if (IS_MOCK_ENABLED) {
    return mockLogoutApi()
  }

  // TODO: 当前后端文档未提供后台登出接口，接入时可改为真实登出 API
  return Promise.resolve(true)
}
