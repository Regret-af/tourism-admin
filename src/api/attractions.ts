import { clampAdminPageSize, type PageResult } from '@/types/api'
import type {
  AttractionDetail,
  AttractionListItem,
  AttractionListQuery,
  AttractionPayload,
  AttractionPoiFillResult,
  AttractionPoiSearchItem,
  AttractionPoiSearchQuery,
  UpdateAttractionStatusPayload
} from '@/types/attraction'
import request from '@/utils/request'

export const getAttractionPageApi = (params: AttractionListQuery) => {
  const normalizedParams: AttractionListQuery = {
    ...params,
    pageSize: clampAdminPageSize(params.pageSize, 10)
  }

  return request.get<PageResult<AttractionListItem>>('/admin/attractions', {
    params: normalizedParams
  })
}

export const getAttractionDetailApi = (id: string) => {
  return request.get<AttractionDetail>(`/admin/attractions/${id}`)
}

export const createAttractionApi = (payload: AttractionPayload) => {
  return request.post<unknown, AttractionPayload>('/admin/attractions', payload)
}

export const updateAttractionApi = (id: string, payload: AttractionPayload) => {
  return request.put<unknown, AttractionPayload>(`/admin/attractions/${id}`, payload)
}

export const updateAttractionStatusApi = (
  id: string,
  payload: UpdateAttractionStatusPayload
) => {
  return request.patch<unknown, UpdateAttractionStatusPayload>(
    `/admin/attractions/${id}/status`,
    payload
  )
}

export const searchAttractionPoiApi = (params: AttractionPoiSearchQuery) => {
  return request.get<AttractionPoiSearchItem[]>('/admin/attractions/poi-search', {
    params
  })
}

export const fillAttractionPoiApi = (uid: string) => {
  return request.get<AttractionPoiFillResult>('/admin/attractions/poi-fill', {
    params: {
      uid
    }
  })
}
