import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { menuAPI } from '../utils/api'
import { useCartStore } from '../context/store'
import toast from 'react-hot-toast'

export default function Menu() {
  const [searchParams] = useSearchParams()
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')

  const addItem = useCartStore((state) => state.addItem)

  useEffect(() => {
    loadData()
  }, [selectedCategory])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = selectedCategory ? { category: selectedCategory } : {}
      const [menuRes, categoriesRes] = await Promise.all([
        menuAPI.getAll(params),
        menuAPI.getCategories()
      ])
      setMenuItems(menuRes.data.data.menuItems)
      setCategories(categoriesRes.data.data.categories)
    } catch (error) {
      toast.error('Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (item) => {
    addItem({
      menuItem: item._id,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.images?.[0]?.url
    })
    toast.success(`${item.name} added to cart!`)
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '24px' }}>Our Menu</h1>

      {/* Category Filter */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        flexWrap: 'wrap',
        overflowX: 'auto'
      }}>
        <button
          className={`btn ${!selectedCategory ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setSelectedCategory('')}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat._id}
            className={`btn ${selectedCategory === cat._id ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedCategory(cat._id)}
            style={{ textTransform: 'capitalize' }}
          >
            {cat._id}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <div className="menu-grid">
          {menuItems.map((item) => (
            <div key={item._id} className="menu-item">
              <img
                src={item.images?.[0]?.url || 'https://via.placeholder.com/300x200?text=Food'}
                alt={item.name}
                className="menu-item-image"
              />
              <div className="menu-item-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span className="menu-item-name">{item.name}</span>
                  {item.isVeg && <span style={{ color: 'var(--success)' }}>🌱</span>}
                  {item.isSpicy && <span style={{ color: 'var(--danger)' }}>🌶️</span>}
                </div>
                <div className="menu-item-description">{item.description}</div>
                {item.preparationTime && (
                  <div style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '12px' }}>
                    ⏱️ {item.preparationTime} mins
                  </div>
                )}
                <div className="menu-item-footer">
                  <span className="menu-item-price">${item.price.toFixed(2)}</span>
                  <button
                    className="add-to-cart"
                    onClick={() => handleAddToCart(item)}
                    disabled={!item.isAvailable}
                  >
                    {item.isAvailable ? 'Add to Cart' : 'Unavailable'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {menuItems.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍽️</div>
          <p>No items found in this category</p>
        </div>
      )}
    </div>
  )
}
