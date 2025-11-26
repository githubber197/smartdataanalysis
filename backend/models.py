# models.py
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

def predict_sales_churn(df: pd.DataFrame, target_column: str = None):
    if df is None or df.empty:
        return "No data to predict"

    # If no explicit target supplied, attempt to pick one that contains 'churn' or 'sales'
    if target_column is None:
        candidates = [c for c in df.columns if "churn" in c.lower() or "sales" in c.lower()]
        target = candidates[0] if candidates else df.columns[-1]
    else:
        target = target_column

    # Basic preprocessing
    data = df.copy()
    y = data[target]
    X = data.drop(columns=[target])

    # Encode categorical columns
    encoders = {}
    for col in X.select_dtypes(include=["object", "category"]).columns:
        enc = LabelEncoder()
        X[col] = enc.fit_transform(X[col].astype(str))
        encoders[col] = enc

    # target encoding if needed
    is_classification = y.dtype == "object" or y.nunique() <= 10
    if y.dtype == "object":
        y_enc = LabelEncoder().fit_transform(y.astype(str))
    else:
        y_enc = y.values

    # split
    X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.2, random_state=42)

    if is_classification:
        model = RandomForestClassifier(n_estimators=100, random_state=42)
    else:
        model = RandomForestRegressor(n_estimators=100, random_state=42)

    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    if is_classification:
        # simple summary
        positives = int((preds > 0).sum()) if preds.dtype != object else int(sum(preds))
        return f"Classification predictions: {len(preds)} records (example positives: {positives})"
    else:
        avg_pred = float(preds.mean())
        return f"Regression predictions: {len(preds)} records, average predicted {avg_pred:.2f}"
