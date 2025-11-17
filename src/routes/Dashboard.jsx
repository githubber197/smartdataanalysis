// src/pages/Dashboard.jsx
import React, { useEffect, useRef, useState } from "react";
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
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import ChartModeToggle from "../components/ChartModeToggle";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function Dashboard({ cleanedData }) {
  const [mode, setMode] = useState("individual");
  const [charts, setCharts] = useState([]);
  const [expandedChart, setExpandedChart] = useState(null);
  const [compareCols, setCompareCols] = useState([]);

  // refs to chart components (Chart.js instances via react-chartjs-2)
  const chartRefs = useRef([]); // array of refs for small charts
  const expandedRef = useRef(null);

  useEffect(() => {
    // reset refs length to charts length
    chartRefs.current = chartRefs.current.slice(0, charts.length);
  }, [charts.length]);

  useEffect(() => {
    if (!cleanedData || cleanedData.length === 0) {
      setCharts([]);
      return;
    }

    const columns = Object.keys(cleanedData[0]);
    const newCharts = [];

    if (mode === "individual") {
      columns.forEach((col) => {
        const values = cleanedData
          .map((r) => r[col])
          .filter((v) => v !== "" && v !== null && v !== undefined);

        if (values.length === 0) return;
        const numeric = values.every((v) => !isNaN(parseFloat(v)));

        if (numeric) {
          newCharts.push({
            title: col,
            type: "bar",
            data: {
              labels: cleanedData.map((_, i) => `Row ${i + 1}`),
              datasets: [
                {
                  label: col,
                  data: values.map((v) => parseFloat(v)),
                  backgroundColor: "rgba(147, 51, 234, 0.6)",
                  borderColor: "rgb(147, 51, 234)",
                  borderWidth: 2,
                },
              ],
            },
          });
        } else {
          const counts = values.reduce((acc, v) => {
            acc[v] = (acc[v] || 0) + 1;
            return acc;
          }, {});
          newCharts.push({
            title: col,
            type: "pie",
            data: {
              labels: Object.keys(counts),
              datasets: [
                {
                  data: Object.values(counts),
                  backgroundColor: [
                    "#9333ea",
                    "#a855f7",
                    "#c084fc",
                    "#7e22ce",
                    "#6d28d9",
                    "#581c87",
                  ],
                },
              ],
            },
          });
        }
      });
    } else if (mode === "comparison") {
      const numericCols = columns.filter((col) =>
        cleanedData.every(
          (r) =>
            !isNaN(parseFloat(r[col])) ||
            r[col] === "" ||
            r[col] === null
        )
      );

      const selectedCols =
        compareCols.length > 0 ? compareCols : numericCols.slice(0, 2);

      const datasets = selectedCols.map((col, idx) => ({
        label: col,
        data: cleanedData.map((r) => parseFloat(r[col]) || 0),
        backgroundColor: `hsl(${idx * 60}, 70%, 60%)`,
        borderColor: `hsl(${idx * 60}, 80%, 50%)`,
        borderWidth: 2,
      }));

      newCharts.push({
        title: selectedCols.join(" vs "),
        type: "line",
        data: {
          labels: cleanedData.map((_, i) => `Row ${i + 1}`),
          datasets,
        },
      });
    }

    setCharts(newCharts);
    // reset expanded chart when data/mode changes
    setExpandedChart(null);
  }, [cleanedData, mode, compareCols]);

  // after chartRefs attach, ensure canvas elements have ids so external code can find them
  useEffect(() => {
    chartRefs.current.forEach((ref, i) => {
      try {
        const canvas = ref?.current?.canvas || (ref && ref.current);
        if (canvas && canvas instanceof HTMLCanvasElement) {
          const id = `chart-${i + 1}`;
          canvas.id = id;
          canvas.setAttribute("data-chart-id", id);
        }
      } catch (err) {
        // ignore
      }
    });

    // expanded chart canvas id
    try {
      const expCanvas = expandedRef?.current?.canvas || (expandedRef && expandedRef.current);
      if (expCanvas && expCanvas instanceof HTMLCanvasElement) {
        expCanvas.id = "expanded-chart";
        expCanvas.setAttribute("data-chart-id", "expanded-chart");
      }
    } catch (e) {
      // ignore
    }
  }, [charts, expandedChart]);

  if (!cleanedData || cleanedData.length === 0)
    return <p className="text-gray-400">Upload and clean data first.</p>;

  return (
    <div className="relative pt-20">
      <ChartModeToggle mode={mode} setMode={setMode} />

      {mode === "comparison" && (
        <div className="flex flex-wrap gap-3 mb-4 mt-12 justify-center">
          {Object.keys(cleanedData[0]).map((col) => (
            <button
              key={col}
              onClick={() =>
                setCompareCols((prev) =>
                  prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
                )
              }
              className={`px-3 py-1 rounded-full border text-sm transition ${
                compareCols.includes(col)
                  ? "bg-purple-600 border-purple-400 text-white"
                  : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {col}
            </button>
          ))}
        </div>
      )}

      {/* Chart Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {charts.map((chart, idx) => {
          // ensure a ref exists for this index
          if (!chartRefs.current[idx]) chartRefs.current[idx] = React.createRef();

          return (
            <div
              key={idx}
              className="bg-white/5 p-4 rounded-2xl shadow-lg border border-purple-500/30 flex flex-col items-center"
            >
              <h3 className="text-purple-300 font-semibold mb-2 text-center">
                {chart.title}
              </h3>

              <div style={{ width: "100%", height: 250 }}>
                {chart.type === "bar" && (
                  <Bar
                    ref={chartRefs.current[idx]}
                    data={chart.data}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                )}
                {chart.type === "line" && (
                  <Line
                    ref={chartRefs.current[idx]}
                    data={chart.data}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                )}
                {chart.type === "pie" && (
                  <Doughnut
                    ref={chartRefs.current[idx]}
                    data={chart.data}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                )}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => {
                    // open expanded modal for this chart
                    setExpandedChart({ ...chart, sourceIndex: idx });
                  }}
                  className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600"
                >
                  Expand
                </button>

                <button
                  onClick={() => {
                    try {
                      const canvas = chartRefs.current[idx]?.current?.canvas || chartRefs.current[idx]?.current;
                      if (canvas) {
                        // call toDataURL directly
                        const a = document.createElement("a");
                        a.href = canvas.toDataURL("image/png");
                        a.download = `${chart.title.replace(/\s+/g, "_")}.png`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      } else {
                        console.error("canvas not found for index", idx);
                      }
                    } catch (err) {
                      console.error("download chart error:", err);
                    }
                  }}
                  className="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700 text-white"
                >
                  Download
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="bg-gray-900 p-6 rounded-3xl shadow-xl w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-purple-300 mb-4 text-center">
              {expandedChart.title}
            </h2>

            <div style={{ width: "100%", height: 500 }}>
              {expandedChart.type === "bar" && (
                <Bar
                  ref={expandedRef}
                  data={expandedChart.data}
                  options={{ maintainAspectRatio: false }}
                />
              )}
              {expandedChart.type === "line" && (
                <Line
                  ref={expandedRef}
                  data={expandedChart.data}
                  options={{ maintainAspectRatio: false }}
                />
              )}
              {expandedChart.type === "pie" && (
                <Doughnut
                  ref={expandedRef}
                  data={expandedChart.data}
                  options={{ maintainAspectRatio: false }}
                />
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setExpandedChart(null)}
                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
              <button
                onClick={() => {
                  try {
                    const canvas = expandedRef.current?.canvas || expandedRef.current;
                    if (canvas) {
                      const a = document.createElement("a");
                      a.href = canvas.toDataURL("image/png");
                      a.download = `${expandedChart.title.replace(/\s+/g, "_")}_expanded.png`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    }
                  } catch (err) {
                    console.error("download expanded chart error:", err);
                  }
                }}
                className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 text-white"
              >
                Download Expanded Chart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
