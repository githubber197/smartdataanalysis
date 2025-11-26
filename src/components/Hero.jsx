import React from "react";
import ThemeToggle from "./ThemeToggle";

const Hero = ({ onConnectClick, onLearnMoreClick }) => {
  return (
    <section className="relative flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium px-3 py-1 rounded-md badge-accent text-white">New • Auto insights</div>
            <div className="md:hidden"><ThemeToggle /></div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            Turn messy spreadsheets into clear business decisions.
          </h1>

          <p className="soft-text mb-6">
            Upload CSVs, auto-clean columns, generate charts & export PDF reports — explained in plain English for non-technical stakeholders.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onConnectClick}
              className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow hover:scale-105 transition"
            >
              Connect Data
            </button>
            <button
              onClick={onLearnMoreClick}
              className="px-5 py-3 border rounded-lg text-gray-700 hover:bg-gray-100 transition"
            >
              Learn how it works
            </button>
          </div>

          <div className="mt-5 text-sm soft-text">
            Trusted by early users for fast data prep and clear recommendations.
          </div>
        </div>

        <div className="relative">
          <div className="glass p-4 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Preview</div>
              <div className="text-xs soft-text">Live</div>
            </div>

            <div className="overflow-auto rounded-md border border-gray-100 dark:border-gray-700 h-36">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Region</th>
                    <th className="px-3 py-2 text-left">Sales</th>
                    <th className="px-3 py-2 text-left">Churn%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2">North</td>
                    <td className="px-3 py-2">₹ 124,000</td>
                    <td className="px-3 py-2">2.1%</td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2">South</td>
                    <td className="px-3 py-2">₹ 98,500</td>
                    <td className="px-3 py-2">3.7%</td>
                  </tr>
                  <tr className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2">West</td>
                    <td className="px-3 py-2">₹ 176,400</td>
                    <td className="px-3 py-2">1.8%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs soft-text">
              <div>Auto-suggest: Fill missing sales → mean</div>
              <div className="text-green-400 font-medium">Recommended</div>
            </div>
          </div>

          <div className="absolute -top-3 -left-3 hidden md:block">
            <div className="px-3 py-1 rounded-full badge-accent text-white text-xs shadow">Business mode</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
