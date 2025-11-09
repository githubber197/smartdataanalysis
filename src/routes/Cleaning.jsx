import React from "react";

export default function Cleaning({ rawData, cleanedData, setCleanedData }) {
  const cleanData = () => {
    if (!rawData || rawData.length === 0) return alert("Upload data first!");
    const cleaned = rawData.filter((row) =>
      Object.values(row).every((val) => val !== "" && val !== null)
    );
    setCleanedData(cleaned);
  };

  return (
    <div className="p-6 bg-gray-800 rounded-xl border border-purple-500/30">
      <h2 className="text-xl font-bold text-purple-400 mb-4">🧹 Data Cleaning</h2>

      <button
        className="bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 transition-all"
        onClick={cleanData}
      >
        Clean Data
      </button>

      {cleanedData && cleanedData.length > 0 && (
        <div className="mt-4 border border-purple-500 rounded-lg p-2 cleaning-scroll max-h-64">
          <table className="w-full table-auto border-collapse text-sm">
            <thead>
              <tr>
                {Object.keys(cleanedData[0]).map((col, i) => (
                  <th key={i} className="border px-2 py-1 text-left bg-gray-700">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cleanedData.slice(0, 100).map((row, idx) => (
                <tr key={idx}>
                  {Object.values(row).map((val, i) => (
                    <td key={i} className="border px-2 py-1">
                      {val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
