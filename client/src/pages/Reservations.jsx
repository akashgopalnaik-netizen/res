import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { reservationAPI } from '../utils/api'
import { useAuthStore } from '../context/store'
import toast from 'react-hot-toast'

export default function Reservations() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    partySize: '2',
    seatingPreference: 'any',
    occasion: 'none',
    specialRequests: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user) {
      toast.error('Please login to make a reservation')
      navigate('/login')
      return
    }

    setLoading(true)

    try {
      await reservationAPI.create({
        ...formData,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone
      })
      toast.success('Reservation request submitted! We will confirm shortly.')
      setFormData({
        date: '',
        time: '',
        partySize: '2',
        seatingPreference: 'any',
        occasion: 'none',
        specialRequests: ''
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to make reservation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="reservation-form">
      <h1 style={{ fontSize: '28px', marginBottom: '16px', textAlign: 'center' }}>Book a Table</h1>
      <p style={{ textAlign: 'center', color: 'var(--gray)', marginBottom: '32px' }}>
        Reserve your spot for an unforgettable dining experience
      </p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div className="input-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="input-group">
              <label>Time</label>
              <select
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              >
                <option value="">Select time</option>
                {Array.from({ length: 14 }, (_, i) => {
                  const hour = i + 11
                  const displayHour = hour > 12 ? hour - 12 : hour
                  return (
                    <option key={hour} value={`${hour}:00`}>
                      {displayHour}:00 {hour >= 12 ? 'PM' : 'AM'}
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="input-group">
              <label>Party Size</label>
              <select
                value={formData.partySize}
                onChange={(e) => setFormData({ ...formData, partySize: e.target.value })}
                required
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} {i + 1 === 1 ? 'guest' : 'guests'}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Seating Preference</label>
              <select
                value={formData.seatingPreference}
                onChange={(e) => setFormData({ ...formData, seatingPreference: e.target.value })}
              >
                <option value="any">Any Available</option>
                <option value="indoor">Indoor</option>
                <option value="outdoor">Outdoor</option>
                <option value="patio">Patio</option>
                <option value="window">Window Seat</option>
                <option value="quiet">Quiet Area</option>
              </select>
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '20px' }}>
            <label>Occasion</label>
            <select
              value={formData.occasion}
              onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
            >
              <option value="none">Regular Dining</option>
              <option value="birthday">Birthday</option>
              <option value="anniversary">Anniversary</option>
              <option value="business">Business</option>
              <option value="celebration">Celebration</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="input-group">
            <label>Special Requests</label>
            <textarea
              value={formData.specialRequests}
              onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
              placeholder="Any special requests or dietary requirements?"
              rows="3"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Request Reservation'}
          </button>
        </form>
      </div>

      <div style={{
        background: 'var(--light)',
        borderRadius: '12px',
        padding: '24px',
        marginTop: '24px'
      }}>
        <h3 style={{ marginBottom: '16px' }}>Reservation Policy</h3>
        <ul style={{ color: 'var(--gray)', lineHeight: '2' }}>
          <li>Reservations are held for 15 minutes past the scheduled time</li>
          <li>For parties of 8 or more, please contact us directly</li>
          <li>Cancellations should be made at least 2 hours in advance</li>
          <li>Special requests are subject to availability</li>
        </ul>
      </div>
    </div>
  )
}
