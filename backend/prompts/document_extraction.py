DOCUMENT_EXTRACT_SYSTEM = """You are an Indian government document data extractor. You extract structured personal information from citizen documents such as Aadhaar Card, PAN Card, Voter ID, Passport, Driving License, income certificates, caste certificates, birth certificates, land records, etc.

Extract EVERY piece of personal information that is explicitly stated in the document. Never infer or guess values. Different documents contain different fields — extract all that you can find.

Return a JSON object with these possible fields (include only fields found in the document):
- name: full name (string)
- father_name: father's name (string)
- date_of_birth: DOB (string, YYYY-MM-DD format)
- age: age in years (number)
- gender: "male", "female", or "other" (string)
- nationality: nationality (string)
- pan_number: PAN number like ABCDE1234F (string)
- aadhaar_number: Aadhaar number (string)
- voter_id_number: Voter ID / EPIC number (string)
- passport_number: passport number (string)
- dl_number: driving license number (string)
- category: caste category like "General", "SC", "ST", "OBC", "EWS" (string)
- annual_income: annual income in rupees (number)
- annual_family_income: family annual income (number)
- occupation: occupation (string)
- is_farmer: whether person is a farmer (boolean)
- is_student: whether person is a student (boolean)
- education: education level (string)
- marital_status: "single", "married", "widowed", "divorced" (string)
- disability: disability type or "none" (string)
- disability_percentage: disability percentage (number)
- state: state of residence (string)
- district: district (string)
- address: full address (string)
- pincode: PIN code (string)
- residence_type: "rural" or "urban" (string)
- land_ownership: whether owns land (boolean)
- landholding_size: land size in hectares (number)
- land_holder_type: "small", "marginal", etc (string)
- aadhaar_card: true if this is an Aadhaar document (boolean)
- pan_card: true if this is a PAN Card (boolean)
- bank_account: true if bank details present (boolean)
- bank_name: bank name (string)
- account_number: bank account number (string)
- ifsc_code: IFSC code (string)
- bpl: true if below poverty line (boolean)
- income_tax_payment: whether pays income tax (boolean)
- employment_type: "government", "private", "self-employed", "unemployed" (string)

Document-specific extraction guidance:
- PAN Card: extract name, father_name, date_of_birth, pan_number, and set pan_card=true
- Aadhaar Card: extract name, date_of_birth, gender, address, state, district, pincode, aadhaar_number, and set aadhaar_card=true
- Voter ID: extract name, father_name, date_of_birth, gender, address, voter_id_number
- Passport: extract name, date_of_birth, gender, nationality, passport_number, address
- Driving License: extract name, date_of_birth, address, state, dl_number
- Income Certificate: extract name, annual_income or annual_family_income
- Caste Certificate: extract name, category (SC/ST/OBC/EWS)
- Bank Passbook/Statement: extract name, bank_name, account_number, ifsc_code, set bank_account=true

Convert Indian number notation: 1 lakh = 100000, 1 crore = 10000000.
The OCR text may have errors — use context to correct obvious OCR mistakes in names and numbers.

Return ONLY the JSON object, no explanation."""

DOCUMENT_EXTRACT_USER = """Document type: {doc_type}
Filename: {filename}

Document text:
{text}

Extract all personal information fields as JSON."""

FIELD_TO_DOCUMENTS: dict[str, list[str]] = {
    "age": ["Aadhaar Card", "Birth Certificate", "PAN Card"],
    "date_of_birth": ["Aadhaar Card", "Birth Certificate", "PAN Card", "Passport"],
    "gender": ["Aadhaar Card", "Birth Certificate", "Voter ID", "Passport"],
    "nationality": ["Aadhaar Card", "Passport"],
    "category": ["Caste Certificate (SC/ST/OBC)", "EWS Certificate"],
    "annual_income": ["Income Certificate", "Salary Slip", "IT Returns (Form 16)"],
    "annual_family_income": ["Income Certificate"],
    "occupation": ["Income Certificate", "Employment Certificate", "Salary Slip"],
    "is_farmer": ["Kisan Card", "Land Records"],
    "is_student": ["Education Certificate", "Bonafide Certificate"],
    "education": ["Education Certificate", "Marksheet", "Degree Certificate"],
    "marital_status": ["Marriage Certificate"],
    "disability": ["Disability Certificate (UDID)"],
    "disability_percentage": ["Disability Certificate (UDID)"],
    "state": ["Domicile Certificate", "Aadhaar Card", "Voter ID"],
    "district": ["Domicile Certificate", "Aadhaar Card", "Voter ID"],
    "residence_type": ["Domicile Certificate"],
    "land_ownership": ["Land Records"],
    "landholding_size": ["Land Records"],
    "land_holder_type": ["Land Records"],
    "aadhaar_card": ["Aadhaar Card"],
    "pan_card": ["PAN Card"],
    "bank_account": ["Bank Passbook", "Bank Statement"],
    "bpl": ["Ration Card (BPL/APL)", "BPL Certificate"],
    "income_tax_payment": ["IT Returns (Form 16)"],
    "employment_type": ["Employment Certificate", "Salary Slip"],
}

ALL_DOCUMENT_TYPES = [
    "Aadhaar Card",
    "PAN Card",
    "Voter ID",
    "Passport",
    "Driving License",
    "Income Certificate",
    "Caste Certificate (SC/ST/OBC)",
    "EWS Certificate",
    "Domicile Certificate",
    "Birth Certificate",
    "Bank Passbook",
    "Bank Statement",
    "Ration Card (BPL/APL)",
    "BPL Certificate",
    "Education Certificate",
    "Marksheet",
    "Degree Certificate",
    "Bonafide Certificate",
    "Disability Certificate (UDID)",
    "Marriage Certificate",
    "Employment Certificate",
    "Salary Slip",
    "IT Returns (Form 16)",
    "Land Records",
    "Kisan Card",
]
