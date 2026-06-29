import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 10000,
})

export const getApiError = (error) => {
  return error.response?.data?.message || error.message || 'Không thể kết nối API'
}
