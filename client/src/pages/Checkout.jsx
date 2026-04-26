import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore, useAuthStore } from '../context/store'
import { orderAPI, paymentAPI } from '../utils/api'
import toast from 'react-hot-toast'

/* ── Token Modal ─────────────────────────────────────────────────────────── */
function TokenModal({ token, orderNumber, orderId, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: 'var(--card-bg, #1a1a2e)',
        border: '1px solid var(--border, #2a2a4a)',
        borderRadius: '24px', padding: '48px 40px',
        maxWidth: '440px', width: '100%', textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Success animation */}
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', fontSize: '36px',
          boxShadow: '0 0 30px rgba(16,185,129,0.4)'
        }}>✓</div>

        <h2 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '8px', color: 'var(--text, #fff)' }}>
          Order Placed! 🎉
        </h2>
        <p style={{ color: 'var(--gray, #9ca3af)', marginBottom: '32px', fontSize: '15px' }}>
          Order <strong style={{ color: 'var(--text, #fff)' }}>#{orderNumber}</strong> confirmed
        </p>

        {/* Token badge */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: '16px', padding: '28px 24px', marginBottom: '32px',
          boxShadow: '0 8px 32px rgba(99,102,241,0.4)'
        }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', letterSpacing: '2px', marginBottom: '12px', textTransform: 'uppercase' }}>
            Your Pickup Token
          </p>
          <div style={{ fontSize: '52px', fontWeight: 800, letterSpacing: '8px', color: '#fff', fontFamily: 'monospace' }}>
            {token}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '12px' }}>
            Show this token to collect your order
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-outline"
            style={{ flex: 1 }}
            onClick={() => { navigator.clipboard?.writeText(token); toast.success('Token copied!') }}
          >
            Copy Token
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Track Order
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Payment Method Card ─────────────────────────────────────────────────── */
function PaymentCard({ id, selected, onClick, icon, title, subtitle, badge }) {
  return (
    <div
      id={id}
      onClick={onClick}
      style={{
        flex: '1 1 200px', padding: '20px', borderRadius: '16px', cursor: 'pointer',
        border: `2px solid ${selected ? '#6366f1' : 'var(--border, #2a2a4a)'}`,
        background: selected
          ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))'
          : 'var(--card-bg, transparent)',
        transition: 'all 0.2s',
        position: 'relative',
        boxShadow: selected ? '0 0 0 4px rgba(99,102,241,0.15)' : 'none'
      }}
    >
      {badge && (
        <span style={{
          position: 'absolute', top: '-10px', right: '12px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#fff', fontSize: '11px', fontWeight: 600,
          padding: '2px 10px', borderRadius: '20px', letterSpacing: '0.5px'
        }}>{badge}</span>
      )}
      <div style={{ fontSize: '32px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px', color: 'var(--text, #fff)' }}>{title}</div>
      <div style={{ fontSize: '13px', color: 'var(--gray, #9ca3af)', lineHeight: 1.4 }}>{subtitle}</div>
      {selected && (
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          width: '20px', height: '20px', borderRadius: '50%',
          background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', color: '#fff'
        }}>✓</div>
      )}
    </div>
  )
}

/* ── Main Checkout ───────────────────────────────────────────────────────── */
export default function Checkout() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const items = useCartStore((state) => state.items)
  const getSubtotal = useCartStore((state) => state.getSubtotal)
  const getTotal = useCartStore((state) => state.getTotal)
  const clearCart = useCartStore((state) => state.clearCart)

  const [orderType, setOrderType] = useState('dine-in')
  const [tableNumber, setTableNumber] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod') // 'cod' | 'stripe'
  const [processing, setProcessing] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState({ street: '', city: '' })

  // Token modal state
  const [tokenModal, setTokenModal] = useState(null) // { token, orderNumber, orderId }

  const subtotal = getSubtotal()
  const tax = subtotal * 0.08
  const total = getTotal()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (items.length === 0) { toast.error('Your cart is empty'); return }
    setProcessing(true)

    try {
      // Build order payload
      const codMethod = orderType === 'delivery' ? 'cod' : 'cash_at_counter'
      const orderData = {
        orderType,
        paymentMethod: paymentMethod === 'stripe' ? 'stripe' : codMethod,
        items: items.map(item => ({
          menuItem: item.menuItem,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || ''
        })),
        specialInstructions,
        tableId: orderType === 'dine-in' && tableNumber ? tableNumber : undefined,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined
      }

      // Step 1: Create the order
      const orderRes = await orderAPI.create(orderData)
      const order = orderRes.data.data.order

      if (paymentMethod === 'stripe') {
        // Step 2a: Create Stripe Checkout Session → redirect
        const sessionRes = await paymentAPI.createCheckoutSession({ orderId: order._id })
        const { url } = sessionRes.data.data
        clearCart()
        // Hard redirect to Stripe hosted page
        window.location.href = url

      } else {
        // Step 2b: COD / Cash — show token modal
        clearCart()
        setTokenModal({
          token: order.receiveToken,
          orderNumber: order.orderNumber,
          orderId: order._id
        })
      }

    } catch (error) {
      console.error('Checkout error:', error)
      toast.error(error.response?.data?.message || 'Failed to place order')
    } finally {
      setProcessing(false)
    }
  }

  const handleTokenClose = () => {
    navigate(`/orders/${tokenModal.orderId}`)
    setTokenModal(null)
  }

  return (
    <>
      {/* Token modal overlay */}
      {tokenModal && (
        <TokenModal
          token={tokenModal.token}
          orderNumber={tokenModal.orderNumber}
          orderId={tokenModal.orderId}
          onClose={handleTokenClose}
        />
      )}

      <div className="container" style={{ padding: '40px 20px', maxWidth: '800px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Checkout</h1>
        <p style={{ color: 'var(--gray)', marginBottom: '32px' }}>
          {items.length} item{items.length !== 1 ? 's' : ''} · ₹{total.toFixed(2)} total
        </p>

        <form onSubmit={handleSubmit}>
          {/* ── Order Type ───────────────────────────────────────── */}
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Order Type</h2>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {['dine-in', 'takeout', 'delivery'].map((type) => (
                <button
                  key={type} type="button"
                  className={`btn ${orderType === type ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setOrderType(type)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {type === 'dine-in' ? '🍽️' : type === 'takeout' ? '🥡' : '🚚'} {type.replace('-', ' ')}
                </button>
              ))}
            </div>

            {orderType === 'dine-in' && (
              <div className="input-group" style={{ marginTop: '16px' }}>
                <label>Table Number</label>
                <input
                  type="text" value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Enter your table number"
                />
              </div>
            )}

            {orderType === 'delivery' && (
              <>
                <div className="input-group" style={{ marginTop: '16px' }}>
                  <label>Street Address</label>
                  <input
                    type="text"
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress(p => ({ ...p, street: e.target.value }))}
                    placeholder="123 Main St"
                    required
                  />
                </div>
                <div className="input-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress(p => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                    required
                  />
                </div>
              </>
            )}
          </div>

          {/* ── Payment Method ───────────────────────────────────── */}
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Payment Method</h2>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <PaymentCard
                id="pay-cod"
                selected={paymentMethod === 'cod'}
                onClick={() => setPaymentMethod('cod')}
                icon={orderType === 'delivery' ? '🚚' : '🏪'}
                title={orderType === 'delivery' ? 'Cash on Delivery' : 'Cash at Counter'}
                subtitle="Pay when you collect. Get your token instantly."
                badge="Instant Token"
              />
              <PaymentCard
                id="pay-stripe"
                selected={paymentMethod === 'stripe'}
                onClick={() => setPaymentMethod('stripe')}
                icon="💳"
                title="Card Payment"
                subtitle="Pay securely with credit or debit card via Stripe."
                badge="Secure"
              />
            </div>
            <p style={{
              marginTop: '14px', fontSize: '13px', color: 'var(--gray)',
              padding: '10px 14px', background: 'rgba(99,102,241,0.06)',
              borderRadius: '8px', borderLeft: '3px solid #6366f1'
            }}>
              {paymentMethod === 'cod'
                ? '✅ You will receive a unique 6-character token to collect your order.'
                : '🔒 You will be redirected to Stripe\'s secure checkout. Your token appears after payment.'}
            </p>
          </div>

          {/* ── Order Summary ────────────────────────────────────── */}
          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Order Summary</h2>

            {items.map((item) => (
              <div key={item._id || item.menuItem} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)'
              }}>
                <div>
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                  <span style={{ color: 'var(--gray)', fontSize: '13px' }}> ×{item.quantity}</span>
                </div>
                <span style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}

            <div style={{ marginTop: '16px', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--gray)' }}>
                <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--gray)' }}>
                <span>GST (5%)</span><span>₹{tax.toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '20px', fontWeight: 700,
                paddingTop: '12px', borderTop: '2px solid var(--border)'
              }}>
                <span>Total</span><span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* ── Special Instructions ─────────────────────────────── */}
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <div className="input-group">
              <label>Special Instructions <span style={{ color: 'var(--gray)', fontSize: '13px' }}>(optional)</span></label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any allergies, dietary requirements, or special requests?"
                rows="3"
              />
            </div>
          </div>

          <button
            id="checkout-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', fontSize: '16px', padding: '16px' }}
            disabled={processing || items.length === 0}
          >
            {processing
              ? (paymentMethod === 'stripe' ? '⏳ Redirecting to Stripe...' : '⏳ Placing Order...')
              : paymentMethod === 'stripe'
                ? `💳 Pay ₹${total.toFixed(2)} with Card`
                : `✅ Place Order · ₹${total.toFixed(2)}`
            }
          </button>
        </form>
      </div>
    </>
  )
}
