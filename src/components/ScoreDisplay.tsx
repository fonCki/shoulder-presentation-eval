// -----------------------------------------------------------------------------
// Score Display Component
// -----------------------------------------------------------------------------
// Displays posture scores with visual indicators.
// Features ground-truth row, metric rows, and collapsible debug section.
// -----------------------------------------------------------------------------
import React, { useState } from 'react';
import type { HorizontalScoreDebug } from '../lib/postureMetrics';

interface Props {
    scores: Record<string, number> | null;
    debug?: HorizontalScoreDebug | null;
    manual_score?: number | null;           // manual label
    delta?: number | null;        // abs error
}

/* ---------- Helpers ---------- */
const fmt = (n: number | null | undefined) =>
    n == null || Number.isNaN(n) ? '—' : n.toFixed(2);

export default function ScoreDisplay({ scores, debug, manual_score, delta }: Props) {
    const [open, setOpen] = useState(false);
    if (!scores) return null;

    /* ---------- Reusable Pill Bar ---------- */
    const Bar = ({ v }: { v: number }) => (
        <div style={{
            height: 10,
            width: '100%',
            background: '#e5e5e5',
            borderRadius: 5,
            overflow: 'hidden',
        }}>
            <div style={{
                width: `${v * 100}%`,
                height: '100%',
                background: 'royalblue',
            }} />
        </div>
    );

    return (
        <div style={{ maxWidth: 600 }}>
            <h3 style={{ margin: '12px 0 4px' }}>Shoulder Presentation Evaluation</h3>

            {/* ---------- Manual Row ---------- */}
            {manual_score != null && (
                <section style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 60px',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 10,
                }}>
                    <span style={{ fontWeight: 500 }}>manualLabel</span>
                    <Bar v={manual_score} />
                    <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
            {manual_score.toFixed(2)}
          </span>
                </section>
            )}

            {/* ---------- Algorithm Rows ---------- */}
            {Object.entries(scores).map(([k, v]) => (
                <section key={k} style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 60px',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 6,
                }}>
                    <span>{k}</span>
                    <Bar v={v} />
                    <span style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
            {v.toFixed(2)}
          </span>

                    {/* ---------- Collapsible Debug for horizontalScore ---------- */}
                    {k === 'horizontalScore' && debug && (
                        <>
                            <button
                                onClick={() => setOpen(!open)}
                                style={{
                                    gridColumn: '1 / -1',
                                    background: 'none',
                                    border: 'none',
                                    color: '#555',
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    padding: 0,
                                }}>
                                {open ? '▾ debug' : '▸ debug'}
                            </button>

                            {open && (
                                <pre style={{
                                    gridColumn: '1 / -1',
                                    marginTop: 4,
                                    padding: '6px 8px',
                                    fontSize: 12,
                                    lineHeight: 1.25,
                                    background: '#fafafa',
                                    border: '1px solid #ddd',
                                    whiteSpace: 'pre',
                                    overflowX: 'auto',
                                }}>{`angle:     ${fmt(debug.angleDeg)}°
dx:        ${fmt(debug.dx)}
dz:        ${fmt(debug.dz)}
visSym:    ${fmt(debug.visSym)}

L (x,y,z,v): ${
                                    debug.left
                                        ? `${fmt(debug.left.x)}, ${fmt(debug.left.y)}, ${fmt(debug.left.z)}, ${fmt(debug.left.v)}`
                                        : '—'}
R (x,y,z,v): ${
                                    debug.right
                                        ? `${fmt(debug.right.x)}, ${fmt(debug.right.y)}, ${fmt(debug.right.z)}, ${fmt(debug.right.v)}`
                                        : '—'}`}</pre>
                            )}
                        </>
                    )}
                </section>
            ))}

            {/* ---------- Absolute Error Row ---------- */}
            {delta != null && (
                <section style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr 60px 20px',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 4,
                }}>
                    <span style={{ fontWeight: 500 }}>absError</span>
                    <Bar v={delta} />
                    <span style={{
                        fontVariantNumeric: 'tabular-nums',
                        textAlign: 'right',
                    }}>{delta.toFixed(2)}</span>

                    {/* ✓ / ✗ badge */}
                    <span style={{ fontSize: 18, paddingLeft: 4 }}>
            {delta <= 0.25 ? '✅' : '❌'}
          </span>
                </section>
            )}
        </div>
    );
}
