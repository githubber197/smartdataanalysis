import React, { useState } from "react";

export default function Insights({ cleanedData }) {
  const [showInsights, setShowInsights] = useState(false);

  if (!cleanedData || cleanedData.length === 0)
    return <p className="text-gray-400">No cleaned data available.</p>;

  const columns = Object.keys(cleanedData[0]);

  const insights = columns.map((col) => {
    const values = cleanedData.map((row) => row[col]);
    const numericVals = values.filter((v) => !isNaN(parseFloat(v))).map(Number);
    const missing = values.filter((v) => v === "" || v === null || v === undefined).length;
    const unique = new Set(values).size;

    let message = "";
    let status = "✅ Clean";

    if (missing > 0) {
      message += `Column "${col}" has ${missing} empty cells. Try filling them with the average or most common value. `;
      status = "⚠️ Needs Fix";
    }

    if (numericVals.length > 0) {
      const avg = (numericVals.reduce((a, b) => a + b, 0) / numericVals.length).toFixed(2);
      const min = Math.min(...numericVals);
      const max = Math.max(...numericVals);
      const sorted = numericVals.sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length / 4)];
      const q3 = sorted[Math.floor((sorted.length * 3) / 4)];
      const iqr = q3 - q1;
      const outliers = numericVals.filter((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr).length;

      message += `It’s a number column. Average value is ${avg}, ranging from ${min} to ${max}. `;
      if (outliers > 0) {
        message += `${outliers} numbers look unusual (very high or very low). `;
        status = "⚠️ Needs Review";
      }
    } else {
      message += `It’s a text/category column with ${unique} different values. `;
    }

    if (!message) message = "Everything looks good here.";

    return { col, message, status };
  });

  if (!showInsights) {
    return (
      <div className="p-6 bg-white/5 rounded-2xl shadow-lg border border-purple-500/30 text-center">
        <button
          onClick={() => setShowInsights(true)}
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all"
        >
          Show Data Insights 💡
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white/5 rounded-2xl shadow-lg border border-purple-500/30 max-h-[600px] overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4 text-purple-400">💡 Data Insights</h2>
      <ul className="list-disc list-inside text-gray-300 space-y-3">
        {insights.map((i, idx) => (
          <li key={idx}>
            <span className="font-bold text-purple-300">{i.col}:</span>{" "}
            <span>{i.message}</span>{" "}
            <span className={i.status.includes("⚠️") ? "text-red-400" : "text-green-400"}>
              {i.status}
            </span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => setShowInsights(false)}
        className="mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-800 rounded-lg"
      >
        Hide Insights
      </button>
    </div>
  );
}
