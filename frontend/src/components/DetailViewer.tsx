import { useState, useRef, Suspense, lazy } from 'react';

const ThreeViewer = lazy(() => import('./ThreeViewer'));

export default function DetailViewer({ row, onVerify, addPoints, onUpdateRow }: { row: any | null; onVerify?: () => void; addPoints?: (n: number) => void; onUpdateRow?: (r: any) => void }) {
  const [show3D, setShow3D] = useState(false);
  const threeRef = useRef<any>(null);
  const [scale, setScale] = useState<number>(1);

  if (!row) return <div className="p-4 border rounded text-sm text-gray-600">Select a row to see details</div>;

  const cores = row.cores ? Math.max(1, Math.round(row.cores)) : 3;

  // derive an approximate visual diameter from mm^2 (area = pi * r^2)
  const sizeMM2 = row.selection?.size_mm2 ?? null;
  const conductorDiameter = sizeMM2 && sizeMM2 > 0 ? 2 * Math.sqrt((sizeMM2) / Math.PI) : 6; // mm -> visual scale

  // convert mm to a visual pixel radius (this is arbitrary scaling for nice visuals)
  const coreRadius = Math.max(3, Math.min(12, conductorDiameter * 0.7));
  const sheathRadius = Math.max(coreRadius * 2.5, 20);

  const handleCapture = async (hiRes = false) => {
    const s = hiRes ? scale : 1;
    const data = threeRef.current?.snapshot?.(s);
    if (data) {
      const a = document.createElement('a');
      a.href = data;
      a.download = `${row.cable_number ?? 'cable'}-preview.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  const handleCoreSelect = (index: number | null, meta: any | null) => {
    // persist into row if callback provided
    if (!row) return;
    const updated = { ...row, selected_core_index: index, selected_core_meta: meta };
    if (onUpdateRow) onUpdateRow(updated);
  };

  return (
    <div className="p-4 border rounded bg-white shadow">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          {!show3D ? (
            <svg width="160" height="120" viewBox="0 0 160 120">
              <rect x="8" y="20" width="144" height="80" rx="8" fill="#e6eef8" stroke="#cfe3fb" />
              {Array.from({ length: cores }).map((_, i) => {
                const x = 20 + ((i) * (120 / Math.max(1, cores - 1 || 1)));
                const cxClamped = Math.min(140, Math.max(20, x));
                return (
                  <circle key={i} cx={cxClamped} cy={60} r={12} fill={i % 2 === 0 ? '#f97316' : '#2563eb'} stroke="#222" />
                );
              })}
              <line x1="0" y1="60" x2="160" y2="60" stroke="#94a3b8" strokeDasharray="4 4" />
            </svg>
          ) : (
            <div className="w-40 h-28">
              <Suspense fallback={<div className="w-40 h-28 flex items-center justify-center text-xs text-gray-500">Loading 3D...</div>}>
                <ThreeViewer ref={threeRef} cores={cores} coreRadius={coreRadius} sheathRadius={sheathRadius} length={120} coreMeta={Array.from({ length: cores }).map((_, i) => ({ size_mm2: row.selection?.size_mm2, area_mm2: row.selection?.size_mm2, color: (row.selection && row.selection.color) || undefined, cca: row.selection?.cca_a }))} onCoreSelect={handleCoreSelect} />
              </Suspense>
            </div>
          )}
        </div>
        <div>
          <h4 className="font-semibold">{row.cable_number || 'Cable'}</h4>
          <div className="text-sm text-gray-700 mt-1">
            <div>Selected size: <strong>{row.selection?.size_mm2 ?? '—'} mm²</strong></div>
            <div>CCA: <strong>{row.selection?.cca_a ?? '—'} A</strong></div>
            <div>Voltage drop: <strong>{row.selection?.voltage_drop_percent ? `${row.selection.voltage_drop_percent.toFixed(2)}%` : '—'}</strong></div>
            <div>FLC: <strong>{row.flc_a ? `${row.flc_a.toFixed(2)} A` : '—'}</strong></div>
            <div>Irated: <strong>{row.irated_a ? `${row.irated_a.toFixed(2)} A` : '—'}</strong></div>
          </div>
          <div className="mt-3">
            <button onClick={() => { onVerify && onVerify(); if (addPoints) addPoints(10); }} className="bg-indigo-600 text-white px-3 py-1 rounded">Mark Verified</button>
            {row.verified ? <span className="ml-3 text-green-600">Verified ✅</span> : <span className="ml-3 text-gray-500">Not verified</span>}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button className="text-sm underline" onClick={() => setShow3D((s) => !s)}>{show3D ? 'Show 2D view' : 'Show 3D view'}</button>
            {show3D ? (
              <>
                <select value={scale} onChange={(e) => setScale(Number(e.target.value))} className="text-sm border px-2 py-1 rounded">
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
                <button onClick={() => handleCapture(false)} className="text-sm bg-gray-100 px-2 py-1 rounded">Capture PNG</button>
                <button onClick={() => handleCapture(true)} className="text-sm bg-gray-200 px-2 py-1 rounded">Capture Hi-Res</button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
