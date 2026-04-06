import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../context/store'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex' }}>
      <aside className="sidebar">
        <div className="sidebar-logo">🍽️ FoodHub Admin</div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>📊 Dashboard</NavLink>
          <NavLink to="/orders">📦 Orders</NavLink>
          <NavLink to="/kitchen">👨‍🍳 Kitchen</NavLink>
          <NavLink to="/menu">📖 Menu</NavLink>
          <NavLink to="/tables">🪑 Tables</NavLink>
          <NavLink to="/reservations">📅 Reservations</NavLink>
          <NavLink to="/inventory">📦 Inventory</NavLink>
          {user?.role === 'admin' && <NavLink to="/staff">👥 Staff</NavLink>}
          {user?.role !== 'staff' && <NavLink to="/reports">📈 Reports</NavLink>}
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div>
            <h2 style={{ fontSize: '20px' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '600' }}>{user?.name}</div>
              <div style={{ fontSize: '13px', color: 'var(--gray)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  )
}
