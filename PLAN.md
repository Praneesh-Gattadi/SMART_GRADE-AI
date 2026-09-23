# SmartGrade AI — Next 3 Features Plan (Gemini Integration)

With the successful integration of Google Gemini (via `google-generativeai`), the application can now leverage the massive multimodal context window (up to 2M tokens) of models like `gemini-2.5-pro`.

Here is the plan for the next 3 high-impact features to build:

## 1. Multi-Document Contextual Grading
**Goal:** Improve grading accuracy for complex, multi-part exams by providing the AI with textbooks, lecture slides, and historical perfect answers simultaneously.
**How it works:**
- **UI:** A new "Knowledge Base" section in the Evaluate page where teachers can upload up to 50 PDFs (textbook chapters, syllabi).
- **Backend:** Instead of just sending the generic question and answer, the backend concatenates the entire uploaded knowledge base into the Gemini context window before the grading prompt.
- **Gemini Advantage:** The 2M token context window allows Gemini to ground its evaluation in the exact course material, drastically reducing hallucinations and ensuring the grading strictness aligns with the specific textbook taught.

## 2. Bulk Exam Grading (The "Stack" Processor)
**Goal:** Grade an entire classroom's worth of exams (e.g., 50 handwritten PDFs) in a single asynchronous batch.
**How it works:**
- **UI:** A "Batch Upload" drag-and-drop zone that accepts a ZIP file or multiple PDFs.
- **Backend:** A new Celery/Redis worker queue that processes the exams in the background. It will use Gemini's native PDF understanding via the File API to bypass intermediate OCR steps and directly process the handwritten PDFs.
- **Gemini Advantage:** Gemini Flash (`gemini-2.0-flash`) is exceptionally fast and cost-effective. We can use it to grade 50 exams in parallel and aggregate the analytics into a class-wide distribution curve.

## 3. Dynamic Rubric Synthesis
**Goal:** Automatically generate high-quality grading rubrics from the question paper itself before grading begins.
**How it works:**
- **UI:** An "Auto-Generate Rubric" button next to the question paper upload.
- **Backend:** A two-pass Gemini system. 
  - **Pass 1:** Gemini reads the question paper and synthesizes a detailed JSON rubric (allocating specific marks for syntax, logic, completeness, etc.). It returns this to the UI for the teacher to edit.
  - **Pass 2:** The teacher approves the rubric, and it is passed into the main `evaluate()` function to guide the final grading.
- **Gemini Advantage:** `gemini-2.5-pro` has superior reasoning capabilities, making it ideal for standardizing grading criteria across open-ended essay questions or complex math proofs.