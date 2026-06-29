'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  getMyGrades, createGrade, updateGrade, deleteGrade, getGradeChapterIds,
  type GradeSummary,
} from '@/lib/supabase/queries'
import { AGE_GROUP_OPTIONS, AGE_GROUP_LABELS } from '@/lib/ageGroups'
import { chaptersForAge, type AgeGroup, type ChapterType } from '@/lib/chapters'

export default function GradesPage() {
  const router = useRouter()
  const [grades,    setGrades]    = useState<GradeSummary[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editing,   setEditing]   = useState<GradeSummary | 'new' | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth'); return }
    setGrades(await getMyGrades())
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: string) {
    const ok = await deleteGrade(id)
    if (ok) { setConfirming(null); await load() }
  }

  if (loading) return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FCEAB6', fontSize:48 }}>🎓</div>
  )

  return (
    <div style={{ minHeight:'100dvh', background:'linear-gradient(180deg,#FFF4D6 0%,#f9f9f9 40%)', fontFamily:'var(--font-body)' }}>

      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:'#fff', boxShadow:'0 1px 8px rgba(0,0,0,0.06)', position:'sticky', top:0, zIndex:10 }}>
        <button onClick={() => router.push('/parent')} style={{ background:'none', border:'1.5px solid #e5e7eb', borderRadius:50, padding:'8px 14px', fontSize:13, fontWeight:600, color:'#888', cursor:'pointer' }}>← Back</button>
        <div style={{ fontSize:16, fontWeight:800, color:'#1a1a1a' }}>🎓 Grades</div>
        <div style={{ width:64 }} />
      </div>

      <div style={{ padding:'20px 16px', maxWidth:480, margin:'0 auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <p style={{ fontSize:14, color:'#6b7280', margin:0, lineHeight:1.4, maxWidth:300 }}>
            A grade picks one age band and the chapters it includes. Add children to a grade to scope what they see.
          </p>
          <button onClick={() => setEditing('new')} style={{ flexShrink:0, background:'#F26B2C', color:'#fff', border:'none', borderRadius:50, padding:'9px 16px', fontSize:13, fontWeight:700, cursor:'pointer' }}>+ New</button>
        </div>

        {grades.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:56 }}>🎓</div>
            <h2 style={{ fontSize:20, fontWeight:800, color:'#1a1a1a', margin:0 }}>No grades yet</h2>
            <p style={{ fontSize:14, color:'#888', margin:0, maxWidth:280, lineHeight:1.5 }}>
              Create a grade, pick its age band, and choose which chapters it includes.
            </p>
            <button onClick={() => setEditing('new')} style={{ marginTop:4, background:'linear-gradient(135deg,#F26B2C 0%,#e05a1f 100%)', color:'#fff', border:'none', borderRadius:50, padding:'14px 30px', fontSize:16, fontWeight:800, cursor:'pointer', boxShadow:'0 4px 20px rgba(242,107,44,0.3)' }}>
              + Create your first grade
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {grades.map(g => {
              const total = chaptersForAge(g.age_group).length
              return (
                <div key={g.id} style={{ background:'#fff', borderRadius:18, padding:'16px', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:17, fontWeight:800, color:'#1a1a1a' }}>{g.name}</div>
                      <div style={{ fontSize:13, color:'#6b7280', marginTop:3 }}>
                        {AGE_GROUP_LABELS[g.age_group]} · {g.chapterCount}/{total} chapters · {g.learnerCount} {g.learnerCount === 1 ? 'child' : 'children'}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={() => setEditing(g)} style={{ background:'#f3f4f6', border:'none', borderRadius:10, padding:'7px 12px', fontSize:13, fontWeight:700, color:'#374151', cursor:'pointer' }}>Edit</button>
                      <button onClick={() => setConfirming(g.id)} style={{ background:'none', border:'1.5px solid #FCA5A5', borderRadius:10, padding:'7px 11px', fontSize:13, fontWeight:700, color:'#DC2626', cursor:'pointer' }}>🗑</button>
                    </div>
                  </div>
                  {confirming === g.id && (
                    <div style={{ marginTop:12, background:'#FEF2F2', border:'1.5px solid #FCA5A5', borderRadius:12, padding:'12px' }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'#991B1B', margin:'0 0 10px' }}>
                        Delete “{g.name}”? Children in it keep their progress and revert to all chapters in their age band.
                      </p>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => handleDelete(g.id)} style={{ flex:1, padding:'10px', background:'#DC2626', color:'#fff', border:'none', borderRadius:40, fontSize:13, fontWeight:800, cursor:'pointer' }}>Yes, delete</button>
                        <button onClick={() => setConfirming(null)} style={{ flex:1, padding:'10px', background:'#fff', color:'#888', border:'1.5px solid #e5e7eb', borderRadius:40, fontSize:13, fontWeight:700, cursor:'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editing && (
        <GradeModal
          grade={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load() }}
        />
      )}
    </div>
  )
}

function GradeModal({ grade, onClose, onSaved }: {
  grade: GradeSummary | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = grade !== null
  const [name,     setName]     = useState(grade?.name ?? '')
  const [band,     setBand]     = useState<AgeGroup>(grade?.age_group ?? '3-5')
  const [selected, setSelected] = useState<Set<ChapterType>>(new Set())
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [chReady,  setChReady]  = useState(!isEdit)

  const bandChapters = chaptersForAge(band)

  // Create: all chapters pre-selected. Edit: pre-select the grade's saved set.
  useEffect(() => {
    if (isEdit) {
      getGradeChapterIds(grade!.id).then(ids => {
        setSelected(new Set(ids.filter(id => bandChapters.some(c => c.id === id))))
        setChReady(true)
      })
    } else {
      setSelected(new Set(bandChapters.map(c => c.id)))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When the band changes (create mode only), reset to "all selected" for it.
  function pickBand(b: AgeGroup) {
    setBand(b)
    setSelected(new Set(chaptersForAge(b).map(c => c.id)))
  }

  function toggle(id: ChapterType) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Preserve band order in the saved list.
  function orderedSelection(): ChapterType[] {
    return bandChapters.filter(c => selected.has(c.id)).map(c => c.id)
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (trimmed.length < 1) { setError('Please name this grade'); return }
    const chapterIds = orderedSelection()
    if (chapterIds.length === 0) { setError('Pick at least one chapter'); return }
    setLoading(true)
    const ok = isEdit
      ? await updateGrade(grade!.id, { name: trimmed, chapterIds })
      : !!(await createGrade(trimmed, band, chapterIds))
    if (!ok) { setError('Something went wrong. Please try again.'); setLoading(false); return }
    onSaved()
  }

  const allSelected = bandChapters.length > 0 && bandChapters.every(c => selected.has(c.id))

  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'24px 20px 40px', width:'100%', maxWidth:480, maxHeight:'90dvh', overflowY:'auto', animation:'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize:20, fontWeight:800, margin:'0 0 18px', color:'#1a1a1a' }}>{isEdit ? 'Edit grade' : 'New grade'}</h3>

        <p style={{ fontSize:13, fontWeight:700, color:'#6b7280', margin:'0 0 8px' }}>Grade name</p>
        <input type="text" placeholder="e.g. Grade 5 — Section A" value={name} onChange={e => { setName(e.target.value); setError(null) }} maxLength={60} autoFocus style={{ width:'100%', padding:'13px 15px', fontSize:16, fontWeight:600, border:`2px solid ${error?'#FCA5A5':'#e5e7eb'}`, borderRadius:14, outline:'none', boxSizing:'border-box', marginBottom:18 }} />

        <p style={{ fontSize:13, fontWeight:700, color:'#6b7280', margin:'0 0 8px' }}>Age band</p>
        {isEdit ? (
          <div style={{ padding:'12px 14px', borderRadius:14, background:'#f3f4f6', fontSize:15, fontWeight:800, color:'#1a1a1a', marginBottom:18 }}>
            {AGE_GROUP_LABELS[band]}
            <span style={{ display:'block', fontSize:11, color:'#6b7280', fontWeight:600, marginTop:2 }}>Band can&apos;t change — make a new grade for another band.</span>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:18 }}>
            {AGE_GROUP_OPTIONS.map(opt => {
              const on = band === opt.value
              return (
                <button key={opt.value} onClick={() => pickBand(opt.value)} style={{ textAlign:'left', padding:'11px 14px', borderRadius:14, cursor:'pointer', background:on?'#FFF4D6':'#f3f4f6', border:on?'3px solid #F26B2C':'2px solid transparent' }}>
                  <div style={{ fontSize:15, fontWeight:800, color:'#1a1a1a' }}>{opt.label}</div>
                  <div style={{ fontSize:11, color:'#6b7280', lineHeight:1.3, marginTop:2 }}>{opt.hint}</div>
                </button>
              )
            })}
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'0 0 8px' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'#6b7280', margin:0 }}>Chapters ({selected.size}/{bandChapters.length})</p>
          <button
            onClick={() => setSelected(allSelected ? new Set() : new Set(bandChapters.map(c => c.id)))}
            style={{ background:'none', border:'none', color:'#F26B2C', fontSize:12, fontWeight:700, cursor:'pointer' }}
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>

        {!chReady ? (
          <div style={{ padding:'24px', textAlign:'center', color:'#888', fontSize:14 }}>Loading chapters…</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:8 }}>
            {bandChapters.map(c => {
              const on = selected.has(c.id)
              return (
                <button key={c.id} onClick={() => toggle(c.id)} style={{ display:'flex', alignItems:'center', gap:12, textAlign:'left', padding:'10px 12px', borderRadius:12, cursor:'pointer', background:on?'#FFF4D6':'#f9fafb', border:on?'2px solid #F26B2C':'2px solid #f1f1f1' }}>
                  <div style={{ width:24, height:24, flexShrink:0, borderRadius:7, border:on?'none':'2px solid #d1d5db', background:on?'#F26B2C':'#fff', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900 }}>{on ? '✓' : ''}</div>
                  <span style={{ fontSize:20 }}>{c.emoji}</span>
                  <span style={{ flex:1, fontSize:14, fontWeight:700, color:'#1a1a1a' }}>{c.parentLabel}</span>
                </button>
              )
            })}
          </div>
        )}

        {error && <p style={{ fontSize:13, color:'#EF4444', margin:'8px 0 0' }}>{error}</p>}

        <button onClick={handleSave} disabled={loading} style={{ width:'100%', padding:'15px', marginTop:14, background:loading?'#e5e7eb':'linear-gradient(135deg,#F26B2C 0%,#e05a1f 100%)', color:loading?'#9ca3af':'#fff', border:'none', borderRadius:50, fontSize:16, fontWeight:800, cursor:loading?'wait':'pointer' }}>
          {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create grade 🎓'}
        </button>
      </div>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  )
}
