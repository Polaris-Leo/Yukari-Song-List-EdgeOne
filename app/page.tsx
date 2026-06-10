'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Song {
  id: number
  title: string
  artist: string
  language: string
  status: string
}
interface SongsResponse {
  data: Song[]
  total: number
  totalPages: number
}

const LANG_OPTIONS = ['ALL', '中文', '日语', '英语', '其他'] as const

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  normal:  { label: '可点',  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  need_sc: { label: '需SC', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  banned:  { label: '禁点', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}

export default function HomePage() {
  const [songs, setSongs]           = useState<Song[]>([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeLang, setActiveLang] = useState('ALL')
  const [loading, setLoading]       = useState(true)
  const [toast, setToast]           = useState('')
  const [randomSong, setRandomSong] = useState<Song | null>(null)
  const [seed]                      = useState(() => Math.floor(Math.random() * 1_000_000_000) + 1)
  const [copiedId, setCopiedId]     = useState<number | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const fetchSongs = useCallback(async (page: number, search: string, lang: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page), limit: '20', language: lang, search,
        ...(search ? {} : { seed: String(seed) }),
      })
      const res  = await fetch(`/api/songs?${params}`)
      const data: SongsResponse = await res.json()
      setSongs(data.data ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [seed])

  useEffect(() => { fetchSongs(currentPage, searchTerm, activeLang) }, [currentPage, activeLang, fetchSongs])

  const handleSearch = (v: string) => {
    setSearchTerm(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setCurrentPage(1); fetchSongs(1, v, activeLang) }, 380)
  }

  const handleLang = (lang: string) => { setActiveLang(lang); setCurrentPage(1) }

  const handleRandom = async () => {
    const res = await fetch('/api/songs/random')
    if (res.ok) setRandomSong(await res.json())
  }

  const handleCopy = async (song: Song) => {
    await navigator.clipboard.writeText(song.title).catch(() => {})
    setCopiedId(song.id)
    showToast(`已复制：${song.title}`)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleCopyRandom = async () => {
    if (!randomSong) return
    await navigator.clipboard.writeText(randomSong.title).catch(() => {})
    showToast(`已复制：${randomSong.title}`)
  }

  return (
    <div style={{ width: '100%', padding: '1rem 1rem 2rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', left: '50%',
          transform: 'translateX(-50%)', zIndex: 9999,
          background: '#4f46e5', color: 'white',
          padding: '0.75rem 1.5rem', borderRadius: '9999px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          animation: 'slideDown 0.3s',
        }}>
          {toast}
        </div>
      )}

      {/* Top container: header card + random widget */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
        className="top-container-grid"
      >
        {/* Header card */}
        <div style={{
          background: 'rgba(255,255,255,0.85)',
          borderRadius: '1rem',
          padding: '1.5rem',
          border: '1px solid rgba(255,255,255,0.6)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          animation: 'slideUp 0.5s ease-out',
        }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
            🎵 优花璃点歌台
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
            共 <strong style={{ color: '#4f46e5' }}>{total}</strong> 首歌曲
          </p>

          {/* Search */}
          <input
            type="text"
            value={searchTerm}
            onChange={e => handleSearch(e.target.value)}
            placeholder="🔍 搜索歌曲名或歌手名..."
            style={{
              width: '100%', padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.9)',
              border: '1px solid #cbd5e1', borderRadius: '0.75rem',
              color: '#1e293b', fontSize: '0.95rem',
              outline: 'none', marginBottom: '0.75rem',
              transition: 'all 0.2s',
            }}
          />

          {/* Lang tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', scrollbarWidth: 'none', padding: '0.25rem 0' }}>
            {LANG_OPTIONS.map(lang => (
              <button
                key={lang}
                onClick={() => handleLang(lang)}
                style={{
                  padding: '0.5rem 1.125rem', borderRadius: '0.75rem',
                  fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap',
                  border: '1px solid transparent', cursor: 'pointer',
                  transition: 'all 0.3s ease', touchAction: 'manipulation',
                  ...(activeLang === lang
                    ? { background: '#4f46e5', color: 'white', boxShadow: '0 2px 4px rgba(79,70,229,0.2)', borderColor: '#4f46e5' }
                    : { background: 'rgba(255,255,255,0.8)', color: '#64748b', borderColor: 'rgba(255,255,255,0.5)' }),
                }}
              >
                {lang === 'ALL' ? '全部' : lang}
              </button>
            ))}
          </div>
        </div>

        {/* Random widget */}
        <div
          onClick={handleRandom}
          style={{
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: '1rem', padding: '1.5rem',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            transition: 'all 0.3s', cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
            minHeight: '120px',
          }}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
            background: 'linear-gradient(to bottom, #f59e0b, #d97706)',
          }} />
          {randomSong ? (
            <>
              <p style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600, marginBottom: '0.5rem', marginLeft: '0.75rem' }}>🎲 随机推荐</p>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b', marginLeft: '0.75rem', marginBottom: '0.25rem' }}>{randomSong.title}</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.75rem', marginBottom: '0.75rem' }}>{randomSong.artist}</p>
              <button
                onClick={e => { e.stopPropagation(); handleCopyRandom() }}
                style={{
                  marginLeft: '0.75rem', alignSelf: 'flex-start',
                  background: '#f59e0b', color: 'white', border: 'none',
                  padding: '0.25rem 0.75rem', borderRadius: '0.5rem',
                  fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                复制歌名
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600, marginBottom: '0.5rem', marginLeft: '0.75rem' }}>✨ 随机点歌</p>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginLeft: '0.75rem' }}>点击随机抽取一首歌</p>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.75rem', marginTop: '0.25rem' }}>每次都有惊喜 🎵</p>
            </>
          )}
        </div>
      </div>

      {/* Song grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.7)' }}>加载中...</div>
      ) : songs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.7)' }}>暂无歌曲</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(1, 1fr)',
          gap: '1rem',
        }} className="song-grid">
          {songs.map((song, idx) => {
            const st = STATUS_STYLE[song.status]
            return (
              <div
                key={song.id}
                style={{
                  background: 'rgba(255,255,255,0.75)',
                  border: '1px solid rgba(255,255,255,0.6)',
                  borderRadius: '1rem', padding: '1.25rem',
                  minWidth: 0,
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s ease',
                  animation: `fadeIn 0.5s ease-out ${Math.min(idx * 0.03, 0.3)}s backwards`,
                  display: 'flex', flexDirection: 'column',
                  contentVisibility: 'auto',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem', color: '#64748b',
                    border: '1px solid #cbd5e1', padding: '0.25rem 0.625rem',
                    borderRadius: '0.5rem', background: 'rgba(255,255,255,0.5)',
                  }}>
                    {song.language}
                  </span>
                  {st && (
                    <span style={{
                      fontSize: '0.75rem', padding: '0.25rem 0.625rem',
                      borderRadius: '0.5rem', border: `1px solid ${st.border}`,
                      color: st.color, background: st.bg,
                    }}>
                      {st.label}
                    </span>
                  )}
                </div>

                <p style={{
                  fontSize: '1.125rem', fontWeight: 700, color: '#1e293b',
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word', marginBottom: '0.25rem', lineHeight: 1.4,
                }}>
                  {song.title}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>{song.artist}</p>

                <button
                  onClick={() => handleCopy(song)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.75rem',
                    background: copiedId === song.id
                      ? '#10b981'
                      : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: 'white', fontSize: '0.875rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    transition: 'all 0.3s ease', marginTop: 'auto',
                    touchAction: 'manipulation',
                  }}
                >
                  {copiedId === song.id ? '✓ 已复制' : '复制歌名'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)',
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.5 : 1,
              color: '#475569', fontWeight: 600,
            }}
          >
            ‹
          </button>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, padding: '0 0.75rem' }}>
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '0.5rem',
              background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)',
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.5 : 1,
              color: '#475569', fontWeight: 600,
            }}
          >
            ›
          </button>
        </div>
      )}

      <style>{`
        @media (min-width: 640px)  { .song-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (min-width: 768px)  { .song-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (min-width: 1024px) { .song-grid { grid-template-columns: repeat(4, 1fr) !important; } }
        @media (min-width: 1280px) { .song-grid { grid-template-columns: repeat(5, 1fr) !important; } }
        @media (min-width: 768px)  {
          .top-container-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
          .top-container-grid > :first-child { grid-column: span 2; }
        }
        @media (min-width: 1024px) { .top-container-grid { grid-template-columns: repeat(4, 1fr) !important; } }
        @media (min-width: 1280px) { .top-container-grid { grid-template-columns: repeat(5, 1fr) !important; } }
        @media (hover: none) {
          button:hover { transform: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  )
}
