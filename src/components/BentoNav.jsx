import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function BentoNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Hide BentoNav on Hero page (homepage)
  if (pathname === "/") return null;

  const buttons = [
    { name: "Upload", path: "/upload" },
    { name: "Clean", path: "/clean" },
    { name: "Prediction", path: "/prediction" },
    { name: "Suggestions", path: "/suggestions" },
    { name: "Reports", path: "/reports" },
    { name: "Analytics", path: "/analytics" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 bg-black/50 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-purple-500/30 z-50">
      {buttons.map((btn) => (
        <button
          key={btn.path}
          onClick={() => navigate(btn.path)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-transform transform hover:scale-110 ${
            pathname === btn.path
              ? "bg-purple-700 text-white"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
        >
          {btn.name}
        </button>
      ))}
    </div>
  );
}
