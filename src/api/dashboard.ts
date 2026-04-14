import type {
  DashboardAttractionCategoryDistributionItem,
  DashboardOperationLogTrendItem,
  DashboardOverview,
  DashboardRangeQuery,
  DashboardTopDiariesQuery,
  DashboardTopDiaryItem,
  DashboardTrendPoint,
  DashboardTrends
} from '@/types/dashboard'
import request from '@/utils/request'

const toSafeNumber = (value: unknown, fallback = 0) => {
  const normalizedValue =
    typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10)

  return Number.isFinite(normalizedValue) ? normalizedValue : fallback
}

const normalizeOverview = (overview: DashboardOverview): DashboardOverview => ({
  userTotal: toSafeNumber(overview.userTotal),
  userEnabledCount: toSafeNumber(overview.userEnabledCount),
  userDisabledCount: toSafeNumber(overview.userDisabledCount),
  attractionTotal: toSafeNumber(overview.attractionTotal),
  attractionOnlineCount: toSafeNumber(overview.attractionOnlineCount),
  attractionOfflineCount: toSafeNumber(overview.attractionOfflineCount),
  diaryTotal: toSafeNumber(overview.diaryTotal),
  diaryOnlineCount: toSafeNumber(overview.diaryOnlineCount),
  diaryOfflineCount: toSafeNumber(overview.diaryOfflineCount),
  diaryPendingReviewCount: toSafeNumber(overview.diaryPendingReviewCount),
  diaryRejectedCount: toSafeNumber(overview.diaryRejectedCount),
  diaryDeletedCount: toSafeNumber(overview.diaryDeletedCount)
})

const normalizeTrendPoint = (item: DashboardTrendPoint): DashboardTrendPoint => ({
  date: item?.date ?? '',
  count: toSafeNumber(item?.count)
})

const normalizeTopDiaryItem = (item: DashboardTopDiaryItem): DashboardTopDiaryItem => ({
  diaryId: String(item?.diaryId ?? ''),
  title: item?.title ?? '',
  authorId: item?.authorId ? String(item.authorId) : null,
  authorNickname: item?.authorNickname ?? '',
  coverUrl: item?.coverUrl ?? '',
  viewCount: toSafeNumber(item?.viewCount),
  likeCount: toSafeNumber(item?.likeCount),
  favoriteCount: toSafeNumber(item?.favoriteCount),
  commentCount: toSafeNumber(item?.commentCount)
})

const normalizeCategoryDistributionItem = (
  item: DashboardAttractionCategoryDistributionItem
): DashboardAttractionCategoryDistributionItem => ({
  categoryId: item?.categoryId ? String(item.categoryId) : null,
  categoryName: item?.categoryName ?? '',
  attractionCount: toSafeNumber(item?.attractionCount)
})

export const getDashboardOverviewApi = () => {
  return request
    .get<DashboardOverview>('/admin/dashboard/overview')
    .then(normalizeOverview)
}

export const getDashboardTrendsApi = (params: DashboardRangeQuery) => {
  return request.get<DashboardTrends>('/admin/dashboard/trends', { params }).then((result) => ({
    newUsers: Array.isArray(result?.newUsers) ? result.newUsers.map(normalizeTrendPoint) : [],
    newDiaries: Array.isArray(result?.newDiaries)
      ? result.newDiaries.map(normalizeTrendPoint)
      : []
  }))
}

export const getDashboardTopDiariesApi = (params: DashboardTopDiariesQuery) => {
  return request
    .get<DashboardTopDiaryItem[]>('/admin/dashboard/top-diaries', { params })
    .then((result) => (Array.isArray(result) ? result.map(normalizeTopDiaryItem) : []))
}

export const getDashboardAttractionCategoryDistributionApi = () => {
  return request
    .get<DashboardAttractionCategoryDistributionItem[]>(
      '/admin/dashboard/attraction-category-distribution'
    )
    .then((result) =>
      Array.isArray(result) ? result.map(normalizeCategoryDistributionItem) : []
    )
}

export const getDashboardOperationLogTrendsApi = (params: DashboardRangeQuery) => {
  return request
    .get<DashboardOperationLogTrendItem[]>('/admin/dashboard/operation-log-trends', {
      params
    })
    .then((result) => (Array.isArray(result) ? result.map(normalizeTrendPoint) : []))
}
