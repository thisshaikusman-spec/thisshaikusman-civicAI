# Byte-Readers

**Tech for Good 2026** · GDG Coimbatore · Build weekend Aug 8–9, GRD College

**Track:** AI for Strong Institutions
**Team code:** TEAM-360

## Problem

Rajesh, a 38-year-old resident, noticed that the streetlight near his home had stopped working, making the road unsafe at night. He submitted a complaint through the municipal grievance portal, expecting it to be sent to the Streetlight Department. Instead, the complaint had to be manually read, categorized, and forwarded between different departments. Because it was initially routed incorrectly, it took 5 days before the correct team received it. During this delay, the street remained dark, creating safety concerns for residents. This reflects a common challenge in municipal grievance systems, where manual complaint classification slows down issue resolution and increases the workload of municipal staff.

## Who it helps

Citizens: Receive faster complaint routing and quicker resolution of civic issues.
Municipal Staff: Reduce the time spent manually reading, categorizing, and forwarding complaints.
City Administrators: Improve response times, reduce pending grievances, and increase operational efficiency.

## Solution

A citizen submits a complaint through a simple web form. The AI model analyzes the complaint text and classifies it into the correct municipal department, such as Streetlight, Water Supply, Roads, or Sanitation. The system then automatically maps the complaint to the responsible department and sends the complaint details via email using SMTP. The MVP focuses only on AI-powered complaint classification and automatic email routing, ensuring a simple, reliable, and achievable solution within the hackathon timeline. Features such as duplicate detection, complaint tracking, citizen login, and portal integration are planned for future versions.

## Architecture

Citizen
↓
Web Form (HTML, CSS, JavaScript)
↓
FastAPI Backend
↓
AI Complaint Classifier (DistilBERT/BERT)
↓
Department Mapping
↓
SQLite Database (Demo Storage)
↓
SMTP Email Service (Gmail)
↓
Municipal Department. 

## Tech stack

Frontend HTML CSS JavaScript Backend FastAPI (Python) AI Model DistilBERT / BERT for complaint classification Database SQLite Email Service Gmail SMTP Deployment Render or Railway

## Getting started

1. Accept your collaborator invite (check your email / GitHub notifications).
2. Clone this repo and start building.
3. Commit early and often — this repo is what you present on the day.

---

_Created automatically when your proposal was validated._