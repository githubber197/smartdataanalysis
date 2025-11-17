import JSZip from "jszip";

export async function downloadFullReport(rawData, cleanedData) {
  console.log("Bundling report...");

  const zip = new JSZip();

  // 1️⃣ Add CSV files
  zip.file("raw_data.csv", convertToCSV(rawData));
  zip.file("cleaned_data.csv", convertToCSV(cleanedData));

  // 2️⃣ Add ALL charts (Chart.js canvases)
  const chartImages = await exportAllCharts();

  chartImages.forEach((img, index) => {
    zip.file(`chart_${index + 1}.png`, img.split(",")[1], { base64: true });
  });

  // 3️⃣ Build zip file
  const zipBlob = await zip.generateAsync({ type: "blob" });

  // 4️⃣ Trigger browser download
  const link = document.createElement("a");
  link.href = URL.createObjectURL(zipBlob);
  link.download = "report_bundle.zip";
  link.click();

  URL.revokeObjectURL(link.href);
}

/* -------------------------- CSV HELPER -------------------------- */
function convertToCSV(data) {
  if (!data || data.length === 0) return "";

  const keys = Object.keys(data[0]);
  const rows = [keys.join(",")];

  data.forEach((row) => {
    rows.push(keys.map((k) => JSON.stringify(row[k] || "")).join(","));
  });

  return rows.join("\n");
}

/* ----------------------- CHART EXPORTER ------------------------- */
async function exportAllCharts() {
  const canvases = document.querySelectorAll("canvas");
  const output = [];

  for (const canvas of canvases) {
    const img = canvas.toDataURL("image/png");
    output.push(img);
  }

  return output;
}
