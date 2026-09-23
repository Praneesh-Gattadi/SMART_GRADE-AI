# SmartGrade AI 🎓 AI-Powered Exam & Handwritten Answer Sheet Evaluation System

**SmartGrade AI** is a multi-tenant enterprise web platform engineered to automate the evaluation of physical handwritten exam answer scripts using advanced multi-LLM Vision OCR pipelines.

---

## ✨ Features

- **📷 Vision OCR & Handwriting Recognition:** Multi-provider fallback support across **Groq Vision**, **Google Gemini AI**, **OpenAI GPT-4o Vision**, **Anthropic Claude**, **Mistral**, and **OCR.space Engine 2**.
- **🎯 1-to-1 Question-Answer Matching:** Intelligent parsing of question papers and answer sheets, automatically mapping student responses to questions and detecting unattempted questions.
- **📝 Automated Rubric & Score Evaluation:** Generates criteria-based marks and structured grading breakdowns using institution-configurable grade thresholds.
- **📊 Faculty & Institutional Dashboards:** Class analytics, average scores, grade distribution charts, and student performance tracking.
- **✍️ Manual Review & Override:** Allows faculty members to inspect AI evaluation results, override scores, add comments, and re-calculate final grades.
- **🏫 Multi-Tenancy & White-Labeling:** Independent workspaces for schools/colleges with custom logos, subdomains, and accent color themes.
- **🔐 Secure Authentication:** JWT-based auth with email/mobile OTP verification and Gmail OTP password reset workflows.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts, Axios
- **Backend:** FastAPI (Python), Uvicorn, SQLAlchemy, Pydantic, PyJWT
- **Database:** SQLite / PostgreSQL
- **AI / Vision OCR:** Groq Llama-Vision, Google Gemini, OpenAI GPT-4o, Anthropic Claude, Mistral API, OCR.space
- **DevOps / Containers:** Docker, Docker Compose

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 2. Backend Setup
```bash
cd backend
python -m venv ../venv
..\venv\Scripts\activate  # Windows: ..\venv\Scripts\activate | Linux/Mac: source ../venv/bin/activate
pip install -r requirements.txt
python main.py
```
*Backend server runs on `http://localhost:8000` (Swagger Docs: `http://localhost:8000/api/docs`)*

### 3. Frontend Setup
```bash
cd smartgrade-frontend
npm install
npm run dev
```
*Frontend dev server runs on `http://localhost:5173/`*

---

## 🐳 Docker Support

To run the full stack using Docker Compose:
```bash
docker-compose up --build
```

---

## 📜 License
This project is licensed under the MIT License.
