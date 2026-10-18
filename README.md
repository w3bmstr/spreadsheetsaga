# SpreadSheetSaga

SpreadSheetSaga is a browser-based spreadsheet editor prototype inspired by Excel and Google Sheets.

## Features Included

- Editable grid with rows and columns
- Row/column add, delete, resize, and reorder
- Cell selection, range selection, drag-to-fill, and copy/paste
- Formatting: bold, italic, underline, font size, alignment, fill color, border color
- Number formats: general, currency, percent, decimals
- Data validation: number, integer, non-empty, list values
- Formula bar with basic syntax highlighting
- Formula engine functions:
  - SUM, AVERAGE, COUNT, IF, VLOOKUP, HLOOKUP, INDEX, MATCH, CONCAT, MIN, MAX
- Real-time formula evaluation with cycle detection
- Multiple sheet tabs (add, rename, remove)
- Context menu (right-click)
- Undo/redo
- Sort and filter tools
- Freeze rows/columns
- CSV import and export
- Basic charting (bar, line, pie) via Chart.js

## Run Locally

1. Open this folder in VS Code.
2. Start a local static server (choose one):
   - VS Code Live Server extension, then open `index.html`
   - Python: `python -m http.server 5500`
3. Open your browser at:
   - `http://localhost:5500`

## Usage Tips

- Click a cell and type directly, or edit with the formula bar.
- Use `=` to start formulas (example: `=SUM(A1:A10)`).
- Select ranges by click-drag.
- Use the blue square at the selection corner to drag-to-fill.
- Double-click row/column headers to resize.
- Right-click cells for row/column insertion and deletion.
- Use toolbar controls for formatting and data tools.

## Mobile Experience

On phones (and landscape phones) the app switches to a dedicated full-width layout:

- Edge-to-edge grid that fills the real visible viewport (handles iOS toolbars, notches, and the on-screen keyboard)
- Slim top bar with undo, redo (dimmed when there is nothing to undo/redo), and command search
- Bottom navigation: **Sheet / Format / Cells / Data / More**. Panels dock above the bar, so you can keep tapping cells while formatting; swipe the handle down to dismiss
- Sheet tabs along the bottom, auto-centered on the active sheet. Long-press a tab to rename it
- Touch gestures: tap to select, double-tap to edit in place, long-press for the cell menu (Copy / Paste / Insert / Delete / Clear), pinch to zoom, two-finger tap to undo
- Tap a column letter or row number to select the whole column or row
- Copy, Cut and Paste from the Cells panel
- Range-select toggle (dashed-square button beside the formula bar) to drag across cells, and a large drag handle for fill
- Apply / Cancel buttons while editing in the formula bar; formula inputs disable autocorrect and auto-capitalisation
- Short toasts confirm actions (Copied 3 x 2 cells, Add Row, Undo, ...)
- Automatic dark theme (the sheet "paper" stays light)
- Installable: add it to your home screen for a full-screen app with offline support (`manifest.webmanifest`, `sw.js`, `icons/`; service workers need HTTPS or localhost)
- Accessibility: labelled grid and formula bar, dialog semantics, Escape closes dialogs, focus is returned after a dialog closes, tool panel is inert while closed, 40px+ touch targets, 16px inputs to avoid iOS auto-zoom

Files: `mobile.css` (layout and themes), `mobile.js` (behavior), plus small touch hooks in `app.js`.
The mobile breakpoint is defined in three places that must match: `mobile.css`, `app.js` (`MOBILE_QUERY`), and `mobile.js` (`MOBILE_QUERY`).
