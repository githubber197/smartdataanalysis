// src/components/VersionHistory.jsx
import React, { useState, useEffect } from "react";
import { getVersions, revertVersion } from "../utils/versionStore";

export default function VersionHistory({ type, column, onRevert }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState([]);

  const load = () => {
    if (!column) return;
    setVersions(getVersions(type, column));
  };

  useEffect(() => {
    if (open) load();
  }, [open, column]);

  const handleRevert = (index) => {
    const restored = revertVersion(type, column, index);
    if (onRevert) onRevert(restored);
    setOpen(false);
  };

  return (
    <>
      {/* Open Button */}
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm"
      >
        History
      </button>

      {/* BACKDROP — Only exists when open */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        />
      )}

      {/* DRAWER — Fully unmounted when closed */}
      {open && (
        <div
          className="fixed top-0 right-0 h-full w-80 bg-gray-900 text-white z-50 shadow-xl
                     transform transition-transform duration-300 translate-x-0"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-sm">Version History</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-60px)]">
            {versions.length === 0 && (
              <p className="text-gray-500 text-sm">
                No versions saved for this column.
              </p>
            )}

            {versions.map((v, i) => (
              <div
                key={i}
                className="p-3 border border-gray-700 rounded bg-gray-800/50"
              >
                <div className="font-semibold text-sm mb-1">Version {i + 1}</div>
                <div className="text-xs text-gray-400 mb-2">
                  {v.meta?.note || "Snapshot saved"}
                </div>

                <button
                  onClick={() => handleRevert(i)}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-xs rounded"
                >
                  Revert
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
