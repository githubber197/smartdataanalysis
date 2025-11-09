import React from "react";
import { motion } from "framer-motion";
import { SparklesIcon, ChartBarIcon } from "@heroicons/react/24/solid";
import Particles from "./Particles"; // ✅ Added import

const Spark = ({ delay }) => (
  <motion.div
    className="absolute w-2 h-2 bg-purple-400/60 rounded-full blur-[2px]"
    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
    animate={{
      opacity: [0.8, 0, 0.8],
      scale: [1, 1.5, 1],
      x: [0, (Math.random() - 0.5) * 200],
      y: [0, (Math.random() - 0.5) * 200],
    }}
    transition={{
      duration: 4 + Math.random() * 2,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

const Hero = ({ onConnectClick, onLearnMoreClick }) => {
  return (
    <section className="relative w-full h-screen flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-purple-700/5 overflow-hidden">

      {/* ✅ Added Particles background */}
      <div className="absolute inset-0 -z-10">
        <Particles
          particleCount={200}
          particleSpread={10}
          particleBaseSize={60}
          speed={0.1}
          particleColors={["#a855f7", "#ec4899", "#ffffff"]} // purple-pink-white theme
          alphaParticles={true}
          moveParticlesOnHover={false}
          disableRotation={false}
        />
      </div>

      {/* Floating Sparks (existing) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <Spark key={i} delay={i * 0.3} />
        ))}
      </div>

      {/* Center Content (existing) */}
      <div className="relative bg-purple-900/30 backdrop-blur-md border border-purple-600/40 rounded-3xl p-10 md:p-16 text-center max-w-3xl shadow-[0_0_50px_rgba(168,85,247,0.2)]">
        <motion.h1
          className="text-4xl md:text-5xl lg:text-6xl font-bold text-purple-300 mb-4 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Empower Your Business with
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            Smart Data Analytics
          </span>
        </motion.h1>

        <motion.p
          className="text-gray-300 text-base md:text-lg mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          Connect your data, clean it automatically with AI, and visualize insights with powerful ML models.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: "spring", stiffness: 120 }}
        >
          <button
            onClick={onConnectClick}
            className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
          >
            <ChartBarIcon className="h-5 w-5" />
            Connect Your Data
          </button>

          <button
            onClick={onLearnMoreClick}
            className="px-6 py-3 rounded-lg bg-transparent border border-purple-400 hover:bg-purple-500/10 text-purple-300 font-medium flex items-center gap-2 transition-all duration-300"
          >
            <SparklesIcon className="h-5 w-5" />
            Learn More
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
