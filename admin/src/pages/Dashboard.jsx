import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardAPI, orderAPI, aiAPI } from '../utils/api'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '../context/store'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [overview, setOverview] = useState(null)
  const [revenueData, setRevenueData] = useState([])
  const [popularItems, setPopularItems] = useState([])
  const [alerts, setAlerts] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [aiStatus, setAiStatus] = useState({ gemini: null, chromadb: null, indexedItems: 0, message: '' })
  const [indexing, setIndexing] = useState(false)
  const [indexResult, setIndexResult] = useState('')

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager'

  useEffect(() => {
    loadData()
    loadAiStatus()
  }, [])

  const loadAiStatus = async () => {
    try {
      const res = await aiAPI.status()
      setAiStatus(res.data.data)
    } catch {
      setAiStatus({ gemini: false, chromadb: false, indexedItems: 0, message: 'Could not reach AI service' })
    }
  }

  const handleReindex = async () => {
    setIndexing(true)
    setIndexResult('')
    try {
      const res = await aiAPI.indexMenu()
      const { indexed, failed, totalInChroma } = res.data.data
      setIndexResult(`✅ Done: ${indexed} indexed, ${failed} failed (${totalInChroma} total)`)
      loadAiStatus() // refresh counts
    } catch (err) {
      setIndexResult(`❌ ${err.response?.data?.message || 'Indexing failed'}`)
    } finally {
      setIndexing(false)
    }
  }

  const loadData = async () => {
    try {
      const promises = [
        dashboardAPI.getOverview(),
        dashboardAPI.getAlerts(),
        orderAPI.getAll({ limit: 5 }) // Fetch recent orders for staff/everyone
      ]

      if (isManagerOrAdmin) {
        promises.push(dashboardAPI.getRevenueChart({ period: '7days' }))
        promises.push(dashboardAPI.getPopularItems({ limit: 5 }))
      }

      const results = await Promise.all(promises)
      
      setOverview(results[0].data.data)
      setAlerts(results[1].data.data.alerts)
      setRecentOrders(results[2].data.data.orders)

      if (isManagerOrAdmin) {
        setRevenueData(results[3].data.data.revenueData)
        setPopularItems(results[4].data.data.popularItems)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  return (
    <div>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Dashboard Overview</h1>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                padding: '16px 20px',
                marginBottom: '12px',
                borderLeft: `4px solid ${alert.priority === 'high' ? 'var(--danger)' : 'var(--warning)'}`
              }}
            >
              <strong>{alert.message}</strong>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-value">{overview?.orders.today || 0}</div>
              <div className="stat-card-label">Orders Today</div>
            </div>
            <div className="stat-card-icon" style={{ background: '#dbeafe' }}>📦</div>
          </div>
        </div>

        {isManagerOrAdmin && (
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">₹{(overview?.revenue.today || 0).toFixed(2)}</div>
                <div className="stat-card-label">Revenue Today</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#d1fae5' }}>💰</div>
            </div>
          </div>
        )}

        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-value">{overview?.tables.occupied || 0}/{overview?.tables.total || 0}</div>
              <div className="stat-card-label">Tables Occupied ({overview?.tables.utilization || 0}%)</div>
            </div>
            <div className="stat-card-icon" style={{ background: '#fef3c7' }}>🪑</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-value">{overview?.reservations.today || 0}</div>
              <div className="stat-card-label">Reservations Today</div>
            </div>
            <div className="stat-card-icon" style={{ background: '#e0e7ff' }}>📅</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div>
              <div className="stat-card-value">{overview?.orders.pending || 0}</div>
              <div className="stat-card-label">Pending Orders</div>
            </div>
            <div className="stat-card-icon" style={{ background: '#fee2e2' }}>⏳</div>
          </div>
        </div>

        {isManagerOrAdmin && (
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{overview?.inventory.lowStock || 0}</div>
                <div className="stat-card-label">Low Stock Items</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#ffedd5' }}>⚠️</div>
            </div>
          </div>
        )}
      </div>

      {/* AI / RAG Status Card — admin & manager only */}
      {isManagerOrAdmin && (
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0 }}>🤖 AI / RAG Status</h3>
            <button
              className="btn btn-primary"
              onClick={handleReindex}
              disabled={indexing || !aiStatus.chromadb || !aiStatus.gemini}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              {indexing ? '⏳ Indexing…' : '🔄 Re-index Menu'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {/* Gemini */}
            <div style={{
              flex: 1, minWidth: '140px', padding: '16px', borderRadius: '12px',
              background: aiStatus.gemini ? 'rgba(16,185,129,0.1)' : aiStatus.gemini === null ? 'rgba(148,163,184,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${aiStatus.gemini ? 'rgba(16,185,129,0.3)' : aiStatus.gemini === null ? 'rgba(148,163,184,0.3)' : 'rgba(239,68,68,0.3)'}`
            }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{aiStatus.gemini === null ? '⏳' : aiStatus.gemini ? '✅' : '❌'}</div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Gemini AI</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>{aiStatus.gemini ? 'Connected' : aiStatus.gemini === null ? 'Checking…' : 'Check GEMINI_API_KEY'}</div>
            </div>

            {/* ChromaDB */}
            <div style={{
              flex: 1, minWidth: '140px', padding: '16px', borderRadius: '12px',
              background: aiStatus.chromadb ? 'rgba(16,185,129,0.1)' : aiStatus.chromadb === null ? 'rgba(148,163,184,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${aiStatus.chromadb ? 'rgba(16,185,129,0.3)' : aiStatus.chromadb === null ? 'rgba(148,163,184,0.3)' : 'rgba(239,68,68,0.3)'}`
            }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{aiStatus.chromadb === null ? '⏳' : aiStatus.chromadb ? '✅' : '❌'}</div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>ChromaDB</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>{aiStatus.chromadb ? 'Connected' : aiStatus.chromadb === null ? 'Checking…' : 'Run start-chromadb.bat'}</div>
            </div>

            {/* Indexed items */}
            <div style={{
              flex: 1, minWidth: '140px', padding: '16px', borderRadius: '12px',
              background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)'
            }}>
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>📚</div>
              <div style={{ fontWeight: 700, fontSize: '22px', marginBottom: '2px' }}>{aiStatus.indexedItems}</div>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>Menu items indexed</div>
            </div>
          </div>

          {indexResult && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
              background: indexResult.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${indexResult.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
            }}>
              {indexResult}
            </div>
          )}
        </div>
      )}

      {/* Charts / Data Row */}
      {isManagerOrAdmin ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>Revenue (Last 7 Days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '20px' }}>Popular Items</h3>
            {popularItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: idx < popularItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span>{item.name}</span>
                <span style={{ fontWeight: '600' }}>{item.totalQuantity} sold</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>Recent Order & Customer Details</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Token/Order #</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Customer Name</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Phone Number</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Order Type (Table)</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Payment Mode</th>
                  <th style={{ padding: '12px', borderBottom: '1px solid #eee' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order._id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}><strong>{order.receiveToken || order.orderNumber}</strong></td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{order.customerName}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{order.customerPhone || 'N/A'}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee', textTransform: 'capitalize' }}>
                      {order.orderType} {order.tableNumber ? `(T${order.tableNumber})` : ''}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>{order.payment?.method || 'N/A'}</td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                      <span className="badge badge-primary">{order.status}</span>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ padding: '12px', textAlign: 'center', color: '#666' }}>No recent orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/orders" className="btn btn-primary">View Orders</Link>
          <Link to="/kitchen" className="btn btn-outline">Kitchen Display</Link>
          <Link to="/menu" className="btn btn-outline">Manage Menu</Link>
          <Link to="/reservations" className="btn btn-outline">Check Reservations</Link>
        </div>
      </div>
    </div>
  )
}
