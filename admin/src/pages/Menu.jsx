import { useEffect, useState } from 'react'
import { menuAPI } from '../utils/api'
import toast from 'react-hot-toast'

export default function Menu() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'main',
    price: '',
    isVeg: true,
    isSpicy: false,
    preparationTime: 15
  })

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      const res = await menuAPI.getAll({ limit: 100 })
      setItems(res.data.data.menuItems)
    } catch (error) {
      toast.error('Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingItem) {
        await menuAPI.update(editingItem._id, formData)
        toast.success('Item updated')
      } else {
        await menuAPI.create(formData)
        toast.success('Item created')
      }
      setShowModal(false)
      setEditingItem(null)
      setFormData({ name: '', description: '', category: 'main', price: '', isVeg: true, isSpicy: false, preparationTime: 15 })
      loadItems()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save item')
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price.toString(),
      isVeg: item.isVeg,
      isSpicy: item.isSpicy,
      preparationTime: item.preparationTime || 15
    })
    setShowModal(true)
  }

  const handleToggleAvailability = async (item) => {
    try {
      await menuAPI.toggleAvailability(item._id)
      toast.success(`Item ${item.isAvailable ? 'unavailable' : 'available'}`)
      loadItems()
    } catch (error) {
      toast.error('Failed to update availability')
    }
  }

  const handleDelete = async (item) => {
    if (!confirm(`Remove "${item.name}" from menu?`)) return

    try {
      await menuAPI.delete(item._id)
      toast.success('Item removed')
      loadItems()
    } catch (error) {
      toast.error('Failed to remove item')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px' }}>Menu Management</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Item</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Price</th>
                <th>Dietary</th>
                <th>Prep Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div style={{ fontWeight: '600' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--gray)' }}>{item.description.substring(0, 50)}...</div>
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{item.category}</td>
                  <td style={{ fontWeight: '600' }}>${item.price.toFixed(2)}</td>
                  <td>
                    {item.isVeg && <span style={{ marginRight: '4px' }}>🌱</span>}
                    {item.isSpicy && <span>🌶️</span>}
                  </td>
                  <td>{item.preparationTime} min</td>
                  <td>
                    <span className={`badge ${item.isAvailable ? 'badge-success' : 'badge-gray'}`}>
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => handleEdit(item)}>Edit</button>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ marginLeft: '8px' }}
                      onClick={() => handleToggleAvailability(item)}
                    >
                      {item.isAvailable ? 'Hide' : 'Show'}
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ marginLeft: '8px' }}
                      onClick={() => handleDelete(item)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingItem(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingItem(null) }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="input-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  required
                />
              </div>
              <div className="form-grid">
                <div className="input-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="appetizer">Appetizer</option>
                    <option value="main">Main Course</option>
                    <option value="dessert">Dessert</option>
                    <option value="beverage">Beverage</option>
                    <option value="side">Side</option>
                    <option value="special">Special</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-grid">
                <div className="input-group">
                  <label>Prep Time (min)</label>
                  <input
                    type="number"
                    value={formData.preparationTime}
                    onChange={(e) => setFormData({ ...formData, preparationTime: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.isVeg}
                    onChange={(e) => setFormData({ ...formData, isVeg: e.target.checked })}
                  />
                  Vegetarian
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={formData.isSpicy}
                    onChange={(e) => setFormData({ ...formData, isSpicy: e.target.checked })}
                  />
                  Spicy
                </label>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingItem ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setEditingItem(null) }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
