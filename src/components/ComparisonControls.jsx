import React, { useMemo } from "react";

/**
 * ComparisonControls
 *
 * Props:
 *  - columns: string[] (available columns)
 *  - selected: string[] (selected columns)
 *  - setSelected: fn (update selected columns)
 *  - chartType: string ('auto'|'bar'|'line'|'scatter'|'area')
 *  - setChartType: fn
 *  - referenceColumn: string|null
 *  - setReferenceColumn: fn
 *
 * Behavior:
 *  - Multi-select columns using checkboxes
 *  - Select overall chart type (Auto by default)
 *  - Optionally pick a reference column to compare values against (useful for overlay comparisons)
 */
export default function ComparisonControls({
  columns,
  selected,
  setSelected,
  chartType,
  setChartType,
  referenceColumn,
  setReferenceColumn,
}) {
  const toggleColumn = (col) => {
    if (selected.includes(col)) {
      setSelected(selected.filter((c) => c !== col));
    } else {
      setSelected([...selected, col]);
    }
  };

  const allSelected = useMemo(() => selected.length === columns.length, [selected, columns]);

  const toggleAll = () => {
    if (allSelected) setSelected([]);
    else setSelected([...columns]);
  };

  return (
    <div className="mb-6 p-4 rounded-xl bg-gray-900/40 border border-purple-500/20">
      <div className="flex items-center justify-between mb-3 gap-4">
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 transition"
            onClick={toggleAll}
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          <div className="text-sm text-gray-300">Choose columns to compare</div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-400 mr-2">Chart type</label>
          <select
            className="bg-gray-800 text-gray-200 px-3 py-1 rounded-md border border-gray-700"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
          >
            <option value="auto">Auto</option>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="scatter">Scatter</option>
            <option value="area">Area</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 max-h-40 overflow-auto pr-2">
        {columns.map((col) => (
          <label
            key={col}
            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
              selected.includes(col) ? "bg-purple-700/20" : "bg-gray-900/20"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(col)}
              onChange={() => toggleColumn(col)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-200 truncate">{col}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-2">
        <label className="text-sm text-gray-300">Reference column (optional):</label>
        <select
          className="bg-gray-800 text-gray-200 px-3 py-1 rounded-md border border-gray-700"
          value={referenceColumn || ""}
          onChange={(e) => setReferenceColumn(e.target.value || null)}
        >
          <option value="">— none —</option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="text-xs text-gray-400 ml-auto">
          Tip: Reference column can be used to overlay comparison (if numeric).
        </div>
      </div>
    </div>
  );
}
