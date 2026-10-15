DOCUMENT_EXTRACT_SYSTEM = """You are an Indian government document data extractor. You extract structured personal information from citizen documents such as Aadhaar cards, income certificates, caste certificates, birth certificates, land records, etc.

Extract ONLY information that is explicitly stated in the document. Never infer or guess values.

Return a JSON object with these possible fields (include only fields found in the document):
- name: full name (string)
- age: age in years (number)
- date_of_birth: DOB (string, YYYY-MM-DD)
- gender: "male", "female", or "other" (string)
- nationality: nationality (string)
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
- residence_type: "rural" or "urban" (string)
- land_ownership: whether owns land (boolean)
- landholding_size: land size in hectares (number)
- land_holder_type: "small", "marginal", etc (string)
- aadhaar_card: true if this is an Aadhaar document (boolean)
- bank_account: true if bank details present (boolean)
- bpl: true if below poverty line (boolean)
- income_tax_payment: whether pays income tax (boolean)
- employment_type: "government", "private", "self-employed", "unemployed" (string)

Convert Indian number notation: 1 lakh = 100000, 1 crore = 10000000.
For income certificates, extract the income figure.
For caste certificates, extract the category.
For Aadhaar, extract name, age/DOB, gender, address details.

Return ONLY the JSON object, no explanation."""

DOCUMENT_EXTRACT_USER = """Document type: {doc_type}
Filename: {filename}

Document text:
{text}

Extract all personal information fields as JSON."""

FIELD_TO_DOCUMENTS: dict[str, list[str]] = {
    "age": ["Aadhaar Card", "Birth Certificate", "Passport"],
    "date_of_birth": ["Aadhaar Card", "Birth Certificate"],
    "gender": ["Aadhaar Card", "Birth Certificate"],
    "nationality": ["Aadhaar Card", "Passport"],
    "category": ["Caste Certificate", "OBC/SC/ST Certificate"],
    "annual_income": ["Income Certificate"],
    "annual_family_income": ["Income Certificate", "BPL Certificate"],
    "occupation": ["Employment Certificate", "Income Certificate"],
    "is_farmer": ["Kisan Card", "Land Records"],
    "is_student": ["Student ID", "Bonafide Certificate"],
    "education": ["Education Certificate", "Marksheet"],
    "marital_status": ["Marriage Certificate"],
    "disability": ["Disability Certificate (UDID)"],
    "disability_percentage": ["Disability Certificate (UDID)"],
    "state": ["Domicile Certificate", "Aadhaar Card"],
    "district": ["Domicile Certificate", "Aadhaar Card"],
    "residence_type": ["Domicile Certificate"],
    "land_ownership": ["Land Records", "7/12 Extract"],
    "landholding_size": ["Land Records", "7/12 Extract"],
    "land_holder_type": ["Land Records"],
    "aadhaar_card": ["Aadhaar Card"],
    "bank_account": ["Bank Passbook", "Bank Statement"],
    "bpl": ["BPL Certificate", "Ration Card"],
    "income_tax_payment": ["Income Tax Returns", "Form 16"],
    "employment_type": ["Employment Certificate"],
    "constitutional_post_status": ["Self Declaration"],
    "political_office_status": ["Self Declaration"],
    "professional_registration": ["Registration Certificate"],
}

ALL_DOCUMENT_TYPES = sorted({
    doc for docs in FIELD_TO_DOCUMENTS.values() for doc in docs
})
