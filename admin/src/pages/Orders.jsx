import { useEffect, useState, useRef } from 'react'
import { orderAPI } from '../utils/api'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

/* ── Token Verify Modal ─────────────────────────────────────────────────── */
function TokenVerifyModal({ order, onClose, onConfirm }) {
  const [enteredToken, setEnteredToken] = useState('')
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const handleVerify = async () => {
    if (!enteredToken.trim()) {
      setError('Please enter the token')
      return
    }
    setVerifying(true)
    setError('')
    try {
      await orderAPI.verifyToken(order._id, enteredToken.trim().toUpperCase())
      onConfirm()
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid token. Please check and try again.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3 className="modal-title">🎫 Verify Customer Token</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ color: 'var(--gray)', fontSize: '14px', marginBottom: '16px' }}>
            Ask the customer to show their pickup token for order <strong>{order.orderNumber}</strong>.
            Enter the 6-character token below to complete the order.
          </p>

          <div className="input-group">
            <label>Customer Token</label>
            <input
              type="text"
              value={enteredToken}
              onChange={(e) => { setEnteredToken(e.target.value.toUpperCase()); setError('') }}
              placeholder="e.g. A1B2C3"
              maxLength={8}
              style={{
                fontFamily: 'monospace', fontSize: '22px', letterSpacing: '6px',
                textAlign: 'center', fontWeight: 700
              }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '10px 14px', color: '#ef4444',
              fontSize: '13px', marginTop: '12px'
            }}>
              ❌ {error}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleVerify}
            disabled={verifying || !enteredToken.trim()}
          >
            {verifying ? '⏳ Verifying...' : '✅ Verify & Complete Order'}
          </button>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

/* ── Main Orders Page ───────────────────────────────────────────────────── */
export default function Orders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [tokenVerifyOrder, setTokenVerifyOrder] = useState(null)
  const [liveConnected, setLiveConnected] = useState(false)
  const filterRef = useRef(filter)

  // Keep filterRef in sync so socket callbacks always have current filter
  useEffect(() => { filterRef.current = filter }, [filter])

  useEffect(() => {
    loadOrders()

    // ── Socket.io real-time updates ─────────────────────────────────────
    const socket = io(window.location.origin)
    socket.emit('join-kitchen') // join the kitchen room for order events

    socket.on('connect', () => setLiveConnected(true))
    socket.on('disconnect', () => setLiveConnected(false))

    // New order arrived → add to top of list if filter matches
    socket.on('new-order', ({ order }) => {
      const currentFilter = filterRef.current
      if (currentFilter === 'all' || currentFilter === order.status) {
        setOrders(prev => [order, ...prev])
        toast.success(`🔔 New order: ${order.orderNumber}`, { duration: 4000 })
      } else {
        toast(`🔔 New order ${order.orderNumber} (${order.status})`, { duration: 3000 })
      }
    })

    // Any order status changed → re-fetch to keep list accurate
    socket.on('order-status-changed', () => {
      loadOrders()
    })

    // Order cancelled
    socket.on('order-cancelled', () => {
      loadOrders()
    })

    return () => {
      socket.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadOrders()
  }, [filter])

  const loadOrders = async () => {
    try {
      const params = filterRef.current !== 'all' ? { status: filterRef.current } : {}
      const res = await orderAPI.getAll(params)
      setOrders(res.data.data.orders)
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (orderId, status) => {
    try {
      await orderAPI.updateStatus(orderId, { status })
      toast.success('Order status updated')
      loadOrders()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleTokenVerified = async () => {
    if (!tokenVerifyOrder) return
    try {
      await orderAPI.updateStatus(tokenVerifyOrder._id, { status: 'completed' })
      toast.success('✅ Token verified! Order marked as completed.')
      setTokenVerifyOrder(null)
      loadOrders()
    } catch (error) {
      toast.error('Failed to complete order')
      setTokenVerifyOrder(null)
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      pending: 'badge-warning',
      confirmed: 'badge-primary',
      preparing: 'badge-primary',
      ready: 'badge-success',
      completed: 'badge-success',
      cancelled: 'badge-danger',
      refunded: 'badge-gray'
    }
    return map[status] || 'badge-gray'
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready: 'Ready',
      completed: 'Received ✓',
      cancelled: 'Cancelled',
      refunded: 'Refunded'
    }
    return labels[status] || status
  }

  const getPaymentInfo = (payment) => {
    const method = payment?.method || 'pending'
    const isPaid = payment?.status === 'completed'
    if (method === 'stripe') {
      return {
        label: isPaid ? '💳 Card (Paid)' : '💳 Card (Pending)',
        bg: isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
        color: isPaid ? '#10b981' : '#6366f1',
        border: isPaid ? 'rgba(16,185,129,0.4)' : 'rgba(99,102,241,0.4)'
      }
    }
    if (method === 'cod') {
      return { label: '💵 COD', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.4)' }
    }
    if (method === 'cash_at_counter') {
      return { label: '💵 Cash', bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.4)' }
    }
    return { label: '⏳ Pending', bg: 'rgba(107,114,128,0.15)', color: '#6b7280', border: 'rgba(107,114,128,0.4)' }
  }

  return (
    <div>
      {/* Token Verify Modal */}
      {tokenVerifyOrder && (
        <TokenVerifyModal
          order={tokenVerifyOrder}
          onClose={() => setTokenVerifyOrder(null)}
          onConfirm={handleTokenVerified}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '28px', margin: 0 }}>Orders</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%', display: 'inline-block',
              background: liveConnected ? '#10b981' : '#6b7280',
              boxShadow: liveConnected ? '0 0 0 3px rgba(16,185,129,0.25)' : 'none',
              transition: 'all 0.3s'
            }} />
            <span style={{ fontSize: '12px', color: 'var(--gray)', fontWeight: 500 }}>
              {liveConnected ? 'Live' : 'Reconnecting…'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'pending', 'preparing', 'ready', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(s)}
              style={{ textTransform: 'capitalize' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Table</th>
                <th>Payment</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td style={{ fontWeight: '600' }}>{order.orderNumber}</td>
                  <td>{order.customerName}</td>
                  <td style={{ textTransform: 'capitalize' }}>{order.orderType}</td>
                  <td>{order.tableNumber || '-'}</td>
                  <td>
                    {(() => {
                      const p = getPaymentInfo(order.payment)
                      return (
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '12px',
                          fontWeight: 600, background: p.bg, color: p.color,
                          border: `1px solid ${p.border}`, whiteSpace: 'nowrap'
                        }}>{p.label}</span>
                      )
                    })()}
                  </td>
                  <td>{order.items.length} items</td>
                  <td style={{ fontWeight: '600', color: 'var(--primary)' }}>₹{order.total.toFixed(2)}</td>
                  <td><span className={`badge ${getStatusBadge(order.status)}`}>{getStatusLabel(order.status)}</span></td>
                  <td>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => setSelectedOrder(order)}>View</button>
                    {order.status === 'pending' && (
                      <button
                        className="btn btn-sm btn-success"
                        style={{ marginLeft: '8px' }}
                        onClick={() => updateStatus(order._id, 'confirmed')}
                      >
                        Confirm
                      </button>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ marginLeft: '8px' }}
                        onClick={() => updateStatus(order._id, 'preparing')}
                      >
                        Start
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        className="btn btn-sm btn-success"
                        style={{ marginLeft: '8px' }}
                        onClick={() => updateStatus(order._id, 'ready')}
                      >
                        Ready
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        className="btn btn-sm"
                        style={{
                          marginLeft: '8px',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          color: '#fff', border: 'none', borderRadius: '6px',
                          padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600
                        }}
                        onClick={() => setTokenVerifyOrder(order)}
                      >
                        🎫 Verify Token
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedOrder.orderNumber}</h3>
              <button className="modal-close" onClick={() => setSelectedOrder(null)}>&times;</button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
              <p><strong>Type:</strong> {selectedOrder.orderType}</p>
              <p><strong>Table:</strong> {selectedOrder.tableNumber || 'N/A'}</p>
              <p><strong>Payment:</strong> {selectedOrder.payment?.method === 'cod' ? 'Cash on Delivery' : selectedOrder.payment?.method === 'cash_at_counter' ? 'Cash at Counter' : selectedOrder.payment?.method}</p>
              <p><strong>Status:</strong> <span className={`badge ${getStatusBadge(selectedOrder.status)}`}>{getStatusLabel(selectedOrder.status)}</span></p>
              {selectedOrder.receiveToken && selectedOrder.status !== 'completed' && (
                <p>
                  <strong>Pickup Token:</strong>{' '}
                  <span style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', padding: '4px 12px', borderRadius: '6px',
                    fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', letterSpacing: '3px'
                  }}>
                    {selectedOrder.receiveToken}
                  </span>
                </p>
              )}
              {selectedOrder.status === 'completed' && (
                <p style={{ color: '#10b981', fontWeight: 600 }}>✅ Token verified — Order received by customer</p>
              )}
            </div>
            <h4 style={{ marginBottom: '12px' }}>Items</h4>
            {selectedOrder.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{item.name} x {item.quantity}</span>
                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700' }}>
                <span>Total</span>
                <span>₹{selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>
            {selectedOrder.specialInstructions && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '8px' }}>
                <strong>Special Instructions:</strong> {selectedOrder.specialInstructions}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
