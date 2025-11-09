import React from "react";

export default function MagicBento({ sections, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSelect(section.id)}
          className="bg-purple-600 hover:bg-purple-500 rounded-xl py-4 px-5 text-white font-semibold transition-all shadow-lg hover:scale-105"
        >
          {section.label}
        </button>
      ))}
    </div>
  );
}
