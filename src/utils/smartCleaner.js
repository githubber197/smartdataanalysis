// src/utils/smartCleaner.js
// SmartCleaner v1 — supports full rule set used by Cleaning.jsx
// Exports: detectColumnType, parseNumericValue, applyRuleToColumn, and helpers

/* ---------- Numeric parsing ---------- */
export function parseNumericValue(raw) {
  if (raw === null || raw === undefined) return { ok: false, value: null };
  if (typeof raw === "number" && Number.isFinite(raw)) return { ok: true, value: raw };
  const s = String(raw).trim();
  if (s === "") return { ok: false, value: null };
  // Remove currency symbols, spaces and thousands separators
  const cleaned = s.replace(/[$₹€£,\s]/g, "");
  const num = Number(cleaned);
  if (Number.isFinite(num)) return { ok: true, value: num };
  return { ok: false, value: null };
}

/* ---------- stats helpers ---------- */
export function mean(arr) {
  const nums = arr.filter((v) => typeof v === "number" && !isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function median(arr) {
  const nums = arr.filter((v) => typeof v === "number" && !isNaN(v)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
}

export function mode(arr) {
  const counts = {};
  for (const v of arr) {
    if (v === null || v === undefined || v === "") continue;
    counts[v] = (counts[v] || 0) + 1;
  }
  let max = -1,
    mv = null;
  for (const k in counts) {
    if (counts[k] > max) {
      max = counts[k];
      mv = isNaN(Number(k)) ? k : Number(k);
    }
  }
  return mv;
}

export function standardDeviation(values) {
  const valid = values.filter((v) => typeof v === "number" && !isNaN(v));
  if (valid.length === 0) return 0;
  const m = mean(valid);
  const sq = valid.map((v) => Math.pow(v - m, 2));
  const avgSq = sq.reduce((a, b) => a + b, 0) / valid.length;
  return Math.sqrt(avgSq);
}

/* ---------- type detection ---------- */
/**
 * detectColumnType(values)
 * values: array (column values)
 * returns: 'number' | 'date' | 'category' | 'text' | 'empty' | 'unknown'
 */
export function detectColumnType(values = []) {
  if (!Array.isArray(values)) return "unknown";
  const sample = values.slice(0, 50);
  if (sample.length === 0) return "empty";

  let numCount = 0,
    dateCount = 0,
    nonEmpty = 0;
  const uniques = new Set();

  for (const v of sample) {
    const s = v === null || v === undefined ? "" : String(v).trim();
    if (s === "") continue;
    nonEmpty++;

    const parsed = parseNumericValue(s);
    if (parsed.ok) numCount++;

    const d = Date.parse(s);
    if (!isNaN(d)) dateCount++;

    uniques.add(s.toLowerCase());
  }

  const uniqueRatio = nonEmpty === 0 ? 1 : uniques.size / nonEmpty;

  // heuristics
  if (numCount >= Math.ceil(nonEmpty * 0.7)) return "number";
  if (dateCount >= Math.ceil(nonEmpty * 0.7)) return "date";
  if (nonEmpty > 0 && uniqueRatio <= 0.2) return "category";
  if (nonEmpty === 0) return "empty";
  return "text";
}

/* ---------- column-level cleaners ---------- */

/**
 * cleanNumericColumn(values, options)
 * options:
 *  - fill: 'mean'|'median'|'mode'|'zero'|null
 *  - removeOutliers: boolean
 *  - outlierK: number (std multiplier)
 *  - normalize: boolean
 *  - standardize: boolean
 *  - round: integer decimals|null
 */
export function cleanNumericColumn(values = [], options = {}) {
  const {
    fill = null,
    removeOutliers = false,
    outlierK = 3,
    normalize = false,
    standardize = false,
    round = null,
  } = options;

  // parsed numbers (null when missing/invalid)
  const parsed = values.map((v) => {
    const p = parseNumericValue(v);
    return p.ok ? p.value : null;
  });

  const nums = parsed.filter((v) => v !== null && !isNaN(v));
  const mn = nums.length ? mean(nums) : null;
  const md = nums.length ? median(nums) : null;
  const mo = nums.length ? mode(nums) : null;
  const sd = nums.length ? standardDeviation(nums) : 0;
  const minVal = nums.length ? Math.min(...nums) : null;
  const maxVal = nums.length ? Math.max(...nums) : null;

  // fill missing
  const filled = parsed.map((v) => {
    if (v === null || isNaN(v)) {
      if (fill === "mean" && mn !== null) return mn;
      if (fill === "median" && md !== null) return md;
      if (fill === "mode" && mo !== null) return mo;
      if (fill === "zero") return 0;
      return null;
    }
    return v;
  });

  // remove outliers (null them)
  let afterOutlier = filled;
  if (removeOutliers && sd > 0) {
    afterOutlier = filled.map((v) => {
      if (v === null) return null;
      return Math.abs(v - mn) > outlierK * sd ? null : v;
    });
  }

  // transform (normalize/standardize)
  let final = afterOutlier.slice();
  if (normalize && minVal !== null && maxVal !== null && maxVal !== minVal) {
    final = final.map((v) => (v === null ? null : (v - minVal) / (maxVal - minVal)));
  } else if (standardize && sd > 0) {
    final = final.map((v) => (v === null ? null : (v - mn) / sd));
  }

  if (typeof round === "number") {
    final = final.map((v) => (v === null ? null : Number(v.toFixed(round))));
  }

  return {
    data: final,
    stats: { mean: mn, median: md, mode: mo, sd, min: minVal, max: maxVal },
  };
}

/**
 * cleanTextColumn(values, options)
 * options:
 *  - trim: boolean
 *  - lowercase: boolean
 *  - uppercase: boolean
 *  - removeSpecialChars: boolean
 *  - removeNumbers: boolean
 *  - replaceEmpty: string|null
 */
export function cleanTextColumn(values = [], options = {}) {
  const {
    trim = true,
    lowercase = false,
    uppercase = false,
    removeSpecialChars = false,
    removeNumbers = false,
    replaceEmpty = null,
  } = options;

  const out = values.map((v) => {
    let s = v === null || v === undefined ? "" : String(v);
    if (trim) s = s.trim();
    if (removeSpecialChars) s = s.replace(/[^\w\s]/gi, "");
    if (removeNumbers) s = s.replace(/[0-9]/g, "");
    if (lowercase) s = s.toLowerCase();
    if (uppercase) s = s.toUpperCase();
    if ((s === null || s === undefined || String(s).trim() === "") && replaceEmpty !== null) return replaceEmpty;
    return s;
  });

  return { data: out };
}

/**
 * cleanDateColumn(values, options)
 * options:
 *  - standardizeFormat: boolean (true => YYYY-MM-DD)
 *  - replaceInvalidWith: null|string
 *  - fillMethod: 'ffill'|'bfill'|null
 */
export function cleanDateColumn(values = [], options = {}) {
  const { standardizeFormat = true, replaceInvalidWith = null, fillMethod = null } = options;

  const parsed = values.map((v) => {
    const s = v === null || v === undefined ? "" : String(v).trim();
    const d = new Date(s);
    if (s === "" || isNaN(d)) return null;
    if (standardizeFormat) return d.toISOString().split("T")[0];
    return s;
  });

  let filled = parsed.slice();

  if (fillMethod === "ffill") {
    let last = null;
    filled = filled.map((v) => {
      if (v === null) return last;
      last = v;
      return v;
    });
  } else if (fillMethod === "bfill") {
    const nexts = filled.slice();
    for (let i = nexts.length - 1; i >= 0; i--) {
      if (nexts[i] === null) {
        let j = i + 1;
        while (j < nexts.length && nexts[j] === null) j++;
        nexts[i] = j < nexts.length ? nexts[j] : null;
      }
    }
    filled = nexts;
  }

  if (replaceInvalidWith !== null) {
    filled = filled.map((v) => (v === null ? replaceInvalidWith : v));
  }

  return { data: filled };
}

/* ---------- helper to compute mode for replacement ---------- */
export function getColumnMode(values = []) {
  const counts = {};
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    counts[v] = (counts[v] || 0) + 1;
  }
  let max = -1,
    mv = null;
  for (const k in counts) {
    if (counts[k] > max) {
      max = counts[k];
      mv = k;
    }
  }
  return mv;
}

/**
 * applyRuleToColumn(rawTable, column, type, ruleId, params)
 * - rawTable: array of row objects
 * - column: column name to change
 * - type: 'number'|'text'|'date'|'category' (if null we detect)
 * - ruleId: one of your rule IDs (e.g., 'fill-mean', 'round:2', 'trim', 'standardizeFormat', etc.)
 * - params: additional options (round, outlierK, replaceEmpty, etc.)
 *
 * returns: { updatedTable, meta }
 */
export function applyRuleToColumn(rawTable = [], column, type = null, ruleId = null, params = {}) {
  if (!Array.isArray(rawTable)) return { updatedTable: rawTable, meta: null };
  if (!column) return { updatedTable: rawTable, meta: null };

  // build column values
  const colValues = rawTable.map((r) => (r ? r[column] : null));
  const detectedType = type || detectColumnType(colValues);

  // prepare options depending on ruleId
  let updatedCol = colValues.slice();
  let meta = null;

  if (detectedType === "number") {
    // parse options
    const options = {
      fill: null,
      removeOutliers: false,
      outlierK: params.outlierK ?? 3,
      normalize: false,
      standardize: false,
      round: typeof params.round === "number" ? params.round : null,
    };

    if (ruleId === "fill-mean") options.fill = "mean";
    else if (ruleId === "fill-median") options.fill = "median";
    else if (ruleId === "fill-mode") options.fill = "mode";
    else if (ruleId === "fill-zero") options.fill = "zero";
    else if (ruleId === "remove-outliers") options.removeOutliers = true;
    else if (ruleId === "normalize") options.normalize = true;
    else if (ruleId === "standardize") options.standardize = true;
    else if (ruleId && ruleId.startsWith("round")) {
      const parts = ruleId.split(":");
      const decimals = parts.length > 1 ? parseInt(parts[1], 10) : 0;
      options.round = isNaN(decimals) ? 0 : decimals;
    }

    const cleaned = cleanNumericColumn(colValues, options);
    updatedCol = cleaned.data;
    meta = cleaned.stats;
  } else if (detectedType === "text" || detectedType === "category") {
    const options = {
      trim: false,
      lowercase: false,
      uppercase: false,
      removeSpecialChars: false,
      removeNumbers: false,
      replaceEmpty: null,
    };

    if (ruleId === "trim") options.trim = true;
    else if (ruleId === "lowercase") options.lowercase = true;
    else if (ruleId === "uppercase") options.uppercase = true;
    else if (ruleId === "removeSpecialChars") options.removeSpecialChars = true;
    else if (ruleId === "removeNumbers") options.removeNumbers = true;
    else if (ruleId === "replaceEmpty") options.replaceEmpty = params.replaceEmpty ?? (detectedType === "category" ? getColumnMode(colValues) : "N/A");

    const cleaned = cleanTextColumn(colValues, options);
    updatedCol = cleaned.data;
    meta = null;
  } else if (detectedType === "date") {
    const options = {
      standardizeFormat: true,
      replaceInvalidWith: params.replaceInvalidWith ?? null,
      fillMethod: params.fillMethod ?? null,
    };

    if (ruleId === "standardizeFormat") options.standardizeFormat = true;
    else if (ruleId === "replaceInvalidWith") options.replaceInvalidWith = params.replaceInvalidWith ?? null;
    else if (ruleId === "ffill") options.fillMethod = "ffill";
    else if (ruleId === "bfill") options.fillMethod = "bfill";

    const cleaned = cleanDateColumn(colValues, options);
    updatedCol = cleaned.data;
    meta = null;
  } else {
    // default: treat as text
    const cleaned = cleanTextColumn(colValues, {});
    updatedCol = cleaned.data;
    meta = null;
  }

  // build updated table (shallow copy rows, replace only this column)
  const updatedTable = rawTable.map((row, i) => {
    const copy = { ...row };
    copy[column] = updatedCol[i];
    return copy;
  });

  return { updatedTable, meta };
}

/* ---------- smart suggestions (optional) ---------- */
export function getSmartSuggestions(values = []) {
  const t = detectColumnType(values);
  if (t === "number") return ["fill-mean", "fill-median", "remove-outliers"];
  if (t === "date") return ["standardizeFormat", "ffill"];
  if (t === "category" || t === "text") return ["trim", "lowercase", "replaceEmpty"];
  return [];
}
