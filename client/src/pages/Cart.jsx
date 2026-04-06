import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../context/store'
import toast from 'react-hot-toast'

export default function Cart() {
  const navigate = useNavigate()
  const items = useCartStore((state) => state.items)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const getSubtotal = useCartStore((state) => state.getSubtotal)
  const getTotal = useCartStore((state) => state.getTotal)
  const clearCart = useCartStore((state) => state.clearCart)

  const subtotal = getSubtotal()
  const tax = subtotal * 0.08
  const total = getTotal()

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    navigate('/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>🛒</div>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Your cart is empty</h2>
        <p style={{ color: 'var(--gray)', marginBottom: '32px' }}>
          Looks like you haven't added anything yet
        </p>
        <Link to="/menu" className="btn btn-primary btn-lg">
          Browse Menu
        </Link>
      </div>
    )
  }

  return (
    <div className="cart-container">
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>Shopping Cart</h1>

      <div className="cart-items">
        {items.map((item) => (
          <div key={item._id || item.menuItem} className="cart-item">
            <img
              src={item.image || 'https://via.placeholder.com/80?text=Food'}
              alt={item.name}
              className="cart-item-image"
            />
            <div className="cart-item-details">
              <div className="cart-item-name">{item.name}</div>
              <div className="cart-item-price">${item.price.toFixed(2)}</div>
              <div className="cart-item-quantity">
                <button
                  className="qty-btn"
                  onClick={() => updateQuantity(item.menuItem || item._id, item.quantity - 1)}
                >
                  -
                </button>
                <span style={{ fontWeight: '600', minWidth: '32px', textAlign: 'center' }}>
                  {item.quantity}
                </span>
                <button
                  className="qty-btn"
                  onClick={() => updateQuantity(item.menuItem || item._id, item.quantity + 1)}
                >
                  +
                </button>
                <button
                  className="btn btn-outline"
                  style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '13px' }}
                  onClick={() => {
                    removeItem(item.menuItem || item._id)
                    toast.success('Item removed')
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
            <div style={{ fontWeight: '700', fontSize: '18px' }}>
              ${(item.price * item.quantity).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Tax (8%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="summary-row total">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: '100%', marginTop: '24px' }}
          onClick={handleCheckout}
        >
          Proceed to Checkout
        </button>

        <Link
          to="/menu"
          className="btn btn-outline"
          style={{ width: '100%', marginTop: '12px' }}
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}
