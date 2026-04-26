import { useState, useRef, useEffect } from 'react'
import { aiAPI } from '../utils/api'

const SUGGESTIONS = [
  'What vegetarian dishes do you have?',
  'Show me dishes under $15',
  'What are your most popular items?',
  'Any gluten-free options?',
  'Recommend a quick meal (under 15 mins)',
  'What spicy dishes do you serve?',
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '12px' }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px'
      }}>🤖</div>
      <div style={{
        padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', gap: '5px', alignItems: 'center'
      }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <span key={i} style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#a5b4fc', display: 'inline-block',
            animation: `ragBounce 1s infinite ${delay}s`
          }} />
        ))}
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', gap: '10px',
      flexDirection: isUser ? 'row-reverse' : 'row',
      marginBottom: '12px', alignItems: 'flex-end'
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
        background: isUser
          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          : 'linear-gradient(135deg, #f59e0b, #d97706)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '15px', fontWeight: 700, color: '#fff'
      }}>
        {isUser ? '👤' : '🤖'}
      </div>
      <div style={{
        maxWidth: '78%', padding: '10px 14px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser
          ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          : 'rgba(255,255,255,0.06)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.1)',
        color: '#fff', fontSize: '14px', lineHeight: 1.6,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word'
      }}>
        {msg.text}
      </div>
    </div>
  )
}

const INTRO = "Hi! I'm your AI dining assistant 🍽️ Powered by RAG — I have live access to our full menu. Ask me about dishes, dietary options, allergens, or what to order!"

export default function AIChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', text: INTRO }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ gemini: null, chromadb: null, indexedItems: 0 })
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Check AI status on mount
  useEffect(() => {
    aiAPI.status()
      .then(res => setStatus(res.data.data))
      .catch(() => setStatus({ gemini: false, chromadb: false, indexedItems: 0 }))
  }, [])

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [messages, open])

  const aiReady = status.gemini && status.chromadb

  const sendMessage = async (text) => {
    const userText = (text || input).trim()
    if (!userText || loading) return

    const userMsg = { role: 'user', text: userText }
    const history = messages
      .slice(1) // skip intro
      .map(m => ({ role: m.role, text: m.text }))

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await aiAPI.chat({ message: userText, history })
      const reply = res.data.data.reply
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (err) {
      const errMsg = err.response?.data?.message || 'AI service unavailable right now.'
      setMessages(prev => [...prev, { role: 'assistant', text: `⚠️ ${errMsg}` }])
      if (err.response?.status === 503) {
        setStatus(s => ({ ...s, gemini: false }))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const clearChat = () => {
    setMessages([{ role: 'assistant', text: INTRO }])
    setInput('')
  }

  const statusLabel = () => {
    if (status.gemini === null) return { text: 'Connecting…', color: '#94a3b8' }
    if (!status.gemini) return { text: 'Offline · Set GEMINI_API_KEY', color: '#ef4444' }
    if (!status.chromadb) return { text: 'Gemini ✓ · ChromaDB offline', color: '#f59e0b' }
    return { text: `Online · ${status.indexedItems} items indexed`, color: '#10b981' }
  }

  const { text: statusText, color: statusColor } = statusLabel()

  return (
    <>
      {/* Floating button */}
      <button
        id="ai-chat-toggle"
        onClick={() => setOpen(o => !o)}
        title="AI Assistant"
        style={{
          position: 'fixed', bottom: '28px', right: '28px', zIndex: 1000,
          width: '56px', height: '56px', borderRadius: '50%', border: 'none',
          background: open
            ? 'linear-gradient(135deg, #ef4444, #dc2626)'
            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff', fontSize: '24px', cursor: 'pointer',
          boxShadow: open
            ? '0 4px 24px rgba(239,68,68,0.5)'
            : '0 4px 24px rgba(99,102,241,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s',
          transform: open ? 'rotate(45deg) scale(1.05)' : 'rotate(0deg) scale(1)'
        }}
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          id="ai-chat-panel"
          style={{
            position: 'fixed', bottom: '96px', right: '28px', zIndex: 999,
            width: '370px', maxHeight: '540px',
            background: 'linear-gradient(180deg, #0f0f1a, #13131f)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.65)',
            overflow: 'hidden',
            animation: 'slideUp 0.25s ease'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              flexShrink: 0
            }}>🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>AI Menu Assistant</div>
              <div style={{ fontSize: '11px', color: statusColor, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: statusColor, display: 'inline-block', flexShrink: 0
                }} />
                {statusText}
              </div>
            </div>
            {/* Clear button */}
            {messages.length > 1 && (
              <button
                onClick={clearChat}
                title="Clear chat"
                style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', color: '#94a3b8', fontSize: '11px', padding: '4px 8px',
                  cursor: 'pointer', whiteSpace: 'nowrap'
                }}
              >
                🗑 Clear
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px',
            display: 'flex', flexDirection: 'column'
          }}>
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* Quick suggestions (show on fresh chat) */}
          {messages.length === 1 && (
            <div style={{ padding: '0 12px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  style={{
                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
                    color: '#a5b4fc', borderRadius: '20px', padding: '5px 12px',
                    fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '12px 14px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', gap: '8px', alignItems: 'flex-end'
          }}>
            <textarea
              ref={inputRef}
              id="ai-chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={aiReady ? 'Ask about the menu…' : 'AI unavailable — check server config'}
              rows={1}
              disabled={loading || !aiReady}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px', padding: '10px 14px',
                color: '#fff', fontSize: '14px', resize: 'none',
                outline: 'none', fontFamily: 'inherit', lineHeight: 1.4
              }}
            />
            <button
              id="ai-chat-send"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim() || !aiReady}
              style={{
                width: '38px', height: '38px', borderRadius: '50%', border: 'none',
                background: input.trim() && !loading && aiReady
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(255,255,255,0.08)',
                color: '#fff',
                cursor: input.trim() && !loading && aiReady ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', flexShrink: 0, transition: 'all 0.2s'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ragBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </>
  )
}
