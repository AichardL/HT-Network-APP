'use client';

import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { District, GridCell } from '@/lib/scout-types';
import type { Poi } from '@/lib/sources/places';

export type MapView = { bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number }; zoom: number };

// 新加坡地铁枢纽（演示交通图层；生产接入 LTA 数据）
const MRT_SG: [string, number, number][] = [
  ['Orchard', 1.3043, 103.832],
  ['Somerset', 1.3003, 103.8388],
  ['Bugis', 1.3008, 103.8558],
  ['City Hall', 1.2932, 103.852],
  ['Raffles Place', 1.2841, 103.8515],
  ['Tanjong Pagar', 1.2765, 103.8458],
  ['Paya Lebar', 1.3176, 103.8925],
  ['Jurong East', 1.3331, 103.7422],
  ['Tampines', 1.3538, 103.9452],
  ['HarbourFront', 1.2653, 103.8214],
  ['Bishan', 1.3509, 103.8485],
  ['Serangoon', 1.3497, 103.8736],
  ['Woodlands', 1.4368, 103.786],
  ['Changi Airport', 1.3575, 103.9885],
];

const CENTERS: Record<string, [number, number]> = {
  SG: [1.3521, 103.8198],
  HK: [22.3193, 114.1694],
};

export function colorFor(v: number): string {
  return v >= 86 ? '#111111' : v >= 76 ? '#374151' : v >= 64 ? '#6b7280' : v >= 50 ? '#9ca3af' : '#d4d4d8';
}

const rankPin = (rank: number, active: boolean) =>
  L.divIcon({
    className: '',
    iconSize: [30, 36],
    iconAnchor: [15, 31],
    html: `<div style="width:28px;height:28px;border-radius:9px 9px 9px 2px;display:grid;place-items:center;font-weight:900;font-size:11px;transform:rotate(-45deg);${active ? 'background:#111111;color:#fff;border:2px solid #fff' : 'background:#fff;border:2px solid #111111;color:#111111'}"><span style="transform:rotate(45deg)">${rank}</span></div>`,
  });

const mrtIcon = L.divIcon({
  className: '',
  iconSize: [20, 20],
  html: '<div style="width:20px;height:20px;border-radius:6px;background:#fff;border:2px solid #111111;display:grid;place-items:center;color:#111111;font-size:9px;font-weight:900">M</div>',
});

const poiIcon = L.divIcon({
  className: '',
  iconSize: [11, 11],
  html: '<div style="width:11px;height:11px;border-radius:50%;background:#111111;border:2px solid #fff"></div>',
});

function FitView({ market }: { market: string }) {
  const map = useMap();
  const c = CENTERS[market] || CENTERS.SG;
  useEffect(() => {
    map.flyTo(c, market === 'SG' ? 11 : 10, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, c[0], c[1]]);
  return null;
}

interface Props {
  market: string;
  cells: GridCell[];
  mode: 'grid' | 'heat';
  heat: { lat: number; lng: number; intensity: number }[];
  districts: District[];
  selected: District | null;
  focus: { lat: number; lng: number; radius: number } | null;
  radius: number;
  showTransit: boolean;
  showPois: boolean;
  showShortlist: boolean;
  pois: Poi[];
  onSelect: (d: District) => void;
  onPlainClick: (latlng: { lat: number; lng: number }) => void;
  onViewChange?: (v: MapView) => void;
}

function ClickCatcher({ onPlainClick }: { onPlainClick: Props['onPlainClick'] }) {
  useMapEvents({
    click(e) {
      onPlainClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function ViewReporter({ onViewChange }: { onViewChange?: Props['onViewChange'] }) {
  const map = useMap();
  const report = () => {
    if (!onViewChange) return;
    const b = map.getBounds();
    onViewChange({
      bbox: { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() },
      zoom: Math.round(map.getZoom()),
    });
  };
  useEffect(() => {
    report();
    map.on('moveend', report);
    map.on('zoomend', report);
    return () => {
      map.off('moveend', report);
      map.off('zoomend', report);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onViewChange]);
  return null;
}

export default function ScoutMap(p: Props) {
  return (
    <MapContainer
      center={CENTERS[p.market] || CENTERS.SG}
      zoom={p.market === 'SG' ? 11 : 10}
      zoomControl={false}
      preferCanvas
      style={{ height: '100%', width: '100%', background: '#f3f4f6' }}
      attributionControl
    >
      <FitView market={p.market} />
      <ClickCatcher onPlainClick={p.onPlainClick} />
      <ViewReporter onViewChange={p.onViewChange} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      {/* 数据网格 / 街道热力（heat 按 bbox+zoom 懒加载） */}
      {p.mode === 'grid' ? (
        p.cells.map((c, i) => (
          <CircleMarker
            key={i}
            center={[c.lat, c.lng]}
            radius={8}
            pathOptions={{ color: '#ffffff', weight: 0.6, fillColor: colorFor(c.val), fillOpacity: 0.6 }}
          />
        ))
      ) : p.heat.length ? (
        p.heat.map((h, i) => (
          <Circle
            key={i}
            center={[h.lat, h.lng]}
            radius={700}
            pathOptions={{ color: 'transparent', fillColor: colorFor(28 + h.intensity * 70), fillOpacity: 0.06 + h.intensity * 0.32 }}
          />
        ))
      ) : (
        p.cells.map((c, i) => (
          <Circle
            key={i}
            center={[c.lat, c.lng]}
            radius={1000}
            pathOptions={{ color: 'transparent', fillColor: colorFor(c.val), fillOpacity: 0.1 + c.val / 420 }}
          />
        ))
      )}
      {/* 地铁枢纽 */}
      {p.showTransit &&
        p.market === 'SG' &&
        MRT_SG.map(([name, lat, lng], i) => (
          <Marker key={`m${i}`} position={[lat, lng]} icon={mrtIcon} title={name} />
        ))}
      {/* 竞品 POI */}
      {p.showPois &&
        p.pois.map((po, i) => (
          <Marker key={`po${i}`} position={[po.lat, po.lng]} icon={poiIcon} title={`${po.name} · ${po.source}`} />
        ))}
      {/* Trade area */}
      {p.selected && (
        <Circle
          center={[p.selected.lat, p.selected.lng]}
          radius={p.radius}
          pathOptions={{ color: '#111111', weight: 2, dashArray: '7 6', fillColor: '#111111', fillOpacity: 0.07 }}
        />
      )}
      {/* 任意点分析 focus（点 + catchment 圆环） */}
      {p.focus && (
        <Circle
          center={[p.focus.lat, p.focus.lng]}
          radius={Math.max(2, p.focus.radius / 2)}
          pathOptions={{ color: '#111111', weight: 3, fillColor: '#111111', fillOpacity: 0.12 }}
        />
      )}
      {p.focus && (
        <Circle
          center={[p.focus.lat, p.focus.lng]}
          radius={p.focus.radius}
          pathOptions={{ color: '#111111', weight: 2, dashArray: '5 5', fillColor: '#111111', fillOpacity: 0.06 }}
        />
      )}
      {/* 商圈短名单点位 */}
      {p.showShortlist &&
        p.districts
          .filter((d) => d.rank <= 25)
          .slice(0, 18)
          .map((d) => (
            <Marker
              key={d.area_key}
              position={[d.lat, d.lng]}
              icon={rankPin(d.rank, p.selected?.area_key === d.area_key)}
              eventHandlers={{ click: () => p.onSelect(d) }}
            />
          ))}
    </MapContainer>
  );
}