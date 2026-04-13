import type { PageQuery } from '@/types/api'

export interface AttractionCategoryListQuery extends PageQuery {
  keyword: string
  status?: number
}

export interface AttractionCategoryListItem {
  id: string
  name: string
  code: string
  sortOrder: number
  status: number
  createdAt: string
  updatedAt: string
  attractionCount: number
}

export type AttractionCategoryDetail = AttractionCategoryListItem

export interface CreateAttractionCategoryPayload {
  name: string
  code: string
  sortOrder: number
  status: number
}

export interface UpdateAttractionCategoryPayload {
  name: string
  code: string
}

export interface UpdateAttractionCategoryStatusPayload {
  status: number
}

export interface UpdateAttractionCategorySortOrderPayload {
  sortOrder: number
}
