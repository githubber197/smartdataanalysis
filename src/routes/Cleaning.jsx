// src/routes/Cleaning.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { detectColumnType, applyRuleToColumn, getChangedRows } from "../utils/dataHelpers";
import {
  saveVersion,
  saveTempVersion,
  getVersions,
  revertVersion,
  loadTempVersions,
  getLatest,
  clearVersions,
} from "../utils/versionStore";
import VersionHistory from "../components/VersionHistory"; // keep your component; it reads versions via getVersions

// small helper to shallow-diff two rows and return map of changed keys
function rowDiffKeys(a = {}, b = {}) {
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  const diffs = {};
  for (const k of keys) {
    const av = a[k] === undefined ? null : a[k];
    const bv = b[k] === undefined ? null : b[k];
    if (String(av) !== String(bv)) diffs[k] = { before: av, after: bv };
  }
  return diffs;
}

export default function Cleaning({ rawData = [], cleanedData = [], setCleanedData }) {
  // use cleanedData if exists, otherwise rawData
  const currentTable = (cleanedData && cleanedData.length) ? cleanedData : rawData;

  const [columnName, setColumnName] = useState("");
  const [detectedType, setDetectedType] = useState("");
  const [rule, setRule] = useState("");
  const [params, setParams] = useState({});
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);

  // history drawer UI
  const [drawerOpen, setDrawerOpen] = useState(false);

  // diff preview pairs: [{ before, after, diffs }]
  const [previewPairs, setPreviewPairs] = useState([]);

  // undo/redo stacks (store full snapshots)
  const undoStack = useRef([]);
  const redoStack = useRef([]);

  // small animation ref for revert
  const revertAnimating = useRef(false);

  useEffect(() => {
    // reset UI when raw/cleaned data changes (fresh upload or revert)
    setColumnName("");
    setDetectedType("");
    setRule("");
    setParams({});
    setSummary([]);
    setPreviewPairs([]);
    // clear undo/redo when fresh upload (but keep when revert)
    // we'll treat raw upload as a hard reset
    if (!cleanedData || !cleanedData.length) {
      undoStack.current = [];
      redoStack.current = [];
    }
  }, [rawData]);

  // columns from current table
  const columns = useMemo(() => (currentTable && currentTable.length ? Object.keys(currentTable[0]) : []), [currentTable]);

  useEffect(() => {
    if (!columnName) {
      setDetectedType("");
      return;
    }
    const values = currentTable.map((r) => r[columnName]);
    setDetectedType(detectColumnType(values));
    // reset rule selection on column change
    setRule("");
    setParams({});
  }, [columnName, currentTable]);

  // ----- options lists -----
  const numericOptions = [
    { id: "", label: "Select numeric method" },
    { id: "fill-mean", label: "Fill missing → Mean" },
    { id: "fill-median", label: "Fill missing → Median" },
    { id: "fill-mode", label: "Fill missing → Mode" },
    { id: "fill-zero", label: "Fill missing → Zero" },
    { id: "fill-custom", label: "Fill missing → Custom number" },
    { id: "ffill", label: "Forward fill (ffill)" },
    { id: "bfill", label: "Backward fill (bfill)" },
    { id: "remove-rows-with-missing", label: "Remove rows with missing" },
    { id: "remove-outliers", label: "Winsorize outliers (cap to IQR bounds)" },
    { id: "normalize", label: "Normalize (0–1)" },
    { id: "standardize", label: "Standardize (z-score)" },
    { id: "round", label: "Round (use param: decimals)" },
  ];

  const textOptions = [
    { id: "", label: "Select text method" },
    { id: "trim", label: "Trim whitespace" },
    { id: "lowercase", label: "Lowercase" },
    { id: "replace-empty", label: "Replace empty with..." },
    { id: "replace-value", label: "Replace value A → B" },
    { id: "remove-duplicates", label: "Remove duplicate entries (make null)" },
  ];

  const dateOptions = [
    { id: "", label: "Select date method" },
    { id: "fix-dates", label: "Standardize dates to YYYY-MM-DD" },
  ];

  // params UI
  const renderParamsUI = () => {
    if (!rule) return null;
    if (rule === "fill-custom") {
      return (
        <input type="number" step="any" placeholder="Custom number"
          value={params.custom ?? ""} onChange={(e) => setParams({ ...params, custom: Number(e.target.value) })}
          className="border p-2 rounded w-full" />
      );
    }
    if (rule === "round") {
      return (
        <input type="number" placeholder="Decimals" value={params.decimals ?? 0}
          onChange={(e) => setParams({ ...params, decimals: Number(e.target.value) })}
          className="border p-2 rounded w-full" />
      );
    }
    if (rule === "replace-empty") {
      return (
        <input type="text" placeholder="Replace empty with..." value={params.replaceWith ?? ""}
          onChange={(e) => setParams({ ...params, replaceWith: e.target.value })} className="border p-2 rounded w-full" />
      );
    }
    if (rule === "replace-value") {
      return (
        <div className="flex gap-2">
          <input placeholder="From" value={params.from ?? ""} onChange={(e) => setParams({ ...params, from: e.target.value })} className="border p-2 rounded w-1/2" />
          <input placeholder="To" value={params.to ?? ""} onChange={(e) => setParams({ ...params, to: e.target.value })} className="border p-2 rounded w-1/2" />
        </div>
      );
    }
    return null;
  };

  // push current snapshot onto undo stack (caller should call before making changes)
  const pushUndoSnapshot = (snapshot) => {
    undoStack.current.unshift(snapshot);
    // cap stack
    if (undoStack.current.length > 20) undoStack.current = undoStack.current.slice(0, 20);
    // clear redo on new action
    redoStack.current = [];
  };

  // handle undo: pop undo stack and push current to redo
  const handleUndo = () => {
    if (!undoStack.current.length) return;
    const prev = undoStack.current.shift();
    const current = JSON.parse(JSON.stringify(currentTable || []));
    redoStack.current.unshift(current);
    // persist
    if (typeof setCleanedData === "function") setCleanedData(prev);
    setSummary([`Undo: restored previous snapshot.`]);
    setPreviewPairs([]);
    // small animation flag
    revertAnimating.current = true;
    setTimeout(() => (revertAnimating.current = false), 600);
  };

  const handleRedo = () => {
    if (!redoStack.current.length) return;
    const next = redoStack.current.shift();
    const current = JSON.parse(JSON.stringify(currentTable || []));
    undoStack.current.unshift(current);
    if (typeof setCleanedData === "function") setCleanedData(next);
    setSummary([`Redo: reapplied snapshot.`]);
    setPreviewPairs([]);
  };

  // Apply rule (saves versions, pushes undo snapshot)
  const handleApply = () => {
    if (!columnName || !rule) return;
    setLoading(true);
    try {
      // snapshot current
      const snapshot = JSON.parse(JSON.stringify(currentTable || []));
      // save global & column-specific version
      saveVersion("cleaning", snapshot, { column: columnName, rule, params, note: `Before ${rule} on ${columnName}` });
      // session quick
      saveTempVersion("cleaning", snapshot, { column: columnName, rule });

      // push to undo stack
      pushUndoSnapshot(snapshot);

      // run rule (apply to snapshot)
      const { updatedTable } = applyRuleToColumn(snapshot, columnName, detectedType, rule, params);

      // persist updated table to app via setter
      if (typeof setCleanedData === "function") setCleanedData(updatedTable);

      // build preview pairs (first 10 changed)
      const changed = getChangedRows(snapshot, updatedTable);
      const pairs = changed.slice(0, 10).map((newRow) => {
        const idx = updatedTable.indexOf(newRow);
        const oldRow = idx >= 0 && snapshot[idx] ? snapshot[idx] : null;
        const diffs = rowDiffKeys(oldRow || {}, newRow || {});
        return { before: oldRow, after: newRow, diffs };
      });
      setPreviewPairs(pairs);
      setSummary([`Applied '${rule}' to '${columnName}' — saved pre-change version.`]);
    } catch (err) {
      console.error("apply error", err);
      setSummary([`Error applying rule: ${err?.message || err}`]);
    } finally {
      setLoading(false);
    }
  };

  // Revert handler triggered by VersionHistory component
  // Accepts either: restoredSnapshot (object) OR { type, id, column } from history UI
  const handleRevertFromHistory = (payload) => {
    if (!payload) return;
    // If payload is a snapshot (restored data)
    if (Array.isArray(payload)) {
      // push current to undo
      const cur = JSON.parse(JSON.stringify(currentTable || []));
      undoStack.current.unshift(cur);
      if (typeof setCleanedData === "function") setCleanedData(payload);
      setSummary([`Reverted to selected version.`]);
      setPreviewPairs([]);
      // animate
      revertAnimating.current = true;
      setTimeout(() => (revertAnimating.current = false), 600);
      return;
    }

    // If VersionHistory used revertVersion internally and returns nothing, we attempt to fetch latest by id
    // Accept payload: { type, id, column } or id string/number
    if (typeof payload === "object" && (payload.type || payload.id || payload.column)) {
      const { type = "cleaning", id, column } = payload;
      const restored = revertVersion(type, id, column);
      if (restored) {
        const cur = JSON.parse(JSON.stringify(currentTable || []));
        undoStack.current.unshift(cur);
        if (typeof setCleanedData === "function") setCleanedData(restored);
        setSummary([`Reverted to version ${id || "(index)"} for ${column || "global"}.`]);
        setPreviewPairs([]);
        revertAnimating.current = true;
        setTimeout(() => (revertAnimating.current = false), 600);
      } else {
        setSummary([`Failed to revert version.`]);
      }
      return;
    }

    // If payload is id or index number (fallback)
    if (typeof payload === "string" || typeof payload === "number") {
      const restored = revertVersion("cleaning", payload, columnName || null);
      if (restored) {
        const cur = JSON.parse(JSON.stringify(currentTable || []));
        undoStack.current.unshift(cur);
        if (typeof setCleanedData === "function") setCleanedData(restored);
        setSummary([`Reverted cleaning to selected version.`]);
        setPreviewPairs([]);
        revertAnimating.current = true;
        setTimeout(() => (revertAnimating.current = false), 600);
      }
      return;
    }
  };

  // Clear all versions UI (dangerous) - optional admin action
  const handleClearAllVersions = () => {
    if (!confirm("Clear all saved cleaning versions? This cannot be undone.")) return;
    try {
      clearVersions("cleaning");
      setSummary(["All cleaning versions cleared."]);
    } catch (e) {
      console.error(e);
      setSummary(["Failed to clear versions. See console."]);
    }
  };

  // Render table diff preview: highlight changed cells
  const DiffTable = ({ pairs = [] }) => {
    if (!pairs || pairs.length === 0) return <p className="text-gray-500">No changes to preview.</p>;
    const cols = Array.from(new Set(pairs.flatMap((p) => Object.keys(p.after || p.before || {}))));
    return (
      <div className={`overflow-auto max-h-[480px] border rounded ${revertAnimating.current ? "ring-4 ring-purple-200/40" : ""}`}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="border px-2 py-1">#</th>
              {cols.map((c) => (
                <React.Fragment key={c}>
                  <th className="border px-2 py-1">{c} (before)</th>
                  <th className="border px-2 py-1">{c} (after)</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {pairs.map((p, i) => (
              <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                <td className="border px-2 py-1 align-top">{i + 1}</td>
                {cols.map((c) => {
                  const before = (p.before && p.before[c]) ?? "—";
                  const after = (p.after && p.after[c]) ?? "—";
                  const changed = String(before) !== String(after);
                  return (
                    <React.Fragment key={c}>
                      <td className={`border px-2 py-1 align-top ${changed ? "bg-yellow-100" : ""}`}>{String(before)}</td>
                      <td className={`border px-2 py-1 align-top ${changed ? "bg-green-100 font-semibold" : ""}`}>{String(after)}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // UI
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cleaning — Before → After (advanced)</h1>

        <div className="flex items-center gap-3">
          <button onClick={() => setDrawerOpen((d) => !d)} className="px-3 py-1 border rounded">
            {drawerOpen ? "Close History" : "Open History"}
          </button>
          <button onClick={handleUndo} className="px-3 py-1 border rounded" disabled={!undoStack.current.length}>Undo</button>
          <button onClick={handleRedo} className="px-3 py-1 border rounded" disabled={!redoStack.current.length}>Redo</button>
          <button onClick={handleClearAllVersions} className="px-3 py-1 rounded bg-red-600 text-white">Clear Versions</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: controls */}
        <div className="col-span-1 space-y-4">
          <div className="p-4 border rounded">
            <label className="block mb-2 font-medium">Column</label>
            <select value={columnName} onChange={(e) => setColumnName(e.target.value)} className="w-full border p-2 rounded">
              <option value="">Select column</option>
              {columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            {columnName && (
              <div className="mt-3 text-sm text-gray-600">
                Detected type: <span className="font-medium">{detectedType}</span>
              </div>
            )}

            <div className="mt-4">
              <small className="text-gray-500">Temporary versions (session):</small>
              <ul className="text-xs mt-2">
                {Object.entries(loadTempVersions()).filter(([k]) => k.startsWith("cleaning")).slice(0,5).map(([k,v],i) => (
                  <li key={k} className="text-gray-700">{k} — {v.length} snapshots</li>
                ))}
                {!Object.keys(loadTempVersions()).filter(k => k.startsWith("cleaning")).length && <li className="text-gray-500">None</li>}
              </ul>
            </div>
          </div>

          {columnName && (
            <div className="p-4 border rounded">
              <label className="block mb-2 font-medium">Method</label>

              {detectedType === "number" && (
                <select value={rule} onChange={(e) => setRule(e.target.value)} className="w-full border p-2 rounded">
                  {numericOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              )}

              {(detectedType === "text" || detectedType === "category") && (
                <select value={rule} onChange={(e) => setRule(e.target.value)} className="w-full border p-2 rounded">
                  {textOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              )}

              {detectedType === "date" && (
                <select value={rule} onChange={(e) => setRule(e.target.value)} className="w-full border p-2 rounded">
                  {dateOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              )}

              <div className="mt-3">{renderParamsUI()}</div>

              <div className="mt-4 flex gap-2">
                <button onClick={handleApply} disabled={!rule || loading} className="flex-1 px-3 py-2 bg-blue-600 text-white rounded">
                  {loading ? "Applying..." : "Apply & Save Version"}
                </button>
                <button onClick={() => {
                  // quick save current snapshot without changes (user action)
                  const snap = JSON.parse(JSON.stringify(currentTable || []));
                  const entry = saveVersion("cleaning", snap, { column: columnName, rule: "snapshot", note: "Manual snapshot" });
                  saveTempVersion("cleaning", snap, { column: columnName, rule: "snapshot" });
                  setSummary([`Saved manual snapshot (${entry.id}).`]);
                }} className="px-3 py-2 border rounded">Save Snapshot</button>
              </div>
            </div>
          )}
        </div>

        {/* Middle: preview */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          {/* Summary */}
          {summary.length > 0 && (
            <div className="p-3 rounded border">
              <strong>Summary</strong>
              <ul className="list-disc ml-5 mt-2">
                {summary.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* preview pairs */}
          <div className="p-4 border rounded">
            <h3 className="font-semibold mb-3">Preview (Before → After) — first 10 changed rows</h3>
            <DiffTable pairs={previewPairs} />
          </div>
        </div>
      </div>

      {/* Right drawer (collapsible) — fully unmounted when closed so it won't leave a semi-transparent ghost */}
      {drawerOpen && (
        <div className="fixed top-24 right-4 z-40">
          <div className="bg-white dark:bg-gray-900 border rounded-xl shadow-lg w-96 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="text-sm font-semibold">Version History — Cleaning</div>
              <button onClick={() => setDrawerOpen(false)} className="text-xs px-2 py-1 border rounded">Close</button>
            </div>

            <div className="p-3 max-h-[60vh] overflow-auto space-y-3">
              <div>
                <div className="text-xs text-gray-500 mb-2">Column versions</div>
                {columns.length === 0 && <div className="text-gray-500 text-xs">No columns</div>}
                {columns.map((col) => {
                  const list = getVersions("cleaning", col);
                  return (
                    <div key={col} className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-sm">{col}</div>
                        <div className="text-xs text-gray-500">{list.length} saved</div>
                      </div>
                      <div className="flex gap-2 overflow-auto">
                        {list.slice(0, 6).map((v) => (
                          <button key={v.id} onClick={() => {
                            // revert by id
                            handleRevertFromHistory({ type: "cleaning", id: v.id, column: col });
                          }} className="px-2 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100">
                            {new Date(v.timestamp).toLocaleString()}
                          </button>
                        ))}
                        {!list.length && <div className="text-xs text-gray-400">—</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-2">Global snapshots</div>
                {getVersions("cleaning", null).slice(0, 10).map((v) => (
                  <div key={v.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="text-xs">
                      <div className="font-medium">{v.meta?.note || v.meta?.rule || "snapshot"}</div>
                      <div className="text-gray-500">{new Date(v.timestamp).toLocaleString()}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => {
                        handleRevertFromHistory({ type: "cleaning", id: v.id });
                      }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Revert</button>
                    </div>
                  </div>
                ))}
                {!getVersions("cleaning", null).length && <div className="text-xs text-gray-400">No global snapshots</div>}
              </div>
            </div>

            <div className="p-3 border-t flex items-center justify-between">
              <button onClick={() => {
                // convenience: restore latest column version for selected column
                if (!columnName) {
                  alert("Select a column first to restore its latest version.");
                  return;
                }
                const latest = getLatest("cleaning", columnName);
                if (!latest) { alert("No versions for this column"); return; }
                handleRevertFromHistory(latest.data);
              }} className="px-3 py-2 border rounded text-sm">Restore latest for selected</button>

              <button onClick={() => {
                if (!confirm("Export versions to console? (dev)") ) return;
                console.log("vc store dump:", JSON.parse(JSON.stringify(localStorage.getItem("vc_store_v2"))));
              }} className="px-3 py-2 border rounded text-sm">Debug</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
