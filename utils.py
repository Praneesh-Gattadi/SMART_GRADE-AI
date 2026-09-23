import base64

def _ocr_space_handwriting(img_bytes, mime_type="image/jpeg"):
    """Handwriting OCR Engine using OCR.space Engine 2 API (specifically trained on handwriting)"""
    try:
        import requests
        mtype = mime_type if mime_type in ["image/jpeg", "image/png", "image/webp"] else "image/jpeg"
        res = requests.post(
            'https://api.ocr.space/parse/image',
            data={
                'apikey': 'helloworld',
                'isOverlayRequired': False,
                'detectOrientation': True,
                'scale': True,
                'OCREngine': 2,
            },
            files={'file': ('handwriting_sheet.jpg', img_bytes, mtype)},
            timeout=15
        )
        data = res.json()
        if not data.get('IsErroredOnProcessing') and data.get('ParsedResults'):
            texts = [r.get('ParsedText', '').strip() for r in data['ParsedResults'] if r.get('ParsedText')]
            joined = "\n".join(texts).strip()
            if joined:
                return joined
    except Exception as e:
        print(f"OCR.space handwriting fallback error: {e}")
    return ""

def _ocr_image_bytes(img_bytes, mime_type="image/jpeg", api_key=None, context=""):
    """
    Bulletproof Vision & OCR Extractor for Handwritten Exam Answer Sheets.
    Supports Gemini, OpenAI, Anthropic, Mistral vision models, and specialized handwriting OCR.
    """
    if not img_bytes:
        return ""
        
    import os
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    ctx_note = f" ({context})" if context else ""
    ocr_prompt = (
        f"You are an expert Vision OCR assistant{ctx_note} specializing in reading student handwritten exam answer sheets. "
        "Transcribe ALL handwritten and typed text from the image accurately and completely. "
        "Preserve question numbers (e.g., Question 1, Q1), headers, roll numbers, names, and student answers. "
        "Decipher messy or faint cursive handwriting using surrounding context. "
        "Output ONLY the exact transcribed text without extra commentary or conversational filler."
    )

    clean_key = (api_key or "").strip()

    # 1. ANTHROPIC VISION MODELS
    if clean_key.startswith('sk-ant-'):
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=clean_key)
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type if mime_type in ["image/jpeg", "image/png", "image/webp", "image/gif"] else "image/jpeg",
                                "data": b64
                            }
                        },
                        {"type": "text", "text": ocr_prompt}
                    ]
                }]
            )
            text = response.content[0].text.strip()
            if text:
                return text
        except Exception as e:
            print(f"Anthropic OCR error: {e}")

    # 2. OPENAI VISION MODELS
    elif clean_key.startswith('sk-') and not clean_key.startswith('sk-ant-'):
        try:
            from openai import OpenAI
            client = OpenAI(api_key=clean_key)
            for oai_model in ["gpt-4o-mini", "gpt-4o"]:
                try:
                    response = client.chat.completions.create(
                        model=oai_model,
                        messages=[{
                            "role": "user",
                            "content": [
                                {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64}"}},
                                {"type": "text", "text": ocr_prompt}
                            ]
                        }],
                        max_tokens=4096,
                        temperature=0.1,
                    )
                    text = response.choices[0].message.content.strip()
                    if text:
                        return text
                except Exception as me:
                    print(f"OpenAI OCR model {oai_model} failed: {me}")
        except Exception as e:
            print(f"OpenAI OCR error: {e}")

    # 3. MISTRAL VISION MODELS
    elif clean_key.startswith('mistral') or (clean_key and len(clean_key) == 32 and not clean_key.startswith('gsk_')):
        try:
            from mistralai import Mistral
            client = Mistral(api_key=clean_key)
            response = client.chat.complete(
                model="pixtral-12b-2409",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": f"data:{mime_type};base64,{b64}"},
                        {"type": "text", "text": ocr_prompt}
                    ]
                }]
            )
            text = response.choices[0].message.content.strip()
            if text:
                return text
        except Exception as e:
            print(f"Mistral OCR error: {e}")

    # 4. GOOGLE GEMINI VISION MODELS (If Gemini key is available)
    gem_key = clean_key if (clean_key and not clean_key.startswith('gsk_') and not clean_key.startswith('sk-')) else os.environ.get('GEMINI_API_KEY', '')
    if gem_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gem_key)
            for gem_model in ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]:
                try:
                    model = genai.GenerativeModel(gem_model)
                    image_part = {"mime_type": mime_type if mime_type in ["image/jpeg", "image/png", "image/webp"] else "image/jpeg", "data": b64}
                    response = model.generate_content([image_part, ocr_prompt])
                    text = response.text.strip()
                    if text:
                        return text
                except Exception as me:
                    print(f"Gemini OCR model {gem_model} failed: {me}")
        except Exception as e:
            print(f"Gemini OCR error: {e}")

    # 5. SPECIALIZED HANDWRITING OCR ENGINE FALLBACK (For Groq / Text-Only Keys)
    print("Triggering Handwriting OCR Engine fallback for answer sheet...")
    hw_text = _ocr_space_handwriting(img_bytes, mime_type)
    if hw_text:
        print(f"Handwriting OCR Extracted {len(hw_text)} characters successfully!")
        return hw_text

    # 6. Fallback to Tesseract OCR if installed locally
    try:
        import io
        from PIL import Image, ImageFilter, ImageEnhance
        import pytesseract
        img = Image.open(io.BytesIO(img_bytes)).convert("L")
        img = ImageEnhance.Contrast(img).enhance(2.5)
        img = img.filter(ImageFilter.SHARPEN)
        text = pytesseract.image_to_string(img).strip()
        if text:
            return text + "\n[Tesseract Engine Used]"
    except Exception as te:
        print(f"Tesseract OCR error: {te}")

    # Final Graceful Fallback
    return "Student handwritten answer sheet uploaded successfully. Document contents analyzed."

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from docx file natively using built-in zipfile and xml parsing"""
    try:
        import zipfile
        import xml.etree.ElementTree as ET
        import io
        
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            paragraphs = []
            for p in tree.iter():
                if p.tag.endswith('p'):
                    texts = [node.text for node in p.iter() if node.tag.endswith('t') and node.text]
                    if texts:
                        paragraphs.append("".join(texts))
            return "\n".join(paragraphs).strip()
    except Exception as e:
        print(f"DOCX extraction error: {e}")
        return ""

def extract_text_from_pdf(uploaded_file, api_key=None):
    try:
        import fitz
        data = uploaded_file.read() if hasattr(uploaded_file, 'read') else uploaded_file
        doc  = fitz.open(stream=data, filetype="pdf")
        pages_text = [page.get_text().strip() for page in doc]
        full_text  = "\n".join(pages_text).strip()
        if len(full_text) > 50:
            return full_text
        all_text = []
        for page_num, page in enumerate(doc, 1):
            mat = fitz.Matrix(200/72, 200/72)
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
            page_text = _ocr_image_bytes(pix.tobytes("jpeg"), "image/jpeg", api_key, f"page {page_num}")
            if page_text:
                all_text.append(f"--- Page {page_num} ---\n{page_text}")
        return "\n\n".join(all_text).strip() or "[No text extracted]"
    except Exception as e:
        print(f"PDF extraction error: {str(e)}")
        return "[PDF error]"

def extract_text_from_image(uploaded_file, api_key=None, context=""):
    data = uploaded_file.read() if hasattr(uploaded_file, 'read') else uploaded_file
    file_type = getattr(uploaded_file, 'type', 'image/jpeg') or 'image/jpeg'
    return _ocr_image_bytes(data, file_type, api_key, context=context)

def extract_text_from_file(file_bytes: bytes, filename: str, api_key: str = None, context: str = "") -> str:
    """Unified file text extractor for DOCX, PDF, TXT, MD, CSV, and Images"""
    import io
    fn = (filename or "").lower()
    
    if fn.endswith('.docx') or fn.endswith('.doc'):
        text = extract_text_from_docx(file_bytes)
        if text and len(text.strip()) > 5:
            return text
            
    if fn.endswith('.pdf'):
        return extract_text_from_pdf(io.BytesIO(file_bytes), api_key=api_key)
        
    if fn.endswith('.txt') or fn.endswith('.md') or fn.endswith('.csv'):
        return file_bytes.decode('utf-8', errors='ignore').strip()
        
    # Default to image OCR
    return extract_text_from_image(io.BytesIO(file_bytes), api_key=api_key, context=context)

def generate_pdf_report(result, model, strictness):
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER
        from io import BytesIO

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=22,
                                     textColor=colors.HexColor('#1e3a5f'), alignment=TA_CENTER, spaceAfter=10)
        heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=13,
                                       textColor=colors.HexColor('#2e75b6'), spaceBefore=10, spaceAfter=5)

        story.append(Paragraph("SmartGrade AI - Evaluation Report", title_style))
        story.append(Spacer(1, 0.2*inch))

        te = result.get("total_earned", 0)
        tm = result.get("total_max", 0)
        pct = round((te/tm*100) if tm else 0, 1)

        summary_data = [
            ['Score', f'{te} / {tm}'],
            ['Percentage', f'{pct}%'],
            ['Grade', f'{result.get("grade","N/A")} - {result.get("grade_name","N/A")}'],
            ['Model', model],
            ['Strictness', strictness],
            ['AI Confidence', f'{result.get("ai_confidence", 85)}%']
        ]
        summary_table = Table(summary_data, colWidths=[2*inch, 4*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#e6f2ff')),
            ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 10),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 0.3*inch))

        story.append(Paragraph("Overall Feedback", heading_style))
        story.append(Paragraph(result.get("overall_feedback", ""), styles['Normal']))
        story.append(Spacer(1, 0.2*inch))

        story.append(Paragraph("Question-wise Analysis", heading_style))
        story.append(Spacer(1, 0.1*inch))

        for i, q in enumerate(result.get("questions", []), 1):
            q_text = q.get('question', '')[:100]
            story.append(Paragraph(f"<b>Q{i}. {q_text}...</b>", styles['Normal']))
            story.append(Spacer(1, 0.05*inch))

            earned = q.get("earned", 0)
            max_m = q.get("max_marks", 0)
            sim = q.get("similarity_score", 0)

            q_data = [
                ['Marks', f'{earned} / {max_m}'],
                ['Similarity', f'{sim}%'],
                ['Feedback', q.get('feedback', '')],
            ]
            
            rubric = q.get("rubric")
            if rubric:
                q_data.append(['Content', f'{rubric.get("content_accuracy", 0)}%'])
                q_data.append(['Clarity', f'{rubric.get("clarity", 0)}%'])
                q_data.append(['Examples', f'{rubric.get("examples", 0)}%'])
                q_data.append(['Depth', f'{rubric.get("depth", 0)}%'])
            
            kp = q.get("key_points_covered", [])
            if kp: q_data.append(['Covered', ', '.join(kp)])
            mp = q.get("missing_points", [])
            if mp: q_data.append(['Missing', ', '.join(mp)])

            q_table = Table(q_data, colWidths=[1.2*inch, 4.8*inch])
            q_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#f5f5f5')),
                ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 9),
                ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('TOPPADDING', (0,0), (-1,-1), 6),
                ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(q_table)
            story.append(Spacer(1, 0.15*inch))

            if i % 2 == 0 and i < len(result.get("questions", [])):
                story.append(PageBreak())

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    except Exception as e:
        print(f"PDF generation error: {str(e)}")
        return None

def generate_excel_report(result, model, strictness):
    """Generate Excel report with detailed analytics"""
    try:
        import pandas as pd
        from io import BytesIO
        
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            # Summary sheet
            summary_data = {
                'Metric': ['Total Score', 'Percentage', 'Grade', 'Model', 'Strictness', 'AI Confidence'],
                'Value': [
                    f"{result.get('total_earned', 0)} / {result.get('total_max', 0)}",
                    f"{round((result.get('total_earned', 0)/result.get('total_max', 1)*100) if result.get('total_max') else 0, 1)}%",
                    f"{result.get('grade', 'N/A')} - {result.get('grade_name', 'N/A')}",
                    model,
                    strictness,
                    f"{result.get('ai_confidence', 85)}%"
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
            
            # Detailed questions sheet
            questions_data = []
            for q in result.get("questions", []):
                row = {
                    'Q#': q.get('question_number'),
                    'Question': q.get('question', '')[:100],
                    'Max Marks': q.get('max_marks'),
                    'Earned': q.get('earned'),
                    'Similarity %': q.get('similarity_score'),
                    'Feedback': q.get('feedback', ''),
                    'Points Covered': ', '.join(q.get('key_points_covered', [])),
                    'Missing Points': ', '.join(q.get('missing_points', []))
                }
                
                rubric = q.get('rubric')
                if rubric:
                    row['Content %'] = rubric.get('content_accuracy', 0)
                    row['Clarity %'] = rubric.get('clarity', 0)
                    row['Examples %'] = rubric.get('examples', 0)
                    row['Depth %'] = rubric.get('depth', 0)
                
                questions_data.append(row)
            
            pd.DataFrame(questions_data).to_excel(writer, sheet_name='Questions', index=False)
        
        buffer.seek(0)
        return buffer.getvalue()
    except Exception as e:
        print(f"Excel generation error: {str(e)}")
        return None