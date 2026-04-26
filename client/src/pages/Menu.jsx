import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { menuAPI, aiAPI } from '../utils/api'
import { useCartStore } from '../context/store'
import toast from 'react-hot-toast'

export default function Menu() {
  const [searchParams] = useSearchParams()
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  const [searchQuery, setSearchQuery] = useState('')
  const [aiMode, setAiMode] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [aiAvailable, setAiAvailable] = useState(false)

  const addItem = useCartStore((state) => state.addItem)

  // Check AI availability on mount
  useEffect(() => {
    aiAPI.status()
      .then(res => setAiAvailable(res.data.data.gemini && res.data.data.chromadb))
      .catch(() => setAiAvailable(false))
  }, [])

  useEffect(() => {
    if (!aiMode) loadData()
  }, [selectedCategory, aiMode])

  const loadData = async () => {
    setLoading(true)
    setAiSummary('')
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

  const handleAiSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    setAiSummary('')
    try {
      const res = await aiAPI.search({ query: searchQuery.trim(), limit: 8 })
      const { menuItems: items, summary } = res.data.data
      setMenuItems(items)
      setAiSummary(summary || '')
    } catch (err) {
      const msg = err.response?.data?.message || 'AI search failed'
      toast.error(msg)
      setMenuItems([])
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

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') {
      if (aiMode) handleAiSearch()
    }
  }

  const toggleAiMode = () => {
    const next = !aiMode
    setAiMode(next)
    setSearchQuery('')
    setAiSummary('')
    if (!next) loadData()
  }

  return (
    <div className="container" style={{ padding: '40px 20px' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '24px' }}>Our Menu</h1>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px', display: 'flex', gap: '8px', position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder={aiMode ? '🔍 Describe what you want (e.g. "light vegetarian dish")…' : '🔍 Search menu…'}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: '12px',
              background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-primary)', fontSize: '14px', outline: 'none'
            }}
          />
          {aiMode && (
            <button
              className="btn btn-primary"
              onClick={handleAiSearch}
              disabled={loading || !searchQuery.trim()}
              style={{ borderRadius: '12px', padding: '10px 20px', whiteSpace: 'nowrap' }}
            >
              Search
            </button>
          )}
        </div>

        {/* AI Toggle */}
        <button
          onClick={toggleAiMode}
          title={aiAvailable ? 'Toggle AI semantic search' : 'AI search not available (check GEMINI_API_KEY + ChromaDB)'}
          style={{
            padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: aiMode
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : 'rgba(99,102,241,0.12)',
            color: aiMode ? '#fff' : '#a5b4fc',
            fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
            transition: 'all 0.2s',
            border: aiMode ? 'none' : '1px solid rgba(99,102,241,0.3)',
            opacity: aiAvailable ? 1 : 0.5
          }}
        >
          🤖 AI Search {aiMode ? 'ON' : 'OFF'}
          {!aiAvailable && <span style={{ fontSize: '10px', opacity: 0.7 }}>Unavailable</span>}
        </button>
      </div>

      {/* AI Result Summary banner */}
      {aiSummary && (
        <div style={{
          marginBottom: '24px', padding: '14px 18px', borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
          border: '1px solid rgba(99,102,241,0.3)',
          color: '#c4b5fd', fontSize: '14px', lineHeight: 1.6
        }}>
          <span style={{ fontWeight: 600, color: '#a5b4fc' }}>🤖 AI says: </span>
          {aiSummary}
        </div>
      )}

      {/* Category Filter (hidden in AI mode) */}
      {!aiMode && (
        <div style={{
          display: 'flex', gap: '12px', marginBottom: '32px',
          flexWrap: 'wrap', overflowX: 'auto'
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
      )}

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
                  <span style={{ display: 'flex', gap: '4px' }}>
                    {item.isVeg && <span title="Vegetarian" style={{ color: 'var(--success)' }}>🌱</span>}
                    {item.isSpicy && <span title="Spicy" style={{ color: 'var(--danger)' }}>🌶️</span>}
                  </span>
                </div>
                <div className="menu-item-description">{item.description}</div>
                {item.allergens?.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--gray)', marginBottom: '8px' }}>
                    ⚠️ {item.allergens.join(', ')}
                  </div>
                )}
                {item.preparationTime && (
                  <div style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '12px' }}>
                    ⏱️ {item.preparationTime} mins
                  </div>
                )}
                <div className="menu-item-footer">
                  <span className="menu-item-price">₹{item.price.toFixed(2)}</span>
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
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>{aiMode ? '🤖' : '🍽️'}</div>
          <p>{aiMode ? `No results found for "${searchQuery}". Try a different description.` : 'No items found in this category'}</p>
        </div>
      )}
    </div>
  )
}
