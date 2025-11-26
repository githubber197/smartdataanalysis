import React, { useRef, useState } from "react";
import Papa from "papaparse";

export default function DataInput({ rawData, setRawData, setCleanedData }) {
  const inputRef = useRef();
  const [preview, setPreview] = useState([]);
  const [filename, setFilename] = useState("");

  const handleFile = (file) => {
    setFilename(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (res) => {
        setPreview(res.data.slice(0, 20));
        setRawData(res.data);
        setCleanedData([]);
      },
      error: (err) => alert("CSV parse error: " + err.message),
    });
  };

  return (
    <section className="w-full flex justify-center mt-10">
      <div className="w-full max-w-5xl bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 border border-gray-200 dark:border-gray-700">
        
        {/* HEADER */}
        <h2 className="text-2xl font-semibold">Upload CSV</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Select a CSV file. We’ll preview the first 20 rows to help you begin cleaning.
        </p>

        {/* FILE BUTTONS */}
        <div className="mt-6 flex gap-4 flex-wrap">
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files[0]) handleFile(e.target.files[0]);
            }}
          />

          <button
            onClick={() => inputRef.current.click()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm"
          >
            Choose CSV
          </button>

          <button
            onClick={() => {
              setRawData([]);
              setPreview([]);
              setFilename("");
              setCleanedData([]);
            }}
            className="px-4 py-2 border border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Clear
          </button>
        </div>

        {/* FILENAME */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-700 dark:text-gray-300">Selected:</span>{" "}
          {filename || "none"}
        </div>

        {/* PREVIEW */}
        <div className="mt-6 overflow-auto max-h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg">
          {preview.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">
              No preview — upload a CSV.
            </div>
          ) : (
            <table className="w-full text-sm table-auto border-collapse">
              <thead className="bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {Object.keys(preview[0]).map((k) => (
                    <th
                      key={k}
                      className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300"
                    >
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {preview.map((row, i) => (
                  <tr
                    key={i}
                    className={`${
                      i % 2 === 0
                        ? "bg-white dark:bg-gray-800"
                        : "bg-gray-50 dark:bg-gray-800/50"
                    } border-b border-gray-200 dark:border-gray-700`}
                  >
                    {Object.keys(preview[0]).map((k) => (
                      <td key={k} className="px-3 py-2 text-gray-700 dark:text-gray-200">
                        {String(row[k] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
