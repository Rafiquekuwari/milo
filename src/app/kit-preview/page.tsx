'use client'

import { useState } from 'react'
import type { AgeBand } from '@/components/teen/types'
import { TEEN_BANDS } from '@/components/teen/types'

import BandScope from '@/components/teen/BandScope'
import MiloMark from '@/components/teen/MiloMark'
import TeenTopbar from '@/components/teen/TeenTopbar'
import StreakMarker from '@/components/teen/StreakMarker'
import CaseCard from '@/components/teen/CaseCard'
import CalmAdvance from '@/components/teen/CalmAdvance'
import MasteryState from '@/components/teen/MasteryState'
import FindingsLog from '@/components/teen/FindingsLog'
import ChoiceGrid from '@/components/teen/ChoiceGrid'
import NumericEntry from '@/components/teen/NumericEntry'
import FractionEntry from '@/components/teen/FractionEntry'
import NumberLine from '@/components/teen/NumberLine'
import FigureDiagram from '@/components/teen/FigureDiagram'
import StepSelect from '@/components/teen/StepSelect'
import CoordGrid from '@/components/teen/CoordGrid'
import StudioSkyline from '@/components/teen/StudioSkyline'

const log = (...args: unknown[]) => console.log('[kit-preview]', ...args)

function Block({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3
        style={{
          fontSize: 13,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--ink-muted)',
          margin: '0 0 10px',
          fontFamily: 'var(--font-body)',
        }}
      >
        {heading}
      </h3>
      {children}
    </div>
  )
}

function BandColumn({ band }: { band: AgeBand }) {
  const [calmOpen, setCalmOpen] = useState(false)

  return (
    <BandScope band={band} style={{ minHeight: 'auto', borderRadius: 16, border: '1px solid var(--outline)', overflow: 'hidden' }}>
      <div style={{ padding: 20 }}>
        <h2
          style={{
            fontFamily: 'var(--font-numeric)',
            fontSize: 20,
            margin: '0 0 18px',
            color: 'var(--ink)',
          }}
        >
          Band {band}
        </h2>

        <Block heading="MiloMark (idle / thinking / speaking)">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <MiloMark band={band} mood="idle" />
            <MiloMark band={band} mood="thinking" />
            <MiloMark band={band} mood="speaking" size={56} />
          </div>
        </Block>

        <Block heading="TeenTopbar">
          <TeenTopbar band={band} title="The Better Buy" roundIdx={2} totalRounds={6} onBack={() => log('topbar back', band)} />
        </Block>

        <Block heading="StreakMarker">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <StreakMarker band={band} count={1} />
            <StreakMarker band={band} count={4} />
          </div>
        </Block>

        <Block heading="CaseCard">
          <CaseCard
            band={band}
            title="The Better Buy"
            why="You compare prices like this every week."
            question="Which pack is cheaper per unit?"
            onStart={() => log('case start', band)}
          />
        </Block>

        <Block heading="CalmAdvance (popup)">
          <button
            onClick={() => setCalmOpen(true)}
            style={{
              padding: '8px 16px',
              border: '1px solid var(--outline)',
              borderRadius: 10,
              background: 'var(--paper)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            Open CalmAdvance
          </button>
          {calmOpen && (
            <CalmAdvance
              band={band}
              note="Close — the unit price is what to compare."
              onRetry={() => {
                log('calm retry', band)
                setCalmOpen(false)
              }}
              onContinue={() => {
                log('calm continue', band)
                setCalmOpen(false)
              }}
            />
          )}
        </Block>

        <Block heading="MasteryState">
          <MasteryState
            band={band}
            conceptsConfirmed={['Unit rate', 'Proportional reasoning', 'Comparison']}
            nextPointer="Next: scaling recipes."
            onPlayAgain={() => log('play again', band)}
            onExit={() => log('exit', band)}
          />
        </Block>

        <Block heading="FindingsLog">
          <FindingsLog
            band={band}
            items={[
              { label: 'Pack A unit price', value: '$0.42', done: true },
              { label: 'Pack B unit price', value: '$0.38', done: true },
              { label: 'Cheaper pack', done: false },
            ]}
          />
        </Block>

        <Block heading="ChoiceGrid">
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--ink-soft)', margin: '0 0 8px' }}>
            Which pack is cheaper per unit?
          </p>
          <ChoiceGrid
            band={band}
            choices={[
              { value: 'a', label: 'Pack A' },
              { value: 'b', label: 'Pack B' },
              { value: 'same', label: 'Same price' },
              { value: 'cant', label: 'Cannot tell' },
            ]}
            selected="b"
            status="correct"
            correctValue="b"
            onPick={(v) => log('pick', band, v)}
          />
        </Block>

        <Block heading="NumericEntry">
          <NumericEntry
            band={band}
            placeholder="Enter rate"
            suffix="%"
            onSubmit={(value, raw) => log('numeric submit', band, value, raw)}
          />
        </Block>

        <Block heading="FractionEntry">
          <FractionEntry band={band} allowWhole onSubmit={(v) => log('fraction submit', band, v)} />
        </Block>

        <Block heading="NumberLine (read)">
          <NumberLine band={band} min={-5} max={5} mode="read" marked={[-3, 2]} />
        </Block>

        <Block heading="NumberLine (select)">
          <NumberLine band={band} min={0} max={10} mode="select" value={4} onSelect={(n) => log('numberline select', band, n)} />
        </Block>

        <Block heading="FigureDiagram (right-triangle)">
          <FigureDiagram
            band={band}
            kind="right-triangle"
            labels={{ a: 3, b: 4, c: '?' }}
            highlight="c"
          />
        </Block>

        <Block heading="StepSelect">
          <StepSelect
            band={band}
            shown={[{ text: '2x + 4 = 10', reason: 'Given' }]}
            options={[
              { text: '2x = 6', reason: 'Subtract 4 from both sides' },
              { text: '2x = 14', reason: 'Add 4 to both sides' },
              { text: 'x = 14', reason: 'Divide by 2' },
            ]}
            onPick={(i) => log('step pick', band, i)}
          />
        </Block>

        <Block heading="CoordGrid (xy)">
          <CoordGrid
            band={band}
            xRange={[-5, 5]}
            yRange={[-5, 5]}
            mode="read"
            variant="xy"
            points={[
              { x: 1, y: 2 },
              { x: -2, y: -1 },
            ]}
            lines={[{ kind: 'line', m: 1, b: 0 }]}
            highlight={{ x: 1, y: 2 }}
            onPlot={(p) => log('plot', band, p)}
          />
        </Block>

        {band === '15-16' && (
          <Block heading="StudioSkyline (15-16 only)">
            <StudioSkyline shipped={3} />
          </Block>
        )}
      </div>
    </BandScope>
  )
}

export default function KitPreviewPage() {
  return (
    <div style={{ padding: 24, fontFamily: 'var(--font-body)' }}>
      <h1 style={{ fontSize: 24, margin: '0 0 6px' }}>Teen &ldquo;Field Lab&rdquo; Kit Preview</h1>
      <p style={{ color: '#666', margin: '0 0 24px' }}>
        Every built component rendered live across all three bands. Handlers log to the console.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(360px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {TEEN_BANDS.map((band) => (
          <BandColumn key={band} band={band} />
        ))}
      </div>
    </div>
  )
}
