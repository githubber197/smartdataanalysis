/* =============================================================================
   UNIVERSAL CLEANING RULE ENGINE
   ============================================================================= */

/* ---------- Safe Numeric Parse ---------- */
export function safeNumber(v) {
  if (v === null || v === undefined) return null;
  const cleaned = String(v).replace(/[$₹€£,%\s]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

/* ---------- Stats helpers ---------- */
export const mean = (a) => a.reduce((x,y)=>x+y,0) / a.length;
export const median = (a) => {
  const s = [...a].sort((a,b)=>a-b);
  const m = Math.floor(s.length/2);
  return s.length % 2 ? s[m] : (s[m-1] + s[m]) / 2;
};
export const stdDev = (a, m) => Math.sqrt(a.map(x => (x - m)**2).reduce((x,y)=>x+y,0)/a.length);

/* =============================================================================
   APPLY CLEANING RULE TO ANY COLUMN
   ============================================================================= */

export function applyRule(rawData, column, ruleId, params = {}) {
  if (!rawData.length || !column) return { updated: rawData, meta: {} };

  // Extract values
  const col = rawData.map(r => r[column]);

  // Prepare copies
  let out = [...col];
  let meta = {};

  /* ============================================================================
     UNIVERSAL RULES (apply to ANY type)
     ============================================================================ */

  // -------------- Trim --------------
  if (ruleId === "trim") {
    out = out.map(v => (v == null ? v : String(v).trim()));
  }

  // -------------- Lowercase --------------
  if (ruleId === "lowercase") {
    out = out.map(v => (v == null ? v : String(v).toLowerCase()));
  }

  // -------------- Replace Empty --------------
  if (ruleId === "replace-empty") {
    const rep = params.value ?? null;
    out = out.map(v => {
      if (v == null) return rep;
      const s = String(v).trim();
      return s === "" ? rep : v;
    });
  }

  // -------------- Remove Duplicates (keep first, null others) --------------
  if (ruleId === "remove-duplicates") {
    const seen = new Set();
    out = out.map(v => {
      const key = String(v).toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);
      return v;
    });
  }

  /* ============================================================================
     NUMERIC RULES — work even on text columns (values converted automatically)
     ============================================================================ */

  const nums = out.map(safeNumber).filter(v => v !== null);
  const numericAvailable = nums.length > 0;

  if (numericAvailable) {
    const m = mean(nums);
    const med = median(nums);
    const sd = stdDev(nums, m);

    meta = { mean: m, median: med, sd, min: Math.min(...nums), max: Math.max(...nums) };

    // ---------- Fill Missing ----------
    if (ruleId === "fill-mean") out = out.map(v => (safeNumber(v) ?? m));
    if (ruleId === "fill-median") out = out.map(v => (safeNumber(v) ?? med));
    if (ruleId === "fill-zero") out = out.map(v => (safeNumber(v) ?? 0));

    // ---------- Remove Outliers ----------
    if (ruleId === "remove-outliers") {
      const k = params.k ?? 3;
      out = out.map(v => {
        const num = safeNumber(v);
        if (num === null) return null;
        return Math.abs(num - m) > k * sd ? null : v;
      });
    }

    // ---------- Normalize ----------
    if (ruleId === "normalize") {
      const range = meta.max - meta.min || 1;
      out = out.map(v => {
        const num = safeNumber(v);
        return num === null ? null : (num - meta.min) / range;
      });
    }

    // ---------- Standardize ----------
    if (ruleId === "standardize") {
      out = out.map(v => {
        const num = safeNumber(v);
        return num === null ? null : (num - m) / (sd || 1);
      });
    }

    // ---------- Rounding ----------
    if (ruleId.startsWith("round:")) {
      const decimals = Number(ruleId.split(":")[1]) || 0;
      out = out.map(v => {
        const num = safeNumber(v);
        return num === null ? v : Number(num.toFixed(decimals));
      });
    }
  }

  /* ============================================================================
     DATE RULES (work even if original has mixed text)
     ============================================================================ */

  if (ruleId === "fix-dates") {
    out = out.map(v => {
      const d = new Date(v);
      return isNaN(d) ? null : d.toISOString().split("T")[0];
    });
  }

  /* =============================================================================
     BUILD UPDATED TABLE
     ============================================================================= */
  const updated = rawData.map((row, i) => ({
    ...row,
    [column]: out[i],
  }));

  return { updated, meta };
}
