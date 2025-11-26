import React from "react";
import ThemeToggle from "./ThemeToggle";

export default function Header({ setActive }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur glass p-3">
      <div className="app-container flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="text-lg font-bold">Smart Data Analytics</div>
          <nav className="hidden md:flex gap-3 text-sm">
            <button onClick={()=>setActive("upload")} className="px-3 py-1 rounded hover:bg-white/5">Upload</button>
            <button onClick={()=>setActive("clean")} className="px-3 py-1 rounded hover:bg-white/5">Cleaning</button>
            <button onClick={()=>setActive("analytics")} className="px-3 py-1 rounded hover:bg-white/5">Analytics</button>
            <button onClick={()=>setActive("dashboard")} className="px-3 py-1 rounded hover:bg-white/5">Dashboard</button>
            <button onClick={()=>setActive("reports")} className="px-3 py-1 rounded hover:bg-white/5">Reports</button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={()=>setActive("reports")} className="px-3 py-1 btn-primary hidden sm:inline-block">Quick Report</button>
          <button onClick={()=>setActive("upload")} className="px-3 py-1 btn-ghost hidden sm:inline-block">Connect Data</button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
