'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Music, Shuffle, Search, ChevronLeft, ChevronRight, Copy, Check, Dice5 } from 'lucide-react'

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
  page: number
}

const LANG_OPTIONS = ['ALL', '中文', '日语', '英语', '其他'] as const

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  normal:  { label: '可点',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  need_sc: { label: '需SC', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  banned:  { label: '禁点', cls: 'bg-red-50 text-red-600 border-red-200' },
}

const LANG_STYLE: Record<string, string> = {
  '中文': 'bg-blue-50 text-blue-700 border-blue-200',
  '日语': 'bg-pink-50 text-pink-700 border-pink-200',
  '英语': 'bg-violet-50 text-violet-700 border-violet-200',
  '其他': 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

function Badge({ children, cls }: { children: React.ReactNode; cls?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${cls}`}>
      {children}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button
      onClick={copy}
      className="mt-auto pt-3 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-indigo-500 transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? '已复制' : '复制歌名'}
    </button>
  )
}

export default function HomePage() {
  const [songs, setSongs]           = useState<Song[]>([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeLang, setActiveLang] = useState('ALL')
  const [loading, setLoading]       = useState(true)
  const [randomSong, setRandomSong] = useState<Song | null>(null)
  const [seed]                      = useState(() => Math.floor(Math.random() * 1_000_000_000) + 1)

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const fetchSongs = useCallback(async (page: number, search: string, lang: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        language: lang,
        search,
        ...(search ? {} : { seed: String(seed) }),
      })
      const res = await fetch(`/api/songs?${params}`)
      const data: SongsResponse = await res.json()
      setSongs(data.data ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [seed])

  useEffect(() => {
    fetchSongs(currentPage, searchTerm, activeLang)
  }, [currentPage, activeLang, fetchSongs])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setCurrentPage(1)
      fetchSongs(1, value, activeLang)
    }, 380)
  }

  const handleLang = (lang: string) => {
    setActiveLang(lang)
    setCurrentPage(1)
  }

  const handleRandom = async () => {
    const res = await fetch('/api/songs/random')
    if (res.ok) setRandomSong(await res.json())
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Music className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-zinc-900 leading-tight">优花璃点歌台</h1>
              <p className="text-xs text-zinc-400">共 {total} 首歌曲</p>
            </div>
          </div>
          <button
            onClick={handleRandom}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-xs"
          >
            <Dice5 className="h-4 w-4" />
            随机点歌
          </button>
        </div>

        {/* Random song result */}
        {randomSong && (
          <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
            <div className="flex items-center gap-3">
              <Shuffle className="h-4 w-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-indigo-900">{randomSong.title}</p>
                <p className="text-xs text-indigo-500">{randomSong.artist}</p>
              </div>
            </div>
            <button onClick={() => setRandomSong(null)} className="text-indigo-300 hover:text-indigo-500 transition-colors text-lg leading-none">×</button>
          </div>
        )}

        {/* Search + Lang Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              placeholder="搜索歌曲 / 歌手..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {LANG_OPTIONS.map(lang => (
              <button
                key={lang}
                onClick={() => handleLang(lang)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  activeLang === lang
                    ? 'bg-indigo-500 border-indigo-500 text-white shadow-xs'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {lang === 'ALL' ? '全部' : lang}
              </button>
            ))}
          </div>
        </div>

        {/* Song grid */}
        {loading ? (
          <div className="py-20 text-center text-sm text-zinc-400">加载中...</div>
        ) : songs.length === 0 ? (
          <div className="py-20 text-center text-sm text-zinc-400">暂无歌曲</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {songs.map(song => {
              const status = STATUS_STYLE[song.status]
              const langCls = LANG_STYLE[song.language] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
              return (
                <div
                  key={song.id}
                  className="flex flex-col bg-white border border-zinc-200 rounded-xl p-4 hover:border-zinc-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge cls={langCls}>{song.language}</Badge>
                    {status && <Badge cls={status.cls}>{status.label}</Badge>}
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 leading-snug line-clamp-2 mb-1">
                    {song.title}
                  </p>
                  <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                  <CopyButton text={song.title} />
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-zinc-500 px-2">{currentPage} / {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
