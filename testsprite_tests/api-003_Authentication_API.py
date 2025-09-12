import requests

BASE_URL = "http://localhost:3000"
AUTH_USERNAME = "dineshraveendran26@gmail.com"
AUTH_PASSWORD = "Glow.star*1"
TIMEOUT = 30

def test_authentication_api():
    signin_url = f"{BASE_URL}/auth/signin"
    signup_url = f"{BASE_URL}/auth/signup"

    # Test sign up (to ensure the user exists, ignore if user already exists)
    signup_payload = {
        "email": AUTH_USERNAME,
        "password": AUTH_PASSWORD,
        "full_name": "Dinesh Raveendran"
    }
    try:
        signup_resp = requests.post(signup_url, json=signup_payload, timeout=TIMEOUT)
        assert signup_resp.status_code in (200, 201), f"Signup failed with status {signup_resp.status_code} and response: {signup_resp.text}"
    except requests.RequestException as e:
        assert False, f"Signup request failed: {e}"

    # Test sign in with correct credentials
    signin_payload = {
        "email": AUTH_USERNAME,
        "password": AUTH_PASSWORD
    }
    try:
        signin_resp = requests.post(signin_url, json=signin_payload, timeout=TIMEOUT)
        assert signin_resp.status_code == 200, f"Signin failed with status {signin_resp.status_code}"
    except requests.RequestException as e:
        assert False, f"Signin request failed: {e}"
    except ValueError:
        assert False, "Signin response is not valid JSON"

    # Test sign in with wrong password returns error
    wrong_password_payload = {
        "email": AUTH_USERNAME,
        "password": "WrongPassword123!"
    }
    try:
        wrong_resp = requests.post(signin_url, json=wrong_password_payload, timeout=TIMEOUT)
        assert wrong_resp.status_code in (401, 403), f"Unexpected status code for wrong password: {wrong_resp.status_code}"
    except requests.RequestException as e:
        assert False, f"Signin with wrong password request failed: {e}"

test_authentication_api()
