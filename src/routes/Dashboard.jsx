// src/routes/Dashboard.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut, Scatter } from "react-chartjs-2";
import { registerChart, unregisterChart } from "../utils/ChartRegistry";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler
);

const PALETTE = [
  "#60A5FA", "#34D399", "#F97316", "#F472B6", "#A78BFA",
  "#FDE68A", "#FCA5A5", "#93C5FD", "#7DD3FC", "#C7B8F5",
  "#86EFAC", "#FBCFE8"
];

// ----------------- Floating Mode Toggle (Icon + Text) -----------------
function FloatingModeToggle({ mode, setMode }) {
  const items = [
    { id: "individual", label: "Charts", emoji: "📊" },
    { id: "comparison", label: "Compare", emoji: "🔎" },
    { id: "heatmap", label: "Heatmap", emoji: "🔥" },
    { id: "widgets", label: "Widgets", emoji: "🧩" },
  ];

  return (
    <nav
      aria-label="Dashboard mode toggle"
      className="
        fixed right-4 top-4 sm:top-6 md:top-6 z-[99999]
        bg-white/85 dark:bg-gray-900/85
        backdrop-blur-md
        shadow-lg border border-gray-200 dark:border-gray-700
        rounded-full px-3 py-1 flex items-center gap-2
        max-w-max
      "
    >
      {items.map((it) => {
        const active = mode === it.id;
        return (
          <button
            key={it.id}
            onClick={() => setMode(it.id)}
            aria-pressed={active}
            className={`flex items-center gap-2 px-3 py-1 rounded-full transition text-sm whitespace-nowrap
              ${active ? "bg-purple-600 text-white shadow-md" : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            title={it.label}
          >
            <span className="text-lg">{it.emoji}</span>
            <span className="font-medium">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ----------------- Main Dashboard Component -----------------
export default function Dashboard({ cleanedData }) {
  // top padding so content doesn't get hidden by navbar (if any)
  const TOP_PAD = "pt-20";

  const [mode, setMode] = useState("individual"); // individual | comparison | heatmap | widgets
  const [showAll, setShowAll] = useState(false);
  const [expandedChart, setExpandedChart] = useState(null);
  const [compareSelection, setCompareSelection] = useState([]);
  const [compareView, setCompareView] = useState("overlay"); // overlay | side-by-side | scatter-matrix
  const [forcedChartType, setForcedChartType] = useState({});
  const chartRefs = useRef([]);
  const expandedRef = useRef(null);

  // guard
  if (!Array.isArray(cleanedData) || cleanedData.length === 0) {
    return <p className="text-gray-400">Upload and clean data first.</p>;
  }

  // utils
  const safeNum = (v) => {
    if (v === null || v === undefined) return NaN;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const columns = useMemo(() => Object.keys(cleanedData[0] || {}), [cleanedData]);

  const numericColumns = useMemo(
    () => columns.filter((c) => cleanedData.some((r) => !Number.isNaN(safeNum(r[c])))),
    [columns, cleanedData]
  );

  const parseNumericColumn = (col) =>
    cleanedData.map((r) => {
      const n = safeNum(r[col]);
      return Number.isNaN(n) ? null : n;
    });

  const statsFor = (arr) => {
    const vals = arr.filter((x) => x !== null);
    const count = arr.length;
    const nonNull = vals.length;
    if (!vals.length) return { count, nonNull, sum: 0, mean: null, median: null, min: null, max: null, std: null };
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / vals.length;
    const sorted = [...vals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const variance = vals.reduce((s, x) => s + (x - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance);
    return { count, nonNull, sum, mean, median, min, max, std };
  };

  const detectIQROutliers = (arr) => {
    const vals = arr.filter((x) => x !== null).sort((a, b) => a - b);
    if (vals.length < 4) return { lower: null, upper: null, outliers: [] };
    const q1 = vals[Math.floor(vals.length * 0.25)];
    const q3 = vals[Math.floor(vals.length * 0.75)];
    const iqr = q3 - q1 || 0;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    const outliers = arr.map((v, i) => ({ v, i })).filter((x) => x.v !== null && (x.v < lower || x.v > upper));
    return { lower, upper, outliers };
  };

  const pearson = (a, b) => {
    const paired = a.map((v, i) => ({ x: v, y: b[i] })).filter((p) => p.x !== null && p.y !== null && !Number.isNaN(p.x) && !Number.isNaN(p.y));
    const n = paired.length;
    if (n < 2) return 0;
    const meanX = paired.reduce((s, p) => s + p.x, 0) / n;
    const meanY = paired.reduce((s, p) => s + p.y, 0) / n;
    const num = paired.reduce((s, p) => s + (p.x - meanX) * (p.y - meanY), 0);
    const denX = Math.sqrt(paired.reduce((s, p) => s + (p.x - meanX) ** 2, 0));
    const denY = Math.sqrt(paired.reduce((s, p) => s + (p.y - meanY) ** 2, 0));
    const denom = denX * denY;
    if (denom === 0) return 0;
    return num / denom;
  };

  const trendSlope = (arr) => {
    const pts = arr.map((v, i) => ({ x: i, y: v })).filter((p) => p.y !== null && !Number.isNaN(p.y));
    if (pts.length < 2) return 0;
    const n = pts.length;
    const sx = pts.reduce((s, p) => s + p.x, 0);
    const sy = pts.reduce((s, p) => s + p.y, 0);
    const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
    const sx2 = pts.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sx2 - sx * sx;
    if (denom === 0) return 0;
    return (n * sxy - sx * sy) / denom;
  };

  // KPI selection
  const kpis = useMemo(() => {
    const metrics = numericColumns.map((col) => {
      const arr = parseNumericColumn(col);
      const s = statsFor(arr);
      const out = detectIQROutliers(arr);
      return { col, ...s, outliers: out.outliers.length };
    });

    const bySum = [...metrics].sort((a, b) => (b.sum || 0) - (a.sum || 0))[0];
    const byMean = [...metrics].sort((a, b) => (b.mean || 0) - (a.mean || 0))[0];
    const byStd = [...metrics].sort((a, b) => (b.std || 0) - (a.std || 0))[0];
    const byMissing = [...metrics].sort((a, b) => (b.count - b.nonNull) - (a.count - a.nonNull))[0];

    const chosen = [];
    if (bySum) chosen.push({ label: `Total ${bySum.col}`, value: Number((bySum.sum || 0).toFixed(2)) });
    if (byMean && byMean.col !== bySum.col) chosen.push({ label: `Avg ${byMean.col}`, value: Number((byMean.mean || 0).toFixed(2)) });
    if (byStd && ![bySum.col, byMean.col].includes(byStd.col)) chosen.push({ label: `Std ${byStd.col}`, value: Number((byStd.std || 0).toFixed(2)) });
    if (byMissing && ![bySum.col, byMean.col, byStd.col].includes(byMissing.col)) chosen.push({ label: `Missing ${byMissing.col}`, value: byMissing.count - byMissing.nonNull });

    for (const m of metrics) {
      if (chosen.length >= 4) break;
      if (!chosen.some((c) => c.label.includes(m.col))) chosen.push({ label: `${m.col}`, value: m.mean !== null ? Number(m.mean.toFixed(2)) : "—" });
    }
    return chosen.slice(0, 4);
  }, [numericColumns, cleanedData]);

  // Build individual charts
  const MAX_CHARTS = 6;
  const individualCharts = useMemo(() => {
    const cols = showAll ? numericColumns : numericColumns.slice(0, MAX_CHARTS);
    return cols.map((col, idx) => {
      const arr = parseNumericColumn(col);
      const s = statsFor(arr);
      const out = detectIQROutliers(arr);
      let type = "bar";
      const uniqueCount = new Set(cleanedData.map((r) => String(r[col] ?? ""))).size;
      if (uniqueCount > 30) type = "line";
      if (uniqueCount <= 6) type = "doughnut";

      const idCol = columns.find((c) => /(id|_id|code|number)$/i.test(c) &&
        new Set(cleanedData.map((r) => String(r[c] || ""))).size === cleanedData.length);

      let labels; let xLabel;
      if (idCol) {
        labels = cleanedData.map((r) => String(r[idCol] ?? ""));
        xLabel = idCol;
      } else {
        const catCol = columns.find((c) => c !== col && cleanedData.some((r) => isNaN(safeNum(r[c]))));
        if (catCol) {
          labels = cleanedData.map((r) => String(r[catCol] ?? `Row ${cleanedData.indexOf(r) + 1}`));
          xLabel = catCol;
        } else {
          labels = cleanedData.map((_, i) => `Row ${i + 1}`);
          xLabel = "Row";
        }
      }

      const color = PALETTE[idx % PALETTE.length];
      const data = type === "doughnut"
        ? { labels, datasets: [{ data: arr.map((v) => (v === null ? 0 : v)), backgroundColor: PALETTE }] }
        : {
            labels,
            datasets: [
              {
                label: col,
                data: arr.map((v) => (v === null ? 0 : v)),
                backgroundColor: type === "line" ? color + "66" : color + "99",
                borderColor: color,
                borderWidth: 1.5,
                tension: type === "line" ? 0.35 : 0,
              },
            ],
          };

      const explanation = `${col}: mean=${s.mean !== null ? s.mean.toFixed(2) : "—"}, median=${s.median !== null ? s.median.toFixed(2) : "—"}, outliers=${out.outliers.length}.`;

      return { title: col, type, data, xLabel, stats: s, outliers: out.outliers, explanation, idx };
    });
  }, [numericColumns, cleanedData, columns, showAll]);

  // Comparison builders
  const buildOverlayComparison = (cols) => {
    const labels = cleanedData.map((_, i) => `Row ${i + 1}`);
    const datasets = cols.map((col, i) => ({
      label: col,
      data: cleanedData.map((r) => {
        const n = safeNum(r[col]);
        return Number.isNaN(n) ? 0 : n;
      }),
      borderColor: `hsl(${(i * 60) % 360} 70% 45%)`,
      backgroundColor: `hsl(${(i * 60) % 360} 70% 60%)`,
      tension: 0.35,
      fill: false,
    }));
    return { labels, datasets };
  };

  const buildSideBySideBar = (cols) => {
    const labels = cleanedData.map((_, i) => `Row ${i + 1}`);
    const datasets = cols.map((col, i) => ({
      label: col,
      data: cleanedData.map((r) => {
        const n = safeNum(r[col]);
        return Number.isNaN(n) ? 0 : n;
      }),
      backgroundColor: `hsl(${(i * 60) % 360} 65% 60%)`,
    }));
    return { labels, datasets };
  };

  const buildScatterPairs = (cols) => {
    const pairs = [];
    for (let i = 0; i < cols.length; i++) {
      for (let j = i + 1; j < cols.length; j++) {
        const xCol = cols[i], yCol = cols[j];
        const points = cleanedData.map((r) => {
          const x = safeNum(r[xCol]);
          const y = safeNum(r[yCol]);
          return (!Number.isNaN(x) && !Number.isNaN(y)) ? { x, y } : null;
        }).filter(Boolean);
        pairs.push({ xCol, yCol, points });
      }
    }
    return pairs;
  };

  const buildCorrelationMatrix = (cols) => {
    const matrix = [];
    for (let i = 0; i < cols.length; i++) {
      const row = [];
      for (let j = 0; j < cols.length; j++) {
        const a = parseNumericColumn(cols[i]);
        const b = parseNumericColumn(cols[j]);
        const val = pearson(a, b);
        row.push(Number.isFinite(val) ? val : 0);
      }
      matrix.push(row);
    }
    return matrix;
  };

  // register canvases for Reports / export
  useEffect(() => {
    chartRefs.current = chartRefs.current.slice(0, Math.max(individualCharts.length, 6));
    chartRefs.current.forEach((ref, i) => {
      try {
        let canvas = null;
        const candidate = ref?.current;
        if (candidate) {
          if (candidate.canvas instanceof HTMLCanvasElement) canvas = candidate.canvas;
          else if (candidate.ctx && candidate.ctx.canvas instanceof HTMLCanvasElement) canvas = candidate.ctx.canvas;
          else if (candidate instanceof HTMLCanvasElement) canvas = candidate;
          else if (candidate.querySelector) canvas = candidate.querySelector("canvas");
        }
        if (!canvas) {
          canvas = document.getElementById(`dashboard-chart-${i+1}`);
        }
        if (canvas && canvas instanceof HTMLCanvasElement) {
          canvas.id = `dashboard-chart-${i+1}`;
          if (registerChart) registerChart(canvas.id, canvas);
        }
      } catch (e) {}
    });

    // expanded canvas fallback
    try {
      const candidate = expandedRef?.current;
      let expCanvas = null;
      if (candidate) {
        if (candidate.canvas instanceof HTMLCanvasElement) expCanvas = candidate.canvas;
        else if (candidate.ctx && candidate.ctx.canvas instanceof HTMLCanvasElement) expCanvas = candidate.ctx.canvas;
        else if (candidate instanceof HTMLCanvasElement) expCanvas = candidate;
        else if (candidate.querySelector) expCanvas = candidate.querySelector("canvas");
      } else {
        expCanvas = document.getElementById("expanded-dashboard-chart");
      }
      if (expCanvas && expCanvas instanceof HTMLCanvasElement) {
        expCanvas.id = "expanded-dashboard-chart";
        if (registerChart) registerChart("expanded-dashboard-chart", expCanvas);
      }
    } catch (e) {}

    return () => {
      for (let i = 0; i < individualCharts.length; i++) {
        try { if (unregisterChart) unregisterChart(`dashboard-chart-${i+1}`); } catch(e) {}
      }
      try { if (unregisterChart) unregisterChart("expanded-dashboard-chart"); } catch(e) {}
    };
  }, [individualCharts.length, expandedChart]);

  // download helper
  const downloadCanvas = (canvas) => {
    try {
      if (!canvas) { alert("Canvas not found"); return; }
      const url = canvas.toDataURL && canvas.toDataURL();
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `chart.png`;
        a.click();
      } else if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          const u = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = u;
          a.download = `chart.png`;
          a.click();
          URL.revokeObjectURL(u);
        }, "image/png");
      } else alert("Export not available");
    } catch (err) {
      console.error(err);
      alert("Failed to export chart");
    }
  };

  // compare toggle selection
  const toggleCompareCol = (col) => {
    setCompareSelection((prev) => (prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]).slice(0, 6));
  };

  const compareCols = compareSelection.length ? compareSelection : numericColumns.slice(0, 3);
  const scatterPairs = useMemo(() => buildScatterPairs(compareCols), [compareCols, cleanedData]);
  const corrMatrix = useMemo(() => buildCorrelationMatrix(compareCols), [compareCols, cleanedData]);

  // small helpers
  const slopeToText = (s) => (s > 0.0001 ? "increasing" : s < -0.0001 ? "decreasing" : "stable");

  // render
  return (
    <div className={`${TOP_PAD} relative px-4`}>
      {/* Floating Mode Toggle */}
      <FloatingModeToggle mode={mode} setMode={setMode} />

      {/* Header + KPI row */}
      <div className="flex items-center justify-between gap-4 mt-6 mb-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Dashboard — Smart Analytics</h2>
          <p className="text-sm text-gray-500">Interactive charts, comparisons, heatmaps and widgets</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto mt-4 md:mt-0">
          {kpis.map((k, i) => (
            <div key={i} className="p-3 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700">
              <div className="text-sm text-gray-500 mb-1">{k.label}</div>
              <div className="text-2xl font-semibold">{k.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={() => setShowAll((s) => !s)} className="px-3 py-1 border rounded">
          {showAll ? "Top charts" : "Show all"}
        </button>

        {mode === "comparison" && (
          <>
            <div className="ml-3 text-sm text-gray-500">Select columns to compare (max 6):</div>
            <div className="flex flex-wrap gap-2 ml-2">
              {numericColumns.map((col) => (
                <button key={col} onClick={() => toggleCompareCol(col)} className={`px-3 py-1 rounded-full text-sm ${compareSelection.includes(col) ? "bg-purple-600 text-white" : "bg-gray-100 dark:bg-gray-800"}`}>
                  {col}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <select value={compareView} onChange={(e) => setCompareView(e.target.value)} className="border px-2 py-1 rounded text-sm">
                <option value="overlay">Overlay (trends)</option>
                <option value="side-by-side">Side-by-side (bars)</option>
                <option value="scatter-matrix">Scatter matrix</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* INDIVIDUAL MODE */}
      {mode === "individual" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {individualCharts.map((chart, idx) => {
            if (!chartRefs.current[idx]) chartRefs.current[idx] = React.createRef();
            const forced = forcedChartType[idx] || "";
            return (
              <div key={chart.title} className="glass p-4 rounded-2xl flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-purple-600 font-semibold">{chart.title}</h3>
                  <div className="flex gap-2 items-center">
                    <select value={forced} onChange={(e) => setForcedChartType({ ...forcedChartType, [idx]: e.target.value || undefined })} className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-sm">
                      <option value="">Auto</option>
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="doughnut">Doughnut</option>
                    </select>

                    <button onClick={() => setExpandedChart({ chart })} className="px-2 py-1 bg-gray-700 rounded text-sm text-white">Expand</button>
                    <button onClick={() => {
                      try {
                        const candidate = chartRefs.current[idx]?.current;
                        let canvas = candidate?.canvas || (candidate?.ctx && candidate.ctx.canvas) || document.getElementById(`dashboard-chart-${idx+1}`);
                        if (!canvas && candidate?.querySelector) canvas = candidate.querySelector("canvas");
                        if (!canvas) return alert("Canvas not found");
                        downloadCanvas(canvas);
                      } catch (e) { console.error(e); alert("Download failed"); }
                    }} className="px-2 py-1 bg-purple-600 rounded text-white text-sm">Download</button>
                  </div>
                </div>

                <div style={{ height: 240 }}>
                  {((forced || chart.type) === "doughnut") && <Doughnut ref={chartRefs.current[idx]} data={chart.data} options={{ maintainAspectRatio: false }} />}
                  {((forced || chart.type) === "line") && <Line ref={chartRefs.current[idx]} data={chart.data} options={{ maintainAspectRatio: false }} />}
                  {((forced || chart.type) === "bar") && <Bar ref={chartRefs.current[idx]} data={chart.data} options={{ maintainAspectRatio: false }} />}
                </div>

                <div className="mt-3 text-sm text-gray-500">{chart.explanation}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* COMPARISON MODE */}
      {mode === "comparison" && (
        <div className="space-y-6">
          {compareView === "overlay" && (
            <div className="p-4 rounded-xl border bg-white dark:bg-gray-900">
              <h3 className="mb-2 font-semibold">Overlay comparison</h3>
              <div style={{ height: 360 }}>
                <Line ref={(el) => { if (chartRefs.current[0]) chartRefs.current[0].current = el; }} data={buildOverlayComparison(compareCols)} options={{ maintainAspectRatio: false, plugins: { legend: { position: "top" } } }} />
              </div>
              <div className="mt-3 text-sm text-gray-500">Overlay shows trends for each selected numeric column across rows.</div>
            </div>
          )}

          {compareView === "side-by-side" && (
            <div className="p-4 rounded-xl border bg-white dark:bg-gray-900">
              <h3 className="mb-2 font-semibold">Side-by-side comparison</h3>
              <div style={{ height: 360 }}>
                <Bar data={buildSideBySideBar(compareCols)} options={{ maintainAspectRatio: false }} />
              </div>
            </div>
          )}

          {compareView === "scatter-matrix" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scatterPairs.map((pair, i) => (
                  <div key={i} className="p-3 rounded border bg-white dark:bg-gray-800">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">{pair.xCol} vs {pair.yCol}</div>
                      <div className="text-xs text-gray-500">n={pair.points.length}</div>
                    </div>
                    <div style={{ height: 260 }}>
                      <Scatter data={{ datasets: [{ label: `${pair.xCol} vs ${pair.yCol}`, data: pair.points, backgroundColor: PALETTE[i % PALETTE.length] }] }} options={{ maintainAspectRatio: false, scales: { x: { title: { display: true, text: pair.xCol } }, y: { title: { display: true, text: pair.yCol } } } }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl border bg-white dark:bg-gray-900">
                <h3 className="mb-2 font-semibold">Correlation matrix</h3>
                <div className="overflow-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 border"> </th>
                        {compareCols.map((c) => <th key={c} className="p-2 border">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {corrMatrix.map((row, i) => (
                        <tr key={i}>
                          <td className="p-2 border font-medium">{compareCols[i]}</td>
                          {row.map((val, j) => {
                            const intensity = Math.min(1, Math.abs(val));
                            const bg = val >= 0 ? `rgba(16,185,129,${intensity})` : `rgba(239,68,68,${intensity})`;
                            return (
                              <td key={j} className="p-2 border text-center" style={{ background: bg }}>
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HEATMAP MODE */}
      {mode === "heatmap" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border bg-white dark:bg-gray-900">
            <h3 className="mb-2 font-semibold">Correlation Heatmap (Pearson)</h3>
            <div className="overflow-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 border"> </th>
                    {numericColumns.map((c) => <th key={c} className="p-2 border">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const matrix = buildCorrelationMatrix(numericColumns);
                    return matrix.map((row, i) => (
                      <tr key={i}>
                        <td className="p-2 border font-medium">{numericColumns[i]}</td>
                        {row.map((val, j) => {
                          const intensity = Math.min(1, Math.abs(val));
                          const bg = val >= 0 ? `rgba(16,185,129,${intensity})` : `rgba(239,68,68,${intensity})`;
                          return <td key={j} className="p-2 border text-center" style={{ background: bg }}>{val.toFixed(2)}</td>;
                        })}
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-sm text-gray-500">Heatmap shows Pearson correlation between numeric columns. Green = positive, Red = negative.</div>
          </div>
        </div>
      )}

      {/* WIDGETS MODE */}
      {mode === "widgets" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {kpis.map((k, i) => (
              <div key={i} className="p-4 rounded-xl border bg-white dark:bg-gray-900">
                <div className="text-sm text-gray-500 mb-1">{k.label}</div>
                <div className="text-2xl font-semibold">{k.value}</div>
              </div>
            ))}

            <div className="p-4 rounded-xl border bg-white dark:bg-gray-900 col-span-1 sm:col-span-2">
              <h4 className="font-semibold mb-2">Top Insights</h4>
              <InsightsPanel numericColumns={numericColumns} cleanedData={cleanedData} />
            </div>
          </div>
        </div>
      )}

      {/* Expanded modal */}
      {expandedChart && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setExpandedChart(null)}>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-xl w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-purple-600">{expandedChart.chart.title}</h2>
              <div className="flex gap-2">
                <button onClick={() => setExpandedChart(null)} className="px-3 py-1 border rounded">Close</button>
                <button onClick={() => {
                  try {
                    const candidate = expandedRef.current;
                    let canvas = candidate?.canvas || (candidate?.ctx && candidate.ctx.canvas) || document.getElementById("expanded-dashboard-chart");
                    if (!canvas && candidate?.querySelector) canvas = candidate.querySelector("canvas");
                    if (!canvas) return alert("canvas not found");
                    const url = canvas.toDataURL();
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${expandedChart.chart.title.replace(/\s+/g, "_")}.png`;
                    a.click();
                  } catch (err) { console.error(err); alert("Download failed"); }
                }} className="px-3 py-1 bg-purple-600 text-white rounded">Download</button>
              </div>
            </div>

            <div style={{ height: 520 }}>
              {expandedChart.chart.type === "line" && <Line ref={expandedRef} data={expandedChart.chart.data} options={{ maintainAspectRatio: false }} />}
              {expandedChart.chart.type === "bar" && <Bar ref={expandedRef} data={expandedChart.chart.data} options={{ maintainAspectRatio: false }} />}
              {expandedChart.chart.type === "doughnut" && <Doughnut ref={expandedRef} data={expandedChart.chart.data} options={{ maintainAspectRatio: false }} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------- InsightsPanel ----------------- */
function InsightsPanel({ numericColumns, cleanedData }) {
  const compute = () => {
    const insights = [];
    const safeNum = (v) => {
      if (v === null || v === undefined) return NaN;
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    const metrics = numericColumns.map((col) => {
      const arr = cleanedData.map((r) => {
        const n = safeNum(r[col]);
        return Number.isNaN(n) ? null : n;
      });
      const vals = arr.filter((x) => x !== null);
      if (!vals.length) return { col, mean: null, std: null, outliers: 0, slope: 0 };
      const mean = vals.reduce((s, x) => s + x, 0) / vals.length;
      const std = Math.sqrt(vals.reduce((s, x) => s + (x - mean) ** 2, 0) / vals.length);
      const sorted = [...vals].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1 || 0;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      const outliers = vals.filter((v) => v < lower || v > upper).length;
      const pts = arr.map((v, i) => ({ x: i, y: v })).filter((p) => p.y !== null);
      let slope = 0;
      if (pts.length > 1) {
        const n = pts.length;
        const sx = pts.reduce((s, p) => s + p.x, 0);
        const sy = pts.reduce((s, p) => s + p.y, 0);
        const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
        const sx2 = pts.reduce((s, p) => s + p.x * p.x, 0);
        const denom = n * sx2 - sx * sx;
        slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
      }
      return { col, mean, std, outliers, slope };
    });

    const outlierTop = [...metrics].sort((a, b) => (b.outliers || 0) - (a.outliers || 0))[0];
    if (outlierTop && outlierTop.outliers > 0) insights.push(`${outlierTop.col} has ${outlierTop.outliers} outliers (IQR).`);

    const growthTop = [...metrics].sort((a, b) => (b.slope || 0) - (a.slope || 0))[0];
    if (growthTop && growthTop.slope && Math.abs(growthTop.slope) > 1e-6) {
      insights.push(`${growthTop.col} shows a ${growthTop.slope > 0 ? "rising" : "declining"} trend (slope ${growthTop.slope.toFixed(3)}).`);
    }

    const varTop = [...metrics].sort((a, b) => (b.std || 0) - (a.std || 0))[0];
    if (varTop && varTop.std > 0) insights.push(`${varTop.col} has high variability (std ${varTop.std.toFixed(2)}).`);

    if (!insights.length) insights.push("No strong signals detected — data is fairly uniform or sparse.");

    return insights;
  };

  const [insights] = useState(() => compute());

  return (
    <div>
      <ul className="list-disc ml-5 text-sm text-gray-700 dark:text-gray-300">
        {insights.map((s, i) => <li key={i} className="mb-2">{s}</li>)}
      </ul>
    </div>
  );
}
