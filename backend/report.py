import pandas as pd

def generate_report(cleaned_df, insights, prediction, filename="report.csv"):
    cleaned_df.to_csv(filename, index=False)
    with open("report.txt", "w") as f:
        f.write("=== AI Insights ===\n")
        for ins in insights:
            f.write(ins + "\n")
        f.write("\n=== Predictions ===\n")
        f.write(prediction + "\n")
    return filename
