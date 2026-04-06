import { useEffect, useState } from 'react'
import { orderAPI } from '../utils/api'
import toast from 'react-hot-toast'

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)

  useEffect(() => {
    loadOrders()
  }, [filter])

  const loadOrders = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {}
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px' }}>Orders</h1>
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
                  <td>{order.items.length} items</td>
                  <td style={{ fontWeight: '600', color: 'var(--primary)' }}>${order.total.toFixed(2)}</td>
                  <td><span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span></td>
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
              {selectedOrder.receiveToken && (
                <p><strong>Receive Token:</strong> <span style={{ background: '#e0e7ff', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{selectedOrder.receiveToken}</span></p>
              )}
            </div>
            <h4 style={{ marginBottom: '12px' }}>Items</h4>
            {selectedOrder.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>{item.name} x {item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '700' }}>
                <span>Total</span>
                <span>${selectedOrder.total.toFixed(2)}</span>
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
