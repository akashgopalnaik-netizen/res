import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../utils/api'
import { useAuthStore } from '../context/store'
import toast from 'react-hot-toast'

// ── Password strength helpers ────────────────────────────────────────────────
const CHARSETS = {
  upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower:   'abcdefghijklmnopqrstuvwxyz',
  digits:  '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?'
}

function generatePassword(length = 16) {
  const all = Object.values(CHARSETS).join('')
  // Guarantee at least one char from each charset
  const guaranteed = Object.values(CHARSETS).map(s => s[Math.floor(Math.random() * s.length)])
  const rest = Array.from({ length: length - guaranteed.length }, () =>
    all[Math.floor(Math.random() * all.length)]
  )
  return [...guaranteed, ...rest].sort(() => Math.random() - 0.5).join('')
}

function getStrength(password) {
  if (!password) return { score: 0, label: '', color: 'transparent' }
  let score = 0
  if (password.length >= 8)  score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Very weak',  color: '#ef4444' }
  if (score === 2) return { score, label: 'Weak',       color: '#f97316' }
  if (score === 3) return { score, label: 'Fair',       color: '#eab308' }
  if (score === 4) return { score, label: 'Strong',     color: '#22c55e' }
  return              { score, label: 'Very strong', color: '#10b981' }
}

const RULES = [
  { test: (p) => p.length >= 8,            label: 'At least 8 characters' },
  { test: (p) => /[A-Z]/.test(p),          label: 'One uppercase letter' },
  { test: (p) => /[0-9]/.test(p),          label: 'One number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p),  label: 'One special character (!@#…)' },
]

// ── Component ────────────────────────────────────────────────────────────────
export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [genLength, setGenLength] = useState(16)
  const [generatedPwd, setGeneratedPwd] = useState('')

  const strength = useMemo(() => getStrength(formData.password), [formData.password])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { confirmPassword, ...registerData } = formData
      const res = await authAPI.register(registerData)
      const { user, token } = res.data.data
      setAuth(user, token)
      toast.success('Account created successfully!')
      navigate('/')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = () => {
    const pwd = generatePassword(genLength)
    setGeneratedPwd(pwd)
  }

  const applyGenerated = () => {
    setFormData(f => ({ ...f, password: generatedPwd, confirmPassword: generatedPwd }))
    setShowGenerator(false)
    setShowPassword(true)
    toast.success('Password applied!')
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPwd)
    toast.success('Copied to clipboard!')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join us and start ordering</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="input-group">
            <label>Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>

          {/* Email */}
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              required
            />
          </div>

          {/* Phone */}
          <div className="input-group">
            <label>Phone (optional)</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Password */}
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => { setShowGenerator(g => !g); if (!generatedPwd) setGeneratedPwd(generatePassword(genLength)) }}
                style={{
                  fontSize: '12px', fontWeight: 600, padding: '3px 10px',
                  background: showGenerator ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.12)',
                  color: showGenerator ? '#fff' : '#a5b4fc',
                  border: showGenerator ? 'none' : '1px solid rgba(99,102,241,0.35)',
                  borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                🔑 Generate
              </button>
            </div>

            {/* Password Generator Panel */}
            {showGenerator && (
              <div style={{
                marginBottom: '10px', padding: '16px', borderRadius: '12px',
                background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                animation: 'slideDown 0.2s ease'
              }}>
                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '10px', color: '#a5b4fc' }}>
                  🔐 Password Generator
                </div>

                {/* Length slider */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ opacity: 0.7 }}>Length</span>
                    <span style={{ fontWeight: 700, color: '#a5b4fc' }}>{genLength} chars</span>
                  </div>
                  <input
                    type="range" min={8} max={32} value={genLength}
                    onChange={e => { setGenLength(+e.target.value); setGeneratedPwd(generatePassword(+e.target.value)) }}
                    style={{ width: '100%', accentColor: '#6366f1' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.4 }}>
                    <span>8</span><span>32</span>
                  </div>
                </div>

                {/* Generated password display */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(0,0,0,0.25)', borderRadius: '8px',
                  padding: '10px 12px', marginBottom: '10px',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <code style={{
                    flex: 1, fontSize: '13px', letterSpacing: '1px',
                    color: '#e2e8f0', wordBreak: 'break-all', fontFamily: 'monospace'
                  }}>
                    {generatedPwd}
                  </code>
                  <button type="button" onClick={copyToClipboard} title="Copy" style={iconBtn}>📋</button>
                  <button type="button" onClick={handleGenerate} title="Regenerate" style={iconBtn}>🔄</button>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button" onClick={applyGenerated}
                    style={{
                      flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                      fontWeight: 700, fontSize: '13px'
                    }}
                  >
                    ✓ Use this password
                  </button>
                  <button
                    type="button" onClick={() => setShowGenerator(false)}
                    style={{
                      padding: '9px 14px', borderRadius: '8px', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#94a3b8', fontSize: '13px'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Password input */}
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                minLength={6}
                required
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{ ...eyeBtn }}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Strength meter */}
            {formData.password && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      flex: 1, height: '4px', borderRadius: '2px',
                      background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)',
                      transition: 'background 0.3s'
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: strength.color, fontWeight: 600 }}>
                  {strength.label}
                </div>
              </div>
            )}

            {/* Requirements checklist */}
            {formData.password && (
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {RULES.map((rule, i) => {
                  const ok = rule.test(formData.password)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: ok ? '#22c55e' : '#94a3b8' }}>
                      <span>{ok ? '✓' : '○'}</span>
                      <span>{rule.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="input-group">
            <label>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                minLength={6}
                required
                style={{ paddingRight: '44px' }}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)} style={eyeBtn} tabIndex={-1}>
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                ✗ Passwords do not match
              </div>
            )}
            {formData.confirmPassword && formData.password === formData.confirmPassword && (
              <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px' }}>
                ✓ Passwords match
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .input-group input { padding-right: 44px; box-sizing: border-box; }
      `}</style>
    </div>
  )
}

// Shared micro-styles
const eyeBtn = {
  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '2px',
  lineHeight: 1, color: '#94a3b8'
}

const iconBtn = {
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '6px', cursor: 'pointer', padding: '4px 6px', fontSize: '14px',
  color: '#94a3b8', flexShrink: 0
}
