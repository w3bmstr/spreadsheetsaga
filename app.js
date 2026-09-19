(() => {
  const DEFAULT_ROWS = 60;
  const DEFAULT_COLS = 26;
  const STORAGE_KEY = "spreadsheet-saga-state-v1";

  const state = {
    sheets: [],
    activeSheetId: null,
    selection: { startRow: 0, startCol: 0, endRow: 0, endCol: 0 },
    activeCell: { row: 0, col: 0 },
    isSelecting: false,
    fillDrag: null,
    history: [],
    future: [],
    chart: null,
    find: { query: "", matches: [], index: 0 },
    zoom: 100,
    clipboardSource: null,
    clipboardText: "",
    activeRibbonTab: "home",
    commandPaletteIndex: 0,
    touchLongPressTimer: null,
    touchStartTs: 0,
    touchLongPressTriggered: false,
    touchWasTwoFinger: false,
    autoSaveTimer: null,
    lastSavedAt: null,
    dirty: false
  };

  const ui = {
    table: document.getElementById("sheetTable"),
    gridWrap: document.getElementById("gridWrap"),
    fillHandle: document.getElementById("fillHandle"),
    sheetTabs: document.getElementById("sheetTabs"),
    nameBox: document.getElementById("nameBox"),
    formulaInput: document.getElementById("formulaInput"),
    formulaSuggestions: document.getElementById("formulaSuggestions"),
    formulaHighlight: document.getElementById("formulaHighlight"),
    contextMenu: document.getElementById("contextMenu"),
    chartModal: document.getElementById("chartModal"),
    chartTypeSelect: document.getElementById("chartTypeSelect"),
    chartCanvas: document.getElementById("chartCanvas"),
    csvInput: document.getElementById("csvInput"),
    commandPaletteBtn: document.getElementById("commandPaletteBtn"),
    findBar: document.getElementById("findBar"),
    findInput: document.getElementById("findInput"),
    replaceInput: document.getElementById("replaceInput"),
    findCount: document.getElementById("findCount"),
    findPrevBtn: document.getElementById("findPrevBtn"),
    findNextBtn: document.getElementById("findNextBtn"),
    replaceBtn: document.getElementById("replaceBtn"),
    replaceAllBtn: document.getElementById("replaceAllBtn"),
    closeFindBtn: document.getElementById("closeFindBtn"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomValue: document.getElementById("zoomValue"),
    saveSessionBtn: document.getElementById("saveSessionBtn"),
    loadSavedBtn: document.getElementById("loadSavedBtn"),
    resetDataBtn: document.getElementById("resetDataBtn"),
    workbookStatus: document.getElementById("workbookStatus"),
    sheetStatus: document.getElementById("sheetStatus"),
    toolbarOverflowBtn: document.getElementById("toolbarOverflowBtn"),
    toolbarOverflowPanel: document.getElementById("toolbarOverflowPanel"),
    sheetMenuBtn: document.getElementById("sheetMenuBtn"),
    sheetMenuPanel: document.getElementById("sheetMenuPanel"),
    ribbonTabButtons: Array.from(document.querySelectorAll("[data-ribbon-tab]")),
    selfFixScopeSelect: document.getElementById("selfFixScopeSelect"),
    selfFixPreviewCheckbox: document.getElementById("selfFixPreviewCheckbox"),
    selfFixReportModal: document.getElementById("selfFixReportModal"),
    closeSelfFixReportModal: document.getElementById("closeSelfFixReportModal"),
    selfFixSummary: document.getElementById("selfFixSummary"),
    selfFixScopeValue: document.getElementById("selfFixScopeValue"),
    selfFixModeValue: document.getElementById("selfFixModeValue"),
    selfFixScannedValue: document.getElementById("selfFixScannedValue"),
    selfFixChangedCellsValue: document.getElementById("selfFixChangedCellsValue"),
    selfFixFormulaValue: document.getElementById("selfFixFormulaValue"),
    selfFixValueValue: document.getElementById("selfFixValueValue"),
    selfFixValidationValue: document.getElementById("selfFixValidationValue"),
    selfFixConsistencyValue: document.getElementById("selfFixConsistencyValue"),
    selfFixPatternValue: document.getElementById("selfFixPatternValue"),
    selfFixUnresolvedFormulaValue: document.getElementById("selfFixUnresolvedFormulaValue"),
    selfFixUnresolvedValidationValue: document.getElementById("selfFixUnresolvedValidationValue"),
    selfFixChangedList: document.getElementById("selfFixChangedList"),
    commandPaletteModal: document.getElementById("commandPaletteModal"),
    commandPaletteInput: document.getElementById("commandPaletteInput"),
    commandPaletteList: document.getElementById("commandPaletteList"),
    closeCommandPaletteBtn: document.getElementById("closeCommandPaletteBtn"),
    mobileFabDock: document.getElementById("mobileFabDock"),
    mobileFabMain: document.getElementById("mobileFabMain"),
    mobileFabMenu: document.getElementById("mobileFabMenu"),
    liveRegion: document.getElementById("liveRegion"),
    selectionStatus: document.getElementById("selectionStatus"),
    calculationStatus: document.getElementById("calculationStatus"),
    saveStatus: document.getElementById("saveStatus")
  };

  const COMMANDS = {
    "command-palette": {
      label: "Command Palette",
      shortcut: "Ctrl+K",
      run: () => openCommandPalette()
    },
    find: {
      label: "Find in Sheet",
      shortcut: "Ctrl+F",
      run: () => openFindBar()
    },
    "zoom-in": {
      label: "Zoom In",
      run: () => setZoom(state.zoom + 10)
    },
    "zoom-out": {
      label: "Zoom Out",
      run: () => setZoom(state.zoom - 10)
    },
    "zoom-reset": {
      label: "Reset Zoom",
      shortcut: "100%",
      run: () => setZoom(100 - state.zoom)
    },
    "tab-home": {
      label: "Ribbon Tab: Home",
      shortcut: "Alt+1",
      run: () => setRibbonTab("home")
    },
    "tab-data": {
      label: "Ribbon Tab: Data",
      shortcut: "Alt+2",
      run: () => setRibbonTab("data")
    },
    "tab-view": {
      label: "Ribbon Tab: View",
      shortcut: "Alt+3",
      run: () => setRibbonTab("view")
    },
    "tab-tools": {
      label: "Ribbon Tab: Tools",
      shortcut: "Alt+4",
      run: () => setRibbonTab("tools")
    },
    undo: {
      label: "Undo",
      shortcut: "Ctrl+Z",
      canExecute: () => state.history.length > 0,
      run: () => undo()
    },
    redo: {
      label: "Redo",
      shortcut: "Ctrl+Y",
      canExecute: () => state.future.length > 0,
      run: () => redo()
    },
    "import-csv": {
      label: "Import CSV",
      run: () => ui.csvInput.click()
    },
    "export-csv": {
      label: "Export CSV",
      run: () => exportCsv()
    },
    "save-session": {
      label: "Save Session",
      shortcut: "Ctrl+S",
      run: () => saveSession()
    },
    "load-saved": {
      label: "Load Saved Session",
      run: () => loadSavedData()
    },
    "reset-data": {
      label: "Reset Saved Data",
      run: () => resetSavedData()
    },
    "add-sheet": {
      label: "Add Sheet",
      run: () => {
        pushHistory();
        const next = makeSheet(`Sheet ${state.sheets.length + 1}`);
        state.sheets.push(next);
        state.activeSheetId = next.id;
        renderAll();
      }
    },
    "add-row": {
      label: "Add Row",
      run: () => insertRow(state.activeCell.row + 1)
    },
    "delete-row": {
      label: "Delete Row",
      run: () => deleteRow(state.activeCell.row)
    },
    "move-row-up": {
      label: "Move Row Up",
      run: () => moveRow(-1)
    },
    "move-row-down": {
      label: "Move Row Down",
      run: () => moveRow(1)
    },
    "add-col": {
      label: "Add Column",
      run: () => insertCol(state.activeCell.col + 1)
    },
    "delete-col": {
      label: "Delete Column",
      run: () => deleteCol(state.activeCell.col)
    },
    "move-col-left": {
      label: "Move Column Left",
      run: () => moveCol(-1)
    },
    "move-col-right": {
      label: "Move Column Right",
      run: () => moveCol(1)
    },
    "sort-asc": {
      label: "Sort A-Z",
      run: () => sortByColumn(false)
    },
    "sort-desc": {
      label: "Sort Z-A",
      run: () => sortByColumn(true)
    },
    filter: {
      label: "Filter",
      run: () => setFilter()
    },
    "clear-filter": {
      label: "Clear Filter",
      run: () => clearFilter()
    },
    chart: {
      label: "Create Chart",
      run: () => {
        ui.chartModal.hidden = false;
        renderChart();
      }
    },
    "self-fix": {
      label: "Run Self Fix",
      run: () => selfFixActiveSheet()
    },
    "insert-row": {
      label: "Insert Row",
      run: () => insertRow(state.activeCell.row + 1)
    },
    "insert-col": {
      label: "Insert Col",
      run: () => insertCol(state.activeCell.col + 1)
    },
    "clear-cell": {
      label: "Clear Cell",
      run: () => {
        pushHistory();
        selectedCells((cell) => {
          cell.raw = "";
          cell.computed = "";
          cell.invalid = false;
        });
        renderAll();
      }
    },
    paste: {
      label: "Paste",
      run: () => navigator.clipboard.readText().then((text) => {
        pasteTSV(text);
      }).catch(() => {})
    }
  };

  function announce(message) {
    if (!ui.liveRegion) {
      return;
    }
    ui.liveRegion.textContent = "";
    setTimeout(() => {
      ui.liveRegion.textContent = String(message || "");
    }, 10);
  }

  function executeCommand(commandId, options = {}) {
    const command = COMMANDS[commandId];
    if (!command) {
      return false;
    }
    if (typeof command.canExecute === "function" && !command.canExecute(options)) {
      return false;
    }
    const result = command.run(options);
    if (!options.silent) {
      announce(command.label);
    }
    return result;
  }

  function makeCell() {
    return {
      raw: "",
      computed: "",
      style: {
        bold: false,
        italic: false,
        underline: false,
        fontSize: 14,
        align: "left",
        background: "#ffffff",
        borderColor: "#cbd5e1"
      },
      numberFormat: "general",
      validation: { type: "none", list: [] },
      invalid: false,
      refs: []
    };
  }

  function makeSheet(name, rows = DEFAULT_ROWS, cols = DEFAULT_COLS) {
    const data = Array.from({ length: rows }, () => Array.from({ length: cols }, () => makeCell()));
    return {
      id: crypto.randomUUID(),
      name,
      rows,
      cols,
      data,
      rowHeights: Array.from({ length: rows }, () => 30),
      colWidths: Array.from({ length: cols }, () => 112),
      hiddenRows: [],
      filter: null,
      freezeRows: 0,
      freezeCols: 0
    };
  }

  function activeSheet() {
    return state.sheets.find((s) => s.id === state.activeSheetId);
  }

  function colToName(col) {
    let n = col + 1;
    let name = "";
    while (n > 0) {
      const rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }

  function nameToCol(name) {
    let col = 0;
    const letters = name.toUpperCase();
    for (let i = 0; i < letters.length; i += 1) {
      col = col * 26 + (letters.charCodeAt(i) - 64);
    }
    return col - 1;
  }

  function toAddress(row, col) {
    return `${colToName(col)}${row + 1}`;
  }

  function fromAddress(address) {
    const match = /^([A-Z]+)(\d+)$/i.exec(address.trim());
    if (!match) {
      return null;
    }
    return { row: Number(match[2]) - 1, col: nameToCol(match[1]) };
  }

  function inRange(r, c, range) {
    const minR = Math.min(range.startRow, range.endRow);
    const maxR = Math.max(range.startRow, range.endRow);
    const minC = Math.min(range.startCol, range.endCol);
    const maxC = Math.max(range.startCol, range.endCol);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  }

  function rangeBounds() {
    const { selection } = state;
    return {
      minR: Math.min(selection.startRow, selection.endRow),
      maxR: Math.max(selection.startRow, selection.endRow),
      minC: Math.min(selection.startCol, selection.endCol),
      maxC: Math.max(selection.startCol, selection.endCol)
    };
  }

  function deepCloneData(sheets) {
    return sheets.map((sheet) => ({
      ...sheet,
      data: sheet.data.map((row) => row.map((cell) => ({
        ...cell,
        style: { ...cell.style },
        validation: { ...cell.validation, list: [...cell.validation.list] },
        refs: [...cell.refs]
      }))),
      rowHeights: [...sheet.rowHeights],
      colWidths: [...sheet.colWidths],
      hiddenRows: [...sheet.hiddenRows],
      filter: sheet.filter ? { ...sheet.filter } : null
    }));
  }

  function pushHistory() {
    state.history.push(JSON.stringify({
      sheets: deepCloneData(state.sheets),
      activeSheetId: state.activeSheetId,
      selection: { ...state.selection },
      activeCell: { ...state.activeCell }
    }));
    if (state.history.length > 120) {
      state.history.shift();
    }
    state.future = [];
    scheduleAutoSave();
  }

  function restoreSnapshot(serialized) {
    const snap = JSON.parse(serialized);
    state.sheets = snap.sheets;
    state.activeSheetId = snap.activeSheetId;
    state.selection = snap.selection;
    state.activeCell = snap.activeCell;
    recalcSheet(activeSheet());
    renderAll();
  }

  function undo() {
    if (!state.history.length) {
      return;
    }
    state.future.push(JSON.stringify({
      sheets: deepCloneData(state.sheets),
      activeSheetId: state.activeSheetId,
      selection: { ...state.selection },
      activeCell: { ...state.activeCell }
    }));
    restoreSnapshot(state.history.pop());
  }

  function redo() {
    if (!state.future.length) {
      return;
    }
    state.history.push(JSON.stringify({
      sheets: deepCloneData(state.sheets),
      activeSheetId: state.activeSheetId,
      selection: { ...state.selection },
      activeCell: { ...state.activeCell }
    }));
    restoreSnapshot(state.future.pop());
  }

  function normalizeValue(v) {
    if (typeof v === "number") {
      return Number.isFinite(v) ? v : 0;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function flatten(arr) {
    const out = [];
    arr.forEach((v) => {
      if (Array.isArray(v)) {
        out.push(...flatten(v));
      } else {
        out.push(v);
      }
    });
    return out;
  }

  function toMatrix(rangeVals) {
    if (!Array.isArray(rangeVals)) {
      return [[rangeVals]];
    }
    if (!Array.isArray(rangeVals[0])) {
      return [rangeVals];
    }
    return rangeVals;
  }

  function formulaHelpers(sheet, evalCell) {
    const helpers = {
      CELL: (address) => {
        const p = fromAddress(address);
        if (!p || p.row < 0 || p.col < 0 || p.row >= sheet.rows || p.col >= sheet.cols) {
          return 0;
        }
        const val = evalCell(p.row, p.col);
        const num = Number(val);
        return Number.isFinite(num) ? num : val || 0;
      },
      RANGE: (startAddress, endAddress) => {
        const s = fromAddress(startAddress);
        const e = fromAddress(endAddress);
        if (!s || !e) {
          return [];
        }
        const minR = Math.max(0, Math.min(s.row, e.row));
        const maxR = Math.min(sheet.rows - 1, Math.max(s.row, e.row));
        const minC = Math.max(0, Math.min(s.col, e.col));
        const maxC = Math.min(sheet.cols - 1, Math.max(s.col, e.col));
        const matrix = [];
        for (let r = minR; r <= maxR; r += 1) {
          const row = [];
          for (let c = minC; c <= maxC; c += 1) {
            row.push(evalCell(r, c));
          }
          matrix.push(row);
        }
        return matrix;
      },
      SUM: (...args) => flatten(args).reduce((acc, v) => acc + normalizeValue(v), 0),
      AVERAGE: (...args) => {
        const vals = flatten(args).map((v) => normalizeValue(v));
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      },
      COUNT: (...args) => flatten(args).filter((v) => Number.isFinite(Number(v))).length,
      COUNTA: (...args) => flatten(args).filter((v) => String(v ?? "").trim() !== "").length,
      IF: (cond, a, b) => (cond ? a : b),
      IFERROR: (value, fallback) => {
        if (value === null || value === undefined) return fallback;
        const s = String(value);
        if (s.startsWith("#")) return fallback;
        return value;
      },
      MIN: (...args) => {
        const vals = flatten(args).map((v) => normalizeValue(v));
        return vals.length ? Math.min(...vals) : 0;
      },
      MAX: (...args) => {
        const vals = flatten(args).map((v) => normalizeValue(v));
        return vals.length ? Math.max(...vals) : 0;
      },
      ROUND: (value, digits = 0) => {
        const factor = 10 ** Number(digits || 0);
        return Math.round(normalizeValue(value) * factor) / factor;
      },
      ABS: (value) => Math.abs(normalizeValue(value)),
      POWER: (base, exp) => Math.pow(normalizeValue(base), normalizeValue(exp)),
      SQRT: (value) => {
        const n = normalizeValue(value);
        return n < 0 ? "#NUM!" : Math.sqrt(n);
      },
      MOD: (num, divisor) => {
        const d = normalizeValue(divisor);
        if (d === 0) return "#DIV/0!";
        return normalizeValue(num) % d;
      },
      SUMIF: (range, criterion, sumRange = range) => {
        const criteria = String(criterion);
        const values = flatten(range);
        const sums = flatten(sumRange);
        return values.reduce((total, value, index) => {
          return String(value) === criteria ? total + normalizeValue(sums[index]) : total;
        }, 0);
      },
      COUNTIF: (range, criterion) => flatten(range)
        .filter((value) => String(value) === String(criterion)).length,
      AND: (...args) => flatten(args).every(Boolean),
      OR: (...args) => flatten(args).some(Boolean),
      NOT: (v) => !v,
      TRUE: () => true,
      FALSE: () => false,
      CONCAT: (...args) => flatten(args).join(""),
      CONCATENATE: (...args) => flatten(args).join(""),
      LEFT: (text, num = 1) => String(text ?? "").slice(0, Math.max(0, Number(num) || 0)),
      RIGHT: (text, num = 1) => String(text ?? "").slice(-Math.max(0, Number(num) || 0)),
      MID: (text, start, num) => {
        const s = Math.max(1, Number(start) || 1) - 1;
        return String(text ?? "").substr(s, Math.max(0, Number(num) || 0));
      },
      LEN: (text) => String(text ?? "").length,
      TRIM: (text) => String(text ?? "").replace(/\s+/g, " ").trim(),
      UPPER: (text) => String(text ?? "").toUpperCase(),
      LOWER: (text) => String(text ?? "").toLowerCase(),
      PROPER: (text) => String(text ?? "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      SUBSTITUTE: (text, oldText, newText, instance) => {
        const t = String(text ?? "");
        const o = String(oldText ?? "");
        const n = String(newText ?? "");
        if (!o) return t;
        if (instance == null || instance === "") {
          return t.split(o).join(n);
        }
        let count = 0;
        const idx = Number(instance);
        return t.replace(new RegExp(o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), (m) => {
          count += 1;
          return count === idx ? n : m;
        });
      },
      FIND: (findText, withinText, start = 1) => {
        const pos = String(withinText ?? "").indexOf(String(findText ?? ""), Math.max(0, Number(start) - 1));
        return pos >= 0 ? pos + 1 : "#VALUE!";
      },
      SEARCH: (findText, withinText, start = 1) => {
        const pos = String(withinText ?? "").toLowerCase().indexOf(String(findText ?? "").toLowerCase(), Math.max(0, Number(start) - 1));
        return pos >= 0 ? pos + 1 : "#VALUE!";
      },
      VALUE: (text) => {
        const n = Number(String(text ?? "").replace(/,/g, ""));
        return Number.isFinite(n) ? n : "#VALUE!";
      },
      TEXT: (value, format) => {
        const n = Number(value);
        if (!Number.isFinite(n)) return String(value ?? "");
        const f = String(format || "0").toUpperCase();
        if (f.includes("%")) return `${(n * 100).toFixed(2)}%`;
        if (f.includes("$") || f.includes("USD")) {
          return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
        }
        const decimals = (f.match(/0/g) || []).length > 1 ? (f.split(".")[1] || "").length : 0;
        return n.toFixed(decimals);
      },
      ISNUMBER: (v) => Number.isFinite(Number(v)),
      ISTEXT: (v) => typeof v === "string" && !Number.isFinite(Number(v)),
      ISBLANK: (v) => v === "" || v == null,
      N: (v) => Number.isFinite(Number(v)) ? Number(v) : 0,
      T: (v) => typeof v === "string" ? v : "",
      TODAY: () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      },
      NOW: () => new Date().toISOString().slice(0, 19).replace("T", " "),
      YEAR: (dateVal) => {
        const d = new Date(dateVal);
        return Number.isNaN(d.getTime()) ? "#VALUE!" : d.getFullYear();
      },
      MONTH: (dateVal) => {
        const d = new Date(dateVal);
        return Number.isNaN(d.getTime()) ? "#VALUE!" : d.getMonth() + 1;
      },
      DAY: (dateVal) => {
        const d = new Date(dateVal);
        return Number.isNaN(d.getTime()) ? "#VALUE!" : d.getDate();
      },
      DATE: (y, m, d) => {
        const dt = new Date(Number(y), Number(m) - 1, Number(d));
        return Number.isNaN(dt.getTime()) ? "#VALUE!" : `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      },
      INDEX: (range, rowNum, colNum = 1) => {
        const matrix = toMatrix(range);
        const r = Number(rowNum) - 1;
        const c = Number(colNum) - 1;
        return matrix?.[r]?.[c] ?? "";
      },
      MATCH: (lookup, arr) => {
        const list = flatten(arr);
        const idx = list.findIndex((v) => String(v) === String(lookup));
        return idx >= 0 ? idx + 1 : -1;
      },
      VLOOKUP: (lookup, range, colIndex) => {
        const matrix = toMatrix(range);
        for (let i = 0; i < matrix.length; i += 1) {
          if (String(matrix[i][0]) === String(lookup)) {
            return matrix[i][Number(colIndex) - 1] ?? "";
          }
        }
        return "#N/A";
      },
      HLOOKUP: (lookup, range, rowIndex) => {
        const matrix = toMatrix(range);
        const firstRow = matrix[0] || [];
        const col = firstRow.findIndex((v) => String(v) === String(lookup));
        if (col < 0) {
          return "#N/A";
        }
        return matrix[Number(rowIndex) - 1]?.[col] ?? "#N/A";
      }
    };
    return helpers;
  }

  function tokenizeRefs(rawFormula) {
    const refs = new Set();
    const rangeRe = /([A-Z]+\d+):([A-Z]+\d+)/gi;
    let match;
    while ((match = rangeRe.exec(rawFormula.toUpperCase()))) {
      const s = fromAddress(match[1]);
      const e = fromAddress(match[2]);
      if (s && e) {
        const minR = Math.min(s.row, e.row);
        const maxR = Math.max(s.row, e.row);
        const minC = Math.min(s.col, e.col);
        const maxC = Math.max(s.col, e.col);
        for (let r = minR; r <= maxR; r += 1) {
          for (let c = minC; c <= maxC; c += 1) {
            refs.add(toAddress(r, c));
          }
        }
      }
    }
    const cellRe = /\b([A-Z]+\d+)\b/gi;
    while ((match = cellRe.exec(rawFormula.toUpperCase()))) {
      refs.add(match[1]);
    }
    return [...refs];
  }

  function evaluateFormula(raw, sheet, cellEval) {
    let expr = raw.slice(1).trim();
    expr = expr.toUpperCase();

    expr = expr.replace(/([A-Z]+\d+):([A-Z]+\d+)/g, "RANGE('$1','$2')");
    expr = expr.replace(/(?<!['"])(\b[A-Z]+\d+\b)(?!['"])/g, "CELL('$1')");

    const fnNames = ["CELL", "RANGE", "SUM", "AVERAGE", "COUNT", "COUNTA", "IF", "IFERROR", "VLOOKUP", "HLOOKUP", "INDEX", "MATCH", "CONCAT", "CONCATENATE", "MIN", "MAX", "ROUND", "ABS", "POWER", "SQRT", "MOD", "SUMIF", "COUNTIF", "AND", "OR", "NOT", "TRUE", "FALSE", "LEFT", "RIGHT", "MID", "LEN", "TRIM", "UPPER", "LOWER", "PROPER", "SUBSTITUTE", "FIND", "SEARCH", "VALUE", "TEXT", "ISNUMBER", "ISTEXT", "ISBLANK", "N", "T", "TODAY", "NOW", "YEAR", "MONTH", "DAY", "DATE"];
    fnNames.forEach((fn) => {
      const re = new RegExp(`\\b${fn}\\(`, "g");
      expr = expr.replace(re, `helpers.${fn}(`);
    });

    const helpers = formulaHelpers(sheet, cellEval);
    try {
      const result = Function("helpers", `return (${expr});`)(helpers);
      return result ?? "";
    } catch {
      return "#ERR";
    }
  }

  function recalcSheet(sheet) {
    const visiting = new Set();

    function evalCell(row, col) {
      const key = toAddress(row, col);
      const cell = sheet.data[row][col];
      if (!cell.raw.startsWith("=")) {
        cell.computed = cell.raw;
        cell.refs = [];
        return cell.computed;
      }
      if (visiting.has(key)) {
        cell.computed = "#CYCLE";
        return cell.computed;
      }
      visiting.add(key);
      cell.refs = tokenizeRefs(cell.raw);
      cell.computed = evaluateFormula(cell.raw, sheet, evalCell);
      visiting.delete(key);
      return cell.computed;
    }

    for (let r = 0; r < sheet.rows; r += 1) {
      for (let c = 0; c < sheet.cols; c += 1) {
        evalCell(r, c);
      }
    }
  }

  function formatDisplayValue(cell) {
    const value = cell.computed;
    if (cell.numberFormat === "general") {
      return value;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return value;
    }
    if (cell.numberFormat === "currency") {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
    }
    if (cell.numberFormat === "percent") {
      return `${(n * 100).toFixed(2)}%`;
    }
    if (cell.numberFormat.startsWith("decimal-")) {
      const d = Number(cell.numberFormat.split("-")[1]);
      return n.toFixed(Number.isFinite(d) ? d : 2);
    }
    return value;
  }

  function applyCellStyle(td, cell) {
    td.style.fontWeight = cell.style.bold ? "700" : "400";
    td.style.fontStyle = cell.style.italic ? "italic" : "normal";
    td.style.textDecoration = cell.style.underline ? "underline" : "none";
    td.style.fontSize = `${cell.style.fontSize}px`;
    td.style.textAlign = cell.style.align;
    td.style.background = cell.style.background;
    td.style.borderColor = cell.style.borderColor;
  }

  function stickyLeftForCol(sheet, col) {
    let left = 44;
    for (let i = 0; i < col; i += 1) {
      left += sheet.colWidths[i];
    }
    return left;
  }

  function stickyTopForRow(sheet, row) {
    let top = 30;
    for (let i = 0; i < row; i += 1) {
      top += sheet.rowHeights[i];
    }
    return top;
  }

  function renderGrid() {
    const sheet = activeSheet();
    if (!sheet) {
      return;
    }

    ui.table.innerHTML = "";
    ui.table.setAttribute("role", "grid");
    ui.table.setAttribute("aria-rowcount", String(sheet.rows));
    ui.table.setAttribute("aria-colcount", String(sheet.cols));

    const headRow = document.createElement("tr");
    headRow.setAttribute("role", "row");
    const corner = document.createElement("th");
    corner.className = "corner";
    corner.setAttribute("scope", "col");
    corner.textContent = "#";
    headRow.appendChild(corner);

    for (let c = 0; c < sheet.cols; c += 1) {
      const th = document.createElement("th");
      th.className = "col-header";
      th.setAttribute("role", "columnheader");
      th.setAttribute("scope", "col");
      th.dataset.col = c;
      th.style.width = `${sheet.colWidths[c]}px`;
      th.textContent = colToName(c);
      if (c < sheet.freezeCols) {
        th.style.position = "sticky";
        th.style.left = `${stickyLeftForCol(sheet, c)}px`;
        th.style.zIndex = "15";
      }
      headRow.appendChild(th);
    }
    ui.table.appendChild(headRow);

    for (let r = 0; r < sheet.rows; r += 1) {
      const tr = document.createElement("tr");
      tr.setAttribute("role", "row");
      if (sheet.hiddenRows.includes(r)) {
        tr.classList.add("hidden-row");
      }

      const rowHead = document.createElement("th");
      rowHead.className = "row-header";
      rowHead.setAttribute("role", "rowheader");
      rowHead.setAttribute("scope", "row");
      rowHead.dataset.row = r;
      rowHead.textContent = String(r + 1);
      rowHead.style.height = `${sheet.rowHeights[r]}px`;
      if (r < sheet.freezeRows) {
        rowHead.style.position = "sticky";
        rowHead.style.top = `${stickyTopForRow(sheet, r)}px`;
        rowHead.style.zIndex = "14";
      }
      tr.appendChild(rowHead);

      for (let c = 0; c < sheet.cols; c += 1) {
        const td = document.createElement("td");
        td.setAttribute("role", "gridcell");
        td.dataset.row = r;
        td.dataset.col = c;
        td.contentEditable = "true";
        td.spellcheck = false;
        td.style.width = `${sheet.colWidths[c]}px`;
        td.style.height = `${sheet.rowHeights[r]}px`;

        const cell = sheet.data[r][c];
        td.textContent = String(formatDisplayValue(cell) ?? "");
        applyCellStyle(td, cell);

        if (cell.invalid) {
          td.classList.add("invalid");
        }
        if (inRange(r, c, state.selection)) {
          td.classList.add("selected");
        }
        if (state.activeCell.row === r && state.activeCell.col === c) {
          td.classList.add("active");
        }
        if (state.find.matches.some((match) => match.sheetId === sheet.id && match.row === r && match.col === c)) {
          td.classList.add("find-match");
        }

        td.setAttribute("aria-selected", inRange(r, c, state.selection) ? "true" : "false");
        td.setAttribute("aria-invalid", cell.invalid ? "true" : "false");
        td.tabIndex = state.activeCell.row === r && state.activeCell.col === c ? 0 : -1;

        if (r < sheet.freezeRows) {
          td.style.position = "sticky";
          td.style.top = `${stickyTopForRow(sheet, r)}px`;
          td.style.zIndex = "8";
        }
        if (c < sheet.freezeCols) {
          td.style.position = "sticky";
          td.style.left = `${stickyLeftForCol(sheet, c)}px`;
          td.style.zIndex = "9";
        }
        if (r < sheet.freezeRows && c < sheet.freezeCols) {
          td.style.zIndex = "16";
        }

        tr.appendChild(td);
      }

      ui.table.appendChild(tr);
    }

    placeFillHandle();
  }

  function renderSheetTabs() {
    ui.sheetTabs.innerHTML = "";
    state.sheets.forEach((sheet, index) => {
      const tab = document.createElement("div");
      tab.className = `sheet-tab ${sheet.id === state.activeSheetId ? "active" : ""}`;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", sheet.id === state.activeSheetId ? "true" : "false");
      tab.tabIndex = sheet.id === state.activeSheetId ? 0 : -1;
      tab.dataset.sheetIndex = String(index);

      const label = document.createElement("span");
      label.textContent = sheet.name;
      label.addEventListener("dblclick", () => {
        const next = prompt("Rename sheet", sheet.name);
        if (next && next.trim()) {
          pushHistory();
          sheet.name = next.trim();
          renderSheetTabs();
        }
      });
      tab.appendChild(label);

      if (state.sheets.length > 1) {
        const close = document.createElement("button");
        close.type = "button";
        close.textContent = "x";
        close.setAttribute("aria-label", `Close ${sheet.name}`);
        close.addEventListener("click", (e) => {
          e.stopPropagation();
          pushHistory();
          state.sheets = state.sheets.filter((s) => s.id !== sheet.id);
          if (state.activeSheetId === sheet.id) {
            state.activeSheetId = state.sheets[0].id;
          }
          renderAll();
        });
        tab.appendChild(close);
      }

      tab.addEventListener("click", () => {
        setActiveSheet(sheet.id, { announceChange: true });
      });

      tab.addEventListener("keydown", (e) => {
        const currentIndex = Number(tab.dataset.sheetIndex);
        if (e.key === "ArrowRight") {
          e.preventDefault();
          const next = (currentIndex + 1) % state.sheets.length;
          setActiveSheet(state.sheets[next].id, { announceChange: true });
          ui.sheetTabs.querySelector(`[data-sheet-index='${next}']`)?.focus();
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          const prev = (currentIndex - 1 + state.sheets.length) % state.sheets.length;
          setActiveSheet(state.sheets[prev].id, { announceChange: true });
          ui.sheetTabs.querySelector(`[data-sheet-index='${prev}']`)?.focus();
        }
      });

      ui.sheetTabs.appendChild(tab);
    });

    renderSheetMenu();
  }

  function highlightFormula(raw) {
    const escaped = String(raw)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

    let html = escaped;
    html = html.replace(/\b(SUM|AVERAGE|COUNT|IF|VLOOKUP|HLOOKUP|INDEX|MATCH|CONCAT|MIN|MAX|ROUND|SUMIF|COUNTIF|AND|OR)\b/gi, "<span class=\"fx\">$1</span>");
    html = html.replace(/\b([A-Z]+\d+)(?::([A-Z]+\d+))?\b/g, "<span class=\"ref\">$&</span>");
    ui.formulaHighlight.innerHTML = html || " ";
  }

  function updateFormulaSuggestions(raw) {
    if (!ui.formulaSuggestions) {
      return;
    }
    const functions = ["SUM", "AVERAGE", "COUNT", "IF", "VLOOKUP", "HLOOKUP", "INDEX", "MATCH", "CONCAT", "MIN", "MAX", "ROUND", "SUMIF", "COUNTIF", "AND", "OR"];
    const query = String(raw || "").toUpperCase();
    const token = query.match(/(?:^|[=(,\s])([A-Z]*)$/)?.[1] || "";
    ui.formulaSuggestions.innerHTML = "";
    functions
      .filter((name) => !token || name.startsWith(token))
      .forEach((name) => {
        const option = document.createElement("option");
        option.value = `${name}(`;
        ui.formulaSuggestions.appendChild(option);
      });
  }

  function syncFormulaBar() {
    const cell = activeSheet().data[state.activeCell.row][state.activeCell.col];
    if ("value" in ui.nameBox) {
      ui.nameBox.value = toAddress(state.activeCell.row, state.activeCell.col);
    } else {
      ui.nameBox.textContent = toAddress(state.activeCell.row, state.activeCell.col);
    }
    ui.formulaInput.value = cell.raw;
    highlightFormula(cell.raw);
    updateWorkspaceStatus();
    updateToolbarState();
  }

  function updateWorkspaceStatus() {
    const sheet = activeSheet();
    if (!sheet) {
      return;
    }
    if (ui.workbookStatus) {
      ui.workbookStatus.textContent = "Local Session Ready";
    }
    if (ui.sheetStatus) {
      ui.sheetStatus.textContent = `${sheet.name} | ${toAddress(state.activeCell.row, state.activeCell.col)}`;
    }

    const { minR, maxR, minC, maxC } = rangeBounds();
    const selectedCount = (maxR - minR + 1) * (maxC - minC + 1);
    const addresses = minR === maxR && minC === maxC
      ? toAddress(minR, minC)
      : `${toAddress(minR, minC)}:${toAddress(maxR, maxC)}`;
    if (ui.selectionStatus) {
      ui.selectionStatus.textContent = `${addresses} | ${selectedCount} selected`;
    }

    let numericCount = 0;
    let numericSum = 0;
    selectedCells((cell) => {
      const number = Number(cell.computed);
      if (cell.computed !== "" && Number.isFinite(number)) {
        numericCount += 1;
        numericSum += number;
      }
    });
    if (ui.calculationStatus) {
      if (numericCount) {
        const avg = numericSum / numericCount;
        ui.calculationStatus.textContent = `Sum ${numericSum.toLocaleString(undefined, { maximumFractionDigits: 2 })} | Avg ${avg.toLocaleString(undefined, { maximumFractionDigits: 2 })} | ${numericCount} nums`;
      } else {
        ui.calculationStatus.textContent = "Ready";
      }
    }
  }

  function updateFindCount() {
    if (!ui.findCount) {
      return;
    }
    const total = state.find.matches.length;
    ui.findCount.textContent = total
      ? `${state.find.index + 1} of ${total}`
      : "0 matches";
  }

  function refreshFindMatches() {
    const query = String(ui.findInput?.value || "").trim().toLowerCase();
    state.find.query = query;
    state.find.matches = [];
    state.find.index = 0;

    if (query) {
      state.sheets.forEach((sheet) => {
        for (let row = 0; row < sheet.rows; row += 1) {
          for (let col = 0; col < sheet.cols; col += 1) {
            const cell = sheet.data[row][col];
            const text = `${cell.raw} ${cell.computed}`.toLowerCase();
            if (text.includes(query)) {
              state.find.matches.push({ sheetId: sheet.id, row, col });
            }
          }
        }
      });
    }

    updateFindCount();
    renderGrid();
  }

  function moveFindMatch(direction) {
    const total = state.find.matches.length;
    if (!total) {
      return;
    }
    state.find.index = (state.find.index + direction + total) % total;
    const match = state.find.matches[state.find.index];
    if (match.sheetId !== state.activeSheetId) {
      setActiveSheet(match.sheetId);
    }
    setSelection(match.row, match.col, match.row, match.col, { render: false });
    updateFindCount();
    ui.table.querySelector(`td[data-row='${match.row}'][data-col='${match.col}']`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function openFindBar() {
    if (!ui.findBar) {
      return;
    }
    ui.findBar.hidden = false;
    ui.findInput?.focus();
    ui.findInput?.select();
    refreshFindMatches();
  }

  function closeFindBar() {
    if (!ui.findBar) {
      return;
    }
    ui.findBar.hidden = true;
    state.find.query = "";
    state.find.matches = [];
    state.find.index = 0;
    renderGrid();
  }

  function setZoom(nextZoom) {
    state.zoom = Math.max(70, Math.min(150, Number(nextZoom) || 100));
    ui.gridWrap.style.zoom = `${state.zoom / 100}`;
    if (ui.zoomValue) {
      ui.zoomValue.textContent = `${state.zoom}%`;
    }
  }

  function replaceCurrentMatch() {
    const match = state.find.matches[state.find.index];
    if (!match) {
      return;
    }
    const sheet = state.sheets.find((item) => item.id === match.sheetId);
    if (!sheet) {
      return;
    }
    const query = state.find.query;
    const replacement = String(ui.replaceInput?.value || "");
    const cell = sheet.data[match.row][match.col];
    pushHistory();
    cell.raw = cell.raw.replace(new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), replacement);
    recalcSheet(sheet);
    setActiveSheet(sheet.id);
    refreshFindMatches();
  }

  function replaceAllMatches() {
    const query = state.find.query;
    if (!query) {
      return;
    }
    const replacement = String(ui.replaceInput?.value || "");
    const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    pushHistory();
    let changed = 0;
    state.sheets.forEach((sheet) => {
      sheet.data.forEach((row) => row.forEach((cell) => {
        const next = cell.raw.replace(pattern, replacement);
        if (next !== cell.raw) {
          cell.raw = next;
          changed += 1;
        }
      }));
      recalcSheet(sheet);
    });
    if (changed) {
      renderAll();
    }
    refreshFindMatches();
    announce(`${changed} cells replaced`);
  }

  function setRibbonTab(tabId, options = {}) {
    const { silent = false } = options;
    if (!tabId) {
      return;
    }
    state.activeRibbonTab = tabId;

    ui.ribbonTabButtons.forEach((button) => {
      const active = button.dataset.ribbonTab === tabId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.tabIndex = active ? 0 : -1;
    });

    document.querySelectorAll(".tool-group[data-ribbon]").forEach((group) => {
      const ribbons = String(group.dataset.ribbon || "home").split(/\s+/).filter(Boolean);
      const show = ribbons.includes(tabId) || ribbons.includes("all");
      group.classList.toggle("ribbon-hidden", !show);
    });

    if (!silent) {
      const label = tabId.charAt(0).toUpperCase() + tabId.slice(1);
      announce(`${label} tab`);
    }
  }

  function setActiveSheet(sheetId, options = {}) {
    const { announceChange = false } = options;
    const exists = state.sheets.some((sheet) => sheet.id === sheetId);
    if (!exists) {
      return;
    }
    state.activeSheetId = sheetId;
    state.selection = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
    state.activeCell = { row: 0, col: 0 };
    renderAll();
    if (announceChange) {
      const active = activeSheet();
      announce(`Switched to ${active.name}`);
    }
  }

  function hideTransientPanels() {
    if (ui.toolbarOverflowPanel && !ui.toolbarOverflowPanel.hidden) {
      ui.toolbarOverflowPanel.hidden = true;
      ui.toolbarOverflowBtn?.setAttribute("aria-expanded", "false");
    }
    if (ui.sheetMenuPanel && !ui.sheetMenuPanel.hidden) {
      ui.sheetMenuPanel.hidden = true;
      ui.sheetMenuBtn?.setAttribute("aria-expanded", "false");
    }
    if (ui.mobileFabMenu && !ui.mobileFabMenu.hidden) {
      ui.mobileFabMenu.hidden = true;
      ui.mobileFabMain?.setAttribute("aria-expanded", "false");
    }
  }

  function toggleToolbarOverflow(force) {
    if (!ui.toolbarOverflowPanel) {
      return;
    }
    const next = typeof force === "boolean" ? force : ui.toolbarOverflowPanel.hidden;
    if (next) {
      hideTransientPanels();
    }
    ui.toolbarOverflowPanel.hidden = !next;
    ui.toolbarOverflowBtn?.setAttribute("aria-expanded", String(next));
  }

  function renderSheetMenu() {
    if (!ui.sheetMenuPanel) {
      return;
    }
    ui.sheetMenuPanel.innerHTML = "";
    state.sheets.forEach((sheet) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn ghost small sheet-menu-item";
      button.setAttribute("role", "menuitem");
      button.textContent = sheet.name;
      button.addEventListener("click", () => {
        setActiveSheet(sheet.id, { announceChange: true });
        toggleSheetMenu(false);
      });
      ui.sheetMenuPanel.appendChild(button);
    });
  }

  function toggleSheetMenu(force) {
    if (!ui.sheetMenuPanel) {
      return;
    }
    const next = typeof force === "boolean" ? force : ui.sheetMenuPanel.hidden;
    if (next) {
      hideTransientPanels();
      renderSheetMenu();
    }
    ui.sheetMenuPanel.hidden = !next;
    ui.sheetMenuBtn?.setAttribute("aria-expanded", String(next));
  }

  function commandPaletteEntries(query = "") {
    const search = query.trim().toLowerCase();
    return Object.entries(COMMANDS)
      .filter(([id, cmd]) => {
        const text = `${id} ${cmd.label} ${cmd.shortcut || ""}`.toLowerCase();
        return !search || text.includes(search);
      })
      .map(([id, cmd]) => ({ id, ...cmd }));
  }

  function renderCommandPalette() {
    if (!ui.commandPaletteList) {
      return;
    }
    const items = commandPaletteEntries(ui.commandPaletteInput?.value || "");
    state.commandPaletteIndex = Math.max(0, Math.min(state.commandPaletteIndex, Math.max(items.length - 1, 0)));
    ui.commandPaletteList.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("li");
      empty.className = "command-palette-item";
      empty.textContent = "No commands found";
      ui.commandPaletteList.appendChild(empty);
      return;
    }

    items.forEach((item, index) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = `command-palette-item ${index === state.commandPaletteIndex ? "active" : ""}`;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", index === state.commandPaletteIndex ? "true" : "false");
      button.dataset.command = item.id;
      const shortcut = item.shortcut
        ? `<span class="command-palette-shortcut">${item.shortcut}</span>`
        : "";
      button.innerHTML = `<span>${item.label}</span>${shortcut}`;
      button.addEventListener("click", () => {
        executeCommand(item.id);
        closeCommandPalette();
      });
      li.appendChild(button);
      ui.commandPaletteList.appendChild(li);
    });
  }

  function openCommandPalette() {
    if (!ui.commandPaletteModal) {
      return;
    }
    hideTransientPanels();
    ui.commandPaletteModal.hidden = false;
    state.commandPaletteIndex = 0;
    if (ui.commandPaletteInput) {
      ui.commandPaletteInput.value = "";
      renderCommandPalette();
      ui.commandPaletteInput.focus();
    }
  }

  function closeCommandPalette() {
    if (!ui.commandPaletteModal) {
      return;
    }
    ui.commandPaletteModal.hidden = true;
  }

  function toggleMobileFab(force) {
    if (!ui.mobileFabMenu) {
      return;
    }
    const next = typeof force === "boolean" ? force : ui.mobileFabMenu.hidden;
    if (next) {
      hideTransientPanels();
    }
    ui.mobileFabMenu.hidden = !next;
    ui.mobileFabMain?.setAttribute("aria-expanded", String(next));
  }

  function refreshResponsiveNav() {
    if (!ui.mobileFabDock) {
      return;
    }
    const mobile = window.innerWidth <= 767;
    ui.mobileFabDock.hidden = !mobile;
    if (!mobile) {
      toggleMobileFab(false);
    }
  }

  function updateToolbarState() {
    const sheet = activeSheet();
    if (!sheet) {
      return;
    }
    const cell = sheet.data[state.activeCell.row][state.activeCell.col];
    if (!cell) {
      return;
    }

    const boldBtn = document.getElementById("boldBtn");
    const italicBtn = document.getElementById("italicBtn");
    const underlineBtn = document.getElementById("underlineBtn");
    const alignLeftBtn = document.getElementById("alignLeftBtn");
    const alignCenterBtn = document.getElementById("alignCenterBtn");
    const alignRightBtn = document.getElementById("alignRightBtn");

    boldBtn?.classList.toggle("active-tool", Boolean(cell.style.bold));
    italicBtn?.classList.toggle("active-tool", Boolean(cell.style.italic));
    underlineBtn?.classList.toggle("active-tool", Boolean(cell.style.underline));
    alignLeftBtn?.classList.toggle("active-tool", cell.style.align === "left");
    alignCenterBtn?.classList.toggle("active-tool", cell.style.align === "center");
    alignRightBtn?.classList.toggle("active-tool", cell.style.align === "right");

    boldBtn?.setAttribute("aria-pressed", String(Boolean(cell.style.bold)));
    italicBtn?.setAttribute("aria-pressed", String(Boolean(cell.style.italic)));
    underlineBtn?.setAttribute("aria-pressed", String(Boolean(cell.style.underline)));
    alignLeftBtn?.setAttribute("aria-pressed", String(cell.style.align === "left"));
    alignCenterBtn?.setAttribute("aria-pressed", String(cell.style.align === "center"));
    alignRightBtn?.setAttribute("aria-pressed", String(cell.style.align === "right"));
  }

  function placeFillHandle() {
    const sheet = activeSheet();
    const { maxR, maxC } = rangeBounds();
    const td = ui.table.querySelector(`td[data-row='${maxR}'][data-col='${maxC}']`);
    if (!td) {
      ui.fillHandle.style.display = "none";
      return;
    }
    const gridRect = ui.gridWrap.getBoundingClientRect();
    const tdRect = td.getBoundingClientRect();
    ui.fillHandle.style.display = "block";
    ui.fillHandle.style.left = `${tdRect.right - gridRect.left - 5 + ui.gridWrap.scrollLeft}px`;
    ui.fillHandle.style.top = `${tdRect.bottom - gridRect.top - 5 + ui.gridWrap.scrollTop}px`;

    if (maxR >= sheet.rows || maxC >= sheet.cols) {
      ui.fillHandle.style.display = "none";
    }
  }

  function renderAll() {
    const sheet = activeSheet();
    if (!sheet) {
      return;
    }
    recalcSheet(sheet);
    renderSheetTabs();
    renderGrid();
    syncFormulaBar();
    persistState();
  }

  function persistState() {
    try {
      const payload = {
        sheets: deepCloneData(state.sheets),
        activeSheetId: state.activeSheetId,
        selection: { ...state.selection },
        activeCell: { ...state.activeCell }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      if (ui.saveStatus) {
        ui.saveStatus.textContent = `Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      }
    } catch {
      // Ignore storage failures to keep editing uninterrupted.
    }
  }

  function saveSession() {
    persistState();
    state.dirty = false;
    state.lastSavedAt = Date.now();
    if (ui.saveStatus) {
      ui.saveStatus.textContent = "Saved locally";
      ui.saveStatus.classList.remove("status-dirty");
    }
    announce("Session saved");
  }

  function scheduleAutoSave() {
    state.dirty = true;
    if (ui.saveStatus) {
      ui.saveStatus.textContent = "Unsaved changes";
      ui.saveStatus.classList.add("status-dirty");
    }
    if (state.autoSaveTimer) clearTimeout(state.autoSaveTimer);
    state.autoSaveTimer = setTimeout(() => {
      try {
        persistState();
        state.dirty = false;
        state.lastSavedAt = Date.now();
        if (ui.saveStatus) {
          ui.saveStatus.textContent = "Autosaved";
          ui.saveStatus.classList.remove("status-dirty");
        }
      } catch (e) {
        console.warn("Autosave failed", e);
      }
    }, 2500);
  }

  function normalizeLoadedCell(cell) {
    const base = makeCell();
    const input = cell && typeof cell === "object" ? cell : {};
    const style = input.style && typeof input.style === "object" ? input.style : {};
    const validation = input.validation && typeof input.validation === "object" ? input.validation : {};

    return {
      ...base,
      ...input,
      raw: String(input.raw ?? ""),
      computed: String(input.computed ?? ""),
      style: {
        ...base.style,
        ...style,
        fontSize: Number(style.fontSize ?? input?.style?.fontSize ?? base.style.fontSize) || base.style.fontSize
      },
      validation: {
        type: validation.type || "none",
        list: Array.isArray(validation.list) ? validation.list.map((v) => String(v)) : []
      },
      refs: Array.isArray(input.refs) ? [...input.refs] : []
    };
  }

  function normalizeLoadedSheet(sheet, idx) {
    if (!sheet || typeof sheet !== "object") {
      return null;
    }

    const rows = Math.max(1, Number(sheet.rows) || 0);
    const cols = Math.max(1, Number(sheet.cols) || 0);
    const base = makeSheet(`Sheet ${idx + 1}`, rows, cols);
    const next = {
      ...base,
      ...sheet,
      id: sheet.id || crypto.randomUUID(),
      name: String(sheet.name || `Sheet ${idx + 1}`),
      rows,
      cols,
      freezeRows: Math.max(0, Math.min(rows, Number(sheet.freezeRows) || 0)),
      freezeCols: Math.max(0, Math.min(cols, Number(sheet.freezeCols) || 0))
    };

    next.data = Array.from({ length: rows }, (_, r) => {
      const row = Array.isArray(sheet.data?.[r]) ? sheet.data[r] : [];
      return Array.from({ length: cols }, (_, c) => normalizeLoadedCell(row[c]));
    });

    next.rowHeights = Array.from({ length: rows }, (_, r) => Math.max(22, Number(sheet.rowHeights?.[r]) || 30));
    next.colWidths = Array.from({ length: cols }, (_, c) => Math.max(60, Number(sheet.colWidths?.[c]) || 112));
    next.hiddenRows = Array.isArray(sheet.hiddenRows)
      ? sheet.hiddenRows.filter((r) => Number.isInteger(r) && r >= 0 && r < rows)
      : [];
    next.filter = sheet.filter && typeof sheet.filter === "object"
      ? { col: Number(sheet.filter.col) || 0, term: String(sheet.filter.term || "") }
      : null;

    return next;
  }

  function loadPersistedState() {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        return false;
      }

      const parsed = JSON.parse(serialized);
      if (!parsed || !Array.isArray(parsed.sheets) || !parsed.sheets.length) {
        return false;
      }

      const sheets = parsed.sheets
        .map((sheet, idx) => normalizeLoadedSheet(sheet, idx))
        .filter(Boolean);

      if (!sheets.length) {
        return false;
      }

      state.sheets = sheets;
      state.activeSheetId = sheets.some((s) => s.id === parsed.activeSheetId)
        ? parsed.activeSheetId
        : sheets[0].id;

      const active = activeSheet();
      const safeRow = Math.max(0, Math.min(active.rows - 1, Number(parsed.activeCell?.row) || 0));
      const safeCol = Math.max(0, Math.min(active.cols - 1, Number(parsed.activeCell?.col) || 0));
      state.activeCell = { row: safeRow, col: safeCol };

      const startRow = Math.max(0, Math.min(active.rows - 1, Number(parsed.selection?.startRow) || safeRow));
      const endRow = Math.max(0, Math.min(active.rows - 1, Number(parsed.selection?.endRow) || safeRow));
      const startCol = Math.max(0, Math.min(active.cols - 1, Number(parsed.selection?.startCol) || safeCol));
      const endCol = Math.max(0, Math.min(active.cols - 1, Number(parsed.selection?.endCol) || safeCol));
      state.selection = { startRow, startCol, endRow, endCol };

      state.history = [];
      state.future = [];
      return true;
    } catch {
      return false;
    }
  }

  function updateSelectionVisuals() {
    ui.table.querySelectorAll("td").forEach((td) => {
      td.classList.remove("selected", "active");
      td.setAttribute("aria-selected", "false");
      td.tabIndex = -1;
    });

    const { minR, maxR, minC, maxC } = rangeBounds();
    for (let r = minR; r <= maxR; r += 1) {
      for (let c = minC; c <= maxC; c += 1) {
        const td = ui.table.querySelector(`td[data-row='${r}'][data-col='${c}']`);
        if (td) {
          td.classList.add("selected");
          td.setAttribute("aria-selected", "true");
        }
      }
    }

    const active = ui.table.querySelector(`td[data-row='${state.activeCell.row}'][data-col='${state.activeCell.col}']`);
    if (active) {
      active.classList.add("active");
      active.tabIndex = 0;
    }
  }

  function setSelection(startRow, startCol, endRow, endCol, options = {}) {
    const { render = true, announceSelection = false } = options;
    state.selection = { startRow, startCol, endRow, endCol };
    state.activeCell = { row: endRow, col: endCol };
    if (render) {
      renderGrid();
    } else {
      updateSelectionVisuals();
    }
    syncFormulaBar();
    if (announceSelection) {
      announce(`Selected ${toAddress(state.activeCell.row, state.activeCell.col)}`);
    }
  }

  function selectedCells(cb) {
    const { minR, maxR, minC, maxC } = rangeBounds();
    const sheet = activeSheet();
    for (let r = minR; r <= maxR; r += 1) {
      for (let c = minC; c <= maxC; c += 1) {
        cb(sheet.data[r][c], r, c);
      }
    }
  }

  function validateCell(cell, value) {
    const v = cell.validation;
    if (!v || v.type === "none") {
      return true;
    }
    if (v.type === "non-empty") {
      return String(value).trim().length > 0;
    }
    if (v.type === "number") {
      return value === "" || Number.isFinite(Number(value));
    }
    if (v.type === "integer") {
      return value === "" || Number.isInteger(Number(value));
    }
    if (v.type === "list") {
      return v.list.includes(String(value));
    }
    return true;
  }

  function commitCell(row, col, newRaw) {
    const sheet = activeSheet();
    const cell = sheet.data[row][col];
    let value = String(newRaw ?? "");

    // Lightweight live self-heal on formula entry
    if (value.startsWith("=") || /^(SUM|AVERAGE|COUNT|IF|VLOOKUP|MIN|MAX)\s*\(/i.test(value)) {
      const fixed = maybeFixFormula(value);
      if (fixed.changed) {
        value = fixed.value;
      }
    } else {
      const fixedVal = maybeFixRawValue(value);
      if (fixedVal.changed) {
        value = fixedVal.value;
      }
    }

    if (!validateCell(cell, value)) {
      cell.invalid = true;
      cell.raw = value; // still store so user sees what they typed after fix attempt
      return false;
    }
    cell.invalid = false;
    cell.raw = value;
    recalcSheet(sheet);
    return true;
  }

  function applyFormatting(kind, value) {
    pushHistory();
    selectedCells((cell) => {
      if (kind === "bold") {
        cell.style.bold = !cell.style.bold;
      } else if (kind === "italic") {
        cell.style.italic = !cell.style.italic;
      } else if (kind === "underline") {
        cell.style.underline = !cell.style.underline;
      } else if (kind === "fontSize") {
        cell.style.fontSize = Number(value);
      } else if (kind === "align") {
        cell.style.align = value;
      } else if (kind === "fill") {
        cell.style.background = value;
      } else if (kind === "border") {
        cell.style.borderColor = value;
      } else if (kind === "numberFormat") {
        cell.numberFormat = value;
      }
    });
    renderGrid();
    updateToolbarState();
  }

  function applyValidation(type, listText) {
    pushHistory();
    const list = listText
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    selectedCells((cell) => {
      cell.validation = { type, list };
      cell.invalid = false;
    });
    renderGrid();
  }

  function insertRow(atIndex) {
    const sheet = activeSheet();
    pushHistory();
    const row = Array.from({ length: sheet.cols }, () => makeCell());
    sheet.data.splice(atIndex, 0, row);
    sheet.rowHeights.splice(atIndex, 0, 30);
    sheet.rows += 1;
    renderAll();
  }

  function deleteRow(atIndex) {
    const sheet = activeSheet();
    if (sheet.rows <= 1) {
      return;
    }
    pushHistory();
    sheet.data.splice(atIndex, 1);
    sheet.rowHeights.splice(atIndex, 1);
    sheet.hiddenRows = sheet.hiddenRows.filter((r) => r !== atIndex).map((r) => (r > atIndex ? r - 1 : r));
    sheet.rows -= 1;
    state.activeCell.row = Math.max(0, Math.min(state.activeCell.row, sheet.rows - 1));
    state.selection = {
      startRow: state.activeCell.row,
      startCol: state.activeCell.col,
      endRow: state.activeCell.row,
      endCol: state.activeCell.col
    };
    renderAll();
  }

  function insertCol(atIndex) {
    const sheet = activeSheet();
    pushHistory();
    for (let r = 0; r < sheet.rows; r += 1) {
      sheet.data[r].splice(atIndex, 0, makeCell());
    }
    sheet.colWidths.splice(atIndex, 0, 112);
    sheet.cols += 1;
    renderAll();
  }

  function deleteCol(atIndex) {
    const sheet = activeSheet();
    if (sheet.cols <= 1) {
      return;
    }
    pushHistory();
    for (let r = 0; r < sheet.rows; r += 1) {
      sheet.data[r].splice(atIndex, 1);
    }
    sheet.colWidths.splice(atIndex, 1);
    sheet.cols -= 1;
    state.activeCell.col = Math.max(0, Math.min(state.activeCell.col, sheet.cols - 1));
    state.selection = {
      startRow: state.activeCell.row,
      startCol: state.activeCell.col,
      endRow: state.activeCell.row,
      endCol: state.activeCell.col
    };
    renderAll();
  }

  function moveRow(offset) {
    const sheet = activeSheet();
    const row = state.activeCell.row;
    const target = row + offset;
    if (target < 0 || target >= sheet.rows) {
      return;
    }
    pushHistory();
    [sheet.data[row], sheet.data[target]] = [sheet.data[target], sheet.data[row]];
    [sheet.rowHeights[row], sheet.rowHeights[target]] = [sheet.rowHeights[target], sheet.rowHeights[row]];
    state.activeCell.row = target;
    setSelection(target, state.activeCell.col, target, state.activeCell.col);
  }

  function moveCol(offset) {
    const sheet = activeSheet();
    const col = state.activeCell.col;
    const target = col + offset;
    if (target < 0 || target >= sheet.cols) {
      return;
    }
    pushHistory();
    for (let r = 0; r < sheet.rows; r += 1) {
      [sheet.data[r][col], sheet.data[r][target]] = [sheet.data[r][target], sheet.data[r][col]];
    }
    [sheet.colWidths[col], sheet.colWidths[target]] = [sheet.colWidths[target], sheet.colWidths[col]];
    state.activeCell.col = target;
    setSelection(state.activeCell.row, target, state.activeCell.row, target);
  }

  function sortByColumn(desc) {
    const sheet = activeSheet();
    const col = state.activeCell.col;
    pushHistory();
    sheet.data.sort((a, b) => {
      const av = a[col].computed;
      const bv = b[col].computed;
      const an = Number(av);
      const bn = Number(bv);
      if (Number.isFinite(an) && Number.isFinite(bn)) {
        return desc ? bn - an : an - bn;
      }
      return desc
        ? String(bv).localeCompare(String(av), undefined, { numeric: true })
        : String(av).localeCompare(String(bv), undefined, { numeric: true });
    });
    renderAll();
  }

  function setFilter() {
    const sheet = activeSheet();
    const term = prompt(`Filter column ${colToName(state.activeCell.col)} by substring`, "");
    if (term === null) {
      return;
    }
    pushHistory();
    sheet.filter = { col: state.activeCell.col, term: term.toLowerCase() };
    sheet.hiddenRows = [];
    for (let r = 0; r < sheet.rows; r += 1) {
      const text = String(sheet.data[r][sheet.filter.col].computed).toLowerCase();
      if (!text.includes(sheet.filter.term)) {
        sheet.hiddenRows.push(r);
      }
    }
    renderGrid();
  }

  function clearFilter() {
    const sheet = activeSheet();
    pushHistory();
    sheet.filter = null;
    sheet.hiddenRows = [];
    renderGrid();
  }

  function setFreeze(rows, cols) {
    const sheet = activeSheet();
    pushHistory();
    sheet.freezeRows = Math.max(0, Math.min(sheet.rows, Number(rows) || 0));
    sheet.freezeCols = Math.max(0, Math.min(sheet.cols, Number(cols) || 0));
    renderGrid();
  }

  function selectionToTSV() {
    const sheet = activeSheet();
    const { minR, maxR, minC, maxC } = rangeBounds();
    const rows = [];
    for (let r = minR; r <= maxR; r += 1) {
      const cols = [];
      for (let c = minC; c <= maxC; c += 1) {
        cols.push(sheet.data[r][c].raw);
      }
      rows.push(cols.join("\t"));
    }
    const tsv = rows.join("\n");
    state.clipboardSource = { row: minR, col: minC };
    state.clipboardText = tsv;
    return tsv;
  }

  function translateFormulaReferences(raw, rowOffset, colOffset) {
    if (!String(raw).startsWith("=") || (!rowOffset && !colOffset)) {
      return raw;
    }
    return String(raw).replace(/(\$?)([A-Z]+)(\$?)(\d+)/gi, (match, colLock, colName, rowLock, rowNumber) => {
      const col = nameToCol(colName);
      const row = Number(rowNumber) - 1;
      const nextCol = colLock ? col : Math.max(0, col + colOffset);
      const nextRow = rowLock ? row : Math.max(0, row + rowOffset);
      return `${colLock}${colToName(nextCol)}${rowLock}${nextRow + 1}`;
    });
  }

  function pasteTSV(tsv) {
    const sheet = activeSheet();
    pushHistory();
    const rows = tsv.replace(/\r/g, "").split("\n");
    const source = state.clipboardText === tsv ? state.clipboardSource : null;
    const rowOffset = source ? state.activeCell.row - source.row : 0;
    const colOffset = source ? state.activeCell.col - source.col : 0;
    rows.forEach((rowText, rOff) => {
      const cols = rowText.split("\t");
      cols.forEach((value, cOff) => {
        const r = state.activeCell.row + rOff;
        const c = state.activeCell.col + cOff;
        if (r < sheet.rows && c < sheet.cols) {
          commitCell(r, c, translateFormulaReferences(value, rowOffset, colOffset));
        }
      });
    });
    renderAll();
  }

  function parseCsvLine(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function parseCsv(text) {
    return text
      .replace(/\r/g, "")
      .split("\n")
      .filter((l) => l.length > 0)
      .map((line) => parseCsvLine(line));
  }

  function toCsv(rows) {
    return rows
      .map((row) => row.map((val) => {
        const s = String(val ?? "");
        if (/[",\n]/.test(s)) {
          return `"${s.replaceAll('"', '""')}"`;
        }
        return s;
      }).join(","))
      .join("\n");
  }

  function importCsvFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const data = parseCsv(String(reader.result || ""));
      if (!data.length) {
        return;
      }
      pushHistory();
      const rows = Math.max(DEFAULT_ROWS, data.length);
      const cols = Math.max(DEFAULT_COLS, Math.max(...data.map((r) => r.length)));
      const sheet = makeSheet(file.name.replace(/\.csv$/i, "") || "Imported", rows, cols);
      data.forEach((row, r) => {
        row.forEach((value, c) => {
          sheet.data[r][c].raw = value;
        });
      });
      recalcSheet(sheet);
      state.sheets.push(sheet);
      state.activeSheetId = sheet.id;
      state.selection = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
      state.activeCell = { row: 0, col: 0 };
      renderAll();
    };
    reader.readAsText(file);
  }

  function exportCsv() {
    const sheet = activeSheet();
    const rows = [];
    for (let r = 0; r < sheet.rows; r += 1) {
      rows.push(sheet.data[r].map((cell) => cell.raw));
    }
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${sheet.name || "sheet"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function getSelectionDataForChart() {
    const sheet = activeSheet();
    const { minR, maxR, minC, maxC } = rangeBounds();
    const labels = [];
    const values = [];

    for (let r = minR; r <= maxR; r += 1) {
      const labelCell = sheet.data[r][minC];
      const valueCell = sheet.data[r][Math.min(minC + 1, maxC)];
      labels.push(String(labelCell.computed || `Row ${r + 1}`));
      values.push(Number(valueCell.computed) || 0);
    }

    return { labels, values };
  }

  function renderChart() {
    const { labels, values } = getSelectionDataForChart();
    const type = ui.chartTypeSelect.value;
    const ctx = ui.chartCanvas.getContext("2d");
    if (state.chart) {
      state.chart.destroy();
    }
    state.chart = new Chart(ctx, {
      type,
      data: {
        labels,
        datasets: [{
          label: "Selection",
          data: values,
          borderWidth: 2,
          borderColor: "#0f5e4a",
          backgroundColor: [
            "rgba(16, 185, 129, 0.7)",
            "rgba(59, 130, 246, 0.7)",
            "rgba(217, 119, 6, 0.7)",
            "rgba(234, 88, 12, 0.7)",
            "rgba(124, 58, 237, 0.7)",
            "rgba(8, 145, 178, 0.7)"
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: type === "pie" }
        }
      }
    });
  }

  function maybeFixFormula(raw) {
    let next = String(raw ?? "");
    let changed = false;

    // Common function typos / aliases
    const TYPO_MAP = {
      SUMM: "SUM", SUMIFA: "SUMIF", AVG: "AVERAGE", AVERAG: "AVERAGE",
      COUNTT: "COUNT", COUNTAA: "COUNTA", MINN: "MIN", MAXX: "MAX",
      VLOOOKUP: "VLOOKUP", VLOOK: "VLOOKUP", HLOOOKUP: "HLOOKUP",
      CONCATE: "CONCAT", CONCATINATE: "CONCATENATE", IFF: "IF",
      IFERR: "IFERROR", ROUDN: "ROUND", SQRTT: "SQRT", ABSS: "ABS",
      LENTH: "LEN", LENGHT: "LEN", TRIMMM: "TRIM", UPPR: "UPPER",
      LOWR: "LOWER", PROPPER: "PROPER", SUBSTITUE: "SUBSTITUTE",
      VALEU: "VALUE", ISNUM: "ISNUMBER", ISTXT: "ISTEXT",
      TODA: "TODAY", DAT: "DATE"
    };

    if (!next.startsWith("=")) {
      const looksLikeFormula = /^(SUM|AVERAGE|COUNT|COUNTA|IF|IFERROR|VLOOKUP|HLOOKUP|INDEX|MATCH|CONCAT|CONCATENATE|MIN|MAX|ROUND|ABS|POWER|SQRT|MOD|SUMIF|COUNTIF|AND|OR|NOT|LEFT|RIGHT|MID|LEN|TRIM|UPPER|LOWER|PROPER|SUBSTITUTE|FIND|SEARCH|VALUE|TEXT|ISNUMBER|ISTEXT|ISBLANK|TODAY|NOW|YEAR|MONTH|DAY|DATE)\s*\(/i.test(next)
        || /^[A-Z]+\d+\s*[+\-*/^]/i.test(next)
        || /^\s*[A-Z]+\s*\(/i.test(next);
      if (looksLikeFormula) {
        next = `=${next}`;
        changed = true;
      }
    }

    if (!next.startsWith("=")) {
      return { value: next, changed };
    }

    // Normalize smart quotes and European argument separators
    let normalized = next
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/;/g, ",");
    if (normalized !== next) {
      next = normalized;
      changed = true;
    }

    // Fix function name typos (case-insensitive match on known aliases)
    next = next.replace(/\b([A-Z]{2,})\s*\(/gi, (match, name) => {
      const upper = name.toUpperCase();
      if (TYPO_MAP[upper]) {
        changed = true;
        return TYPO_MAP[upper] + "(";
      }
      return match;
    });

    // Balance parentheses
    let openParens = 0;
    for (let i = 0; i < next.length; i += 1) {
      if (next[i] === "(") openParens += 1;
      if (next[i] === ")") openParens -= 1;
    }
    if (openParens > 0) {
      next += ")".repeat(openParens);
      changed = true;
    }

    // Balance double quotes (simple heuristic)
    const quoteCount = (next.match(/"/g) || []).length;
    if (quoteCount % 2 === 1) {
      next += '"';
      changed = true;
    }

    // Collapse multiple spaces inside formula
    const collapsed = next.replace(/\s{2,}/g, " ");
    if (collapsed !== next) {
      next = collapsed;
      changed = true;
    }

    return { value: next, changed };
  }

  function maybeFixRawValue(raw) {
    let next = String(raw ?? "");
    let changed = false;

    const trimmed = next.trim();
    if (trimmed !== next) {
      next = trimmed;
      changed = true;
    }

    // Strip leading apostrophe used as text force in Excel
    if (next.startsWith("'") && !next.startsWith("''")) {
      next = next.slice(1);
      changed = true;
    }

    // Thousands separators: 1,234.56 or 1.234,56 (European)
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(next)) {
      next = next.replaceAll(",", "");
      changed = true;
    } else if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(next)) {
      next = next.replace(/\./g, "").replace(",", ".");
      changed = true;
    }

    // Percent written as "12.5%"
    if (/^-?\d+(\.\d+)?\s*%$/.test(next)) {
      const n = parseFloat(next) / 100;
      next = String(n);
      changed = true;
    }

    // Currency symbols
    if (/^[$€£¥]\s*-?\d/.test(next) || /^-?\d.*[$€£¥]$/.test(next)) {
      const cleaned = next.replace(/[$€£¥\s,]/g, "").replace(",", ".");
      const n = Number(cleaned);
      if (Number.isFinite(n)) {
        next = String(n);
        changed = true;
      }
    }

    return { value: next, changed };
  }

  function fixValidationValue(cell, raw) {
    const validation = cell.validation || { type: "none", list: [] };
    const type = validation.type || "none";
    if (type === "none") {
      return { value: raw, changed: false };
    }

    const current = String(raw ?? "");
    if (type === "non-empty") {
      if (current.trim().length === 0) {
        return { value: "N/A", changed: true };
      }
      return { value: current, changed: false };
    }

    if (type === "number" || type === "integer") {
      if (current === "") {
        return { value: current, changed: false };
      }
      const stripped = current.replace(/[^0-9+\-.]/g, "");
      const asNum = Number(stripped);
      if (!Number.isFinite(asNum)) {
        return { value: current, changed: false };
      }
      if (type === "integer") {
        const normalized = String(Math.trunc(asNum));
        return { value: normalized, changed: normalized !== current };
      }
      const normalized = String(asNum);
      return { value: normalized, changed: normalized !== current };
    }

    if (type === "list") {
      const list = Array.isArray(validation.list) ? validation.list : [];
      if (!list.length) {
        return { value: current, changed: false };
      }
      if (!list.includes(current)) {
        return { value: list[0], changed: true };
      }
    }

    return { value: current, changed: false };
  }

  function cloneSheet(sheet) {
    return {
      ...sheet,
      data: sheet.data.map((row) => row.map((cell) => ({
        ...cell,
        style: { ...cell.style },
        validation: { ...cell.validation, list: [...cell.validation.list] },
        refs: [...cell.refs]
      }))),
      rowHeights: [...sheet.rowHeights],
      colWidths: [...sheet.colWidths],
      hiddenRows: [...sheet.hiddenRows],
      filter: sheet.filter ? { ...sheet.filter } : null
    };
  }

  function getSelfFixScopeCells(sheet, scope) {
    if (scope === "active") {
      return [{ row: state.activeCell.row, col: state.activeCell.col }];
    }

    if (scope === "selection") {
      const { minR, maxR, minC, maxC } = rangeBounds();
      const coords = [];
      for (let r = minR; r <= maxR; r += 1) {
        for (let c = minC; c <= maxC; c += 1) {
          coords.push({ row: r, col: c });
        }
      }
      return coords;
    }

    const coords = [];
    for (let r = 0; r < sheet.rows; r += 1) {
      for (let c = 0; c < sheet.cols; c += 1) {
        coords.push({ row: r, col: c });
      }
    }
    return coords;
  }

  function selfFixScopeLabel(scope) {
    if (scope === "active") {
      return "Active Cell";
    }
    if (scope === "selection") {
      return "Selection";
    }
    return "Whole Sheet";
  }

  function analyzeSelfFix(scope) {
    const sheet = activeSheet();
    if (!sheet) {
      return null;
    }

    const workingSheet = cloneSheet(sheet);
    const coords = getSelfFixScopeCells(workingSheet, scope);
    const changes = [];

    const report = {
      scope,
      scopeLabel: selfFixScopeLabel(scope),
      scannedCells: coords.length,
      changedCells: 0,
      formulasFixed: 0,
      valuesNormalized: 0,
      validationsFixed: 0,
      consistencyFixes: 0,
      patternFixes: 0,
      unresolvedFormulaErrors: 0,
      unresolvedValidationErrors: 0,
      changedPreview: []
    };

    // First pass: local cell fixes
    for (let i = 0; i < coords.length; i += 1) {
      const { row, col } = coords[i];
      const cell = workingSheet.data[row][col];
      const before = String(cell.raw ?? "");
      let after = before;
      let changed = false;

      const fixedFormula = maybeFixFormula(after);
      if (fixedFormula.changed) {
        after = fixedFormula.value;
        report.formulasFixed += 1;
        changed = true;
      }

      const fixedValue = maybeFixRawValue(after);
      if (fixedValue.changed) {
        after = fixedValue.value;
        report.valuesNormalized += 1;
        changed = true;
      }

      const validationFix = fixValidationValue(cell, after);
      if (validationFix.changed) {
        after = validationFix.value;
        report.validationsFixed += 1;
        changed = true;
      }

      cell.raw = after;

      if (changed && after !== before) {
        report.changedCells += 1;
        changes.push({ row, col, before, after, reason: "local" });
      }
    }

    // Second pass: column consistency (when scope is sheet or selection spanning rows)
    const colGroups = new Map();
    coords.forEach(({ row, col }) => {
      if (!colGroups.has(col)) colGroups.set(col, []);
      colGroups.get(col).push(row);
    });

    colGroups.forEach((rows, col) => {
      if (rows.length < 3) return;
      const samples = rows.map((r) => workingSheet.data[r][col].raw).filter((v) => String(v).trim() !== "");
      if (samples.length < 3) return;

      // Infer dominant type
      let numCount = 0, formulaCount = 0, textCount = 0;
      samples.forEach((v) => {
        const s = String(v);
        if (s.startsWith("=")) formulaCount += 1;
        else if (Number.isFinite(Number(s.replace(/,/g, "")))) numCount += 1;
        else textCount += 1;
      });

      const total = samples.length;
      // If majority numbers, coerce obvious text numbers / clean
      if (numCount / total >= 0.7) {
        rows.forEach((r) => {
          const cell = workingSheet.data[r][col];
          const before = String(cell.raw ?? "");
          if (before.startsWith("=") || before.trim() === "") return;
          const cleaned = before.replace(/[^0-9+\-.]/g, "");
          const n = Number(cleaned);
          if (Number.isFinite(n) && String(n) !== before) {
            cell.raw = String(n);
            report.consistencyFixes += 1;
            report.changedCells += 1;
            changes.push({ row: r, col, before, after: cell.raw, reason: "consistency-number" });
          }
        });
      }

      // If majority formulas of same pattern, try to propagate relative formula to blanks that look like data gaps
      if (formulaCount / total >= 0.5) {
        const formulaSamples = samples.filter((v) => String(v).startsWith("="));
        // Simple pattern: same function name
        const funcNames = formulaSamples.map((f) => {
          const m = /^=\s*([A-Z]+)/i.exec(f);
          return m ? m[1].toUpperCase() : "";
        }).filter(Boolean);
        if (funcNames.length) {
          const modeFunc = funcNames.sort((a, b) =>
            funcNames.filter((v) => v === a).length - funcNames.filter((v) => v === b).length
          ).pop();
          // Find a template formula near the top
          let template = null;
          let templateRow = -1;
          for (const r of rows.sort((a, b) => a - b)) {
            const raw = workingSheet.data[r][col].raw;
            if (String(raw).toUpperCase().startsWith("=" + modeFunc)) {
              template = raw;
              templateRow = r;
              break;
            }
          }
          if (template && templateRow >= 0) {
            rows.forEach((r) => {
              if (r === templateRow) return;
              const cell = workingSheet.data[r][col];
              const before = String(cell.raw ?? "");
              if (before.trim() !== "") return; // only fill blanks for pattern
              // Relative translate
              const translated = translateFormulaReferences(template, r - templateRow, 0);
              if (translated && translated !== before) {
                cell.raw = translated;
                report.patternFixes += 1;
                report.changedCells += 1;
                changes.push({ row: r, col, before: before || "<empty>", after: translated, reason: "pattern-fill" });
              }
            });
          }
        }
      }
    });

    recalcSheet(workingSheet);

    for (let i = 0; i < coords.length; i += 1) {
      const { row, col } = coords[i];
      const cell = workingSheet.data[row][col];
      const isInvalid = !validateCell(cell, cell.raw);
      if (isInvalid) {
        report.unresolvedValidationErrors += 1;
      }
      if (String(cell.raw).startsWith("=") && String(cell.computed).startsWith("#")) {
        report.unresolvedFormulaErrors += 1;
      }
    }

    report.changedPreview = changes.slice(0, 30).map((entry) => {
      const beforeText = entry.before.length ? entry.before : "<empty>";
      const afterText = entry.after.length ? entry.after : "<empty>";
      const why = entry.reason ? ` [${entry.reason}]` : "";
      return `${toAddress(entry.row, entry.col)}: ${beforeText} -> ${afterText}${why}`;
    });

    return { report, changes };
  }

  function showSelfFixReport(report, preview) {
    ui.selfFixSummary.textContent = preview
      ? "Preview complete. No cells were modified."
      : "Self Fix applied and saved. Use Undo if needed.";
    ui.selfFixScopeValue.textContent = report.scopeLabel;
    ui.selfFixModeValue.textContent = preview ? "Preview" : "Apply";
    ui.selfFixScannedValue.textContent = String(report.scannedCells);
    ui.selfFixChangedCellsValue.textContent = String(report.changedCells);
    ui.selfFixFormulaValue.textContent = String(report.formulasFixed);
    ui.selfFixValueValue.textContent = String(report.valuesNormalized);
    ui.selfFixValidationValue.textContent = String(report.validationsFixed);
    if (ui.selfFixConsistencyValue) ui.selfFixConsistencyValue.textContent = String(report.consistencyFixes || 0);
    if (ui.selfFixPatternValue) ui.selfFixPatternValue.textContent = String(report.patternFixes || 0);
    ui.selfFixUnresolvedFormulaValue.textContent = String(report.unresolvedFormulaErrors);
    ui.selfFixUnresolvedValidationValue.textContent = String(report.unresolvedValidationErrors);

    ui.selfFixChangedList.innerHTML = "";
    const list = report.changedPreview.length ? report.changedPreview : ["No cell changes detected."];
    list.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      ui.selfFixChangedList.appendChild(li);
    });

    ui.selfFixReportModal.hidden = false;
  }

  function closeSelfFixReport() {
    ui.selfFixReportModal.hidden = true;
  }

  function selfFixActiveSheet() {
    const scope = ui.selfFixScopeSelect?.value || "sheet";
    const preview = Boolean(ui.selfFixPreviewCheckbox?.checked);
    const analysis = analyzeSelfFix(scope);
    if (!analysis) {
      return;
    }

    if (!preview && analysis.changes.length) {
      const sheet = activeSheet();
      pushHistory();
      analysis.changes.forEach(({ row, col, after }) => {
        sheet.data[row][col].raw = after;
      });
      recalcSheet(sheet);
      for (let r = 0; r < sheet.rows; r += 1) {
        for (let c = 0; c < sheet.cols; c += 1) {
          const cell = sheet.data[r][c];
          cell.invalid = !validateCell(cell, cell.raw);
        }
      }
      renderAll();
    }

    showSelfFixReport(analysis.report, preview);
  }

  function resetSavedData() {
    const proceed = confirm("Reset saved workbook data and start a new empty sheet?");
    if (!proceed) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    const first = makeSheet("Sheet 1");
    state.sheets = [first];
    state.activeSheetId = first.id;
    state.selection = { startRow: 0, startCol: 0, endRow: 0, endCol: 0 };
    state.activeCell = { row: 0, col: 0 };
    state.history = [];
    state.future = [];
    recalcSheet(first);
    renderAll();
  }

  function loadSavedData() {
    const restored = loadPersistedState();
    if (!restored) {
      alert("No saved session found.");
      return;
    }
    renderAll();
  }

  function showContextMenu(x, y) {
    ui.contextMenu.hidden = false;
    ui.contextMenu.style.left = `${x}px`;
    ui.contextMenu.style.top = `${y}px`;
  }

  function hideContextMenu() {
    ui.contextMenu.hidden = true;
  }

  function bindCommandButtons(root = document) {
    root.querySelectorAll("[data-command]").forEach((button) => {
      if (button.closest("#contextMenu")) {
        return;
      }
      if (button.dataset.commandBound === "1") {
        return;
      }
      button.dataset.commandBound = "1";
      button.addEventListener("click", () => {
        const commandId = button.dataset.command;
        executeCommand(commandId);
        hideTransientPanels();
      });
    });
  }

  function bindTableEvents() {
    ui.table.addEventListener("mousedown", (e) => {
      hideContextMenu();
      const td = e.target.closest("td");
      if (!td) {
        return;
      }
      const row = Number(td.dataset.row);
      const col = Number(td.dataset.col);
      state.isSelecting = true;
      setSelection(row, col, row, col, { render: false });
    });

    ui.table.addEventListener("mousemove", (e) => {
      if (!state.isSelecting) {
        return;
      }
      const td = e.target.closest("td");
      if (!td) {
        return;
      }
      const row = Number(td.dataset.row);
      const col = Number(td.dataset.col);
      setSelection(state.selection.startRow, state.selection.startCol, row, col, { render: false });
    });

    ui.table.addEventListener("touchstart", (e) => {
      state.touchStartTs = Date.now();
      state.touchLongPressTriggered = false;
      state.touchWasTwoFinger = e.touches.length === 2;
      clearTimeout(state.touchLongPressTimer);

      if (state.touchWasTwoFinger) {
        return;
      }

      const touch = e.touches[0];
      if (!touch) {
        return;
      }

      state.touchLongPressTimer = setTimeout(() => {
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const td = target?.closest?.("td");
        if (!td) {
          return;
        }
        const row = Number(td.dataset.row);
        const col = Number(td.dataset.col);
        setSelection(row, col, row, col, { render: false });
        showContextMenu(touch.clientX, touch.clientY);
        state.touchLongPressTriggered = true;
        announce("Context menu opened");
      }, 520);
    }, { passive: true });

    ui.table.addEventListener("touchmove", () => {
      clearTimeout(state.touchLongPressTimer);
    }, { passive: true });

    ui.table.addEventListener("touchend", (e) => {
      clearTimeout(state.touchLongPressTimer);
      const elapsed = Date.now() - state.touchStartTs;

      if (state.touchWasTwoFinger && elapsed < 260) {
        executeCommand("undo", { silent: true });
        announce("Undo");
        state.touchWasTwoFinger = false;
        return;
      }

      if (state.touchLongPressTriggered) {
        state.touchLongPressTriggered = false;
        return;
      }

      if (elapsed < 260) {
        const touch = e.changedTouches?.[0];
        if (!touch) {
          return;
        }
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        const td = target?.closest?.("td");
        if (!td) {
          return;
        }
        const row = Number(td.dataset.row);
        const col = Number(td.dataset.col);
        setSelection(row, col, row, col, { render: false });
      }
    }, { passive: true });

    document.addEventListener("mouseup", () => {
      state.isSelecting = false;
      if (state.fillDrag) {
        applyFillDrag(state.fillDrag.endRow, state.fillDrag.endCol);
        state.fillDrag = null;
      }
    });

    ui.table.addEventListener("focusin", (e) => {
      const td = e.target.closest("td");
      if (!td) {
        return;
      }
      const row = Number(td.dataset.row);
      const col = Number(td.dataset.col);
      setSelection(row, col, row, col, { render: false });
    });

    ui.table.addEventListener("keydown", (e) => {
      const td = e.target.closest("td");
      if (!td) {
        return;
      }
      const row = Number(td.dataset.row);
      const col = Number(td.dataset.col);

      if (e.key === "Enter") {
        e.preventDefault();
        td.blur();
        const nextRow = Math.min(activeSheet().rows - 1, row + 1);
        setSelection(nextRow, col, nextRow, col);
        const next = ui.table.querySelector(`td[data-row='${nextRow}'][data-col='${col}']`);
        if (next) {
          next.focus();
        }
      }

      if (e.key === "Tab") {
        e.preventDefault();
        td.blur();
        const sheet = activeSheet();
        let nextRow = row;
        let nextCol = e.shiftKey ? col - 1 : col + 1;
        if (nextCol >= sheet.cols) {
          nextCol = 0;
          nextRow = Math.min(sheet.rows - 1, row + 1);
        }
        if (nextCol < 0) {
          nextCol = sheet.cols - 1;
          nextRow = Math.max(0, row - 1);
        }
        setSelection(nextRow, nextCol, nextRow, nextCol, { announceSelection: true });
        const next = ui.table.querySelector(`td[data-row='${nextRow}'][data-col='${nextCol}']`);
        if (next) {
          next.focus();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigator.clipboard.writeText(selectionToTSV());
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          pasteTSV(text);
        }).catch(() => {});
      }
    });

    ui.table.addEventListener("blur", (e) => {
      const td = e.target.closest("td");
      if (!td) {
        return;
      }
      const row = Number(td.dataset.row);
      const col = Number(td.dataset.col);
      const next = td.textContent ?? "";
      const sheet = activeSheet();
      const prev = sheet.data[row][col].raw;
      if (next !== prev) {
        pushHistory();
        const ok = commitCell(row, col, next);
        if (!ok) {
          alert("Value violates data validation rule.");
        }
        renderAll();
      }
    }, true);

    ui.table.addEventListener("contextmenu", (e) => {
      const td = e.target.closest("td");
      const rowHead = e.target.closest("th.row-header");
      const colHead = e.target.closest("th.col-header");
      if (!td && !rowHead && !colHead) {
        return;
      }
      e.preventDefault();
      if (td) {
        setSelection(Number(td.dataset.row), Number(td.dataset.col), Number(td.dataset.row), Number(td.dataset.col));
      }
      showContextMenu(e.clientX, e.clientY);
    });

    ui.table.addEventListener("dblclick", (e) => {
      const colHead = e.target.closest("th.col-header");
      const rowHead = e.target.closest("th.row-header");
      const sheet = activeSheet();
      if (colHead) {
        const col = Number(colHead.dataset.col);
        const next = prompt("Column width in px", String(sheet.colWidths[col]));
        if (next !== null) {
          const w = Math.max(60, Number(next) || sheet.colWidths[col]);
          pushHistory();
          sheet.colWidths[col] = w;
          renderGrid();
        }
      }
      if (rowHead) {
        const row = Number(rowHead.dataset.row);
        const next = prompt("Row height in px", String(sheet.rowHeights[row]));
        if (next !== null) {
          const h = Math.max(22, Number(next) || sheet.rowHeights[row]);
          pushHistory();
          sheet.rowHeights[row] = h;
          renderGrid();
        }
      }
    });

    ui.contextMenu.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-cmd]");
      if (!btn) {
        return;
      }
      const cmd = btn.dataset.cmd;
      executeCommand(cmd);
      hideContextMenu();
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#contextMenu")) {
        hideContextMenu();
      }
    });
  }

  function applyFillDrag(endRow, endCol) {
    const sheet = activeSheet();
    pushHistory();
    const sourceRange = state.fillDrag?.sourceRange || rangeBounds();
    const { minR, maxR, minC, maxC } = sourceRange;
    const sourceRows = maxR - minR + 1;
    const sourceCols = maxC - minC + 1;

    const fillMinR = Math.min(minR, endRow);
    const fillMaxR = Math.max(maxR, endRow);
    const fillMinC = Math.min(minC, endCol);
    const fillMaxC = Math.max(maxC, endCol);

    for (let r = fillMinR; r <= fillMaxR; r += 1) {
      for (let c = fillMinC; c <= fillMaxC; c += 1) {
        if (r >= minR && r <= maxR && c >= minC && c <= maxC) {
          continue;
        }
        const srcR = minR + ((r - minR) % sourceRows + sourceRows) % sourceRows;
        const srcC = minC + ((c - minC) % sourceCols + sourceCols) % sourceCols;
        const src = sheet.data[srcR][srcC];
        const dst = sheet.data[r][c];
        dst.raw = translateFormulaReferences(src.raw, r - srcR, c - srcC);
        dst.style = { ...src.style };
        dst.numberFormat = src.numberFormat;
        dst.validation = { ...src.validation, list: [...src.validation.list] };
        dst.invalid = false;
      }
    }
    setSelection(fillMinR, fillMinC, fillMaxR, fillMaxC);
    renderAll();
  }

  function bindFillHandleEvents() {
    ui.fillHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      state.fillDrag = {
        sourceRange: rangeBounds(),
        endRow: rangeBounds().maxR,
        endCol: rangeBounds().maxC
      };
    });

    ui.gridWrap.addEventListener("mousemove", (e) => {
      if (!state.fillDrag) {
        return;
      }
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const td = target?.closest?.("td");
      if (!td) {
        return;
      }
      state.fillDrag.endRow = Number(td.dataset.row);
      state.fillDrag.endCol = Number(td.dataset.col);
      const { startRow, startCol } = state.selection;
      setSelection(startRow, startCol, state.fillDrag.endRow, state.fillDrag.endCol);
    });
  }

  function bindToolbar() {
    bindCommandButtons();

    ui.ribbonTabButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        setRibbonTab(button.dataset.ribbonTab);
      });

      button.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          const next = (index + 1) % ui.ribbonTabButtons.length;
          const nextBtn = ui.ribbonTabButtons[next];
          setRibbonTab(nextBtn.dataset.ribbonTab);
          nextBtn.focus();
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          const prev = (index - 1 + ui.ribbonTabButtons.length) % ui.ribbonTabButtons.length;
          const prevBtn = ui.ribbonTabButtons[prev];
          setRibbonTab(prevBtn.dataset.ribbonTab);
          prevBtn.focus();
        }
      });
    });

    document.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "bold" || action === "italic" || action === "underline") {
          applyFormatting(action);
        }
        if (action === "align-left") {
          applyFormatting("align", "left");
        }
        if (action === "align-center") {
          applyFormatting("align", "center");
        }
        if (action === "align-right") {
          applyFormatting("align", "right");
        }
      });
    });

    document.getElementById("fontSizeSelect").addEventListener("change", (e) => applyFormatting("fontSize", e.target.value));
    document.getElementById("fillColor").addEventListener("change", (e) => applyFormatting("fill", e.target.value));
    document.getElementById("borderColor").addEventListener("change", (e) => applyFormatting("border", e.target.value));
    document.getElementById("numberFormatSelect").addEventListener("change", (e) => applyFormatting("numberFormat", e.target.value));

    document.getElementById("validationSelect").addEventListener("change", (e) => {
      const listInput = document.getElementById("validationListInput");
      applyValidation(e.target.value, listInput.value);
    });
    document.getElementById("validationListInput").addEventListener("change", (e) => {
      const type = document.getElementById("validationSelect").value;
      applyValidation(type, e.target.value);
    });

    document.getElementById("sortAscBtn").addEventListener("click", () => executeCommand("sort-asc"));
    document.getElementById("sortDescBtn").addEventListener("click", () => executeCommand("sort-desc"));
    document.getElementById("filterBtn").addEventListener("click", () => executeCommand("filter"));
    document.getElementById("clearFilterBtn").addEventListener("click", () => executeCommand("clear-filter"));

    document.getElementById("freezeRowsInput").addEventListener("change", (e) => {
      setFreeze(e.target.value, document.getElementById("freezeColsInput").value);
    });
    document.getElementById("freezeColsInput").addEventListener("change", (e) => {
      setFreeze(document.getElementById("freezeRowsInput").value, e.target.value);
    });

    document.getElementById("addRowBtn").addEventListener("click", () => executeCommand("add-row"));
    document.getElementById("deleteRowBtn").addEventListener("click", () => executeCommand("delete-row"));
    document.getElementById("addColBtn").addEventListener("click", () => executeCommand("add-col"));
    document.getElementById("deleteColBtn").addEventListener("click", () => executeCommand("delete-col"));
    document.getElementById("moveRowUpBtn").addEventListener("click", () => executeCommand("move-row-up"));
    document.getElementById("moveRowDownBtn").addEventListener("click", () => executeCommand("move-row-down"));
    document.getElementById("moveColLeftBtn").addEventListener("click", () => executeCommand("move-col-left"));
    document.getElementById("moveColRightBtn").addEventListener("click", () => executeCommand("move-col-right"));

    document.getElementById("undoBtn").addEventListener("click", () => executeCommand("undo"));
    document.getElementById("redoBtn").addEventListener("click", () => executeCommand("redo"));
    ui.commandPaletteBtn.addEventListener("click", () => executeCommand("command-palette"));
    ui.findInput?.addEventListener("input", refreshFindMatches);
    ui.replaceBtn?.addEventListener("click", replaceCurrentMatch);
    ui.replaceAllBtn?.addEventListener("click", replaceAllMatches);
    ui.findInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        moveFindMatch(e.shiftKey ? -1 : 1);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeFindBar();
      }
    });
    ui.findPrevBtn?.addEventListener("click", () => moveFindMatch(-1));
    ui.findNextBtn?.addEventListener("click", () => moveFindMatch(1));
    ui.closeFindBtn?.addEventListener("click", closeFindBar);
    ui.zoomOutBtn?.addEventListener("click", () => executeCommand("zoom-out"));
    ui.zoomInBtn?.addEventListener("click", () => executeCommand("zoom-in"));

    document.getElementById("addSheetBtn").addEventListener("click", () => executeCommand("add-sheet"));

    document.getElementById("importCsvBtn").addEventListener("click", () => executeCommand("import-csv"));
    ui.csvInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) {
        importCsvFile(file);
      }
      e.target.value = "";
    });
    document.getElementById("exportCsvBtn").addEventListener("click", () => executeCommand("export-csv"));
    ui.saveSessionBtn?.addEventListener("click", () => executeCommand("save-session"));

    document.getElementById("chartBtn").addEventListener("click", () => executeCommand("chart"));
    document.getElementById("selfFixBtn").addEventListener("click", () => executeCommand("self-fix"));
    ui.loadSavedBtn.addEventListener("click", () => executeCommand("load-saved"));
    ui.resetDataBtn.addEventListener("click", () => executeCommand("reset-data"));

    ui.toolbarOverflowBtn?.addEventListener("click", () => {
      toggleToolbarOverflow();
    });
    ui.sheetMenuBtn?.addEventListener("click", () => {
      toggleSheetMenu();
    });

    ui.mobileFabMain?.addEventListener("click", () => {
      toggleMobileFab();
    });

    ui.closeCommandPaletteBtn?.addEventListener("click", closeCommandPalette);
    ui.commandPaletteInput?.addEventListener("input", () => {
      state.commandPaletteIndex = 0;
      renderCommandPalette();
    });
    ui.commandPaletteInput?.addEventListener("keydown", (e) => {
      const items = Array.from(ui.commandPaletteList?.querySelectorAll("button[data-command]") || []);
      if (!items.length) {
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        state.commandPaletteIndex = Math.min(items.length - 1, state.commandPaletteIndex + 1);
        renderCommandPalette();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        state.commandPaletteIndex = Math.max(0, state.commandPaletteIndex - 1);
        renderCommandPalette();
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const target = items[state.commandPaletteIndex] || items[0];
        target?.click();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeCommandPalette();
      }
    });

    ui.commandPaletteModal?.addEventListener("click", (e) => {
      if (e.target === ui.commandPaletteModal) {
        closeCommandPalette();
      }
    });

    if ("value" in ui.nameBox) {
      ui.nameBox.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") {
          return;
        }
        e.preventDefault();
        const location = fromAddress(ui.nameBox.value || "");
        if (!location) {
          announce("Invalid address");
          syncFormulaBar();
          return;
        }
        const sheet = activeSheet();
        const row = Math.max(0, Math.min(sheet.rows - 1, location.row));
        const col = Math.max(0, Math.min(sheet.cols - 1, location.col));
        setSelection(row, col, row, col, { announceSelection: true });
        ui.table.querySelector(`td[data-row='${row}'][data-col='${col}']`)?.focus();
      });
    }

    document.getElementById("closeChartModal").addEventListener("click", () => {
      ui.chartModal.hidden = true;
    });
    document.getElementById("renderChartBtn").addEventListener("click", renderChart);
    ui.closeSelfFixReportModal.addEventListener("click", closeSelfFixReport);

    ui.selfFixReportModal.addEventListener("click", (e) => {
      if (e.target === ui.selfFixReportModal) {
        closeSelfFixReport();
      }
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#toolbarOverflowBtn") && !e.target.closest("#toolbarOverflowPanel")) {
        toggleToolbarOverflow(false);
      }
      if (!e.target.closest("#sheetMenuBtn") && !e.target.closest("#sheetMenuPanel")) {
        toggleSheetMenu(false);
      }
      if (!e.target.closest("#mobileFabMain") && !e.target.closest("#mobileFabMenu")) {
        toggleMobileFab(false);
      }
    });

    ui.formulaInput.addEventListener("input", (e) => {
      highlightFormula(e.target.value);
      updateFormulaSuggestions(e.target.value);
    });

    ui.formulaInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        pushHistory();
        const ok = commitCell(state.activeCell.row, state.activeCell.col, ui.formulaInput.value);
        if (!ok) {
          alert("Value violates data validation rule.");
        }
        renderAll();
      }
    });

    document.addEventListener("keydown", (e) => {
      const target = e.target;
      const editingField = target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        executeCommand("command-palette", { silent: true });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        executeCommand("find", { silent: true });
        return;
      }

      if (e.altKey && !editingField) {
        if (e.key === "1") {
          e.preventDefault();
          executeCommand("tab-home", { silent: true });
          return;
        }
        if (e.key === "2") {
          e.preventDefault();
          executeCommand("tab-data", { silent: true });
          return;
        }
        if (e.key === "3") {
          e.preventDefault();
          executeCommand("tab-view", { silent: true });
          return;
        }
        if (e.key === "4") {
          e.preventDefault();
          executeCommand("tab-tools", { silent: true });
          return;
        }
      }

      if (e.key === "Escape") {
        hideContextMenu();
        hideTransientPanels();
        closeCommandPalette();
        closeFindBar();
      }

      if (e.target === ui.formulaInput || e.target === ui.commandPaletteInput) {
        return;
      }

      const sheet = activeSheet();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        executeCommand("undo", { silent: true });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        executeCommand("redo", { silent: true });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        executeCommand("save-session", { silent: true });
        return;
      }

      if (!editingField && (e.ctrlKey || e.metaKey)) {
        const key = e.key.toLowerCase();
        if (key === "b") {
          e.preventDefault();
          applyFormatting("bold");
          return;
        }
        if (key === "i") {
          e.preventDefault();
          applyFormatting("italic");
          return;
        }
        if (key === "u") {
          e.preventDefault();
          applyFormatting("underline");
          return;
        }
      }

      let moved = false;
      let { row, col } = state.activeCell;
      if (e.key === "ArrowUp") {
        row = Math.max(0, row - 1);
        moved = true;
      }
      if (e.key === "ArrowDown") {
        row = Math.min(sheet.rows - 1, row + 1);
        moved = true;
      }
      if (e.key === "ArrowLeft") {
        col = Math.max(0, col - 1);
        moved = true;
      }
      if (e.key === "ArrowRight") {
        col = Math.min(sheet.cols - 1, col + 1);
        moved = true;
      }
      if (moved) {
        e.preventDefault();
        if (e.shiftKey) {
          setSelection(state.selection.startRow, state.selection.startCol, row, col, { announceSelection: true });
        } else {
          setSelection(row, col, row, col, { announceSelection: true });
        }
      }
    });
  }

  function init() {
    const first = makeSheet("Sheet 1");
    state.sheets = [first];
    state.activeSheetId = first.id;
    recalcSheet(first);

    bindTableEvents();
    bindFillHandleEvents();
    bindToolbar();
    setZoom(state.zoom);
    setRibbonTab(state.activeRibbonTab, { silent: true });

    window.addEventListener("resize", refreshResponsiveNav);
    refreshResponsiveNav();

    renderAll();
  }

  init();
})();