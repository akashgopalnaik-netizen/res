import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { menuAPI } from '../utils/api'

export default function Home() {
  const [featuredItems, setFeaturedItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [menuRes, categoriesRes] = await Promise.all([
        menuAPI.getAll({ isFeatured: true, limit: 6 }),
        menuAPI.getCategories()
      ])
      setFeaturedItems(menuRes.data.data.menuItems)
      setCategories(categoriesRes.data.data.categories)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <h1>Welcome to FoodHub</h1>
        <p>Delicious food delivered to your table</p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link to="/menu" className="btn btn-lg" style={{ background: 'white', color: 'var(--primary)' }}>
            Order Now
          </Link>
          <Link to="/reservations" className="btn btn-lg" style={{ border: '2px solid white', color: 'white' }}>
            Book a Table
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="container" style={{ padding: '40px 20px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '24px', textAlign: 'center' }}>Browse Categories</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px'
        }}>
          {categories.map((cat) => (
            <Link
              key={cat._id}
              to={`/menu?category=${cat._id}`}
              className="card"
              style={{
                padding: '24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'transform 0.2s'
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>
                {cat._id === 'appetizer' && '🥗'}
                {cat._id === 'main' && '🍖'}
                {cat._id === 'dessert' && '🍰'}
                {cat._id === 'beverage' && '🥤'}
                {cat._id === 'side' && '🍟'}
                {cat._id === 'special' && '⭐'}
              </div>
              <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                {cat._id}
              </div>
              <div style={{ color: 'var(--gray)', fontSize: '14px' }}>
                {cat.count} items
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Items */}
      <section className="container" style={{ padding: '40px 20px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '24px', textAlign: 'center' }}>Featured Items</h2>

        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : (
          <div className="menu-grid">
            {featuredItems.map((item) => (
              <Link key={item._id} to={`/menu`} className="menu-item">
                <img
                  src={item.images?.[0]?.url || 'https://via.placeholder.com/300x200?text=Food'}
                  alt={item.name}
                  className="menu-item-image"
                />
                <div className="menu-item-content">
                  <div className="menu-item-name">{item.name}</div>
                  <div className="menu-item-description">{item.description}</div>
                  <div className="menu-item-footer">
                    <span className="menu-item-price">${item.price.toFixed(2)}</span>
                    <span className="badge badge-primary">Featured</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <Link to="/menu" className="btn btn-primary btn-lg">
            View Full Menu
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{
        background: 'var(--secondary)',
        color: 'white',
        padding: '60px 20px',
        marginTop: '40px'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '32px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Fast Service</h3>
              <p style={{ opacity: 0.8 }}>Quick delivery to your table</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍🍳</div>
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Expert Chefs</h3>
              <p style={{ opacity: 0.8 }}>Prepared by professional chefs</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥗</div>
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Fresh Ingredients</h3>
              <p style={{ opacity: 0.8 }}>Only the finest quality ingredients</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
              <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Easy Payment</h3>
              <p style={{ opacity: 0.8 }}>Multiple payment options available</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
