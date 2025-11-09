import React from "react";

export default function Upload() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-gradient-to-br from-gray-900 to-black">
      <h1 className="text-4xl font-bold text-purple-400 mb-4">📂 Upload Data</h1>
      <p className="text-gray-300 max-w-md">
        Here you can upload your sales or business data file (CSV, Excel, etc.).
      </p>
    </div>
  );
}
