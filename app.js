(() => {
  "use strict";

  const NB_BY_INCH = {
    "1/2":"15", "3/4":"20", "1":"25", "1 1/4":"32", "1 1/2":"40",
    "2":"50", "2 1/2":"65", "3":"80", "3 1/2":"90", "4":"100",
    "5":"125", "6":"150", "8":"200", "10":"250", "12":"300",
    "14":"350", "16":"400", "18":"450", "20":"500", "22":"550", "24":"600"
  };

  const COMMON_KEYS = [
    "outside_diameter_of_flange_O_mm",
    "thickness_of_flange_Q_mm",
    "diameter_of_raised_face_R_mm",
    "diameter_of_bolt_circle_P_mm",
    "number_of_holes",
    "hole_size_H_mm",
    "diameter_of_hub_E_mm"
  ];

  const TYPE_OPTIONS = [
    { value: "all", label: "All flange types" },
    { value: "wn", label: "Weld Neck" },
    { value: "so", label: "Slip-On / Socket Weld" },
    { value: "lj", label: "Lap Joint" }
  ];

  const TYPE_KEYS = {
    wn: ["length_through_hub_Y_welding_neck_mm"],
    so: [
      "slipon_socket_weld_bore_diameter_B_mm",
      "length_through_hub_Y_slipon_screwed_socket_weld_mm"
    ],
    lj: ["lap_joint_bore_diameter_B_mm", "length_through_hub_Y_lap_joint_mm"]
  };

  // Preferred display order (shop-friendly)
  const KEY_ORDER = [
    "outside_diameter_of_flange_O_mm",
    "thickness_of_flange_Q_mm",
    "diameter_of_raised_face_R_mm",
    "diameter_of_bolt_circle_P_mm",
    "number_of_holes",
    "hole_size_H_mm",
    "diameter_of_hub_E_mm",
    "slipon_socket_weld_bore_diameter_B_mm",
    "lap_joint_bore_diameter_B_mm",
    "length_through_hub_Y_welding_neck_mm",
    "length_through_hub_Y_slipon_screwed_socket_weld_mm",
    "length_through_hub_Y_lap_joint_mm"
  ];

  const $ = (id) => document.getElementById(id);
  const sizeSelect = $("sizeSelect");
  const classSelect = $("classSelect");
  const typeSelect = $("typeSelect");
  const result = $("result");
  const dataStatus = $("dataStatus");
  const menuToggle = $("menuToggle");
  const mainNav = $("mainNav");
  const siteHeader = $("siteHeader");

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function setEmpty(title, description) {
    result.innerHTML = `<div class="empty"><div class="empty-icon">⌖</div><b>${escapeHTML(title)}</b><span>${escapeHTML(description)}</span></div>`;
  }

  function addOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }

  function getNB(size) {
    return NB_BY_INCH[size] || "—";
  }

  function validateData(data) {
    return Boolean(
      data &&
      Array.isArray(data.columns) &&
      data.classes &&
      Array.isArray(data.classes["150"]) &&
      Array.isArray(data.classes["300"])
    );
  }

  function populateTypeOptions() {
    typeSelect.replaceChildren();
    TYPE_OPTIONS.forEach((item) => addOption(typeSelect, item.value, item.label));
    typeSelect.value = "all";
  }

  function initialize(data) {
    if (!validateData(data)) {
      throw new Error("The flange data file has an unexpected format.");
    }

    const rowsByClass = data.classes;
    const allRows = [...rowsByClass["150"], ...rowsByClass["300"]];
    const sizes = [...new Set(allRows.map((row) => String(row.nominal_pipe_size_in)))];

    if (!sizes.length) {
      throw new Error("No nominal pipe sizes were found in the flange data.");
    }

    // Always build the size list from the bundled data, not from an asynchronous fetch.
    sizeSelect.replaceChildren();
    addOption(sizeSelect, "", "Select pipe size");
    sizes.forEach((size) => addOption(sizeSelect, size, `${size}″  ·  ${getNB(size)} NB`));
    sizeSelect.value = "";

    classSelect.replaceChildren();
    addOption(classSelect, "", "Select size first");
    classSelect.disabled = true;
    populateTypeOptions();
    dataStatus.textContent = `${sizes.length} SIZES · 2 CLASSES · READY`;
    dataStatus.title = `${data.classes["150"].length + data.classes["300"].length} dimension records loaded`;

    function updateClassesForSize(size) {
      classSelect.replaceChildren();
      addOption(classSelect, "", size ? "Select pressure class" : "Select size first");
      if (!size) {
        classSelect.disabled = true;
        return;
      }
      ["150", "300"].forEach((pressureClass) => {
        const hasRecord = rowsByClass[pressureClass].some(
          (row) => String(row.nominal_pipe_size_in) === size
        );
        if (hasRecord) addOption(classSelect, pressureClass, `Class ${pressureClass}`);
      });
      classSelect.disabled = classSelect.options.length <= 1;
    }

    function render() {
      const size = sizeSelect.value;
      const pressureClass = classSelect.value;

      if (!size) {
        updateClassesForSize("");
        setEmpty("Your dimensions will appear here", "Choose a nominal pipe size and pressure class above to get started.");
        return;
      }

      if (!pressureClass) {
        setEmpty("Select a pressure class", "Choose Class 150 or Class 300 to load the dimensions for this size.");
        return;
      }

      const row = rowsByClass[pressureClass].find(
        (item) => String(item.nominal_pipe_size_in) === size
      );

      if (!row) {
        setEmpty("Dimensions not available", "The supplied reference does not contain a record for this size and class.");
        return;
      }

      let columns = data.columns.filter(
        (column) => column.key !== "nominal_pipe_size_in" && column.key !== "depth_of_socket_D_mm"
      );
      const selectedType = typeSelect.value || "all";
      if (selectedType !== "all") {
        const allowed = new Set([...COMMON_KEYS, ...(TYPE_KEYS[selectedType] || [])]);
        columns = columns.filter((column) => allowed.has(column.key));
      }
      // Sort by preferred shop order
      columns = columns.slice().sort((a, b) => {
        const ia = KEY_ORDER.indexOf(a.key);
        const ib = KEY_ORDER.indexOf(b.key);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });

      if (!columns.length) {
        setEmpty("No dimensions available for this filter", "Choose another flange type to see the available dimensions.");
        return;
      }

      const cards = columns.map((column) => {
        const rawValue = row[column.key];
        const value = rawValue === null || rawValue === undefined || rawValue === "" ? "—" : escapeHTML(rawValue);
        const unit = column.unit === "count" || !column.unit ? "" : ` <em>${escapeHTML(column.unit)}</em>`;
        return `<article class="result-item"><div class="label">${escapeHTML(column.label)}</div><div class="value">${value}${unit}</div></article>`;
      }).join("");

      const warning = row.asterisk_marked || row.ansi_b16_5_covered === false
        ? `<div class="notes warning"><strong>Source note:</strong> ${escapeHTML(size)}″ is marked as not covered by ANSI B16.5 in the supplied reference.</div>`
        : "";
      const sourceNotes = `<div class="notes"><strong>Reference notes:</strong> The 1.6 mm raised face is included in flange thickness and length. The marked dimension denotes pipe O.D. in a welding neck flange.</div>`;
      const typeLabel = TYPE_OPTIONS.find((item) => item.value === selectedType)?.label || "All dimensions";

      result.innerHTML = `
        <div class="result-head">
          <div class="result-head-text">
            <p class="result-kicker">Flange dimensions</p>
            <h2>${escapeHTML(size)}″ · ${getNB(size)} NB</h2>
            <div class="result-subtitle">${columns.length} parameters · ${escapeHTML(typeLabel)} · All values in millimetres</div>
          </div>
          <span class="pill">Class ${escapeHTML(pressureClass)}</span>
        </div>
        <div class="result-tools"><span>Dimension breakdown</span><span>${columns.length} parameters</span></div>
        <div class="result-grid">${cards}</div>${warning}${sourceNotes}`;
    }

    sizeSelect.addEventListener("change", () => {
      updateClassesForSize(sizeSelect.value);
      classSelect.value = "";
      render();
    });
    classSelect.addEventListener("change", render);
    typeSelect.addEventListener("change", render);

    render();
  }

  function showDataError(error) {
    console.error("MECHSPEC flange data:", error);
    dataStatus.textContent = "DATA NOT AVAILABLE";
    setEmpty("Data could not be loaded", "Make sure data.js is in the same folder as this page, then refresh the page.");
    sizeSelect.replaceChildren();
    addOption(sizeSelect, "", "Data unavailable");
    sizeSelect.disabled = true;
    classSelect.disabled = true;
  }


  try {
    // data.js is bundled with this page, so options work even when opened with file://.
    initialize(window.FLANGE_REFERENCE_DATA);
  } catch (error) {
    showDataError(error);
  }
})();
