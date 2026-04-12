export type MetaOptionValue = string | number | boolean

export interface MetaOptionItem<V extends MetaOptionValue = MetaOptionValue> {
  value: V
  label: string
}

export interface AdminMetaOptions {
  operationLogModules: MetaOptionItem[]
  operationLogActions: MetaOptionItem[]
  operationLogSources: MetaOptionItem[]
  attractionCategoryStatuses: MetaOptionItem[]
  attractionStatuses: MetaOptionItem[]
  diaryStatuses: MetaOptionItem[]
  diaryDeletedStatuses: MetaOptionItem[]
  diaryVisibilities: MetaOptionItem[]
  diaryTopStatuses: MetaOptionItem[]
  diaryCommentStatuses: MetaOptionItem[]
  userStatuses: MetaOptionItem[]
  roleCodes: MetaOptionItem[]
}

export type AdminMetaOptionKey = keyof AdminMetaOptions
