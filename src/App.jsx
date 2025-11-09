import React, { useState } from "react";
import Hero from "./components/Hero";
import MagicBento from "./components/MagicBento";
import DataInput from "./routes/DataInput";
import Cleaning from "./routes/Cleaning";
import Analytics from "./routes/Analytics";
import Dashboard from "./routes/Dashboard";
import Predictions from "./routes/Predictions";
import Suggestions from "./routes/Insights";
import Reports from "./routes/Reports";

export default function App() {
  const [rawData, setRawData] = useState([]);
  const [cleanedData, setCleanedData] = useState([]);
  const [activeSection, setActiveSection] = useState(null);

  const sections = [
    { id: "data-upload", label: "Data Upload" },
    { id: "cleaning", label: "Cleaning" },
    { id: "analytics", label: "Analytics" },
    { id: "predictions", label: "Predictions" },
    { id: "dashboard", label: "Dashboard" },
    { id: "suggestions", label: "Suggestions" },
    { id: "reports", label: "Reports" },
  ];

  const handleConnect = () => {
    document.getElementById("bento-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLearnMore = () => {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "data-upload":
        return <DataInput rawData={rawData} setRawData={setRawData} setCleanedData={setCleanedData} />;
      case "cleaning":
        return <Cleaning rawData={rawData} cleanedData={cleanedData} setCleanedData={setCleanedData} />;
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
    <div className="App w-full min-h-screen bg-gray-900 text-white overflow-x-hidden">
      <Hero onConnectClick={handleConnect} onLearnMoreClick={handleLearnMore} />

      {/* Bento Buttons */}
      <div id="bento-section" className="max-w-7xl mx-auto mt-20 px-4">
        <MagicBento sections={sections} onSelect={setActiveSection} />
      </div>

      {/* Show active section */}
      <div className="max-w-7xl mx-auto mt-8 px-4">{renderActiveSection()}</div>

      {/* About Section */}
      <section
        id="about"
        className="max-w-4xl mx-auto mt-32 px-4 py-20 bg-gray-800 rounded-xl border border-purple-500/20"
      >
        <h2 className="text-3xl font-bold mb-6">About Smart Data Analytics</h2>
        <p className="text-gray-300 mb-4">
          In today’s business world, data is everything. By connecting and cleaning your
          business data automatically with AI, you can uncover hidden patterns, make better
          decisions, and increase revenue.
        </p>
        <p className="text-gray-300">
          Our platform allows even non-technical users to analyze sales trends, understand
          customer behavior, and predict future outcomes with easy-to-read dashboards and
          recommendations.
        </p>
      </section>
    </div>
  );
}
