import requests

def test_create_user_profile_with_approval_workflow():
    base_url = "http://localhost:3004"
    endpoint = "/api/create-user-profile"
    url = base_url + endpoint
    token = "jBMLjRGKADM9vDnSbVzimOsPaaQeldvmIOHnBbyEusbc6BxJHIbW5Dm+AACKsPbDuDKRmLtUSmbRfNduIOe9yg=="
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "firstName": "Test",
        "lastName": "User",
        "email": "test.user@example.com",
        "phone": "+1234567890",
        "title": "Engineer",
        "department": "Manufacturing",
        "initials": "TU"
    }
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 201 or response.status_code == 200, f"Unexpected status code: {response.status_code}, response: {response.text}"
        data = response.json()
        # Validate returned data contains expected fields and matches input where applicable
        for field in ["firstName", "lastName", "email", "phone", "title", "department", "initials"]:
            assert field in data, f"Missing field '{field}' in response"
            assert data[field] == payload[field], f"Field '{field}' mismatch: expected {payload[field]}, got {data[field]}"
        # Validate presence of approval workflow indicators if any (assuming a field 'approvalStatus')
        assert "approvalStatus" in data, "Missing 'approvalStatus' in response indicating workflow trigger"
        assert data["approvalStatus"] in ["pending", "awaiting_admin_approval"], f"Unexpected approvalStatus: {data['approvalStatus']}"
        # Since notifications are internal, we assume if approvalStatus is set, workflow and notification triggered
    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

test_create_user_profile_with_approval_workflow()