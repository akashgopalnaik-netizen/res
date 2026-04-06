import { useEffect, useState } from 'react'
import { reservationAPI } from '../utils/api'
import toast from 'react-hot-toast'

export default function Reservations() {
  const [reservations, setReservations] = useState([])
  const [filter, setFilter] = useState('today')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReservations()
  }, [filter])

  const loadReservations = async () => {
    try {
      const params = filter === 'today' ? {} : { status: filter }
      const res = await reservationAPI.getAll(params)
      setReservations(res.data.data.reservations)
    } catch (error) {
      toast.error('Failed to load reservations')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await reservationAPI.updateStatus(id, { status })
      toast.success(`Reservation ${status}`)
      loadReservations()
    } catch (error) {
      toast.error('Failed to update reservation')
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this reservation?')) return

    try {
      await reservationAPI.cancel(id)
      toast.success('Reservation cancelled')
      loadReservations()
    } catch (error) {
      toast.error('Failed to cancel reservation')
    }
  }

  const getStatusBadge = (status) => {
    const map = {
      pending: 'badge-warning',
      confirmed: 'badge-primary',
      seated: 'badge-success',
      completed: 'badge-gray',
      cancelled: 'badge-danger',
      'no-show': 'badge-danger'
    }
    return map[status] || 'badge-gray'
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px' }}>Reservations</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {['today', 'pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(s)}
              style={{ textTransform: 'capitalize' }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : reservations.length === 0 ? (
        <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📅</div>
          <h2>No reservations</h2>
        </div>
      ) : (
        <div className="card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reservation #</th>
                <th>Customer</th>
                <th>Date & Time</th>
                <th>Party</th>
                <th>Table</th>
                <th>Preference</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((res) => (
                <tr key={res._id}>
                  <td style={{ fontWeight: '600' }}>{res.reservationNumber}</td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{res.customerName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--gray)' }}>{res.customerPhone}</div>
                  </td>
                  <td>
                    <div>{new Date(res.date).toLocaleDateString()}</div>
                    <div style={{ fontSize: '13px', color: 'var(--gray)' }}>{res.time}</div>
                  </td>
                  <td>{res.partySize} guests</td>
                  <td>
                    {res.assignedTableNumber
                      ? `Table ${res.assignedTableNumber}`
                      : '-'}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{res.seatingPreference}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(res.status)}`}>
                      {res.status}
                    </span>
                  </td>
                  <td>
                    {res.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => updateStatus(res._id, 'confirmed')}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          style={{ marginLeft: '8px' }}
                          onClick={() => handleCancel(res._id)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {res.status === 'confirmed' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => updateStatus(res._id, 'seated')}
                      >
                        Seat
                      </button>
                    )}
                    {res.status === 'seated' && (
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => updateStatus(res._id, 'completed')}
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
