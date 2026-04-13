import type { PageQuery } from '@/types/api'

export interface DiaryCommentListQuery extends PageQuery {
  keyword: string
  diaryId?: string
  userId?: string
  status?: number
  createdStart?: string
  createdEnd?: string
}

export interface DiaryCommentListItem {
  id: string
  diaryId: string
  diaryTitle?: string | null
  userId: string
  userNickname?: string | null
  parentId?: string | null
  replyToUserId?: string | null
  content: string
  status: number
  createdAt: string
  updatedAt: string
}

export interface UpdateDiaryCommentStatusPayload {
  status: number
}
