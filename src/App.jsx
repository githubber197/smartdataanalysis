import React, { useState, useEffect } from "react";
import Hero from "./components/Hero";
import DataInput from "./routes/DataInput";
import Cleaning from "./routes/Cleaning";
import Analytics from "./routes/Analytics";
import Dashboard from "./routes/Dashboard";
import Predictions from "./routes/Predictions";
import Suggestions from "./routes/Insights";
import Reports from "./routes/Reports";
import GlobalClickSpark from "./components/GlobalClickSpark";
import StarBorder from "./components/StarBorder";
import { fadeIn, slideUp } from "./components/animations";

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [cleanedData, setCleanedData] = useState([]);
  const [activeSection, setActiveSection] = useState(null);

  // Smooth scroll to active section when it changes
  useEffect(() => {
    if (activeSection) {
      const sectionElement = document.getElementById("active-section");
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [activeSection]);

  // Animate About and Footer on mount
  useEffect(() => {
    fadeIn("#about", 0.2);
    slideUp("footer", 0.8);
  }, []);

  const handleConnectClick = () => setActiveSection("data-upload");

  const handleLearnMoreClick = () => {
    const aboutSection = document.getElementById("about");
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "data-upload":
        return (
          <DataInput
            rawData={rawData}
            setRawData={setRawData}
            setCleanedData={setCleanedData}
          />
        );
      case "cleaning":
        return (
          <Cleaning
            rawData={rawData}
            cleanedData={cleanedData}
            setCleanedData={setCleanedData}
          />
        );
      case "analytics":
        return <Analytics cleanedData={cleanedData} />;
      case "predictions":
        return <Predictions cleanedData={cleanedData} />;
      case "dashboard":
        return <Dashboard cleanedData={cleanedData} />;
      case "suggestions":
        return <Suggestions cleanedData={cleanedData} />;
      case "reports":
        return <Reports cleanedData={cleanedData} />;
      default:
        return null;
    }
  };

  return (
    <div className="App w-full min-h-screen bg-gray-900 text-white overflow-x-hidden relative flex flex-col">
      <GlobalClickSpark />

      {/* Hero Section */}
      <Hero
        onConnectClick={handleConnectClick}
        onLearnMoreClick={handleLearnMoreClick}
      />

      {/* 🟣 About Section */}
      <section
        id="about"
        className="max-w-5xl mx-auto mt-20 px-6 py-16 bg-gray-800/70 backdrop-blur-sm rounded-2xl border border-purple-500/30 relative z-10 shadow-lg"
      >
        <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
          About Smart Data Analytics
        </h2>
        <p className="text-gray-300 mb-4 leading-relaxed">
          <strong>Smart Data Analytics</strong> is an AI-powered platform that helps you
          uncover insights, automate cleaning, and visualize trends from your business
          data — no coding required. Our mission is to make advanced data analytics
          simple, fast, and actionable for everyone.
        </p>
        <p className="text-gray-300 mb-4 leading-relaxed">
          Whether your data comes from spreadsheets, CRMs, or sales tools, our engine
          automatically detects inconsistencies, fills missing values, and structures it
          for analysis. You’ll save hours of manual work while ensuring your data is clean
          and reliable.
        </p>
        <p className="text-gray-300 mb-4 leading-relaxed">
          After cleaning, you can explore intuitive dashboards, visualize sales trends,
          and use predictive AI to anticipate customer behavior, optimize operations, and
          make smarter strategic decisions.
        </p>
        <p className="text-gray-300 leading-relaxed">
          With <strong>Smart Data Analytics</strong>, transform your raw data into
          business intelligence — empowering every decision with clarity and confidence.
        </p>
      </section>

      {/* 🟩 Grouped Buttons Section */}
      <div className="flex flex-col items-center justify-center gap-10 mt-20">
        {/* Group 1: Data Preparation */}
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-4 text-purple-400">
            Data Preparation
          </h3>
          <div className="flex flex-wrap justify-center gap-6">
            <StarBorder
              className="text-lg px-10 py-4"
              onClick={() => setActiveSection("data-upload")}
            >
              Data Upload
            </StarBorder>
            <StarBorder
              className="text-lg px-10 py-4"
              onClick={() => setActiveSection("cleaning")}
            >
              Cleaning
            </StarBorder>
          </div>
        </div>

        {/* Group 2: Analysis & Insights */}
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-4 text-pink-400">
            Analysis & Insights
          </h3>
          <div className="flex flex-wrap justify-center gap-6">
            <StarBorder
              className="text-lg px-10 py-4"
              onClick={() => setActiveSection("analytics")}
            >
              Analytics
            </StarBorder>
            <StarBorder
              className="text-lg px-10 py-4"
              onClick={() => setActiveSection("predictions")}
            >
              Predictions
            </StarBorder>
            <StarBorder
              className="text-lg px-10 py-4"
              onClick={() => setActiveSection("suggestions")}
            >
              Suggestions
            </StarBorder>
          </div>
        </div>

        {/* Group 3: Reporting & Dashboard */}
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-4 text-blue-400">
            Reporting & Dashboard
          </h3>
          <div className="flex flex-wrap justify-center gap-6">
            <StarBorder
              className="text-lg px-10 py-4"
              onClick={() => setActiveSection("dashboard")}
            >
              Dashboard
            </StarBorder>
            <StarBorder
              className="text-lg px-10 py-4"
              onClick={() => setActiveSection("reports")}
            >
              Reports
            </StarBorder>
          </div>
        </div>
      </div>

      {/* Active Section */}
      <div
        id="active-section"
        className="max-w-7xl mx-auto mt-12 px-4 relative z-10"
      >
        {renderActiveSection()}
      </div>

      {/* 🌌 Footer */}
      <footer className="mt-24 w-full bg-gradient-to-r from-[#0f172a] to-[#1e293b] py-10 border-t border-white/10 text-center">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
            Smart Data Analytics
          </h3>
          <p className="text-gray-400 mb-6">
            Empowering businesses through intelligent data insights.
          </p>

          <div className="flex flex-wrap justify-center gap-8 mb-6">
            <a
              href="#about"
              className="text-gray-300 hover:text-purple-400 transition"
            >
              About
            </a>
            <a
              href="#"
              className="text-gray-300 hover:text-purple-400 transition"
              onClick={() => setActiveSection("analytics")}
            >
              Analytics
            </a>
            <a
              href="#"
              className="text-gray-300 hover:text-purple-400 transition"
              onClick={() => setActiveSection("dashboard")}
            >
              Dashboard
            </a>
            <a
              href="#"
              className="text-gray-300 hover:text-purple-400 transition"
              onClick={() => setActiveSection("reports")}
            >
              Reports
            </a>
          </div>

          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Smart Data Analytics. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
