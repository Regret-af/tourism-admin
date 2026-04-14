import type { AdminMetaOptionKey } from '@/types/meta'

export const ADMIN_META_DICTIONARY_LABELS: Record<AdminMetaOptionKey, string> = {
  operationLogModules: '操作日志模块',
  operationLogActions: '操作日志动作',
  operationLogSources: '操作日志来源',
  attractionCategoryStatuses: '景点分类状态',
  attractionStatuses: '景点状态',
  diaryStatuses: '日记状态',
  diaryDeletedStatuses: '日记逻辑删除状态',
  diaryVisibilities: '日记可见性',
  diaryTopStatuses: '日记置顶状态',
  diaryCommentStatuses: '评论状态',
  diaryContentTypes: '日记类型',
  userStatuses: '用户状态',
  roleCodes: '角色编码'
}

export const ADMIN_META_PRIORITY_KEYS: AdminMetaOptionKey[] = [
  'userStatuses',
  'roleCodes',
  'attractionCategoryStatuses',
  'attractionStatuses',
  'diaryStatuses',
  'diaryDeletedStatuses',
  'diaryVisibilities',
  'diaryTopStatuses',
  'diaryCommentStatuses',
  'diaryContentTypes',
  'operationLogModules',
  'operationLogActions',
  'operationLogSources'
]
