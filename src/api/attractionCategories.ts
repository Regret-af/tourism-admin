import { clampAdminPageSize, type PageResult } from '@/types/api'
import type {
  AttractionCategoryDetail,
  AttractionCategoryListItem,
  AttractionCategoryListQuery,
  CreateAttractionCategoryPayload,
  UpdateAttractionCategoryPayload,
  UpdateAttractionCategorySortOrderPayload,
  UpdateAttractionCategoryStatusPayload
} from '@/types/attractionCategory'
import request from '@/utils/request'

export const getAttractionCategoryPageApi = (params: AttractionCategoryListQuery) => {
  const normalizedParams: AttractionCategoryListQuery = {
    ...params,
    pageSize: clampAdminPageSize(params.pageSize, 10)
  }

  return request.get<PageResult<AttractionCategoryListItem>>('/admin/attraction-categories', {
    params: normalizedParams
  })
}

export const getAttractionCategoryDetailApi = (id: string) => {
  return request.get<AttractionCategoryDetail>(`/admin/attraction-categories/${id}`)
}

export const createAttractionCategoryApi = (payload: CreateAttractionCategoryPayload) => {
  return request.post<unknown, CreateAttractionCategoryPayload>('/admin/attraction-categories', payload)
}

export const updateAttractionCategoryApi = (
  id: string,
  payload: UpdateAttractionCategoryPayload
) => {
  return request.put<unknown, UpdateAttractionCategoryPayload>(
    `/admin/attraction-categories/${id}`,
    payload
  )
}

export const updateAttractionCategoryStatusApi = (
  id: string,
  payload: UpdateAttractionCategoryStatusPayload
) => {
  return request.patch<unknown, UpdateAttractionCategoryStatusPayload>(
    `/admin/attraction-categories/${id}/status`,
    payload
  )
}

export const updateAttractionCategorySortOrderApi = (
  id: string,
  payload: UpdateAttractionCategorySortOrderPayload
) => {
  return request.patch<unknown, UpdateAttractionCategorySortOrderPayload>(
    `/admin/attraction-categories/${id}/sort-order`,
    payload
  )
}
