import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function Dashboard({ cleanedData }) {
  const [charts, setCharts] = useState([]);
  const [expandedChart, setExpandedChart] = useState(null);

  useEffect(() => {
    if (!cleanedData || cleanedData.length === 0) return;

    const columns = Object.keys(cleanedData[0]);
    const newCharts = [];

    columns.forEach((col) => {
      const values = cleanedData
        .map((row) => row[col])
        .filter((v) => v !== null && v !== undefined && v !== "");
      if (values.length === 0) return;

      const numeric = values.every((v) => !isNaN(parseFloat(v)));

      if (numeric) {
        newCharts.push({
          col,
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
          col,
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

    setCharts(newCharts);
  }, [cleanedData]);

  if (!cleanedData || cleanedData.length === 0)
    return <p className="text-gray-400">Upload and clean data first.</p>;

  return (
    <div>
      {/* Chart Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {charts.map((chart, idx) => (
          <div
            key={idx}
            className="bg-white/5 p-4 rounded-2xl shadow-lg border border-purple-500/30 flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
            style={{ minHeight: chart.type === "bar" ? 250 : 200 }}
            onClick={() => setExpandedChart(chart)}
          >
            <h3 className="text-purple-300 font-semibold mb-2 text-center">{chart.col}</h3>
            <div style={{ width: "100%", height: chart.type === "bar" ? 250 : 220 }}>
              {chart.type === "bar" ? (
                <Bar
                  data={chart.data}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { beginAtZero: true },
                      y: { beginAtZero: true },
                    },
                  }}
                />
              ) : (
                <Doughnut
                  data={chart.data}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Expanded Chart */}
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
              {expandedChart.col}
            </h2>
            <div style={{ width: "100%", height: 500 }}>
              {expandedChart.type === "bar" ? (
                <Bar
                  data={expandedChart.data}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "top" } },
                    scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
                  }}
                />
              ) : (
                <Doughnut
                  data={expandedChart.data}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
