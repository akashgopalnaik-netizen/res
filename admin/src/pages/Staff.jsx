import { useEffect, useState } from 'react'
import { userAPI } from '../utils/api'
import toast from 'react-hot-toast'

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'staff'
  })

  useEffect(() => {
    loadData()
  }, [filter])

  const loadData = async () => {
    try {
      const params = { limit: 100 }
      if (filter !== 'all') params.role = filter
      
      const [staffRes, statsRes] = await Promise.all([
        userAPI.getAll(params),
        userAPI.getStats()
      ])
      setStaff(staffRes.data.data.users)
      setStats(statsRes.data.data)
    } catch (error) {
      toast.error('Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingUser) {
        await userAPI.update(editingUser._id, formData)
        toast.success('User updated')
      } else {
        await userAPI.create(formData)
        toast.success('User created')
      }
      setShowModal(false)
      setEditingUser(null)
      setFormData({ name: '', email: '', password: '', phone: '', role: 'staff' })
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save user')
    }
  }

  const handleToggleActive = async (user) => {
    try {
      await userAPI.update(user._id, { isActive: !user.isActive })
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`)
      loadData()
    } catch (error) {
      toast.error('Failed to update user')
    }
  }

  const handleDelete = async (user) => {
    if (!confirm(`Delete ${user.name}? This cannot be undone.`)) return

    try {
      await userAPI.delete(user._id)
      toast.success('User deleted')
      loadData()
    } catch (error) {
      toast.error('Failed to delete user')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px' }}>Staff & User Management</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'admin', 'manager', 'staff', 'customer'].map((r) => (
            <button
              key={r}
              className={`btn btn-sm ${filter === r ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(r)}
              style={{ textTransform: 'capitalize' }}
            >
              {r}
            </button>
          ))}
          <button className="btn btn-primary" style={{ marginLeft: '16px' }} onClick={() => setShowModal(true)}>+ Add User</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{stats.totalStaff}</div>
                <div className="stat-card-label">Staff Members</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#dbeafe' }}>👤</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{stats.totalManagers}</div>
                <div className="stat-card-label">Managers</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#fef3c7' }}>⭐</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{stats.totalUsers}</div>
                <div className="stat-card-label">Total Customers</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#d1fae5' }}>👥</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <div className="stat-card-value">{stats.newUsersThisMonth}</div>
                <div className="stat-card-label">New This Month</div>
              </div>
              <div className="stat-card-icon" style={{ background: '#e0e7ff' }}>📈</div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((user) => (
                <tr key={user._id}>
                  <td style={{ fontWeight: '600' }}>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || '-'}</td>
                  <td>
                    <span className={`badge ${
                      user.role === 'admin' ? 'badge-danger' :
                      user.role === 'manager' ? 'badge-primary' : 'badge-gray'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.isActive ? 'badge-success' : 'badge-gray'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => { setEditingUser(user); setShowModal(true) }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      style={{ marginLeft: '8px' }}
                      onClick={() => handleToggleActive(user)}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    {user.role !== 'admin' && (
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ marginLeft: '8px' }}
                        onClick={() => handleDelete(user)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingUser(null) }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingUser ? 'Edit User' : 'Add New Staff'}</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); setEditingUser(null) }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              {!editingUser && (
                <div className="input-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    minLength={6}
                    required={!editingUser}
                  />
                </div>
              )}
              <div className="input-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingUser ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); setEditingUser(null) }}>
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
