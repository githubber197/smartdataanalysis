import React, { useState } from 'react'

export default function Dock({
  items = [],
  panelHeight = 68,
  baseItemSize = 50,
  magnification = 70,
}) {
  const [hoverIndex, setHoverIndex] = useState(null)

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg px-4 py-2 flex items-end gap-4 z-50"
      style={{ height: panelHeight }}
    >
      {items.map((item, index) => {
        const distance = hoverIndex === null ? 0 : Math.abs(index - hoverIndex)
        const scale = hoverIndex === null ? 1 : Math.max(1, 1.6 - 0.3 * distance)

        return (
          <button
            key={index}
            className="flex flex-col items-center justify-end text-gray-700 hover:text-teal-600 transition-all duration-200"
            style={{
              width: baseItemSize,
              height: baseItemSize,
              transform: `scale(${scale})`,
            }}
            onMouseEnter={() => setHoverIndex(index)}
            onMouseLeave={() => setHoverIndex(null)}
            onClick={item.onClick}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
