from math import sqrt
from typing import List, Optional, Dict, Any


# ---------------------------------------------------------------------------
# SIMPLE DEMO CATALOGUE (TO BE REPLACED BY REAL IEC / IS CATALOG LATER)
# ---------------------------------------------------------------------------
CABLE_CATALOGUE = {
    # size_mm2: {"cca": admissible_current_A, "mv_per_amp_per_m": voltage_drop_constant}
    2.5: {"cca": 21, "mv_per_amp_per_m": 18.0},
    4: {"cca": 28, "mv_per_amp_per_m": 11.0},
    6: {"cca": 36, "mv_per_amp_per_m": 7.3},
    10: {"cca": 50, "mv_per_amp_per_m": 4.4},
    16: {"cca": 68, "mv_per_amp_per_m": 2.8},
    25: {"cca": 89, "mv_per_amp_per_m": 1.75},
    35: {"cca": 110, "mv_per_amp_per_m": 1.25},
    50: {"cca": 140, "mv_per_amp_per_m": 0.95},
    70: {"cca": 175, "mv_per_amp_per_m": 0.65},
    95: {"cca": 215, "mv_per_amp_per_m": 0.50},
    120: {"cca": 245, "mv_per_amp_per_m": 0.39},
    150: {"cca": 280, "mv_per_amp_per_m": 0.32},
    185: {"cca": 315, "mv_per_amp_per_m": 0.27},
    240: {"cca": 365, "mv_per_amp_per_m": 0.22},
}


def product(values: List[float]) -> float:
    result = 1.0
    for v in values:
        result *= v
    return result


# ---------------------------------------------------------------------------
# CORE ELECTRICAL FORMULAS
# ---------------------------------------------------------------------------
def calculate_flc_kw(load_kw: float, voltage_v: float, pf: float, eff: float) -> float:
    """
    I = P(kW) * 1000 / (sqrt(3) * V * pf * eff)
    """
    if voltage_v <= 0 or pf <= 0 or eff <= 0:
        raise ValueError("Voltage, power factor, and efficiency must be > 0.")
    return load_kw * 1000.0 / (sqrt(3.0) * voltage_v * pf * eff)


def calculate_flc_kva(load_kva: float, voltage_v: float) -> float:
    """
    I = S(kVA) * 1000 / (sqrt(3) * V)
    """
    if voltage_v <= 0:
        raise ValueError("Voltage must be > 0.")
    return load_kva * 1000.0 / (sqrt(3.0) * voltage_v)


def apply_derating(current_a: float, derating_factors: List[float]) -> float:
    """
    Irated = I / (D1 * D2 * D3 * ...)
    """
    if not derating_factors:
        return current_a

    denominator = product(derating_factors)
    if denominator <= 0:
        raise ValueError("Invalid derating factors.")
    return current_a / denominator


def calculate_voltage_drop_percent(
    current_a: float,
    length_m: float,
    mv_per_amp_per_m: float,
    voltage_v: float,
) -> float:
    """
    Vdrop% = (sqrt(3) * I * L * mV/A/m) / V * 100
    mv_per_amp_per_m is mV per A per m (line-to-line)
    """
    if voltage_v <= 0:
        raise ValueError("Voltage must be > 0.")

    vd_volts = sqrt(3.0) * current_a * length_m * (mv_per_amp_per_m / 1000.0)
    vd_percent = vd_volts / voltage_v * 100.0
    return vd_percent


def calculate_short_circuit_area_required(
    isc_ka: float,
    duration_s: float,
    k_const: float,
) -> float:
    """
    Arequired = Isc(A) * sqrt(t) / k
    Isc(A) = Isc(kA) * 1000
    """
    if k_const <= 0 or duration_s <= 0 or isc_ka <= 0:
        raise ValueError("Isc, duration, and k constant must be > 0.")

    isc_a = isc_ka * 1000.0
    return isc_a * (duration_s ** 0.5) / k_const


# ---------------------------------------------------------------------------
# IEC / IS HELPERS (SIMPLIFIED VERSION FOR MVP)
# ---------------------------------------------------------------------------
def get_k_constant(conductor_material: str, insulation_type: str) -> float:
    """
    Returns k constant for adiabatic short circuit check.
    Values are typical IEC 60949 approximations.
    """
    material = conductor_material.upper()
    insulation = insulation_type.upper()

    # Typical values for Cu/Al with XLPE/PVC
    if material == "CU" and insulation == "XLPE":
        return 143.0
    if material == "CU" and insulation == "PVC":
        return 115.0
    if material == "AL" and insulation == "XLPE":
        return 94.0
    if material == "AL" and insulation == "PVC":
        return 76.0

    # Fallback conservative value
    return 115.0


def get_derating_factors(
    standard_mode: str,
    installation_method: str,
    ambient_temp_c: float,
    num_circuits: int,
    soil_resistivity: Optional[float],
    depth_of_laying_mm: Optional[float],
    ground_temp_c: Optional[float],
) -> Dict[str, float]:
    """
    Extremely simplified version of IEC 60287 / IS derating logic.
    Returns individual K-factors and the overall factor.
    """

    # K1 - Ambient temperature factor (air installations)
    t = ambient_temp_c
    if t <= 30:
        k1 = 1.0
    elif t <= 35:
        k1 = 0.96
    elif t <= 40:
        k1 = 0.94
    elif t <= 45:
        k1 = 0.90
    elif t <= 50:
        k1 = 0.87
    elif t <= 55:
        k1 = 0.83
    else:
        k1 = 0.80  # very hot

    # K2 - Grouping factor
    n = max(num_circuits, 1)
    if n == 1:
        k2 = 1.0
    elif n == 2:
        k2 = 0.8
    elif n == 3:
        k2 = 0.75
    elif n <= 5:
        k2 = 0.7
    else:
        k2 = 0.65

    # For non-buried installations, soil-related factors are unity
    if installation_method in {"BURIED_DIRECT", "DUCTBANK", "TRENCH"}:
        # K3 - Ground temperature factor (very simplified)
        gt = ground_temp_c if ground_temp_c is not None else 25.0
        if gt <= 20:
            k3 = 1.04
        elif gt <= 25:
            k3 = 1.0
        elif gt <= 30:
            k3 = 0.96
        elif gt <= 35:
            k3 = 0.93
        else:
            k3 = 0.90

        # K4 - Depth of laying (assuming 900-1200mm reference)
        depth = depth_of_laying_mm if depth_of_laying_mm is not None else 900.0
        if depth <= 800:
            k4 = 1.02
        elif depth <= 1000:
            k4 = 1.0
        else:
            k4 = 0.98

        # K5 - Soil thermal resistivity
        rho = soil_resistivity if soil_resistivity is not None else 1.2
        if rho <= 1.0:
            k5 = 1.03
        elif rho <= 1.2:
            k5 = 1.0
        elif rho <= 1.5:
            k5 = 0.96
        else:
            k5 = 0.93
    else:
        k3 = 1.0
        k4 = 1.0
        k5 = 1.0

    overall = product([k1, k2, k3, k4, k5])

    return {
        "k1_ambient": k1,
        "k2_group": k2,
        "k3_ground_temp": k3,
        "k4_depth": k4,
        "k5_soil": k5,
        "overall": overall,
    }


# ---------------------------------------------------------------------------
# CABLE SELECTION LOGIC
# ---------------------------------------------------------------------------
def select_cable_size(
    irated: float,
    allowable_vdrop_percent: float,
    length_m: float,
    voltage_v: float,
    isc_ka: Optional[float] = None,
    duration_s: Optional[float] = None,
    k_const: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Very simplified selection:
    1. Scan catalogue sizes where CCA >= Irated
    2. Check voltage drop% <= allowable
    3. If SC data given, check CSA >= Arequired
    Returns first passing size. If none, returns best candidate with warning.
    """
    best_candidate: Optional[Dict[str, Any]] = None

    for size_mm2, data in sorted(CABLE_CATALOGUE.items(), key=lambda x: x[0]):
        cca = data["cca"]
        mv_per_amp_per_m = data["mv_per_amp_per_m"]

        cca_ok = cca >= irated

        # Skip sizes that obviously cannot carry current
        if not cca_ok:
            continue

        vd_percent = calculate_voltage_drop_percent(
            current_a=irated,
            length_m=length_m,
            mv_per_amp_per_m=mv_per_amp_per_m,
            voltage_v=voltage_v,
        )

        vd_ok = vd_percent <= allowable_vdrop_percent

        sc_ok = True
        arequired = None
        if isc_ka is not None and duration_s is not None and k_const is not None:
            arequired = calculate_short_circuit_area_required(
                isc_ka=isc_ka,
                duration_s=duration_s,
                k_const=k_const,
            )
            sc_ok = size_mm2 >= arequired

        candidate = {
            "size_mm2": size_mm2,
            "cca_a": cca,
            "mv_per_amp_per_m": mv_per_amp_per_m,
            "voltage_drop_percent": vd_percent,
            "short_circuit_area_required_mm2": arequired,
            "short_circuit_ok": sc_ok,
            "vd_ok": vd_ok,
            "cca_ok": cca_ok,
        }

        # if fully OK, return immediately
        if vd_ok and sc_ok and cca_ok:
            candidate["status"] = "OK"
            return candidate

        # keep as best_candidate if none set yet
        if best_candidate is None:
            candidate["status"] = "NO_SIZE_FULLY_OK"
            best_candidate = candidate

    if best_candidate is None:
        return {
            "status": "NO_CATALOG_MATCH",
            "message": "No cable size in catalogue can carry the rated current.",
        }

    return best_candidate


# ---------------------------------------------------------------------------
# MAIN WRAPPER USED BY FASTAPI
# ---------------------------------------------------------------------------
def calculate_cable_single(
    cable_number: str,
    load_kw: Optional[float],
    load_kva: Optional[float],
    voltage_v: float,
    pf: float,
    efficiency: float,
    length_m: float,
    standard_mode: str,
    conductor_material: str,
    insulation_type: str,
    cores: float,
    installation_method: str,
    ambient_temp_c: float,
    num_circuits: int,
    num_runs: int,
    soil_resistivity: Optional[float],
    ground_temp_c: Optional[float],
    depth_of_laying_mm: Optional[float],
    use_auto_derating: bool,
    derating_factors: Optional[List[float]],
    allowable_vdrop_percent: float,
    isc_ka: Optional[float],
    duration_s: Optional[float],
    k_const: Optional[float],
) -> Dict[str, Any]:
    """
    Main calculation wrapper used by FastAPI.
    """
    if load_kw is None and load_kva is None:
        raise ValueError("Either load_kw or load_kva must be provided.")

    # 1. FLC
    if load_kw is not None:
        flc = calculate_flc_kw(
            load_kw=load_kw,
            voltage_v=voltage_v,
            pf=pf,
            eff=efficiency,
        )
        load_type = "kW"
    else:
        flc = calculate_flc_kva(
            load_kva=load_kva,  # type: ignore[arg-type]
            voltage_v=voltage_v,
        )
        load_type = "kVA"

    # 2. Derating factors
    derating_detail: Dict[str, float]
    if use_auto_derating:
        derating_detail = get_derating_factors(
            standard_mode=standard_mode,
            installation_method=installation_method,
            ambient_temp_c=ambient_temp_c,
            num_circuits=num_circuits,
            soil_resistivity=soil_resistivity,
            depth_of_laying_mm=depth_of_laying_mm,
            ground_temp_c=ground_temp_c,
        )
        derating_list = [
            derating_detail["k1_ambient"],
            derating_detail["k2_group"],
            derating_detail["k3_ground_temp"],
            derating_detail["k4_depth"],
            derating_detail["k5_soil"],
        ]
    else:
        derating_list = derating_factors or []
        derating_detail = {
            "k1_ambient": derating_list[0] if len(derating_list) > 0 else 1.0,
            "k2_group": derating_list[1] if len(derating_list) > 1 else 1.0,
            "k3_ground_temp": derating_list[2] if len(derating_list) > 2 else 1.0,
            "k4_depth": derating_list[3] if len(derating_list) > 3 else 1.0,
            "k5_soil": derating_list[4] if len(derating_list) > 4 else 1.0,
        }
        derating_detail["overall"] = product(
            [
                derating_detail["k1_ambient"],
                derating_detail["k2_group"],
                derating_detail["k3_ground_temp"],
                derating_detail["k4_depth"],
                derating_detail["k5_soil"],
            ]
        )

    # 3. Apply derating
    irated = apply_derating(flc, derating_list)

    # 4. k constant for SC (auto if not supplied)
    if isc_ka is not None and duration_s is not None and k_const is None:
        k_const = get_k_constant(conductor_material, insulation_type)

    # 5. Select cable size
    selection = select_cable_size(
        irated=irated,
        allowable_vdrop_percent=allowable_vdrop_percent,
        length_m=length_m,
        voltage_v=voltage_v,
        isc_ka=isc_ka,
        duration_s=duration_s,
        k_const=k_const,
    )

    cca_ok = selection.get("cca_ok") if isinstance(selection, dict) else None
    vdrop_ok = selection.get("vd_ok") if isinstance(selection, dict) else None
    sc_ok = selection.get("short_circuit_ok") if isinstance(selection, dict) else None
    overall_status = selection.get("status", "UNKNOWN") if isinstance(selection, dict) else "UNKNOWN"

    result = {
        "cable_number": cable_number,
        "load_type": load_type,
        "flc_a": flc,
        "irated_a": irated,
        "voltage_v": voltage_v,
        "length_m": length_m,
        "standard_mode": standard_mode,
        "conductor_material": conductor_material,
        "insulation_type": insulation_type,
        "cores": cores,
        "installation_method": installation_method,
        "num_circuits": num_circuits,
        "num_runs": num_runs,
        "derating": derating_detail,
        "allowable_vdrop_percent": allowable_vdrop_percent,
        "isc_ka": isc_ka,
        "sc_duration_s": duration_s,
        "k_const": k_const,
        "cca_ok": cca_ok,
        "vdrop_ok": vdrop_ok,
        "sc_ok": sc_ok,
        "overall_status": overall_status,
        "selection": selection,
    }

    return result
