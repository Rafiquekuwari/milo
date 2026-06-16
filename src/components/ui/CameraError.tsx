'use client'
/**
 * CameraError — friendly, permission-aware overlay shown when an AR activity
 * can't start the camera. Reads the getUserMedia error name and gives the right
 * "how to fix" steps (blocked / not found / busy), plus a Try again button that
 * re-requests the camera. Drops into an activity's (position:relative) video box.
 */
interface Props {
  errorName: string
  onRetry: () => void
  onBack: () => void
  fallback?: { label: string; onClick: () => void } // e.g. "play by tapping instead"
}

function help(name: string): { title: string; tips: string[] } {
  const n = (name || '').toLowerCase()
  if (n.includes('notallowed') || n.includes('denied') || n.includes('permission') || n.includes('dismissed'))
    return { title: 'Camera is blocked', tips: ['Tap the camera icon in your browser’s address bar', 'Choose “Allow” for the camera', 'Then tap Try again'] }
  if (n.includes('notfound') || n.includes('devicesnotfound') || n.includes('overconstrained'))
    return { title: 'No camera found', tips: ['Connect or enable a webcam', 'Then tap Try again'] }
  if (n.includes('notreadable') || n.includes('inuse') || n.includes('trackstart') || n.includes('aborterror'))
    return { title: 'Camera is busy', tips: ['Close other apps using the camera (Zoom, Meet…)', 'Then tap Try again'] }
  return { title: 'Couldn’t start the camera', tips: ['Allow camera access for this site', 'Then tap Try again'] }
}

export default function CameraError({ errorName, onRetry, onBack, fallback }: Props) {
  const h = help(errorName)
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(61,37,22,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--paper)', border: '4px solid var(--outline)', borderRadius: 20, padding: '22px 20px', maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 6px 0 rgba(61,37,22,.25)' }}>
        <div style={{ fontSize: 44 }}>🎥</div>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', margin: '6px 0 10px', fontSize: 20 }}>{h.title}</h3>
        <ol style={{ textAlign: 'left', margin: '0 0 16px', paddingLeft: 22, color: 'var(--ink-soft)', fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6 }}>
          {h.tips.map((t, i) => <li key={i}>{t}</li>)}
        </ol>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="milo-btn tone-green size-lg" onClick={onRetry}>🔄 Try again</button>
          {fallback && <button className="milo-btn tone-yellow" onClick={fallback.onClick}>{fallback.label}</button>}
          <button className="milo-btn tone-cream" onClick={onBack} style={{ fontSize: 14 }}>← Back to games</button>
        </div>
      </div>
    </div>
  )
}
