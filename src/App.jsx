import React, { useEffect, useState } from "react";
import Hero from "./components/Hero";
import DataInput from "./routes/DataInput";
import Cleaning from "./routes/Cleaning";
import Analytics from "./routes/Analytics";
import Dashboard from "./routes/Dashboard";
import Predictions from "./routes/Predictions";
import Insights from "./routes/Insights";
import Reports from "./routes/Reports";
import GlobalClickSpark from "./components/GlobalClickSpark";
import ThemeToggle from "./components/ThemeToggle";

export default function App() {
  const [activeSection, setActiveSection] = useState(null);

  // Load from localStorage safely
  const [rawData, setRawData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sda_raw")) || [];
    } catch {
      return [];
    }
  });

  const [cleanedData, setCleanedData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("sda_cleaned")) || [];
    } catch {
      return [];
    }
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("sda_raw", JSON.stringify(rawData || []));
    } catch {}
  }, [rawData]);

  useEffect(() => {
    try {
      localStorage.setItem("sda_cleaned", JSON.stringify(cleanedData || []));
    } catch {}
  }, [cleanedData]);

  // Render active page
  const renderActiveSection = () => {
    const fadeClass = "animate-fade";

    switch (activeSection) {
      case "data-upload":
        return (
          <div className={fadeClass}>
            <DataInput
              rawData={rawData}
              setRawData={(d) => {
                setRawData(d);
                setCleanedData([]);
              }}
              setCleanedData={setCleanedData}
            />
          </div>
        );

      case "cleaning":
        return (
          <div className={fadeClass}>
            <Cleaning
              rawData={rawData}
              cleanedData={cleanedData}
              setCleanedData={setCleanedData}
            />
          </div>
        );

      case "analytics":
        return (
          <div className={fadeClass}>
            <Analytics cleanedData={cleanedData} />
          </div>
        );

      case "predictions":
        return (
          <div className={fadeClass}>
            <Predictions cleanedData={cleanedData} />
          </div>
        );

      case "dashboard":
        return (
          <div className={fadeClass}>
            <Dashboard cleanedData={cleanedData} />
          </div>
        );

      case "suggestions":
        return (
          <div className={fadeClass}>
            <Insights cleanedData={cleanedData} />
          </div>
        );

      case "reports":
        return (
          <div className={fadeClass}>
            <Reports rawData={rawData} cleanedData={cleanedData} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="App min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <GlobalClickSpark />

      {/* HEADER */}
      <header className="w-full border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-black/40 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="font-bold text-lg">Smart Data Analytics</div>

            {/* NAVIGATION */}
            <nav className="hidden md:flex gap-4 text-sm">
              {[
                ["data-upload", "Upload"],
                ["cleaning", "Cleaning"],
                ["analytics", "Analytics"],
                ["predictions", "Predictions"], // 🟣 added
                ["dashboard", "Dashboard"],
                ["reports", "Reports"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveSection(key)}
                  className={`px-3 py-1 rounded transition ${
                    activeSection === key
                      ? "bg-purple-600 text-white"
                      : "hover:bg-gray-200/50 dark:hover:bg-gray-800/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* RIGHT SIDE BUTTONS */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <button
              onClick={() => setActiveSection("reports")}
              className="hidden sm:block px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
            >
              Quick Report
            </button>

            <button
              onClick={() => setActiveSection("data-upload")}
              className="px-3 py-1 border border-purple-500 rounded-md text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
            >
              Connect Data
            </button>
          </div>
        </div>
      </header>

      {/* HERO HOME SCREEN */}
      {activeSection === null && (
        <main className="animate-fade">
          <Hero
            onConnectClick={() => setActiveSection("data-upload")}
            onLearnMoreClick={() => setActiveSection("about")}
          />
        </main>
      )}

      {/* MAIN CONTENT */}
      <div id="active-section" className="max-w-7xl mx-auto mt-8 px-4 pb-10">
        {renderActiveSection()}
      </div>
    </div>
  );
}
