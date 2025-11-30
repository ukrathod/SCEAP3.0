import { useState } from "react";
import axios from "axios";
import ResultsTable from "./components/ResultsTable";
import SummaryPanel from "./components/SummaryPanel";
import DetailViewer from "./components/DetailViewer";
import ToastList from "./components/ToastList";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [cableNumber, setCableNumber] = useState("C-001");
  const [loadKW, setLoadKW] = useState<number | null>(55);
  const [loadKVA, setLoadKVA] = useState<number | null>(null);
  const [voltage, setVoltage] = useState<number | null>(415);
  const [pf, setPF] = useState<number | null>(0.85);
  const [eff, setEff] = useState<number | null>(0.95);
  const [length, setLength] = useState<number | null>(100);
  const [iscKA, setIscKA] = useState<number | null>(null);
  const [scDuration, setScDuration] = useState<number | null>(null);
  const [kConst, setKConst] = useState<number | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [summaryFraction, setSummaryFraction] = useState<string>('1/5');
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string }>>([]);
  const [points, setPoints] = useState<number>(0);
  const [recentPoints, setRecentPoints] = useState<Array<{ id: number; n: number }>>([]);

  const addToast = (msg: string, timeout = 4000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, msg, type: 'info' }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, timeout);
  };

  const addToastType = (msg: string, type: 'info' | 'success' | 'error' = 'info', timeout = 4000) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), timeout);
  };

  const addPoints = (n: number) => {
    if (!n || n === 0) return;
    setPoints((p) => p + n);
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setRecentPoints((r) => [...r, { id, n }]);
    // remove after animation timeout
    setTimeout(() => setRecentPoints((r) => r.filter((x) => x.id !== id)), 1400);
  };

  const handleCalculate = async () => {
    setErrorMsg(null);
    setResult(null);
    // Basic client-side validation to avoid sending invalid zeros
    if ((loadKW === null || loadKW === 0) && (loadKVA === null || loadKVA === 0)) {
      setErrorMsg("Provide a non-zero Load (kW) or Load (kVA).");
      return;
    }
    if (voltage === null || voltage <= 0) {
      setErrorMsg("Provide a valid Voltage (V) > 0.");
      return;
    }
    if (pf === null || pf <= 0) {
      setErrorMsg("Provide a valid Power Factor > 0.");
      return;
    }
    if (eff === null || eff <= 0) {
      setErrorMsg("Provide a valid Efficiency > 0.");
      return;
    }
    try {
      const body: any = {
        cable_number: cableNumber,
        load_kw: loadKW,
        load_kva: loadKVA,
        voltage_v: voltage,
        pf,
        efficiency: eff,
        length_m: length,
        standard_mode: "IEC",
        conductor_material: "CU",
        insulation_type: "XLPE",
        cores: 3.5,
        installation_method: "TRAY_AIR",
        ambient_temp_c: 40,
        num_circuits: 1,
        num_runs: 1,
        soil_resistivity: null,
        ground_temp_c: null,
        depth_of_laying_mm: null,
        use_auto_derating: true,
        derating_factors: [],
        allowable_vdrop_percent: 5,
        isc_ka: undefined,
        sc_duration_s: undefined,
        k_const: undefined,
      };

      // include optional short-circuit fields if provided in the UI
      if (iscKA !== null && iscKA !== undefined) body.isc_ka = iscKA;
      if (scDuration !== null && scDuration !== undefined) body.sc_duration_s = scDuration;
      if (kConst !== null && kConst !== undefined) body.k_const = kConst;

      const res = await axios.post(`${API_URL}/cable/single`, body);
      setResult(res.data);
      // award points for a successful single calculation
      addPoints(10);
    } catch (err: any) {
      // Provide more detailed error info for debugging (status + backend message)
      const status = err?.response?.status;
      const backend = err?.response?.data;
      const msg = err?.message || "Calculation failed";
      setErrorMsg(`${msg}${status ? ` (status ${status})` : ""} ${backend ? JSON.stringify(backend) : ""}`);
    }
  };

  const requiredCount = () => {
    // treat load as one field (kW or kVA)
    const loadFilled = (loadKW !== null && loadKW !== 0) || (loadKVA !== null && loadKVA !== 0) ? 1 : 0;
    const others = (voltage !== null && voltage > 0 ? 1 : 0) + (pf !== null && pf > 0 ? 1 : 0) + (eff !== null && eff > 0 ? 1 : 0);
    return { total: 4, filled: loadFilled + others };
  };

  const completion = () => {
    const r = requiredCount();
    return Math.round((r.filled / r.total) * 100);
  };

  const levelLabel = (pts: number) => {
    if (pts >= 50) return 'Expert';
    if (pts >= 25) return 'Advanced';
    if (pts >= 10) return 'Intermediate';
    return 'Novice';
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">⚡ SCEAP – Cable Sizing MVP</h1>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="w-2/3">
            <div className="h-3 bg-gray-200 rounded overflow-hidden">
              <div className="h-3 bg-green-500" style={{ width: `${completion()}%` }} />
            </div>
            <div className="text-xs text-gray-600 mt-1">Profile completion: {completion()}%</div>
          </div>
          <div className="text-right">
            <div className="text-sm relative">Points: <strong>{points}</strong>
              <div className="absolute -top-5 right-0">
                {recentPoints.map((rp) => (
                  <div key={rp.id} className="text-sm text-green-500 font-bold animate-rise-fade">+{rp.n}</div>
                ))}
              </div>
            </div>
            <div className="text-sm">Level: <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{levelLabel(points)}</span></div>
          </div>
        </div>
        <div className="text-sm text-gray-500">API_URL: {String(API_URL)}</div>
        <button
          onClick={async () => {
            try {
              const h = await axios.get(`${API_URL}/health`);
              alert(JSON.stringify(h.data));
            } catch (e) {
              alert('Health check failed: ' + (e as any)?.message);
            }
          }}
          className="text-sm underline"
        >
          Test backend health
        </button>
        {/* Bulk Excel upload UI */}
        <div className="mt-4">
          <label className="block text-sm font-medium">Bulk Excel Upload (xlsx)</label>
          <input id="bulkfile" type="file" accept=".xlsx,.xls" className="mt-1" />
          <div className="mt-2">
            <button
              onClick={async () => {
                const input = document.getElementById('bulkfile') as HTMLInputElement | null;
                if (!input || !input.files || input.files.length === 0) {
                  alert('Choose a file first');
                  return;
                }
                const f = input.files[0];
                const form = new FormData();
                form.append('file', f);
                try {
                  const r = await axios.post(`${API_URL}/cable/bulk_excel`, form, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                  const data = r.data;
                  // normalize rows and ensure `verified` exists
                  setBulkRows((data.results || []).map((rr: any) => ({ ...rr, verified: !!rr.verified })));
                  addToastType(`Processed ${data.count} rows`, 'success');
                } catch (err: any) {
                  addToastType('Bulk upload failed: ' + (err?.response?.data?.detail || err?.message || String(err)), 'error');
                }
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Upload & Run
            </button>
            <small className="text-xs text-gray-500 ml-2">After upload, results will appear below for editing and recalculation.</small>
          </div>
        </div>
        {/* Toast list rendered by component */}
        {/* ToastList is lazy-rendered below */}
        <input
          className="w-full border p-2"
          placeholder="Cable Number"
          value={cableNumber}
          onChange={(e) => setCableNumber(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="w-full border p-2"
            placeholder="Load kW"
            type="number"
            title="Active power in kilowatts. If unknown, provide Load kVA instead."
            value={loadKW ?? ""}
            onChange={(e) => setLoadKW(e.target.value === "" ? null : Number(e.target.value))}
          />
          <input
            className="w-full border p-2"
            placeholder="Load kVA (optional)"
            type="number"
            title="Apparent power in kilovolt-amperes. Provide this if you don't know active kW."
            value={loadKVA ?? ""}
            onChange={(e) => setLoadKVA(e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>
        <input
          className="w-full border p-2"
          placeholder="Voltage V"
          type="number"
          title="Line-to-line nominal voltage in volts. E.g., 415 for 3-phase systems."
          value={voltage ?? ""}
          onChange={(e) => setVoltage(e.target.value === "" ? null : Number(e.target.value))}
        />
        <input
          className="w-full border p-2"
          placeholder="Power Factor"
          type="number"
          step="0.01"
          title="Power factor (cosϕ). Use 0.8-0.95 typical for motors and loads."
          value={pf ?? ""}
          onChange={(e) => setPF(e.target.value === "" ? null : Number(e.target.value))}
        />
        <input
          className="w-full border p-2"
          placeholder="Efficiency"
          type="number"
          step="0.01"
          title="Equipment efficiency as a decimal (0-1). Eg. 0.95 for 95%."
          value={eff ?? ""}
          onChange={(e) => setEff(e.target.value === "" ? null : Number(e.target.value))}
        />
        <input
          className="w-full border p-2"
          placeholder="Length (m)"
          type="number"
          value={length ?? ""}
          onChange={(e) => setLength(e.target.value === "" ? null : Number(e.target.value))}
        />

        {/* Short-circuit inputs (optional) */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <input
            className="w-full border p-2"
            placeholder="Isc (kA) optional"
            type="number"
            step="0.01"
            value={iscKA ?? ""}
            onChange={(e) => setIscKA(e.target.value === "" ? null : Number(e.target.value))}
          />
          <input
            className="w-full border p-2"
            placeholder="SC duration (s) optional"
            type="number"
            step="0.01"
            value={scDuration ?? ""}
            onChange={(e) => setScDuration(e.target.value === "" ? null : Number(e.target.value))}
          />
          <input
            className="w-full border p-2"
            placeholder="k-constant optional"
            type="number"
            step="0.01"
            value={kConst ?? ""}
            onChange={(e) => setKConst(e.target.value === "" ? null : Number(e.target.value))}
          />
        </div>

        <button
          onClick={handleCalculate}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Calculate
        </button>

        {errorMsg && (
          <div className="text-red-600 text-sm">{errorMsg}</div>
        )}
      </div>

      {result && (
        <div className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-3">
            Cable Sizing Result
          </h2>
          <p><strong>FLC:</strong> {result.flc_a.toFixed(2)} A</p>
          <p><strong>Irated:</strong> {result.irated_a.toFixed(2)} A</p>
          <p><strong>Selected Cable:</strong> {result.selection.size_mm2} mm²</p>
          <p><strong>Status:</strong> {result.overall_status}
            {result.overall_status === 'OK' ? <span className="ml-2 text-green-600">✅</span> : null}
          </p>
          {result.selection?.voltage_drop_percent !== undefined && (
            <div className="mt-3">
              <div className="text-sm text-gray-700">Estimated voltage drop: {result.selection.voltage_drop_percent.toFixed(2)}%</div>
              <div className="h-3 bg-gray-200 rounded overflow-hidden mt-1">
                <div className={`h-3 ${result.selection.voltage_drop_percent <= result.allowable_vdrop_percent ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, result.selection.voltage_drop_percent)}%` }} />
              </div>
            </div>
          )}
        </div>
      )}

      {bulkRows && bulkRows.length > 0 && (
        <div className="mt-6">
          <SummaryPanel rows={bulkRows} fraction={summaryFraction} setFraction={setSummaryFraction} selectedIndex={selectedIndex} onVerifySelected={() => {
            if (selectedIndex === null) { addToast('No row selected'); return; }
            // toggle verify on selected
            setBulkRows((prev) => {
              const copy = [...prev];
              copy[selectedIndex] = { ...copy[selectedIndex], verified: true };
              return copy;
            });
            addToast(`Row ${selectedIndex + 1} verified`);
            addPoints(5);
          }} onVerifyAll={() => {
            setBulkRows((prev) => prev.map((r: any) => ({ ...r, verified: true })));
            addToast('All rows verified');
            addPoints(bulkRows.length * 2);
          }} />

          <div className="mt-3 mb-3">
            <DetailViewer row={selectedIndex !== null ? bulkRows[selectedIndex] : null} onVerify={() => {
              if (selectedIndex === null) return;
              setBulkRows((prev) => { const copy = [...prev]; copy[selectedIndex] = { ...copy[selectedIndex], verified: true }; return copy; });
              addToastType(`Row ${selectedIndex + 1} verified`, 'success');
              addPoints(5);
            }} addPoints={addPoints} />
          </div>

          <h2 className="text-lg font-semibold mb-2">Bulk Results</h2>
          <div className="flex items-center gap-3 mb-3">
            <button
              className="bg-indigo-600 text-white px-3 py-1 rounded text-sm"
              onClick={async () => {
                try {
                  const r = await axios.post(`${API_URL}/cable/export_xlsx`, bulkRows, { responseType: 'blob' });
                  const blob = new Blob([r.data], { type: r.headers['content-type'] || 'application/octet-stream' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'bulk_results.xlsx';
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                  addToastType('Export started', 'success');
                  addPoints(10);
                } catch (err: any) {
                  addToastType('Export failed: ' + (err?.message || String(err)), 'error');
                }
              }}
            >
              Export XLSX
            </button>
            <button
              className="bg-yellow-600 text-white px-3 py-1 rounded text-sm"
              onClick={async () => {
                try {
                  const r = await axios.post(`${API_URL}/cable/save_bulk`, bulkRows);
                  if (r.status === 200) {
                    addToastType('Saved submission: ' + r.data.meta.id, 'success');
                    addPoints(5);
                  } else {
                    addToastType('Save failed', 'error');
                  }
                } catch (err: any) {
                  addToastType('Save failed: ' + (err?.response?.data?.detail || err?.message || String(err)), 'error');
                }
              }}
            >
              Save Submission
            </button>
          </div>

          <ResultsTable rows={bulkRows} setRows={setBulkRows} apiUrl={API_URL} showToast={(s: string) => addToast(s)} addPoints={(n: number) => addPoints(n)} onSelectRow={(i) => setSelectedIndex(i)} selectedIndex={selectedIndex} toggleVerify={(i) => {
            setBulkRows((prev) => { const copy = [...prev]; copy[i] = { ...copy[i], verified: !copy[i].verified }; return copy; });
            addToast(`Toggled verify for row ${i + 1}`);
          }} />
          <ToastList toasts={toasts} onDismiss={(id) => setToasts((s) => s.filter((x) => x.id !== id))} />
        </div>
      )}
    </div>
  );
}

export default App;
