/* =========================================================
   SpreadSheetSaga - Mobile behavior layer
   Works purely through the DOM, so app.js stays the single
   source of truth for spreadsheet logic. Loaded after app.js.
   ========================================================= */
(() => {
  "use strict";

  // Keep in sync with mobile.css and app.js
  const MOBILE_QUERY = "(max-width: 767px), (max-height: 500px) and (pointer: coarse)";
  const mobileMQ = window.matchMedia(MOBILE_QUERY);
  const coarseMQ = window.matchMedia("(pointer: coarse)");

  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const sheetEl = $("#mSheet");
  const barEl = $("#mBar");
  if (!sheetEl || !barEl) {
    return;
  }

  const grid = $("#gridWrap");
  const table = $("#sheetTable");
  const handle = $("#fillHandle");
  const hint = $("#mHint");
  const selectBtn = $("#mSelectBtn");
  const sheetTabs = $("#sheetTabs");
  const titleEl = $("#mSheetTitle");
  const liveRegion = $("#liveRegion");

  const PANEL_TITLES = { format: "Format", cells: "Cells", data: "Data", more: "More" };
  sheetEl.inert = true;
  const isMobile = () => mobileMQ.matches;
  const touchEditing = () => isMobile() && coarseMQ.matches;

  let currentPanel = null;
  let selectMode = false;

  const toastEl = $("#mToast");
  let toastTimer = null;
  const toast = (message, ms = 1700) => {
    if (!toastEl || !message || !isMobile()) {
      return;
    }
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
  };

  const buzz = (ms = 8) => {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(ms);
      }
    } catch (err) { /* vibration is optional */ }
  };

  const announce = (message) => {
    if (!liveRegion) {
      return;
    }
    liveRegion.textContent = "";
    setTimeout(() => { liveRegion.textContent = message; }, 10);
  };

  /* ---------------------------------------------------------
     1. Real visible viewport (iOS keyboard / dynamic toolbars)
     --------------------------------------------------------- */
  function syncViewport() {
    if (!isMobile()) {
      root.style.removeProperty("--app-h");
      root.style.removeProperty("--app-top");
      return;
    }
    const vv = window.visualViewport;
    root.style.setProperty("--app-h", `${vv ? vv.height : window.innerHeight}px`);
    root.style.setProperty("--app-top", `${vv ? vv.offsetTop : 0}px`);
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncViewport);
    window.visualViewport.addEventListener("scroll", syncViewport);
  }
  window.addEventListener("resize", syncViewport);
  window.addEventListener("orientationchange", syncViewport);

  const isTextTarget = (el) => Boolean(el) && (
    (el.tagName === "INPUT" && !["checkbox", "color", "button", "range", "file"].includes(el.type))
    || el.tagName === "TEXTAREA"
    || el.isContentEditable
  );

  // Hide the bottom chrome while the keyboard is up so typing has room
  document.addEventListener("focusin", (e) => {
    if (!isMobile() || !isTextTarget(e.target)) {
      return;
    }
    root.classList.add("kbd");
    if (!e.target.closest("#mSheet")) {
      closePanel();
    }
  });

  document.addEventListener("focusout", () => {
    setTimeout(() => {
      if (!isTextTarget(document.activeElement)) {
        root.classList.remove("kbd");
        syncViewport();
      }
    }, 80);
  });

  /* ---------------------------------------------------------
     2. Bottom navigation + docked panel
     --------------------------------------------------------- */
  const navTabs = $$(".m-tab", barEl);

  function setTabState(panelId) {
    navTabs.forEach((tab) => {
      const on = panelId ? tab.dataset.panel === panelId : tab.hasAttribute("data-home");
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  function measureSheet() {
    const open = sheetEl.classList.contains("open");
    root.style.setProperty("--sheet-h", open ? `${sheetEl.offsetHeight}px` : "0px");
  }

  new ResizeObserver(measureSheet).observe(sheetEl);

  function openPanel(panelId) {
    if (!isMobile() || !PANEL_TITLES[panelId]) {
      return;
    }
    hideOtherPopovers();
    $$(".m-panel", sheetEl).forEach((panel) => {
      panel.hidden = panel.dataset.panel !== panelId;
      if (panel.dataset.panel === panelId) {
        panel.scrollTop = 0;
      }
    });
    titleEl.textContent = PANEL_TITLES[panelId];
    mirrorControls();
    sheetEl.inert = false;
    sheetEl.classList.add("open");
    sheetEl.setAttribute("aria-hidden", "false");
    root.classList.add("m-sheet-open");
    currentPanel = panelId;
    setTabState(panelId);
    measureSheet();
    // Keep the active cell visible after the grid shrinks
    requestAnimationFrame(() => setTimeout(keepActiveCellVisible, 260));
  }

  function closePanel() {
    if (!sheetEl.classList.contains("open") && !currentPanel) {
      return;
    }
    sheetEl.classList.remove("open");
    sheetEl.inert = true;
    sheetEl.setAttribute("aria-hidden", "true");
    root.classList.remove("m-sheet-open");
    root.style.setProperty("--sheet-h", "0px");
    currentPanel = null;
    setTabState(null);
  }

  function hideOtherPopovers() {
    const menu = $("#sheetMenuPanel");
    if (menu && !menu.hidden) {
      $("#sheetMenuBtn")?.click();
    }
  }

  function keepActiveCellVisible() {
    const td = $("td.active", table);
    if (td) {
      td.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  navTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      buzz();
      if (tab.hasAttribute("data-home")) {
        closePanel();
        return;
      }
      const id = tab.dataset.panel;
      if (currentPanel === id) {
        closePanel();
      } else {
        openPanel(id);
      }
    });
  });

  $("#mSheetClose")?.addEventListener("click", closePanel);

  // Swipe the grab handle down to dismiss
  const grab = $("#mSheetGrab");
  const dragArea = [grab, $(".m-sheet-head", sheetEl)];
  let dragStart = null;

  dragArea.forEach((el) => {
    el?.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) {
        return;
      }
      dragStart = e.clientY;
      el.setPointerCapture?.(e.pointerId);
      sheetEl.style.transition = "none";
    });
    el?.addEventListener("pointermove", (e) => {
      if (dragStart === null) {
        return;
      }
      sheetEl.style.transform = `translateY(${Math.max(0, e.clientY - dragStart)}px)`;
    });
    const finish = (e) => {
      if (dragStart === null) {
        return;
      }
      const dy = e.clientY - dragStart;
      dragStart = null;
      sheetEl.style.transition = "";
      sheetEl.style.transform = "";
      if (dy > 70) {
        closePanel();
      }
    };
    el?.addEventListener("pointerup", finish);
    el?.addEventListener("pointercancel", finish);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePanel();
      setSelectMode(false);
    }
  });

  /* ---------------------------------------------------------
     3. Proxy controls: panel controls drive the real toolbar
        controls, so app.js logic is reused 1:1
     --------------------------------------------------------- */
  const proxies = $$("[data-proxy]");
  const realOf = (el) => document.getElementById(el.dataset.proxy);

  proxies.forEach((el) => {
    const real = realOf(el);
    if (!real) {
      return;
    }
    if (el.tagName === "BUTTON") {
      el.addEventListener("click", () => {
        real.click();
        setTimeout(mirrorControls, 40);
        if (el.hasAttribute("data-close")) {
          closePanel();
        }
      });
    } else if (el.type === "checkbox") {
      el.addEventListener("change", () => {
        real.checked = el.checked;
        real.dispatchEvent(new Event("change", { bubbles: true }));
      });
    } else {
      el.addEventListener("change", () => {
        real.value = el.value;
        real.dispatchEvent(new Event("change", { bubbles: true }));
        setTimeout(mirrorControls, 40);
      });
    }
  });

  function mirrorControls() {
    proxies.forEach((el) => {
      const real = realOf(el);
      if (!real) {
        return;
      }
      if (el.tagName === "BUTTON") {
        if (el.disabled !== real.disabled) {
          el.disabled = real.disabled;
        }
        if (el.hasAttribute("data-toggle")) {
          el.setAttribute("aria-pressed", real.classList.contains("active-tool") ? "true" : "false");
        }
      } else if (el.type === "checkbox") {
        el.checked = real.checked;
      } else if (document.activeElement !== el && el.value !== real.value) {
        el.value = real.value;
      }
    });
    const zoomReset = $('[data-command="zoom-reset"]', sheetEl);
    const zoomValue = $("#zoomValue");
    if (zoomReset && zoomValue) {
      zoomReset.textContent = zoomValue.textContent || "100%";
    }
  }

  // Keep toggles (bold / italic / align) in step with the selected cell
  const toolbar = $("#toolbar");
  if (toolbar) {
    new MutationObserver(mirrorControls).observe(toolbar, {
      attributes: true,
      subtree: true,
      attributeFilter: ["class", "aria-pressed", "disabled"]
    });
  }

  // Close the panel for actions that open a modal / file picker
  $$("[data-command][data-close]", sheetEl).forEach((el) => {
    el.addEventListener("click", closePanel);
  });

  // Actions that don't map 1:1 onto an existing control
  function selectionSize() {
    const cells = $$("td.selected", table);
    if (!cells.length) {
      return { rows: 1, cols: 1 };
    }
    const rows = new Set(cells.map((td) => td.dataset.row)).size;
    const cols = new Set(cells.map((td) => td.dataset.col)).size;
    return { rows, cols };
  }

  function copySelection(cut) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast("Clipboard isn't available here");
      return;
    }
    const td = $("td.active", table) || $("td", table);
    if (!td) {
      return;
    }
    // app.js owns the TSV serialisation; reuse its Ctrl+C handler
    td.dispatchEvent(new KeyboardEvent("keydown", { key: "c", ctrlKey: true, bubbles: true, cancelable: true }));
    const { rows, cols } = selectionSize();
    const label = rows * cols === 1 ? "1 cell" : `${rows} x ${cols} cells`;
    if (cut) {
      $('#mSheet [data-command="clear-cell"]')?.click();
      toast(`Cut ${label}`);
    } else {
      toast(`Copied ${label}`);
    }
    buzz();
  }

  document.addEventListener("click", (e) => {
    const el = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!el) {
      return;
    }
    const act = el.dataset.act;
    if (act === "copy" || act === "cut") {
      copySelection(act === "cut");
      return;
    }
    const active = $(".sheet-tab.active", sheetTabs);
    if (!active) {
      return;
    }
    if (act === "rename-sheet") {
      $("span", active)?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    }
    if (act === "delete-sheet") {
      const close = $("button", active);
      if (!close) {
        toast("A workbook needs at least one sheet");
        return;
      }
      if (confirm(`Delete "${$("span", active)?.textContent || "this sheet"}"? You can undo this.`)) {
        close.click();
        toast("Sheet deleted. Undo is available");
      }
    }
  });

  // Header sub-title mirrors "Sheet 1 | A1"
  const statusPill = $("#sheetStatus");
  const sub = $("#mSub");
  if (statusPill && sub) {
    const copy = () => { sub.textContent = statusPill.textContent; };
    new MutationObserver(copy).observe(statusPill, { childList: true, characterData: true, subtree: true });
    copy();
  }

  // Keep the active sheet tab centred
  if (sheetTabs) {
    new MutationObserver(() => {
      const active = $(".sheet-tab.active", sheetTabs);
      if (active && isMobile()) {
        sheetTabs.scrollLeft = active.offsetLeft - (sheetTabs.clientWidth - active.offsetWidth) / 2;
      }
    }).observe(sheetTabs, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  // Surface app.js announcements ("Add Row", "Undo", ...) as a brief toast
  if (liveRegion) {
    const quiet = /^(Selected |Switched to |Context menu|.* tab$|Range selection)/;
    new MutationObserver(() => {
      const message = liveRegion.textContent.trim();
      if (message && !quiet.test(message)) {
        toast(message);
      }
    }).observe(liveRegion, { childList: true, characterData: true, subtree: true });
  }

  // Search / command palette closes the docked panel
  $("#commandPaletteBtn")?.addEventListener("click", closePanel);

  /* ---------------------------------------------------------
     4. Touch interactions on the grid
     --------------------------------------------------------- */
  const tdAt = (touch) => {
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    return el && el.closest ? el.closest("td") : null;
  };

  const fire = (type, target, touch) => {
    target.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0,
      clientX: touch.clientX,
      clientY: touch.clientY
    }));
  };

  // 4a. Range-select mode (drag across cells, like a selection handle)
  function setSelectMode(on) {
    if (selectMode === on) {
      return;
    }
    selectMode = on;
    selectBtn?.setAttribute("aria-pressed", String(on));
    root.classList.toggle("m-select-mode", on);
    if (hint) {
      hint.hidden = !on;
    }
    announce(on ? "Range selection on. Drag across cells." : "Range selection off");
  }

  selectBtn?.addEventListener("click", () => {
    buzz();
    setSelectMode(!selectMode);
  });
  $("#mHintDone")?.addEventListener("click", () => setSelectMode(false));

  let selecting = false;
  let filling = false;
  let pinching = null;

  const edgeScroll = (touch) => {
    const rect = grid.getBoundingClientRect();
    const edge = 44;
    const step = 16;
    if (touch.clientY > rect.bottom - edge) { grid.scrollTop += step; }
    if (touch.clientY < rect.top + edge + 30) { grid.scrollTop -= step; }
    if (touch.clientX > rect.right - edge) { grid.scrollLeft += step; }
    if (touch.clientX < rect.left + edge + 44) { grid.scrollLeft -= step; }
  };

  // Capture phase: runs before app.js's own touch handlers on the table
  grid.addEventListener("touchstart", (e) => {
    if (!isMobile()) {
      return;
    }

    // Two fingers: pinch-to-zoom the grid
    if (e.touches.length === 2) {
      const [a, b] = e.touches;
      pinching = { base: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), used: false };
      return;
    }

    if (e.touches.length !== 1) {
      return;
    }
    const touch = e.touches[0];

    // Fill / extend handle
    if (e.target === handle) {
      e.preventDefault();
      e.stopPropagation();
      filling = true;
      fire("mousedown", handle, touch);
      return;
    }

    // Range-select mode
    if (selectMode) {
      const td = tdAt(touch);
      if (!td) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      selecting = true;
      fire("mousedown", td, touch);
    }
  }, { capture: true, passive: false });

  grid.addEventListener("touchmove", (e) => {
    if (pinching && e.touches.length === 2) {
      e.preventDefault();
      e.stopPropagation();
      const [a, b] = e.touches;
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / pinching.base;
      if (ratio > 1.14) {
        $("#zoomInBtn")?.click();
        pinching.base = dist;
        pinching.used = true;
      } else if (ratio < 0.88) {
        $("#zoomOutBtn")?.click();
        pinching.base = dist;
        pinching.used = true;
      }
      return;
    }

    const touch = e.touches[0];
    if (!touch) {
      return;
    }

    if (filling) {
      e.preventDefault();
      e.stopPropagation();
      fire("mousemove", grid, touch);
      edgeScroll(touch);
      return;
    }

    if (selecting) {
      e.preventDefault();
      e.stopPropagation();
      const td = tdAt(touch);
      if (td) {
        fire("mousemove", td, touch);
      }
      edgeScroll(touch);
    }
  }, { capture: true, passive: false });

  const endTouch = (e) => {
    if (pinching) {
      // Swallow the end of a pinch so app.js's "two-finger tap = undo" never fires
      if (pinching.used) {
        e.stopPropagation();
      }
      if (e.touches.length === 0) {
        pinching = null;
      }
      return;
    }
    if (filling || selecting) {
      e.preventDefault();
      e.stopPropagation();
      filling = false;
      selecting = false;
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    }
  };

  grid.addEventListener("touchend", endTouch, { capture: true, passive: false });
  grid.addEventListener("touchcancel", endTouch, { capture: true, passive: false });

  // 4b. Double-tap a cell to edit it in place (single tap just selects)
  let tapStart = null;
  let lastTap = { time: 0, td: null };

  grid.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      tapStart = { x: t.clientX, y: t.clientY, time: Date.now() };
    } else {
      tapStart = null;
    }
  }, { passive: true });

  grid.addEventListener("touchend", (e) => {
    if (!touchEditing() || selectMode || !tapStart || e.changedTouches.length !== 1) {
      return;
    }
    const t = e.changedTouches[0];
    const moved = Math.hypot(t.clientX - tapStart.x, t.clientY - tapStart.y);
    const held = Date.now() - tapStart.time;
    tapStart = null;
    if (moved > 10 || held > 350) {
      lastTap = { time: 0, td: null };
      return;
    }
    const header = e.target.closest ? e.target.closest("th.col-header, th.row-header") : null;
    if (header) {
      selectLine(header);
      return;
    }
    const td = tdAt(t);
    if (!td) {
      return;
    }
    const now = Date.now();
    if (lastTap.td === td && now - lastTap.time < 360) {
      lastTap = { time: 0, td: null };
      beginEdit(td);
    } else {
      lastTap = { time: now, td };
    }
  }, { passive: true });

  // Tap a column letter / row number to select the whole line (active cell = first cell)
  function selectLine(header) {
    const rows = table.rows;
    let first;
    let last;
    if (header.classList.contains("col-header")) {
      const c = Number(header.dataset.col) + 1;
      first = rows[1]?.cells[c];
      last = rows[rows.length - 1]?.cells[c];
    } else {
      const r = Number(header.dataset.row) + 1;
      const cells = rows[r]?.cells;
      first = cells?.[1];
      last = cells?.[cells.length - 1];
    }
    if (!first || !last) {
      return;
    }
    const point = { clientX: 0, clientY: 0 };
    fire("mousedown", last, point);
    fire("mousemove", first, point);
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    buzz();
    const { rows: r, cols: c } = selectionSize();
    toast(header.classList.contains("col-header") ? `Column selected (${r} cells)` : `Row selected (${c} cells)`, 1200);
  }

  function beginEdit(td) {
    td.contentEditable = "true";
    td.setAttribute("autocapitalize", "off");
    td.setAttribute("autocorrect", "off");
    td.setAttribute("enterkeyhint", "done");
    td.focus();
    buzz();
    // once the keyboard has resized the viewport, make sure the cell isn't hidden behind it
    setTimeout(keepActiveCellVisible, 320);
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(td);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  // Back to "select only" once editing finishes
  table.addEventListener("focusout", (e) => {
    const td = e.target.closest ? e.target.closest("td") : null;
    if (td && touchEditing()) {
      td.contentEditable = "false";
    }
  });

  // 4c. After a long-press opens the context menu, swallow the mouse events some browsers
  // synthesize on release - otherwise they instantly dismiss the menu we just opened.
  const ctxMenu = $("#contextMenu");
  if (ctxMenu) {
    let touchActive = false;
    let suppress = false;
    let suppressTimer = null;

    document.addEventListener("touchstart", () => {
      touchActive = true;
      suppress = false;
      clearTimeout(suppressTimer);
    }, { capture: true, passive: true });

    document.addEventListener("touchend", () => {
      touchActive = false;
      if (suppress) {
        suppressTimer = setTimeout(() => { suppress = false; }, 700);
      }
    }, { capture: true, passive: true });

    new MutationObserver(() => {
      if (!ctxMenu.hidden && touchActive) {
        suppress = true;
      }
    }).observe(ctxMenu, { attributes: true, attributeFilter: ["hidden"] });

    ["mousedown", "click"].forEach((type) => {
      document.addEventListener(type, (e) => {
        if (suppress && e.isTrusted && !e.target.closest("#contextMenu")) {
          e.stopImmediatePropagation();
          e.preventDefault();
          if (type === "click") {
            suppress = false;
          }
        }
      }, true);
    });
  }

  /* ---------------------------------------------------------
     4d. Formula bar: explicit Apply / Cancel while editing
     --------------------------------------------------------- */
  const formulaInput = $("#formulaInput");
  const commitBtn = $("#mCommitBtn");
  const cancelBtn = $("#mCancelBtn");

  if (formulaInput && commitBtn && cancelBtn) {
    formulaInput.addEventListener("focus", () => root.classList.add("m-formula-editing"));
    formulaInput.addEventListener("blur", () => {
      setTimeout(() => {
        if (document.activeElement !== formulaInput) {
          root.classList.remove("m-formula-editing");
        }
      }, 60);
    });

    // keep the keyboard (and focus) up while the buttons are pressed
    [commitBtn, cancelBtn].forEach((btn) => {
      btn.addEventListener("pointerdown", (e) => e.preventDefault());
      btn.addEventListener("mousedown", (e) => e.preventDefault());
    });

    commitBtn.addEventListener("click", () => {
      buzz();
      formulaInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      formulaInput.blur();
    });

    cancelBtn.addEventListener("click", () => {
      formulaInput.blur();
      // re-selecting the active cell makes app.js reload its stored value into the bar
      const active = $("td.active", table);
      if (active) {
        fire("mousedown", active, { clientX: 0, clientY: 0 });
        document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      }
      toast("Edit cancelled", 1000);
    });
  }

  // Jumping to a cell: select the whole address on focus so typing replaces it
  $("#nameBox")?.addEventListener("focus", (e) => {
    if (isMobile()) {
      setTimeout(() => e.target.select(), 0);
    }
  });

  /* ---------------------------------------------------------
     4e. Sheet tabs: long-press to rename
     --------------------------------------------------------- */
  if (sheetTabs) {
    let pressTimer = null;
    let pressed = false;
    const cancelPress = () => clearTimeout(pressTimer);

    sheetTabs.addEventListener("pointerdown", (e) => {
      const tab = e.target.closest ? e.target.closest(".sheet-tab") : null;
      if (!tab || e.pointerType === "mouse" || e.target.closest("button")) {
        return;
      }
      pressed = false;
      pressTimer = setTimeout(() => {
        pressed = true;
        buzz(14);
        $("span", tab)?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      }, 600);
    });
    ["pointerup", "pointercancel", "pointermove", "pointerleave"].forEach((type) => {
      sheetTabs.addEventListener(type, cancelPress);
    });
    // Swallow the click that follows a long press so it doesn't also switch sheets
    sheetTabs.addEventListener("click", (e) => {
      if (pressed) {
        pressed = false;
        e.stopPropagation();
      }
    }, true);
  }

  /* ---------------------------------------------------------
     4f. Dialogs: focus, Escape, backdrop, focus trap
     --------------------------------------------------------- */
  const dialogs = ["chartModal", "selfFixReportModal", "commandPaletteModal"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  let lastOutsideFocus = null;
  document.addEventListener("focusin", (e) => {
    if (!e.target.closest(".modal")) {
      lastOutsideFocus = e.target;
    }
  });

  dialogs.forEach((modal) => {
    new MutationObserver(() => {
      if (!modal.hidden) {
        if (modal.id !== "commandPaletteModal") {
          modal.querySelector(".modal-head .btn")?.focus({ preventScroll: true });
        }
        return;
      }
      // Closed: hand focus back to where the user was (never to a cell - that would collapse a range)
      const target = lastOutsideFocus
        && document.contains(lastOutsideFocus)
        && !lastOutsideFocus.closest("td")
        && !lastOutsideFocus.closest("#mSheet")
        ? lastOutsideFocus
        : grid;
      target.focus({ preventScroll: true });
    }).observe(modal, { attributes: true, attributeFilter: ["hidden"] });
  });

  $("#chartModal")?.addEventListener("click", (e) => {
    if (e.target.id === "chartModal") {
      $("#closeChartModal")?.click();
    }
  });

  document.addEventListener("keydown", (e) => {
    const open = dialogs.find((m) => !m.hidden);
    if (!open) {
      return;
    }
    if (e.key === "Escape") {
      if (open.id === "chartModal") {
        $("#closeChartModal")?.click();
      } else if (open.id === "selfFixReportModal") {
        $("#closeSelfFixReportModal")?.click();
      }
      return;
    }
    if (e.key === "Tab") {
      const focusable = $$("button, input, select, [href], [tabindex]:not([tabindex='-1'])", open)
        .filter((el) => !el.disabled && el.offsetParent !== null);
      if (!focusable.length) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ---------------------------------------------------------
     5. Layout changes (rotate, resize across the breakpoint)
     --------------------------------------------------------- */
  function onLayoutChange() {
    syncViewport();
    if (!isMobile()) {
      closePanel();
      setSelectMode(false);
      root.classList.remove("kbd", "m-sheet-open");
    }
  }

  if (mobileMQ.addEventListener) {
    mobileMQ.addEventListener("change", onLayoutChange);
  } else if (mobileMQ.addListener) {
    mobileMQ.addListener(onLayoutChange);
  }

  syncViewport();
  mirrorControls();
})();
