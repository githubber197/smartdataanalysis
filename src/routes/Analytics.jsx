import React, { useMemo, useState, useEffect } from "react";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { registerChart, unregisterChart } from "../utils/ChartRegistry";

Chart.register(...registerables);

/**
 * Analytics.jsx
 * - dynamic KPIs
 * - per-chart smart X-axis (no dates)
 * - chart type selector
 * - raw / normalized / percent toggle
 * - trend detection (linear regression)
 * - outlier detection (IQR)
 * - export PNG per chart
 *
 * Props:
 * - cleanedData: array of objects (already cleaned)
 */
export default function Analytics({ cleanedData }) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [viewMode, setViewMode] = useState("raw"); // raw | normalized | percent
  const [forcedChartType, setForcedChartType] = useState({}); // { idx: "bar" | "line" | "doughnut" }

  if (!cleanedData || cleanedData.length === 0) {
    return <p className="text-gray-400">Upload and clean data first.</p>;
  }

  const rows = cleanedData;
  const columns = Object.keys(rows[0] || {});

  // ---------- utilities ----------
  const safeNum = (v) => {
    if (v === null || v === undefined) return NaN;
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  };

  const parseNumericColumn = (col) =>
    rows.map((r) => {
      const v = safeNum(r[col]);
      return Number.isNaN(v) ? null : v;
    });

  const statsFor = (arr) => {
    const nums = arr.filter((x) => x !== null);
    const count = arr.length;
    const nonNull = nums.length;
    if (!nonNull) {
      return { count, nonNull, sum: 0, mean: null, median: null, min: null, max: null, std: null };
    }
    const sum = nums.reduce((s, x) => s + x, 0);
    const mean = sum / nums.length;
    const sorted = [...nums].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const variance = nums.reduce((s, x) => s + (x - mean) ** 2, 0) / nums.length;
    const std = Math.sqrt(variance);
    return { count, nonNull, sum, mean, median, min, max, std };
  };

  const detectIQROutliers = (arr) => {
    const nums = arr.filter((x) => x !== null).sort((a, b) => a - b);
    if (nums.length < 4) return { outliers: [], lower: null, upper: null };
    const q1 = nums[Math.floor(nums.length * 0.25)];
    const q3 = nums[Math.floor(nums.length * 0.75)];
    const iqr = q3 - q1 || 0;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    const outliers = arr
      .map((v, i) => ({ v, i }))
      .filter((x) => x.v !== null && (x.v < lower || x.v > upper));
    return { outliers, lower, upper };
  };

  // simple linear regression slope for trend detection (x: index, y: value)
  const linearTrendSlope = (arr) => {
    const pts = arr
      .map((v, i) => ({ x: i, y: v }))
      .filter((p) => p.y !== null && !Number.isNaN(p.y));
    if (pts.length < 2) return 0;
    const n = pts.length;
    const sumX = pts.reduce((s, p) => s + p.x, 0);
    const sumY = pts.reduce((s, p) => s + p.y, 0);
    const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return 0;
    const slope = (n * sumXY - sumX * sumY) / denom;
    return slope;
  };

  // ---------- numeric columns ----------
  const numericColumns = useMemo(
    () =>
      columns.filter((c) =>
        rows.some((r) => {
          const v = safeNum(r[c]);
          return !Number.isNaN(v);
        })
      ),
    [rows, columns]
  );

  if (!numericColumns.length) {
    return <p className="text-gray-400">No numeric fields found for charts.</p>;
  }

  // ---------- KPI generation (dynamic for mixed datasets) ----------
  const kpis = useMemo(() => {
    // candidate metrics: total sums, means, stds, missing counts
    const metrics = numericColumns.map((col) => {
      const arr = parseNumericColumn(col);
      const s = statsFor(arr);
      const out = detectIQROutliers(arr);
      return {
        col,
        sum: s.sum,
        mean: s.mean,
        std: s.std,
        missing: s.count - s.nonNull,
        outliers: out.outliers.length,
        min: s.min,
        max: s.max,
      };
    });

    // pick top KPIs: largest sum, highest mean, most variable (std), most missing
    const largestSum = [...metrics].sort((a, b) => (b.sum || 0) - (a.sum || 0))[0];
    const highestMean = [...metrics].sort((a, b) => (b.mean || 0) - (a.mean || 0))[0];
    const mostVariable = [...metrics].sort((a, b) => (b.std || 0) - (a.std || 0))[0];
    const mostMissing = [...metrics].sort((a, b) => (b.missing || 0) - (a.missing || 0))[0];

    const pick = [];
    if (largestSum && largestSum.col) pick.push({ type: "Total", metric: "sum", ...largestSum });
    if (highestMean && highestMean.col && highestMean.col !== largestSum.col)
      pick.push({ type: "Average", metric: "mean", ...highestMean });
    if (mostVariable && mostVariable.col && ![largestSum.col, highestMean.col].includes(mostVariable.col))
      pick.push({ type: "Variability", metric: "std", ...mostVariable });
    if (mostMissing && mostMissing.col && ![largestSum.col, highestMean.col, mostVariable.col].includes(mostMissing.col))
      pick.push({ type: "Missing", metric: "missing", ...mostMissing });

    // ensure we have at least 3 KPI cards; fill with other highest sums if needed
    const filled = [...pick];
    for (const m of metrics) {
      if (filled.length >= 4) break;
      if (!filled.some((f) => f.col === m.col)) filled.push({ type: "Metric", metric: "sum", ...m });
    }

    return filled.slice(0, 4);
  }, [numericColumns, rows]);

  // ---------- smart X-axis picker (no dates) ----------
  const pickSmartXAxisFor = (targetCol) => {
    // prefer ID-like column unique
    const idCandidates = columns.filter((c) => /(id|_id|code|number)$/i.test(c));
    for (const id of idCandidates) {
      const vals = rows.map((r) => safeStr(r[id]));
      const uniq = new Set(vals);
      if (uniq.size === rows.length && vals.every((v) => v !== "")) {
        return { label: id, vals };
      }
    }

    // pick categorical / string column that is not date-like
    const catCandidates = columns.filter((c) => {
      const sample = rows.slice(0, 20).map((r) => safeStr(r[c]));
      const isText = sample.every((s) => {
        if (!s) return false;
        if (!isNaN(Number(s))) return false;
        if (!Number.isNaN(Date.parse(s))) return false;
        return String(s).length < 60;
      });
      return isText && c !== targetCol; // avoid using target numeric column as x-axis
    });

    if (catCandidates.length) {
      const c = catCandidates[0];
      const vals = rows.map((r) => safeStr(r[c]) || `Row ${rows.indexOf(r) + 1}`);
      return { label: c, vals };
    }

    // fallback -> row index
    const vals = rows.map((_, i) => `Row ${i + 1}`);
    return { label: "Row", vals };
  };

  // helper
  function safeStr(v) {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  // choose chart type heuristics (can be overridden per chart)
  const suggestChartType = (colVals, xvals) => {
    const uniqueX = new Set(xvals);
    const numericCount = colVals.filter((v) => v !== null).length;
    if (numericCount > 40 && uniqueX.size > 10) return "line";
    if (uniqueX.size <= 6) return "doughnut";
    return "bar";
  };

  // register canvases for external export
  useEffect(() => {
    const t = setTimeout(() => {
      numericColumns.forEach((_, idx) => {
        const id = `analytics-chart-canvas-${idx}`;
        const canvas = document.getElementById(id);
        if (canvas && registerChart) registerChart(id, canvas);
      });
    }, 300);
    return () => {
      clearTimeout(t);
      numericColumns.forEach((_, idx) => {
        if (unregisterChart) unregisterChart(`analytics-chart-canvas-${idx}`);
      });
    };
  }, [numericColumns]);

  // export canvas as PNG
  const exportPNG = (canvasId, filename = "chart.png") => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      // react-chartjs-2 forwards id to canvas only for certain usage; try querySelector fallback
      const el = document.querySelector(`#${canvasId} canvas`) || document.getElementById(canvasId);
      if (el && el.toDataURL) {
        const url = el.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
      }
      return;
    }
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  // normalization helper
  const normalizeArray = (arr) => {
    const nums = arr.filter((x) => x !== null);
    if (!nums.length) return arr;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    if (max === min) return arr.map((v) => (v === null ? null : 0.5));
    return arr.map((v) => (v === null ? null : (v - min) / (max - min)));
  };

  // ---------- Render ----------

  return (
    <div className="w-full">
      {/* Header + KPI Cards */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold">📈 Analytics — Smart Insights</h2>
          <p className="text-sm text-gray-500">Auto KPIs, trends, outliers and dynamic charts</p>
        </div>

        {/* global controls */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-md overflow-hidden border border-gray-200 bg-white dark:bg-gray-800">
            <button
              className={`px-3 py-2 ${viewMode === "raw" ? "bg-purple-600 text-white" : "text-gray-600 dark:text-gray-200"}`}
              onClick={() => setViewMode("raw")}
            >
              Raw
            </button>
            <button
              className={`px-3 py-2 ${viewMode === "normalized" ? "bg-purple-600 text-white" : "text-gray-600 dark:text-gray-200"}`}
              onClick={() => setViewMode("normalized")}
            >
              Normalized
            </button>
            <button
              className={`px-3 py-2 ${viewMode === "percent" ? "bg-purple-600 text-white" : "text-gray-600 dark:text-gray-200"}`}
              onClick={() => setViewMode("percent")}
            >
              Percent
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k, i) => {
          const value =
            k.metric === "sum"
              ? k.sum
              : k.metric === "mean"
              ? k.mean
              : k.metric === "std"
              ? k.std
              : k.missing;
          const display = value === null || value === undefined ? "—" : (typeof value === "number" ? Number(value.toFixed(2)) : value);
          const title = k.type === "Total" ? `Total ${k.col}` : k.type === "Average" ? `Avg ${k.col}` : k.type === "Variability" ? `Std ${k.col}` : k.type === "Missing" ? `Missing (${k.col})` : k.col;
          const subtitle =
            k.metric === "sum"
              ? "Sum"
              : k.metric === "mean"
              ? "Average"
              : k.metric === "std"
              ? "Std Dev"
              : "Missing values";

          return (
            <div key={i} className="p-4 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700">
              <div className="text-sm text-gray-500 mb-2">{subtitle}</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold">{display}</div>
                  <div className="text-xs text-gray-500 mt-1">{title}</div>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <div>Outliers: {k.outliers}</div>
                  <div>Min: {k.min ?? "—"}</div>
                  <div>Max: {k.max ?? "—"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {numericColumns.map((col, idx) => {
          // compute raw arrays and stats
          const rawArr = parseNumericColumn(col);
          const stat = statsFor(rawArr);
          const out = detectIQROutliers(rawArr);
          const slope = linearTrendSlope(rawArr);
          const trend = slope > 0.0001 ? "up" : slope < -0.0001 ? "down" : "flat";

          // pick x-axis smartly (per-chart)
          const xAxis = pickSmartXAxisFor(col);
          const xvals = xAxis.vals;

          // mapping values to numeric and view modes
          let displayVals = rawArr.map((v) => (v === null ? null : v));
          if (viewMode === "normalized") displayVals = normalizeArray(displayVals);
          if (viewMode === "percent") {
            const total = stat.sum || 1;
            displayVals = rawArr.map((v) => (v === null ? null : ((v / total) * 100)));
          }

          // choose chart type (allow override)
          const suggested = suggestChartType(displayVals, xvals);
          const forced = forcedChartType[idx] || suggested;
          const ChartComp = forced === "line" ? Line : forced === "doughnut" ? Doughnut : Bar;

          // dataset for react-chartjs-2
          const dataset = {
            labels: xvals,
            datasets: [
              {
                label: col,
                data: displayVals.map((v) => (v === null ? 0 : v)),
                backgroundColor: "rgba(99,102,241,0.6)",
                borderColor: "rgba(79,70,229,0.95)",
                borderWidth: 1.25,
                tension: forced === "line" ? 0.35 : 0,
              },
            ],
          };

          // small stats text
          const explanation = `Column "${col}" — mean ${stat.mean !== null ? stat.mean.toFixed(2) : "—"}, median ${stat.median !== null ? stat.median.toFixed(2) : "—"}, std ${stat.std !== null ? stat.std.toFixed(2) : "—"}. ${out.outliers.length} outliers detected. Trend: ${trend}.`;

          const canvasId = `analytics-chart-canvas-${idx}`;

          return (
            <div key={col} className={`p-4 rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-700 ${expandedIndex === idx ? "md:col-span-2" : ""}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold">{col}</h3>
                  <div className="text-xs text-gray-500">{explanation}</div>
                </div>

                <div className="flex items-center gap-2">
                  {/* chart type selector */}
                  <select
                    value={forcedChartType[idx] || ""}
                    onChange={(e) => setForcedChartType({ ...forcedChartType, [idx]: e.target.value || undefined })}
                    className="border rounded px-2 py-1 bg-white dark:bg-gray-800 text-sm"
                  >
                    <option value="">Auto ({suggested})</option>
                    <option value="bar">Bar</option>
                    <option value="line">Line</option>
                    <option value="doughnut">Doughnut</option>
                  </select>

                  <button
                    onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                    className="px-2 py-1 text-sm rounded bg-purple-600 text-white"
                  >
                    {expandedIndex === idx ? "Collapse" : "Expand"}
                  </button>

                  <button
                    onClick={() => exportPNG(canvasId, `${col}.png`)}
                    className="px-2 py-1 text-sm rounded border border-gray-200 bg-white dark:bg-gray-800"
                  >
                    Export PNG
                  </button>
                </div>
              </div>

              <div style={{ height: expandedIndex === idx ? 420 : 240 }} className="mb-3">
                <ChartComp
                  id={canvasId}
                  data={dataset}
                  options={{
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: { legend: { display: true } },
                    scales: {
                      x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12 } },
                      y: { beginAtZero: viewMode !== "raw" } // for normalized/percent nicer baseline
                    }
                  }}
                />
              </div>

              {/* footer insights */}
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <div>
                  <div>Min: {stat.min ?? "—"} · Max: {stat.max ?? "—"} · Mean: {stat.mean !== null ? stat.mean.toFixed(2) : "—"}</div>
                  <div>Missing: {stat.count - stat.nonNull} · Outliers: {out.outliers.length}</div>
                </div>
                <div className="text-right">
                  <div>Trend: <strong>{slopeToText(slope)}</strong></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- helper ---------------- */
function slopeToText(slope) {
  if (slope > 0.0001) return "increasing";
  if (slope < -0.0001) return "decreasing";
  return "stable";
}
