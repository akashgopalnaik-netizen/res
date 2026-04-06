import { useEffect, useState } from 'react'
import { tableAPI } from '../utils/api'
import toast from 'react-hot-toast'

export default function Tables() {
  const [tables, setTables] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingTable, setEditingTable] = useState(null)

  const [formData, setFormData] = useState({
    tableNumber: '',
    capacity: '4',
    section: 'indoor',
    name: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const tablesRes = await tableAPI.getAll()
      setTables(tablesRes.data.data.tables)
      try {
        const statsRes = await tableAPI.getStats()
        setStats(statsRes.data.data)
      } catch (e) {
        // Ignore stats loading error for staff roles
      }
    } catch (error) {
      toast.error('Failed to load tables')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingTable) {
        await tableAPI.update(editingTable._id, formData)
        toast.success('Table updated')
      } else {
        await tableAPI.create(formData)
        toast.success('Table created')
      }
      setShowModal(false)
      setEditingTable(null)
      setFormData({ tableNumber: '', capacity: '4', section: 'indoor', name: '' })
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save table')
    }
  }

  const updateStatus = async (table, newStatus) => {
    try {
      await tableAPI.updateStatus(table._id, { status: newStatus })
      toast.success('Table status updated')
      loadData()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async (table) => {
    if (!confirm(`Delete table ${table.tableNumber}?`)) return

    try {
      await tableAPI.delete(table._id)
      toast.success('Table deleted')
      loadData()
    } catch (error) {
      toast.error('Failed to delete table')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      available: '#10b981',
      occupied: '#ef4444',
      reserved: '#f59e0b',
      maintenance: '#64748b'
    }
    return colors[status] || '#64748b'
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px' }}>Table Management</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Table</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{stats.totalTables}</div>
                <div className="stat-card-label">Total Tables</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#dbeafe' }}>🪑</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{stats.availableTables}</div>
                <div className="stat-card-label">Available</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#d1fae5' }}>✓</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{stats.occupiedTables}</div>
                <div className="stat-card-label">Occupied</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#fee2e2' }}>👥</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{stats.utilization}%</div>
                <div className="stat-card-label">Utilization</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#fef3c7' }}>📈</div>
            </div>
          </div>
        </div>
      )}

      {/* Table Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {tables.map((table) => (
          <div
            key={table._id}
            className="card"
            style={{
              padding: '20px',
              borderLeft: `4px solid ${getStatusColor(table.status)}`,
              cursor: 'pointer'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontWeight: '700', fontSize: '18px' }}>Table {table.tableNumber}</span>
              <span
                className="badge"
                style={{
                  background: getStatusColor(table.status),
                  color: 'white'
                }}
              >
                {table.status}
              </span>
            </div>
            <div style={{ color: 'var(--gray)', marginBottom: '8px' }}>
              {table.capacity} guests • {table.section}
            </div>
            {table.currentOrder && (
              <div style={{ fontSize: '13px', color: 'var(--primary)' }}>
                Order: {table.currentOrder.orderNumber}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {table.status === 'available' && (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => updateStatus(table, 'occupied')}
                >
                  Seat
                </button>
              )}
              {table.status === 'occupied' && (
                <button
                  className="btn btn-sm btn-success"
                  onClick={() => updateStatus(table, 'available')}
                >
                  Free
                </button>
              )}
              <button
                className="btn btn-sm btn-outline"
                onClick={() => { setEditingTable(table); setShowModal(true) }}
              >
                Edit
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDelete(table)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingTable(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTable ? 'Edit Table' : 'Add New Table'}</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingTable(null) }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Table Number</label>
                <input
                  type="number"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                  required
                />
              </div>
              <div className="input-group">
                <label>Table Name (optional)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Window Table 1"
                />
              </div>
              <div className="form-grid">
                <div className="input-group">
                  <label>Capacity</label>
                  <select
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  >
                    <option value="2">2 guests</option>
                    <option value="4">4 guests</option>
                    <option value="6">6 guests</option>
                    <option value="8">8 guests</option>
                    <option value="10">10+ guests</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Section</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  >
                    <option value="indoor">Indoor</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="patio">Patio</option>
                    <option value="vip">VIP</option>
                    <option value="bar">Bar</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingTable ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setEditingTable(null) }}>
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
