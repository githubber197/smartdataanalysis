import React, { useState } from "react";
import Papa from "papaparse";
import VersionHistory from "../components/VersionHistory";
import { saveVersion, clearAllVersions, saveTempVersion } from "../utils/versionStore";

export default function DataInput({ rawData = [], setRawData, setCleanedData }) {
  const [fileName, setFileName] = useState("");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset all stored versions
    clearAllVersions();

    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data || [];

        const keys = parsed.length ? Object.keys(parsed[0]) : [];
        const normalized = parsed.map((r) => {
          const out = {};
          keys.forEach((k) => {
            out[k] = r[k] === undefined ? null : r[k];
          });
          return out;
        });

        setRawData(normalized);
        setCleanedData(JSON.parse(JSON.stringify(normalized)));

        saveVersion("rawData", normalized);
      },
    });
  };

  const handleRevert = (data) => {
    if (data) {
      setRawData(data);
      setCleanedData(JSON.parse(JSON.stringify(data)));
    }
  };

  return (
    <div className="p-6 bg-white/5 rounded-2xl shadow-lg border border-purple-500/30 overflow-x-auto">
      <h2 className="text-xl font-semibold mb-3 text-purple-400">📂 Import CSV Data</h2>

      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="block w-full p-2 border border-purple-600 rounded-lg bg-black/20 text-gray-200 cursor-pointer"
      />

      {fileName && <p className="mt-2 text-sm text-gray-400">Uploaded: {fileName}</p>}
      <p className="mt-2 text-sm text-gray-400">Rows loaded: {rawData ? rawData.length : 0}</p>

      {rawData.length > 0 && (
        <div className="mt-4 overflow-auto max-h-96 border border-purple-500/20 rounded-lg">
          <table className="min-w-full text-sm text-gray-300 border-collapse">
            <thead className="bg-purple-800/30 text-purple-300 sticky top-0">
              <tr>
                {Object.keys(rawData[0]).map((key) => (
                  <th key={key} className="px-3 py-2 border-b border-purple-700/30 text-left">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawData.slice(0, 10).map((row, i) => (
                <tr key={i} className="hover:bg-purple-900/10">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-3 py-1 border-b border-purple-700/10">
                      {val === null || val === undefined ? "" : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rawData.length > 10 && (
            <p className="text-xs text-gray-500 text-center py-2">Showing first 10 rows of {rawData.length}</p>
          )}
        </div>
      )}

      <VersionHistory type="rawData" onRevert={handleRevert} />
    </div>
  );
}
