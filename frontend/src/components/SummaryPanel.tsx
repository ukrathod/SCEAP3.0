// lightweight summary panel - no explicit React import needed with modern JSX runtime

export default function SummaryPanel({ rows, fraction, setFraction, selectedIndex, onVerifySelected, onVerifyAll }: { rows: any[]; fraction: string; setFraction: (s: string) => void; selectedIndex: number | null; onVerifySelected: () => void; onVerifyAll: () => void }) {
  const total = rows.length;
  const verified = rows.filter((r) => r.verified).length;
  const avgVdrop = (() => {
    const vals = rows.map((r) => r.selection?.voltage_drop_percent).filter((v) => typeof v === 'number');
    if (vals.length === 0) return null;
    const sum = vals.reduce((a: number, b: number) => a + b, 0);
    return sum / vals.length;
  })();

  const heightStyle = () => {
    // map fraction string to viewport height
    if (fraction === '1/4') return { height: '25vh' };
    if (fraction === '1/5') return { height: '20vh' };
    return { height: '16.66vh' }; // 1/6
  };

  return (
    <div className="w-full p-4 rounded border mb-4 bg-white shadow" style={heightStyle()}>
      <div className="flex justify-between items-start h-full">
        <div>
          <h3 className="text-lg font-semibold">Summary</h3>
          <div className="mt-2 text-sm text-gray-700">
            <div>Total rows: <strong>{total}</strong></div>
            <div>Verified: <strong>{verified}</strong></div>
            <div>Selected: <strong>{selectedIndex !== null ? selectedIndex + 1 : '-'}</strong></div>
            <div>Avg voltage drop: <strong>{avgVdrop === null ? '-' : `${avgVdrop.toFixed(2)}%`}</strong></div>
          </div>
        </div>

        <div className="text-sm text-right">
          <div className="mb-2">
            <label className="mr-2">Summary size</label>
            <select className="border px-2 py-1" value={fraction} onChange={(e) => setFraction(e.target.value)}>
              <option value="1/4">1/4</option>
              <option value="1/5">1/5</option>
              <option value="1/6">1/6</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={onVerifySelected}>Verify Selected</button>
            <button className="bg-green-600 text-white px-3 py-1 rounded" onClick={onVerifyAll}>Verify All</button>
          </div>
        </div>
      </div>
    </div>
  );
}
