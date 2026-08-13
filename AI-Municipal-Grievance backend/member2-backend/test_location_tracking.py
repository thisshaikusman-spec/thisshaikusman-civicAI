import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_location_tracking_flow():
    print("--- Starting Location Tracking Test ---")
    
    import time
    ts = int(time.time())
    # 1. Create a demo complaint
    payload = {
        "name": f"Tracking Test User {ts}",
        "email": f"track_{ts}@demo.com",
        "phone": "9998887776",
        "title": f"Road Repair and Inspection Needed {ts}",
        "description": f"Pothole on Main Street needs field officer inspection {ts}",
        "location": "Anna Salai, Chennai",
        "latitude": 13.0604,
        "longitude": 80.2496,
        "category": "Roads & Maintenance"
    }
    
    res = client.post("/complaints/", json=payload)
    assert res.status_code == 201, f"Failed to create complaint: {res.text}"
    comp_data = res.json()
    complaint_id = comp_data["complaint_id"]
    print(f"1. Created Complaint: {complaint_id}")

    # 2. Check tracking history when empty
    res = client.get(f"/complaints/{complaint_id}/tracking-history")
    assert res.status_code == 200, f"Failed to get tracking history: {res.text}"
    history_data = res.json()
    assert history_data["complaint_id"] == complaint_id
    assert history_data["count"] == 0
    assert history_data["is_tracking_active"] is True
    print("2. Verified empty tracking history initially.")

    # 3. Post first location ping (field officer en route)
    ping1 = {
        "latitude": 13.0610,
        "longitude": 80.2500,
        "accuracy": 4.5,
        "tracked_by": "field_officer"
    }
    res = client.post(f"/complaints/{complaint_id}/track-location", json=ping1)
    assert res.status_code == 200, f"Failed to post location ping: {res.text}"
    print("3. Posted location ping 1 (13.0610, 80.2500)")

    # 4. Post second location ping closer to complaint location
    ping2 = {
        "latitude": 13.0607,
        "longitude": 80.2498,
        "accuracy": 3.0,
        "tracked_by": "field_officer"
    }
    res = client.post(f"/complaints/{complaint_id}/track-location", json=ping2)
    assert res.status_code == 200, f"Failed to post second location ping: {res.text}"
    print("4. Posted location ping 2 (13.0607, 80.2498)")

    # 5. Get tracking history with 2 pings
    res = client.get(f"/complaints/{complaint_id}/tracking-history")
    assert res.status_code == 200
    history_data = res.json()
    assert history_data["count"] == 2
    assert history_data["history"][0]["latitude"] == 13.0610
    assert history_data["history"][1]["latitude"] == 13.0607
    print(f"5. Fetched tracking history successfully: {history_data['count']} pings returned.")

    # 6. Update complaint status to Resolved
    res = client.patch(f"/complaints/{complaint_id}/status", json={"status": "Resolved"})
    assert res.status_code == 200
    print("6. Updated complaint status to Resolved.")

    # 7. Verify tracking history shows is_tracking_active = False
    res = client.get(f"/complaints/{complaint_id}/tracking-history")
    assert res.status_code == 200
    history_data = res.json()
    assert history_data["is_tracking_active"] is False
    print("7. Verified is_tracking_active is False after resolution.")

    # 8. Attempt to post location ping to Resolved complaint (Should fail with 400)
    ping3 = {
        "latitude": 13.0604,
        "longitude": 80.2496,
        "tracked_by": "field_officer"
    }
    res = client.post(f"/complaints/{complaint_id}/track-location", json=ping3)
    assert res.status_code == 400, f"Expected 400 Bad Request but got {res.status_code}"
    print("8. Confirmed posting tracking ping to Resolved complaint correctly rejected with 400 Bad Request.")

    print("--- ALL LOCATION TRACKING TESTS PASSED! ---")

if __name__ == "__main__":
    test_location_tracking_flow()
