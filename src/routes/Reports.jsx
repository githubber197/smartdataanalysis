import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Reports({ rawData, cleanedData }) {
  const [loading, setLoading] = useState(false);

  // ----- Utility Functions -----
  function generateInsights(cleaned) {
    if (!cleaned || cleaned.length === 0) return ["Not enough data."];

    const cols = Object.keys(cleaned[0]);
    const insights = [];

    // Example numeric insights
    cols.forEach((col) => {
      const nums = cleaned
        .map((r) => parseFloat(r[col]))
        .filter((n) => !isNaN(n));

      if (nums.length > 3) {
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        const max = Math.max(...nums);
        const min = Math.min(...nums);
        insights.push(
          `• Column "${col}" shows an average of ${avg.toFixed(
            2
          )} with a range between ${min} and ${max}.`
        );

        if (max > avg * 1.8)
          insights.push(`• "${col}" contains unusually high peaks above normal trend.`);
      }
    });

    return insights;
  }

  function generateAnomalies(cleaned) {
    if (!cleaned || cleaned.length === 0) return ["No anomalies detected."];

    const anomalies = [];
    const cols = Object.keys(cleaned[0]);

    cols.forEach((col) => {
      const nums = cleaned
        .map((r) => parseFloat(r[col]))
        .filter((n) => !isNaN(n));

      if (nums.length < 5) return;

      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      const std =
        Math.sqrt(nums.map((n) => (n - avg) ** 2).reduce((a, b) => a + b, 0) / nums.length) || 0;

      nums.forEach((n, i) => {
        if (Math.abs(n - avg) > std * 2.5) {
          anomalies.push(
            `• Row ${i + 1} in "${col}" has an anomaly value ${n} (deviates strongly from normal trend).`
          );
        }
      });
    });

    return anomalies.length ? anomalies : ["No major anomalies detected."];
  }

  function generatePredictions(cleaned) {
    if (!cleaned || cleaned.length === 0) return ["Not enough data for predictions."];

    const cols = Object.keys(cleaned[0]);
    const preds = [];

    cols.forEach((col) => {
      const nums = cleaned
        .map((r) => parseFloat(r[col]))
        .filter((n) => !isNaN(n));

      if (nums.length < 4) return;

      // Simple trend prediction
      const last = nums.slice(-2);
      const trend = last[1] - last[0];
      const next = last[1] + trend;

      preds.push(
        `• "${col}" is projected to move toward **${next.toFixed(
          2
        )}** based on its recent trend direction.`
      );
    });

    return preds.length ? preds : ["No predictable trend found."];
  }

  // ----- PDF Generation -----
  async function handleDownloadReport() {
    try {
      setLoading(true);

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      let y = 40;

      doc.setFontSize(20);
      doc.text("Smart Data Analytics — Full Report", 40, y);
      y += 25;

      // 1. Raw Data Table
      if (rawData?.length > 0) {
        doc.setFontSize(14);
        doc.text("Raw Data (first 15 rows)", 40, y);
        y += 10;

        autoTable(doc, {
          startY: y,
          head: [Object.keys(rawData[0])],
          body: rawData.slice(0, 15).map((r) => Object.values(r)),
          styles: { fontSize: 8 },
          theme: "striped",
        });

        y = doc.lastAutoTable.finalY + 20;
      }

      // 2. Cleaned Data
      if (cleanedData?.length > 0) {
        doc.setFontSize(14);
        doc.text("Cleaned Data (first 15 rows)", 40, y);
        y += 10;

        autoTable(doc, {
          startY: y,
          head: [Object.keys(cleanedData[0])],
          body: cleanedData.slice(0, 15).map((r) => Object.values(r)),
          styles: { fontSize: 8 },
          theme: "grid",
        });

        y = doc.lastAutoTable.finalY + 25;
      }

      // 3. Insights
      const insights = generateInsights(cleanedData);
      doc.setFontSize(16);
      doc.text("Insights", 40, y);
      y += 15;

      doc.setFontSize(12);
      insights.forEach((line) => {
        doc.text(line, 40, y);
        y += 14;
      });

      y += 10;

      // 4. Anomalies
      const anomalies = generateAnomalies(cleanedData);
      doc.setFontSize(16);
      doc.text("Anomalies Detected", 40, y);
      y += 15;

      doc.setFontSize(12);
      anomalies.forEach((line) => {
        doc.text(line, 40, y);
        y += 14;
      });

      y += 10;

      // 5. Predictions
      const predictions = generatePredictions(cleanedData);
      doc.setFontSize(16);
      doc.text("Predictions", 40, y);
      y += 15;

      doc.setFontSize(12);
      predictions.forEach((line) => {
        doc.text(line, 40, y);
        y += 14;
      });

      doc.save("smart-data-report.pdf");
      setLoading(false);
    } catch (err) {
      console.error("Report Error:", err);
      alert("Failed to create report.");
      setLoading(false);
    }
  }

  return (
    <div className="glass p-6 rounded-xl border shadow mt-6">
      <h2 className="text-xl font-semibold mb-4">📄 Reports</h2>

      <button
        onClick={handleDownloadReport}
        disabled={loading}
        className="px-4 py-2 bg-purple-600 text-white rounded"
      >
        {loading ? "Generating report…" : "Download Full PDF Report"}
      </button>
    </div>
  );
}
