import React, { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  movingAverageForecast,
  linearRegressionForecast,
  holidayAwareForecast,
} from "../utils/forecast";
import { detectZscoreAnomalies, detectIQRAnomalies } from "../utils/anomaly";

export default function Predictions({ cleanedData }) {
  const [selectedCol, setSelectedCol] = useState(null);
  const [horizon, setHorizon] = useState(6);
  const [maWindow, setMaWindow] = useState(3);
  const [method, setMethod] = useState("auto");
  const [zThreshold, setZThreshold] = useState(3);

  // Identify numeric columns
  const numericCols = useMemo(() => {
    if (!cleanedData || cleanedData.length === 0) return [];
    const keys = Object.keys(cleanedData[0] || {});
    return keys.filter((k) =>
      cleanedData.some(
        (r) =>
          r[k] !== null &&
          r[k] !== undefined &&
          r[k] !== "" &&
          !isNaN(parseFloat(r[k]))
      )
    );
  }, [cleanedData]);

  React.useEffect(() => {
    if (!selectedCol && numericCols.length > 0) setSelectedCol(numericCols[0]);
  }, [numericCols]);

  // Convert series to last 24 points
  const series = useMemo(() => {
    if (!selectedCol || !cleanedData) return [];
    const MAX_POINTS = 24;
    return cleanedData
      .map((r) => {
        const v = parseFloat(r[selectedCol]);
        return Number.isFinite(v) ? v : null;
      })
      .slice(-MAX_POINTS);
  }, [selectedCol, cleanedData]);

  // Error calculation
  const computeErrors = (preds = [], actuals = []) => {
    const paired = preds
      .map((p, i) => ({ p: Number(p), a: Number(actuals[i]) }))
      .filter(({ p, a }) => Number.isFinite(p) && Number.isFinite(a) && a !== 0);

    if (paired.length === 0) return { mape: NaN, rmse: NaN };

    const mape =
      (paired.reduce((s, { p, a }) => s + Math.abs((a - p) / a), 0) /
        paired.length) *
      100;

    const rmse = Math.sqrt(
      paired.reduce((s, { p, a }) => s + Math.pow(p - a, 2), 0) / paired.length
    );

    return { mape, rmse };
  };

  // Generate forecasts
  const maResult = useMemo(
    () =>
      movingAverageForecast(
        series.filter((v) => v !== null),
        horizon,
        maWindow
      ),
    [series, horizon, maWindow]
  );

  const lrResult = useMemo(
    () => linearRegressionForecast(series.filter((v) => v !== null), horizon),
    [series, horizon]
  );

  const haResult = useMemo(
    () =>
      holidayAwareForecast(series.filter((v) => v !== null), horizon, maWindow),
    [series, horizon, maWindow]
  );

  // Auto-select best model
  const { chosen, chosenName, chosenErr } = useMemo(() => {
    const nums = series.filter((v) => v !== null);
    if (nums.length === 0)
      return {
        chosen: maResult,
        chosenName: "Moving Average",
        chosenErr: { mape: NaN, rmse: NaN },
      };

    const lastHoldout = Math.max(
      1,
      Math.min(Math.floor(nums.length * 0.2) || 1, 12)
    );
    const train = nums.slice(0, nums.length - lastHoldout);
    const actualHoldout = nums.slice(nums.length - lastHoldout);

    const maPreds = movingAverageForecast(train, actualHoldout.length).forecast;
    const lrPreds = linearRegressionForecast(train, actualHoldout.length).forecast;
    const haPreds = holidayAwareForecast(train, actualHoldout.length, maWindow)
      .forecast;

    const maErr = computeErrors(maPreds, actualHoldout);
    const lrErr = computeErrors(lrPreds, actualHoldout);
    const haErr = computeErrors(haPreds, actualHoldout);

    const score = (err) =>
      Number.isFinite(err.mape) ? err.mape : err.rmse || Infinity;

    const models = [
      { name: "Moving Average", result: maResult, err: maErr, score: score(maErr) },
      { name: "Linear Regression", result: lrResult, err: lrErr, score: score(lrErr) },
      { name: "Holiday Aware", result: haResult, err: haErr, score: score(haErr) },
    ];

    models.sort((a, b) => a.score - b.score);
    const best = models[0];

    if (method === "auto")
      return { chosen: best.result, chosenName: best.name, chosenErr: best.err };

    if (method === "moving-average")
      return { chosen: maResult, chosenName: "Moving Average", chosenErr: maErr };
    if (method === "linear-regression")
      return { chosen: lrResult, chosenName: "Linear Regression", chosenErr: lrErr };
    if (method === "holiday-aware")
      return { chosen: haResult, chosenName: "Holiday Aware", chosenErr: haErr };

    return { chosen: best.result, chosenName: best.name, chosenErr: best.err };
  }, [series, method, maResult, lrResult, haResult, maWindow]);

  const forecast = chosen?.forecast || [];

  // Anomaly detection
  const zAnoms = useMemo(
    () => detectZscoreAnomalies(series, zThreshold),
    [series, zThreshold]
  );

  const iqrAnoms = useMemo(() => detectIQRAnomalies(series), [series]);

  // Summary stats for explanation
  const summary = useMemo(() => {
    const nums = series.filter((v) => Number.isFinite(v));
    if (!nums.length) return null;

    const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
    const slope = lrResult?.slope || 0;

    const mape = Number.isFinite(chosenErr.mape) ? chosenErr.mape : NaN;
    const rmse = Number.isFinite(chosenErr.rmse) ? chosenErr.rmse : NaN;
    const accuracy = Number.isFinite(mape) ? Math.max(0, 100 - mape) : NaN;

    const avgForecast = forecast.length
      ? forecast.reduce((a, b) => a + b, 0) / forecast.length
      : null;

    // Volatility measurement
    const volatility =
      Math.sqrt(
        nums.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / nums.length
      ) || 0;

    return {
      mean,
      slope,
      mape,
      rmse,
      accuracy,
      avgForecast,
      volatility,
    };
  }, [series, lrResult, chosenErr, forecast]);

  // BUSINESS-GRADE EXPLANATION
  const explanation = useMemo(() => {
    if (!selectedCol)
      return "Select a metric to view its performance and forward outlook.";
    if (!summary) return "No usable numeric data was found for this metric.";

    const t = [];

    t.push(`**${selectedCol} — Performance Briefing**`);

    // Trend
    if (Math.abs(summary.slope) < 1e-6) {
      t.push("• The metric has remained stable with no major directional movement.");
    } else if (summary.slope > 0) {
      t.push("• Showing a consistent **upward trend**, indicating improving performance.");
    } else {
      t.push("• Showing a **downward trend**, signaling softening performance.");
    }

    // Forecast
    if (summary.avgForecast !== null) {
      t.push(
        `• Projected **${horizon}-month outlook** indicates an expected average of **${summary.avgForecast.toFixed(
          2
        )}**.`
      );
    }

    // Model & Accuracy
    if (Number.isFinite(summary.accuracy)) {
      t.push(
        `• Selected Model: **${chosenName}** — Accuracy **${summary.accuracy.toFixed(
          1
        )}%** (MAPE ${summary.mape.toFixed(1)}%, RMSE ${summary.rmse.toFixed(
          2
        )}).`
      );
    } else {
      t.push(
        `• Model Used: **${chosenName}** — accuracy could not be computed due to limited data.`
      );
    }

    // Volatility
    if (summary.volatility < 5)
      t.push("• Volatility: **Low** — performance is stable and predictable.");
    else if (summary.volatility < 15)
      t.push("• Volatility: **Moderate** — manageable fluctuations observed.");
    else t.push("• Volatility: **High** — unusual instability detected.");

    // Anomalies
    const anomCount = Math.max(zAnoms.length, iqrAnoms.length);
    if (anomCount === 0) {
      t.push("• No anomalies detected — performance aligns with historical patterns.");
    } else {
      t.push(
        `• **${anomCount} anomaly events** detected — may indicate market shocks, operational changes, or data irregularities.`
      );
    }

    // Advisory note
    if (summary.slope > 0)
      t.push(
        "**Analyst Insight:** Upward momentum suggests positive outlook; continue monitoring for sustained growth."
      );
    else if (summary.slope < 0)
      t.push(
        "**Analyst Insight:** Declining performance warrants closer review to identify underlying drivers."
      );
    else
      t.push(
        "**Analyst Insight:** Stable trend — continue tracking for any developing shifts."
      );

    return t.join("\n");
  }, [selectedCol, summary, horizon, chosenName, zAnoms, iqrAnoms]);

  function downloadInsightsCSV() {
    if (!selectedCol) return;

    const rows = [["index", "value", "z_anomaly", "iqr_anomaly"]];

    series.forEach((v, idx) => {
      const isZ = zAnoms.some((a) => a.index === idx);
      const isI = iqrAnoms.some((a) => a.index === idx);
      rows.push([idx, v ?? "", isZ ? "1" : "0", isI ? "1" : "0"]);
    });

    forecast.forEach((f, i) => {
      rows.push([`F+${i + 1}`, Number(f).toFixed(4), "", ""]);
    });

    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `insights_${selectedCol}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 bg-gray-800 rounded-2xl border border-purple-500/30">
      <h2 className="text-2xl font-bold text-purple-300 mb-4">
        📈 Predictions & Anomalies
      </h2>

      {!cleanedData?.length ? (
        <p className="text-gray-400">Upload and clean data first.</p>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center mb-4">
            <label className="text-sm text-gray-300">Metric</label>
            <select
              value={selectedCol || ""}
              onChange={(e) => setSelectedCol(e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded"
            >
              {numericCols.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <label className="text-sm text-gray-300 ml-4">Horizon</label>
            <input
              type="number"
              value={horizon}
              onChange={(e) => setHorizon(Math.max(1, Number(e.target.value)))}
              className="w-24 bg-gray-700 text-white px-2 py-1 rounded"
            />

            <label className="text-sm text-gray-300 ml-4">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded"
            >
              <option value="auto">Auto (Best)</option>
              <option value="moving-average">Moving Average</option>
              <option value="linear-regression">Linear Regression</option>
              <option value="holiday-aware">Holiday Aware</option>
            </select>

            {method === "moving-average" && (
              <>
                <label className="text-sm text-gray-300 ml-4">MA Window</label>
                <input
                  type="number"
                  value={maWindow}
                  onChange={(e) =>
                    setMaWindow(Math.max(1, Number(e.target.value)))
                  }
                  className="w-20 bg-gray-700 text-white px-2 py-1 rounded"
                />
              </>
            )}

            <label className="text-sm text-gray-300 ml-4">Z-threshold</label>
            <input
              type="number"
              value={zThreshold}
              onChange={(e) =>
                setZThreshold(Math.max(1, Number(e.target.value)))
              }
              className="w-20 bg-gray-700 text-white px-2 py-1 rounded"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Forecast Chart */}
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-300 mb-2">
                Forecast Chart
              </h3>

              <div style={{ height: 320 }}>
                <Line
                  data={{
                    labels: [
                      ...series.map((_, i) => `Month -${series.length - i}`),
                      ...forecast.map((_, i) => `Month +${i + 1}`),
                    ],
                    datasets: [
                      {
                        label: `${selectedCol} (History + Forecast)`,
                        data: [
                          ...series,
                          ...forecast.map((f) => Number(f)),
                        ],
                        borderColor: "rgb(99,102,241)",
                        backgroundColor: "rgba(99,102,241,0.15)",
                        tension: 0.15,
                        pointRadius: 2,
                      },
                    ],
                  }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true } },
                  }}
                />
              </div>

              <div className="mt-3 text-sm text-gray-300 whitespace-pre-line">
                {explanation}
              </div>
            </div>

            {/* Anomalies */}
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-300 mb-2">
                Anomaly Detection
              </h3>

              <div className="text-sm text-gray-300 mb-3">
                <div>- Z-score anomalies: {zAnoms.length}</div>
                <div>- IQR anomalies: {iqrAnoms.length}</div>
              </div>

              <div className="max-h-64 overflow-auto bg-gray-900/30 p-2 rounded">
                {zAnoms.length === 0 && iqrAnoms.length === 0 ? (
                  <p className="text-gray-400">No anomalies detected.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-300">
                        <th>Index</th>
                        <th>Value</th>
                        <th>Z</th>
                        <th>IQR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ...new Set([
                          ...zAnoms.map((a) => a.index),
                          ...iqrAnoms.map((a) => a.index),
                        ]),
                      ].map((idx) => {
                        const z = zAnoms.find((a) => a.index === idx);
                        const i = iqrAnoms.find((a) => a.index === idx);
                        return (
                          <tr key={idx} className="border-t border-gray-800">
                            <td>{idx}</td>
                            <td>{series[idx] ?? "-"}</td>
                            <td>{z ? z.z.toFixed(2) : "-"}</td>
                            <td>{i ? `${i.value} (out)` : "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={downloadInsightsCSV}
                  className="px-3 py-2 bg-purple-600 rounded text-white"
                >
                  Download Insights CSV
                </button>
                <button
                  onClick={() => alert(explanation)}
                  className="px-3 py-2 bg-gray-700 rounded text-white"
                >
                  Explain Again
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
