export type DashboardRangeType = '7d' | '30d'

export interface DashboardRangeQuery {
  rangeType: DashboardRangeType
}

export interface DashboardTopDiariesQuery extends DashboardRangeQuery {
  limit: number
}

export interface DashboardOverview {
  userTotal: number
  userEnabledCount: number
  userDisabledCount: number
  attractionTotal: number
  attractionOnlineCount: number
  attractionOfflineCount: number
  diaryTotal: number
  diaryOnlineCount: number
  diaryOfflineCount: number
  diaryPendingReviewCount: number
  diaryRejectedCount: number
  diaryDeletedCount: number
}

export interface DashboardTrendPoint {
  date: string
  count: number
}

export interface DashboardTrends {
  newUsers: DashboardTrendPoint[]
  newDiaries: DashboardTrendPoint[]
}

export interface DashboardTopDiaryItem {
  diaryId: string
  title: string
  authorId?: string | null
  authorNickname?: string | null
  coverUrl?: string | null
  viewCount: number
  likeCount: number
  favoriteCount: number
  commentCount: number
}

export interface DashboardAttractionCategoryDistributionItem {
  categoryId?: string | null
  categoryName: string
  attractionCount: number
}

export interface DashboardOperationLogTrendItem {
  date: string
  count: number
}
