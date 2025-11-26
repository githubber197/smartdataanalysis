// src/components/Footer.jsx
import React from "react";

export default function Footer() {
  return (
    <footer className="app-container mt-8 mb-6">
      <div className="glass p-4 rounded-2xl flex items-center justify-between">
        <div className="text-sm soft-text">© {new Date().getFullYear()} Smart Data Analytics</div>
        <div className="flex gap-3 text-sm soft-text">
          <a className="hover:underline" href="#about">About</a>
          <a className="hover:underline" href="#reports">Reports</a>
        </div>
      </div>
    </footer>
  );
}
