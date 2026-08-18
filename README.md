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
