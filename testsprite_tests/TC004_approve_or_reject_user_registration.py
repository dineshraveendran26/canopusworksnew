import requests

BASE_URL = "http://localhost:3004"
API_PATH = "/api/approve-user"
TOKEN = "jBMLjRGKADM9vDnSbVzimOsPaaQeldvmIOHnBbyEusbc6BxJHIbW5Dm+AACKsPbDuDKRmLtUSmbRfNduIOe9yg=="
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}
TIMEOUT = 30

def test_approve_or_reject_user_registration():
    # Assume an example user registration approval payload
    # Typically includes userId and action (approve/reject) and maybe comment/notes
    # Since schema is not provided, we define a typical payload
    payload_approve = {
        "userId": "test-user-id-approve",
        "action": "approve"
    }
    payload_reject = {
        "userId": "test-user-id-reject",
        "action": "reject",
        "reason": "Insufficient information provided"
    }

    # Test Approve case
    try:
        response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=payload_approve,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        assert False, f"HTTP request failed during approve test: {e}"
    assert response.status_code == 200, f"Expected 200 OK for approve, got {response.status_code}"
    json_response = response.json()
    assert "success" in json_response and json_response["success"] is True, \
        f"Approve response missing success true: {json_response}"
    # Optionally check for notification sent flag or message
    assert "message" in json_response and isinstance(json_response["message"], str), \
        f"Approve response missing message: {json_response}"

    # Test Reject case
    try:
        response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=payload_reject,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        assert False, f"HTTP request failed during reject test: {e}"
    assert response.status_code == 200, f"Expected 200 OK for reject, got {response.status_code}"
    json_response = response.json()
    assert "success" in json_response and json_response["success"] is True, \
        f"Reject response missing success true: {json_response}"
    assert "message" in json_response and isinstance(json_response["message"], str), \
        f"Reject response missing message: {json_response}"

    # Test error handling: invalid action
    payload_invalid = {
        "userId": "test-user-id-invalid",
        "action": "invalid_action_value"
    }
    try:
        response = requests.post(
            f"{BASE_URL}{API_PATH}",
            json=payload_invalid,
            headers=HEADERS,
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        assert False, f"HTTP request failed during invalid action test: {e}"
    assert response.status_code in (400, 422), f"Expected 400 or 422 for invalid action, got {response.status_code}"
    json_response = response.json()
    assert "error" in json_response or "message" in json_response, \
        f"Invalid action response missing error message: {json_response}"

test_approve_or_reject_user_registration()