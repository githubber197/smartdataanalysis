# backend/cleaning.py
import pandas as pd

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    # Remove empty rows
    df = df.dropna()
    # Remove duplicate rows
    df = df.drop_duplicates()
    # Fill missing numeric columns with mean
    for col in df.select_dtypes(include=["float", "int"]):
        df[col].fillna(df[col].mean(), inplace=True)
    return df
