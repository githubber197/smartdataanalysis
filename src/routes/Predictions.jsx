import React, { useState } from "react";

export default function Predictions({ cleanedData }) {
  const [prediction, setPrediction] = useState(null);
  const [details, setDetails] = useState([]);

  const runPrediction = () => {
    if (!cleanedData || cleanedData.length === 0) {
      alert("Please upload and clean your data first!");
      return;
    }

    // Find numeric columns
    const columns = Object.keys(cleanedData[0]);
    const numericCols = columns.filter(
      (col) => !isNaN(parseFloat(cleanedData[0][col]))
    );

    if (numericCols.length < 2) {
      setPrediction("Not enough numeric information for analysis.");
      setDetails([]);
      return;
    }

    // Treat first numeric column as "target"
    const target = numericCols[0];
    const others = numericCols.slice(1);

    // Average helper
    const avg = (col) =>
      cleanedData.reduce((sum, row) => sum + parseFloat(row[col] || 0), 0) /
      cleanedData.length;

    const targetAvg = avg(target);

    const insights = others.map((col) => {
      const diff = avg(col) - targetAvg;
      const trend = diff > 0 ? "increasing" : "decreasing";
      return {
        column: col,
        difference: diff.toFixed(2),
        message: `When "${col}" increases, "${target}" tends to be ${trend}.`,
        trend,
      };
    });

    const positive = insights.filter((i) => i.trend === "increasing").length;
    const negative = insights.filter((i) => i.trend === "decreasing").length;

    const overall =
      positive > negative
        ? "📈 Your key metrics suggest growth is likely."
        : "📉 Some indicators show a downward trend.";

    setPrediction(overall);
    setDetails(insights);
  };

  return (
    <div className="p-6 bg-white/5 rounded-2xl shadow-lg border border-purple-500/30">
      <h2 className="text-xl font-semibold mb-3 text-purple-400">📊 Data Predictions</h2>
      <button
        onClick={runPrediction}
        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all mb-4"
      >
        Analyze Data
      </button>

      {prediction && (
        <p className="text-lg font-bold mb-4 text-white">{prediction}</p>
      )}

      {details.length > 0 && (
        <div className="bg-white/10 rounded-xl p-4 border border-white/10">
          <h3 className="text-purple-300 font-semibold mb-2">
            What we found:
          </h3>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            {details.map((d, idx) => (
              <li key={idx}>{d.message}</li>
            ))}
          </ul>
          <p className="text-sm text-gray-400 mt-3">
            (Note: This is a simple pattern-based insight, not an AI model.)
          </p>
        </div>
      )}
    </div>
  );
}
