// src/components/StarBorder.jsx
import React from "react";

/**
 * Small pill/card wrapper your UI used in many places.
 * Keeps previous props/children interface.
 */
export default function StarBorder({ children, className = "", onClick = ()=>{} }) {
  return (
    <button onClick={onClick} className={`glass px-6 py-3 rounded-2xl text-sm font-medium ${className}`}>
      {children}
    </button>
  );
}
