import requests

BASE_URL = "http://localhost:3004"
TOKEN = "jBMLjRGKADM9vDnSbVzimOsPaaQeldvmIOHnBbyEusbc6BxJHIbW5Dm+AACKsPbDuDKRmLtUSmbRfNduIOe9yg=="
TIMEOUT = 30

def test_get_all_tasks_for_kanban_board():
    url = f"{BASE_URL}/api/tasks"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/json"
    }
    try:
        response = requests.get(url, headers=headers, timeout=TIMEOUT)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        assert False, f"Request to GET /api/tasks failed: {e}"

    # Validate response status code
    assert response.status_code == 200, f"Expected status code 200, got {response.status_code}"

    # Validate content-type header
    content_type = response.headers.get("Content-Type", "")
    assert "application/json" in content_type, f"Expected 'application/json' in Content-Type, got '{content_type}'"

    # Validate response body is a list (tasks array)
    try:
        tasks = response.json()
    except ValueError as e:
        assert False, f"Response body is not valid JSON: {e}"

    assert isinstance(tasks, list), f"Expected response to be a list of tasks, got {type(tasks)}"

    # Further validation (basic) on each task item to ensure structure for Kanban board
    # Typical fields in Kanban tasks might include id, title, status, assignees, etc.
    if tasks:
        sample_task = tasks[0]
        assert isinstance(sample_task, dict), f"Each task should be a dict, got {type(sample_task)}"
        # Check for common expected fields in a task for Kanban board display
        expected_keys = {"id", "title", "status", "assignees"}
        missing_keys = expected_keys - sample_task.keys()
        assert not missing_keys, f"Task missing expected keys: {missing_keys}"

test_get_all_tasks_for_kanban_board()