import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_deduplication_and_reject():
    print("--- TESTING DEDUPLICATION ---")
    payload1 = {
        "name": "Citizen A",
        "email": "citizena@example.com",
        "phone": "9876543210",
        "title": "Severe pothole near water tank",
        "description": "Large pothole causing traffic slowdowns and damage to vehicles.",
        "location": "Ward 12 Main St",
        "latitude": 13.0827,
        "longitude": 80.2707,
    }

    res1 = client.post('/complaints/', json=payload1)
    if res1.status_code != 201:
        print("Error details:", res1.status_code, res1.text)
    assert res1.status_code == 201, f"Expected 201, got {res1.status_code}: {res1.text}"
    data1 = res1.json()
    cid1 = data1['complaint_id']
    print("Initial Complaint Created:", cid1, "is_duplicate:", data1.get("is_duplicate"))

    # Count total complaints
    res_list1 = client.get('/complaints/')
    total_before = res_list1.json()['total']

    # Submit exact duplicate
    payload2 = {
        "name": "Citizen B",
        "email": "citizenb@example.com",
        "phone": "9876543299",
        "title": "Severe pothole near water tank ",  # extra space trimmed
        "description": "Another report for the same pothole near water tank.",
        "location": "Ward 12 Main St",
        "latitude": 13.0827,
        "longitude": 80.2707,
    }

    res2 = client.post('/complaints/', json=payload2)
    assert res2.status_code == 201, f"Expected 201, got {res2.status_code}"
    data2 = res2.json()
    print("Duplicate Submission Response:", data2['complaint_id'], "is_duplicate:", data2.get("is_duplicate"), "duplicate_of_id:", data2.get("duplicate_of_id"))

    assert data2.get("is_duplicate") is True, "Expected is_duplicate to be True"
    assert data2.get("duplicate_of_id") == cid1, f"Expected duplicate_of_id to be {cid1}"

    # Verify total count in DB did NOT increase
    res_list2 = client.get('/complaints/')
    total_after = res_list2.json()['total']
    assert total_after == total_before, f"Expected total count to remain {total_before}, got {total_after}"
    print("[PASS] Deduplication test passed! No new row created, auto-linked to", cid1)

    print("\n--- TESTING STATUS = 'Rejected' ---")
    res_reject = client.patch(f'/complaints/{cid1}/status', json={"status": "Rejected"})
    assert res_reject.status_code == 200, f"Expected status 200, got {res_reject.status_code}"
    print("Rejected Patch Response:", res_reject.json())
    assert res_reject.json()['status'] == "Rejected"
    print("[PASS] Rejected status update passed!")

if __name__ == "__main__":
    test_deduplication_and_reject()
