import React, { useState } from "react";
import { Bar, Line, Pie } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

export default function Analytics({ cleanedData }) {
  const [expanded, setExpanded] = useState(false);

  if (!cleanedData || cleanedData.length === 0)
    return <p className="text-gray-400">Upload and clean data first.</p>;

  const keys = Object.keys(cleanedData[0]);
  const numericKeys = keys.filter((key) =>
    cleanedData.some((d) => !isNaN(parseFloat(d[key])))
  );

  if (numericKeys.length === 0)
    return <p className="text-gray-400">No numeric data available for charts.</p>;

  // Pick the first numeric column as the "relevant" one
  const sampleKey = numericKeys[0];

  // Auto choose chart type based on data pattern
  const values = cleanedData.map((d) => parseFloat(d[sampleKey]) || 0);
  const uniqueValues = new Set(values);

  let ChartComponent = Bar;
  if (values.length > 15) ChartComponent = Line;
  if (uniqueValues.size < 5) ChartComponent = Pie;

  const data = {
    labels: cleanedData.map((_, i) => `Row ${i + 1}`),
    datasets: [
      {
        label: sampleKey,
        data: values,
        backgroundColor: [
          "rgba(147, 51, 234, 0.5)",
          "rgba(236, 72, 153, 0.5)",
          "rgba(59, 130, 246, 0.5)",
          "rgba(34, 197, 94, 0.5)",
        ],
        borderColor: "rgb(147, 51, 234)",
        borderWidth: 2,
      },
    ],
  };

  return (
    <div
      className={`p-6 bg-white/5 rounded-2xl shadow-lg border border-purple-500/30 transition-all duration-300 ${
        expanded ? "max-w-full scale-100" : "max-w-2xl mx-auto scale-95"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <h2 className="text-xl font-semibold mb-4 text-purple-400">
        📊 Analytics ({sampleKey})
      </h2>

      <div className={`${expanded ? "h-[500px]" : "h-[250px]"} transition-all`}>
        <ChartComponent
          data={data}
          options={{
            maintainAspectRatio: false,
            responsive: true,
            plugins: { legend: { display: true } },
          }}
        />
      </div>

      <p className="text-gray-400 mt-3 text-sm text-center">
        {expanded ? "Click to minimize" : "Click to expand"}
      </p>
    </div>
  );
}
