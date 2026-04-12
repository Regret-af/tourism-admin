import { DEFAULT_ADMIN_PERMISSIONS, SUPER_ADMIN_ROLE } from '@/constants/permission'
import { ApiRequestError } from '@/types/api'
import type { AdminUser, LoginPayload, LoginResult } from '@/types/auth'

export const MOCK_LOGIN_CREDENTIALS = {
  email: 'admin@tourism.local',
  password: 'Admin123456'
}

const MOCK_TOKEN = 'mock-tourism-admin-token'

const mockAdminUser: AdminUser = {
  id: '9001',
  email: MOCK_LOGIN_CREDENTIALS.email,
  username: 'tourism_admin',
  nickname: '旅游运营管理员',
  avatarUrl: 'https://dummyimage.com/96x96/0f766e/ffffff&text=A',
  roles: [SUPER_ADMIN_ROLE],
  permissions: DEFAULT_ADMIN_PERMISSIONS,
  status: 1,
  bio: '用于后台骨架联调的本地 mock 管理员账号',
  createdAt: '2026-04-06 20:00:00'
}

const wait = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockLoginApi = async (payload: LoginPayload): Promise<LoginResult> => {
  await wait()

  if (
    payload.email !== MOCK_LOGIN_CREDENTIALS.email ||
    payload.password !== MOCK_LOGIN_CREDENTIALS.password
  ) {
    throw new ApiRequestError({
      kind: 'business',
      code: 42200,
      message: '账号或密码错误，请使用 mock 演示账号登录'
    })
  }

  return {
    accessToken: MOCK_TOKEN,
    tokenType: 'Bearer',
    expiresIn: 86400,
    user: mockAdminUser
  }
}

export const mockGetProfileApi = async (token: string): Promise<AdminUser> => {
  await wait(200)

  if (token !== MOCK_TOKEN) {
    throw new ApiRequestError({
      kind: 'business',
      code: 40100,
      message: 'mock token 已失效'
    })
  }

  return mockAdminUser
}

export const mockLogoutApi = async () => {
  await wait(120)
  return true
}
