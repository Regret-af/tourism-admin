import { ApiRequestError, type PageResult } from '@/types/api'
import type { ExampleFormPayload, ExampleItem, ExampleQuery } from '@/types/example'

const categories = ['景点推荐', '内容运营', '系统设置']

let exampleSeed: ExampleItem[] = Array.from({ length: 18 }).map((_, index) => ({
  id: String(index + 1),
  name: `示例数据 ${index + 1}`,
  category: categories[index % categories.length],
  status: index % 3 === 0 ? 0 : 1,
  description: `这是一条用于管理端骨架联调的示例数据，编号 ${index + 1}。`,
  createdAt: `2026-04-${String((index % 9) + 1).padStart(2, '0')} 10:${String(
    (index * 3) % 60
  ).padStart(2, '0')}:00`
}))

const wait = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms))

export const mockGetExamplePageApi = async (
  query: ExampleQuery
): Promise<PageResult<ExampleItem>> => {
  await wait()

  const keyword = query.keyword?.trim().toLowerCase()
  const filtered = exampleSeed.filter((item) => {
    const matchKeyword =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword)
    const matchStatus =
      query.status === undefined ||
      query.status === null ||
      String(item.status) === String(query.status)

    return matchKeyword && matchStatus
  })

  const pageNum = query.pageNum || 1
  const pageSize = query.pageSize || 10
  const start = (pageNum - 1) * pageSize
  const list = filtered.slice(start, start + pageSize)

  return {
    pageNum,
    pageSize,
    total: filtered.length,
    pages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    list
  }
}

export const mockGetExampleDetailApi = async (id: string): Promise<ExampleItem> => {
  await wait(150)

  const target = exampleSeed.find((item) => item.id === id)

  if (!target) {
    throw new ApiRequestError({
      kind: 'business',
      code: 40400,
      message: '示例数据不存在'
    })
  }

  return target
}

export const mockSaveExampleApi = async (
  payload: ExampleFormPayload
): Promise<ExampleItem> => {
  await wait(240)

  if (payload.id) {
    const target = exampleSeed.find((item) => item.id === payload.id)

    if (!target) {
      throw new ApiRequestError({
        kind: 'business',
        code: 40400,
        message: '待编辑示例数据不存在'
      })
    }

    Object.assign(target, payload)
    return target
  }

  const item: ExampleItem = {
    id: String(Date.now()),
    name: payload.name,
    category: payload.category,
    description: payload.description,
    status: payload.status,
    createdAt: '2026-04-06 21:00:00'
  }

  exampleSeed = [item, ...exampleSeed]
  return item
}
