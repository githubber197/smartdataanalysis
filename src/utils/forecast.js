// src/utils/forecast.js
// Advanced in-browser forecasting utilities:
// - moving average
// - linear regression (OLS) with fitted values
// - Holt-Winters (additive) with simple grid-search fitting
// - holiday-aware (uses seasonal pattern)
// - ensemble & auto-selection
// - accuracy metrics (MAPE, RMSE, MAE, R2)
// - simple confidence intervals from residuals

// ------------------------ Utilities / Metrics ------------------------
function isValidSeries(s) {
  return Array.isArray(s) && s.length > 0;
}

export function calcMAE(actual = [], pred = []) {
  const pairs = actual.map((a, i) => ({ a, p: pred[i] })).filter(({ a, p }) => Number.isFinite(a) && Number.isFinite(p));
  if (!pairs.length) return NaN;
  return pairs.reduce((s, { a, p }) => s + Math.abs(a - p), 0) / pairs.length;
}

export function calcRMSE(actual = [], pred = []) {
  const pairs = actual.map((a, i) => ({ a, p: pred[i] })).filter(({ a, p }) => Number.isFinite(a) && Number.isFinite(p));
  if (!pairs.length) return NaN;
  return Math.sqrt(pairs.reduce((s, { a, p }) => s + Math.pow(a - p, 2), 0) / pairs.length);
}

export function calcMAPE(actual = [], pred = []) {
  const pairs = actual.map((a, i) => ({ a, p: pred[i] })).filter(({ a, p }) => Number.isFinite(a) && Number.isFinite(p) && a !== 0);
  if (!pairs.length) return NaN;
  return (pairs.reduce((s, { a, p }) => s + Math.abs((a - p) / a), 0) / pairs.length) * 100;
}

export function calcR2(actual = [], pred = []) {
  const pairs = actual.map((a, i) => ({ a, p: pred[i] })).filter(({ a, p }) => Number.isFinite(a) && Number.isFinite(p));
  if (!pairs.length) return NaN;
  const meanA = pairs.reduce((s, { a }) => s + a, 0) / pairs.length;
  const ssRes = pairs.reduce((s, { a, p }) => s + Math.pow(a - p, 2), 0);
  const ssTot = pairs.reduce((s, { a }) => s + Math.pow(a - meanA, 2), 0) || 0;
  return ssTot === 0 ? NaN : 1 - ssRes / ssTot;
}

function safeNumArray(arr = []) {
  return arr.map((v) => (Number.isFinite(v) ? v : null)).filter((v) => v !== null);
}

// ------------------------ Moving Average ------------------------
export function movingAverageForecast(series = [], horizon = 7, window = 3) {
  if (!isValidSeries(series)) return { method: "moving-average", forecast: [], fitted: [], residuals: [] };
  const nums = safeNumArray(series);
  if (!nums.length) return { method: "moving-average", forecast: [], fitted: [], residuals: [] };

  // fitted: simple rolling average for each index (starting at window)
  const fitted = nums.map((_, i) => {
    if (i < window) return nums[i]; // no fit for very early points -> use actual
    const slice = nums.slice(Math.max(0, i - window), i);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });

  // forecast: iterative using last window of fitted/observed values
  const use = nums.slice();
  const forecast = [];
  for (let i = 0; i < horizon; i++) {
    const start = Math.max(0, use.length - window);
    const win = use.slice(start);
    const avg = win.reduce((a, b) => a + b, 0) / win.length;
    forecast.push(avg);
    use.push(avg);
  }

  const residuals = nums.map((v, i) => (Number.isFinite(fitted[i]) ? v - fitted[i] : 0));
  return { method: "moving-average", forecast, fitted, residuals };
}

// ------------------------ Linear Regression (OLS) ------------------------
export function linearRegressionForecast(series = [], horizon = 7) {
  if (!isValidSeries(series)) return { method: "linear-regression", forecast: [], fitted: [], slope: 0, intercept: 0, residuals: [] };
  const nums = safeNumArray(series);
  if (!nums.length) return { method: "linear-regression", forecast: [], fitted: [], slope: 0, intercept: 0, residuals: [] };

  const n = nums.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = nums.reduce((a, b) => a + b, 0) / n;

  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (nums[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  const fitted = xs.map((x) => slope * x + intercept);
  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const x = n - 1 + h;
    forecast.push(slope * x + intercept);
  }
  const residuals = nums.map((v, i) => v - fitted[i]);
  return { method: "linear-regression", forecast, fitted, slope, intercept, residuals };
}

// ------------------------ Holt-Winters (Additive) ------------------------
// Simple additive HW implementation with small grid search for alpha/beta/gamma.
// seasonLen: e.g., 12 for monthly seasonality.
// returns { forecast, fitted, params }
export function holtWintersAdditive(series = [], horizon = 12, seasonLen = 12, opts = {}) {
  if (!isValidSeries(series) || series.length < seasonLen * 2) {
    // fallback to LR if too short
    return { method: "holt-winters", forecast: linearRegressionForecast(series, horizon).forecast, fitted: [], params: null, residuals: [] };
  }
  const nums = safeNumArray(series);
  const n = nums.length;

  // helper that fits given alpha,beta,gamma and returns sse
  const fitParams = (alpha, beta, gamma) => {
    const seasons = seasonLen;
    let level = 0;
    let trend = 0;
    const season = new Array(seasons).fill(0);

    // initialize level, trend, seasonality
    const initialSeasonAverages = [];
    const seasonAverages = [];
    const numSeasons = Math.floor(n / seasons);
    for (let j = 0; j < numSeasons; j++) {
      initialSeasonAverages.push(nums.slice(j * seasons, (j + 1) * seasons).reduce((s, v) => s + v, 0) / seasons);
    }
    // average of season averages
    const avgSeason = initialSeasonAverages.reduce((s, v) => s + v, 0) / initialSeasonAverages.length;
    for (let i = 0; i < seasons; i++) {
      let sum = 0;
      for (let j = 0; j < numSeasons; j++) {
        sum += nums[j * seasons + i] - initialSeasonAverages[j];
      }
      season[i] = sum / numSeasons;
    }
    level = nums[0] - season[0];
    trend = ( (nums[seasons] - nums[0]) / seasons ) || 0;

    const fitted = [];
    let sse = 0;

    for (let t = 0; t < n; t++) {
      const val = nums[t];
      const lastLevel = level;
      const seasonIdx = t % seasons;
      const observedSeason = season[seasonIdx];

      // update equations (additive)
      const newLevel = alpha * (val - observedSeason) + (1 - alpha) * (lastLevel + trend);
      const newTrend = beta * (newLevel - lastLevel) + (1 - beta) * trend;
      const newSeason = gamma * (val - newLevel) + (1 - gamma) * observedSeason;

      level = newLevel;
      trend = newTrend;
      season[seasonIdx] = newSeason;

      const fittedVal = level + trend + season[seasonIdx];
      fitted.push(fittedVal);
      const resid = val - fittedVal;
      sse += resid * resid;
    }

    return { sse, fitted, level, trend, season };
  };

  // quick grid for alpha, beta, gamma (kept small for performance)
  const alphas = opts.alphas || [0.2, 0.4, 0.6];
  const betas = opts.betas || [0.01, 0.1, 0.2];
  const gammas = opts.gammas || [0.01, 0.1, 0.2];

  let best = null;
  for (const a of alphas) {
    for (const b of betas) {
      for (const g of gammas) {
        const res = fitParams(a, b, g);
        if (!best || res.sse < best.sse) {
          best = { a, b, g, ...res };
        }
      }
    }
  }

  if (!best) {
    return { method: "holt-winters", forecast: linearRegressionForecast(series, horizon).forecast, fitted: [], params: null, residuals: [] };
  }

  // produce forecast using best params
  const seasons = seasonLen;
  const levelStart = best.level;
  const trendStart = best.trend;
  const seasonStart = best.season.slice(); // copy

  const fitted = best.fitted || [];
  const residuals = nums.map((v, i) => v - (fitted[i] ?? v));

  const forecast = [];
  for (let m = 1; m <= horizon; m++) {
    const idx = (n + m - 1) % seasons;
    const f = levelStart + trendStart * m + seasonStart[idx];
    forecast.push(f);
  }

  return {
    method: "holt-winters",
    forecast,
    fitted,
    residuals,
    params: { alpha: best.a, beta: best.b, gamma: best.g, seasonLen },
  };
}

// ------------------------ Holiday-aware (enhanced) ------------------------
export function holidayAwareForecast(series = [], horizon = 12, seasonLen = 12) {
  // Use Holt-Winters to get seasonality pattern if possible, otherwise fall back to LR
  const hw = holtWintersAdditive(series, horizon, seasonLen);
  const lr = linearRegressionForecast(series, horizon);

  // If HW produced seasonality, blend LR trend with seasonal pattern
  if (hw && hw.params) {
    // Build monthly seasonal offsets from HW fitted/residuals
    const season = hw.params && hw.params.seasonLen ? hw.params.seasonLen : seasonLen;
    // fallback: use HW forecast directly
    return {
      method: "holiday-aware",
      forecast: hw.forecast,
      fitted: hw.fitted,
      residuals: hw.residuals,
      detectedSpikes: (hw.residuals || []).map((r) => (r > (2 * (Math.sqrt(calcRMSE(series, hw.fitted) || 1))) ? r : 0)),
      avgSpike: (hw.residuals || []).filter(r => r > 0).length ? (hw.residuals.filter(r=>r>0).reduce((s,v)=>s+v,0)/(hw.residuals.filter(r=>r>0).length)) : 0,
    };
  }

  // fallback to LR
  return { method: "holiday-aware", forecast: lr.forecast, fitted: lr.fitted, residuals: lr.residuals, detectedSpikes: [], avgSpike: 0 };
}

// ------------------------ Ensemble & Auto-selection ------------------------
export function ensembleForecast(series = [], horizon = 7, options = {}) {
  // run component models
  const ma = movingAverageForecast(series, horizon, options.maWindow || 3);
  const lr = linearRegressionForecast(series, horizon);
  const hw = holtWintersAdditive(series, horizon, options.seasonLen || 12);

  // compute simple validation error on last holdout (internal)
  const nums = safeNumArray(series);
  const hold = Math.max(1, Math.min( Math.floor(nums.length * 0.2), 12 ));
  const trainLen = Math.max(1, nums.length - hold);
  const train = nums.slice(0, trainLen);
  const actualHold = nums.slice(trainLen);

  const makePredShort = (model) => {
    // try to generate preds for hold length using model on train
    try {
      if (model.method === "moving-average") {
        return movingAverageForecast(train, actualHold.length, options.maWindow).forecast;
      }
      if (model.method === "linear-regression") {
        return linearRegressionForecast(train, actualHold.length).forecast;
      }
      if (model.method === "holt-winters") {
        return holtWintersAdditive(train, actualHold.length, options.seasonLen).forecast;
      }
    } catch (e) {
      return [];
    }
    return [];
  };

  const maShort = makePredShort(ma);
  const lrShort = makePredShort(lr);
  const hwShort = makePredShort(hw);

  const maMAPE = isNaN(calcMAPE(actualHold, maShort)) ? Infinity : calcMAPE(actualHold, maShort);
  const lrMAPE = isNaN(calcMAPE(actualHold, lrShort)) ? Infinity : calcMAPE(actualHold, lrShort);
  const hwMAPE = isNaN(calcMAPE(actualHold, hwShort)) ? Infinity : calcMAPE(actualHold, hwShort);

  // compute weights inversely proportional to MAPE (with small epsilon)
  const eps = 1e-6;
  const inv = [1 / (maMAPE + eps), 1 / (lrMAPE + eps), 1 / (hwMAPE + eps)];
  const sumInv = inv.reduce((a, b) => a + b, 0) || 1;
  const weights = inv.map((v) => v / sumInv);

  // produce ensemble forecast as weighted sum of forecasts (extend component forecasts if needed)
  const compForecasts = [
    (ma.forecast || []).slice(0, horizon),
    (lr.forecast || []).slice(0, horizon),
    (hw.forecast || []).slice(0, horizon),
  ];

  const ensemble = [];
  for (let i = 0; i < horizon; i++) {
    let val = 0;
    for (let j = 0; j < compForecasts.length; j++) {
      const f = Number(compForecasts[j][i]);
      val += (Number.isFinite(f) ? f : 0) * (weights[j] || 0);
    }
    ensemble.push(val);
  }

  // compute fitted as simple weighted mix of fitted values if present (align lengths)
  const maxFitLen = Math.max(ma.fitted?.length || 0, lr.fitted?.length || 0, hw.fitted?.length || 0);
  const fitted = [];
  for (let t = 0; t < maxFitLen; t++) {
    let v = 0;
    v += (ma.fitted?.[t] ?? 0) * weights[0];
    v += (lr.fitted?.[t] ?? 0) * weights[1];
    v += (hw.fitted?.[t] ?? 0) * weights[2];
    fitted.push(v);
  }

  const residuals = safeNumArray(series).map((v, i) => v - (fitted[i] ?? v));

  return { method: "ensemble", forecast: ensemble, fitted, residuals, weights };
}

// Auto-select best model by small holdout test (MA, LR, HW, Holiday-aware, Ensemble)
export function autoSelectForecast(series = [], horizon = 7, opts = {}) {
  const nums = safeNumArray(series);
  if (nums.length === 0) return { method: "none", forecast: [], fitted: [], residuals: [] };

  // candidate full forecasts (trained on full series)
  const candidatesFull = {
    "Moving Average": movingAverageForecast(series, horizon, opts.maWindow || 3),
    "Linear Regression": linearRegressionForecast(series, horizon),
    "Holt-Winters": holtWintersAdditive(series, horizon, opts.seasonLen || 12),
    "Holiday Aware": holidayAwareForecast(series, horizon, opts.seasonLen || 12),
  };

  // produce short holdout (last 20% up to 12)
  const hold = Math.max(1, Math.min(Math.floor(nums.length * 0.2), 12));
  const trainLen = Math.max(1, nums.length - hold);
  const train = nums.slice(0, trainLen);
  const actualHold = nums.slice(trainLen);

  const candidateShortErr = {};
  for (const name of Object.keys(candidatesFull)) {
    try {
      let shortPred;
      if (name === "Moving Average") shortPred = movingAverageForecast(train, actualHold.length, opts.maWindow || 3).forecast;
      else if (name === "Linear Regression") shortPred = linearRegressionForecast(train, actualHold.length).forecast;
      else if (name === "Holt-Winters") shortPred = holtWintersAdditive(train, actualHold.length, opts.seasonLen || 12).forecast;
      else if (name === "Holiday Aware") shortPred = holidayAwareForecast(train, actualHold.length, opts.seasonLen || 12).forecast;
      else shortPred = [];

      const mape = isNaN(calcMAPE(actualHold, shortPred)) ? Infinity : calcMAPE(actualHold, shortPred);
      candidateShortErr[name] = { mape, preds: shortPred };
    } catch (e) {
      candidateShortErr[name] = { mape: Infinity, preds: [] };
    }
  }

  // also include ensemble (built from train)
  try {
    const ens = ensembleForecast(train, actualHold.length, opts);
    const mapeEns = isNaN(calcMAPE(actualHold, ens.forecast)) ? Infinity : calcMAPE(actualHold, ens.forecast);
    candidateShortErr["Ensemble"] = { mape: mapeEns, preds: ens.forecast };
    candidatesFull["Ensemble"] = ensembleForecast(series, horizon, opts);
  } catch (e) {
    candidateShortErr["Ensemble"] = { mape: Infinity, preds: [] };
  }

  // pick best (lowest MAPE)
  const bestName = Object.keys(candidateShortErr).sort((a, b) => (candidateShortErr[a].mape || Infinity) - (candidateShortErr[b].mape || Infinity))[0];

  const chosen = candidatesFull[bestName] || candidatesFull["Moving Average"];

  // compute accuracy metrics on in-sample fitted if available (compare last fitted-length portion)
  const fitted = (chosen && chosen.fitted) || [];
  const actualForFit = safeNumArray(series).slice(Math.max(0, safeNumArray(series).length - fitted.length));
  const fittedTrim = fitted.slice(Math.max(0, fitted.length - actualForFit.length));

  const mape = isNaN(calcMAPE(actualForFit, fittedTrim)) ? NaN : calcMAPE(actualForFit, fittedTrim);
  const rmse = isNaN(calcRMSE(actualForFit, fittedTrim)) ? NaN : calcRMSE(actualForFit, fittedTrim);
  const mae = isNaN(calcMAE(actualForFit, fittedTrim)) ? NaN : calcMAE(actualForFit, fittedTrim);
  const r2 = isNaN(calcR2(actualForFit, fittedTrim)) ? NaN : calcR2(actualForFit, fittedTrim);

  // simple confidence intervals: mean residual std
  const residuals = chosen.residuals || [];
  const residStd = residuals.length ? Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length) : NaN;

  return {
    chosenName: bestName,
    chosen,
    metrics: { mape, rmse, mae, r2 },
    residStd,
  };
}

// Export convenience wrapper used by UI
export default {
  movingAverageForecast,
  linearRegressionForecast,
  holtWintersAdditive,
  holidayAwareForecast,
  ensembleForecast,
  autoSelectForecast,
  calcMAPE,
  calcRMSE,
  calcMAE,
  calcR2,
};
