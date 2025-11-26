// src/components/GlobalClickSpark.jsx
import React from "react";

/**
 * Very small non-intrusive animated accent placed in top-right.
 * Safe: purely decorative.
 */
export default function GlobalClickSpark() {
  return (
    <div aria-hidden="true" className="fixed right-4 top-4 z-40">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 shadow-lg spark-pulse" />
    </div>
  );
}
