import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

def predict_sales_churn(df: pd.DataFrame):
    if df.empty:
        return "No data to predict"

    target_cols = [col for col in df.columns if "churn" in col.lower() or "sales" in col.lower()]
    target = target_cols[0] if target_cols else df.columns[-1]

    X = df.drop(columns=[target])
    y = df[target]

    # Encode categorical
    for col in X.select_dtypes(include=["object"]).columns:
        X[col] = LabelEncoder().fit_transform(X[col])
    if y.dtype == "object":
        y = LabelEncoder().fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    increase = sum(preds)
    decrease = len(preds) - increase
    return f"Predictions: {increase} increase / {decrease} decrease in {target}"
