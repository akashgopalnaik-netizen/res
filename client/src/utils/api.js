import axios from 'axios'
import { useAuthStore } from '../context/store'

const API_URL = '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data)
}

// Menu APIs
export const menuAPI = {
  getAll: (params) => api.get('/menu', { params }),
  getById: (id) => api.get(`/menu/${id}`),
  getCategories: () => api.get('/menu/categories')
}

// Order APIs
export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  cancel: (id) => api.delete(`/orders/${id}`)
}

// Cart APIs
export const cartAPI = {
  checkout: (data) => api.post('/orders', data)
}

// Reservation APIs
export const reservationAPI = {
  getAll: (params) => api.get('/reservations', { params }),
  getById: (id) => api.get(`/reservations/${id}`),
  create: (data) => api.post('/reservations', data),
  cancel: (id) => api.delete(`/reservations/${id}`),
  checkAvailability: (params) => api.get('/reservations/check-availability', { params })
}

// Payment APIs
export const paymentAPI = {
  createIntent: (data) => api.post('/payment/create-intent', data),
  generateQR: (data) => api.post('/payment/qr-generate', data),
  processQR: (data) => api.post('/payment/qr-pay', data),
  payCash: (data) => api.post('/payment/cash', data)
}

// Table APIs
export const tableAPI = {
  getAvailable: () => api.get('/tables/available/public'),
  getQR: (tableNumber) => api.get(`/tables/${tableNumber}/qr`)
}

export default api
