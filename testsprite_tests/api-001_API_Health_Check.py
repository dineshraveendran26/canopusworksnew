import requests

BASE_URL = "http://localhost:3000"
TIMEOUT = 30
USERNAME = "dineshraveendran26@gmail.com"
PASSWORD = "Glow.star*1"


def test_api_health_check():
    session = requests.Session()
    endpoints = [
        "/",                    # Landing page
        "/auth/signin",         # Authentication sign in
        "/auth/signup",         # Authentication sign up
        "/api/tasks",           # Task management
        "/api/team-members",    # Team management
        "/api/dashboard/stats"  # Dashboard analytics
    ]
    for endpoint in endpoints:
        url = f"{BASE_URL}{endpoint}"
        try:
            if endpoint == "/auth/signin":
                # Use POST method for sign in endpoint with correct payload
                payload = {"email": USERNAME, "password": PASSWORD}
                response = session.post(url, json=payload, timeout=TIMEOUT)
            elif endpoint == "/auth/signup":
                # Use POST method for sign up endpoint with required full_name field
                payload = {"email": USERNAME, "password": PASSWORD, "full_name": "Test User"}
                response = session.post(url, json=payload, timeout=TIMEOUT)
            else:
                # Use GET method for other endpoints
                response = session.get(url, timeout=TIMEOUT)

            assert response.status_code in (200, 400, 401, 403), f"Unexpected status code {response.status_code} for {endpoint}"
            # Basic check for response content-type header existence as a sign of valid response
            assert "content-type" in response.headers, f"No content-type header in response from {endpoint}"
        except requests.RequestException as e:
            assert False, f"Request to {endpoint} failed: {e}"


test_api_health_check()