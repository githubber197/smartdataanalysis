import React from "react";

export default function Insights({ cleanedData }) {
  if (!cleanedData || cleanedData.length === 0)
    return <p className="text-gray-400">No cleaned data available.</p>;

  const columns = Object.keys(cleanedData[0]);

  // Generate insights for each column
  const insights = columns.map((col) => {
    const values = cleanedData.map((row) => row[col]);
    const numericVals = values.filter((v) => !isNaN(parseFloat(v))).map(Number);
    const missing = values.filter((v) => v === "" || v === null || v === undefined).length;
    const unique = new Set(values).size;

    let suggestion = "";

    if (missing > 0) {
      suggestion += `❗ Column "${col}" has ${missing} missing entries. Consider filling with average, median, or removing them. `;
    }

    if (numericVals.length > 0) {
      const avg = (numericVals.reduce((a, b) => a + b, 0) / numericVals.length).toFixed(2);
      const min = Math.min(...numericVals);
      const max = Math.max(...numericVals);
      suggestion += `🔢 Numeric column: avg=${avg}, min=${min}, max=${max}. `;
      
      // Detect outliers (simple 1.5*IQR method)
      const sorted = numericVals.sort((a, b) => a - b);
      const q1 = sorted[Math.floor((sorted.length / 4))];
      const q3 = sorted[Math.floor((sorted.length * 3) / 4)];
      const iqr = q3 - q1;
      const outliers = numericVals.filter((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr).length;
      if (outliers > 0) suggestion += `⚠️ Detected ${outliers} potential outliers. `;
    } else {
      // Categorical column
      suggestion += `🟢 Categorical column: ${unique} unique values. `;
    }

    if (!suggestion) suggestion = "✅ Column looks clean and ready for analysis.";

    return { col, suggestion };
  });

  return (
    <div className="p-6 bg-white/5 rounded-2xl shadow-lg border border-purple-500/30 max-h-[600px] overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4 text-purple-400">💡 AI Suggestions</h2>
      <ul className="list-disc list-inside text-gray-300 space-y-2">
        {insights.map((i, idx) => (
          <li key={idx}><b>{i.col}:</b> {i.suggestion}</li>
        ))}
      </ul>
    </div>
  );
}
