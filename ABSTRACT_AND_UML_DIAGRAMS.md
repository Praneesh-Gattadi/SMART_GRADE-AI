# 📄 SmartGrade AI — Abstract & Comprehensive UML Diagrams

**Project Title:** SmartGrade AI — Automated Exam Sheet Evaluation & Institution Analytics Platform  
**Documentation Purpose:** Official Project Abstract, System Architecture, and Standard UML Modeling Diagrams.

---

## 📝 1. Project Abstract

### Executive Summary
Traditional paper-based examination evaluation in educational institutions is inherently labor-intensive, time-consuming, and prone to subjective bias or evaluator fatigue. Furthermore, academic leadership often lacks real-time, quantitative visibility into student learning outcomes across different departments, class sections, and faculty members.

**SmartGrade AI** is a state-of-the-art, multi-tenant web platform designed to automate and streamline the evaluation of handwritten and digital student answer sheets. Built with a modern **React + Vite** frontend and a **FastAPI (Python)** micro-service backend, the system integrates a **Multi-Provider Vision OCR Engine** (supporting Google Gemini 1.5/2.0, Groq Llama 3.3, OpenAI GPT-4o, Anthropic Claude, and OCR.space Engine 2) to accurately transcribe complex cursive, faint, or messy human handwriting.

To ensure contextual grading accuracy, SmartGrade AI incorporates **Retrieval-Augmented Generation (RAG)** over embedded textbook knowledge bases and model answer keys. The evaluation engine automatically parses question papers, detects max marks, maps student answers 1-to-1 against each question (explicitly identifying unattempted questions), and computes similarity scores, earned marks, missing points, and custom grade assignments (A, B, C, D, F) based on user-predefined grading thresholds.

An interactive **Manual Review Workspace** provides educators with side-by-side answer sheet image inspection, real-time mark overrides, and feedback editing, ensuring complete teacher control. Concurrently, an **Institution Stats & Analytics Dashboard** provides college leadership with real-time class averages, passing rates, active student enrollments, performance trends, and grade distribution charts. Scoped multi-tenant data architecture guarantees strict privacy and security across institutions.

**Key Technical Keywords:** Artificial Intelligence, Vision OCR, Retrieval-Augmented Generation (RAG), Automated Answer Sheet Evaluation, Handwriting Transcription, FastAPI, React, Multi-Tenant System, Educational Analytics.

---

## 📐 2. UML Diagrams

---

### 2.1 Use Case Diagram (UML)

The Use Case Diagram illustrates the interactions between system actors (Faculty Member, Institution Administrator, and AI System) and the core platform features.

```mermaid
graph TD
    %% Actors
    Faculty["👨‍🏫 Faculty Member"]
    Admin["🏛️ Institution Admin"]
    AISystem["🤖 AI & OCR Subsystem"]

    %% Use Cases
    UC1["Select Institution Portal & Login"]
    UC2["Upload Exam Sheets (Question, Answer, Key)"]
    UC3["Configure Model & Strictness Settings"]
    UC4["Run Vision OCR & Handwriting Extraction"]
    UC5["Perform RAG Context & Semantic Evaluation"]
    UC6["Inspect Results & Manual Grade Override"]
    UC7["Manage Students & Class Sections"]
    UC8["View Institution Stats & Analytics Dashboard"]
    UC9["Export Reports (CSV / PDF)"]
    UC10["Manage Faculty Accounts & Portal Settings"]

    %% Relationships
    Faculty --> UC1
    Faculty --> UC2
    Faculty --> UC3
    Faculty --> UC6
    Faculty --> UC7

    Admin --> UC1
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    Admin --> UC10

    UC2 .-> UC4 : <<include>>
    UC4 .-> UC5 : <<include>>
    AISystem --> UC4
    AISystem --> UC5
```

---

### 2.2 System Architecture Diagram

This component block diagram outlines the decoupled multi-tier architecture of SmartGrade AI, spanning the Client Tier, API Gateway Tier, Processing Services, AI Engines, and Storage Systems.

```mermaid
graph TB
    subgraph Client_Layer ["💻 Client Tier (Web Application)"]
        UI["React 18 SPA (Vite + TypeScript)"]
        CSS["TailwindCSS + Shadcn UI Design System"]
        StateManager["Zustand (Auth & UI State)"]
        Charts["Recharts Data Visualization Engine"]
    end

    subgraph API_Layer ["⚡ Backend API Gateway (FastAPI)"]
        Router["FastAPI Application Gateway"]
        AuthMiddleware["JWT Authentication & Multi-Tenant Middleware"]
        EvalController["Evaluation Endpoint Controller"]
        AnalyticsController["Analytics & Dashboard Controller"]
        StudentController["Student & Section Controller"]
    end

    subgraph AI_Layer ["🧠 AI Vision & Processing Engine"]
        VisionOCR["Multi-Provider Vision OCR Router"]
        RAGEngine["Qdrant Vector DB & RAG Embeddings"]
        LLMEvaluator["AnswerEvaluator Engine (Groq / Gemini / OpenAI)"]
        HWFallback["OCR.space Engine 2 (Handwriting Fallback)"]
    end

    subgraph Storage_Layer ["💾 Data & File Storage Tier"]
        Database[("SQLite / PostgreSQL Database")]
        Uploads["Uploads File Storage (/uploads)"]
    end

    UI --> Router
    Router --> AuthMiddleware
    AuthMiddleware --> EvalController
    AuthMiddleware --> AnalyticsController
    AuthMiddleware --> StudentController

    EvalController --> VisionOCR
    VisionOCR --> HWFallback
    EvalController --> RAGEngine
    EvalController --> LLMEvaluator

    StudentController --> Database
    AnalyticsController --> Database
    EvalController --> Database
    EvalController --> Uploads
```

---

### 2.3 Class Diagram (UML Data Model)

The UML Class Diagram defines the entity relationships, attributes, and primary data models powering the backend SQLite/PostgreSQL database and FastAPI schemas.

```mermaid
classDiagram
    class User {
        +int id
        +string email
        +string username
        +string hashed_password
        +string role
        +int institution_id
        +string groq_api_key
        +string gemini_api_key
        +int grade_a_threshold
        +int grade_b_threshold
        +get_groq_api_key()
    }

    class Institution {
        +int id
        +string name
        +string subdomain
        +string logo_url
        +bool has_admin
        +DateTime created_at
    }

    class Student {
        +int id
        +int teacher_id
        +string full_name
        +string roll_number
        +string email
        +string class_section
        +bool is_active
        +DateTime created_at
    }

    class Evaluation {
        +int id
        +int teacher_id
        +int student_id
        +string student_name
        +float percentage
        +string grade
        +int ai_confidence
        +string sheet_image_path
        +string overall_feedback
        +DateTime created_at
    }

    class Rubric {
        +int id
        +int evaluation_id
        +float content_accuracy
        +float clarity
        +float examples
        +float depth
    }

    User "1" -- "0..*" Student : manages
    User "1" -- "0..*" Evaluation : conducts
    Institution "1" -- "0..*" User : employs
    Student "1" -- "0..*" Evaluation : receives
    Evaluation "1" -- "0..1" Rubric : contains
```

---

### 2.4 Sequence Diagram (Evaluation Lifecycle)

This sequence diagram traces the complete execution flow when a faculty member submits an answer sheet for automated evaluation.

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as 👨‍🏫 Faculty Member
    participant UI as 💻 React Frontend
    participant API as ⚡ FastAPI Backend
    participant OCR as 👁️ Vision OCR Engine
    participant RAG as 🔍 Vector RAG System
    participant LLM as 🤖 LLM Evaluator
    participant DB as 💾 Database

    Faculty->>UI: Selects Section, Model & Uploads Files (Question, Answer, Key)
    UI->>API: POST /evaluate (FormData + JWT Token)
    API->>API: Resolve API Key & Save Image to /uploads

    API->>OCR: extract_text_from_file(answer_bytes, context=question_text)
    alt Vision API Available (Gemini/OpenAI)
        OCR->>OCR: Run Vision Model Transcription
    else Text-Only Model (Groq)
        OCR->>OCR: Fallback to OCR.space Engine 2 (Handwriting API)
    end
    OCR-->>API: Return Transcribed Student Answer Text

    opt Knowledge Base Uploaded
        API->>RAG: Vector Search Context Chunks
        RAG-->>API: Return Top Relevant Context
    end

    API->>LLM: evaluate(question_paper, answer_text, rubric, thresholds)
    LLM->>LLM: Parse 1-to-1 Questions (Attempted vs Unattempted) & Compute Marks
    LLM-->>API: Return Evaluation Result JSON

    API->>DB: Link/Create Student Record & Save Evaluation + Rubric
    DB-->>API: Confirmation Saved
    API-->>UI: Return 200 OK + Evaluation Response Object
    UI-->>Faculty: Display Evaluation Modal & Sync to Students/Analytics Tab
```

---

### 2.5 Activity Diagram (Exam Sheet Processing Workflow)

The Activity Diagram captures the conditional logic, fallback decision trees, and processing steps during exam evaluation.

```mermaid
stateDiagram-v2
    [*] --> UploadFiles : Faculty uploads Question & Answer files
    UploadFiles --> ExtractQuestionText
    ExtractQuestionText --> ProcessAnswerSheet

    state ProcessAnswerSheet {
        [*] --> CheckFileType
        CheckFileType --> ExtractPDF : PDF File
        CheckFileType --> RunVisionOCR : Image (JPG/PNG/WEBP)
        
        RunVisionOCR --> CheckVisionAPI
        CheckVisionAPI --> GeminiVision : Gemini / OpenAI Key
        CheckVisionAPI --> HandwritingEngine : Groq / Text-Only Key
        
        GeminiVision --> CombineText
        HandwritingEngine --> CombineText
        ExtractPDF --> CombineText
    }

    CombineText --> ParseQuestionPaper
    ParseQuestionPaper --> MatchQuestionsLoop : Identify Q1, Q2, Q3...

    state MatchQuestionsLoop {
        [*] --> CheckAttempt
        CheckAttempt --> GradeAnswer : Student Answer Found
        CheckAttempt --> MarkUnattempted : Answer Omitted/Blank
        GradeAnswer --> ComputeQuestionMarks
        MarkUnattempted --> ZeroMarks
    }

    ComputeQuestionMarks --> AggregateScore
    ZeroMarks --> AggregateScore
    AggregateScore --> ApplyUserSettings : Compare against Grade A/B/C/D thresholds
    ApplyUserSettings --> SaveToDatabase
    SaveToDatabase --> DisplayResults : Update UI & Analytics Dashboard
    DisplayResults --> [*]
```

---

### 2.6 State Machine Diagram (Evaluation Entity Lifecycle)

This state machine diagram displays the various states an evaluation entity moves through from initial upload to final archiving.

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Files Selected in UI
    DRAFT --> PROCESSING : Form Submitted (POST /evaluate)
    
    PROCESSING --> OCR_EXTRACTED : Handwriting Transcribed
    OCR_EXTRACTED --> AI_EVALUATED : LLM Scoring & Rubric Generated
    
    AI_EVALUATED --> SAVED_DB : Synced with Active Student Record
    
    SAVED_DB --> MANUAL_REVIEWED : Teacher Overrides Marks or Edits Feedback
    MANUAL_REVIEWED --> SAVED_DB : Updated Record Persisted
    
    SAVED_DB --> EXPORTED : Downloaded as CSV / PDF Report
    SAVED_DB --> ARCHIVED : Student Soft-Deleted (is_active = False)
    
    ARCHIVED --> [*]
```

---

## 📌 Summary Checklist for Project Reports & Presentations

| Diagram Type | Status | Key Highlights Included |
| :--- | :--- | :--- |
| **Abstract** | ✅ Complete | Problem statement, Multi-Provider OCR, RAG, Analytics, Security. |
| **Use Case Diagram** | ✅ Complete | Faculty, Admin, AI Subsystem interactions. |
| **System Architecture** | ✅ Complete | Client Tier, FastAPI Gateway, AI Engine, Storage Tier. |
| **Class Diagram** | ✅ Complete | User, Institution, Student, Evaluation, Rubric schemas & cardinality. |
| **Sequence Diagram** | ✅ Complete | End-to-end trace from upload to database persistence. |
| **Activity Diagram** | ✅ Complete | Vision fallback decision tree & attempted/unattempted grading loop. |
| **State Machine Diagram**| ✅ Complete | Lifecycle states from Draft to Saved, Overridden, and Archived. |

---

*Generated for the SmartGrade AI Project Team.*
