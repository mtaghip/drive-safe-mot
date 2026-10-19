import { MAP_EMBED_SRC, OPENING_HOURS } from '@/lib/site.ts';

export function Hours() {
  return (
    <div className="hours">
      {OPENING_HOURS.map(h => (
        <div key={h.d} className="hours__row"><span>{h.d}</span><span>{h.t}</span></div>
      ))}
    </div>
  );
}

export function MapEmbed({ tall = false }: { tall?: boolean }) {
  return (
    <div className={tall ? 'map map--tall' : 'map'}>
      <iframe title="Map to Drive Safe MOT Centre" src={MAP_EMBED_SRC} loading="lazy" />
    </div>
  );
}
