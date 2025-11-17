import React, { useEffect, useState } from "react";
import { CSVLink } from "react-csv";
import { downloadAllCharts } from "../utils/chartDownloader";

export default function Reports({ rawData, cleanedData }) {
  const combinedData = cleanedData || [];
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    // Wait a moment for Chart.js to fully render canvases
    const timeout = setTimeout(() => {
      setChartsReady(true);
    }, 800); // 0.8 sec ensures charts finish drawing

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="p-6 bg-white/5 rounded-2xl shadow-lg border border-purple-500/30">
      <h2 className="text-xl font-semibold mb-4 text-purple-400">📥 Reports</h2>

      <div className="flex flex-col space-y-4">
        
        {rawData && (
          <CSVLink
            data={rawData}
            filename="raw_data.csv"
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-center"
          >
            Download Raw Data
          </CSVLink>
        )}

        {cleanedData && (
          <CSVLink
            data={cleanedData}
            filename="cleaned_data.csv"
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-center"
          >
            Download Cleaned Data
          </CSVLink>
        )}

        {combinedData.length > 0 && (
          <CSVLink
            data={combinedData.map(row => ({
              ...row,
              _prediction: "Sales trend example"
            }))}
            filename="ai_ml_report.csv"
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-center"
          >
            Download AI & ML Predictions
          </CSVLink>
        )}

        {/* DISABLE BUTTON UNTIL CHARTS FINISH RENDERING */}
        <button
          onClick={downloadAllCharts}
          disabled={!chartsReady}
          className={`px-6 py-2 rounded-lg text-white text-center ${
            chartsReady
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-500 cursor-not-allowed"
          }`}
        >
          {chartsReady ? "📊 Download All Charts" : "⏳ Preparing Charts..."}
        </button>

      </div>
    </div>
  );
}
