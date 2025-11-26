import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression


def detect_trends(df):
    insights = []

    numeric_cols = df.select_dtypes(include=[np.number]).columns

    for col in numeric_cols:
        series = df[col].reset_index(drop=True)

        if len(series) < 5:
            continue

        # Simple Upward / Downward Trend
        if series.iloc[-1] > series.iloc[0]:
            insights.append(f"📈 **{col} is trending upward** over time.")
        elif series.iloc[-1] < series.iloc[0]:
            insights.append(f"📉 **{col} is trending downward** over time.")

    return insights


def detect_outliers(df):
    insights = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns

    for col in numeric_cols:
        series = df[col]
        q1, q3 = series.quantile([0.25, 0.75])
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr

        outliers = series[(series < lower) | (series > upper)]

        if len(outliers) > 0:
            insights.append(
                f"⚠️ **{col} has {len(outliers)} outliers**, which may need review."
            )

    return insights


def detect_correlations(df):
    insights = []
    numeric_df = df.select_dtypes(include=[np.number])

    if numeric_df.shape[1] < 2:
        return insights

    corr = numeric_df.corr()

    for col in corr.columns:
        for target in corr.columns:
            if col != target:
                value = corr.loc[col, target]
                if abs(value) > 0.75:
                    direction = "positive" if value > 0 else "negative"
                    insights.append(
                        f"🔗 **Strong {direction} correlation** between **{col}** and **{target}** (corr={value:.2f})."
                    )

    return insights


def forecast_values(df):
    insights = []
    numeric_cols = df.select_dtypes(include=[np.number]).columns

    for col in numeric_cols:
        series = df[col].dropna().reset_index()

        if len(series) < 6:
            continue

        X = series["index"].values.reshape(-1, 1)
        y = series[col].values

        model = LinearRegression()
        model.fit(X, y)

        future = model.predict([[len(series) + 1]])[0]

        insights.append(
            f"📊 **Forecast:** Next value of **{col}** is approximately **{future:.2f}** based on current trend."
        )

    return insights


def category_analysis(df):
    insights = []
    cat_cols = df.select_dtypes(include=["object"]).columns
    num_cols = df.select_dtypes(include=[np.number]).columns

    for cat in cat_cols:
        for num in num_cols:
            top = (
                df.groupby(cat)[num]
                .mean()
                .sort_values(ascending=False)
                .head(3)
                .to_dict()
            )

            insights.append(
                f"🏆 **Top {cat} categories by {num}** → {top}"
            )

    return insights


def generate_insights(df: pd.DataFrame):
    all_insights = []

    all_insights += detect_trends(df)
    all_insights += detect_outliers(df)
    all_insights += detect_correlations(df)
    all_insights += forecast_values(df)
    all_insights += category_analysis(df)

    if not all_insights:
        all_insights.append("No strong patterns detected, dataset looks uniform.")

    return all_insights
