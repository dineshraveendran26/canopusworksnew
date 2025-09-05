import requests

BASE_URL = "http://localhost:3004"
DASHBOARD_ENDPOINT = "/api/dashboard"
AUTH_TOKEN = "jBMLjRGKADM9vDnSbVzimOsPaaQeldvmIOHnBbyEusbc6BxJHIbW5Dm+AACKsPbDuDKRmLtUSmbRfNduIOe9yg=="
HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Accept": "application/json"
}

def test_get_dashboard_statistics():
    try:
        response = requests.get(
            BASE_URL + DASHBOARD_ENDPOINT,
            headers=HEADERS,
            timeout=30
        )
        # Validate HTTP status code
        assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

        # Validate Content-Type header
        content_type = response.headers.get("Content-Type", "")
        assert "application/json" in content_type, f"Expected JSON response, got {content_type}"

        data = response.json()
        # Validate expected keys existence in response
        expected_keys = ["taskStatistics", "userActivity"]
        for key in expected_keys:
            assert key in data, f"Response JSON missing key: {key}"

        # Check taskStatistics structure
        task_stats = data.get("taskStatistics")
        assert isinstance(task_stats, dict), "taskStatistics should be a dictionary"
        assert "totalTasks" in task_stats and isinstance(task_stats["totalTasks"], int), "totalTasks missing or not int"
        assert "completedTasks" in task_stats and isinstance(task_stats["completedTasks"], int), "completedTasks missing or not int"
        assert "pendingTasks" in task_stats and isinstance(task_stats["pendingTasks"], int), "pendingTasks missing or not int"

        # Check userActivity structure
        user_activity = data.get("userActivity")
        assert isinstance(user_activity, dict), "userActivity should be a dictionary"
        assert "activeUsers" in user_activity and isinstance(user_activity["activeUsers"], int), "activeUsers missing or not int"
        assert "newUsers" in user_activity and isinstance(user_activity["newUsers"], int), "newUsers missing or not int"

    except requests.RequestException as e:
        assert False, f"Request to {DASHBOARD_ENDPOINT} failed: {str(e)}"
    except ValueError:
        assert False, "Response is not valid JSON"

test_get_dashboard_statistics()
