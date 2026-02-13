const GLASS_DB = {
    "soda": { density: 2500, viscosity: 1000 },
    "boro": { density: 2230, viscosity: 1000 },
    "lead": { density: 3000, viscosity: 1000 },
    "custom": { density: 0, viscosity: 0 }
};

const dom = {
    // Shared
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    resetBtn: document.getElementById('reset-btn'),

    // Flow Calculator
    materialSelect: document.getElementById('material-select'),
    densityInput: document.getElementById('density'),
    viscosityInput: document.getElementById('viscosity'),
    lengthInput: document.getElementById('length'),
    diameterInput: document.getElementById('diameter'),
    widthInput: document.getElementById('width'),
    heightInput: document.getElementById('height'),
    majorInput: document.getElementById('major'),
    minorInput: document.getElementById('minor'),
    outerInput: document.getElementById('outer'),
    innerInput: document.getElementById('inner'),
    shapeBtns: document.querySelectorAll('.shape-btn'),
    shapeInputs: document.querySelectorAll('.shape-input'),
    previewSvg: document.getElementById('nozzle-preview'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    inputGravity: document.getElementById('input-gravity'),
    inputPressure: document.getElementById('input-pressure'),
    headHeightInput: document.getElementById('head-height'),
    pressureBarInput: document.getElementById('pressure-bar'),
    resFlow: document.getElementById('res-flow'),
    resVelocity: document.getElementById('res-velocity'),
    recordBtn: document.getElementById('record-btn'),
    historyList: document.getElementById('history-list'),
    clearHistBtn: document.getElementById('clear-hist-btn'),
    emptyMsg: document.getElementById('empty-msg'),

    // Viscosity Calculator
    compGrid: document.getElementById('comp-grid'),
    normalizeBtn: document.getElementById('normalize-btn'),
    clearCompBtn: document.getElementById('clear-comp-btn'),
    compTotal: document.getElementById('comp-total'),
    resT15: document.getElementById('t-1-5'),
    resT66: document.getElementById('t-6-6'),
    resTg: document.getElementById('t-g'),
    resTstrain: document.getElementById('t-strain'),
    vftParams: document.getElementById('vft-params'),
    viscosityChart: document.getElementById('viscosityChart'),

    // Custom Calc
    calcTempInput: document.getElementById('calc-temp-input'),
    calcViscResult: document.getElementById('calc-visc-result'),
    calcViscBtn: document.getElementById('calc-visc-btn'),
    calcLogInput: document.getElementById('calc-log-input'),
    calcTempResult: document.getElementById('calc-temp-result'),
    calcTempBtn: document.getElementById('calc-temp-btn'),
    recordViscBtn: document.getElementById('record-visc-btn')
};

let currentMode = 'gravity';
let currentShape = 'circle';
let historyData = [];
let chartInstance = null;
let currentVFT = null;

// Color palette for overlaying multiple curves
const CHART_COLORS = [
    '#ff9f43', '#2ecc71', '#3498db', '#e74c3c', '#9b59b6',
    '#1abc9c', '#f39c12', '#e67e22', '#00cec9', '#fd79a8'
];

// Full list of 54 oxides from Excel
const COMMON_OXIDES = [
    'SiO2', 'B2O3', 'Al2O3', 'Na2O', 'K2O', 'MgO', 'CaO', 'Li2O', 'PbO', 'ZrO2',
    'BaO', 'SrO', 'TiO2', 'Fe2O3', 'ZnO', 'CeO2', 'MnO2', 'SO3', 'As2O3', 'Sb2O3',
    'F', 'Se', 'CdO', 'P2O5', 'NiO', 'Bi2O3', 'Cr2O3', 'Co3O4', 'La2O3', 'Ga2O3',
    'Gd2O3', 'I', 'MoO3', 'Nb2O5', 'Nd2O3', 'PdO', 'Rb2O', 'ReO2', 'RuO2', 'Sm2O3',
    'SnO2', 'TeO2', 'Pr2O3', 'Rh2O3', 'WO3', 'V2O5', 'Y2O3', 'CuO', 'Eu2O3', 'Cs2O',
    'Cl', 'Ag2O', 'UO2', 'ThO2'
];

function init() {
    setupEventListeners();
    setupViscosityUI();

    // Init Flow Calc
    updateMaterialInputs();
    updateShapeInputs();
    renderHistory();
}

function setupEventListeners() {
    // Tabs
    dom.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Flow Calc Events
    dom.materialSelect.addEventListener('change', updateMaterialInputs);
    dom.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.parentElement.classList.contains('mode-switch')) { // Only for flow mode switch
                setMode(btn.dataset.mode);
            }
        });
    });
    dom.shapeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setShape(btn.dataset.shape);
        });
    });

    // Universal Input Listener for Flow Calc
    const flowInputs = document.querySelectorAll('#tab-flow input');
    flowInputs.forEach(input => {
        input.addEventListener('input', () => {
            drawVisualizer();
            calculateFlow();
        });
    });

    // Actions
    dom.resetBtn.addEventListener('click', resetAll);
    dom.recordBtn.addEventListener('click', recordResult);
    dom.clearHistBtn.addEventListener('click', clearHistory);

    // Viscosity Calc Events
    dom.normalizeBtn.addEventListener('click', normalizeComposition);
    dom.clearCompBtn.addEventListener('click', clearComposition);
    dom.calcViscBtn.addEventListener('click', calculateSpecificViscosity);
    dom.calcTempBtn.addEventListener('click', calculateSpecificTemperature);
    dom.recordViscBtn.addEventListener('click', recordViscosity);

    // Unit Toggle
    document.querySelectorAll('input[name="comp-unit"]').forEach(r => {
        r.addEventListener('change', () => {
            calculateViscosityAndPlot();
        });
    });

    // History Click Event
    dom.historyList.addEventListener('click', (e) => {
        // Ignore clicks on delete button
        if (e.target.closest('.hist-delete-btn')) {
            const item = e.target.closest('.history-item');
            if (item) deleteHistoryItem(parseInt(item.dataset.id));
            return;
        }
        const item = e.target.closest('.history-item');
        if (item) {
            const id = parseInt(item.dataset.id);
            const record = historyData.find(r => r.id === id);
            if (record) restoreHistoryItem(record);
        }
    });
}

function restoreHistoryItem(record) {
    if (record.type === 'viscosity') {
        switchTab('viscosity');
        // Clear existing
        document.querySelectorAll('.oxide-input').forEach(inp => inp.value = '');

        // Restore composition
        if (record.composition) {
            record.composition.forEach(c => {
                const inp = document.querySelector(`.oxide-input[data-oxide="${c.name}"]`);
                if (inp) inp.value = c.val;
            });
        }
        updateTotal();
        calculateViscosityAndPlot();
    } else {
        switchTab('flow');

        // Restore Flow Params
        const p = record.params;
        if (!p) return; // Legacy records might not have params

        // Material
        dom.materialSelect.value = p.material;
        updateMaterialInputs();
        if (p.material === 'custom') {
            dom.densityInput.value = p.density;
            dom.viscosityInput.value = p.viscosity;
        }

        // Shape
        setShape(p.shape);

        // Inputs
        dom.lengthInput.value = p.length;
        dom.diameterInput.value = p.diameter;
        dom.widthInput.value = p.width;
        dom.heightInput.value = p.height;
        dom.majorInput.value = p.major;
        dom.minorInput.value = p.minor;
        dom.outerInput.value = p.outer;
        dom.innerInput.value = p.inner;

        // Mode
        setMode(p.mode);
        dom.headHeightInput.value = p.headHeight;
        dom.pressureBarInput.value = p.pressure;

        calculateFlow();
    }
}

function calculateSpecificViscosity() {
    if (!currentVFT) return;
    const t = parseFloat(dom.calcTempInput.value);
    if (isNaN(t)) return;

    // log n = A + B / (T - T0)
    // Check if T is essentially T0 to avoid division by zero
    if (Math.abs(t - currentVFT.T0) < 0.1) {
        dom.calcViscResult.value = "Error";
        return;
    }

    const logVisc = currentVFT.A + currentVFT.B / (t - currentVFT.T0);
    const visc = Math.pow(10, logVisc); // Pa.s

    dom.calcViscResult.value = `${logVisc.toFixed(3)} (η=${visc.toExponential(2)})`;
}

function calculateSpecificTemperature() {
    if (!currentVFT) return;
    const logVisc = parseFloat(dom.calcLogInput.value);
    if (isNaN(logVisc)) return;

    // log n = A + B / (T - T0)
    // log n - A = B / (T - T0)
    // T - T0 = B / (log n - A)
    // T = T0 + B / (log n - A)

    if (Math.abs(logVisc - currentVFT.A) < 0.001) {
        dom.calcTempResult.value = "Error";
        return;
    }

    const t = currentVFT.T0 + currentVFT.B / (logVisc - currentVFT.A);
    dom.calcTempResult.value = `${t.toFixed(1)} °C`;
}

function switchTab(tabId) {
    dom.tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
    dom.tabContents.forEach(content => content.classList.toggle('active', content.id === `tab-${tabId}`));
}

/* =========================================
   Flow Calculator Logic
   ========================================= */

function resetAll() {
    // Reset Flow Calc
    dom.materialSelect.value = 'soda';
    updateMaterialInputs();
    currentShape = 'circle';
    dom.shapeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.shape === 'circle'));
    currentMode = 'gravity';
    dom.modeBtns.forEach(btn => {
        if (btn.dataset.mode) btn.classList.toggle('active', btn.dataset.mode === 'gravity');
    });

    // Clear Inputs
    const ids = ['length', 'diameter', 'width', 'height', 'major', 'minor', 'outer', 'inner', 'head-height', 'pressure-bar'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    updateShapeInputs();
    setMode('gravity');
    calculateFlow();

    // Reset Viscosity Inputs
    const oxideInputs = document.querySelectorAll('.oxide-input');
    oxideInputs.forEach(input => input.value = '');
    calculateViscosityAndPlot(); // clears chart
}

function updateMaterialInputs() {
    const type = dom.materialSelect.value;
    const data = GLASS_DB[type];

    if (type === 'custom') {
        dom.densityInput.disabled = false;
        dom.viscosityInput.disabled = false;
    } else {
        dom.densityInput.value = data.density;
        dom.viscosityInput.value = data.viscosity;
        dom.densityInput.disabled = true;
        dom.viscosityInput.disabled = true;
    }
    calculateFlow();
}

function setMode(mode) {
    currentMode = mode;
    // Only target buttons inside mode-switch
    const buttons = document.querySelectorAll('.mode-switch .mode-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'gravity') {
        dom.inputGravity.classList.remove('hidden');
        dom.inputPressure.classList.add('hidden');
    } else {
        dom.inputGravity.classList.add('hidden');
        dom.inputPressure.classList.remove('hidden');
    }
    calculateFlow();
}

function setShape(shape) {
    currentShape = shape;
    dom.shapeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.shape === shape);
    });
    updateShapeInputs();
}

function updateShapeInputs() {
    dom.shapeInputs.forEach(el => el.classList.add('hidden'));
    if (currentShape === 'circle') document.getElementById('input-circle').classList.remove('hidden');
    else if (currentShape === 'rect') document.getElementById('input-rect').classList.remove('hidden');
    else if (currentShape === 'ellipse') document.getElementById('input-ellipse').classList.remove('hidden');
    else if (currentShape === 'annulus') document.getElementById('input-annulus').classList.remove('hidden');
    drawVisualizer();
    calculateFlow();
}

function drawVisualizer() {
    dom.previewSvg.innerHTML = '';
    const center = 50;
    const fill = "rgba(255, 159, 67, 0.2)";
    const stroke = "#ff9f43";
    const strokeW = "2";

    if (currentShape === 'circle') {
        const r = 40;
        const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        el.setAttribute("cx", center);
        el.setAttribute("cy", center);
        el.setAttribute("r", r);
        el.setAttribute("fill", fill);
        el.setAttribute("stroke", stroke);
        el.setAttribute("stroke-width", strokeW);
        dom.previewSvg.appendChild(el);
    }
    else if (currentShape === 'rect') {
        const w_val = parseFloat(dom.widthInput.value) || 10;
        const h_val = parseFloat(dom.heightInput.value) || 10;
        const aspect = w_val / h_val;
        let w_draw, h_draw;
        if (aspect >= 1) { w_draw = 80; h_draw = 80 / aspect; }
        else { h_draw = 80; w_draw = 80 * aspect; }
        const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        el.setAttribute("x", center - w_draw / 2);
        el.setAttribute("y", center - h_draw / 2);
        el.setAttribute("width", w_draw);
        el.setAttribute("height", h_draw);
        el.setAttribute("fill", fill);
        el.setAttribute("stroke", stroke);
        el.setAttribute("stroke-width", strokeW);
        dom.previewSvg.appendChild(el);
    }
    else if (currentShape === 'ellipse') {
        const maj_val = parseFloat(dom.majorInput.value) || 10;
        const min_val = parseFloat(dom.minorInput.value) || 5;
        const aspect = maj_val / min_val;
        let rx, ry;
        if (aspect >= 1) { rx = 40; ry = 40 / aspect; }
        else { ry = 40; rx = 40 * aspect; }
        const el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        el.setAttribute("cx", center);
        el.setAttribute("cy", center);
        el.setAttribute("rx", rx);
        el.setAttribute("ry", ry);
        el.setAttribute("fill", fill);
        el.setAttribute("stroke", stroke);
        el.setAttribute("stroke-width", strokeW);
        dom.previewSvg.appendChild(el);
    }
    else if (currentShape === 'annulus') {
        const out_val = parseFloat(dom.outerInput.value) || 10;
        const in_val = parseFloat(dom.innerInput.value) || 5;
        const r_out_draw = 40;
        const ratio = (out_val > 0) ? in_val / out_val : 0.5;
        const r_in_draw = r_out_draw * Math.min(Math.max(ratio, 0.1), 0.9);
        const outer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        outer.setAttribute("cx", center);
        outer.setAttribute("cy", center);
        outer.setAttribute("r", r_out_draw);
        outer.setAttribute("fill", fill);
        outer.setAttribute("stroke", stroke);
        outer.setAttribute("stroke-width", strokeW);
        dom.previewSvg.appendChild(outer);
        const inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        inner.setAttribute("cx", center);
        inner.setAttribute("cy", center);
        inner.setAttribute("r", r_in_draw);
        inner.setAttribute("fill", "#2c1e14");
        inner.setAttribute("fill-opacity", "0.8");
        inner.setAttribute("stroke", stroke);
        inner.setAttribute("stroke-width", "1");
        inner.setAttribute("stroke-dasharray", "4 2");
        dom.previewSvg.appendChild(inner);
    }
}

function calculateFlow() {
    const density = parseFloat(dom.densityInput.value) || 0;
    const viscosity = parseFloat(dom.viscosityInput.value) || 0;
    const length_mm = parseFloat(dom.lengthInput.value) || 0;

    if (density <= 0 || viscosity <= 0 || length_mm <= 0) {
        updateFlowResult(0, 0); return;
    }
    const length_m = length_mm / 1000;
    let dP = 0;
    if (currentMode === 'gravity') {
        const height_m = (parseFloat(dom.headHeightInput.value) || 0) / 1000;
        dP = density * 9.81 * height_m;
    } else {
        const bar = parseFloat(dom.pressureBarInput.value) || 0;
        dP = bar * 100000;
    }
    if (dP <= 0) { updateFlowResult(0, 0); return; }

    let Q_m3_s = 0;
    let Area_m2 = 0;

    if (currentShape === 'circle') {
        const d_mm = parseFloat(dom.diameterInput.value) || 0;
        if (d_mm <= 0) { updateFlowResult(0, 0); return; }
        const r_m = (d_mm / 2) / 1000;
        Q_m3_s = (Math.PI * Math.pow(r_m, 4) * dP) / (8 * viscosity * length_m);
        Area_m2 = Math.PI * Math.pow(r_m, 2);
    }
    else if (currentShape === 'rect') {
        const w_mm = parseFloat(dom.widthInput.value) || 0;
        const h_mm = parseFloat(dom.heightInput.value) || 0;
        if (w_mm <= 0 || h_mm <= 0) { updateFlowResult(0, 0); return; }
        const w_m = w_mm / 1000;
        const h_m = h_mm / 1000;
        const long = Math.max(w_m, h_m);
        const short = Math.min(w_m, h_m);
        Q_m3_s = (long * Math.pow(short, 3) * dP) / (12 * viscosity * length_m) * (1 - 0.630 * (short / long));
        Area_m2 = w_m * h_m;
    }
    else if (currentShape === 'ellipse') {
        const maj_mm = parseFloat(dom.majorInput.value) || 0;
        const min_mm = parseFloat(dom.minorInput.value) || 0;
        if (maj_mm <= 0 || min_mm <= 0) { updateFlowResult(0, 0); return; }
        const a_m = (maj_mm / 2) / 1000;
        const b_m = (min_mm / 2) / 1000;
        const numerator = Math.PI * Math.pow(a_m, 3) * Math.pow(b_m, 3) * dP;
        const denominator = 4 * viscosity * length_m * (Math.pow(a_m, 2) + Math.pow(b_m, 2));
        Q_m3_s = numerator / denominator;
        Area_m2 = Math.PI * a_m * b_m;
    }
    else if (currentShape === 'annulus') {
        const out_mm = parseFloat(dom.outerInput.value) || 0;
        const in_mm = parseFloat(dom.innerInput.value) || 0;
        if (out_mm <= 0 || in_mm < 0 || in_mm >= out_mm) { updateFlowResult(0, 0); return; }
        const R_out = (out_mm / 2) / 1000;
        const R_in = (in_mm / 2) / 1000;
        const K = R_in / R_out;
        const term1 = 1 - Math.pow(K, 4);
        const term2 = Math.pow(1 - Math.pow(K, 2), 2) / Math.log(1 / K);
        Q_m3_s = ((Math.PI * dP * Math.pow(R_out, 4)) / (8 * viscosity * length_m)) * (term1 - term2);
        Area_m2 = Math.PI * (Math.pow(R_out, 2) - Math.pow(R_in, 2));
    }

    const v_m_s = Area_m2 > 0 ? Q_m3_s / Area_m2 : 0;
    const mass_flow = Q_m3_s * density * 3600; // kg/hr
    updateFlowResult(mass_flow, v_m_s);
}

function updateFlowResult(flow, velocity) {
    dom.resFlow.textContent = flow ? flow.toFixed(4) : "0.0000";
    dom.resVelocity.textContent = velocity ? velocity.toFixed(4) : "0.0000";
}

function recordResult() {
    const flowText = dom.resFlow.textContent;
    const velText = dom.resVelocity.textContent;
    let shapeInfo = "";
    if (currentShape === 'circle') shapeInfo = `Circle D=${dom.diameterInput.value || 0}mm`;
    else if (currentShape === 'rect') shapeInfo = `Rect ${dom.widthInput.value || 0}x${dom.heightInput.value || 0}`;
    else if (currentShape === 'ellipse') shapeInfo = `Ellipse ${dom.majorInput.value || 0}x${dom.minorInput.value || 0}`;
    else if (currentShape === 'annulus') shapeInfo = `Ring D=${dom.outerInput.value || 0}/${dom.innerInput.value || 0}`;

    const params = {
        material: dom.materialSelect.value,
        density: dom.densityInput.value,
        viscosity: dom.viscosityInput.value,
        shape: currentShape,
        length: dom.lengthInput.value,
        diameter: dom.diameterInput.value,
        width: dom.widthInput.value,
        height: dom.heightInput.value,
        major: dom.majorInput.value,
        minor: dom.minorInput.value,
        outer: dom.outerInput.value,
        inner: dom.innerInput.value,
        mode: currentMode,
        headHeight: dom.headHeightInput.value,
        pressure: dom.pressureBarInput.value
    };

    const record = {
        id: Date.now(),
        type: 'flow',
        shape: currentShape,
        desc: shapeInfo,
        flow: flowText,
        vel: velText,
        params: params,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    historyData.unshift(record);
    if (historyData.length > 20) historyData.pop(); // Increase history limit
    renderHistory();
}

function recordViscosity() {
    // 1. Get Composition Summary (Top 3)
    const inputs = document.querySelectorAll('.oxide-input');
    const comps = [];
    inputs.forEach(inp => {
        const val = parseFloat(inp.value) || 0;
        if (val > 0) comps.push({ name: inp.dataset.oxide, val: val });
    });
    comps.sort((a, b) => b.val - a.val);

    const desc = comps.slice(0, 3).map(c => `${c.name} ${c.val}%`).join(', ') + (comps.length > 3 ? '...' : '');

    // 2. Get Results
    const t15 = dom.resT15.textContent;
    const t66 = dom.resT66.textContent;
    const tg = dom.resTg.textContent;

    const record = {
        id: Date.now(),
        type: 'viscosity',
        desc: desc || "Empty Composition",
        composition: comps,
        vft: currentVFT ? { A: currentVFT.A, B: currentVFT.B, T0: currentVFT.T0 } : null,
        t15: t15,
        t66: t66,
        tg: tg,
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    historyData.unshift(record);
    if (historyData.length > 20) historyData.pop();
    renderHistory();
    // Update chart to include the new history curve
    if (currentVFT) updateChart(currentVFT);
}

function deleteHistoryItem(id) {
    historyData = historyData.filter(r => r.id !== id);
    renderHistory();
    // Refresh chart to remove deleted curve
    if (currentVFT) updateChart(currentVFT);
    else if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

function clearHistory() {
    historyData = [];
    renderHistory();
    // Refresh chart to remove all history curves
    if (currentVFT) updateChart(currentVFT);
    else if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

function renderHistory() {
    dom.historyList.innerHTML = '';
    if (historyData.length === 0) {
        dom.emptyMsg.classList.remove('hidden');
        dom.emptyMsg.style.display = 'block';
    } else {
        dom.emptyMsg.style.display = 'none';
        // Get viscosity history items for color assignment
        const viscItems = historyData.filter(r => r.type === 'viscosity');

        historyData.forEach(item => {
            const li = document.createElement('li');
            li.className = 'history-item';
            li.dataset.id = item.id;

            // Color indicator for viscosity items
            const viscIdx = viscItems.indexOf(item);
            const colorDot = (item.type === 'viscosity' && viscIdx >= 0)
                ? `<span class="hist-color-dot" style="background:${CHART_COLORS[viscIdx % CHART_COLORS.length]}"></span>`
                : '';

            const deleteBtn = `<button class="hist-delete-btn" title="삭제">✕</button>`;

            if (item.type === 'viscosity') {
                const iconSvg = getMiniSvg('viscosity');
                li.innerHTML = `
                    ${colorDot}
                    <div class="hist-icon-wrapper">${iconSvg}</div>
                    <div class="hist-info">
                        <span class="hist-shape" style="font-size:0.85rem;">${item.desc}</span>
                        <span class="hist-meta">${item.time}</span>
                    </div>
                    <div class="hist-val" style="min-width:90px;">
                        <div style="font-size:0.8rem;">Tw: ${item.t15}</div>
                        <div class="sub">Ts: ${item.t66}</div>
                        <div class="sub">Tg: ${item.tg || '---'}</div>
                    </div>
                    ${deleteBtn}
                `;
            } else {
                const iconSvg = getMiniSvg(item.shape);
                li.innerHTML = `
                    <div class="hist-icon-wrapper">${iconSvg}</div>
                    <div class="hist-info">
                        <span class="hist-shape">${item.desc}</span>
                        <span class="hist-meta">${item.time}</span>
                    </div>
                    <div class="hist-val">
                        <div>${item.flow} kg/hr</div>
                         <div class="sub">${item.vel} m/s</div>
                    </div>
                    ${deleteBtn}
                `;
            }
            dom.historyList.appendChild(li);
        });
    }
}

function getMiniSvg(shape) {
    const color = "#ff9f43";
    let content = "";
    if (shape === 'viscosity') {
        // Draw a flask or grid icon
        content = `<path d="M14 2H10V6L4 16V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V16L14 6V2Z" fill="none" stroke="${color}" stroke-width="2"/>
                   <line x1="10" y1="12" x2="14" y2="12" stroke="${color}" stroke-width="1"/>`;
    }
    else if (shape === 'circle') content = `<circle cx="12" cy="12" r="8" fill="none" stroke="${color}" stroke-width="2"/>`;
    else if (shape === 'rect') content = `<rect x="6" y="6" width="12" height="12" fill="none" stroke="${color}" stroke-width="2"/>`;
    else if (shape === 'ellipse') content = `<ellipse cx="12" cy="12" rx="10" ry="6" fill="none" stroke="${color}" stroke-width="2"/>`;
    else if (shape === 'annulus') content = `<circle cx="12" cy="12" r="9" fill="none" stroke="${color}" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="2 1"/>`;
    return `<svg width="24" height="24" viewBox="0 0 24 24">${content}</svg>`;
}


/* =========================================
   Viscosity Calculator Logic
   ========================================= */

function setupViscosityUI() {
    // Generate Input Fields
    dom.compGrid.innerHTML = '';
    COMMON_OXIDES.forEach(oxide => {
        const wrapper = document.createElement('div');
        wrapper.className = 'comp-item';
        wrapper.innerHTML = `
            <label>${oxide}</label>
            <input type="number" class="oxide-input" data-oxide="${oxide}" placeholder="0" min="0" max="100">
        `;
        dom.compGrid.appendChild(wrapper);
    });

    const inputs = document.querySelectorAll('.oxide-input');
    inputs.forEach(inp => {
        inp.addEventListener('input', () => {
            updateTotal();
            calculateViscosityAndPlot();
        });
    });
}

function updateTotal() {
    const inputs = document.querySelectorAll('.oxide-input');
    let sum = 0;
    inputs.forEach(inp => sum += parseFloat(inp.value) || 0);
    dom.compTotal.textContent = sum.toFixed(2);
    dom.compTotal.style.color = Math.abs(sum - 100) < 0.1 ? 'var(--success)' : 'var(--text-primary)';
}

function normalizeComposition() {
    const inputs = document.querySelectorAll('.oxide-input');
    let sum = 0;
    inputs.forEach(inp => sum += parseFloat(inp.value) || 0);
    if (sum === 0) return;

    inputs.forEach(inp => {
        const current = parseFloat(inp.value) || 0;
        const normalized = (current / sum) * 100;
        inp.value = normalized.toFixed(4).replace(/\.?0+$/, "");
    });
    updateTotal();
    calculateViscosityAndPlot();
}

function clearComposition() {
    const inputs = document.querySelectorAll('.oxide-input');
    inputs.forEach(inp => inp.value = '');
    updateTotal();
    calculateViscosityAndPlot();
}

function calculateViscosityAndPlot() {
    // 1. Get Selected Unit
    const unit = document.querySelector('input[name="comp-unit"]:checked').value; // 'wt' or 'mol'

    // 2. Get Composition Dictionary
    const inputs = document.querySelectorAll('.oxide-input');
    const inputComp = {};
    inputs.forEach(inp => {
        inputComp[inp.dataset.oxide] = parseFloat(inp.value) || 0;
    });

    let comp = {}; // This will hold Mol % for the model

    if (unit === 'wt') {
        // --- Convert Weight % to Mol % ---
        const MOLAR_MASS = {
            'SiO2': 60.08, 'B2O3': 69.62, 'Al2O3': 101.96, 'Na2O': 61.98, 'K2O': 94.20,
            'MgO': 40.30, 'CaO': 56.08, 'Li2O': 29.88, 'PbO': 223.20, 'ZrO2': 123.22,
            'BaO': 153.33, 'SrO': 103.62, 'TiO2': 79.87, 'Fe2O3': 159.69, 'ZnO': 81.38,
            'CeO2': 172.11, 'MnO2': 86.94, 'SO3': 80.06, 'As2O3': 197.84, 'Sb2O3': 291.50,
            'F': 19.00, 'Se': 78.96, 'CdO': 128.41, 'P2O5': 141.94, 'NiO': 74.69,
            'Bi2O3': 465.96, 'Cr2O3': 151.99, 'Co3O4': 240.80, 'La2O3': 325.81, 'Ga2O3': 187.44,
            'Gd2O3': 362.50, 'I': 126.90, 'MoO3': 143.94, 'Nb2O5': 265.81, 'Nd2O3': 336.48,
            'PdO': 122.42, 'Rb2O': 186.94, 'ReO2': 218.21, 'RuO2': 133.07, 'Sm2O3': 348.72,
            'SnO2': 150.71, 'TeO2': 159.60, 'Pr2O3': 329.81, 'Rh2O3': 253.81, 'WO3': 231.84,
            'V2O5': 181.88, 'Y2O3': 225.81, 'CuO': 79.55, 'Eu2O3': 351.93, 'Cs2O': 281.81,
            'Cl': 35.45, 'Ag2O': 231.74, 'UO2': 270.03, 'ThO2': 264.04
        };

        let totalMoles = 0;
        const moles = {};
        for (const [oxide, wt] of Object.entries(inputComp)) {
            if (wt > 0) {
                const mass = MOLAR_MASS[oxide] || 100;
                const mol = wt / mass;
                moles[oxide] = mol;
                totalMoles += mol;
            }
        }

        if (totalMoles > 0) {
            for (const [oxide, mol] of Object.entries(moles)) {
                comp[oxide] = (mol / totalMoles) * 100;
            }
        }
    } else {
        // --- Mol % Input (Just Normalize) ---
        let totalVal = 0;
        for (const val of Object.values(inputComp)) totalVal += val;

        if (totalVal > 0) {
            for (const [oxide, val] of Object.entries(inputComp)) {
                comp[oxide] = (val / totalVal) * 100;
            }
        }
    }

    // 3. Add Interaction Terms (using Mol %)
    comp['Constant'] = 1;
    comp['B2O3^2'] = Math.pow(comp['B2O3'] || 0, 2);
    comp['B2O3*Na2O'] = (comp['B2O3'] || 0) * (comp['Na2O'] || 0);
    comp['B2O3*K2O'] = (comp['B2O3'] || 0) * (comp['K2O'] || 0);
    comp['B2O3*Li2O'] = (comp['B2O3'] || 0) * (comp['Li2O'] || 0);
    comp['Al2O3*Na2O'] = (comp['Al2O3'] || 0) * (comp['Na2O'] || 0);
    comp['Al2O3*MgO'] = (comp['Al2O3'] || 0) * (comp['MgO'] || 0);
    comp['Al2O3*CaO'] = (comp['Al2O3'] || 0) * (comp['CaO'] || 0);
    comp['Al2O3*Li2O'] = (comp['Al2O3'] || 0) * (comp['Li2O'] || 0);
    // ... Add more interactions if crucial, but the model has 40+ terms
    // It's safer to just let the iteration handle known keys if present.
    // However, basic interactions are needed. Let's add ones we see in model.js.

    // We can dynamically check model keys, but better to pre-calc known ones.
    // Let's implement a 'calculateTerm' helper

    // 4. Calculate Iso-Temperatures (from model)
    const t15 = predictTemp('1.5', comp);
    const t66 = predictTemp('6.6', comp);
    const t12 = predictTemp('12', comp);

    dom.resT15.textContent = t15.toFixed(1) + " °C";
    dom.resT66.textContent = t66.toFixed(1) + " °C";

    // 5. Solve VFT
    const vft = solveVFT(t15, 1.5, t66, 6.6, t12, 12);
    currentVFT = vft; // Store globally

    if (vft) {
        dom.vftParams.textContent = `A: ${vft.A.toFixed(3)}, B: ${vft.B.toFixed(1)}, T₀: ${vft.T0.toFixed(1)}`;

        // 6. Calculate Tg and Tstrain from VFT
        const logTg = 11.3;
        const logTstrain = 14.5;
        if (Math.abs(logTg - vft.A) > 0.001) {
            const tg = vft.T0 + vft.B / (logTg - vft.A);
            dom.resTg.textContent = tg.toFixed(1) + " °C";
        } else {
            dom.resTg.textContent = "---";
        }
        if (Math.abs(logTstrain - vft.A) > 0.001) {
            const tstrain = vft.T0 + vft.B / (logTstrain - vft.A);
            dom.resTstrain.textContent = tstrain.toFixed(1) + " °C";
        } else {
            dom.resTstrain.textContent = "---";
        }

        updateChart(vft);
    } else {
        dom.vftParams.textContent = "A: -, B: -, T₀: -";
        dom.resTg.textContent = "---";
        dom.resTstrain.textContent = "---";
        if (chartInstance) chartInstance.data.datasets[0].data = [];
        if (chartInstance) chartInstance.update();
    }
}

function predictTemp(scale, comp) {
    const model = VISCOSITY_MODEL[scale];
    if (!model) return 0;

    let temp = 0;
    for (const [term, coeff] of Object.entries(model)) {
        let val = 0;
        // Parse term 'Constant', 'Na2O', 'Na2O*CaO', 'B2O3^2', 'K2O^3', 'Al2O3*Na2O*CaO'
        if (term === 'Constant') val = 1;
        else if (term.includes('*')) {
            const parts = term.split('*');
            val = 1;
            parts.forEach(p => val *= (comp[p] || 0));
        } else if (term.includes('^')) {
            const [oxide, power] = term.split('^');
            val = Math.pow((comp[oxide] || 0), parseInt(power));
        } else {
            val = comp[term] || 0;
        }
        temp += val * coeff;
    }
    return temp;
}

function solveVFT(T1, L1, T2, L2, T3, L3) {
    // Fulcher Equation: log(n) = A + B / (T - T0)
    // Rearrange to solve for T0 first? Or iterative.
    // Analytical solution exists for 3 points.

    // y1(T1-T0) = A(T1-T0) + B => y1*T1 - y1*T0 = A*T1 - A*T0 + B
    // Reference: https://www.glassproperties.com/viscosity/vft.htm

    const y1 = L1, y2 = L2, y3 = L3;
    const x1 = T1, x2 = T2, x3 = T3;

    // Avoid division by zero
    if (Math.abs(y1 - y2) < 1e-5 || Math.abs(y2 - y3) < 1e-5) return null;

    // T0 = ( (x3-x2)/(y2-y3) - (x2-x1)/(y1-y2) ) ... Formula is complex.
    // Let's use simple substitution logic.
    // A + B/(x1-T0) = y1
    // A + B/(x2-T0) = y2
    // A + B/(x3-T0) = y3

    // Solve for T0:
    // (y1 - y2) = B [ 1/(x1-T0) - 1/(x2-T0) ] = B * (x2 - x1) / [ (x1-T0)(x2-T0) ]
    // (y2 - y3) = B * (x3 - x2) / [ (x2-T0)(x3-T0) ]

    // Ratio R = (y1-y2)/(y2-y3) = [ (x2-x1) / (x3-x2) ] * [ (x3-T0) / (x1-T0) ]
    // Let K = R * (x3-x2) / (x2-x1)
    // K = (x3-T0) / (x1-T0)
    // K(x1-T0) = x3 - T0
    // K*x1 - K*T0 = x3 - T0
    // T0 - K*T0 = x3 - K*x1
    // T0(1-K) = x3 - K*x1
    // T0 = (x3 - K*x1) / (1 - K)

    const R = (y1 - y2) / (y2 - y3);
    const K = R * (x3 - x2) / (x2 - x1);

    const T0 = (x3 - K * x1) / (1 - K);

    // Back sub for B
    // y1 - y2 = B * (x2 - x1) / [(x1-T0)(x2-T0)]
    // B = (y1 - y2) * (x1 - T0) * (x2 - T0) / (x2 - x1)

    const B = (y1 - y2) * (x1 - T0) * (x2 - T0) / (x2 - x1);

    // Back sub for A
    // A = y1 - B / (x1 - T0)

    const A = y1 - B / (x1 - T0);

    return { A, B, T0 };
}

function updateChart(vft) {
    const ctx = dom.viscosityChart.getContext('2d');

    // Generate data for current curve
    const currentData = [];
    for (let t = 800; t <= 1700; t += 10) {
        if (t > vft.T0) {
            const logVisc = vft.A + vft.B / (t - vft.T0);
            if (logVisc > -2 && logVisc < 15) {
                currentData.push({ x: t, y: logVisc });
            }
        }
    }

    // Build datasets array: current + history
    const datasets = [{
        label: 'Current',
        data: currentData,
        borderColor: '#ff9f43',
        backgroundColor: 'rgba(255, 159, 67, 0.15)',
        borderWidth: 3,
        pointRadius: 0,
        fill: false
    }];

    // Overlay history viscosity curves
    const viscHistory = historyData.filter(r => r.type === 'viscosity' && r.vft);
    viscHistory.forEach((record, idx) => {
        const hVft = record.vft;
        const hData = [];
        for (let t = 800; t <= 1700; t += 10) {
            if (t > hVft.T0) {
                const logVisc = hVft.A + hVft.B / (t - hVft.T0);
                if (logVisc > -2 && logVisc < 15) {
                    hData.push({ x: t, y: logVisc });
                }
            }
        }
        const color = CHART_COLORS[idx % CHART_COLORS.length];
        // Short label from description
        const shortDesc = record.desc.length > 25 ? record.desc.substring(0, 25) + '...' : record.desc;
        datasets.push({
            label: `#${idx + 1} ${shortDesc}`,
            data: hData,
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
            borderDash: [5, 3],
            fill: false
        });
    });

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Temperature (°C)', color: '#fff' },
                    ticks: { color: '#aaa' }
                },
                y: {
                    title: { display: true, text: 'log(Viscosity, Pa·s)', color: '#fff' },
                    ticks: { color: '#aaa' },
                    reverse: false
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#fff', font: { size: 11 } },
                    display: true
                },
                tooltip: {
                    mode: 'nearest',
                    intersect: false
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

init();
