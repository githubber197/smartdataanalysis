// src/utils/reportUtils.js
// small local "smart" explanation engine (no external AI)
// exports: generateExecutiveSummary, generateColumnInsights, buildReportHtml

function mean(arr) {
  const nums = arr.filter((n) => typeof n === "number" && !isNaN(n));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
function median(arr) {
  const nums = arr.filter((n) => typeof n === "number" && !isNaN(n)).sort((a,b)=>a-b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length/2);
  return nums.length%2===0 ? (nums[mid-1]+nums[mid])/2 : nums[mid];
}
function stddev(arr){
  const m = mean(arr);
  if (m === null) return 0;
  const sq = arr.filter(n=>Number.isFinite(n)).map(n=>Math.pow(n-m,2));
  return Math.sqrt(sq.reduce((a,b)=>a+b,0)/sq.length);
}

// detect simple trend slope using linear regression
function linearSlope(values){
  const n = values.length;
  if (n < 2) return 0;
  const xs = values.map((_,i)=>i+1);
  const ys = values.map((v)=>Number.isFinite(v)?v:0);
  const xbar = (n+1)/2;
  const ybar = mean(ys);
  let num = 0, den = 0;
  for(let i=0;i<n;i++){
    num += (xs[i]-xbar)*(ys[i]-ybar);
    den += Math.pow(xs[i]-xbar,2);
  }
  return den === 0 ? 0 : num/den;
}

function fmt(n){
  if (n===null || n===undefined || isNaN(n)) return "-";
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(2)+"M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1)+"k";
  if (Math.abs(n) < 1 && Math.abs(n)>0) return n.toFixed(2);
  return Number(n).toFixed(2);
}

export function generateColumnInsights(rows, column) {
  const valsRaw = rows.map(r => r[column]);
  const numbers = valsRaw
    .map(v => (typeof v === "number" ? v : (parseFloat(v) , Number.isFinite(parseFloat(v)) ? parseFloat(v) : null)))
    .map(v => (Number.isFinite(v) ? v : null))
    .filter(v => v !== null);

  const missing = valsRaw.filter(v => v === null || v === undefined || String(v).trim() === "").length;
  const unique = new Set(valsRaw.filter(v=>v!==null && v!==undefined).map(v=>String(v))).size;

  const insight = { column, missing, unique, numeric: numbers.length>0 };

  if (insight.numeric) {
    const mn = mean(numbers);
    const med = median(numbers);
    const sd = stddev(numbers);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const slope = linearSlope(numbers);

    insight.stats = { mean: mn, median: med, sd, min, max, slope };
    // generate text
    const trend = slope > 0 ? "increasing" : slope < 0 ? "decreasing" : "stable";
    let explanation = `Column "${column}" is numeric. Mean ${fmt(mn)}, median ${fmt(med)}. Range ${fmt(min)} → ${fmt(max)}.`;
    explanation += ` Missing: ${missing}. Unique values: ${unique}. Overall trend is ${trend}.`;
    if (Math.abs(slope) > Math.abs(mn) * 0.02) {
      explanation += ` The trend slope (linear fit) suggests a noticeable ${trend} pattern.`;
    }
    if (sd > Math.abs(mn)*0.3) {
      explanation += ` Values show high variability (sd ≈ ${fmt(sd)}). Consider segmenting or normalizing.`;
    }

    insight.explanation = explanation;
  } else {
    // categorical/text
    const freq = {};
    for (const v of valsRaw) {
      const key = (v === null || v === undefined) ? "__NULL__" : String(v).trim();
      freq[key] = (freq[key]||0)+1;
    }
    const entries = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const top = entries.map(e => `${e[0]} (${e[1]})`).join(", ");
    insight.explanation = `Column "${column}" appears textual/categorical. Missing: ${missing}. Unique values: ${unique}. Top values: ${top}.`;
    insight.top = entries;
  }

  return insight;
}

export function generateExecutiveSummary(rawRows=[], cleanedRows=[]) {
  const rows = { raw: rawRows.length, cleaned: cleanedRows.length };
  let paragraphs = [];

  paragraphs.push(`Dataset: ${rows.raw} rows uploaded, ${rows.cleaned} rows cleaned.`);

  // quick column-level highlights: look for numeric columns with notable trend or many missing
  const sample = cleanedRows.length ? cleanedRows : rawRows;
  if (!sample || sample.length === 0) {
    paragraphs.push("No data to analyze. Upload a CSV to generate a smart report.");
    return paragraphs.join("\n\n");
  }

  const cols = Object.keys(sample[0] || {});
  const colInsights = cols.map(c => generateColumnInsights(sample, c));

  // find columns with many missing or high sd or slope
  const missingCols = colInsights.filter(ci => ci.missing > (sample.length * 0.1)).map(ci => ci.column);
  const highVarCols = colInsights.filter(ci => ci.numeric && ci.stats.sd > Math.abs(ci.stats.mean) * 0.3).map(ci => ci.column);
  const trending = colInsights.filter(ci => ci.numeric && Math.abs(ci.stats.slope) > Math.abs(ci.stats.mean) * 0.02).map(ci => ci.column);

  if (missingCols.length) paragraphs.push(`Columns with >10% missing data: ${missingCols.join(", ")}. Consider filling or removing.`);
  if (highVarCols.length) paragraphs.push(`Columns with high variability: ${highVarCols.join(", ")} — consider segmentation or outlier handling.`);
  if (trending.length) paragraphs.push(`Detected trends in: ${trending.join(", ")} — review recent changes and events for causes.`);

  // short recommendation
  paragraphs.push("Recommendation: review missing-data columns first, then apply cleaning (fill/median/outlier trimming). Use the charts for trends and export the report for stakeholders.");

  return paragraphs.join("\n\n");
}

// build a self-contained HTML report (embeds images as base64)
export function buildReportHtml({ title="Smart Data Report", rawRows=[], cleanedRows=[], chartImages=[] , execSummary="", perColumn=[] }) {
  // chartImages: [{id, dataUrl, caption}]
  const head = `
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body{font-family:Inter, ui-sans-serif, system-ui; color:#111827; background:#fff; padding:20px;}
    .wrap{max-width:900px;margin:0 auto}
    h1{color:#7c3aed}
    section{margin-top:18px;padding:12px;border-radius:8px;border:1px solid #e6e6f0}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th,td{border:1px solid #e9e7f8;padding:6px;text-align:left}
    img{max-width:100%;height:auto;border-radius:6px;box-shadow:0 6px 18px rgba(0,0,0,0.08)}
    .muted{color:#6b7280;font-size:13px}
    .card{background:#fafafa;padding:10px;border-radius:8px;border:1px solid #f0eff8;margin-bottom:10px}
    pre{white-space:pre-wrap;background:#0f172a;color:#fff;padding:10px;border-radius:6px}
  </style>
  `;

  const buildTableHTML = (rows, max=50) => {
    if (!rows || rows.length === 0) return "<div class='muted'>No rows</div>";
    const headers = Object.keys(rows[0]);
    const slice = rows.slice(0, max);
    const headerHtml = headers.map(h=>`<th>${escapeHtml(h)}</th>`).join("");
    const rowsHtml = slice.map(r => `<tr>${headers.map(h=>`<td>${escapeHtml(String(r[h]===undefined?"":r[h]))}</td>`).join("")}</tr>`).join("");
    return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
  };

  const chartsHtml = chartImages.length ? chartImages.map(ci => `
    <div class="card">
      <h4>${escapeHtml(ci.caption || ci.id || "Chart")}</h4>
      <img src="${ci.dataUrl}" alt="${escapeHtml(ci.caption || ci.id)}" />
    </div>
  `).join("") : "<div class='muted'>No charts found on the page (make sure charts are rendered before generating report).</div>";

  const perColHtml = perColumn.length ? perColumn.map(pc => `
    <div class="card"><strong>${escapeHtml(pc.column)}</strong>
      <p class="muted">${escapeHtml(pc.explanation || "")}</p>
    </div>
  `).join("") : "";

  const html = `
  <!doctype html>
  <html>
    <head>
      <title>${escapeHtml(title)}</title>
      ${head}
    </head>
    <body>
      <div class="wrap">
        <h1>${escapeHtml(title)}</h1>
        <p class="muted">Generated: ${new Date().toLocaleString()}</p>

        <section>
          <h3>Executive Summary</h3>
          <div class="card">${escapeHtml(execSummary).replace(/\n/g,"<br/>")}</div>
        </section>

        <section>
          <h3>Charts</h3>
          ${chartsHtml}
        </section>

        <section>
          <h3>Per-column Insights</h3>
          ${perColHtml}
        </section>

        <section>
          <h3>Cleaned Data (preview)</h3>
          ${buildTableHTML(cleanedRows, 30)}
        </section>

        <section>
          <h3>Raw Data (preview)</h3>
          ${buildTableHTML(rawRows, 30)}
        </section>

        <footer style="margin-top:25px;color:#9ca3af;font-size:12px">Report generated by Smart Data Analytics (client-side).</footer>
      </div>
    </body>
  </html>
  `;
  return html;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
