import os
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_photo_evidence_upload():
    print("--- TESTING PHOTO EVIDENCE UPLOAD ---")
    
    # 1. Test invalid file format
    fake_txt = io.BytesIO(b"This is text file content")
    res_bad_format = client.post(
        '/complaints/upload-evidence',
        files=[('files', ('test.txt', fake_txt, 'text/plain'))]
    )
    assert res_bad_format.status_code == 400, f"Expected 400 for text file, got {res_bad_format.status_code}"
    err_json = res_bad_format.json()
    err_msg = err_json.get('error', {}).get('message') or err_json.get('detail')
    print("[PASS] Invalid format rejected correctly:", err_msg)

    # 2. Test valid image upload
    img_byte_1 = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01")
    img_byte_2 = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01")
    
    res_upload = client.post(
        '/complaints/upload-evidence',
        files=[
            ('files', ('photo1.png', img_byte_1, 'image/png')),
            ('files', ('photo2.png', img_byte_2, 'image/png'))
        ]
    )
    assert res_upload.status_code == 200, f"Expected 200, got {res_upload.status_code}"
    upload_data = res_upload.json()
    assert 'photos' in upload_data and len(upload_data['photos']) == 2
    uploaded_urls = upload_data['photos']
    print("[PASS] Photo upload successful! Received URLs:", uploaded_urls)

    # 3. Create complaint with attached photos and per-photo GPS metadata
    payload = {
        "name": "Citizen Photo Test",
        "email": "phototest@example.com",
        "phone": "9876543210",
        "title": "Broken pipe with water overflow live photo test",
        "description": "Pipe burst in front of house causing flooding. Attached photo evidence.",
        "location": "Ward 5 Main St",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "image_url": uploaded_urls[0],
        "photos": uploaded_urls,
        "photos_metadata": [
            {
                "photo_url": uploaded_urls[0],
                "latitude": 13.0827,
                "longitude": 80.2707,
                "accuracy": 5.0,
                "captured_at": "2026-08-11T15:23:00.000Z",
                "is_verified": True,
                "source": "camera"
            },
            {
                "photo_url": uploaded_urls[1],
                "latitude": 13.0900,
                "longitude": 80.2800,
                "accuracy": 10.0,
                "captured_at": "2026-08-11T15:23:05.000Z",
                "is_verified": False,
                "source": "gallery"
            }
        ]
    }

    res_create = client.post('/complaints/', json=payload)
    assert res_create.status_code == 201, f"Expected 201, got {res_create.status_code}"
    created_data = res_create.json()
    assert created_data.get('image_url') == uploaded_urls[0]
    assert created_data.get('photos') == uploaded_urls
    assert 'photos_metadata' in created_data and len(created_data['photos_metadata']) == 2
    assert created_data['photos_metadata'][0]['is_verified'] is True
    assert created_data['photos_metadata'][0]['source'] == "camera"
    print("[PASS] Complaint created with attached photo evidence & GPS metadata! Complaint ID:", created_data['complaint_id'])

if __name__ == "__main__":
    test_photo_evidence_upload()
