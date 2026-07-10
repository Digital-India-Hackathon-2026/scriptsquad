import sys
import pandas as pd
from datasets import load_dataset

print("Downloading 'KisanVaani/agriculture-qa-english-only' from Hugging Face...")
try:
    dataset = load_dataset("KisanVaani/agriculture-qa-english-only")
    df = pd.DataFrame(dataset['train'])
    
    output_text_path = "agriculture_qa_readable.txt"
    print(f"Converting and saving to readable text file: {output_text_path}...")
    
    with open(output_text_path, "w", encoding="utf-8") as f:
        for idx, row in df.iterrows():
            q = str(row['question']).strip()
            # The column key is 'answers'
            a = str(row['answers']).strip()
            
            f.write(f"QUESTION {idx + 1}:\n{q}\n\n")
            f.write(f"ANSWER {idx + 1}:\n{a}\n")
            f.write("-" * 80 + "\n\n")
            
    print(f"Success! Saved {len(df)} Q&A pairs in a readable text format to '{output_text_path}'.")
except Exception as e:
    print(f"Error during dataset processing: {e}")
