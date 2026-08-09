from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

examples = [
    {
        "name": "User 1",
        "email": "user1@example.com",
        "phone": "1234567890",
        "title": "Streetlight not working near school",
        "description": "The road becomes very dangerous at night.",
        "location": "City",
        "latitude": 0.0,
        "longitude": 0.0,
    },
    {
        "name": "User 2",
        "email": "user2@example.com",
        "phone": "1234567891",
        "title": "Garbage collection delayed",
        "description": "Garbage has not been collected for three days.",
        "location": "City",
        "latitude": 0.0,
        "longitude": 0.0,
    },
    {
        "name": "User 3",
        "email": "user3@example.com",
        "phone": "1234567892",
        "title": "Park bench needs repair",
        "description": "One bench in the park is damaged.",
        "location": "City",
        "latitude": 0.0,
        "longitude": 0.0,
    },
    {
        "name": "User 4",
        "email": "user4@example.com",
        "phone": "1234567893",
        "title": "Traffic signal failure at busy junction",
        "description": "The traffic light has not been working for hours.",
        "location": "City",
        "latitude": 0.0,
        "longitude": 0.0,
    },
    {
        "name": "User 5",
        "email": "user5@example.com",
        "phone": "1234567894",
        "title": "Major water leakage on main road",
        "description": "Water is gushing out and flooding the street.",
        "location": "City",
        "latitude": 0.0,
        "longitude": 0.0,
    },
]

for example in examples:
    response = client.post('/complaints', json=example)
    print('---')
    print(example['title'])
    print('status', response.status_code)
    print(response.json())
