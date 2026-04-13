import type { PageQuery } from '@/types/api'

export interface AttractionCategorySummary {
  id?: string
  name?: string
  code?: string
}

export interface AttractionListQuery extends PageQuery {
  keyword: string
  categoryId?: string
  status?: number
  createdStart?: string
  createdEnd?: string
}

export interface AttractionListItem {
  id: string
  name: string
  category?: AttractionCategorySummary | string | null
  summary?: string | null
  coverUrl?: string | null
  locationText?: string | null
  addressDetail?: string | null
  telephone?: string | null
  openingHours?: string | null
  status: number
  viewCount: number
  sourceSyncedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface AttractionDetail extends AttractionListItem {
  description?: string | null
  baiduUid?: string | null
  longitude?: number | null
  latitude?: number | null
}

export interface AttractionPayload {
  categoryId: string
  name: string
  summary?: string
  description?: string
  coverUrl?: string
  locationText?: string
  addressDetail: string
  telephone?: string
  openingHours?: string
  baiduUid?: string
  sourceSyncedAt?: string
  longitude?: number
  latitude?: number
  status: number
}

export interface UpdateAttractionStatusPayload {
  status: number
}

export interface AttractionPoiSearchQuery {
  keyword: string
}

export interface AttractionPoiSearchItem {
  uid: string
  name: string
  province?: string | null
  city?: string | null
  address?: string | null
}

export interface AttractionPoiFillResult {
  name?: string | null
  locationText?: string | null
  addressDetail?: string | null
  telephone?: string | null
  openingHours?: string | null
  baiduUid?: string | null
  sourceSyncedAt?: string | null
  longitude?: number | null
  latitude?: number | null
}
