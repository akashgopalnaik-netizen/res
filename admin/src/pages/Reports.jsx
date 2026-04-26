import { useEffect, useState } from 'react'
import { paymentAPI, orderAPI, dashboardAPI } from '../utils/api'
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts'

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function Reports() {
  const [paymentStats, setPaymentStats] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [popularItems, setPopularItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [paymentStatsRes, paymentHistoryRes, popularRes] = await Promise.all([
        paymentAPI.getStats(),
        paymentAPI.getHistory({ limit: 20 }),
        dashboardAPI.getPopularItems({ limit: 10 })
      ])
      setPaymentStats(paymentStatsRes.data.data)
      setPaymentHistory(paymentHistoryRes.data.data.payments)
      setPopularItems(popularRes.data.data.popularItems)
    } catch (error) {
      console.error('Failed to load reports:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  const methodData = paymentStats?.methodBreakdown.map((m, i) => ({
    name: m._id,
    value: m.count,
    color: COLORS[i % COLORS.length]
  })) || []

  const revenueData = paymentStats?.methodBreakdown.map((m) => ({
    name: m._id,
    revenue: m.total
  })) || []

  return (
    <div>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Reports & Analytics</h1>

      {/* Revenue Summary */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-value">₹{paymentStats?.totalRevenue?.toFixed(2) || '0.00'}</div>
              <div className="stat-card-label">Total Revenue</div>
            </div>
            <div className="stat-card-icon" style={{ background: '#d1fae5' }}>💰</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-value">₹{paymentStats?.todayRevenue?.toFixed(2) || '0.00'}</div>
              <div className="stat-card-label">Today's Revenue</div>
            </div>
            <div className="stat-card-icon" style={{ background: '#dbeafe' }}>📊</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-value">{paymentStats?.pendingPayments || 0}</div>
              <div className="stat-card-label">Pending Payments</div>
            </div>
            <div className="stat-card-icon" style={{ background: '#fef3c7' }}>⏳</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>Revenue by Payment Method</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="revenue" fill="var(--primary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>Payment Method Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={methodData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {methodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Popular Items */}
      <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '20px' }}>Top Selling Items</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={popularItems} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="totalQuantity" fill="var(--primary)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Payments */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px' }}>Recent Payments</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {paymentHistory.map((payment) => (
              <tr key={payment.orderNumber}>
                <td style={{ fontWeight: '600' }}>{payment.orderNumber}</td>
                <td>{payment.customer}</td>
                <td style={{ fontWeight: '600', color: 'var(--primary)' }}>₹{payment.amount.toFixed(2)}</td>
                <td style={{ textTransform: 'capitalize' }}>{payment.method}</td>
                <td>
                  <span className={`badge ${
                    payment.status === 'completed' ? 'badge-success' :
                    payment.status === 'pending' ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {payment.status}
                  </span>
                </td>
                <td>{new Date(payment.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
