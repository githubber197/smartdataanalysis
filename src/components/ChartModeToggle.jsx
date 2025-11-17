// src/components/ChartModeToggle.jsx
import React from "react";

export default function ChartModeToggle({ mode, setMode }) {
  return (
    <div className="flex items-center justify-center gap-3 fixed top-6 right-6 z-20 bg-gray-800/70 px-4 py-2 rounded-full border border-purple-500/30 shadow-md backdrop-blur-sm">
      <span className={`text-sm ${mode === "individual" ? "text-purple-400 font-semibold" : "text-gray-400"}`}>
        Individual
      </span>

      <button
        onClick={() => setMode(mode === "individual" ? "comparison" : "individual")}
        className="w-12 h-6 flex items-center bg-gray-600 rounded-full p-1 transition"
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
            mode === "comparison" ? "translate-x-6 bg-purple-400" : "translate-x-0"
          }`}
        />
      </button>

      <span className={`text-sm ${mode === "comparison" ? "text-pink-400 font-semibold" : "text-gray-400"}`}>
        Compare
      </span>
    </div>
  );
}
