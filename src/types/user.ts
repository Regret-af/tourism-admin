import type { PageQuery } from '@/types/api'

export interface UserListQuery extends PageQuery {
  keyword: string
  status?: number
  roleCode?: string
  createdStart?: string
  createdEnd?: string
}

export interface UserListItem {
  id: string
  email: string
  username: string
  nickname: string
  avatarUrl?: string | null
  bio?: string | null
  status: number
  roles: string[]
  createdAt: string
  updatedAt: string
}

export interface UserDetail extends UserListItem {
  diaryCount: number
  commentCount: number
  uploadCount: number
}

export interface UserOptionQuery {
  keyword?: string
  pageSize?: number
}

export interface UserOptionItem {
  id: string
  nickname: string
  email: string
  avatarUrl?: string | null
}

export interface UpdateUserStatusPayload {
  status: number
}
