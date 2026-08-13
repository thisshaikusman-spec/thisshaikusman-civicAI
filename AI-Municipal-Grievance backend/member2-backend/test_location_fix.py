import os
import uuid
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_location_tracking_and_verification():
    print("--- TESTING LOCATION TRACKING AND VERIFICATION ---")

    unique_suffix = uuid.uuid4().hex[:6]

    # Test 1: Coimbatore complaint gets Coimbatore coordinates
    payload_coimbatore = {
        "name": "Coimbatore Citizen",
        "email": f"cbe_{unique_suffix}@example.com",
        "phone": "9876543210",
        "title": f"Water Pipeline Leak in Gandhipuram {unique_suffix}",
        "description": "Severe water leak on main road in Gandhipuram, Coimbatore.",
        "location": "Gandhipuram, Coimbatore",
    }
    res1 = client.post("/complaints/", json=payload_coimbatore)
    assert res1.status_code == 201, f"Expected 201, got {res1.status_code}"
    data1 = res1.json()
    print(f"[PASS] Coimbatore Complaint ({data1['complaint_id']}) coords: Lat {data1['latitude']}, Lng {data1['longitude']}, Status: {data1['status']}")
    assert abs(data1['latitude'] - 11.0183) < 0.05, f"Expected Coimbatore lat (~11.0183), got {data1['latitude']}"
    assert abs(data1['longitude'] - 76.9644) < 0.05, f"Expected Coimbatore lng (~76.9644), got {data1['longitude']}"
    assert data1['status'] == "Submitted"

    # Test 2: Chennai complaint gets Chennai coordinates
    payload_chennai = {
        "name": "Chennai Citizen",
        "email": f"chn_{unique_suffix}@example.com",
        "phone": "9876543210",
        "title": f"Pothole on Anna Salai {unique_suffix}",
        "description": "Large pothole on Anna Salai road causing heavy traffic.",
        "location": "Anna Salai, Chennai",
    }
    res2 = client.post("/complaints/", json=payload_chennai)
    assert res2.status_code == 201, f"Expected 201, got {res2.status_code}"
    data2 = res2.json()
    print(f"[PASS] Chennai Complaint ({data2['complaint_id']}) coords: Lat {data2['latitude']}, Lng {data2['longitude']}, Status: {data2['status']}")
    assert abs(data2['latitude'] - 13.0604) < 0.05, f"Expected Chennai lat (~13.0604), got {data2['latitude']}"
    assert abs(data2['longitude'] - 80.2496) < 0.05, f"Expected Chennai lng (~80.2496), got {data2['longitude']}"
    assert data2['status'] == "Submitted"

    # Test 3: Complaint with >5km distance mismatch between photo GPS and reported address
    payload_mismatch = {
        "name": "Mismatch Citizen",
        "email": f"mismatch_{unique_suffix}@example.com",
        "phone": "9876543210",
        "title": f"Reported in Chennai but photo taken in Madurai {unique_suffix}",
        "description": "Grievance location states Anna Salai Chennai but photo EXIF GPS shows Madurai.",
        "location": "Anna Salai, Chennai",
        "latitude": 9.9252,   # Madurai coords (mismatch > 400km)
        "longitude": 78.1198,
        "photos_metadata": [
            {
                "latitude": 9.9252,
                "longitude": 78.1198,
                "captured_at": "2026-08-11T12:00:00Z",
                "is_verified": True,
                "source": "camera"
            }
        ]
    }
    res3 = client.post("/complaints/", json=payload_mismatch)
    assert res3.status_code == 201, f"Expected 201, got {res3.status_code}"
    data3 = res3.json()
    print(f"[PASS] Distance Mismatch Complaint ({data3['complaint_id']}) Status: {data3['status']}")
    assert data3['status'] == "Location Unverified", f"Expected Location Unverified, got {data3['status']}"

    # Test 4: Unrecognized location string with no GPS coordinates
    payload_unverified = {
        "name": "Unknown Location Citizen",
        "email": f"unknown_{unique_suffix}@example.com",
        "phone": "9876543210",
        "title": f"Unknown area grievance {unique_suffix}",
        "description": "No recognizable city or landmark specified.",
        "location": "Random Nonexistent Area 9999",
    }
    res4 = client.post("/complaints/", json=payload_unverified)
    assert res4.status_code == 201, f"Expected 201, got {res4.status_code}"
    data4 = res4.json()
    print(f"[PASS] Unverified Complaint ({data4['complaint_id']}) Status: {data4['status']}")
    assert data4['status'] == "Location Unverified", f"Expected Location Unverified, got {data4['status']}"

    print("ALL LOCATION TRACKING & VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_location_tracking_and_verification()
