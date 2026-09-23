import zipfile
import io
import concurrent.futures
from evaluator import AnswerEvaluator
from utils import extract_text_from_pdf, extract_text_from_image

from worker import celery_app

@celery_app.task(bind=True, name="process_single_exam_task")
def process_single_exam_task(self, student_id: str, answer_text: str, question_text: str, api_key: str, provider: str, model: str, kb_text: str, custom_rubric: dict, reference_answers: str = ""):
    try:
        evaluator = AnswerEvaluator(api_key=api_key, provider=provider, model=model, reference_answers=reference_answers if reference_answers else None)
        result = evaluator.evaluate(question_paper=question_text, answer_sheet=answer_text, knowledge_base=kb_text, custom_rubric=custom_rubric)
        if "error" in result:
             return {"student_id": student_id, "status": "error", "error": result["error"]}
        return {"student_id": student_id, "status": "success", "result": result}
    except Exception as e:
        return {"student_id": student_id, "status": "error", "error": str(e)}

def process_batch_async(exams: list, question_text: str, api_key: str, provider: str = "Gemini", model: str = "gemini-2.0-flash", kb_text: str = "", custom_rubric: dict = None, reference_answers: str = ""):
    # Dispatch all specific tasks to Celery
    task_ids = []
    
    for exam in exams:
        task = process_single_exam_task.delay(
            exam["student_id"], 
            exam["answer_text"], 
            question_text, 
            api_key, 
            provider, 
            model, 
            kb_text, 
            custom_rubric,
            reference_answers=reference_answers
        )
        task_ids.append(task.id)
        
    # Return the Celery AsyncResult IDs to track background progress
    return task_ids

def extract_exams_from_zip(zip_bytes: bytes, api_key: str = None) -> list:
    class DummyFile:
        def __init__(self, data, ext):
            self.data = data
            self.ext = ext
        def read(self):
            return self.data
        @property
        def type(self):
            return f"image/{self.ext}" if self.ext in ['png', 'jpg', 'jpeg'] else "application/pdf"
            
    exams = []
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        for filename in z.namelist():
            if not filename.endswith('/'): # not a directory
                ext = filename.split('.')[-1].lower()
                with z.open(filename) as f:
                    file_bytes = f.read()
                    text = ""
                    
                    df = DummyFile(file_bytes, ext)
                    if ext == 'pdf':
                        text = extract_text_from_pdf(df, api_key)
                    elif ext in ['png', 'jpg', 'jpeg']:
                        text = extract_text_from_image(df, api_key)
                    elif ext in ['txt', 'md', 'py', 'js', 'html', 'css', 'json']:
                        text = file_bytes.decode('utf-8', errors='ignore')
                        
                    if text:
                        exams.append({"student_id": filename, "answer_text": text})
    return exams
