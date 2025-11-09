from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from models import predict_sales_churn
from suggestions import generate_insights

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
DATA = {"raw": None, "cleaned": None}

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)
    DATA["raw"] = df
    DATA["cleaned"] = None
    return {"data": df.head(100).to_dict(orient="records")}

@app.post("/clean")
async def clean_data():
    if DATA["raw"] is None:
        return {"error": "Upload data first"}
    df = DATA["raw"].dropna()
    DATA["cleaned"] = df
    return {"cleaned_data": df.head(100).to_dict(orient="records")}

@app.post("/suggestions")
async def suggestions():
    if DATA["cleaned"] is None:
        return {"insights": ["No cleaned data available"]}
    insights = generate_insights(DATA["cleaned"])
    return {"insights": insights}

@app.post("/predict")
async def predict():
    if DATA["cleaned"] is None:
        return {"prediction": "No cleaned data to predict"}
    prediction = predict_sales_churn(DATA["cleaned"])
    return {"prediction": prediction}
