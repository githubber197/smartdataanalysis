import React from "react";
import Particles from "./Particles"; // ✅ Particles as background

const Hero = ({ onConnectClick, onLearnMoreClick }) => {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden text-white bg-black">
      {/* ✅ Particles Background */}
      <Particles />

      {/* Hero Content */}
      <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-10 text-center max-w-2xl">
        <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-pink-500 to-purple-500 text-transparent bg-clip-text">
          Smart Data Analytics
        </h1>
        <p className="text-gray-300 mb-6 leading-relaxed">
          Empower your business with AI-driven insights — upload your data, clean it,
          visualize trends, and get predictive suggestions to boost your performance.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onConnectClick}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-semibold shadow-lg hover:scale-105 transition"
          >
            Connect Data
          </button>
          <button
            onClick={onLearnMoreClick}
            className="px-6 py-3 border border-purple-400 rounded-lg text-white font-semibold hover:bg-white/10 hover:scale-105 transition"
          >
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
