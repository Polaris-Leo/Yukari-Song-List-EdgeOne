'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Music, Lock } from 'lucide-react'

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
      const res = await fetch('/api/auth/login', {
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
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-sm">
            <Music className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-zinc-900">优花璃点歌台</span>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-7 shadow-xs">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-4 w-4 text-zinc-400" />
            <h1 className="text-sm font-semibold text-zinc-700">管理员登录</h1>
          </div>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="请输入用户名"
                required
                autoFocus
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                placeholder="请输入密码"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors mt-1"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          <a href="/" className="hover:text-indigo-500 transition-colors">← 返回歌单</a>
        </p>
      </div>
    </div>
  )
}
