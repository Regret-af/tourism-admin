import type { PageResult } from '@/types/api'
import type {
  DiaryCommentListItem,
  DiaryCommentListQuery,
  UpdateDiaryCommentStatusPayload
} from '@/types/comment'
import request from '@/utils/request'

export const getDiaryCommentPageApi = (params: DiaryCommentListQuery) => {
  return request.get<PageResult<DiaryCommentListItem>>('/admin/diary-comments', {
    params
  })
}

export const updateDiaryCommentStatusApi = (
  id: string,
  payload: UpdateDiaryCommentStatusPayload
) => {
  return request.patch<unknown, UpdateDiaryCommentStatusPayload>(
    `/admin/diary-comments/${id}/status`,
    payload
  )
}
