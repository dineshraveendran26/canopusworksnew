import requests

def test_supabase_connection():
    base_url = "http://localhost:3000"
    timeout = 30

    # Attempt to authenticate by hitting the signin endpoint with correct credentials
    signin_url = f"{base_url}/auth/signin"
    payload = {
        "email": "dineshraveendran26@gmail.com",
        "password": "Glow.star*1"
    }
    headers = {
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(signin_url, json=payload, headers=headers, timeout=timeout)
        # Validate response status code is 200 OK or 201 Created
        assert response.status_code in [200, 201], f"Expected status code 200 or 201 but got {response.status_code}"

        # Validate response contains expected keys or token to indicate successful connection
        json_response = response.json()
        assert "access_token" in json_response or "token" in json_response or "user" in json_response, \
            "Authentication response does not contain expected authentication token or user info"

    except requests.exceptions.RequestException as e:
        assert False, f"Request to Supabase signin endpoint failed with exception: {e}"


test_supabase_connection()