// Simple registry for Chart.js instances and fallbacks (canvas elements).
const registry = new Map();

export function registerChart(id, chartInstanceOrCanvas) {
  if (!id || !chartInstanceOrCanvas) return;
  registry.set(id, chartInstanceOrCanvas);
}

export function unregisterChart(id) {
  registry.delete(id);
}

export function getRegisteredIds() {
  return Array.from(registry.keys());
}

/**
 * Returns an array of { id, dataUrl } for all registered charts.
 * If the registered item has toBase64Image(), use it; otherwise fallback to canvas.toDataURL.
 */
export async function getAllChartImages() {
  const out = [];
  for (const [id, chart] of registry.entries()) {
    try {
      if (chart && typeof chart.toBase64Image === "function") {
        out.push({ id, dataUrl: chart.toBase64Image() });
      } else if (chart && chart.canvas instanceof HTMLCanvasElement) {
        out.push({ id, dataUrl: chart.canvas.toDataURL("image/png") });
      } else if (chart instanceof HTMLCanvasElement) {
        out.push({ id, dataUrl: chart.toDataURL("image/png") });
      } else {
        // try to find DOM canvas by id
        const el = document.getElementById(id);
        if (el && el instanceof HTMLCanvasElement) out.push({ id, dataUrl: el.toDataURL("image/png") });
      }
    } catch (err) {
      // skip on error
    }
  }
  return out;
}
