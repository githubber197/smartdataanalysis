import React from "react";
import { motion } from "framer-motion";
import { Switch } from "@headlessui/react";

/**
 * Fancy purple glass ToggleSwitch
 * Props:
 *  - enabled (boolean)
 *  - onChange (fn)
 *  - labels: { left: 'Individual', right: 'Compare' } optional
 */
export default function ToggleSwitch({
  enabled,
  onChange,
  labels = { left: "📊 Individual", right: "⚖️ Compare" },
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-300 select-none">{labels.left}</span>

      <Switch
        checked={enabled}
        onChange={onChange}
        className={`${
          enabled ? "bg-purple-600/80" : "bg-gray-700/60"
        } relative inline-flex items-center h-8 w-16 rounded-full p-1 transition`}
      >
        <span className="sr-only">Toggle view</span>
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 700, damping: 30 }}
          className={`inline-block h-6 w-6 rounded-full bg-white shadow transform`}
        />
      </Switch>

      <span className="text-sm text-gray-300 select-none">{labels.right}</span>
    </div>
  );
}
