<script setup lang="ts">
import {
  ArrowRight,
  Location,
  Notebook,
  User,
  WarningFilled
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import * as echarts from 'echarts/core'
import type { BarSeriesOption, GaugeSeriesOption, LineSeriesOption, PieSeriesOption } from 'echarts/charts'
import { BarChart, GaugeChart, LineChart, PieChart } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  TooltipComponentOption
} from 'echarts/components'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { ElMessage } from 'element-plus'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  type Component,
  type ComponentPublicInstance,
  watch
} from 'vue'
import { useRouter } from 'vue-router'
import {
  getDashboardAttractionCategoryDistributionApi,
  getDashboardOperationLogTrendsApi,
  getDashboardOverviewApi,
  getDashboardTopDiariesApi,
  getDashboardTrendsApi
} from '@/api/dashboard'
import { useAuthStore } from '@/stores/auth'
import { getApiErrorMessage, isApiRequestError } from '@/types/api'
import type {
  DashboardAttractionCategoryDistributionItem,
  DashboardOperationLogTrendItem,
  DashboardOverview,
  DashboardRangeType,
  DashboardTopDiaryItem,
  DashboardTrends
} from '@/types/dashboard'

type EChartsOption = echarts.ComposeOption<
  | BarSeriesOption
  | GaugeSeriesOption
  | LineSeriesOption
  | PieSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
>

echarts.use([BarChart, GaugeChart, GridComponent, LegendComponent, LineChart, PieChart, TooltipComponent, CanvasRenderer])

interface SummaryCard {
  key: string
  label: string
  badge: string
  value: string
  icon: Component
  tone: 'user' | 'attraction' | 'diary' | 'audit'
  statuses: SummaryCardStatus[]
}

type SummaryCardColorKey = 'brand' | 'accent' | 'sidebarAccent' | 'muted'

interface SummaryCardStatus {
  key: string
  label: string
  value: number
  color: SummaryCardColorKey
  outlined?: boolean
}

const TOP_DIARY_LIMIT = 5

const router = useRouter()
const authStore = useAuthStore()

const overviewLoading = ref(false)
const trendLoading = ref(false)
const rankingLoading = ref(false)
const operationLoading = ref(false)
const trendRangeType = ref<DashboardRangeType>('7d')
const rankingRangeType = ref<DashboardRangeType>('7d')
const operationRangeType = ref<DashboardRangeType>('7d')
const overview = ref<DashboardOverview>({
  userTotal: 0,
  userEnabledCount: 0,
  userDisabledCount: 0,
  attractionTotal: 0,
  attractionOnlineCount: 0,
  attractionOfflineCount: 0,
  diaryTotal: 0,
  diaryOnlineCount: 0,
  diaryOfflineCount: 0,
  diaryPendingReviewCount: 0,
  diaryRejectedCount: 0,
  diaryDeletedCount: 0
})
const trends = ref<DashboardTrends>({ newUsers: [], newDiaries: [] })
const topDiaries = ref<DashboardTopDiaryItem[]>([])
const categoryDistribution = ref<DashboardAttractionCategoryDistributionItem[]>([])
const operationLogTrends = ref<DashboardOperationLogTrendItem[]>([])

const trendChartRef = ref<HTMLDivElement>()
const categoryChartRef = ref<HTMLDivElement>()
const operationChartRef = ref<HTMLDivElement>()
const healthChartRef = ref<HTMLDivElement>()

const summaryChartRefs = new Map<string, HTMLDivElement>()
const trendChartInstance = shallowRef<echarts.EChartsType | null>(null)
const categoryChartInstance = shallowRef<echarts.EChartsType | null>(null)
const operationChartInstance = shallowRef<echarts.EChartsType | null>(null)
const healthChartInstance = shallowRef<echarts.EChartsType | null>(null)

const summaryChartInstances = new Map<string, echarts.EChartsType>()
let trendResizeObserver: ResizeObserver | null = null
let categoryResizeObserver: ResizeObserver | null = null
let operationResizeObserver: ResizeObserver | null = null
let healthResizeObserver: ResizeObserver | null = null
const summaryResizeObservers = new Map<string, ResizeObserver>()

const formatter = new Intl.NumberFormat('zh-CN')
const rangeOptions: Array<{ label: string; value: DashboardRangeType }> = [
  { label: '近 7 天', value: '7d' },
  { label: '近 30 天', value: '30d' }
]

let latestOverviewRequestId = 0
let latestTrendRequestId = 0
let latestRankingRequestId = 0
let latestOperationRequestId = 0

const formatNumber = (value: number) => formatter.format(value)
const formatPercent = (value: number, total: number) =>
  total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%'
const formatAxisDate = (value: string) => dayjs(value).format('MM-DD')

const currentTrendRangeLabel = computed(
  () => rangeOptions.find((item) => item.value === trendRangeType.value)?.label ?? rangeOptions[0]?.label ?? ''
)

const pageDateLabel = computed(() => dayjs().format('YYYY年M月D日'))

const currentOperationRangeLabel = computed(
  () => rangeOptions.find((item) => item.value === operationRangeType.value)?.label ?? rangeOptions[0]?.label ?? ''
)

const getCssVar = (name: string, fallback: string) => {
  if (typeof window === 'undefined') {
    return fallback
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

const createChartTokens = () => ({
  brand: getCssVar('--app-brand', '#fa7025'),
  accent: getCssVar('--app-accent', '#cf7c34'),
  sidebarAccent: getCssVar('--app-sidebar-accent', '#35607a'),
  textPrimary: getCssVar('--app-text-primary', '#0f172a'),
  textSecondary: getCssVar('--app-text-secondary', '#64748b'),
  border: 'rgba(15, 23, 42, 0.08)',
  surface: 'rgba(255, 255, 255, 0.82)'
})

const getSummaryColorValue = (
  color: SummaryCardColorKey,
  tokens: ReturnType<typeof createChartTokens> = createChartTokens()
) => {
  switch (color) {
    case 'brand':
      return tokens.brand
    case 'accent':
      return tokens.accent
    case 'sidebarAccent':
      return tokens.sidebarAccent
    case 'muted':
    default:
      return 'rgba(15, 23, 42, 0.24)'
  }
}

const getSummaryColorCss = (color: SummaryCardColorKey) => {
  switch (color) {
    case 'brand':
      return 'var(--app-brand)'
    case 'accent':
      return 'var(--app-accent)'
    case 'sidebarAccent':
      return 'var(--app-sidebar-accent)'
    case 'muted':
    default:
      return 'rgba(15, 23, 42, 0.32)'
  }
}

const getSummaryStatusStyle = (status: SummaryCardStatus) => {
  const color = getSummaryColorCss(status.color)

  return status.outlined
    ? {
        backgroundColor: 'transparent',
        borderColor: color
      }
    : {
        backgroundColor: color,
        borderColor: color
      }
}

const attachResizeObserver = (
  element: HTMLDivElement,
  chart: echarts.EChartsType,
  assign: (observer: ResizeObserver | null) => void
) => {
  if (typeof ResizeObserver === 'undefined') {
    return
  }

  const observer = new ResizeObserver(() => chart.resize())
  observer.observe(element)
  assign(observer)
}

const initChart = (
  element: HTMLDivElement | undefined,
  chartRef: typeof trendChartInstance,
  observer: ResizeObserver | null,
  assignObserver: (value: ResizeObserver | null) => void
) => {
  if (!element) {
    return null
  }

  if (chartRef.value) {
    return chartRef.value
  }

  observer?.disconnect()
  const chart = echarts.init(element)
  chartRef.value = chart
  attachResizeObserver(element, chart, assignObserver)
  return chart
}

const disposeChart = (
  chartRef: typeof trendChartInstance,
  observer: ResizeObserver | null,
  assignObserver: (value: ResizeObserver | null) => void
) => {
  observer?.disconnect()
  assignObserver(null)

  if (chartRef.value) {
    chartRef.value.dispose()
    chartRef.value = null
  }
}

const setSummaryChartRef = (
  key: string,
  element: Element | ComponentPublicInstance | null
) => {
  const target =
    element instanceof HTMLDivElement
      ? element
      : element && '$el' in element && element.$el instanceof HTMLDivElement
        ? element.$el
        : null

  if (target) {
    summaryChartRefs.set(key, target)
    return
  }

  summaryChartRefs.delete(key)
}

const disposeSummaryChart = (key: string) => {
  summaryResizeObservers.get(key)?.disconnect()
  summaryResizeObservers.delete(key)

  const chart = summaryChartInstances.get(key)
  if (chart) {
    chart.dispose()
    summaryChartInstances.delete(key)
  }
}
const summaryCards = computed<SummaryCard[]>(() => [
  {
    key: 'users',
    label: '用户总览',
    badge: '用户总量',
    value: formatNumber(overview.value.userTotal),
    icon: User,
    tone: 'user',
    statuses: [
      {
        key: 'enabled',
        label: '启用',
        value: overview.value.userEnabledCount,
        color: 'sidebarAccent'
      },
      {
        key: 'disabled',
        label: '停用',
        value: overview.value.userDisabledCount,
        color: 'muted',
        outlined: true
      }
    ]
  },
  {
    key: 'attractions',
    label: '景点总览',
    badge: '景点总量',
    value: formatNumber(overview.value.attractionTotal),
    icon: Location,
    tone: 'attraction',
    statuses: [
      {
        key: 'online',
        label: '上架',
        value: overview.value.attractionOnlineCount,
        color: 'brand'
      },
      {
        key: 'offline',
        label: '下架',
        value: overview.value.attractionOfflineCount,
        color: 'muted',
        outlined: true
      }
    ]
  },
  {
    key: 'diaries',
    label: '日记总览',
    badge: '日记总量',
    value: formatNumber(overview.value.diaryTotal),
    icon: Notebook,
    tone: 'diary',
    statuses: [
      {
        key: 'online',
        label: '公开',
        value: overview.value.diaryOnlineCount,
        color: 'accent'
      },
      {
        key: 'offline',
        label: '下线',
        value: overview.value.diaryOfflineCount,
        color: 'muted',
        outlined: true
      }
    ]
  },
  {
    key: 'audit',
    label: '审核总览',
    badge: '审核重点',
    value: formatNumber(overview.value.diaryPendingReviewCount),
    icon: WarningFilled,
    tone: 'audit',
    statuses: [
      {
        key: 'pending',
        label: '待审核',
        value: overview.value.diaryPendingReviewCount,
        color: 'brand'
      },
      {
        key: 'rejected',
        label: '驳回',
        value: overview.value.diaryRejectedCount,
        color: 'accent'
      },
      {
        key: 'deleted',
        label: '删除',
        value: overview.value.diaryDeletedCount,
        color: 'sidebarAccent'
      }
    ]
  }
])

const buildSummaryChartOption = (card: SummaryCard): EChartsOption => {
  const tokens = createChartTokens()
  const total = card.statuses.reduce((sum, item) => sum + item.value, 0)
  const ringData: any[] = total
    ? card.statuses.map((item) => ({
        value: item.value,
        name: item.label,
        itemStyle: {
          color: getSummaryColorValue(item.color, tokens)
        }
      }))
    : [
        {
          value: 1,
          name: card.badge,
          itemStyle: {
            color: tokens.border
          }
        }
      ]

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderWidth: 0,
      textStyle: {
        color: '#ffffff'
      },
      formatter: (params: any) => {
        if (params.name === '__placeholder__') {
          return ''
        }

        const percent = total > 0 ? `${((params.value / total) * 100).toFixed(1)}%` : '0%'
        return `${params.name}<br/>数量：${formatNumber(params.value)}<br/>占比：${percent}`
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['62%', '82%'],
        center: ['50%', '50%'],
        startAngle: 90,
        clockwise: true,
        avoidLabelOverlap: true,
        label: {
          show: false
        },
        labelLine: {
          show: false
        },
        itemStyle: {
          borderColor: tokens.surface,
          borderWidth: 4
        },
        data: ringData
      }
    ]
  }
}

const keyMetricItems = computed(() => [
  {
    label: '用户启用率',
    value: formatPercent(overview.value.userEnabledCount, overview.value.userTotal),
    helper: `${formatNumber(overview.value.userEnabledCount)} / ${formatNumber(overview.value.userTotal)}`
  },
  {
    label: '景点上架率',
    value: formatPercent(overview.value.attractionOnlineCount, overview.value.attractionTotal),
    helper: `${formatNumber(overview.value.attractionOnlineCount)} / ${formatNumber(overview.value.attractionTotal)}`
  }
])

const mergedTrendItems = computed(() => {
  const trendMap = new Map<string, { date: string; newUsers: number; newDiaries: number }>()

  for (const item of trends.value.newUsers) {
    trendMap.set(item.date, {
      date: item.date,
      newUsers: item.count,
      newDiaries: trendMap.get(item.date)?.newDiaries ?? 0
    })
  }

  for (const item of trends.value.newDiaries) {
    trendMap.set(item.date, {
      date: item.date,
      newUsers: trendMap.get(item.date)?.newUsers ?? 0,
      newDiaries: item.count
    })
  }

  return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date))
})

const categoryRows = computed(() => {
  const total = Math.max(overview.value.attractionTotal, 0)

  return categoryDistribution.value.map((item) => ({
    ...item,
    percent: total > 0 ? Math.min(Math.max((item.attractionCount / total) * 100, 0), 100) : 0,
    ratio: formatPercent(item.attractionCount, overview.value.attractionTotal)
  }))
})

const trendChartOption = computed<EChartsOption>(() => {
  const tokens = createChartTokens()

  return {
    color: [tokens.brand, tokens.sidebarAccent],
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderWidth: 0,
      textStyle: {
        color: '#ffffff'
      }
    },
    legend: {
      top: 0,
      right: 0,
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        color: tokens.textSecondary,
        fontSize: 12
      }
    },
    grid: {
      top: 52,
      right: 8,
      bottom: 12,
      left: 8,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: mergedTrendItems.value.map((item) => formatAxisDate(item.date)),
      axisTick: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: tokens.border
        }
      },
      axisLabel: {
        color: tokens.textSecondary,
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: {
        lineStyle: {
          color: tokens.border
        }
      },
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: tokens.textSecondary,
        fontSize: 12
      }
    },
    series: [
      {
        name: '新增用户',
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: {
          borderRadius: [10, 10, 4, 4]
        },
        data: mergedTrendItems.value.map((item) => item.newUsers)
      },
      {
        name: '新增日记',
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: {
          borderRadius: [10, 10, 4, 4]
        },
        data: mergedTrendItems.value.map((item) => item.newDiaries)
      }
    ]
  }
})

const categoryChartOption = computed<EChartsOption>(() => {
  const tokens = createChartTokens()

  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderWidth: 0,
      textStyle: {
        color: '#ffffff'
      },
      formatter: (params: any) =>
        `${params.name}<br/>数量：${formatNumber(params.data.count)}<br/>占比：${params.data.ratio}`
    },
    grid: {
      top: 8,
      right: 16,
      bottom: 8,
      left: 16,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      max: 100,
      splitLine: {
        show: false
      },
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: tokens.textSecondary,
        formatter: '{value}%',
        fontSize: 12
      }
    },
    yAxis: {
      type: 'category',
      data: categoryRows.value.map((item) => item.categoryName || '--'),
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: tokens.textPrimary,
        fontSize: 12
      }
    },
    series: [
      {
        type: 'bar',
        data: categoryRows.value.map((item) => ({
          value: item.percent,
          count: item.attractionCount,
          ratio: item.ratio
        })),
        showBackground: true,
        backgroundStyle: {
          color: tokens.border,
          borderRadius: 999
        },
        barMaxWidth: 16,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: tokens.accent },
            { offset: 1, color: tokens.brand }
          ]),
          borderRadius: 999
        },
        label: {
          show: true,
          position: 'right',
          color: tokens.textSecondary,
          formatter: (params: any) =>
            `${formatNumber(params.data.count)} / ${params.data.ratio}`
        }
      }
    ]
  }
})

const operationChartOption = computed<EChartsOption>(() => {
  const tokens = createChartTokens()

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      borderWidth: 0,
      textStyle: {
        color: '#ffffff'
      }
    },
    grid: {
      top: 24,
      right: 8,
      bottom: 12,
      left: 8,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: operationLogTrends.value.map((item) => formatAxisDate(item.date)),
      boundaryGap: false,
      axisTick: {
        show: false
      },
      axisLine: {
        lineStyle: {
          color: tokens.border
        }
      },
      axisLabel: {
        color: tokens.textSecondary,
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: {
        lineStyle: {
          color: tokens.border
        }
      },
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      },
      axisLabel: {
        color: tokens.textSecondary,
        fontSize: 12
      }
    },
    series: [
      {
        name: '操作次数',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: operationLogTrends.value.map((item) => item.count),
        lineStyle: {
          width: 3,
          color: tokens.brand
        },
        itemStyle: {
          color: tokens.brand,
          borderColor: '#ffffff',
          borderWidth: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(250, 112, 37, 0.28)' },
            { offset: 1, color: 'rgba(250, 112, 37, 0.02)' }
          ])
        }
      }
    ]
  }
})

const operationLogTotal = computed(() =>
  operationLogTrends.value.reduce((sum, item) => sum + item.count, 0)
)

const operationLogPeak = computed(() =>
  operationLogTrends.value.reduce((max, item) => Math.max(max, item.count), 0)
)

const overviewHealth = computed(() => {
  const enabledRate =
    overview.value.userTotal > 0
      ? overview.value.userEnabledCount / overview.value.userTotal
      : 1
  const attractionRate =
    overview.value.attractionTotal > 0
      ? overview.value.attractionOnlineCount / overview.value.attractionTotal
      : 1
  const diaryRate =
    overview.value.diaryTotal > 0
      ? overview.value.diaryOnlineCount / overview.value.diaryTotal
      : 1
  const pendingPressure =
    overview.value.diaryTotal > 0
      ? 1 - overview.value.diaryPendingReviewCount / overview.value.diaryTotal
      : 1
  const score = Math.round(
    ((enabledRate + attractionRate + diaryRate + pendingPressure) / 4) * 100
  )
  const status =
    score >= 90 ? '稳定' : score >= 75 ? '健康' : score >= 60 ? '关注' : '预警'

  return {
    score,
    status
  }
})

const healthChartOption = computed<EChartsOption>(() => {
  const tokens = createChartTokens()

  return {
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        radius: '90%',
        pointer: {
          show: false
        },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: {
            color: tokens.sidebarAccent
          }
        },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [[1, 'rgba(15, 23, 42, 0.08)']]
          }
        },
        splitLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          show: false
        },
        anchor: {
          show: false
        },
        title: {
          offsetCenter: [0, '32%'],
          color: tokens.textSecondary,
          fontSize: 14
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-4%'],
          color: tokens.textPrimary,
          fontSize: 34,
          fontWeight: 800,
          formatter: '{value}'
        },
        data: [
          {
            value: overviewHealth.value.score,
            name: overviewHealth.value.status
          }
        ]
      }
    ]
  }
})

const showRequestError = (error: unknown, fallback: string) => {
  if (isApiRequestError(error) && error.handledByRequest) {
    return
  }

  ElMessage.error(getApiErrorMessage(error, fallback))
}

const openDiaryManagement = () => {
  void router.push('/diaries/content')
}

const openOperationLogs = () => {
  void router.push('/logs')
}

const syncTrendChart = async () => {
  if (!mergedTrendItems.value.length) {
    disposeChart(trendChartInstance, trendResizeObserver, (value) => {
      trendResizeObserver = value
    })
    return
  }

  await nextTick()
  const chart = initChart(
    trendChartRef.value,
    trendChartInstance,
    trendResizeObserver,
    (value) => {
      trendResizeObserver = value
    }
  )

  chart?.setOption(trendChartOption.value, true)
  chart?.resize()
}

const syncSummaryCharts = async () => {
  await nextTick()

  const activeKeys = new Set(summaryCards.value.map((item) => item.key))

  for (const [key] of summaryChartInstances) {
    if (!activeKeys.has(key)) {
      disposeSummaryChart(key)
    }
  }

  for (const card of summaryCards.value) {
    const element = summaryChartRefs.get(card.key)
    if (!element) {
      continue
    }

    let chart = summaryChartInstances.get(card.key)
    if (!chart) {
      chart = echarts.init(element)
      summaryChartInstances.set(card.key, chart)

      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => chart?.resize())
        observer.observe(element)
        summaryResizeObservers.set(card.key, observer)
      }
    }

    chart.setOption(buildSummaryChartOption(card), true)
    chart.resize()
  }
}

const syncCategoryChart = async () => {
  if (!categoryRows.value.length) {
    disposeChart(categoryChartInstance, categoryResizeObserver, (value) => {
      categoryResizeObserver = value
    })
    return
  }

  await nextTick()
  const chart = initChart(
    categoryChartRef.value,
    categoryChartInstance,
    categoryResizeObserver,
    (value) => {
      categoryResizeObserver = value
    }
  )

  chart?.setOption(categoryChartOption.value, true)
  chart?.resize()
}

const syncOperationChart = async () => {
  if (!operationLogTrends.value.length) {
    disposeChart(operationChartInstance, operationResizeObserver, (value) => {
      operationResizeObserver = value
    })
    return
  }

  await nextTick()
  const chart = initChart(
    operationChartRef.value,
    operationChartInstance,
    operationResizeObserver,
    (value) => {
      operationResizeObserver = value
    }
  )

  chart?.setOption(operationChartOption.value, true)
  chart?.resize()
}

const syncHealthChart = async () => {
  await nextTick()
  const chart = initChart(
    healthChartRef.value,
    healthChartInstance,
    healthResizeObserver,
    (value) => {
      healthResizeObserver = value
    }
  )

  chart?.setOption(healthChartOption.value, true)
  chart?.resize()
}

watch([mergedTrendItems, trendChartOption], () => {
  void syncTrendChart()
}, { immediate: true })

watch(summaryCards, () => {
  void syncSummaryCharts()
}, { immediate: true })

watch([categoryRows, categoryChartOption], () => {
  void syncCategoryChart()
}, { immediate: true })

watch([operationLogTrends, operationChartOption], () => {
  void syncOperationChart()
}, { immediate: true })

watch(healthChartOption, () => {
  void syncHealthChart()
}, { immediate: true })

onBeforeUnmount(() => {
  for (const [key] of summaryChartInstances) {
    disposeSummaryChart(key)
  }
  disposeChart(trendChartInstance, trendResizeObserver, (value) => {
    trendResizeObserver = value
  })
  disposeChart(categoryChartInstance, categoryResizeObserver, (value) => {
    categoryResizeObserver = value
  })
  disposeChart(operationChartInstance, operationResizeObserver, (value) => {
    operationResizeObserver = value
  })
  disposeChart(healthChartInstance, healthResizeObserver, (value) => {
    healthResizeObserver = value
  })
})

const loadOverviewData = async () => {
  const requestId = ++latestOverviewRequestId
  overviewLoading.value = true

  try {
    const [overviewResult, categoryResult] = await Promise.all([
      getDashboardOverviewApi(),
      getDashboardAttractionCategoryDistributionApi()
    ])

    if (requestId !== latestOverviewRequestId) {
      return
    }

    overview.value = overviewResult
    categoryDistribution.value = categoryResult
  } catch (error) {
    if (requestId === latestOverviewRequestId) {
      showRequestError(error, '统计看板概览数据加载失败')
    }
  } finally {
    if (requestId === latestOverviewRequestId) {
      overviewLoading.value = false
    }
  }
}

const loadTrendData = async () => {
  const requestId = ++latestTrendRequestId
  trendLoading.value = true

  try {
    const result = await getDashboardTrendsApi({ rangeType: trendRangeType.value })

    if (requestId !== latestTrendRequestId) {
      return
    }

    trends.value = result
  } catch (error) {
    if (requestId === latestTrendRequestId) {
      showRequestError(error, '新增趋势数据加载失败')
    }
  } finally {
    if (requestId === latestTrendRequestId) {
      trendLoading.value = false
    }
  }
}

const loadTopDiariesData = async () => {
  const requestId = ++latestRankingRequestId
  rankingLoading.value = true

  try {
    const result = await getDashboardTopDiariesApi({
      rangeType: rankingRangeType.value,
      limit: TOP_DIARY_LIMIT
    })

    if (requestId !== latestRankingRequestId) {
      return
    }

    topDiaries.value = result
  } catch (error) {
    if (requestId === latestRankingRequestId) {
      showRequestError(error, '热门日记排行数据加载失败')
    }
  } finally {
    if (requestId === latestRankingRequestId) {
      rankingLoading.value = false
    }
  }
}

const loadOperationLogData = async () => {
  const requestId = ++latestOperationRequestId
  operationLoading.value = true

  try {
    const result = await getDashboardOperationLogTrendsApi({
      rangeType: operationRangeType.value
    })

    if (requestId !== latestOperationRequestId) {
      return
    }

    operationLogTrends.value = result
  } catch (error) {
    if (requestId === latestOperationRequestId) {
      showRequestError(error, '操作日志趋势数据加载失败')
    }
  } finally {
    if (requestId === latestOperationRequestId) {
      operationLoading.value = false
    }
  }
}

const loadDashboard = async () => {
  await Promise.all([
    loadOverviewData(),
    loadTrendData(),
    loadTopDiariesData(),
    loadOperationLogData()
  ])
}

void loadDashboard()
</script>

<template>
  <section class="dashboard-page">
    <div class="dashboard-header">
      <div class="dashboard-header__content">
        <h1 class="page-title">数据总览</h1>
        <p class="page-subtitle">
          欢迎回来，{{ authStore.user?.nickname || authStore.user?.username || '管理员' }}。这里汇总了当前管理端的核心运行状态。
        </p>
      </div>

      <div class="dashboard-header__actions">
        <div class="dashboard-date-chip">{{ pageDateLabel }}</div>
      </div>
    </div>

    <div class="summary-grid">
      <article
        v-for="card in summaryCards"
        :key="card.key"
        class="page-card summary-card"
        :class="`summary-card--${card.tone}`"
      >
        <div class="summary-card__head">
          <div class="summary-card__eyebrow">
            <div class="summary-card__icon">
              <component :is="card.icon" />
            </div>
            <p class="summary-card__label">{{ card.label }}</p>
          </div>
          <span class="summary-card__badge">{{ card.badge }}</span>
        </div>
        <div class="summary-card__body">
          <div class="summary-card__content">
            <p class="summary-card__value">{{ card.value }}</p>
          </div>
          <div :ref="(el) => setSummaryChartRef(card.key, el)" class="summary-card__chart"></div>
        </div>
        <div class="summary-card__status-list">
          <span
            v-for="status in card.statuses"
            :key="`${card.key}-${status.key}`"
            class="summary-card__status-item"
          >
            <i
              class="summary-card__status-dot"
              :class="{ 'summary-card__status-dot--outlined': status.outlined }"
              :style="getSummaryStatusStyle(status)"
            ></i>
            {{ status.label }} {{ formatNumber(status.value) }}
          </span>
        </div>
      </article>
    </div>

    <div class="analytics-grid">
      <section v-loading="trendLoading" class="page-card section-card section-card--trend">
        <div class="section-card__head">
          <div>
            <h2 class="section-card__title">新增趋势</h2>
            <p class="section-card__desc">
              对比 {{ currentTrendRangeLabel }} 内新增用户与新增日记的变化趋势。
            </p>
          </div>
          <div class="section-card__tools">
            <el-radio-group v-model="trendRangeType" size="default" @change="loadTrendData">
              <el-radio-button
                v-for="option in rangeOptions"
                :key="`trend-range-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div v-if="mergedTrendItems.length" ref="trendChartRef" class="echart-panel echart-panel--trend"></div>

        <el-empty v-else description="暂无趋势数据" />
      </section>
      <div class="analytics-grid__side">
        <section v-loading="overviewLoading" class="page-card section-card">
          <div class="section-card__head">
            <div>
              <h2 class="section-card__title">分类分布</h2>
              <p class="section-card__desc">展示各景点分类的数量和占比。</p>
            </div>
          </div>

          <div v-if="categoryRows.length" ref="categoryChartRef" class="echart-panel echart-panel--category"></div>

          <el-empty v-else description="暂无分类分布数据" />
        </section>

        <section class="page-card section-card">
          <div class="section-card__head">
            <div>
              <h2 class="section-card__title">关键指标</h2>
              <p class="section-card__desc">基于总览接口数据计算的核心比率。</p>
            </div>
          </div>

          <div class="metric-grid">
            <article v-for="item in keyMetricItems" :key="item.label" class="metric-grid__item">
              <span class="metric-grid__label">{{ item.label }}</span>
              <strong class="metric-grid__value">{{ item.value }}</strong>
              <span class="metric-grid__helper">{{ item.helper }}</span>
            </article>
          </div>
        </section>
      </div>
    </div>

    <section v-loading="rankingLoading" class="page-card section-card ranking-card">
      <div class="section-card__head">
        <div>
          <h2 class="section-card__title">热门日记排行</h2>
          <p class="section-card__desc">
            严格展示看板排行接口返回的前 {{ TOP_DIARY_LIMIT }} 条热门日记。
          </p>
        </div>
        <div class="section-card__tools">
          <el-radio-group v-model="rankingRangeType" size="default" @change="loadTopDiariesData">
            <el-radio-button
              v-for="option in rangeOptions"
              :key="`ranking-range-${option.value}`"
              :value="option.value"
            >
              {{ option.label }}
            </el-radio-button>
          </el-radio-group>
          <button class="section-link" type="button" @click="openDiaryManagement">
            前往日记管理
            <ArrowRight class="section-link__icon" />
          </button>
        </div>
      </div>

      <div v-if="topDiaries.length" class="ranking-table-wrap">
        <table class="ranking-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>作者</th>
              <th class="text-center">浏览</th>
              <th class="text-center">点赞</th>
              <th class="text-center">收藏</th>
              <th class="text-center">评论</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in topDiaries" :key="item.diaryId">
              <td class="ranking-table__title-cell">
                <span class="ranking-table__title">{{ item.title || '--' }}</span>
              </td>
              <td>{{ item.authorNickname || '--' }}</td>
              <td class="text-center">{{ formatNumber(item.viewCount) }}</td>
              <td class="text-center ranking-table__accent">{{ formatNumber(item.likeCount) }}</td>
              <td class="text-center">{{ formatNumber(item.favoriteCount) }}</td>
              <td class="text-center">{{ formatNumber(item.commentCount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <el-empty v-else description="暂无排行数据" />
    </section>

    <div class="footer-grid">
      <section v-loading="operationLoading" class="page-card section-card footer-grid__logs">
        <div class="section-card__head">
          <div>
            <h2 class="section-card__title">操作日志趋势</h2>
            <p class="section-card__desc">
              {{ currentOperationRangeLabel }} 内共 {{ formatNumber(operationLogTotal) }} 次操作，峰值 {{ formatNumber(operationLogPeak) }}。
            </p>
          </div>
          <div class="section-card__tools">
            <el-radio-group v-model="operationRangeType" size="default" @change="loadOperationLogData">
              <el-radio-button
                v-for="option in rangeOptions"
                :key="`operation-range-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </el-radio-button>
            </el-radio-group>
            <button class="section-link" type="button" @click="openOperationLogs">
              前往操作日志
              <ArrowRight class="section-link__icon" />
            </button>
          </div>
        </div>

        <div
          v-if="operationLogTrends.length"
          ref="operationChartRef"
          class="echart-panel echart-panel--operation"
        ></div>

        <el-empty v-else description="暂无操作日志数据" />
      </section>

      <section class="page-card section-card footer-grid__health">
        <div class="section-card__head">
          <div>
            <h2 class="section-card__title">运行摘要</h2>
            <p class="section-card__desc">基于当前看板数据生成的页面级健康指数。</p>
          </div>
        </div>

        <div class="health-card">
          <div ref="healthChartRef" class="echart-panel echart-panel--health"></div>

          <div class="health-card__metrics">
            <div class="health-card__metric">
              <span>待审核</span>
              <strong>{{ formatNumber(overview.diaryPendingReviewCount) }}</strong>
            </div>
            <div class="health-card__metric">
              <span>已删除日记</span>
              <strong>{{ formatNumber(overview.diaryDeletedCount) }}</strong>
            </div>
            <div class="health-card__metric">
              <span>操作总量</span>
              <strong>{{ formatNumber(operationLogTotal) }}</strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped lang="scss">
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dashboard-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 22px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}

.dashboard-header__content {
  min-width: 0;
}

.dashboard-header__actions {
  display: flex;
  align-items: center;
}

.dashboard-date-chip {
  display: inline-flex;
  align-items: center;
  padding: 12px 18px;
  border: 1px solid var(--app-border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.76);
  color: var(--app-text-primary);
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
  line-height: var(--app-typo-title-sm-line-height);
  letter-spacing: var(--app-typo-title-sm-letter-spacing);
  white-space: nowrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.06);
}

.summary-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.summary-card__eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.summary-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(182, 90, 18, 0.12);
  color: var(--app-brand);
  font-size: 20px;
}
.summary-card--attraction .summary-card__icon {
  background: rgba(53, 96, 122, 0.12);
  color: var(--app-sidebar-accent);
}

.summary-card--diary .summary-card__icon {
  background: rgba(207, 124, 52, 0.12);
  color: var(--app-accent);
}

.summary-card--audit .summary-card__icon {
  background: rgba(182, 90, 18, 0.12);
  color: var(--app-brand);
}

.summary-card__badge {
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: var(--app-font-weight-bold);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.summary-card__label {
  margin: 0;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-xs-size);
  font-weight: var(--app-font-weight-semibold);
  line-height: var(--app-typo-body-xs-line-height);
}

.summary-card__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 104px;
}

.summary-card__content {
  flex: 1;
  min-width: 0;
}

.summary-card__value {
  margin: 0;
  color: var(--app-text-primary);
  font-size: clamp(30px, 3vw, 42px);
  font-weight: var(--app-font-weight-black);
  line-height: 1;
  letter-spacing: -0.03em;
}

.summary-card__chart {
  flex: 0 0 108px;
  width: 108px;
  height: 108px;
}

.summary-card__status-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 14px;
}

.summary-card__status-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-xs-size);
  font-weight: var(--app-font-weight-semibold);
}

.summary-card__status-dot {
  width: 10px;
  height: 10px;
  border: 1.5px solid transparent;
  border-radius: 999px;
}

.summary-card__status-dot--outlined {
  background: transparent;
}

.analytics-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.9fr);
  gap: 18px;
}

.analytics-grid__side {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-card {
  padding: 24px;
}

.section-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.section-card__title {
  margin: 0;
  font-size: var(--app-typo-title-lg-size);
  font-weight: var(--app-typo-title-lg-weight);
  line-height: var(--app-typo-title-lg-line-height);
  letter-spacing: var(--app-typo-title-lg-letter-spacing);
}

.section-card__desc {
  margin: 8px 0 0;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
  font-weight: var(--app-typo-body-sm-weight);
  line-height: var(--app-typo-body-sm-line-height);
  letter-spacing: var(--app-typo-body-sm-letter-spacing);
}

.section-card__tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.echart-panel {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(244, 246, 249, 0.92));
}

.echart-panel--trend {
  height: 480px;
}

.echart-panel--category {
  height: 224px;
}

.echart-panel--operation {
  height: 360px;
}

.echart-panel--health {
  height: 220px;
  border: 0;
  background: transparent;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.metric-grid__item {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  text-align: center;
}

.metric-grid__label {
  display: block;
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-xs-size);
  font-weight: var(--app-font-weight-semibold);
}

.metric-grid__value {
  display: block;
  margin-top: 10px;
  color: var(--app-brand);
  font-size: var(--app-typo-title-lg-size);
  font-weight: var(--app-font-weight-extrabold);
}

.metric-grid__helper {
  display: block;
  margin-top: 8px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.ranking-card {
  overflow: hidden;
}

.section-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--app-brand);
  font-size: var(--app-typo-label-sm-size);
  font-weight: var(--app-font-weight-semibold);
  cursor: pointer;
}

.section-link__icon {
  width: 14px;
  height: 14px;
}

.ranking-table-wrap {
  overflow-x: auto;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 20px;
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.66);
}

.ranking-table thead tr {
  background: rgba(15, 23, 42, 0.04);
}

.ranking-table th,
.ranking-table td {
  padding: 16px 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  text-align: left;
}

.ranking-table th {
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: var(--app-font-weight-bold);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.ranking-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.92);
}

.ranking-table__title-cell {
  min-width: 260px;
}

.ranking-table__title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--app-text-primary);
  font-size: var(--app-typo-title-sm-size);
  font-weight: var(--app-typo-title-sm-weight);
}

.ranking-table__accent {
  color: var(--app-brand);
  font-weight: var(--app-font-weight-bold);
}

.text-center {
  text-align: center !important;
}

.footer-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 18px;
}

.health-card {
  position: relative;
  overflow: hidden;
}

.health-card__metrics {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 16px;
}

.health-card__metric {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
}

.health-card__metric span {
  color: var(--app-text-secondary);
  font-size: var(--app-typo-body-sm-size);
}

.health-card__metric strong {
  font-size: var(--app-typo-title-md-size);
  font-weight: var(--app-font-weight-bold);
}

@media (max-width: 1360px) {
  .summary-grid,
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .analytics-grid,
  .footer-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .dashboard-header,
  .dashboard-header__actions,
  .section-card__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-card__tools {
    width: 100%;
    justify-content: flex-start;
  }

  .summary-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 768px) {
  .summary-grid,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .summary-card__body {
    align-items: flex-start;
  }

  .summary-card__chart {
    flex-basis: 96px;
    width: 96px;
    height: 96px;
  }
}
</style>
