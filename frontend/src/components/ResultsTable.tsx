import axios from 'axios';

type Row = any;

type Props = {
  rows: Row[];
  setRows: (r: Row[]) => void;
  apiUrl: string;
  showToast: (s: string) => void;
  addPoints?: (n: number) => void;
  onSelectRow?: (i: number) => void;
  selectedIndex?: number | null;
  toggleVerify?: (i: number) => void;
};

export default function ResultsTable({ rows, setRows, apiUrl, showToast, addPoints, onSelectRow, selectedIndex, toggleVerify }: Props) {
  const recalcRow = async (index: number) => {
    try {
      const row = rows[index];
      const body = {
        cable_number: row.cable_number,
        load_kw: row.load_kw ?? null,
        load_kva: row.load_kva ?? null,
        voltage_v: row.voltage_v ?? 415,
        pf: row.pf ?? 0.85,
        efficiency: row.efficiency ?? 0.95,
        length_m: row.length_m ?? 100,
        standard_mode: row.standard_mode ?? 'IEC',
        conductor_material: row.conductor_material ?? 'CU',
        insulation_type: row.insulation_type ?? 'XLPE',
        cores: row.cores ?? 3.5,
        installation_method: row.installation_method ?? 'TRAY_AIR',
        ambient_temp_c: row.ambient_temp_c ?? 40,
        num_circuits: row.num_circuits ?? 1,
        num_runs: row.num_runs ?? 1,
        use_auto_derating: true,
        derating_factors: [],
        allowable_vdrop_percent: row.allowable_vdrop_percent ?? 5,
      };
      const res = await axios.post(`${apiUrl}/cable/single`, body);
      const newRows = [...rows];
      newRows[index] = { ...newRows[index], ...res.data };
      setRows(newRows);
      showToast(`Recalculated row ${index + 1}`);
      // award a few points for manual recalc action
      if (addPoints) addPoints(5);
    } catch (e: any) {
      showToast('Recalc failed: ' + (e?.message || String(e)));
    }
  };

  const onChange = (index: number, key: string, value: any) => {
    const copy = [...rows];
    copy[index] = { ...copy[index], [key]: value };
    setRows(copy);
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">#</th>
            <th className="border px-2 py-1" title="Identifier for the cable">Cable No</th>
            <th className="border px-2 py-1">Verified</th>
            <th className="border px-2 py-1" title="Active power in kW">Load kW</th>
            <th className="border px-2 py-1" title="Apparent power in kVA">Load kVA</th>
            <th className="border px-2 py-1" title="Voltage in V">Voltage V</th>
            <th className="border px-2 py-1" title="Power factor (cosϕ)">PF</th>
            <th className="border px-2 py-1" title="Equipment efficiency (decimal)">Eff</th>
            <th className="border px-2 py-1" title="Circuit length in meters">Length m</th>
            <th className="border px-2 py-1" title="Selected cable size in mm²">Selected Size</th>
            <th className="border px-2 py-1" title="Overall suitability status">Status</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: Row, i: number) => (
            <tr key={i} onClick={() => onSelectRow?.(i)} className={`${i === selectedIndex ? 'bg-blue-50' : ''} odd:bg-white even:bg-gray-50 cursor-pointer`}>
              <td className="border px-2 py-1">{i + 1}</td>
              <td className="border px-2 py-1">
                <input className="w-28" value={r.cable_number || ''} onChange={(e) => onChange(i, 'cable_number', e.target.value)} />
              </td>
              <td className="border px-2 py-1 text-center">
                <input aria-label={`verify-row-${i}`} type="checkbox" checked={!!r.verified} onChange={(e) => { e.stopPropagation(); toggleVerify?.(i); }} />
              </td>
              <td className="border px-2 py-1"><input className="w-20" type="number" value={r.load_kw ?? ''} onChange={(e) => onChange(i, 'load_kw', e.target.value === '' ? null : Number(e.target.value))} /></td>
              <td className="border px-2 py-1"><input className="w-20" type="number" value={r.load_kva ?? ''} onChange={(e) => onChange(i, 'load_kva', e.target.value === '' ? null : Number(e.target.value))} /></td>
              <td className="border px-2 py-1"><input className="w-20" type="number" value={r.voltage_v ?? ''} onChange={(e) => onChange(i, 'voltage_v', e.target.value === '' ? null : Number(e.target.value))} /></td>
              <td className="border px-2 py-1"><input className="w-16" step="0.01" type="number" value={r.pf ?? ''} onChange={(e) => onChange(i, 'pf', e.target.value === '' ? null : Number(e.target.value))} /></td>
              <td className="border px-2 py-1"><input className="w-16" step="0.01" type="number" value={r.efficiency ?? ''} onChange={(e) => onChange(i, 'efficiency', e.target.value === '' ? null : Number(e.target.value))} /></td>
              <td className="border px-2 py-1"><input className="w-20" type="number" value={r.length_m ?? ''} onChange={(e) => onChange(i, 'length_m', e.target.value === '' ? null : Number(e.target.value))} /></td>
              <td className="border px-2 py-1">{r.selection?.size_mm2 ?? ''}</td>
              <td className="border px-2 py-1">
                {r.overall_status ?? ''}
                {r.overall_status === 'OK' ? <span title="OK - suitable" className="ml-2 text-green-600">●</span> : r.overall_status ? <span title="Check - warning" className="ml-2 text-yellow-600">●</span> : null}
              </td>
              <td className="border px-2 py-1">
                <button className="bg-green-600 text-white px-2 py-1 rounded text-sm mr-2" onClick={(e) => { e.stopPropagation(); recalcRow(i); }}>Recalc</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
