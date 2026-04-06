import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { orderAPI } from '../utils/api'

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const res = await orderAPI.getAll({ limit: 50 })
      setOrders(res.data.data.orders)
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      confirmed: 'badge-primary',
      preparing: 'badge-primary',
      ready: 'badge-success',
      completed: 'badge-success',
      cancelled: 'badge-danger'
    }
    return badges[status] || 'badge'
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '32px' }}>My Orders</h1>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>📦</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>No orders yet</h2>
          <p style={{ color: 'var(--gray)', marginBottom: '24px' }}>Start ordering from our menu!</p>
          <Link to="/menu" className="btn btn-primary">Browse Menu</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.map((order) => (
            <Link
              key={order._id}
              to={`/orders/${order._id}`}
              className="card"
              style={{
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '16px',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: '700', fontSize: '18px' }}>{order.orderNumber}</div>
                <div style={{ color: 'var(--gray)', fontSize: '14px' }}>
                  {new Date(order.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--gray)', fontSize: '13px' }}>Items</div>
                <div>{order.items.length} items</div>
              </div>

              <div>
                <div style={{ color: 'var(--gray)', fontSize: '13px' }}>Type</div>
                <div style={{ textTransform: 'capitalize' }}>{order.orderType}</div>
              </div>

              <div>
                <div style={{ color: 'var(--gray)', fontSize: '13px' }}>Total</div>
                <div style={{ fontWeight: '700', color: 'var(--primary)' }}>${order.total.toFixed(2)}</div>
              </div>

              <div>
                <span className={`badge ${getStatusBadge(order.status)}`}>
                  {order.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
