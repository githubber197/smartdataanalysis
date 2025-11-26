/* =============================================================================
   Small, robust data helpers for cleaning
   Exports:
     - detectColumnType(values)
     - applyRuleToColumn(table, column, type, ruleId, params)
     - getChangedRows(original, cleaned)
     - extractDateColumn(table)
     - aggregateMonthly(table, dateCol, valueCol, agg)
   ============================================================================= */

/* ------------------ TYPE DETECTION ------------------ */
export function detectColumnType(values = []) {
  if (!Array.isArray(values)) return "unknown";
  const sample = values.slice(0, 50);
  if (!sample.length) return "empty";

  let num = 0, date = 0, nonEmpty = 0;
  const uniq = new Set();

  for (const v of sample) {
    const s = v === null || v === undefined ? "" : String(v).trim();
    if (s === "") continue;
    nonEmpty++;
    if (!isNaN(Number(s))) num++;
    if (!isNaN(Date.parse(s))) date++;
    uniq.add(s.toLowerCase());
  }

  if (nonEmpty === 0) return "empty";
  if (num >= nonEmpty * 0.7) return "number";
  if (date >= nonEmpty * 0.7) return "date";
  if (uniq.size / nonEmpty <= 0.2) return "category";
  return "text";
}

/* ------------------ SMALL UTILITIES ------------------ */
const safeStr = (v) => (v === null || v === undefined ? "" : String(v));
const parseNumber = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const cleaned = s.replace(/[$₹€£,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};
const isNullish = (v) => v === null || v === undefined || String(v).trim() === "";

/* ------------------ BASIC STATS ------------------ */
function mean(arr) {
  const a = arr.filter((x) => x !== null && !isNaN(x));
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
}
function median(arr) {
  const a = arr.filter((x) => x !== null && !isNaN(x)).sort((a,b)=>a-b);
  if (!a.length) return null;
  const m = Math.floor(a.length/2);
  return a.length % 2 === 0 ? (a[m-1] + a[m]) / 2 : a[m];
}
function mode(arr) {
  const counts = {};
  for (const v of arr) {
    if (v === null) continue;
    counts[v] = (counts[v] || 0) + 1;
  }
  let best = null, mx = 0;
  for (const k in counts) {
    if (counts[k] > mx) { best = k; mx = counts[k]; }
  }
  return best;
}
function stdDev(arr, m) {
  const a = arr.filter((x) => x !== null && !isNaN(x));
  if (a.length <= 1) return 0;
  const meanVal = m ?? mean(a);
  const variance = a.reduce((s, x) => s + (x - meanVal) ** 2, 0) / a.length;
  return Math.sqrt(variance);
}

/* ------------------ NUMERIC CLEANERS ------------------ */
export function cleanNumericColumn(values = [], options = {}) {
  const {
    fill = null,        // "mean"|"median"|"mode"|"zero"|{custom}
    ffill = false,
    bfill = false,
    removeRows = false,
    removeOutliers = false, // winsorize to bounds
    normalize = false,
    standardize = false,
    round = null
  } = options;

  // parse
  const parsed = values.map((v) => parseNumber(v));
  const stats = {
    mean: mean(parsed),
    median: median(parsed),
    mode: mode(parsed),
    min: parsed.filter(x=>x!==null).length ? Math.min(...parsed.filter(x=>x!==null)) : null,
    max: parsed.filter(x=>x!==null).length ? Math.max(...parsed.filter(x=>x!==null)) : null,
    sd: stdDev(parsed)
  };

  let out = [...parsed];

  // forward/backfill
  if (ffill) {
    let last = null;
    out = out.map((v) => {
      if (v !== null) { last = v; return v; }
      return last;
    });
  }
  if (bfill) {
    let nexts = [...out];
    for (let i = nexts.length - 1; i >= 0; i--) {
      if (nexts[i] === null) nexts[i] = nexts[i+1] ?? null;
    }
    out = nexts;
  }

  // fill missing
  out = out.map((v) => {
    if (v !== null) return v;
    if (!fill) return null;
    if (fill === "mean") return stats.mean;
    if (fill === "median") return stats.median;
    if (fill === "mode") return Number(stats.mode);
    if (fill === "zero") return 0;
    if (typeof fill === "object" && fill.custom !== undefined) return Number(fill.custom);
    return v;
  });

  // remove rows with missing -> caller should handle removing rows; here we mark them as null
  if (removeRows) {
    // keep as nulls; caller may remove rows by filtering updated table rows without nulls in this column
  }

  // remove/outliers: winsorize (cap to IQR boundaries)
  if (removeOutliers) {
    const nums = parsed.filter(x=>x!==null).sort((a,b)=>a-b);
    if (nums.length) {
      const q1 = nums[Math.floor(nums.length * 0.25)];
      const q3 = nums[Math.floor(nums.length * 0.75)];
      const iqr = q3 - q1 || 0;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      out = out.map((v) => {
        if (v === null) return v;
        if (v < lower) return lower;
        if (v > upper) return upper;
        return v;
      });
    }
  }

  // normalize
  if (normalize && stats.min !== null && stats.max !== null && stats.max !== stats.min) {
    out = out.map((v) => (v === null ? null : (v - stats.min) / (stats.max - stats.min)));
  }

  // standardize
  if (standardize && stats.sd) {
    out = out.map((v) => (v === null ? null : (v - stats.mean) / (stats.sd || 1)));
  }

  // rounding
  if (typeof round === "number") {
    out = out.map((v) => (v === null ? null : Number(v.toFixed(round))));
  }

  return { data: out, stats };
}

/* ------------------ TEXT CLEANERS ------------------ */
export function cleanTextColumn(values = [], options = {}) {
  const {
    trim = true,
    lowercase = false,
    replaceEmpty = null,
    replaceFrom = null,
    replaceTo = null,
    removeDuplicates = false
  } = options;

  let out = values.map((v) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (trim) s = s.trim();
    if (lowercase) s = s.toLowerCase();
    if ((s === "" || s === null) && replaceEmpty !== null) return replaceEmpty;
    if (replaceFrom !== null && String(s) === String(replaceFrom)) return replaceTo;
    return s;
  });

  if (removeDuplicates) {
    const seen = new Set();
    out = out.map((v) => {
      const key = String(v).toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);
      return v;
    });
  }

  return { data: out };
}

/* ------------------ DATE CLEANERS ------------------ */
export function cleanDateColumn(values = [], options = {}) {
  const { standardize = true, replaceInvalidWith = null } = options;
  const out = values.map((v) => {
    const s = safeStr(v).trim();
    if (!s) return replaceInvalidWith;
    const d = new Date(s);
    if (isNaN(d)) return replaceInvalidWith;
    return standardize ? d.toISOString().split("T")[0] : s;
  });
  return { data: out };
}

/* ------------------ APPLY RULE TO COLUMN (MAIN) ------------------ */
export function applyRuleToColumn(table = [], column, type = null, ruleId = null, params = {}) {
  if (!Array.isArray(table) || !column) return { updatedTable: table || [], meta: {} };

  const values = table.map((r) => (r ? r[column] : null));
  const detected = type || detectColumnType(values);

  // Default result (no-op)
  let cleanedVals = values.slice();
  let meta = {};

  // TEXT RULES
  if (["text", "category"].includes(detected)) {
    if (ruleId === "trim") {
      cleanedVals = cleanTextColumn(values, { trim: true }).data;
    } else if (ruleId === "lowercase") {
      cleanedVals = cleanTextColumn(values, { lowercase: true }).data;
    } else if (ruleId === "replace-empty") {
      cleanedVals = cleanTextColumn(values, { replaceEmpty: params.replaceWith ?? null }).data;
    } else if (ruleId === "replace-value") {
      cleanedVals = cleanTextColumn(values, { replaceFrom: params.from ?? null, replaceTo: params.to ?? null }).data;
    } else if (ruleId === "remove-duplicates") {
      cleanedVals = cleanTextColumn(values, { removeDuplicates: true }).data;
    }
  }

  // NUMERIC RULES
  if (detected === "number") {
    const numericOpts = {};

    // map ruleId to options
    if (ruleId === "fill-mean") numericOpts.fill = "mean";
    if (ruleId === "fill-median") numericOpts.fill = "median";
    if (ruleId === "fill-mode") numericOpts.fill = "mode";
    if (ruleId === "fill-zero") numericOpts.fill = "zero";
    if (ruleId === "fill-custom") numericOpts.fill = { custom: params.custom };
    if (ruleId === "ffill") numericOpts.ffill = true;
    if (ruleId === "bfill") numericOpts.bfill = true;
    if (ruleId === "remove-rows-with-missing") numericOpts.removeRows = true;
    if (ruleId === "remove-outliers") numericOpts.removeOutliers = true;
    if (ruleId === "normalize") numericOpts.normalize = true;
    if (ruleId === "standardize") numericOpts.standardize = true;
    if (ruleId === "round") numericOpts.round = params.decimals ?? null;

    const cleaned = cleanNumericColumn(values, numericOpts);
    cleanedVals = cleaned.data;
    meta = cleaned.stats || {};
  }

  // DATE RULE
  if (detected === "date") {
    if (ruleId === "fix-dates") {
      cleanedVals = cleanDateColumn(values, {}).data;
    }
  }

  // Build updated table
  let updatedTable = table.map((row, i) => ({ ...row, [column]: cleanedVals[i] }));

  // If remove-rows-with-missing requested for numeric, actually drop rows missing this col
  if (ruleId === "remove-rows-with-missing") {
    updatedTable = updatedTable.filter((r) => {
      const v = r[column];
      return !(v === null || v === undefined || String(v).trim() === "");
    });
  }

  return { updatedTable, meta };
}

/* ------------------ CHANGED ROWS (helper) ------------------ */
export function getChangedRows(original = [], cleaned = []) {
  const changed = [];
  const len = Math.min(original.length, cleaned.length);
  for (let i = 0; i < len; i++) {
    const o = original[i];
    const n = cleaned[i];
    if (!o || !n) {
      if (o !== n) changed.push(n);
      continue;
    }
    let diff = false;
    const keys = new Set([...Object.keys(o), ...Object.keys(n)]);
    for (const k of keys) {
      if (String(o[k]) !== String(n[k])) {
        diff = true;
        break;
      }
    }
    if (diff) changed.push(n);
  }
  // if cleaned is longer (rows removed/added), include extras
  if (cleaned.length > original.length) {
    for (let i = len; i < cleaned.length; i++) changed.push(cleaned[i]);
  }
  return changed;
}

/* ------------------------ Date helpers for forecasting ------------------------ */

// Try to find which column is most likely a date column (returns column name or null).
export function extractDateColumn(table = []) {
  if (!Array.isArray(table) || table.length === 0) return null;
  const keys = Object.keys(table[0] || {});
  let best = null;
  let bestScore = -Infinity;
  for (const k of keys) {
    const vals = table.map((r) => r[k]).filter((v) => v !== null && v !== undefined && String(v).trim() !== "").slice(0, 100);
    if (!vals.length) continue;
    let dateCount = 0;
    for (const v of vals) {
      const s = String(v).trim();
      // allow YYYY-MM-DD, YYYY/MM/DD, MMM YYYY, etc.
      const d = new Date(s);
      if (!isNaN(d)) dateCount++;
    }
    const score = dateCount / vals.length;
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return bestScore >= 0.6 ? best : null;
}

// Aggregate table rows into monthly buckets using a date column and a numeric column name.
// agg = "sum" | "mean" (default "mean")
export function aggregateMonthly(table = [], dateCol = "date", valueCol = "value", agg = "mean") {
  if (!Array.isArray(table) || !table.length) return [];
  const buckets = {};
  for (const r of table) {
    const raw = r[dateCol];
    if (!raw) continue;
    const d = new Date(raw);
    if (isNaN(d)) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets[key]) buckets[key] = { vals: [], month: key };
    const v = Number(r[valueCol]);
    if (Number.isFinite(v)) buckets[key].vals.push(v);
  }
  const out = Object.keys(buckets)
    .sort()
    .map((k) => {
      const vals = buckets[k].vals;
      const aggVal = vals.length ? (agg === "sum" ? vals.reduce((a, b) => a + b, 0) : vals.reduce((a, b) => a + b, 0) / vals.length) : null;
      return { month: k, value: aggVal };
    })
    .filter((r) => r.value !== null);
  return out;
}
