import type { PageQuery } from '@/types/api'

export interface DiaryAuthor {
  id: string
  nickname: string
}

export interface DiaryListQuery extends PageQuery {
  keyword: string
  authorId?: string
  status?: number
  contentType?: string
  visibility?: number
  isTop?: number
  isDeleted?: number
  publishedStart?: string
  publishedEnd?: string
}

export interface DiaryListItem {
  id: string
  title: string
  summary?: string | null
  coverUrl?: string | null
  author?: DiaryAuthor | null
  status: number
  isDeleted: number
  contentType?: string | number | null
  visibility: number
  isTop: number
  viewCount: number
  likeCount: number
  favoriteCount: number
  commentCount: number
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface DiaryDetail extends DiaryListItem {
  content?: string | null
}

export interface DiaryOptionQuery {
  keyword?: string
  authorId?: string
  pageSize?: number
}

export interface DiaryOptionItem {
  id: string
  title: string
  coverUrl?: string | null
  author?: DiaryAuthor | null
}

export interface UpdateDiaryStatusPayload {
  status: number
}

export interface UpdateDiaryDeletedStatusPayload {
  isDeleted: number
}
