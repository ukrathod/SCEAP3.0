from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class DeratingInfo(BaseModel):
    k1_ambient: float
    k2_group: float
    k3_ground_temp: float
    k4_depth: float
    k5_soil: float
    overall: float


class CableSingleInput(BaseModel):
    cable_number: str = Field(..., description="Cable identifier / tag")

    # Load section
    load_kw: Optional[float] = Field(
        None, description="Load in kW (optional, use either kW or kVA)"
    )
    load_kva: Optional[float] = Field(
        None, description="Load in kVA (optional, use either kW or kVA)"
    )
    voltage_v: float = Field(..., description="System voltage (V)")
    pf: float = Field(0.85, description="Power factor")
    efficiency: float = Field(0.95, description="Efficiency as decimal (e.g., 0.95)")

    # Length / routing
    length_m: float = Field(..., description="Cable length in metres")

    # Standards / cable construction
    standard_mode: str = Field(
        "IEC", description="Standard mode: IEC or IS"
    )
    conductor_material: str = Field(
        "CU", description="Conductor material: CU or AL"
    )
    insulation_type: str = Field(
        "XLPE", description="Insulation type: XLPE or PVC"
    )
    cores: float = Field(
        3.5, description="Number of cores, e.g. 1, 3.5, 4"
    )

    # Installation / environment
    installation_method: str = Field(
        "TRAY_AIR",
        description=(
            "Installation method: TRAY_AIR, LADDER_TRAY, CONDUIT_AIR, "
            "TRENCH, BURIED_DIRECT, DUCTBANK"
        ),
    )
    ambient_temp_c: float = Field(
        40.0, description="Ambient temperature in °C"
    )
    num_circuits: int = Field(
        1, description="Number of loaded circuits in same group"
    )
    num_runs: int = Field(
        1, description="Number of parallel runs per phase"
    )
    soil_resistivity: Optional[float] = Field(
        None, description="Soil thermal resistivity (K·m/W) if buried"
    )
    ground_temp_c: Optional[float] = Field(
        None, description="Ground temperature in °C if buried"
    )
    depth_of_laying_mm: Optional[float] = Field(
        None, description="Depth of laying in mm if buried"
    )

    # Derating control (for now we allow auto-derating)
    use_auto_derating: bool = Field(
        True,
        description=(
            "If True, derating factors are calculated automatically "
            "from installation & environment."
        ),
    )
    derating_factors: Optional[List[float]] = Field(
        default_factory=list,
        description="Manual derating factors list D1, D2... (ignored if use_auto_derating=True)",
    )

    # Voltage drop & SC
    allowable_vdrop_percent: float = Field(
        5.0, description="Allowable voltage drop percent (running)"
    )
    isc_ka: Optional[float] = Field(
        None, description="Short-circuit current in kA (optional)"
    )
    sc_duration_s: Optional[float] = Field(
        None, description="Short-circuit duration in seconds (optional)"
    )
    k_const: Optional[float] = Field(
        None, description="k constant for SC calculation (optional, auto if missing)"
    )


class CableSingleResult(BaseModel):
    # Echo basic inputs
    cable_number: str
    load_type: str
    flc_a: float
    irated_a: float
    voltage_v: float
    length_m: float

    # Standards / construction / installation
    standard_mode: str
    conductor_material: str
    insulation_type: str
    cores: float
    installation_method: str
    num_circuits: int
    num_runs: int

    # Derating
    derating: DeratingInfo

    allowable_vdrop_percent: float
    isc_ka: Optional[float]
    sc_duration_s: Optional[float]
    k_const: Optional[float]

    # Status flags
    cca_ok: Optional[bool]
    vdrop_ok: Optional[bool]
    sc_ok: Optional[bool]
    overall_status: str

    selection: Dict[str, Any]
