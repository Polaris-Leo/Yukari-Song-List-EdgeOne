'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Language = '中文' | '日语' | '英语' | '其他'
type Status   = 'normal' | 'need_sc' | 'banned'

interface Song {
  id: number; title: string; artist: string; language: Language; status: Status
}
interface SongForm {
  title: string; artist: string; language: Language; status: Status
}

const LANG_OPTS   = ['ALL', '中文', '日语', '英语', '其他'] as const
const PAGE_SIZES  = [20, 50, 100]
const VALID_LANGS: Language[] = ['中文', '日语', '英语', '其他']
const VALID_STATUS: Status[]  = ['normal', 'need_sc', 'banned']

const STATUS_LABEL: Record<Status, string> = { normal: '可点', need_sc: '需SC', banned: '禁点' }
const STATUS_STYLE: Record<Status, { color: string; bg: string; border: string }> = {
  normal:  { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  need_sc: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  banned:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
}

const DEFAULT_FORM: SongForm = { title: '', artist: '', language: '中文', status: 'normal' }

function parseCsvLine(line: string): string[] {
  const res: string[] = []; let cur = '', inQ = false, i = 0
  while (i < line.length) {
    const c = line[i]
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i += 2; continue } inQ = !inQ }
    else if (c === ',' && !inQ) { res.push(cur.trim()); cur = '' }
    else { cur += c }
    i++
  }
  res.push(cur.trim()); return res
}

/* ── Pagination helpers (same logic as main page) ── */
function getPageItems(current: number, total: number): (number | 'le' | 're')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const delta = 2
  const lo = Math.max(2, current - delta)
  const hi = Math.min(total - 1, current + delta)
  const mid: number[] = []
  for (let i = lo; i <= hi; i++) mid.push(i)
  const result: (number | 'le' | 're')[] = [1]
  if (lo > 2)         result.push('le')
  result.push(...mid)
  if (hi < total - 1) result.push('re')
  result.push(total)
  return result
}

function PgBtn({ active, disabled, onClick, children, ...rest }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }
) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      {...rest}
      style={{
        minWidth: 32, height: 32, padding: '0 0.375rem',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: active ? 600 : 400,
        border: active ? '1px solid #4f46e5' : '1px solid #e2e8f0',
        background: active ? '#4f46e5' : 'white',
        color: active ? 'white' : disabled ? '#c0ccd8' : '#374151',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  )
}

/* ── Shared style tokens ── */
const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.85)', borderRadius: '1rem',
  border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(14px)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.1)', overflow: 'hidden',
}
const btnPrimary: React.CSSProperties = {
  padding: '0.45rem 0.875rem', borderRadius: '0.5rem', border: 'none',
  background: '#4f46e5', color: 'white', fontWeight: 600,
  fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
}
const btnDanger: React.CSSProperties = {
  ...btnPrimary, background: '#ef4444',
}
const btnGhost: React.CSSProperties = {
  ...btnPrimary, background: 'transparent', color: '#64748b',
  border: '1px solid #cbd5e1',
}
const inputStyle: React.CSSProperties = {
  padding: '0.45rem 0.75rem', background: 'rgba(255,255,255,0.95)',
  border: '1px solid #cbd5e1', borderRadius: '0.5rem',
  color: '#1e293b', fontSize: '0.875rem', outline: 'none', transition: 'border-color 0.15s',
}
/* unified size for edit/delete row-action buttons */
const btnRowAction: React.CSSProperties = {
  padding: '0.3rem 0.5rem', borderRadius: '0.375rem', border: 'none',
  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
  transition: 'all 0.15s', flexShrink: 0, lineHeight: 1.2,
  whiteSpace: 'nowrap',
}

export default function AdminPage() {
  const router = useRouter()

  const [songs, setSongs]             = useState<Song[]>([])
  const [total, setTotal]             = useState(0)
  const [totalPages, setTotalPages]   = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize]       = useState(20)
  const [searchTerm, setSearchTerm]   = useState('')
  const [activeLang, setActiveLang]   = useState('ALL')
  const [selectedIds, setSelectedIds] = useState(new Set<number>())
  const headerCheckRef = useRef<HTMLInputElement>(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId]     = useState<number | null>(null)
  const [formData, setFormData]       = useState<SongForm>(DEFAULT_FORM)
  const [submitting, setSubmitting]   = useState(false)

  const [toast, setToast] = useState('')
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null)

  const fetchSongs = async (page = currentPage) => {
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(pageSize), language: activeLang, search: searchTerm,
      })
      const res  = await fetch(`/api/songs?${params}`)
      const data = await res.json()
      setSongs(data.data ?? []); setTotal(data.total ?? 0); setTotalPages(data.totalPages ?? 1)
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

  const isAllSelected = songs.length > 0 && songs.every(s => selectedIds.has(s.id))
  const toggleAll = () => setSelectedIds(prev => {
    const next = new Set(prev)
    isAllSelected ? songs.forEach(s => next.delete(s.id)) : songs.forEach(s => next.add(s.id))
    return next
  })
  const toggleOne = (id: number) => setSelectedIds(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const openAdd  = () => { setFormData(DEFAULT_FORM); setEditingId(null); setIsModalOpen(true) }
  const openEdit = (s: Song) => {
    setFormData({ title: s.title, artist: s.artist, language: s.language, status: s.status })
    setEditingId(s.id); setIsModalOpen(true)
  }
  const closeModal = () => { setIsModalOpen(false); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true)
    try {
      const url = editingId ? `/admin/api/songs/${editingId}` : '/admin/api/songs'
      await fetch(url, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      showToast(editingId ? '修改成功' : '添加成功'); closeModal(); fetchSongs(currentPage)
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
      await fetch('/admin/api/batch-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selectedIds) }) })
      showToast(`已删除 ${selectedIds.size} 首歌曲`); setSelectedIds(new Set()); fetchSongs(currentPage)
    } catch { showToast('批量删除失败') }
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    if (!confirm('确定要导入该 CSV 文件吗？这会追加到现有数据库中。')) { e.target.value = ''; return }
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const text = ev.target?.result as string; const rows = text.split(/\r?\n/)
        const csvSongs: Omit<Song, 'id'>[] = []
        const firstLine = (rows[0] ?? '').toLowerCase()
        if (firstLine.includes('title') || firstLine.includes('歌名')) {
          for (let i = 1; i < rows.length; i++) {
            const line = rows[i].trim(); if (!line) continue
            const [title, artist, language, status] = parseCsvLine(line); if (!title) continue
            csvSongs.push({ title, artist: artist || '', language: VALID_LANGS.includes(language as Language) ? language as Language : '中文', status: VALID_STATUS.includes(status as Status) ? status as Status : 'normal' })
          }
        } else {
          let start = 0
          for (let i = 0; i < rows.length; i++) { if (rows[i].includes('中文歌曲') && rows[i].includes('日语歌曲')) { start = i + 1; break } }
          const add = (title: string, lang: Language) => {
            if (!title || title.startsWith('表格') || title.startsWith('注：') || title === '韩语歌曲' || title === '塔语歌曲') return
            const clean = title.replace(/^"|"$/g, '').trim(); if (clean) csvSongs.push({ title: clean, artist: '优花璃', language: lang, status: 'normal' })
          }
          for (let i = start; i < rows.length; i++) {
            const cols = parseCsvLine(rows[i].trim())
            if (cols[0]) add(cols[0], '中文'); if (cols[2]) add(cols[2], '日语')
            if (cols[4]) add(cols[4], '英语'); if (cols[6]) add(cols[6], '其他')
          }
        }
        if (csvSongs.length === 0) { showToast('未找到有效歌曲数据'); return }
        showToast(`解析出 ${csvSongs.length} 首，正在导入...`)
        await fetch('/admin/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(csvSongs) })
        showToast(`成功导入 ${csvSongs.length} 首新歌`); fetchSongs(currentPage)
      } catch (err: unknown) { showToast('导入失败: ' + (err instanceof Error ? err.message : '未知错误')) }
      finally { e.target.value = '' }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/login')
  }

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.3rem 0.7rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600,
    cursor: 'pointer', border: active ? '1px solid #4f46e5' : '1px solid #cbd5e1',
    background: active ? '#4f46e5' : 'white', color: active ? 'white' : '#64748b',
    transition: 'all 0.15s', whiteSpace: 'nowrap' as const,
  })

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem 1.5rem 6rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: 'white', padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem', fontSize: '0.875rem', zIndex: 9999,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.375rem', color: 'rgba(255,255,255,0.95)', textShadow: '0 2px 10px rgba(0,0,0,0.35)', fontWeight: 700 }}>
          歌曲管理后台
        </h1>
        <button onClick={handleLogout} style={btnDanger}>退出登录</button>
      </div>

      {/* Main card */}
      <div style={card}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
          {/* Left: count + search + lang pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>共 {total} 首</span>
            <input
              style={{ ...inputStyle, flex: 1, minWidth: '160px', maxWidth: '280px' }}
              placeholder="搜索歌曲 / 歌手..."
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {LANG_OPTS.map(lang => (
                <button key={lang} style={pillStyle(activeLang === lang)}
                  onClick={() => { setActiveLang(lang); setCurrentPage(1) }}>
                  {lang === 'ALL' ? '全部' : lang}
                </button>
              ))}
            </div>
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {selectedIds.size > 0 && (
              <button style={btnDanger} onClick={handleBatchDelete}>批量删除({selectedIds.size})</button>
            )}
            <label style={{ ...btnGhost, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
              导入CSV
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvUpload} />
            </label>
            <button style={btnPrimary} onClick={openAdd}>+ 新增歌曲</button>
          </div>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '36px minmax(0,2fr) minmax(0,1.5fr) 64px 64px 88px',
          gap: '0.75rem', padding: '0.5rem 1.25rem',
          background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <input ref={headerCheckRef} type="checkbox" style={{ width: 15, height: 15 }}
            checked={isAllSelected} onChange={toggleAll} />
          <span>歌名</span><span>歌手</span><span>语言</span><span>状态</span><span>操作</span>
        </div>

        {/* Rows */}
        <div>
          {songs.length === 0
            ? <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>暂无歌曲</div>
            : songs.map(song => {
              const st = STATUS_STYLE[song.status]
              return (
                <div key={song.id} style={{
                  display: 'grid', gridTemplateColumns: '36px minmax(0,2fr) minmax(0,1.5fr) 64px 64px 88px',
                  gap: '0.75rem', padding: '0.5rem 1.25rem', borderBottom: '1px solid #f1f5f9',
                  alignItems: 'center', minHeight: '48px',
                  background: selectedIds.has(song.id) ? 'rgba(79,70,229,0.07)' : 'transparent',
                  transition: 'background 0.12s',
                }}>
                  <input type="checkbox" style={{ width: 15, height: 15 }}
                    checked={selectedIds.has(song.id)} onChange={() => toggleOne(song.id)} />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</span>
                  <span style={{ fontSize: '0.875rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</span>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', background: '#f1f5f9', color: '#64748b', justifySelf: 'start' }}>{song.language}</span>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${st.border}`, color: st.color, background: st.bg, justifySelf: 'start' }}>
                    {STATUS_LABEL[song.status]}
                  </span>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'nowrap', alignItems: 'center' }}>
                    <button style={{ ...btnRowAction, background: '#0ea5e9', color: 'white' }} onClick={() => openEdit(song)}>编辑</button>
                    <button style={{ ...btnRowAction, background: '#ef4444', color: 'white' }} onClick={() => handleDelete(song.id)}>删除</button>
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Pagination bar — always shown when there are results */}
      {total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 0.875rem',
            background: 'rgba(255,255,255,0.82)',
            border: '1px solid rgba(255,255,255,0.6)',
            borderRadius: '0.875rem',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            flexWrap: 'wrap',
          }}>
            {/* Page navigation — only when multiple pages */}
            {totalPages > 1 && (
              <>
                <PgBtn active={false} disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)} aria-label="上一页">
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </PgBtn>
                {getPageItems(currentPage, totalPages).map((item, i) =>
                  item === 'le' || item === 're' ? (
                    <span key={item + i} style={{ width: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem', userSelect: 'none' }}>···</span>
                  ) : (
                    <PgBtn key={item} active={item === currentPage} onClick={() => setCurrentPage(item as number)}>
                      {item}
                    </PgBtn>
                  )
                )}
                <PgBtn active={false} disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} aria-label="下一页">
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none"><path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </PgBtn>

                {/* Divider */}
                <span style={{ width: 1, height: 16, background: '#e2e8f0', margin: '0 0.125rem', flexShrink: 0 }} />
              </>
            )}

            {/* Page size selector (Semi Design showSizeChanger style) */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                style={{
                  appearance: 'none', WebkitAppearance: 'none',
                  height: 32, padding: '0 26px 0 10px',
                  border: '1px solid #e2e8f0', borderRadius: '6px',
                  background: 'white', color: '#374151',
                  fontSize: '0.8125rem', cursor: 'pointer', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
              >
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s} 条/页</option>)}
              </select>
              <svg style={{ position: 'absolute', right: 7, pointerEvents: 'none' }} width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, backdropFilter: 'blur(4px)',
        }} onClick={closeModal}>
          <div style={{
            background: 'rgba(255,255,255,0.97)', padding: '2rem', borderRadius: '1rem',
            width: '90%', maxWidth: '460px', border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            animation: 'modalPop 0.3s cubic-bezier(0.16,1,0.3,1)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.5rem' }}>
              {editingId ? '编辑歌曲' : '新增歌曲'}
            </h2>
            <form onSubmit={handleSubmit}>
              {(['title', 'artist'] as const).map(field => (
                <div key={field} style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>
                    {field === 'title' ? '歌名 *' : '歌手'}
                  </label>
                  <input
                    type="text" required={field === 'title'} autoFocus={field === 'title'}
                    value={formData[field]}
                    onChange={e => setFormData(f => ({ ...f, [field]: e.target.value }))}
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>语言</label>
                  <select value={formData.language} onChange={e => setFormData(f => ({ ...f, language: e.target.value as Language }))}
                    style={{ ...inputStyle, width: '100%' }}>
                    {VALID_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>状态</label>
                  <select value={formData.status} onChange={e => setFormData(f => ({ ...f, status: e.target.value as Status }))}
                    style={{ ...inputStyle, width: '100%' }}>
                    <option value="normal">可点歌</option>
                    <option value="need_sc">需SC</option>
                    <option value="banned">禁止点歌</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={closeModal} style={{ ...btnGhost, flex: 1, padding: '0.625rem' }}>取消</button>
                <button type="submit" disabled={submitting} style={{ ...btnPrimary, flex: 1, padding: '0.625rem', opacity: submitting ? 0.7 : 1 }}>
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
