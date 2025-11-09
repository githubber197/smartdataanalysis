export default function About() {
  return (
    <div className="p-6 bg-white/5 rounded-2xl shadow-lg border border-purple-500/30">
      <h2 className="text-2xl font-bold text-purple-400 mb-4">About Smart Analytics</h2>
      <p className="text-gray-300 mb-4">
        Data drives business decisions. With Smart Analytics, you can automatically clean your data, detect patterns, and get actionable insights with AI and ML models.
      </p>
      <ul className="list-disc list-inside text-gray-300 space-y-2">
        <li>Import CSV or connect to your database seamlessly.</li>
        <li>Automatically clean and validate your data.</li>
        <li>Get AI-powered suggestions to improve sales and reduce churn.</li>
        <li>Visualize your data with multiple interactive charts.</li>
        <li>Run ML predictions and explain the outcomes to help decision making.</li>
      </ul>
    </div>
  );
}
