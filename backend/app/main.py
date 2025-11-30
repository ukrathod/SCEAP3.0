from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import CableSingleInput, CableSingleResult
from app.core.cable_sizing_engine import calculate_cable_single

app = FastAPI(
    title="SCEAP Cable Sizing API",
    version="0.2.0",
    description="Backend API for Smart Cable Engineering Automation Platform (SCEAP) — Cable Sizing MVP with IEC/IS & derating.",
)

# For now, allow all origins (dev only)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later we lock this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "message": "SCEAP Cable Sizing API running"}


@app.post("/api/v1/cable/single", response_model=CableSingleResult)
def cable_single(input_data: CableSingleInput):
    try:
        result_dict = calculate_cable_single(
            cable_number=input_data.cable_number,
            load_kw=input_data.load_kw,
            load_kva=input_data.load_kva,
            voltage_v=input_data.voltage_v,
            pf=input_data.pf,
            efficiency=input_data.efficiency,
            length_m=input_data.length_m,
            standard_mode=input_data.standard_mode,
            conductor_material=input_data.conductor_material,
            insulation_type=input_data.insulation_type,
            cores=input_data.cores,
            installation_method=input_data.installation_method,
            ambient_temp_c=input_data.ambient_temp_c,
            num_circuits=input_data.num_circuits,
            num_runs=input_data.num_runs,
            soil_resistivity=input_data.soil_resistivity,
            ground_temp_c=input_data.ground_temp_c,
            depth_of_laying_mm=input_data.depth_of_laying_mm,
            use_auto_derating=input_data.use_auto_derating,
            derating_factors=input_data.derating_factors,
            allowable_vdrop_percent=input_data.allowable_vdrop_percent,
            isc_ka=input_data.isc_ka,
            duration_s=input_data.sc_duration_s,
            k_const=input_data.k_const,
        )
        return result_dict
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {e}")
