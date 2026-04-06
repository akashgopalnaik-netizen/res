import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const status = searchParams.get('success')
    setSuccess(status === 'true')
  }, [searchParams])

  return (
    <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: '80px', marginBottom: '24px' }}>
        {success ? '🎉' : '❌'}
      </div>

      <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>
        {success ? 'Payment Successful!' : 'Payment Failed'}
      </h1>

      <p style={{ color: 'var(--gray)', fontSize: '18px', marginBottom: '32px' }}>
        {success
          ? 'Your order has been confirmed. Thank you for your purchase!'
          : 'Something went wrong with your payment. Please try again.'}
      </p>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <Link to="/my-orders" className="btn btn-primary btn-lg">
          View My Orders
        </Link>
        <Link to="/menu" className="btn btn-outline btn-lg">
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}
