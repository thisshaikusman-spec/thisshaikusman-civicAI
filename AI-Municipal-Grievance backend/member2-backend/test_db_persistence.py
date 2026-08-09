import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# Create 3 complaints
payloads = [
    {
        "name": "Rajesh",
        "email": "rajesh@example.com",
        "phone": "9876543210",
        "title": "Streetlight not working",
        "description": "The streetlight near my house has not been working for three days.",
        "location": "Coimbatore",
        "latitude": 11.0168,
        "longitude": 76.9558,
    },
    {
        "name": "Anita",
        "email": "anita@example.com",
        "phone": "9876543211",
        "title": "Traffic signal not working",
        "description": "The traffic light is broken at the main junction.",
        "location": "Coimbatore",
        "latitude": 11.0169,
        "longitude": 76.9560,
    },
    {
        "name": "Vikram",
        "email": "vikram@example.com",
        "phone": "9876543212",
        "title": "Garbage collection delayed",
        "description": "Garbage has not been collected for three days.",
        "location": "Coimbatore",
        "latitude": 11.0170,
        "longitude": 76.9562,
    },
]

for payload in payloads:
    response = client.post('/complaints', json=payload)
    print('POST', response.status_code, response.json())

print('GET ALL', client.get('/complaints').json())
print('GET CMP-0001', client.get('/complaints/CMP-0001').json())
print('GET NONEXISTENT', client.get('/complaints/CMP-9999').status_code)
