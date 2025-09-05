import requests

BASE_URL = "http://localhost:3004"
AUTH_TOKEN = "jBMLjRGKADM9vDnSbVzimOsPaaQeldvmIOHnBbyEusbc6BxJHIbW5Dm+AACKsPbDuDKRmLtUSmbRfNduIOe9yg=="
HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}
TIMEOUT = 30

def test_create_new_task():
    task_payload = {
        "title": "Test Task from TC003",
        "description": "This is a test task created during automated testing of the /api/tasks POST endpoint.",
        "status": "To Do",
        "priority": "Medium",
        "dueDate": None,
        "assignees": [],
        "labels": []
    }

    task_id = None
    try:
        # Create a new task
        response = requests.post(f"{BASE_URL}/api/tasks", json=task_payload, headers=HEADERS, timeout=TIMEOUT)
        assert response.status_code == 201, f"Expected status code 201, got {response.status_code}"
        response_json = response.json()
        assert "id" in response_json, "Response JSON does not contain 'id' field for created task"
        task_id = response_json["id"]

        # Validate the created task fields
        assert response_json.get("title") == task_payload["title"], "Title mismatch in created task"
        assert response_json.get("description") == task_payload["description"], "Description mismatch in created task"
        assert response_json.get("status") == task_payload["status"], "Status mismatch in created task"
        assert response_json.get("priority") == task_payload["priority"], "Priority mismatch in created task"
        assert isinstance(task_id, (int, str)), "Task ID is not int or str"

        # Verify the task appears in the Kanban board (GET /api/tasks)
        get_response = requests.get(f"{BASE_URL}/api/tasks", headers=HEADERS, timeout=TIMEOUT)
        assert get_response.status_code == 200, f"Expected status code 200, got {get_response.status_code}"
        tasks = get_response.json()
        assert isinstance(tasks, list), "GET /api/tasks did not return a list"
        found_task = any(str(task.get("id")) == str(task_id) for task in tasks)
        assert found_task, "Created task not found in Kanban board task list"

    finally:
        # Clean up: delete the created task if possible
        if task_id is not None:
            try:
                del_resp = requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=HEADERS, timeout=TIMEOUT)
                # Accept 200 or 204 as successful deletion
                assert del_resp.status_code in [200, 204], f"Failed to delete task with id {task_id}, status code: {del_resp.status_code}"
            except Exception:
                pass

test_create_new_task()