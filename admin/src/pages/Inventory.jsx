import { useEffect, useState } from 'react'
import { inventoryAPI } from '../utils/api'
import toast from 'react-hot-toast'

export default function Inventory() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('add') // add, restock, wastage
  const [selectedItem, setSelectedItem] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'dry-goods',
    unit: 'pcs',
    currentStock: '',
    minimumStock: '10',
    costPerUnit: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const itemsRes = await inventoryAPI.getItems({ limit: 100 })
      setItems(itemsRes.data.data.items)
      try {
        const statsRes = await inventoryAPI.getStats()
        setStats(statsRes.data.data)
      } catch (e) {
        // Ignore stats loading error for staff roles
      }
    } catch (error) {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (modalType === 'add') {
        await inventoryAPI.createItem(formData)
        toast.success('Item created')
      } else if (modalType === 'restock' && selectedItem) {
        await inventoryAPI.restock(selectedItem._id, {
          quantity: parseFloat(formData.quantity),
          costPerUnit: formData.costPerUnit ? parseFloat(formData.costPerUnit) : undefined
        })
        toast.success('Item restocked')
      } else if (modalType === 'wastage' && selectedItem) {
        await inventoryAPI.reportWastage(selectedItem._id, {
          quantity: parseFloat(formData.quantity),
          reason: formData.reason
        })
        toast.success('Wastage recorded')
      }
      setShowModal(false)
      setSelectedItem(null)
      setFormData({
        name: '', sku: '', category: 'dry-goods', unit: 'pcs',
        currentStock: '', minimumStock: '10', costPerUnit: '',
        quantity: '', reason: 'expired'
      })
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      'in-stock': 'badge-success',
      'low-stock': 'badge-warning',
      'out-of-stock': 'badge-danger',
      'expiring-soon': 'badge-warning'
    }
    return map[status] || 'badge-gray'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px' }}>Inventory Management</h1>
        <button className="btn btn-primary" onClick={() => { setModalType('add'); setShowModal(true) }}>
          + Add Item
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{stats.totalItems}</div>
                <div className="stat-card-label">Total Items</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#dbeafe' }}>📦</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">${stats.totalValue?.toFixed(2) || '0.00'}</div>
                <div className="stat-card-label">Total Value</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#d1fae5' }}>💰</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{stats.lowStockItems}</div>
                <div className="stat-card-label">Low Stock</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#fef3c7' }}>⚠️</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{stats.expiringSoon}</div>
                <div className="stat-card-label">Expiring Soon</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#fee2e2' }}>🕐</div>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Alert */}
      {items.filter(i => i.status === 'low-stock' || i.status === 'out-of-stock').length > 0 && (
        <div className="card" style={{ padding: '20px', marginBottom: '24px', borderLeft: '4px solid var(--danger)' }}>
          <h3 style={{ marginBottom: '12px' }}>⚠️ Items Needing Restock</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {items.filter(i => i.status === 'low-stock' || i.status === 'out-of-stock').map(item => (
              <span key={item._id} className="badge badge-warning">
                {item.name}: {item.currentStock} {item.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Items Table */}
      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Min Stock</th>
                <th>Unit Cost</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td style={{ fontWeight: '600' }}>{item.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{item.sku}</td>
                  <td style={{ textTransform: 'capitalize' }}>{item.category}</td>
                  <td>
                    <span style={{ fontWeight: '600' }}>{item.currentStock}</span> {item.unit}
                  </td>
                  <td>{item.minimumStock} {item.unit}</td>
                  <td>${item.costPerUnit?.toFixed(2)}</td>
                  <td>${(item.currentStock * item.costPerUnit)?.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setModalType('restock')
                        setSelectedItem(item)
                        setShowModal(true)
                      }}
                    >
                      Restock
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ marginLeft: '8px' }}
                      onClick={() => {
                        setModalType('wastage')
                        setSelectedItem(item)
                        setShowModal(true)
                      }}
                    >
                      Wastage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setSelectedItem(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalType === 'add' ? 'Add New Item' :
                 modalType === 'restock' ? `Restock: ${selectedItem?.name}` :
                 `Report Wastage: ${selectedItem?.name}`}
              </h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setSelectedItem(null) }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              {modalType === 'add' ? (
                <>
                  <div className="input-group">
                    <label>Item Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
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
                        <option value="produce">Produce</option>
                        <option value="meat">Meat</option>
                        <option value="dairy">Dairy</option>
                        <option value="dry-goods">Dry Goods</option>
                        <option value="beverages">Beverages</option>
                        <option value="supplies">Supplies</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Unit</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      >
                        <option value="pcs">Pieces</option>
                        <option value="kg">Kilograms</option>
                        <option value="g">Grams</option>
                        <option value="l">Liters</option>
                        <option value="ml">Milliliters</option>
                        <option value="box">Box</option>
                        <option value="case">Case</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="input-group">
                      <label>Current Stock</label>
                      <input
                        type="number"
                        value={formData.currentStock}
                        onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Minimum Stock</label>
                      <input
                        type="number"
                        value={formData.minimumStock}
                        onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Cost Per Unit ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.costPerUnit}
                      onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                    />
                  </div>
                </>
              ) : modalType === 'restock' ? (
                <>
                  <div className="input-group">
                    <label>Quantity to Add ({selectedItem?.unit})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Cost Per Unit ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.costPerUnit}
                      onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                      placeholder="Leave unchanged"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="input-group">
                    <label>Quantity ({selectedItem?.unit})</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      max={selectedItem?.currentStock}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Reason</label>
                    <select
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    >
                      <option value="expired">Expired</option>
                      <option value="damaged">Damaged</option>
                      <option value="spoiled">Spoiled</option>
                      <option value="over-prepared">Over-prepared</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </>
              )}
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {modalType === 'add' ? 'Create' : modalType === 'restock' ? 'Restock' : 'Report'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setSelectedItem(null) }}>
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
