// Utilities to export canvas charts as blob / download them.
// Provides helpers used by reportBundler and UI.

export async function downloadCanvasChartAsBlob(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error("Canvas not found:", canvasId);
    return null;
  }

  return await new Promise((resolve) => {
    try {
      if (canvas.toBlob) {
        canvas.toBlob((blob) => resolve(blob), "image/png");
      } else {
        // fallback: create blob from dataURL
        const dataUrl = canvas.toDataURL("image/png");
        const byteString = atob(dataUrl.split(",")[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
        const blob = new Blob([ab], { type: "image/png" });
        resolve(blob);
      }
    } catch (err) {
      console.error("toBlob error:", err);
      resolve(null);
    }
  });
}

export async function downloadAllCharts() {
  // naive fallback: collect all canvases and download separately
  const canvases = Array.from(document.querySelectorAll("canvas"));
  if (!canvases.length) {
    alert("No charts found on page to download.");
    return;
  }

  canvases.forEach((canvas, i) => {
    try {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `chart_${i + 1}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("download canvas failed", err);
    }
  });
}

/**
 * Gather all canvases annotated with data-chart-id and return blobs.
 * Returns array of { id, blob }.
 */
export async function getAllChartBlobs() {
  const nodes = Array.from(document.querySelectorAll("[data-chart-id]"));
  const results = [];
  for (const node of nodes) {
    try {
      const id = node.getAttribute("data-chart-id") || node.id || null;
      let canvas = null;
      if (node instanceof HTMLCanvasElement) canvas = node;
      else if (node.querySelector) canvas = node.querySelector("canvas");
      else if (node.canvas instanceof HTMLCanvasElement) canvas = node.canvas;
      if (!canvas) continue;
      const blob = await new Promise((resolve) => {
        if (canvas.toBlob) {
          canvas.toBlob((b) => resolve(b), "image/png");
        } else {
          try {
            const dataUrl = canvas.toDataURL("image/png");
            const byteString = atob(dataUrl.split(",")[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            const b = new Blob([ab], { type: "image/png" });
            resolve(b);
          } catch (e) {
            resolve(null);
          }
        }
      });
      if (blob) results.push({ id: id || `chart`, blob });
    } catch (e) {
      // ignore per-chart errors
      console.error("getAllChartBlobs error for node:", node, e);
    }
  }
  return results;
}
