import re
from docxtpl import DocxTemplate

def parse_transcription_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    try:
        eng_content, af_content = content.split('# Afrikaans Transcription')
    except ValueError:
        print("Error: Could not find '# Afrikaans Transcription' splitter.")
        return []

    speaker_regex = re.compile(r'^(SPEAKER \d+) (\[\d\d:\d\d:\d\d\])$')

    def process_section(section_content):
        data = []
        current_entry = None

        for line in section_content.strip().split('\n'):
            line = line.strip()
            if not line:
                continue

            match = speaker_regex.match(line)
            if match:
                if current_entry:
                    current_entry['text'] = ' '.join(current_entry['text'])
                    data.append(current_entry)
                
                current_entry = {
                    'speaker': match.group(1) + ':',
                    'ts': match.group(2),
                    'text': []
                }
            elif current_entry:
                current_entry['text'].append(line)
        
        if current_entry:
            current_entry['text'] = ' '.join(current_entry['text'])
            data.append(current_entry)
            
        return data

    english_data = process_section(eng_content.replace('# English transcription', ''))
    afrikaans_data = process_section(af_content)

    combined_data = []
    for en_item, af_item in zip(english_data, afrikaans_data):
        combined_data.append({
            'en_ts': en_item['ts'],
            'en_speaker': en_item['speaker'],
            'en_text': en_item['text'],
            'af_ts': af_item['ts'],
            'af_speaker': af_item['speaker'],
            'af_text': af_item['text'],
        })
    
    return combined_data

def main():
    print("Parsing transcription file...")
    transcription_data = parse_transcription_file('Transcription-translation.txt')
    if not transcription_data:
        print("Failed to parse transcription data. Exiting.")
        return

    print(f"Successfully parsed {len(transcription_data)} transcription rows.")

    context = {
        'case_number': 'VCB-2025/11/08',
        'case_name': 'Ferreira v. The State',
        'division': 'Gauteng Division, Pretoria',
        'hearing_date': '2025-11-08',
        'judge': 'The Honourable Judge Basson',
        'clerk': 'J. Doe',
        'plaintiff': 'Adv. N. Basson',
        'defendant': 'State Advocate',
        'translator_name': 'M.G.T. Ferreira',
        'translator_status': '[X] Professional',
        'translator_division': 'Gauteng Division, Pretoria',
        'translator_sati': '123456',
        'translator_date': '2025-11-08',
        'translation_type': 'Sworn',
        'certification_name_transcriber': 'VCB AI Transcription Service',
        'certification_court': 'High',
        'certification_date': '2025-11-08',
        'certification_name_translator': 'M.G.T. Ferreira',
        'certification_translator_division': 'Gauteng',
        'sati_reg': '123456',
        'transcription_data': transcription_data
    }

    print("Loading template 'HC_TEMPLATE.docx'...")
    doc = DocxTemplate('HC_TEMPLATE.docx')

    print("Rendering document...")
    doc.render(context)

    output_filename = 'VCB_Generated_Transcription.docx'
    doc.save(output_filename)
    print(f"\n--- SUCCESS ---")
    print(f"Document successfully created: {output_filename}")

if __name__ == "__main__":
    main()
