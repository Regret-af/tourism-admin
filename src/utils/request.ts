import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios'
import { ElMessage } from 'element-plus'
import { API_BASE_URL, LOGIN_PATH } from '@/constants/app'
import { ApiRequestError, type ApiResponse } from '@/types/api'
import { clearToken, getToken } from '@/utils/auth'

export interface RequestConfig<D = unknown> extends AxiosRequestConfig<D> {
  skipAuth?: boolean
  skipErrorToast?: boolean
  rawResponse?: boolean
}

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean
    skipErrorToast?: boolean
    rawResponse?: boolean
  }

  interface InternalAxiosRequestConfig {
    skipAuth?: boolean
    skipErrorToast?: boolean
    rawResponse?: boolean
  }
}

const service = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000
})

const redirectToLogin = () => {
  clearToken()

  if (window.location.pathname === LOGIN_PATH) {
    return
  }

  const redirect = `${window.location.pathname}${window.location.search}`
  const search = new URLSearchParams({ redirect })
  window.location.replace(`${LOGIN_PATH}?${search.toString()}`)
}

service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken()
  const headers = AxiosHeaders.from(config.headers)

  if (!config.skipAuth && token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  config.headers = headers
  return config
})

service.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    const status = error.response?.status
    const data = error.response?.data
    const message =
      data?.message ||
      (status === 401
        ? '登录已失效，请重新登录'
        : status === 403
          ? '当前账号没有操作权限'
          : error.message || '网络请求异常')

    if (!error.config?.skipErrorToast) {
      ElMessage.error(message)
    }

    if (status === 401) {
      redirectToLogin()
    }

    return Promise.reject(
      new ApiRequestError({
        kind: status ? 'http' : 'network',
        message,
        status,
        code: data?.code,
        requestId: data?.requestId,
        timestamp: data?.timestamp,
        handledByRequest: true,
        cause: error
      })
    )
  }
)

const unwrapResponse = <T>(
  response: AxiosResponse<ApiResponse<T>>,
  config?: RequestConfig
): T => {
  if (config?.rawResponse) {
    return response as T
  }

  const payload = response.data

  if (payload.code === 0) {
    return payload.data
  }

  if (!config?.skipErrorToast) {
    ElMessage.error(payload.message || '请求失败')
  }

  if (payload.code === 40100) {
    redirectToLogin()
  }

  throw new ApiRequestError({
    kind: 'business',
    message: payload.message || '请求失败',
    code: payload.code,
    requestId: payload.requestId,
    timestamp: payload.timestamp,
    handledByRequest: true
  })
}

const request = {
  async get<T>(url: string, config?: RequestConfig) {
    const response = await service.get<ApiResponse<T>>(url, config)
    return unwrapResponse<T>(response, config)
  },
  async post<T, D = unknown>(url: string, data?: D, config?: RequestConfig<D>) {
    const response = await service.post<ApiResponse<T>, AxiosResponse<ApiResponse<T>>, D>(
      url,
      data,
      config
    )
    return unwrapResponse<T>(response, config)
  },
  async put<T, D = unknown>(url: string, data?: D, config?: RequestConfig<D>) {
    const response = await service.put<ApiResponse<T>, AxiosResponse<ApiResponse<T>>, D>(
      url,
      data,
      config
    )
    return unwrapResponse<T>(response, config)
  },
  async patch<T, D = unknown>(url: string, data?: D, config?: RequestConfig<D>) {
    const response = await service.patch<ApiResponse<T>, AxiosResponse<ApiResponse<T>>, D>(
      url,
      data,
      config
    )
    return unwrapResponse<T>(response, config)
  },
  async delete<T>(url: string, config?: RequestConfig) {
    const response = await service.delete<ApiResponse<T>>(url, config)
    return unwrapResponse<T>(response, config)
  },
  async request<T, D = unknown>(config: RequestConfig<D>) {
    const response = await service.request<ApiResponse<T>, AxiosResponse<ApiResponse<T>>, D>(
      config
    )
    return unwrapResponse<T>(response, config)
  }
}

export default request
