import { clampAdminPageSize, type PageResult } from '@/types/api'
import type {
  DiaryDetail,
  DiaryListItem,
  DiaryListQuery,
  UpdateDiaryDeletedStatusPayload,
  UpdateDiaryStatusPayload
} from '@/types/diary'
import request from '@/utils/request'

export const getDiaryPageApi = (params: DiaryListQuery) => {
  const normalizedParams: DiaryListQuery = {
    ...params,
    pageSize: clampAdminPageSize(params.pageSize, 10)
  }

  return request.get<PageResult<DiaryListItem>>('/admin/travel-diaries', {
    params: normalizedParams
  })
}

export const getDiaryDetailApi = (id: string) => {
  return request.get<DiaryDetail>(`/admin/travel-diaries/${id}`)
}

export const updateDiaryStatusApi = (
  id: string,
  payload: UpdateDiaryStatusPayload
) => {
  return request.patch<unknown, UpdateDiaryStatusPayload>(
    `/admin/travel-diaries/${id}/status`,
    payload
  )
}

export const updateDiaryDeletedStatusApi = (
  id: string,
  payload: UpdateDiaryDeletedStatusPayload
) => {
  return request.patch<unknown, UpdateDiaryDeletedStatusPayload>(
    `/admin/travel-diaries/${id}/deleted`,
    payload
  )
}
