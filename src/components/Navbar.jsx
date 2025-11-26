// src/components/Navbar.jsx
import { motion } from "framer-motion";

export default function Navbar({ refs }) {
  const handleScroll = (ref) =>
    ref.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <motion.nav
      className="
        fixed top-0 left-0 w-full z-50
        bg-white/40 dark:bg-black/30
        backdrop-blur-xl
        border-b border-white/20 dark:border-gray-700/40
        shadow-lg shadow-black/5
      "
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        <h1
          className="text-xl font-bold text-gray-900 dark:text-gray-100 cursor-pointer"
          onClick={() => handleScroll(refs.heroRef)}
        >
          SmartAnalytics
        </h1>

        <ul className="hidden md:flex gap-8 text-gray-700 dark:text-gray-300 font-medium">
          <li className="cursor-pointer hover:text-purple-500 transition"
              onClick={() => handleScroll(refs.aboutRef)}>
            About
          </li>

          <li className="cursor-pointer hover:text-purple-500 transition"
              onClick={() => handleScroll(refs.dataRef)}>
            Data
          </li>

          <li className="cursor-pointer hover:text-purple-500 transition"
              onClick={() => handleScroll(refs.dashboardRef)}>
            Dashboard
          </li>

          <li className="cursor-pointer hover:text-purple-500 transition"
              onClick={() => handleScroll(refs.reportsRef)}>
            Reports
          </li>
        </ul>
      </div>
    </motion.nav>
  );
}
