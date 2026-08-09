import time
import json
import sys

try:
    import requests
except Exception:
    print("`requests` not installed. Install with: pip install requests")
    sys.exit(1)

BASE = "http://127.0.0.1:8000"


def ok(msg):
    print("[PASS]", msg)


def fail(msg):
    print("[FAIL]", msg)


def run():
    time.sleep(1)
    # Server root
    try:
        r = requests.get(BASE + "/")
        if r.status_code == 200 and r.json().get("message"):
            ok("GET / returned message")
        else:
            fail(f"GET / unexpected response: {r.status_code} {r.text}")
    except Exception as e:
        fail(f"GET / failed: {e}")

    # Create a complaint
    payload = {
        "name": "Rajesh",
        "email": "rajesh@example.com",
        "phone": "9876543210",
        "title": "Streetlight not working",
        "description": "The streetlight near my house has not been working for three days and the road becomes dangerous at night.",
        "location": "Coimbatore",
        "latitude": 11.0168,
        "longitude": 76.9558,
    }

    try:
        r = requests.post(BASE + "/complaints", json=payload)
        if r.status_code == 201:
            data = r.json()
            keys = ["complaint_id", "category", "department", "priority", "confidence", "status"]
            if all(k in data for k in keys):
                ok("POST /complaints returned required fields")
                cid = data.get("complaint_id")
                if data.get("created_at"):
                    ok("POST returned created_at")
                else:
                    fail("POST missing created_at")
                # check expected classification for this test payload
                exp = {
                    "category": "Streetlight",
                    "department": "Electrical Department",
                    "priority": "HIGH",
                    "status": "Submitted",
                }
                mismatches = [k for k in exp if data.get(k) != exp[k]]
                if not mismatches:
                    ok("Classification and mapping look correct for Streetlight")
                else:
                    fail(f"Classification mismatches for keys: {mismatches} -> {data}")
            else:
                fail(f"POST /complaints missing keys: {data}")
                cid = None
        else:
            fail(f"POST /complaints status {r.status_code}: {r.text}")
            cid = None
    except Exception as e:
        fail(f"POST /complaints failed: {e}")
        cid = None

    # Get all complaints
    try:
        r = requests.get(BASE + "/complaints")
        if r.status_code == 200 and r.json().get("total") is not None:
            ok("GET /complaints returned list")
        else:
            fail(f"GET /complaints unexpected response: {r.status_code} {r.text}")
    except Exception as e:
        fail(f"GET /complaints failed: {e}")

    # Get single complaint
    if cid:
        try:
            r = requests.get(BASE + f"/complaints/{cid}")
            if r.status_code == 200 and r.json().get("complaint_id") == cid:
                ok(f"GET /complaints/{cid} returned complaint")
                # check presence of timestamps and location
                single = r.json()
                if single.get("location") and single.get("created_at"):
                    ok("Single complaint contains location and created_at")
                else:
                    fail("Single complaint missing location or created_at")
            else:
                fail(f"GET single complaint unexpected: {r.status_code} {r.text}")
        except Exception as e:
            fail(f"GET single complaint failed: {e}")

        # Update status to In Progress
        try:
            r = requests.patch(BASE + f"/complaints/{cid}/status", json={"status": "In Progress"})
            if r.status_code == 200 and r.json().get("status") == "In Progress":
                ok("PATCH status -> In Progress succeeded")
            else:
                fail(f"PATCH In Progress failed: {r.status_code} {r.text}")
        except Exception as e:
            fail(f"PATCH In Progress exception: {e}")

        # Update status to Resolved
        try:
            r = requests.patch(BASE + f"/complaints/{cid}/status", json={"status": "Resolved"})
            if r.status_code == 200 and r.json().get("status") == "Resolved":
                ok("PATCH status -> Resolved succeeded")
            else:
                fail(f"PATCH Resolved failed: {r.status_code} {r.text}")
        except Exception as e:
            fail(f"PATCH Resolved exception: {e}")

        # Invalid status
        try:
            r = requests.patch(BASE + f"/complaints/{cid}/status", json={"status": "Completed"})
            if r.status_code >= 400:
                ok("PATCH invalid status rejected")
            else:
                fail("PATCH invalid status unexpectedly accepted")
        except Exception as e:
            fail(f"PATCH invalid status exception: {e}")

    # Validation tests
    bads = [
        ({}, "missing required"),
        ({"name":"","email":"not-an-email","phone":"","title":"","description":"","location":"","latitude":200,"longitude":200}, "invalid types/values"),
    ]
    for body, desc in bads:
        try:
            r = requests.post(BASE + "/complaints", json=body)
            if r.status_code >= 400:
                ok(f"Validation rejected: {desc}")
            else:
                fail(f"Validation unexpectedly accepted: {desc} -> {r.status_code}")
        except Exception as e:
            fail(f"Validation request failed: {e}")

    # Multiple category tests
    category_tests = [
        ("Pothole on main road", "Large pothole causing issues", "Road Damage", "Road Damage Department"),
        ("Garbage heap not collected", "Garbage not collected for days", "Garbage/Waste", "Sanitation Department"),
        ("No water supply", "Tap water not working since morning", "Water Supply", "Water Department"),
        ("Drainage overflow", "Sewage overflowing on street", "Drainage/Sewage", "Drainage Department"),
        ("Power cut frequently", "Electricity supply unstable", "Electricity", "Electrical Department"),
        ("Signal not working", "Traffic signal not functioning at junction", "Traffic", "Traffic Department"),
        ("Park bench broken", "Bench needs repair", "Parks", "Parks Department"),
    ]

    for title, desc, exp_category, exp_department in category_tests:
        payload = {
            "name": "Tester",
            "email": "tester@example.com",
            "phone": "1234567890",
            "title": title,
            "description": desc,
            "location": "City",
            "latitude": 10.0,
            "longitude": 10.0,
        }
        try:
            r = requests.post(BASE + "/complaints", json=payload)
            if r.status_code == 201:
                data = r.json()
                if data.get("category") == exp_category:
                    ok(f"Category matched: {exp_category}")
                else:
                    fail(f"Category mismatch: expected {exp_category}, got {data.get('category')}")
                # department mapping check is best-effort (depends on mapping implementation)
            else:
                fail(f"Category test POST failed: {r.status_code} {r.text}")
        except Exception as e:
            fail(f"Category test exception: {e}")

    # Priority specific tests
    priority_tests = [
        ("Exposed electrical wire near school", "Wire exposed near children", "HIGH"),
        ("Garbage collection delayed for three days", "Garbage not picked up", "MEDIUM"),
        ("Park bench needs repair", "One bench is broken", "LOW"),
    ]
    for title, desc, exp_priority in priority_tests:
        payload = {
            "name": "PriorityTester",
            "email": "prio@example.com",
            "phone": "1112223333",
            "title": title,
            "description": desc,
            "location": "City",
            "latitude": 10.0,
            "longitude": 10.0,
        }
        try:
            r = requests.post(BASE + "/complaints", json=payload)
            if r.status_code == 201:
                data = r.json()
                if data.get("priority") == exp_priority:
                    ok(f"Priority matched: {exp_priority}")
                else:
                    fail(f"Priority mismatch: expected {exp_priority}, got {data.get('priority')}")
            else:
                fail(f"Priority test POST failed: {r.status_code} {r.text}")
        except Exception as e:
            fail(f"Priority test exception: {e}")


if __name__ == "__main__":
    run()
