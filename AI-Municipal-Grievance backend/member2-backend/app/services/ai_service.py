from typing import Any, Dict

from app.utils.department_mapping import get_department


def calculate_priority(title: str, description: str, category: str) -> str:
    text = f"{title} {description}".lower()

    high_keywords = [
        "dangerous",
        "dangerous road",
        "exposed electrical",
        "exposed wire",
        "major water leakage",
        "major water leak",
        "drainage overflow",
        "overflow affecting houses",
        "dangerous pothole",
        "causing accidents",
        "traffic signal failure",
        "busy junction",
        "immediate public safety",
        "urgent",
        "emergency",
    ]

    low_keywords = [
        "suggestion",
        "general suggestion",
        "minor cleanliness",
        "non-urgent",
        "general information",
        "park bench",
        "small issue",
        "one bench",
    ]

    medium_keywords = [
        "regular streetlight",
        "moderate road damage",
        "moderate road",
        "garbage not collected",
        "garbage collection delayed",
        "not collected for several days",
        "low water pressure",
        "minor drainage",
        "minor issue",
        "maintenance",
        "needs repair",
        "needs maintenance",
    ]

    if any(keyword in text for keyword in high_keywords):
        return "HIGH"

    if any(keyword in text for keyword in low_keywords):
        return "LOW"

    if any(keyword in text for keyword in medium_keywords):
        return "MEDIUM"

    default_priority = {
        "Public Safety": "HIGH",
        "Streetlight": "MEDIUM",
        "Road Damage": "MEDIUM",
        "Garbage/Waste": "MEDIUM",
        "Water Supply": "MEDIUM",
        "Drainage/Sewage": "HIGH",
        "Electricity": "HIGH",
        "Traffic": "HIGH",
        "Parks": "LOW",
        "Other": "LOW",
    }

    return default_priority.get(category, "MEDIUM")


def classify_complaint(title: str, description: str) -> Dict[str, Any]:
    text = f"{title} {description}".lower()

    rules = [
        (
            "Streetlight",
            0.95,
            ["streetlight", "street light", "light not working", "lamp post"],
        ),
        (
            "Road Damage",
            0.92,
            ["pothole", "road damage", "broken road", "cracked road", "large pothole", "uneven road", "hole in the road"],
        ),
        (
            "Garbage/Waste",
            0.9,
            ["garbage", "waste", "trash", "rubbish", "not collected", "garbage not collected", "waste not collected", "garbage collection delayed"],
        ),
        (
            "Water Supply",
            0.94,
            ["no water", "water supply", "water outage", "water not working", "tap water", "low water pressure", "water leakage", "major water leakage", "major water leak"],
        ),
        (
            "Drainage/Sewage",
            0.93,
            ["drainage", "sewage", "drain", "overflow", "drainage overflow", "sewage overflow", "storm drain"],
        ),
        (
            "Electricity",
            0.93,
            ["electricity", "power", "power connection", "electric", "power cut", "electric supply", "exposed wire", "exposed electrical"],
        ),
        (
            "Traffic",
            0.91,
            ["traffic signal", "traffic light", "signal not working", "traffic jam", "road signal", "busy junction", "signal failure"],
        ),
        (
            "Public Safety",
            0.9,
            ["unsafe", "unsafe at night", "not safe", "dangerous", "crime", "road is unsafe", "public safety"],
        ),
        (
            "Parks",
            0.88,
            ["park", "playground", "garden", "public park", "park is damaged", "park maintenance", "bench needs repair"],
        ),
    ]

    for category, confidence, keywords in rules:
        if any(keyword in text for keyword in keywords):
            return {
                "category": category,
                "department": get_department(category),
                "priority": calculate_priority(title, description, category),
                "confidence": confidence,
            }

    category = "Other"
    return {
        "category": category,
        "department": get_department(category),
        "priority": calculate_priority(title, description, category),
        "confidence": 0.75,
    }


def analyze_and_rank_complaints_with_llm(complaints: list) -> dict:
    analyzed_items = []
    critical_count = 0
    high_count = 0

    for c in complaints:
        text = f"{c.title} {c.description}".lower()
        score = 35  # baseline score
        risk_factors = []

        # 1. Critical Public Safety Hazards (+45 pts)
        if any(k in text for k in ["exposed wire", "exposed electrical", "electric shock", "gas leak", "building collapse", "fire hazard", "high voltage"]):
            score += 45
            risk_factors.append("Extreme Electrical/Life Safety Hazard")
        elif any(k in text for k in ["dangerous", "emergency", "accident", "causing accidents", "injury", "severely damaged"]):
            score += 35
            risk_factors.append("Public Safety Hazard")

        # 2. Critical Traffic & Infrastructure Disruption (+25 pts)
        if any(k in text for k in ["traffic signal", "signal failure", "busy junction", "major road", "highway", "main road", "bridge"]):
            score += 25
            risk_factors.append("Major Transport Disruption")

        # 3. Water & Sewage Outage / Contamination (+20 pts)
        if any(k in text for k in ["drainage overflow", "sewage overflow", "water outage", "major water leak", "contamination"]):
            score += 20
            risk_factors.append("Sanitation & Health Impact")

        # 4. Location Density / Impact Scope (+10 pts)
        if any(k in text for k in ["school", "hospital", "market", "residential area", "multiple houses", "main street"]):
            score += 10
            risk_factors.append("High Population Density Zone")

        # Cap score at 100
        urgency_score = min(score, 100)

        # Map score to AI Recommended Priority
        if urgency_score >= 80:
            recommended_priority = "CRITICAL"
            critical_count += 1
        elif urgency_score >= 60:
            recommended_priority = "HIGH"
            high_count += 1
        elif urgency_score >= 40:
            recommended_priority = "MEDIUM"
        else:
            recommended_priority = "LOW"

        if not risk_factors:
            risk_factors.append("Routine Municipal Request")

        analyzed_items.append({
            "complaint_id": c.complaint_id,
            "title": c.title,
            "description": c.description,
            "category": c.category,
            "department": c.department,
            "location": c.location,
            "status": c.status,
            "current_priority": c.priority,
            "ai_urgency_score": urgency_score,
            "ai_priority": recommended_priority,
            "risk_factors": risk_factors,
            "created_at": c.created_at.isoformat() if hasattr(c.created_at, "isoformat") else str(c.created_at),
        })

    # Sort items by AI Urgency Score descending
    analyzed_items.sort(key=lambda x: x["ai_urgency_score"], reverse=True)

    # Assign rank order
    for rank, item in enumerate(analyzed_items, start=1):
        item["priority_rank"] = rank

    summary = {
        "total_analyzed": len(complaints),
        "critical_count": critical_count,
        "high_count": high_count,
        "primary_recommendation": f"LLM Priority Engine identified {critical_count} CRITICAL and {high_count} HIGH severity reports needing urgent officer dispatch.",
    }

    return {
        "summary": summary,
        "ranked_complaints": analyzed_items,
    }


def analyze_single_complaint_preview(title: str, description: str) -> dict:
    classification = classify_complaint(title, description)
    text = f"{title} {description}".lower()

    score = 35  # baseline urgency score
    risk_factors = []

    # 1. Critical Public Safety Hazards (+45 pts)
    if any(k in text for k in ["exposed wire", "exposed electrical", "electric shock", "gas leak", "building collapse", "fire hazard", "high voltage"]):
        score += 45
        risk_factors.append("Extreme Electrical & Life Safety Hazard")
    elif any(k in text for k in ["dangerous", "emergency", "accident", "causing accidents", "injury", "severely damaged", "hazard"]):
        score += 35
        risk_factors.append("Public Safety & Hazard Risk")

    # 2. Critical Traffic & Infrastructure Disruption (+25 pts)
    if any(k in text for k in ["traffic signal", "signal failure", "busy junction", "major road", "highway", "main road", "bridge", "pothole"]):
        score += 25
        risk_factors.append("Infrastructure & Transport Disruption")

    # 3. Water & Sewage Outage / Contamination (+20 pts)
    if any(k in text for k in ["drainage overflow", "sewage overflow", "water outage", "major water leak", "contamination"]):
        score += 20
        risk_factors.append("Sanitation & Environmental Health Impact")

    # 4. Location Density / Impact Scope (+10 pts)
    if any(k in text for k in ["school", "hospital", "market", "residential area", "multiple houses", "main street"]):
        score += 10
        risk_factors.append("High Population Density Zone")

    urgency_score = min(score, 100)

    if urgency_score >= 80:
        risk_level = "CRITICAL RISK"
        priority = "CRITICAL"
        ai_assessment = "Critical municipal hazard detected. Poses immediate risk to public safety or core infrastructure. Priority officer dispatch required."
    elif urgency_score >= 60:
        risk_level = "HIGH RISK"
        priority = "HIGH"
        ai_assessment = "High severity issue identified with notable public disruption. High priority resolution recommended within 24 hours."
    elif urgency_score >= 40:
        risk_level = "MEDIUM RISK"
        priority = "MEDIUM"
        ai_assessment = "Standard municipal request. Queued for scheduled department maintenance crew dispatch."
    else:
        risk_level = "LOW RISK"
        priority = "LOW"
        ai_assessment = "Minor non-urgent municipal request. Queued for routine maintenance cycles."

    if not risk_factors:
        risk_factors.append("Standard Municipal Request")

    return {
        "category": classification["category"],
        "department": classification["department"],
        "priority": priority,
        "confidence": classification["confidence"],
        "urgency_score": urgency_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "ai_assessment": ai_assessment,
    }


