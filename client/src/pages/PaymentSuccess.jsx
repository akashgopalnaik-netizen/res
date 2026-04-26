import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { paymentAPI } from '../utils/api'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'failed'
  const [orderInfo, setOrderInfo] = useState(null)
  const [copied, setCopied] = useState(false)

  const orderId = searchParams.get('orderId')
  const token = searchParams.get('token')
  const sessionId = searchParams.get('session_id')
  const cancelled = searchParams.get('cancelled')

  useEffect(() => {
    if (cancelled === 'true') {
      setStatus('failed')
      return
    }

    if (orderId && token) {
      // Verify payment status from server
      paymentAPI.getOrderPayment(orderId)
        .then(res => {
          const data = res.data.data
          setOrderInfo(data)
          setStatus(data.payment?.status === 'completed' ? 'success' : 'pending')
        })
        .catch(() => {
          // If API fails but we have token in URL, still show success
          if (token) setStatus('success')
          else setStatus('failed')
        })
    } else {
      setStatus('failed')
    }
  }, [orderId, token, cancelled])

  const handleCopy = () => {
    navigator.clipboard?.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (status === 'loading') {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'spin 1s linear infinite' }}>⏳</div>
        <p style={{ color: 'var(--gray)' }}>Confirming your payment...</p>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center', maxWidth: '500px' }}>
        <div style={{ fontSize: '80px', marginBottom: '24px' }}>❌</div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>Payment Failed</h1>
        <p style={{ color: 'var(--gray)', fontSize: '16px', marginBottom: '32px' }}>
          {cancelled === 'true'
            ? 'You cancelled the payment. Your order has been saved — try again when ready.'
            : 'Something went wrong with your payment. Please try again.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link to="/checkout" className="btn btn-primary btn-lg">Try Again</Link>
          <Link to="/my-orders" className="btn btn-outline btn-lg">My Orders</Link>
        </div>
      </div>
    )
  }

  // Success state
  return (
    <div className="container" style={{ padding: '60px 20px', maxWidth: '520px', textAlign: 'center' }}>
      {/* Success ring animation */}
      <div style={{
        width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 28px',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '44px', boxShadow: '0 0 40px rgba(16,185,129,0.4)'
      }}>✓</div>

      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '10px' }}>
        Payment Successful! 🎉
      </h1>
      <p style={{ color: 'var(--gray)', fontSize: '16px', marginBottom: '36px' }}>
        Your order has been confirmed and is being prepared.
      </p>

      {/* Token display */}
      {token && (
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: '20px', padding: '32px 28px', marginBottom: '28px',
          boxShadow: '0 12px 40px rgba(99,102,241,0.4)'
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.7)', fontSize: '12px',
            letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '14px'
          }}>
            Your Pickup Token
          </p>
          <div style={{
            fontSize: '56px', fontWeight: 800, letterSpacing: '10px',
            color: '#fff', fontFamily: 'monospace', marginBottom: '14px'
          }}>
            {token}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>
            Show this token when collecting your order
          </p>

          <button
            onClick={handleCopy}
            style={{
              marginTop: '16px', background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff', borderRadius: '8px', padding: '8px 20px',
              cursor: 'pointer', fontSize: '13px', fontWeight: 500,
              transition: 'background 0.2s'
            }}
          >
            {copied ? '✓ Copied!' : '📋 Copy Token'}
          </button>
        </div>
      )}

      {/* Order info */}
      {orderInfo && (
        <div className="card" style={{ padding: '20px', marginBottom: '28px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--gray)', fontSize: '14px' }}>Order Number</span>
            <span style={{ fontWeight: 600 }}>{orderInfo.orderNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--gray)', fontSize: '14px' }}>Amount Paid</span>
            <span style={{ fontWeight: 600, color: '#10b981' }}>₹{orderInfo.total?.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--gray)', fontSize: '14px' }}>Payment Method</span>
            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
              {orderInfo.payment?.method?.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {orderId && (
          <Link to={`/orders/${orderId}`} className="btn btn-primary btn-lg">
            Track Order
          </Link>
        )}
        <Link to="/menu" className="btn btn-outline btn-lg">
          Order More
        </Link>
      </div>
    </div>
  )
}
