import React from "react";
import Particles from "./Particles"; // make sure the path is correct

export default function HeroSection() {
  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-[#0a0118]">
      {/* Particle background */}
      <div className="absolute inset-0 -z-10">
        <Particles
          particleCount={300}
          particleSpread={8}
          speed={0.15}
          particleBaseSize={90}
          particleColors={["#ffffff", "#a0a0ff", "#ffb6c1"]}
          alphaParticles={true}
          moveParticlesOnHover={false}
        />
      </div>

      {/* Main content */}
      <div className="text-center bg-purple-900/30 backdrop-blur-lg border border-purple-600/40 px-10 py-14 rounded-3xl shadow-2xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
          Empower Your Business with
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500">
            Smart Data Analytics
          </span>
        </h1>

        <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
          Connect your data, clean it automatically with AI, and visualize insights with
          powerful ML models.
        </p>

        <div className="flex justify-center gap-4">
          <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium py-3 px-6 rounded-full shadow-md hover:scale-105 transition-transform">
            📊 Connect Your Data
          </button>
          <button className="border border-purple-400 text-purple-300 font-medium py-3 px-6 rounded-full hover:bg-purple-800/30 transition-all">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}
