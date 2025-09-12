import requests

BASE_URL = "http://localhost:3004"
AUTH_TOKEN = "jBMLjRGKADM9vDnSbVzimOsPaaQeldvmIOHnBbyEusbc6BxJHIbW5Dm+AACKsPbDuDKRmLtUSmbRfNduIOe9yg=="
HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json",
}

def test_get_comments_for_task():
    timeout = 30
    task_id = None
    created_task_id = None

    # Helper function to create a task
    def create_task():
        url = f"{BASE_URL}/api/tasks"
        payload = {
            "title": "Test Task for Comments",
            "description": "Task created for testing comments retrieval.",
            "status": "todo"
        }
        try:
            response = requests.post(url, json=payload, headers=HEADERS, timeout=timeout)
            response.raise_for_status()
            data = response.json()
            # Expecting task ID in response (adjust key if needed)
            return data.get("id") or data.get("taskId") or data.get("task_id")
        except Exception as e:
            raise RuntimeError(f"Failed to create task: {e}")

    # Helper function to add a comment to a task
    def add_comment(task_id):
        url = f"{BASE_URL}/api/comments"
        comment_payload = {
            "taskId": task_id,
            "content": "This is a test comment."
        }
        try:
            resp = requests.post(url, json=comment_payload, headers=HEADERS, timeout=timeout)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            raise RuntimeError(f"Failed to add comment: {e}")

    # Helper function to delete a task
    def delete_task(task_id):
        url = f"{BASE_URL}/api/tasks/{task_id}"
        try:
            resp = requests.delete(url, headers=HEADERS, timeout=timeout)
            # Accept 200 OK or 204 No Content as successful deletion
            if resp.status_code not in (200, 204):
                raise RuntimeError(f"Unexpected status code on delete: {resp.status_code}")
        except Exception as e:
            # Log but do not fail test on cleanup
            print(f"Warning: Failed to delete task {task_id}: {e}")

    try:
        # Create a new task to associate comments with
        created_task_id = create_task()
        assert created_task_id is not None, "Failed to obtain task ID for created task."

        # Add a comment to this task
        add_comment(created_task_id)

        # Now test the GET /api/comments for this task
        url = f"{BASE_URL}/api/comments"
        params = {"taskId": created_task_id}
        response = requests.get(url, headers=HEADERS, params=params, timeout=timeout)
        response.raise_for_status()

        comments = response.json()
        assert isinstance(comments, list), f"Expected list of comments, got {type(comments)}"

        # Validate that at least one comment belongs to the task
        assert any(
            ("taskId" in comment and (str(comment["taskId"]) == str(created_task_id))) or
            ("task_id" in comment and (str(comment["task_id"]) == str(created_task_id)))
            for comment in comments
        ), "No comments found for the specified task ID."

    finally:
        if created_task_id:
            delete_task(created_task_id)

test_get_comments_for_task()