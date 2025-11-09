import React, { useState } from "react";

export default function Predictions({ cleanedData }) {
  const [predicted, setPredicted] = useState(null);
  const [explanations, setExplanations] = useState([]);

  const runPrediction = () => {
    if (!cleanedData || cleanedData.length === 0) {
      alert("Please clean data first!");
      return;
    }

    // Identify numeric columns
    const columns = Object.keys(cleanedData[0]);
    const numericCols = columns.filter(
      (col) => !isNaN(parseFloat(cleanedData[0][col]))
    );

    if (numericCols.length < 2) {
      setPredicted("Not enough numeric data for ML prediction");
      setExplanations([]);
      return;
    }

    const targetCol = numericCols[0]; // Assume first numeric column is "target"
    const otherCols = numericCols.slice(1);

    // Simple prediction logic: compare column averages to target average
    const avg = (col) =>
      cleanedData.reduce((sum, row) => sum + parseFloat(row[col] || 0), 0) /
      cleanedData.length;

    const targetAvg = avg(targetCol);

    const contributions = otherCols.map((col) => {
      const diff = avg(col) - targetAvg;
      return { col, diff: diff.toFixed(2), trend: diff > 0 ? "positive" : "negative" };
    });

    // Predict based on sum of trends
    const positiveImpact = contributions.filter((c) => c.trend === "positive").length;
    const negativeImpact = contributions.filter((c) => c.trend === "negative").length;
    const prediction = positiveImpact >= negativeImpact
      ? "📈 Sales likely to increase"
      : "📉 Sales likely to decrease";

    setPredicted(prediction);

    // Human-readable explanation
    const explanationText = contributions.map(
      (c) =>
        `Column "${c.col}" has a ${c.trend} impact on ${targetCol} (avg difference: ${c.diff})`
    );

    setExplanations(explanationText);
  };

  return (
    <div className="p-6 bg-white/5 rounded-2xl shadow-lg border border-purple-500/30 max-h-[600px] overflow-y-auto">
      <h2 className="text-xl font-semibold mb-3 text-purple-400">🤖 ML Predictions</h2>
      <button
        onClick={runPrediction}
        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-all mb-4"
      >
        Run Prediction
      </button>
      {predicted && <p className="mt-2 text-lg font-bold">{predicted}</p>}
      {explanations.length > 0 && (
        <div className="mt-4 text-gray-300 text-sm space-y-1">
          <h3 className="font-semibold text-purple-300 mb-2">Factor Analysis:</h3>
          <ul className="list-disc list-inside">
            {explanations.map((exp, idx) => (
              <li key={idx}>{exp}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
