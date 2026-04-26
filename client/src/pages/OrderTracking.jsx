import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { orderAPI } from '../utils/api'
import { io } from 'socket.io-client'

const statusSteps = [
  { status: 'pending', label: 'Order Placed', icon: '📋' },
  { status: 'confirmed', label: 'Order Confirmed', icon: '✅' },
  { status: 'preparing', label: 'Being Prepared', icon: '👨‍🍳' },
  { status: 'ready', label: 'Ready for Pickup!', icon: '🍽️' },
  { status: 'completed', label: 'Order Received ✓', icon: '✨' }
]

export default function OrderTracking() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrder()

    // Connect to socket for real-time updates
    const socket = io(window.location.origin)
    socket.emit('join-order', id)

    socket.on('order-status-update', (data) => {
      setOrder((prev) => ({
        ...prev,
        status: data.status,
        timeline: [...prev.timeline, {
          status: data.status,
          timestamp: data.timestamp,
          note: 'Status updated'
        }]
      }))
    })

    return () => {
      socket.disconnect()
    }
  }, [id])

  const loadOrder = async () => {
    try {
      const res = await orderAPI.getById(id)
      setOrder(res.data.data.order)
    } catch (error) {
      console.error('Failed to load order:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading"><div className="spinner"></div></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2>Order not found</h2>
      </div>
    )
  }

  const currentStepIndex = statusSteps.findIndex(s => s.status === order.status)

  return (
      <div className="order-tracking">
      {/* Received celebration banner */}
      {order.status === 'completed' && (
        <div style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          borderRadius: '16px', padding: '24px', marginBottom: '24px',
          textAlign: 'center', boxShadow: '0 8px 32px rgba(16,185,129,0.3)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '6px' }}>Order Received!</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px' }}>Thank you! Your order has been collected. Enjoy your meal!</p>
        </div>
      )}

      {/* "Ready for pickup" alert banner */}
      {order.status === 'ready' && (
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: '16px', padding: '20px', marginBottom: '24px',
          textAlign: 'center', boxShadow: '0 8px 32px rgba(99,102,241,0.3)'
        }}>
          <div style={{ fontSize: '40px', marginBottom: '6px' }}>🛒</div>
          <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Your order is ready!</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>Please show your token to the staff to collect your order.</p>
        </div>
      )}

      <div className="order-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div className="order-number">{order.orderNumber}</div>
          {order.receiveToken && order.status !== 'completed' && (
            <div style={{ background: 'var(--primary)', color: 'white', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}>
              🎫 Token: {order.receiveToken}
            </div>
          )}
        </div>
        <p style={{ color: 'var(--gray)', marginBottom: '16px' }}>
          Placed on {new Date(order.createdAt).toLocaleString()}
        </p>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--gray)' }}>Order Type</div>
            <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>{order.orderType}</div>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--gray)' }}>Table</div>
            <div style={{ fontWeight: '600' }}>{order.tableNumber || 'N/A'}</div>
          </div>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--gray)' }}>Total</div>
            <div style={{ fontWeight: '700', color: 'var(--primary)' }}>₹{order.total.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="timeline">
        <h3 style={{ marginBottom: '24px' }}>Order Status</h3>

        {statusSteps.map((step, index) => (
          <div
            key={step.status}
            className={`timeline-item ${index < currentStepIndex ? 'completed' : ''} ${index === currentStepIndex ? 'active' : ''}`}
          >
            <div className="timeline-icon">
              {index < currentStepIndex ? '✓' : step.icon}
            </div>
            <div className="timeline-content">
              <div className="timeline-title">{step.label}</div>
              {index <= currentStepIndex && order.timeline?.find(t => t.status === step.status) && (
                <div className="timeline-time">
                  {new Date(order.timeline.find(t => t.status === step.status).timestamp).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Order Items</h3>
        {order.items.map((item, idx) => (
          <div key={idx} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderBottom: idx < order.items.length - 1 ? '1px solid var(--border)' : 'none'
          }}>
            <span>{item.name} x {item.quantity}</span>
            <span>₹{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {order.specialInstructions && (
        <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
          <h3 style={{ marginBottom: '8px' }}>Special Instructions</h3>
          <p style={{ color: 'var(--gray)' }}>{order.specialInstructions}</p>
        </div>
      )}
    </div>
  )
}
