import pandas as pd

def generate_insights(df: pd.DataFrame):
    insights = []
    for col in df.columns:
        if df[col].dtype in ["float64", "int64"]:
            insights.append(f"Column '{col}': mean={df[col].mean():.2f}, max={df[col].max()}, min={df[col].min()}")
        else:
            top = df[col].value_counts().head(3)
            insights.append(f"Column '{col}': top values → {top.to_dict()}")
    return insights
