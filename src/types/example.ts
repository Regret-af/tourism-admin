import type { PageQuery } from './api'
import type { MetaOptionValue } from './meta'

export interface ExampleItem {
  id: string
  name: string
  category: string
  status: MetaOptionValue
  description: string
  createdAt: string
}

export interface ExampleQuery extends PageQuery {
  keyword?: string
  status?: MetaOptionValue
}

export interface ExampleFormPayload {
  id?: string
  name: string
  category: string
  description: string
  status: MetaOptionValue
}
