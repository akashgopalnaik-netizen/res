import { useEffect, useState } from 'react'
import { orderAPI } from '../utils/api'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([])
  const [connected, setConnected] = useState(false)
  const [ticker, setTicker] = useState(0) // force re-render every minute to update elapsed times

  useEffect(() => {
    loadOrders()

    // ── Socket.io real-time updates ─────────────────────────────────────
    const socket = io(window.location.origin)
    socket.emit('join-kitchen')

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('new-order', (data) => {
      setOrders((prev) => [data.order, ...prev])
      toast.success(`🔔 New order: ${data.order.orderNumber}`, { duration: 5000 })
    })

    socket.on('order-status-changed', ({ order }) => {
      // If order is now completed (token verified by staff) — remove from kitchen display
      if (order?.status === 'completed' || order?.status === 'cancelled') {
        setOrders((prev) => prev.filter(o => o._id !== order._id))
        if (order.status === 'completed') {
          toast.success(`✅ Order ${order.orderNumber} picked up!`, { duration: 4000 })
        }
      } else {
        // Otherwise just refresh the list
        loadOrders()
      }
    })

    socket.on('order-cancelled', ({ order }) => {
      if (order?._id) {
        setOrders((prev) => prev.filter(o => o._id !== order._id))
        toast(`❌ Order ${order.orderNumber} cancelled`, { duration: 3000 })
      } else {
        loadOrders()
      }
    })

    // Re-render every 60 seconds so elapsed times stay accurate
    const timerId = setInterval(() => setTicker(t => t + 1), 60000)

    return () => {
      socket.disconnect()
      clearInterval(timerId)
    }
  }, [])

  const loadOrders = async () => {
    try {
      const res = await orderAPI.getKitchenDisplay()
      setOrders(res.data.data.orders)
    } catch (error) {
      console.error('Failed to load kitchen orders:', error)
    }
  }

  const updateStatus = async (orderId, status) => {
    try {
      await orderAPI.updateStatus(orderId, { status })
      toast.success(`Order marked as ${status}`)
      // Socket will handle the UI update via 'order-status-changed'
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const getTimeElapsed = (createdAt) => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
    if (elapsed < 10) return { text: `${elapsed}m`, color: 'var(--success)' }
    if (elapsed < 20) return { text: `${elapsed}m`, color: 'var(--warning)' }
    return { text: `${elapsed}m`, color: 'var(--danger)' }
  }

  const getPaymentInfo = (payment) => {
    const method = payment?.method || 'pending'
    const isPaid = payment?.status === 'completed'
    if (method === 'stripe') return { label: '💳 Card' + (isPaid ? ' ✓' : ''), color: '#6366f1', bg: 'rgba(99,102,241,0.15)' }
    if (method === 'cod') return { label: '💵 COD', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' }
    if (method === 'cash_at_counter') return { label: '💵 Cash', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' }
    return { label: '⏳', color: '#6b7280', bg: 'rgba(107,114,128,0.15)' }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px' }}>Kitchen Display System</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            width: '12px', height: '12px', borderRadius: '50%', display: 'inline-block',
            background: connected ? 'var(--success)' : '#6b7280',
            boxShadow: connected ? '0 0 0 4px rgba(16,185,129,0.2)' : 'none',
            transition: 'all 0.3s'
          }} />
          <span style={{ fontSize: '14px', color: 'var(--gray)' }}>
            {connected ? 'Live Updates' : 'Reconnecting…'}
          </span>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>👨‍🍳</div>
          <h2>No active orders</h2>
          <p style={{ color: 'var(--gray)' }}>Orders will appear here in real-time</p>
        </div>
      ) : (
        <div className="kitchen-grid">
          {orders.map((order) => {
            const timeInfo = getTimeElapsed(order.createdAt)
            return (
              <div key={order._id} className={`order-card ${order.status}`}>
                <div className="order-card-header">
                  <div>
                    <div className="order-number">{order.orderNumber}</div>
                    <div style={{ color: 'var(--gray)', fontSize: '13px' }}>
                      {order.orderType} • Table {order.tableNumber || 'N/A'}
                    </div>
                    {/* Payment method pill */}
                    {(() => {
                      const p = getPaymentInfo(order.payment)
                      return (
                        <span style={{
                          display: 'inline-block', marginTop: '6px',
                          padding: '2px 8px', borderRadius: '20px', fontSize: '11px',
                          fontWeight: 700, background: p.bg, color: p.color
                        }}>{p.label}</span>
                      )
                    })()}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '700', color: timeInfo.color }}>{timeInfo.text}</div>
                    <div style={{ fontSize: '12px', color: 'var(--gray)' }}>elapsed</div>
                  </div>
                </div>

                <div className="order-items-list">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="order-item-row">
                      <span>
                        <strong>{item.quantity}x</strong> {item.name}
                        {item.specialInstructions && (
                          <div style={{ fontSize: '12px', color: 'var(--danger)' }}>
                            ⚠️ {item.specialInstructions}
                          </div>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {order.status === 'pending' && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => updateStatus(order._id, 'preparing')}
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      className="btn btn-success btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => updateStatus(order._id, 'ready')}
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <span className="badge badge-success" style={{ padding: '8px 16px', display: 'block', marginBottom: '6px' }}>
                        ✓ Ready for Pickup
                      </span>
                      <div style={{ fontSize: '11px', color: 'var(--gray)' }}>
                        🎫 Waiting for customer token
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
