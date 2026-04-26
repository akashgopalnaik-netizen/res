import axios from 'axios'
import { useAuthStore } from '../context/store'

const API_URL = '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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

// APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me')
}

export const dashboardAPI = {
  getOverview: () => api.get('/dashboard/overview'),
  getRevenueChart: (params) => api.get('/dashboard/revenue-chart', { params }),
  getPopularItems: (params) => api.get('/dashboard/popular-items', { params }),
  getRecentOrders: (params) => api.get('/dashboard/recent-orders', { params }),
  getAlerts: () => api.get('/dashboard/alerts')
}

export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  cancel: (id) => api.delete(`/orders/${id}`),
  getKitchenDisplay: () => api.get('/orders/kitchen/display'),
  verifyToken: (id, token) => api.post(`/orders/${id}/verify-token`, { token })
}

export const menuAPI = {
  getAll: (params) => api.get('/menu', { params }),
  getById: (id) => api.get(`/menu/${id}`),
  create: (data) => api.post('/menu', data),
  update: (id, data) => api.put(`/menu/${id}`, data),
  delete: (id) => api.delete(`/menu/${id}`),
  toggleAvailability: (id) => api.put(`/menu/${id}/toggle-availability`),
  getStats: () => api.get('/menu/stats/overview')
}

export const tableAPI = {
  getAll: (params) => api.get('/tables', { params }),
  getById: (id) => api.get(`/tables/${id}`),
  create: (data) => api.post('/tables', data),
  update: (id, data) => api.put(`/tables/${id}`, data),
  updateStatus: (id, data) => api.put(`/tables/${id}/status`, data),
  delete: (id) => api.delete(`/tables/${id}`),
  getStats: () => api.get('/tables/stats/overview')
}

export const reservationAPI = {
  getAll: (params) => api.get('/reservations', { params }),
  updateStatus: (id, data) => api.put(`/reservations/${id}/status`, data),
  update: (id, data) => api.put(`/reservations/${id}`, data),
  cancel: (id) => api.delete(`/reservations/${id}`),
  getToday: () => api.get('/dashboard/today-reservations')
}

export const inventoryAPI = {
  getItems: (params) => api.get('/inventory/items', { params }),
  getItem: (id) => api.get(`/inventory/items/${id}`),
  createItem: (data) => api.post('/inventory/items', data),
  updateItem: (id, data) => api.put(`/inventory/items/${id}`, data),
  deleteItem: (id) => api.delete(`/inventory/items/${id}`),
  restock: (id, data) => api.put(`/inventory/items/${id}/restock`, data),
  reportWastage: (id, data) => api.post(`/inventory/items/${id}/wastage`, data),
  getLowStock: () => api.get('/inventory/items/low-stock'),
  getSuppliers: () => api.get('/inventory/suppliers'),
  createSupplier: (data) => api.post('/inventory/suppliers', data),
  getStats: () => api.get('/inventory/stats/overview')
}

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats/overview')
}

export const paymentAPI = {
  getHistory: (params) => api.get('/payment/history', { params }),
  getStats: () => api.get('/payment/stats/overview'),
  refund: (data) => api.post('/payment/refund', data)
}

export const aiAPI = {
  status: () => api.get('/ai/status'),
  indexMenu: () => api.post('/ai/index-menu')
}

export default api
