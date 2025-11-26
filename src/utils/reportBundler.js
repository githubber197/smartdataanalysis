// src/utils/reportBundler.js
import JSZip from "jszip";
import { getAllChartBlobs } from "./chartDownloader";

/** convert array of objects to CSV string */
function convertToCSV(data = []) {
  if (!data || data.length === 0) return "";
  const keys = Object.keys(data[0]);
  const rows = [keys.join(",")];
  data.forEach(row => {
    rows.push(keys.map(k => JSON.stringify(row[k] ?? "")).join(","));
  });
  return rows.join("\n");
}

/** Create a ZIP with CSVs + chart images */
export async function bundleReportAsZip({ rawData = [], cleanedData = [] } = {}) {
  const zip = new JSZip();
  zip.file("raw_data.csv", convertToCSV(rawData));
  zip.file("cleaned_data.csv", convertToCSV(cleanedData));

  const chartBlobs = await getAllChartBlobs();
  chartBlobs.forEach((c, idx) => {
    // filename safe
    const name = `${c.id || "chart"}_${idx + 1}.png`;
    zip.file(name, c.blob);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sda_report_bundle.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
