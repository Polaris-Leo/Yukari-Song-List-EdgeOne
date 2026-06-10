'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  LogOut, Plus, Pencil, Trash2, Upload, ChevronLeft, ChevronRight, X, Music
} from 'lucide-react'

/* ── Types ── */
type Language = '中文' | '日语' | '英语' | '其他'
type Status   = 'normal' | 'need_sc' | 'banned'

interface Song {
  id: number
  title: string
  artist: string
  language: Language
  status: Status
}

interface SongForm {
  title: string
  artist: string
  language: Language
  status: Status
}

/* ── Constants ── */
const LANG_OPTS = ['ALL', '中文', '日语', '英语', '其他'] as const
const PAGE_SIZES = [20, 50, 100]

const STATUS_STYLE: Record<Status, { label: string; cls: string }> = {
  normal:  { label: '可点',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  need_sc: { label: '需SC', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  banned:  { label: '禁点', cls: 'bg-red-50 text-red-600 border-red-200' },
}
const LANG_STYLE: Record<Language, string> = {
  '中文': 'bg-blue-50 text-blue-700 border-blue-200',
  '日语': 'bg-pink-50 text-pink-700 border-pink-200',
  '英语': 'bg-violet-50 text-violet-700 border-violet-200',
  '其他': 'bg-zinc-100 text-zinc-600 border-zinc-200',
}

const VALID_LANGS:   Language[] = ['中文', '日语', '英语', '其他']
const VALID_STATUS:  Status[]   = ['normal', 'need_sc', 'banned']

const DEFAULT_FORM: SongForm = { title: '', artist: '', language: '中文', status: 'normal' }

/* ── CSV parser (RFC 4180) ── */
function parseCsvLine(line: string): string[] {
  const res: string[] = []
  let cur = '', inQ = false, i = 0
  while (i < line.length) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i += 2; continue }
      inQ = !inQ
    } else if (c === ',' && !inQ) {
      res.push(cur.trim()); cur = ''
    } else {
      cur += c
    }
    i++
  }
  res.push(cur.trim())
  return res
}

/* ── Badge ── */
function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md border ${cls}`}>
      {label}
    </span>
  )
}

/* ── Toast ── */
function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-zinc-900 text-white text-sm rounded-xl shadow-lg whitespace-nowrap">
      {msg}
    </div>
  )
}

/* ── Main ── */
export default function AdminPage() {
  const router = useRouter()

  /* list */
  const [songs, setSongs]           = useState<Song[]>([])
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize]     = useState(20)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeLang, setActiveLang] = useState('ALL')

  /* selection */
  const [selectedIds, setSelectedIds] = useState(new Set<number>())
  const headerCheckRef = useRef<HTMLInputElement>(null)

  /* modal */
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId]     = useState<number | null>(null)
  const [formData, setFormData]       = useState<SongForm>(DEFAULT_FORM)
  const [submitting, setSubmitting]   = useState(false)

  /* toast */
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  /* search debounce */
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)

  /* ── fetch ── */
  const fetchSongs = async (page = currentPage) => {
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(pageSize),
        language: activeLang, search: searchTerm,
      })
      const res  = await fetch(`/api/songs?${params}`)
      const data = await res.json()
      setSongs(data.data ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch { showToast('加载失败') }
  }

  useEffect(() => { fetchSongs(currentPage) }, [currentPage, activeLang, pageSize])
  useEffect(() => { setSelectedIds(new Set()) }, [currentPage, activeLang, pageSize])
  useEffect(() => {
    if (!headerCheckRef.current) return
    const some = songs.some(s => selectedIds.has(s.id))
    const all  = songs.length > 0 && songs.every(s => selectedIds.has(s.id))
    headerCheckRef.current.indeterminate = some && !all
  }, [songs, selectedIds])

  const handleSearch = (v: string) => {
    setSearchTerm(v)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setCurrentPage(1); fetchSongs(1) }, 380)
  }

  /* ── selection ── */
  const isAllSelected = songs.length > 0 && songs.every(s => selectedIds.has(s.id))
  const toggleAll = () => setSelectedIds(prev => {
    const next = new Set(prev)
    isAllSelected ? songs.forEach(s => next.delete(s.id)) : songs.forEach(s => next.add(s.id))
    return next
  })
  const toggleOne = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  /* ── CRUD ── */
  const openAdd  = () => { setFormData(DEFAULT_FORM); setEditingId(null); setIsModalOpen(true) }
  const openEdit = (s: Song) => {
    setFormData({ title: s.title, artist: s.artist, language: s.language, status: s.status })
    setEditingId(s.id); setIsModalOpen(true)
  }
  const closeModal = () => { setIsModalOpen(false); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true)
    try {
      const url    = editingId ? `/admin/api/songs/${editingId}` : '/admin/api/songs'
      const method = editingId ? 'PUT' : 'POST'
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      showToast(editingId ? '修改成功' : '添加成功')
      closeModal(); fetchSongs(currentPage)
    } catch { showToast(editingId ? '修改失败' : '添加失败') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这首歌吗？')) return
    try {
      await fetch(`/admin/api/songs/${id}`, { method: 'DELETE' })
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      showToast('删除成功'); fetchSongs(currentPage)
    } catch { showToast('删除失败') }
  }

  const handleBatchDelete = async () => {
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 首歌曲吗？此操作不可撤销。`)) return
    try {
      await fetch('/admin/api/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      showToast(`已删除 ${selectedIds.size} 首歌曲`)
      setSelectedIds(new Set()); fetchSongs(currentPage)
    } catch { showToast('批量删除失败') }
  }

  /* ── CSV import ── */
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('确定要导入该 CSV 文件吗？这会追加到现有数据库中。')) { e.target.value = ''; return }
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const text     = ev.target?.result as string
        const rows     = text.split(/\r?\n/)
        const csvSongs: Omit<Song, 'id'>[] = []
        const firstLine = (rows[0] ?? '').toLowerCase()
        if (firstLine.includes('title') || firstLine.includes('歌名')) {
          for (let i = 1; i < rows.length; i++) {
            const line = rows[i].trim(); if (!line) continue
            const [title, artist, language, status] = parseCsvLine(line)
            if (!title) continue
            csvSongs.push({
              title, artist: artist || '',
              language: VALID_LANGS.includes(language as Language) ? language as Language : '中文',
              status:   VALID_STATUS.includes(status as Status)    ? status as Status    : 'normal',
            })
          }
        } else {
          let start = 0
          for (let i = 0; i < rows.length; i++) {
            if (rows[i].includes('中文歌曲') && rows[i].includes('日语歌曲')) { start = i + 1; break }
          }
          const add = (title: string, lang: Language) => {
            if (!title || title.startsWith('表格') || title.startsWith('注：') || title === '韩语歌曲' || title === '塔语歌曲') return
            const clean = title.replace(/^"|"$/g, '').trim()
            if (clean) csvSongs.push({ title: clean, artist: '优花璃', language: lang, status: 'normal' })
          }
          for (let i = start; i < rows.length; i++) {
            const cols = parseCsvLine(rows[i].trim())
            if (cols[0]) add(cols[0], '中文')
            if (cols[2]) add(cols[2], '日语')
            if (cols[4]) add(cols[4], '英语')
            if (cols[6]) add(cols[6], '其他')
          }
        }
        if (csvSongs.length === 0) { showToast('未找到有效歌曲数据'); return }
        showToast(`解析出 ${csvSongs.length} 首，正在导入...`)
        await fetch('/admin/api/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(csvSongs),
        })
        showToast(`成功导入 ${csvSongs.length} 首新歌`)
        fetchSongs(currentPage)
      } catch (err: unknown) {
        showToast('导入失败: ' + (err instanceof Error ? err.message : '未知错误'))
      } finally { e.target.value = '' }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/login')
  }

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-zinc-50">
      {toast && <Toast msg={toast} />}

      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Music className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-base font-bold text-zinc-900">歌曲管理后台</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />退出登录
          </button>
        </div>

        {/* Card */}
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100 flex-wrap">
            <span className="text-xs text-zinc-400 shrink-0">共 {total} 首</span>

            <input
              className="flex-1 min-w-36 max-w-56 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
              placeholder="搜索歌曲 / 歌手..."
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
            />

            <div className="flex gap-1 flex-wrap">
              {LANG_OPTS.map(lang => (
                <button
                  key={lang}
                  onClick={() => { setActiveLang(lang); setCurrentPage(1) }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    activeLang === lang
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'border-zinc-200 text-zinc-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {lang === 'ALL' ? '全部' : lang}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                className="px-2 py-1.5 text-xs border border-zinc-200 rounded-lg outline-none text-zinc-600 bg-white"
              >
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}条/页</option>)}
              </select>

              {selectedIds.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />删除({selectedIds.size})
                </button>
              )}

              <label className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer transition-colors">
                <Upload className="h-3 w-3" />导入CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </label>

              <button
                onClick={openAdd}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />新增
              </button>
            </div>
          </div>

          {/* Table header */}
          <div className="hidden sm:grid grid-cols-[36px_2fr_1.5fr_80px_80px_88px] gap-4 px-4 py-2 bg-zinc-50 border-b border-zinc-100 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            <input
              ref={headerCheckRef}
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleAll}
              className="h-3.5 w-3.5"
            />
            <span>歌名</span><span>歌手</span><span>语言</span><span>状态</span><span>操作</span>
          </div>

          {/* Rows */}
          {songs.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">暂无歌曲</div>
          ) : songs.map(song => (
            <div
              key={song.id}
              className={`grid grid-cols-[28px_1fr] sm:grid-cols-[36px_2fr_1.5fr_80px_80px_88px] gap-4 px-4 py-3 border-b border-zinc-50 last:border-0 transition-colors ${
                selectedIds.has(song.id) ? 'bg-indigo-50/60' : 'hover:bg-zinc-50/80'
              }`}
            >
              <input type="checkbox" checked={selectedIds.has(song.id)} onChange={() => toggleOne(song.id)} className="h-3.5 w-3.5 mt-0.5" />
              <span className="font-medium text-sm text-zinc-900 truncate">{song.title}</span>
              <span className="hidden sm:block text-sm text-zinc-500 truncate">{song.artist}</span>
              <span className="hidden sm:flex items-center">
                <Badge label={song.language} cls={LANG_STYLE[song.language] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'} />
              </span>
              <span className="hidden sm:flex items-center">
                <Badge label={STATUS_STYLE[song.status]?.label ?? song.status} cls={STATUS_STYLE[song.status]?.cls ?? ''} />
              </span>
              <div className="hidden sm:flex items-center gap-1">
                <button onClick={() => openEdit(song)} className="p-1.5 text-zinc-400 hover:text-sky-500 hover:bg-sky-50 rounded-lg transition-colors" title="编辑">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(song.id)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="删除">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-zinc-500 px-1">{currentPage} / {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md z-50">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-zinc-900 text-sm">{editingId ? '编辑歌曲' : '新增歌曲'}</h2>
              <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">歌名 *</label>
                <input
                  type="text" required autoFocus
                  value={formData.title}
                  onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">歌手</label>
                <input
                  type="text"
                  value={formData.artist}
                  onChange={e => setFormData(f => ({ ...f, artist: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">语言</label>
                  <select
                    value={formData.language}
                    onChange={e => setFormData(f => ({ ...f, language: e.target.value as Language }))}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
                  >
                    {VALID_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1.5">状态</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(f => ({ ...f, status: e.target.value as Status }))}
                    className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
                  >
                    <option value="normal">可点歌</option>
                    <option value="need_sc">需SC</option>
                    <option value="banned">禁止点歌</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors">
                  取消
                </button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg disabled:opacity-60 transition-colors">
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
