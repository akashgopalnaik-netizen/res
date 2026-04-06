import { useEffect, useState } from 'react'
import { orderAPI } from '../utils/api'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([])

  useEffect(() => {
    loadOrders()

    // Connect to socket for real-time updates
    const socket = io(window.location.origin)
    socket.emit('join-kitchen')

    socket.on('new-order', (data) => {
      setOrders((prev) => [data.order, ...prev])
      toast.success('New order received!')
    })

    socket.on('order-status-changed', () => {
      loadOrders()
    })

    return () => {
      socket.disconnect()
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
      loadOrders()
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px' }}>Kitchen Display System</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '50%', display: 'inline-block' }}></span>
          <span style={{ fontSize: '14px', color: 'var(--gray)' }}>Live Updates</span>
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
                    <span className="badge badge-success" style={{ padding: '8px 16px' }}>
                      ✓ Ready for Pickup
                    </span>
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
