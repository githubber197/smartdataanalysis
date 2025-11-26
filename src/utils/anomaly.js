// src/utils/anomaly.js
// Anomaly detection helpers: z-score and IQR methods.

export function detectZscoreAnomalies(values = [], threshold = 3) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const nums = values.map((v) => (Number.isFinite(v) ? v : null)).filter((v) => v !== null);
  if (nums.length === 0) return [];

  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const sd = Math.sqrt(nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length);
  if (sd === 0) return [];

  const anomalies = [];
  values.forEach((v, idx) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    const z = Math.abs((n - mean) / sd);
    if (z >= threshold) anomalies.push({ index: idx, value: n, z });
  });
  return anomalies;
}

export function detectIQRAnomalies(values = []) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const nums = values.map((v) => (Number.isFinite(v) ? v : null)).filter((v) => v !== null).sort((a, b) => a - b);
  if (nums.length === 0) return [];

  const q = (arr, p) => {
    const pos = (arr.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (arr[base + 1] !== undefined) return arr[base] + rest * (arr[base + 1] - arr[base]);
    return arr[base];
  };

  const q1 = q(nums, 0.25);
  const q3 = q(nums, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;

  const anomalies = [];
  values.forEach((v, idx) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    if (n < lower || n > upper) anomalies.push({ index: idx, value: n, lower, upper });
  });

  return anomalies;
}