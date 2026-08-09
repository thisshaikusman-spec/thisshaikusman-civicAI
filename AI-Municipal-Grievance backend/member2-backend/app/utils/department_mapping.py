DEPARTMENT_MAPPING = {
    "streetlight": "Electrical Department",
    "road damage": "Roads & Highways Department",
    "garbage/waste": "Sanitation Department",
    "water supply": "Water Supply Department",
    "drainage/sewage": "Drainage Department",
    "electricity": "Electrical Department",
    "traffic": "Traffic Department",
    "public safety": "Public Safety Department",
    "parks": "Parks & Recreation Department",
    "other": "General Grievance Department",
}


def get_department(category: str) -> str:
    if not isinstance(category, str):
        return DEPARTMENT_MAPPING["other"]

    normalized = category.strip().lower()
    return DEPARTMENT_MAPPING.get(normalized, DEPARTMENT_MAPPING["other"])


def get_supported_categories() -> list[str]:
    return list(DEPARTMENT_MAPPING.keys())
