(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const num = (id) => {
    const el = document.getElementById(id);
    if (!el) return NaN;
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : NaN;
  };
  const fmt = (v, digits = 2, unit = "") => {
    if (!Number.isFinite(v)) return "—";
    const s = Math.abs(v) >= 1000 ? v.toFixed(1) : v.toFixed(digits);
    return unit ? `${s} <span>${unit}</span>` : s;
  };
  const setResults = (containerId, map) => {
    const root = document.getElementById(containerId);
    if (!root) return;
    Object.entries(map).forEach(([k, html]) => {
      const el = root.querySelector(`[data-k="${k}"]`);
      if (el) el.innerHTML = html;
    });
  };

  /* ----- Nozzle orientation ----- */
  function calcNozzle() {
    const od = num("nz-od");
    let angle = num("nz-angle");
    const from = ($("#nz-from") || {}).value || "top";
    if (!Number.isFinite(od) || od <= 0 || !Number.isFinite(angle)) {
      setResults("nz-out", { circ: "—", arc: "—", chord: "—", remain: "—" });
      return;
    }
    // Normalize relative to top datum
    if (from === "bottom") angle = (angle + 180) % 360;
    if (from === "side") angle = (angle + 90) % 360;
    angle = ((angle % 360) + 360) % 360;
    const circ = Math.PI * od;
    const arc = circ * (angle / 360);
    const remain = circ - arc;
    // Chord on OD circle
    const theta = (angle * Math.PI) / 180;
    const chord = od * Math.sin(theta / 2);
    setResults("nz-out", {
      circ: fmt(circ, 1, "mm"),
      arc: fmt(arc, 1, "mm"),
      chord: fmt(chord, 1, "mm"),
      remain: fmt(remain, 1, "mm"),
    });
  }

  /* ----- Shell thickness (ASME VIII Div.1 circumferential) ----- */
  function calcThickness() {
    const P = num("th-p");
    const R = num("th-r");
    const S = num("th-s");
    const E = num("th-e");
    const CA = num("th-ca") || 0;
    const den = S * E - 0.6 * P;
    if (!Number.isFinite(P) || !Number.isFinite(R) || !Number.isFinite(S) || !Number.isFinite(E) || den <= 0) {
      setResults("th-out", { t0: "—", t: "—", plate: "—" });
      return;
    }
    const t0 = (P * R) / den;
    const t = t0 + CA;
    // Round up to common plate increments (0.5 mm)
    const plate = Math.ceil(t * 2) / 2;
    setResults("th-out", {
      t0: fmt(t0, 2, "mm"),
      t: fmt(t, 2, "mm"),
      plate: fmt(plate, 1, "mm"),
    });
  }

  /* ----- Weight estimator ----- */
  function syncWeightFields() {
    const shape = ($("#wt-shape") || {}).value || "plate";
    $$(".wt-f").forEach((el) => {
      const forShapes = (el.getAttribute("data-for") || "").split(/\s+/);
      el.style.display = forShapes.includes(shape) ? "" : "none";
    });
  }
  function calcWeight() {
    const shape = ($("#wt-shape") || {}).value || "plate";
    const dens = num("wt-dens") || 7.85; // g/cm³
    const L = num("wt-l");
    const W = num("wt-w");
    const T = num("wt-t");
    const OD = num("wt-od");
    const ID = num("wt-id");
    let volMm3 = 0;
    if (shape === "plate") {
      if ([L, W, T].some((v) => !Number.isFinite(v))) {
        setResults("wt-out", { vol: "—", mass: "—", masskg: "—" });
        return;
      }
      volMm3 = L * W * T;
    } else if (shape === "disc") {
      if ([L, T].some((v) => !Number.isFinite(v))) {
        setResults("wt-out", { vol: "—", mass: "—", masskg: "—" });
        return;
      }
      volMm3 = (Math.PI / 4) * L * L * T;
    } else if (shape === "pipe") {
      if ([OD, ID, T].some((v) => !Number.isFinite(v))) {
        setResults("wt-out", { vol: "—", mass: "—", masskg: "—" });
        return;
      }
      // T here = length of pipe
      volMm3 = (Math.PI / 4) * (OD * OD - ID * ID) * T;
    } else if (shape === "flange") {
      if ([OD, ID, T].some((v) => !Number.isFinite(v))) {
        setResults("wt-out", { vol: "—", mass: "—", masskg: "—" });
        return;
      }
      volMm3 = (Math.PI / 4) * (OD * OD - ID * ID) * T;
    }
    // mm³ → cm³ → g → kg
    const volCm3 = volMm3 / 1000;
    const massG = volCm3 * dens;
    const massKg = massG / 1000;
    setResults("wt-out", {
      vol: fmt(volCm3, 1, "cm³"),
      mass: fmt(massG, 0, "g"),
      masskg: fmt(massKg, 2, "kg"),
    });
  }

  /* ----- Blank diameter ----- */
  function syncBlankFields() {
    const type = ($("#bl-type") || {}).value || "dish";
    $$(".bl-cone").forEach((el) => {
      el.style.display = type === "cone" ? "" : "none";
    });
  }
  function calcBlank() {
    const type = ($("#bl-type") || {}).value || "dish";
    const od = num("bl-od");
    const t = num("bl-t") || 0;
    if (!Number.isFinite(od) || od <= 0) {
      setResults("bl-out", { blank: "—", info: "—", angle: "—" });
      return;
    }
    if (type === "dish") {
      // Common shop approx for 2:1 ellipsoidal: blank ≈ 1.22 × ID + t allowance
      const blank = 1.22 * od + 2 * t;
      setResults("bl-out", {
        blank: fmt(blank, 1, "mm"),
        info: "2:1 ellipsoidal approx",
        angle: "—",
      });
      return;
    }
    // Cone
    const h = num("bl-h");
    const top = num("bl-top") || 0;
    if (!Number.isFinite(h) || h <= 0) {
      setResults("bl-out", { blank: "—", info: "—", angle: "—" });
      return;
    }
    const R = od / 2;
    const r = top / 2;
    const slant = Math.sqrt(h * h + (R - r) * (R - r));
    // Outer radius of sector = slant (from apex path); for truncated, sector radii = L_outer, L_inner
    // Developed outer arc = π * od → sector angle
    const Louter = Math.sqrt(h * h + R * R); // if from apex; for truncated use slant to outer
    // Better: generator length to outer and inner
    const Lo = Math.sqrt(h * h + (R - r) * (R - r)) + (r > 0 ? 0 : 0);
    // For right circular cone frustum development:
    // Slant height S = sqrt(h² + (R-r)²)
    // Outer arc = 2πR, sector radius Ro = S * R/(R-r) when r>0, else S
    let Ro, Ri, sectorDeg;
    if (r < 1e-6) {
      Ro = Math.sqrt(h * h + R * R);
      Ri = 0;
      sectorDeg = (R / Ro) * 360;
    } else {
      const S = Math.sqrt(h * h + (R - r) * (R - r));
      Ro = (S * R) / (R - r);
      Ri = (S * r) / (R - r);
      sectorDeg = (R / Ro) * 360;
    }
    const blank = 2 * Ro + 2 * t; // rough outer blank diameter for cutting circle before sector
    setResults("bl-out", {
      blank: fmt(blank, 1, "mm"),
      info: fmt(Ro, 1, "mm Ro") + " / " + fmt(Ri, 1, "mm Ri"),
      angle: fmt(sectorDeg, 1, "°"),
    });
  }

  /* ----- Helix / screw flight ----- */
  function calcHelix() {
    const od = num("hx-od");
    const id = num("hx-id") || 0;
    const pitch = num("hx-pitch");
    const turns = num("hx-turns") || 1;
    if (!Number.isFinite(od) || !Number.isFinite(pitch) || od <= 0 || pitch <= 0) {
      setResults("hx-out", { lo: "—", li: "—", w: "—", blank: "—" });
      return;
    }
    const lo = turns * Math.sqrt(Math.PI * Math.PI * od * od + pitch * pitch);
    const li = turns * Math.sqrt(Math.PI * Math.PI * id * id + pitch * pitch);
    const w = (od - id) / 2;
    // Approx blank OD for one flight plate (developed annulus)
    const blank = (lo / Math.PI) + 2; // rough
    setResults("hx-out", {
      lo: fmt(lo, 1, "mm"),
      li: fmt(li, 1, "mm"),
      w: fmt(w, 1, "mm"),
      blank: fmt(Math.max(lo / Math.PI, od), 1, "mm"),
    });
  }

  /* ----- Pipe volume & weight ----- */
  function calcPipe() {
    const od = num("pp-od");
    const thk = num("pp-thk");
    const lenM = num("pp-len");
    const dens = num("pp-dens") || 7.85;
    if (!Number.isFinite(od) || !Number.isFinite(thk) || !Number.isFinite(lenM) || od <= 0 || thk <= 0) {
      setResults("pp-out", { id: "—", vol: "—", mass: "—", mpm: "—" });
      return;
    }
    const id = od - 2 * thk;
    if (id <= 0) {
      setResults("pp-out", { id: "—", vol: "—", mass: "—", mpm: "—" });
      return;
    }
    const lenMm = lenM * 1000;
    const volMm3 = (Math.PI / 4) * id * id * lenMm;
    const volL = volMm3 / 1e6; // litres
    const steelMm3 = (Math.PI / 4) * (od * od - id * id) * lenMm;
    const massKg = (steelMm3 / 1000) * dens / 1000;
    const mpm = massKg / lenM;
    setResults("pp-out", {
      id: fmt(id, 2, "mm"),
      vol: fmt(volL, 2, "L"),
      mass: fmt(massKg, 2, "kg"),
      mpm: fmt(mpm, 2, "kg/m"),
    });
  }

  const runners = {
    nozzle: calcNozzle,
    thickness: calcThickness,
    weight: calcWeight,
    blank: calcBlank,
    helix: calcHelix,
    pipe: calcPipe,
  };

  function showCalc(id) {
    $$(".calc-block").forEach((block) => {
      const on = block.getAttribute("data-calc") === id;
      block.hidden = !on;
    });
    const run = runners[id];
    if (run) run();
  }

  function bindInputs() {
    // Live recalculation on any input/select change inside a calc block
    $$(".calc-block").forEach((block) => {
      block.addEventListener("input", () => {
        const id = block.getAttribute("data-calc");
        if (id === "weight") syncWeightFields();
        if (id === "blank") syncBlankFields();
        const run = runners[id];
        if (run) run();
      });
      block.addEventListener("change", () => {
        const id = block.getAttribute("data-calc");
        if (id === "weight") syncWeightFields();
        if (id === "blank") syncBlankFields();
        const run = runners[id];
        if (run) run();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const select = $("#calcSelect");
    if (select) {
      select.addEventListener("change", () => showCalc(select.value));
      showCalc(select.value);
    }
    syncWeightFields();
    syncBlankFields();
    bindInputs();
    // Initial run all visible
    Object.values(runners).forEach((fn) => fn());
  });
})();
