// src/routes/Cleaning.jsx
import React, { useEffect, useMemo, useState } from "react";
import VersionHistory from "../components/VersionHistory";
import { saveVersion } from "../utils/versionStore";
import {
  detectColumnType,
  applyRuleToColumn,
  parseNumericValue,
} from "../utils/smartCleaner";

/**
 * Upgraded Cleaning component:
 * - auto-detect column type but allows user override
 * - shows type-specific rules and parameters
 * - preview & apply (per-column only)
 * - saves per-column versions via saveVersion("cleanedData", updatedTable, column)
 */

export default function Cleaning({ rawData, cleanedData, setCleanedData }) {
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [overrideType, setOverrideType] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState("");
  const [previewData, setPreviewData] = useState([]);
  const [ruleParams, setRuleParams] = useState({});

  useEffect(() => {
    setPreviewData([]);
  }, [rawData]);

  if (!rawData || rawData.length === 0)
    return (
      <div className="p-6 bg-gray-800 rounded-xl border border-purple-500/30 text-center">
        <h2 className="text-xl font-bold text-purple-400 mb-2">🧹 Data Cleaning</h2>
        <p className="text-gray-400">Please upload data first to start cleaning.</p>
      </div>
    );

  const columns = Object.keys(rawData[0] || {});

  const detectedTypes = useMemo(() => {
    const map = {};
    columns.forEach((col) => {
      const values = rawData.map((r) => (r ? r[col] : null));
      map[col] = detectColumnType(values);
    });
    return map;
  }, [rawData, columns]);

  const openModal = (col) => {
    setSelectedColumn(col);
    setOverrideType(null);
    setSelectedRule("");
    setRuleParams({});
    setPreviewData([]);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedColumn(null);
    setOverrideType(null);
    setSelectedRule("");
    setRuleParams({});
    setPreviewData([]);
  };

  const effectiveType = (col) => {
    return overrideType || detectedTypes[col] || "text";
  };

  const getRulesForType = (type) => {
    const rules = {
      number: [
        { id: "fill-mean", label: "Fill missing → Mean" },
        { id: "fill-median", label: "Fill missing → Median" },
        { id: "fill-mode", label: "Fill missing → Mode" },
        { id: "fill-zero", label: "Fill missing → 0" },
        { id: "remove-outliers", label: "Remove outliers (3σ)" },
        { id: "normalize", label: "Normalize (min-max)" },
        { id: "standardize", label: "Standardize (z-score)" },
        { id: "round:0", label: "Round (0 decimals)" },
        { id: "round:1", label: "Round (1 decimal)" },
        { id: "round:2", label: "Round (2 decimals)" },
      ],
      text: [
        { id: "trim", label: "Trim spaces" },
        { id: "lowercase", label: "Lowercase" },
        { id: "uppercase", label: "Uppercase" },
        { id: "removeSpecialChars", label: "Remove special characters" },
        { id: "removeNumbers", label: "Remove numbers" },
        { id: "replaceEmpty", label: "Replace empty with N/A" },
      ],
      date: [
        { id: "standardizeFormat", label: "Standardize to YYYY-MM-DD" },
        { id: "replaceInvalidWith", label: "Replace invalid with N/A" },
        { id: "ffill", label: "Forward fill missing dates" },
        { id: "bfill", label: "Backward fill missing dates" },
      ],
      category: [
        { id: "trim", label: "Trim spaces" },
        { id: "lowercase", label: "Lowercase" },
        { id: "replaceEmpty", label: "Replace empty with mode" },
      ],
    };
    return rules[type] || rules["text"];
  };

  // Preview selected rule (first 5 rows)
  const previewRule = (ruleId, params = {}) => {
    if (!selectedColumn) return;
    setSelectedRule(ruleId);
    setRuleParams(params);

    const type = effectiveType(selectedColumn);
    const sourceTable = cleanedData && cleanedData.length > 0 ? cleanedData : rawData;

    const { updatedTable } = applyRuleToColumn(sourceTable, selectedColumn, type, ruleId, params);

    const previewRows = updatedTable.slice(0, 5).map((r) => ({ [selectedColumn]: r[selectedColumn] }));
    setPreviewData(previewRows);
  };

  const applyRule = () => {
    if (!selectedColumn || !selectedRule) return;

    const type = effectiveType(selectedColumn);
    const sourceTable = cleanedData && cleanedData.length > 0 ? cleanedData : rawData;

    // save before applying
    saveVersion("cleanedData", sourceTable, selectedColumn);

    const { updatedTable } = applyRuleToColumn(sourceTable, selectedColumn, type, selectedRule, ruleParams);

    setCleanedData(updatedTable);

    // save after applying
    saveVersion("cleanedData", updatedTable, selectedColumn);

    closeModal();
  };

  const TypeSelector = ({ col }) => {
    const detected = detectedTypes[col] || "text";
    return (
      <div className="flex items-center gap-3 mb-3">
        <div className="text-sm text-gray-300">Detected: </div>
        <div className="px-2 py-1 bg-gray-800 rounded text-sm text-purple-200">{detected}</div>

        <div className="ml-4 text-sm text-gray-300">Override:</div>
        <select
          value={overrideType || ""}
          onChange={(e) => setOverrideType(e.target.value || null)}
          className="bg-gray-800 text-gray-200 px-2 py-1 rounded border border-gray-700"
        >
          <option value="">(use detected)</option>
          <option value="number">Number</option>
          <option value="text">Text</option>
          <option value="category">Category</option>
          <option value="date">Date</option>
        </select>
      </div>
    );
  };

  const dataToDisplay = cleanedData && cleanedData.length > 0 ? cleanedData : rawData;

  return (
    <div className="p-6 bg-gray-800 rounded-xl border border-purple-500/30">
      <h2 className="text-xl font-bold text-purple-400 mb-4">🧠 Smart Column Cleaning</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {columns.map((col) => (
          <div
            key={col}
            className="p-3 border border-purple-500/30 rounded-lg bg-gray-900/30 flex flex-col items-center text-center"
          >
            <p className="font-medium text-gray-200 mb-2 truncate">{col}</p>
            <div className="flex gap-2">
              <button
                onClick={() => openModal(col)}
                className="bg-purple-600/80 hover:bg-purple-700 transition text-sm px-4 py-1 rounded-lg"
              >
                Clean
              </button>
              <button
                onClick={() => {
                  const values = (cleanedData.length ? cleanedData : rawData).map((r) => r[col]);
                  const parsed = values.map((v) => parseNumericValue(v)).filter((p) => p.ok).map((p) => p.value);
                  const summary = parsed.length
                    ? `min:${Math.min(...parsed)} mean:${(parsed.reduce((a, b) => a + b, 0) / parsed.length).toFixed(2)} max:${Math.max(...parsed)}`
                    : "non-numeric or empty";
                  alert(`${col} summary:\n${summary}`);
                }}
                className="bg-gray-700/60 hover:bg-gray-700 transition text-sm px-3 py-1 rounded-lg"
              >
                Summary
              </button>
            </div>

            <VersionHistory
              type="cleanedData"
              column={col}
              onRevert={(data) => {
                if (data && data.length) {
                  setCleanedData(data);
                }
              }}
            />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-96 border border-purple-500/20 rounded-lg">
        <table className="min-w-full text-sm text-gray-300 border-collapse">
          <thead className="bg-purple-800/30 text-purple-300 sticky top-0">
            <tr>
              {columns.map((key) => (
                <th key={key} className="px-3 py-2 border-b border-purple-700/30 text-left">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataToDisplay.slice(0, 20).map((row, i) => (
              <tr key={i} className="hover:bg-purple-900/10">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-1 border-b border-purple-700/10">
                    {row[col] === null || row[col] === undefined ? "" : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && selectedColumn && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-purple-500/30 p-6 rounded-xl shadow-2xl max-w-xl w-full">
            <h3 className="text-lg font-semibold text-purple-400 mb-3">
              Clean Column: {selectedColumn} ({effectiveType(selectedColumn)})
            </h3>

            <TypeSelector col={selectedColumn} />

            <div className="flex flex-wrap gap-2 mb-4">
              {getRulesForType(effectiveType(selectedColumn)).map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    if (r.id.startsWith("round")) {
                      const d = parseInt(r.id.split(":")[1] || "0", 10);
                      setRuleParams({ ...ruleParams, round: d });
                      previewRule(r.id, { round: d });
                    } else if (r.id === "replaceEmpty" || r.id === "replaceInvalidWith") {
                      const val = prompt("Enter replacement value (e.g., N/A):", "N/A");
                      setRuleParams({ ...ruleParams, replaceEmpty: val, replaceInvalidWith: val });
                      previewRule(r.id, { replaceEmpty: val, replaceInvalidWith: val });
                    } else if (r.id === "remove-outliers") {
                      const k = Number(prompt("Outlier K (std multiplier)?", "3")) || 3;
                      setRuleParams({ ...ruleParams, outlierK: k });
                      previewRule(r.id, { outlierK: k });
                    } else {
                      previewRule(r.id, {});
                    }
                  }}
                  className={`px-3 py-1 rounded-lg text-sm transition ${selectedRule === r.id ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-purple-800/40"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Small preview */}
            {previewData.length > 0 && (
              <div className="border border-purple-500/20 rounded-lg max-h-48 overflow-auto text-xs text-gray-300 p-2 mb-4">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-purple-300">{selectedColumn} (preview)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i}>
                        <td>{row[selectedColumn] === null || row[selectedColumn] === undefined ? "" : String(row[selectedColumn])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={closeModal} className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
                Cancel
              </button>
              <button onClick={applyRule} className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
