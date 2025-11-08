# Document Generation Setup Instructions

## Quick Start

### 1. Install Python Library
```powershell
pip install docxtpl
```

### 2. Create Template (HC_TEMPLATE.docx)

**Important Steps:**

1. **Save a copy** of `HC-SAMPLE..docx` as `HC_TEMPLATE.docx`

2. **Replace all `[To be completed]` placeholders** with Jinja2 tags:
   - `[To be completed]` for Case Number → `{{ case_number }}`
   - `[To be completed]` for Case Name → `{{ case_name }}`
   - `[To be completed]` for Division → `{{ division }}`
   - Continue for all other fields (see context dictionary in script)

3. **Fix the Transcription Table** (CRITICAL):
   - Change header from "ISIZULU (TRANSLATION)" to "AFRIKAANS (TRANSLATION)"
   - Delete the sample row with text
   - Add ONE new row below the header with these 7 cells:

   | Cell 1 | Cell 2 | Cell 3 | Cell 4 | Cell 5 | Cell 6 | Cell 7 |
   |--------|--------|--------|--------|--------|--------|--------|
   | `{% for row in transcription_data %}{{ row.en_ts }}` | `{{ row.en_speaker }}` | `{{ row.en_text }}` | `{{ loop.index * 10 }}` | `{{ row.af_ts }}` | `{{ row.af_speaker }}` | `{{ row.af_text }}{% endfor %}` |

   **Note:** The `{% for row in transcription_data %}` goes in the first cell, and `{% endfor %}` goes in the last cell.

### 3. Run the Script

```powershell
cd format
python generate_report.py
```

### Expected Output
```
Parsing transcription file...
Successfully parsed 82 transcription rows.
Loading template 'HC_TEMPLATE.docx'...
Rendering document...

--- SUCCESS ---
Document successfully created: VCB_Generated_Transcription.docx
```

## Template Variables Reference

All variables that need to be replaced in your template:

- `{{ case_number }}`
- `{{ case_name }}`
- `{{ division }}`
- `{{ hearing_date }}`
- `{{ judge }}`
- `{{ clerk }}`
- `{{ plaintiff }}`
- `{{ defendant }}`
- `{{ translator_name }}`
- `{{ translator_status }}`
- `{{ translator_division }}`
- `{{ translator_sati }}`
- `{{ translator_date }}`
- `{{ translation_type }}`
- `{{ certification_name_transcriber }}`
- `{{ certification_court }}`
- `{{ certification_date }}`
- `{{ certification_name_translator }}`
- `{{ certification_translator_division }}`
- `{{ sati_reg }}`
- `{{ transcription_data }}` (for the table loop)

## Troubleshooting

**Error: "Could not find '# Afrikaans Transcription' splitter"**
- Check that `Transcription-translation.txt` has the correct section headers

**Error: "No module named 'docxtpl'"**
- Run: `pip install docxtpl`

**Template not rendering correctly**
- Ensure Jinja2 tags use `{{ }}` for variables and `{% %}` for logic
- Check that all tag names match the context dictionary keys
