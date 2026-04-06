import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore, useAuthStore } from '../context/store'
import { orderAPI, paymentAPI } from '../utils/api'
import toast from 'react-hot-toast'

export default function Checkout() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const items = useCartStore((state) => state.items)
  const getSubtotal = useCartStore((state) => state.getSubtotal)
  const getTotal = useCartStore((state) => state.getTotal)
  const clearCart = useCartStore((state) => state.clearCart)

  const [orderType, setOrderType] = useState('dine-in')
  const [tableNumber, setTableNumber] = useState('')
  const [processing, setProcessing] = useState(false)
  const [specialInstructions, setSpecialInstructions] = useState('')

  const subtotal = getSubtotal()
  const tax = subtotal * 0.08
  const total = getTotal()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setProcessing(true)

    try {
      const paymentMethod = orderType === 'delivery' ? 'cod' : 'cash_at_counter';

      // Create order
      const orderData = {
        orderType,
        paymentMethod,
        items: items.map(item => ({
          menuItem: item.menuItem,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || ''
        })),
        specialInstructions,
        tableId: orderType === 'dine-in' && tableNumber ? tableNumber : undefined
      }

      const orderRes = await orderAPI.create(orderData)
      const order = orderRes.data.data.order

      clearCart()
      toast.success('Order placed successfully! Your Token is: ' + order.receiveToken)
      navigate(`/orders/${order._id}`)
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error(error.response?.data?.message || 'Failed to place order')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '32px' }}>Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Order Type</h2>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {['dine-in', 'takeout', 'delivery'].map((type) => (
              <button
                key={type}
                type="button"
                className={`btn ${orderType === type ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setOrderType(type)}
                style={{ textTransform: 'capitalize' }}
              >
                {type.replace('-', ' ')}
              </button>
            ))}
          </div>

          {orderType === 'dine-in' && (
            <div className="input-group" style={{ marginTop: '20px' }}>
              <label>Table Number</label>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Enter your table number"
              />
            </div>
          )}

          {orderType === 'delivery' && (
            <>
              <div className="input-group" style={{ marginTop: '20px' }}>
                <label>Delivery Address</label>
                <input type="text" placeholder="Street address" required={orderType === 'delivery'} />
              </div>
              <div className="input-group">
                <label>City</label>
                <input type="text" placeholder="City" required={orderType === 'delivery'} />
              </div>
            </>
          )}
        </div>

        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Payment Method</h2>
          <div style={{ padding: '16px', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <p style={{ margin: 0, fontWeight: '500' }}>
              {orderType === 'delivery' ? '🚚 Cash on Delivery (COD)' : '🏪 Cash at Counter'}
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: 'var(--gray)' }}>
              You will receive a unique Token Number to claim your order.
            </p>
          </div>
        </div>

        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Order Summary</h2>

          {items.map((item) => (
            <div key={item._id || item.menuItem} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: '1px solid var(--border)'
            }}>
              <span>{item.name} x {item.quantity}</span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}

          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '2px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: '700' }}>
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div className="input-group">
            <label>Special Instructions</label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any special requests or dietary requirements?"
              rows="3"
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          disabled={processing}
        >
          {processing ? 'Processing...' : `Place Order - $${total.toFixed(2)}`}
        </button>
      </form>
    </div>
  )
}
