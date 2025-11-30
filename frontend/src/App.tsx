import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [cableNumber, setCableNumber] = useState("C-001");
  const [loadKW, setLoadKW] = useState<number>(55);
  const [voltage, setVoltage] = useState<number>(415);
  const [pf, setPF] = useState<number>(0.85);
  const [eff, setEff] = useState<number>(0.95);
  const [length, setLength] = useState<number>(100);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCalculate = async () => {
    setErrorMsg(null);
    setResult(null);
    try {
      const body = {
        cable_number: cableNumber,
        load_kw: loadKW,
        load_kva: null,
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
        isc_ka: null,
        sc_duration_s: null,
        k_const: null,
      };

      const res = await axios.post(`${API_URL}/cable/single`, body);
      setResult(res.data);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || "Calculation failed");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">⚡ SCEAP – Cable Sizing MVP</h1>

      <div className="space-y-3 mb-6">
        <input
          className="w-full border p-2"
          placeholder="Cable Number"
          value={cableNumber}
          onChange={(e) => setCableNumber(e.target.value)}
        />
        <input
          className="w-full border p-2"
          placeholder="Load kW"
          type="number"
          value={loadKW}
          onChange={(e) => setLoadKW(Number(e.target.value))}
        />
        <input
          className="w-full border p-2"
          placeholder="Voltage V"
          type="number"
          value={voltage}
          onChange={(e) => setVoltage(Number(e.target.value))}
        />
        <input
          className="w-full border p-2"
          placeholder="Power Factor"
          type="number"
          step="0.01"
          value={pf}
          onChange={(e) => setPF(Number(e.target.value))}
        />
        <input
          className="w-full border p-2"
          placeholder="Efficiency"
          type="number"
          step="0.01"
          value={eff}
          onChange={(e) => setEff(Number(e.target.value))}
        />
        <input
          className="w-full border p-2"
          placeholder="Length (m)"
          type="number"
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
        />

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
          <p><strong>Status:</strong> {result.overall_status}</p>
        </div>
      )}
    </div>
  );
}

export default App;
