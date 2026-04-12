import { useMetaStore } from '@/stores/meta'
import type { AdminMetaOptionKey, MetaOptionItem, MetaOptionValue } from '@/types/meta'

export const ensureAdminMetaLoaded = () => useMetaStore().ensureLoaded()

export const getAdminMetaOptions = (key: AdminMetaOptionKey): MetaOptionItem[] =>
  useMetaStore().getOptions(key)

export const getAdminMetaLabel = (
  key: AdminMetaOptionKey,
  value: MetaOptionValue | null | undefined,
  fallback = '--'
) => useMetaStore().getLabel(key, value, fallback)
