// src/routes/Suggestions.jsx
import React, { useEffect, useState } from "react";

export default function Suggestions({ cleanedData }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // if you have a backend endpoint, this will call it; otherwise we compute lightweight client-side insights
    const fetchSuggestions = async () => {
      if (!cleanedData || cleanedData.length === 0) {
        setInsights([]);
        return;
      }

      setLoading(true);
      try {
        // try server path first
        const resp = await fetch("/suggestions", { method: "POST" });
        if (resp.ok) {
          const json = await resp.json();
          if (json.insights) {
            setInsights(json.insights);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // server not available — fallback to client-side analysis
      }

      // fallback: simple client-side insights (same style as backend)
      const columns = Object.keys(cleanedData[0]);
      const local = columns.map((col) => {
        const vals = cleanedData.map((r) => r[col]);
        const missing = vals.filter((v) => v === "" || v === null || v === undefined).length;
        const numeric = vals.filter((v) => v !== "" && v != null && !isNaN(parseFloat(v))).length > 0;
        let msg = "";
        if (missing > 0) msg += `${missing} missing values. `;
        if (numeric) msg += `Numeric column with ${vals.length} rows. Consider standardizing or checking outliers.`;
        if (!msg) msg = "Looks consistent.";
        return `Column '${col}': ${msg}`;
      });

      setInsights(local);
      setLoading(false);
    };

    fetchSuggestions();
  }, [cleanedData]);

  if (!cleanedData || cleanedData.length === 0)
    return <p className="text-gray-400">No cleaned data available.</p>;

  return (
    <div className="p-6 bg-white/5 rounded-2xl border border-gray-200/5">
      <h2 className="text-xl font-semibold mb-3 text-gray-800">💡 Suggestions</h2>

      {loading ? (
        <p className="text-sm text-gray-500">Loading suggestions…</p>
      ) : (
        <div className="grid gap-3">
          {insights.length === 0 ? (
            <p className="text-sm text-gray-500">No suggestions available.</p>
          ) : (
            insights.map((ins, i) => (
              <div key={i} className="p-3 bg-white/10 rounded-md border border-gray-100/5">
                <p className="text-sm text-gray-200">{typeof ins === "string" ? ins : String(ins)}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
