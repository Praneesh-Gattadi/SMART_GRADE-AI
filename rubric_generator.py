import json
import google.generativeai as genai

def generate_rubric(question_text: str, api_key: str, model_name: str = "gemini-2.5-pro") -> dict:
    if not api_key:
        return {"error": "API key is required"}
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    prompt = f"""You are an expert examiner. Based on the following question paper, create a detailed evaluation rubric.
For each question, assign specific marks for different criteria (e.g., syntax, logic, completeness).
Return ONLY valid JSON in this format, with no markdown formatting or extra text:
{{
    "questions": [
        {{
            "question_number": 1,
            "question_text": "...",
            "max_marks": 10,
            "rubric_items": [
                {{"criteria": "Explanation of concept", "marks": 5}},
                {{"criteria": "Examples provided", "marks": 5}}
            ]
        }}
    ]
}}

Question Paper:
{question_text}
"""
    try:
        response = model.generate_content(prompt)
        raw = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"Error parsing rubric JSON: {str(e)}")
        return {"error": str(e)}
