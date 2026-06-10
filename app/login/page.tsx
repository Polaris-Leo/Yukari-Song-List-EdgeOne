'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        router.push('/admin')
      } else {
        setError(data.error || '用户名或密码错误')
      }
    } catch {
      setError('登录失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', minHeight: '100dvh', padding: '1rem',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.9)', borderRadius: '1rem', padding: '3rem',
        width: '500px', maxWidth: '90vw',
        border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
        animation: 'slideUp 0.5s ease-out',
      }}>
        <h1 style={{ marginBottom: '2rem', color: '#1e293b', textAlign: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
          管理员登录
        </h1>

        <div style={{ color: '#ef4444', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1rem', minHeight: '1.25rem' }}>
          {error}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
              autoFocus
              autoComplete="username"
              style={{
                width: '100%', padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.9)', border: '1px solid #cbd5e1',
                borderRadius: '0.5rem', color: '#1e293b', fontSize: '1rem',
                outline: 'none', transition: 'all 0.2s',
              }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              autoComplete="current-password"
              style={{
                width: '100%', padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.9)', border: '1px solid #cbd5e1',
                borderRadius: '0.5rem', color: '#1e293b', fontSize: '1rem',
                outline: 'none', transition: 'all 0.2s',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600, background: '#4f46e5', color: 'white',
              fontSize: '1rem', marginTop: '0.5rem',
              opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
              touchAction: 'manipulation',
            }}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
