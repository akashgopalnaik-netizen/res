import { Link, useNavigate } from 'react-router-dom'
import { useCartStore, useAuthStore } from '../context/store'

export default function Header() {
  const itemCount = useCartStore((state) => state.getItemCount())
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          🍽️ FoodHub
        </Link>

        <nav className="nav-links">
          <Link to="/menu">Menu</Link>
          <Link to="/reservations">Reservations</Link>

          {user ? (
            <>
              <Link to="/my-orders">My Orders</Link>
              <Link to="/profile">{user.name}</Link>
              <button onClick={handleLogout} className="btn btn-outline">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary">
                Sign Up
              </Link>
            </>
          )}

          <Link to="/cart" className="cart-icon">
            🛒
            {itemCount > 0 && (
              <span className="cart-badge">{itemCount}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}
