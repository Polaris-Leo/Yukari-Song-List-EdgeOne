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

const STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string; borderColor: string; allowRequest: boolean }> = {
  normal:  { label: '可点歌',   color: 'rgba(34,197,94,0.1)',   textColor: '#15803d', borderColor: 'rgba(34,197,94,0.5)',   allowRequest: true  },
  need_sc: { label: '需SC点歌', color: 'rgba(236,72,153,0.1)',  textColor: '#be185d', borderColor: 'rgba(236,72,153,0.5)',  allowRequest: true  },
  banned:  { label: '禁止点歌', color: 'rgba(239,68,68,0.1)',   textColor: '#b91c1c', borderColor: 'rgba(239,68,68,0.5)',   allowRequest: false },
}

const copyCommand = async (title: string) => {
  const text = `点歌 ${title}`
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  return text
}

export default function HomePage() {
  const [songs, setSongs]             = useState<Song[]>([])
  const [total, setTotal]             = useState(0)
  const [totalPages, setTotalPages]   = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm]   = useState('')
  const [activeLang, setActiveLang]   = useState('ALL')
  const [loading, setLoading]         = useState(true)
  const [toast, setToast]             = useState('')
  const [randomSong, setRandomSong]   = useState<Song | null>(null)
  const [copiedId, setCopiedId]       = useState<number | null>(null)
  const [seed] = useState(() => {
    if (typeof sessionStorage !== 'undefined') {
      const k = 'yukari_song_seed'
      const ex = sessionStorage.getItem(k)
      if (ex) return parseInt(ex)
      const s = Math.floor(Math.random() * 0xffffff) + 1
      sessionStorage.setItem(k, String(s))
      return s
    }
    return Math.floor(Math.random() * 0xffffff) + 1
  })

  const searchMounted = useRef(false)
  const searchTimer   = useRef<ReturnType<typeof setTimeout>>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
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

  const pickRandom = async () => {
    try {
      const res = await fetch('/api/songs/random')
      if (res.ok) setRandomSong(await res.json())
    } catch { /* silent */ }
  }

  useEffect(() => { fetchSongs(currentPage, searchTerm, activeLang) }, [currentPage, activeLang, fetchSongs])
  useEffect(() => { pickRandom() }, [])

  useEffect(() => {
    if (!searchMounted.current) { searchMounted.current = true; return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setCurrentPage(1); fetchSongs(1, searchTerm, activeLang) }, 400)
  }, [searchTerm])

  const handleLang = (lang: string) => { setActiveLang(lang); setCurrentPage(1) }

  const handleCopy = async (song: Song) => {
    if (!STATUS_CONFIG[song.status]?.allowRequest) return
    const copied = await copyCommand(song.title)
    setCopiedId(song.id)
    showToast(`已复制：${copied}`)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const handleCopyRandom = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!randomSong) return
    const copied = await copyCommand(randomSong.title)
    showToast(`已复制：${copied}`)
  }

  /* ── shared button style ── */
  const btnCopy: React.CSSProperties = {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: '0.75rem',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    color: 'white', fontSize: '0.875rem', fontWeight: 600,
    border: 'none', cursor: 'pointer', transition: 'all 0.3s ease',
    marginTop: 'auto', touchAction: 'manipulation',
  }
  const btnPage: React.CSSProperties = {
    ...btnCopy, width: 'auto', padding: '0.5rem 1.25rem', marginTop: 0,
  }

  return (
    <div style={{ width: '100%', padding: '1rem 1rem 2rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: '#4f46e5', color: 'white',
          padding: '0.75rem 1.5rem', borderRadius: '9999px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)', animation: 'slideDown 0.3s',
        }}>
          {toast}
        </div>
      )}

      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* ── Top container: header card + random widget ── */}
        <div className="top-container">

          {/* Header card */}
          <div className="header-card">
            <div style={{ position: 'relative', zIndex: 10 }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                  欢迎来到优花璃的点歌台
                </h1>
                <p style={{ color: '#64748b', marginBottom: '0.5rem', maxWidth: '42rem' }}>
                  共收录{' '}
                  <strong style={{ color: '#4f46e5' }}>{total}</strong>
                  {' '}首歌曲&emsp;当前状态:
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    padding: '0.375rem 1rem', borderRadius: '9999px', fontSize: '0.75rem',
                    fontWeight: 700, background: 'rgba(34,197,94,0.1)', color: '#15803d',
                    marginLeft: '0.5rem',
                  }}>
                    <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                    可点歌
                  </span>
                </p>
              </div>

              {/* Filter row */}
              <div className="filter-row">
                <div style={{ position: 'relative', flex: 1 }}>
                  <svg style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                    xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="搜索歌曲 / 歌手..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.8)',
                      border: '1px solid #cbd5e1', borderRadius: '1rem',
                      padding: '0.625rem 1rem 0.625rem 2.5rem',
                      color: '#1e293b', fontSize: '1rem',
                      outline: 'none', transition: 'all 0.2s ease',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.5rem', margin: '0 -0.5rem', scrollbarWidth: 'none' }}>
                  {(['ALL', ...['中文', '日语', '英语', '其他']] as const).map(lang => (
                    <button
                      key={lang}
                      onClick={() => handleLang(lang)}
                      style={{
                        padding: '0.625rem 1.25rem', borderRadius: '0.75rem',
                        fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap',
                        cursor: 'pointer', touchAction: 'manipulation', transition: 'all 0.3s ease',
                        ...(activeLang === lang
                          ? { background: '#4f46e5', color: 'white', border: '1px solid #4f46e5', boxShadow: '0 2px 4px rgba(79,70,229,0.2)' }
                          : { background: 'rgba(255,255,255,0.8)', color: '#64748b', border: '1px solid rgba(255,255,255,0.5)' }),
                      }}
                    >
                      {lang === 'ALL' ? '全部' : lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Random widget */}
          <div
            className="random-widget-standalone"
            onClick={pickRandom}
            title="点击换一首"
          >
            {randomSong ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#d97706', border: '1px solid #f59e0b', padding: '0.25rem 0.625rem', borderRadius: '0.5rem', background: '#fffbeb' }}>
                    ✨ 随便听听
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '0.5rem', background: 'rgba(245,158,11,0.1)', color: '#b45309', border: '1px solid rgba(245,158,11,0.5)' }}>
                    点击刷新
                  </span>
                </div>
                <h3 style={{
                  fontSize: '1.5rem', fontWeight: 700, color: '#1e293b',
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  wordBreak: 'break-word', marginBottom: '0.5rem', lineHeight: 1.3,
                }}>
                  {randomSong.title}
                </h3>
                <p style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '1.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {randomSong.artist}
                </p>
                <button
                  onClick={handleCopyRandom}
                  style={{
                    ...btnCopy,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    fontSize: '1rem', padding: '0.875rem 1.5rem',
                  }}
                >
                  复制点歌弹幕
                </button>
              </>
            ) : (
              <div style={{ color: '#94a3b8', textAlign: 'center' }}>加载中...</div>
            )}
          </div>
        </div>

        {/* ── Song grid ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.7)' }}>加载中...</div>
        ) : songs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.7)' }}>暂无歌曲</div>
        ) : (
          <div className="song-grid">
            {songs.map((song, idx) => {
              const cfg = STATUS_CONFIG[song.status] ?? STATUS_CONFIG.normal
              return (
                <div
                  key={song.id}
                  className="song-card"
                  style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s` }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.75rem', color: '#64748b', border: '1px solid #cbd5e1',
                      padding: '0.25rem 0.625rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.5)',
                      transition: 'all 0.2s ease',
                    }}>
                      {song.language}
                    </span>
                    <span style={{
                      fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '0.5rem',
                      border: `1px solid ${cfg.borderColor}`, color: cfg.textColor, background: cfg.color,
                      transition: 'all 0.2s ease',
                    }}>
                      {cfg.label}
                    </span>
                  </div>

                  <p style={{
                    fontSize: '1.125rem', fontWeight: 700, color: '#1e293b',
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word', marginBottom: '0.25rem', lineHeight: 1.4,
                  }}>
                    {song.title}
                  </p>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {song.artist}
                  </p>

                  {cfg.allowRequest ? (
                    <button
                      onClick={() => handleCopy(song)}
                      style={{
                        ...btnCopy,
                        background: copiedId === song.id ? '#10b981' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      }}
                    >
                      {copiedId === song.id ? '✓ 已复制' : '复制点歌弹幕'}
                    </button>
                  ) : (
                    <button disabled style={{ ...btnCopy, background: '#e2e8f0', color: '#94a3b8', cursor: 'not-allowed' }}>
                      暂时不可点
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', paddingBottom: '1rem' }}>
            <button
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage(p => p - 1)}
              style={{ ...btnPage, background: currentPage <= 1 ? '#cbd5e1' : undefined, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
            >
              上一页
            </button>
            <span style={{ fontWeight: 'bold', color: '#ffffff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage(p => p + 1)}
              style={{ ...btnPage, background: currentPage >= totalPages ? '#cbd5e1' : undefined, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
            >
              下一页
            </button>
          </div>
        )}
      </div>

      <style>{`
        .animate-in { animation: fadeIn 0.5s; }

        .header-card {
          background: rgba(255,255,255,0.85);
          border-radius: 1.5rem;
          padding: 2rem;
          border: 1px solid rgba(255,255,255,0.5);
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          transition: box-shadow 0.3s ease, border-color 0.3s ease;
          backdrop-filter: blur(8px);
        }
        .header-card:hover {
          box-shadow: 0 12px 48px rgba(79,70,229,0.15);
          border-color: rgba(79,70,229,0.3);
        }

        .filter-row {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        @media (min-width: 768px) { .filter-row { flex-direction: row; align-items: center; } }

        .top-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        @media (min-width: 768px) {
          .top-container { display: grid; grid-template-columns: repeat(3, 1fr); align-items: stretch; }
          .header-card   { grid-column: span 2; }
        }
        @media (min-width: 1024px) {
          .top-container { grid-template-columns: repeat(4, 1fr); }
          .header-card   { grid-column: span 3; }
        }
        @media (min-width: 1280px) {
          .top-container { grid-template-columns: repeat(5, 1fr); }
          .header-card   { grid-column: span 4; }
        }

        .random-widget-standalone {
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(245,158,11,0.3);
          border-radius: 1rem;
          padding: 1.5rem;
          backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          justify-content: center;
          transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
          cursor: pointer;
          touch-action: manipulation;
        }
        .random-widget-standalone:hover {
          background: rgba(255,255,255,0.9);
          border-color: #f59e0b;
          box-shadow: 0 12px 48px rgba(245,158,11,0.2);
          transform: translateY(-4px);
        }

        .song-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 1rem;
        }
        @media (min-width: 640px)  { .song-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 768px)  { .song-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (min-width: 1024px) { .song-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1280px) { .song-grid { grid-template-columns: repeat(5, 1fr); } }

        .song-card {
          background: rgba(255,255,255,0.75);
          border: 1px solid rgba(255,255,255,0.6);
          border-radius: 1rem;
          padding: 1.25rem;
          min-width: 0;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background-color 0.2s ease;
          animation: fadeIn 0.5s ease-out backwards;
          display: flex;
          flex-direction: column;
          content-visibility: auto;
          contain-intrinsic-size: 0 180px;
        }
        .song-card:hover {
          border-color: rgba(79,70,229,0.6);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transform: translateY(-4px);
          background: rgba(255,255,255,0.95);
        }

        @media (max-width: 639px) {
          .header-card { padding: 1.25rem 1rem; }
          .random-widget-standalone { padding: 1rem; }
          .song-card { padding: 1rem; }
        }
        @media (hover: none) {
          .song-card:hover              { transform: none; box-shadow: none; }
          .random-widget-standalone:hover { transform: none; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
          .header-card:hover            { box-shadow: 0 8px 32px rgba(0,0,0,0.1); border-color: rgba(255,255,255,0.5); }
        }
      `}</style>
    </div>
  )
}
