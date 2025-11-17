import React, { useState, useEffect } from "react";
import { getVersions, revertVersion } from "../utils/versionStore";
import { loadTempVersions } from "../utils/versionStore";

export default function VersionHistory({ type, column = null, onRevert }) {
  const [versions, setVersions] = useState([]);
  const [tempVersions, setTempVersions] = useState([]);

  useEffect(() => {
    setVersions(getVersions(type, column));
    const temp = loadTempVersions();
    const key = column ? `${type}_${column}` : type;
    setTempVersions(temp[key] || []);
  }, [type, column]);

  const handleRevert = (index) => {
    const reverted = revertVersion(type, index, column);
    if (reverted && onRevert) onRevert(reverted);
    setVersions(getVersions(type, column));
  };

  if (versions.length === 0 && tempVersions.length === 0) return null;

  return (
    <div className="mt-4 p-3 bg-gray-800/40 border border-purple-500/20 rounded-lg text-sm">
      <h3 className="font-semibold text-purple-400 mb-2">
        {column ? `History: ${column}` : "Version History"}
      </h3>

      {/* TEMPORARY */}
      {tempVersions.length > 0 && (
        <>
          <p className="text-red-400 text-xs mb-1">(Temporary — cleared on refresh)</p>
          <ul className="space-y-1 mb-2">
            {tempVersions.map((v, i) => (
              <li key={i} className="text-gray-400 bg-gray-900/20 px-3 py-1 rounded">
                {new Date(v.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Permanent */}
      <ul className="space-y-1 max-h-40 overflow-y-auto">
        {versions.map((v, i) => (
          <li
            key={i}
            className="flex justify-between items-center text-gray-300 bg-gray-900/30 px-3 py-1 rounded-md hover:bg-gray-800/50"
          >
            <span>{new Date(v.timestamp).toLocaleString()}</span>
            <button
              onClick={() => handleRevert(i)}
              className="text-xs bg-purple-600/70 px-2 py-1 rounded hover:bg-purple-700 transition"
            >
              Revert
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
