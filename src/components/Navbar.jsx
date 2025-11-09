import { motion } from "framer-motion";

export default function Navbar({ refs }) {
  const handleScroll = (ref) => ref.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <motion.nav
      className="fixed top-0 left-0 w-full z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-700"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-3">
        <h1 className="text-xl font-bold text-purple-400 cursor-pointer" onClick={() => handleScroll(refs.heroRef)}>SmartAnalytics</h1>
        <ul className="flex gap-6 text-gray-300">
          <li className="cursor-pointer hover:text-purple-400" onClick={() => handleScroll(refs.aboutRef)}>About</li>
          <li className="cursor-pointer hover:text-purple-400" onClick={() => handleScroll(refs.dataRef)}>Data</li>
          <li className="cursor-pointer hover:text-purple-400" onClick={() => handleScroll(refs.dashboardRef)}>Dashboard</li>
          <li className="cursor-pointer hover:text-purple-400" onClick={() => handleScroll(refs.reportsRef)}>Reports</li>
        </ul>
      </div>
    </motion.nav>
  );
}
