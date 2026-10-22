'use client';

import { useEffect, useRef, useState } from 'react';

export type Column = { key: string; label: string; longLabel: string; value: number; display: string; note?: string };

/** Round axis maximum and ticks: 0 and three or four clean steps above. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 4, mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw)!;
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/** Pence → compact pounds for axis ticks: £0, £500, £1.5K. */
const compactGbp = (pence: number) => {
  const p = pence / 100;
  return p >= 1000 ? `£${(p / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })}K` : `£${p.toLocaleString('en-GB')}`;
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Single-series column chart over time, values in pence. Hover or focus a column for its value. */
export function ColumnChart({ data, caption }: { data: Column[]; caption: string }) {
  const [plotRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const ticks = niceTicks(Math.max(...data.map(d => d.value), 0));
  const top = ticks[ticks.length - 1] || 1;
  const band = width / Math.max(data.length, 1);
  // Label every k-th column so x labels never collide: about 6.5px a character at 12px, plus a gap.
  const labelWidth = Math.max(...data.map(d => d.label.length), 1) * 6.5 + 12;
  const every = Math.max(1, Math.ceil(labelWidth / Math.max(band, 1)));
  const bar = Math.max(2, Math.min(24, band * 0.62));
  const h = hover == null ? null : data[hover];

  return (
    <figure className="viz">
      <figcaption className="sr-only">{caption}</figcaption>
      <div className="viz-cols">
        <div className="viz-cols__axis" aria-hidden="true">
          {[...ticks].reverse().map(t => <span key={t}>{compactGbp(t)}</span>)}
        </div>
        <div className="viz-cols__plot" ref={plotRef} onPointerLeave={() => setHover(null)}>
          {ticks.map(t => <div key={t} className="viz-grid" style={{ bottom: `${(t / top) * 100}%` }} />)}
          <div className="viz-cols__bars">
            {data.map((d, i) => (
              <div key={d.key} className={'viz-col' + (hover === i ? ' viz-col--hover' : '')} tabIndex={0}
                aria-label={`${d.longLabel}: ${d.display}${d.note ? `, ${d.note}` : ''}`}
                onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                {d.value > 0 && <span className="viz-col__bar" style={{ height: `${(d.value / top) * 100}%`, width: bar }} />}
              </div>
            ))}
          </div>
          {h && (
            <div className="viz-tip" role="status" style={{ left: Math.min(Math.max((hover! + 0.5) * band, 70), Math.max(width - 70, 70)) }}>
              <strong>{h.display}</strong><span>{h.longLabel}</span>{h.note && <span>{h.note}</span>}
            </div>
          )}
        </div>
      </div>
      <div className="viz-cols__x" aria-hidden="true">
        {data.map((d, i) => <span key={d.key} style={{ width: band }}>{i % every === 0 ? d.label : ''}</span>)}
      </div>
      <details className="viz-table">
        <summary>Show as table</summary>
        <table className="adm-table">
          <tbody>{data.map(d => <tr key={d.key}><td>{d.longLabel}</td><td className="adm-num">{d.display}</td><td className="adm-muted">{d.note}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

export type BarRow = { key: string; label: string; value: number; display: string; note?: string };

/** Horizontal bars, largest first, value at the bar's tip. */
export function HBarChart({ data, caption, empty }: { data: BarRow[]; caption: string; empty: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...data.map(d => d.value), 0) || 1;
  if (data.length === 0) return <p className="adm-muted">{empty}</p>;
  return (
    <figure className="viz">
      <figcaption className="sr-only">{caption}</figcaption>
      <ul className="viz-hbars">
        {data.map(d => (
          <li key={d.key} className={'viz-hbar' + (hover === d.key ? ' viz-hbar--hover' : '')} tabIndex={0}
            aria-label={`${d.label}: ${d.display}${d.note ? `, ${d.note}` : ''}`}
            onPointerEnter={() => setHover(d.key)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(d.key)} onBlur={() => setHover(null)}>
            <span className="viz-hbar__label">{d.label}</span>
            <span className="viz-hbar__track">
              <span className="viz-hbar__bar" style={{ width: `${(d.value / max) * 100}%` }} />
              <span className="viz-hbar__value">{d.display}</span>
            </span>
            {hover === d.key && d.note && <span className="viz-hbar__note" role="status">{d.note}</span>}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Part-to-whole for two series, with a legend that carries names, counts and shares. */
export function ShareBar({ parts, caption }: { parts: { key: string; label: string; value: number; color: string }[]; caption: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = parts.reduce((s, p) => s + p.value, 0);
  const pct = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  return (
    <figure className="viz">
      <figcaption className="sr-only">{caption}</figcaption>
      {total > 0 ? (
        <div className="viz-share" onPointerLeave={() => setHover(null)}>
          {parts.filter(p => p.value > 0).map(p => (
            <span key={p.key} className={'viz-share__seg' + (hover === p.key ? ' viz-share__seg--hover' : '')} tabIndex={0}
              style={{ flexGrow: p.value, background: p.color }} aria-label={`${p.label}: ${p.value} (${pct(p.value)}%)`}
              onPointerEnter={() => setHover(p.key)} onFocus={() => setHover(p.key)} onBlur={() => setHover(null)} />
          ))}
        </div>
      ) : <div className="viz-share viz-share--empty" />}
      <ul className="viz-legend">
        {parts.map(p => (
          <li key={p.key} className={hover === p.key ? 'viz-legend--hover' : ''}>
            <i style={{ background: p.color }} aria-hidden="true" />
            <span>{p.label}</span><strong>{p.value}</strong><span className="adm-muted">{pct(p.value)}%</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
