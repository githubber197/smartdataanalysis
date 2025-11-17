export async function downloadCanvasChartAsBlob(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error("Canvas not found:", canvasId);
    return null;
  }

  return await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function downloadAllCharts() {
  const canvases = document.querySelectorAll("canvas");

  if (canvases.length === 0) {
    alert("No charts found!");
    return;
  }

  let index = 1;

  for (const canvas of canvases) {
    const blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );

    if (!blob) continue;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `chart_${index}.png`;
    link.click();

    URL.revokeObjectURL(url);
    index++;
  }
}
