import requests
from io import BytesIO

base_url = "http://localhost:3004"
upload_endpoint = f"{base_url}/api/upload"
token = "jBMLjRGKADM9vDnSbVzimOsPaaQeldvmIOHnBbyEusbc6BxJHIbW5Dm+AACKsPbDuDKRmLtUSmbRfNduIOe9yg=="
headers = {
    "Authorization": f"Bearer {token}"
}

def test_upload_profile_photo_or_file():
    session = requests.Session()
    session.headers.update(headers)
    timeout = 30

    # Prepare valid image file (PNG)
    valid_file_content = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
        b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
        b"\x00\x00\x00\nIDATx\xdac`\x00\x00\x00\x02\x00\x01"
        b"\xe2!\xbc\x33\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    valid_files = {
        "file": ("profile.png", BytesIO(valid_file_content), "image/png")
    }

    # Prepare invalid file type (text file)
    invalid_file_content = b"This is a plain text file, not allowed for profile photo."
    invalid_files = {
        "file": ("file.txt", BytesIO(invalid_file_content), "text/plain")
    }

    # Test valid file upload
    try:
        response = session.post(upload_endpoint, files=valid_files, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Valid file upload request failed: {e}"
    assert response.status_code == 200, f"Expected status code 200 for valid file, got {response.status_code}"
    # Expect response contains success indication, e.g., json with uploaded file info or success flag
    try:
        resp_json = response.json()
    except Exception:
        assert False, "Response for valid file upload is not valid JSON"
    assert "error" not in resp_json, f"Unexpected error in response: {resp_json.get('error')}"
    assert resp_json.get("success") is True or resp_json.get("url") or resp_json.get("filename"), "Expected success response for file upload"

    # Test invalid file upload
    try:
        response_invalid = session.post(upload_endpoint, files=invalid_files, timeout=timeout)
    except requests.RequestException as e:
        assert False, f"Invalid file upload request failed: {e}"
    # Expect rejection due to file type validation, status code might be 400 or 422
    assert response_invalid.status_code in (400, 422), f"Expected 400 or 422 for invalid file, got {response_invalid.status_code}"
    try:
        resp_json_invalid = response_invalid.json()
    except Exception:
        # Sometimes error responses might not be JSON
        resp_json_invalid = {}
    # Expect error message about invalid file type or validation failure
    error_msgs = ["invalid", "file type", "not allowed", "unsupported"]
    error_found = any(msg in response_invalid.text.lower() for msg in error_msgs) or \
                  any(msg in str(resp_json_invalid).lower() for msg in error_msgs)
    assert error_found, f"Expected error message about invalid file type, got: {response_invalid.text}"

test_upload_profile_photo_or_file()