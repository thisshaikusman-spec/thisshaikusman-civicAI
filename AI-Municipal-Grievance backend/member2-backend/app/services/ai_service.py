import json
import os
import urllib.parse
import urllib.request
from typing import Any, Dict, List

from app.config import settings
from app.utils.department_mapping import get_department


def _call_gemini_llm(title: str, description: str, api_key: str) -> dict:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    prompt = f"""You are an expert AI Municipal Grievance Risk Assessor & Routing Engine. Analyze the following citizen complaint:
Title: {title}
Description: {description}

Categorize into one of: Drainage/Sewage, Garbage/Waste, Water Supply, Road Damage, Streetlight, Electricity, Traffic, Public Safety, Parks, Other.
Map department: Drainage Department for Drainage/Sewage, Sanitation Department for Garbage/Waste, Water Department for Water Supply, Roads Department for Road Damage, Street Light Department for Streetlight, Electricity Department for Electricity, Traffic Department for Traffic, Public Safety Department for Public Safety, Parks & Recreation Department for Parks, Municipal Corporation for Other.

Assess urgency_score from 0 to 100 based on health hazards, infections, life safety, electrical hazards, flooding, accidents, vulnerable populations (hospitals, schools, kids), or public disruption.
Assign priority: CRITICAL if urgency_score >= 80, HIGH if >= 60, MEDIUM if >= 40, LOW if < 40.
Assign risk_level: CRITICAL RISK, HIGH RISK, MEDIUM RISK, or LOW RISK.
List 1-3 concise risk_factors.
Provide a 1-2 sentence ai_assessment recommendation.

Return ONLY valid raw JSON with keys:
{{"category": "...", "department": "...", "priority": "...", "confidence": 0.95, "urgency_score": 85, "risk_level": "...", "risk_factors": ["..."], "ai_assessment": "..."}}"""

    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        text_resp = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
        if "```json" in text_resp:
            text_resp = text_resp.split("```json")[1].split("```")[0].strip()
        elif "```" in text_resp:
            text_resp = text_resp.split("```")[1].split("```")[0].strip()
        parsed = json.loads(text_resp)
        return {
            "category": parsed.get("category", "Other"),
            "department": parsed.get("department", "Municipal Corporation"),
            "priority": str(parsed.get("priority", "MEDIUM")).upper(),
            "confidence": float(parsed.get("confidence", 0.95)),
            "urgency_score": int(parsed.get("urgency_score", 50)),
            "risk_level": str(parsed.get("risk_level", "MEDIUM RISK")).upper(),
            "risk_factors": list(parsed.get("risk_factors", ["Municipal Request"])),
            "ai_assessment": str(parsed.get("ai_assessment", "Assessed by Gemini LLM Engine.")),
        }


def _semantic_llm_inference(title: str, description: str) -> dict:
    text = f"{title} {description}".lower()

    # 1. Category Detection & Mapping
    category = "Other"
    department = "Municipal Corporation"
    confidence = 0.85

    category_rules = [
        ("Drainage/Sewage", "Drainage Department", 0.94, ["drainage", "sewage", "drain", "sewer", "manhole", "stagnant", "clog", "clogged", "choked", "blocked", "kaluvaai", "septic", "kaluval"]),
        ("Garbage/Waste", "Sanitation Department", 0.92, ["garbage", "waste", "trash", "rubbish", "bin", "sanitation", "filth", "stink", "smell", "odour", "litter", "kuruvai", "dump"]),
        ("Water Supply", "Water Department", 0.95, ["water supply", "water leak", "no water", "pipe burst", "pipeline", "dirty water", "contamination", "muddy water", "water pressure", "tap water", "water outage", "leakage"]),
        ("Road Damage", "Roads Department", 0.92, ["pothole", "road damage", "broken road", "crater", "pit", "crack", "tar", "asphalt", "sinkhole", "cave-in"]),
        ("Streetlight", "Street Light Department", 0.96, ["street light", "streetlight", "lamp", "darkness", "no light", "bulb", "vizhakku", "lamp post"]),
        ("Electricity", "Electricity Department", 0.94, ["electricity", "exposed wire", "power cut", "wire", "sparking", "transformer", "electric shock", "current"]),
        ("Traffic", "Traffic Department", 0.91, ["traffic", "signal", "junction", "jam", "accident", "gridlock", "traffic light"]),
        ("Public Safety", "Public Safety Department", 0.90, ["dangerous", "unsafe", "hazard", "crime", "harassment", "building collapse", "fire"]),
        ("Parks", "Parks & Recreation Department", 0.88, ["park", "playground", "garden", "public park", "bench"]),
    ]

    for cat, dept, conf, keywords in category_rules:
        if any(kw in text for kw in keywords):
            category = cat
            department = dept
            confidence = conf
            break

    # 2. Risk Score & Factors Evaluation
    score = 35  # baseline score
    risk_factors = []

    # Life & Electrical Hazard (+45)
    if any(k in text for k in ["exposed wire", "exposed electrical", "electric shock", "gas leak", "building collapse", "fire hazard", "high voltage", "live wire"]):
        score += 45
        risk_factors.append("Life & Electrical Safety Hazard")

    # Public Safety Hazard (+35)
    if any(k in text for k in ["dangerous", "emergency", "accident", "causing accidents", "injury", "severely damaged", "hazard", "open manhole", "child fell", "deep pothole"]):
        score += 35
        risk_factors.append("Public Physical Safety Hazard")

    # Public Health & Infection Risk (+35)
    if any(k in text for k in ["infection", "infections", "disease", "illness", "sick", "dengue", "malaria", "fever", "mosquito", "mosquitoes", "stink", "smell", "foul", "toxic", "health", "contamination", "skin infection"]):
        score += 35
        risk_factors.append("Public Health & Infection Hazard")

    # Infrastructure Blockage & Overflow Risk (+25)
    if any(k in text for k in ["blocked", "clogged", "choked", "overflow", "overflowing", "stagnant", "flooded", "burst", "entering house", "into homes", "street flooded", "waterlog"]):
        score += 25
        risk_factors.append("Infrastructure Blockage & Flooding Risk")

    # Transit & Infrastructure Disruption (+25)
    if any(k in text for k in ["traffic signal", "signal failure", "busy junction", "major road", "highway", "main road", "bridge"]):
        score += 25
        risk_factors.append("Major Transport Disruption")

    # High Density / Sensitive Zone (+15)
    if any(k in text for k in ["school", "hospital", "clinic", "children", "kids", "elderly", "market", "busy road", "residential area", "multiple houses", "apartments", "whole street"]):
        score += 15
        risk_factors.append("High Population / Sensitive Zone Impact")

    # Persistence / High Urgency (+10)
    if any(k in text for k in ["several days", "weeks", "months", "urgent", "emergency", "immediately", "daily", "severe"]):
        score += 10
        risk_factors.append("Persistent Unresolved Civic Issue")

    urgency_score = min(score, 100)

    if urgency_score >= 80:
        risk_level = "CRITICAL RISK"
        priority = "CRITICAL"
        ai_assessment = f"Critical civic hazard detected in {category}. Poses immediate public health or safety risks to residents. Priority officer dispatch required within 12 hours."
    elif urgency_score >= 60:
        risk_level = "HIGH RISK"
        priority = "HIGH"
        ai_assessment = f"High severity {category} issue identified with notable health or public disruption. High priority resolution recommended within 24 hours."
    elif urgency_score >= 40:
        risk_level = "MEDIUM RISK"
        priority = "MEDIUM"
        ai_assessment = f"Moderate {category} issue reported. Queued for scheduled department maintenance crew dispatch."
    else:
        risk_level = "LOW RISK"
        priority = "LOW"
        ai_assessment = f"Minor non-urgent {category} request. Queued for routine maintenance cycles."

    if not risk_factors:
        risk_factors.append("Standard Municipal Request")

    if risk_factors and len(risk_factors) > 1:
        confidence = min(0.98, confidence + 0.04)

    return {
        "category": category,
        "department": department,
        "priority": priority,
        "confidence": confidence,
        "urgency_score": urgency_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "ai_assessment": ai_assessment,
    }


def evaluate_complaint_with_ai(title: str, description: str) -> dict:
    gemini_key = getattr(settings, "gemini_api_key", None) or os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        try:
            return _call_gemini_llm(title, description, gemini_key)
        except Exception as err:
            print(f"[AI Service] Gemini API call fallback: {err}")

    return _semantic_llm_inference(title, description)


def calculate_priority(title: str, description: str, category: str) -> str:
    res = evaluate_complaint_with_ai(title, description)
    return res["priority"]


def classify_complaint(title: str, description: str) -> Dict[str, Any]:
    res = evaluate_complaint_with_ai(title, description)
    return {
        "category": res["category"],
        "department": res["department"],
        "priority": res["priority"],
        "confidence": res["confidence"],
    }


def analyze_single_complaint_preview(title: str, description: str) -> dict:
    return evaluate_complaint_with_ai(title, description)


def analyze_and_rank_complaints_with_llm(complaints: list) -> dict:
    analyzed_items = []
    critical_count = 0
    high_count = 0

    for c in complaints:
        eval_res = evaluate_complaint_with_ai(c.title, c.description)
        urgency_score = eval_res["urgency_score"]
        recommended_priority = eval_res["priority"]

        if recommended_priority == "CRITICAL":
            critical_count += 1
        elif recommended_priority == "HIGH":
            high_count += 1

        analyzed_items.append(
            {
                "complaint_id": c.complaint_id,
                "title": c.title,
                "description": c.description,
                "category": eval_res["category"],
                "department": eval_res["department"],
                "location": c.location,
                "status": c.status,
                "current_priority": c.priority,
                "ai_urgency_score": urgency_score,
                "ai_priority": recommended_priority,
                "risk_factors": eval_res["risk_factors"],
                "created_at": c.created_at.isoformat() if hasattr(c.created_at, "isoformat") else str(c.created_at),
            }
        )

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
