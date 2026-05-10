// API Client Utilities for React Frontend

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || '/api'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      data.error || data.message || `API Error: ${response.status}`
    )
  }

  return response.json()
}

// Batch APIs
export const batchApi = {
  async getAll() {
    const response = await fetchApi('/batch')
    return response.data || []
  },

  async create(name: string, description?: string) {
    const response = await fetchApi('/batch', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    })
    return response.data
  },

  async getById(id: string) {
    const response = await fetchApi(`/batch/${id}`)
    return response.data
  },
}

// Curriculum APIs
export const curriculumApi = {
  async upload(file: File, batchId: string) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('batchId', batchId)

    const response = await fetch(`${API_BASE_URL}/curriculum/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        data.error || 'Upload failed'
      )
    }

    return response.json()
  },

  async getById(id: string) {
    const response = await fetchApi(`/curriculum/${id}`)
    return response.data
  },

  async list() {
    const response = await fetchApi('/curriculum')
    return response.data || []
  },
}

// Analysis APIs
export const analysisApi = {
  async analyze(curriculumId: string) {
    const response = await fetchApi('/analyze', {
      method: 'POST',
      body: JSON.stringify({ curriculumId }),
    })
    return response.data
  },

  async getById(id: string) {
    const response = await fetchApi(`/analyze/${id}`)
    return response.data
  },
}

export default {
  batchApi,
  curriculumApi,
  analysisApi,
}
