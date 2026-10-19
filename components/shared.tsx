import { OPENING_HOURS } from '@/lib/site.ts';
import MapEmbed from './MapEmbed.tsx';

export { MapEmbed };

export function Hours() {
  return (
    <div className="hours">
      {OPENING_HOURS.map(h => (
        <div key={h.d} className="hours__row"><span>{h.d}</span><span>{h.t}</span></div>
      ))}
    </div>
  );
}
