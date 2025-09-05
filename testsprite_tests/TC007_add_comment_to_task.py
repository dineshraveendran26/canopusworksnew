import requests
import uuid
import time

BASE_URL = "http://localhost:3004"
AUTH_TOKEN = "jBMLjRGKADM9vDnSbVzimOsPaaQeldvmIOHnBbyEusbc6BxJHIbW5Dm+AACKsPbDuDKRmLtUSmbRfNduIOe9yg=="
HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}
TIMEOUT = 30


def test_add_comment_to_task():
    created_task_id = None
    created_comment_id = None

    # Helper to create a new task to comment on
    def create_task():
        url = f"{BASE_URL}/api/tasks"
        task_payload = {
            "title": f"Test Task for Comment {str(uuid.uuid4())[:8]}",
            "description": "Task created for testing comments",
            "status": "todo"
        }
        resp = requests.post(url, json=task_payload, headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code == 201 or resp.status_code == 200, f"Failed to create task: {resp.status_code} {resp.text}"
        task_data = resp.json()
        assert "id" in task_data, "Response JSON missing task id"
        return task_data["id"]

    # Helper to delete created task
    def delete_task(task_id):
        url = f"{BASE_URL}/api/tasks/{task_id}"
        resp = requests.delete(url, headers=HEADERS, timeout=TIMEOUT)
        assert resp.status_code in [200, 204], f"Failed to delete task: {resp.status_code} {resp.text}"

    # Helper to post a comment to a task
    def add_comment(task_id, content):
        url = f"{BASE_URL}/api/comments"
        comment_payload = {
            "taskId": task_id,
            "content": content
        }
        resp = requests.post(url, json=comment_payload, headers=HEADERS, timeout=TIMEOUT)
        return resp

    # Helper to get comments for a task
    def get_comments(task_id):
        url = f"{BASE_URL}/api/comments"
        params = {"taskId": task_id}
        resp = requests.get(url, headers=HEADERS, params=params, timeout=TIMEOUT)
        return resp

    try:
        # 1. Create a task to comment on
        created_task_id = create_task()

        # 2. Add a comment
        comment_text = f"Test comment added at {time.time()}"
        resp = add_comment(created_task_id, comment_text)
        assert resp.status_code == 201 or resp.status_code == 200, f"Comment POST failed: {resp.status_code} {resp.text}"
        comment_data = resp.json()
        assert "id" in comment_data, "Response JSON missing comment id after adding comment"
        created_comment_id = comment_data["id"]
        assert comment_data.get("content") == comment_text, "Comment content mismatch in response"
        assert comment_data.get("taskId") == created_task_id, "Comment taskId mismatch in response"

        # 3. Verify comment is returned in GET comments for the task (real-time update simulation)
        resp = get_comments(created_task_id)
        assert resp.status_code == 200, f"Failed to get comments: {resp.status_code} {resp.text}"
        comments = resp.json()
        assert isinstance(comments, list), "Comments response is not a list"
        # Check our comment is among the returned comments
        matching_comments = [c for c in comments if c.get("id") == created_comment_id and c.get("content") == comment_text]
        assert len(matching_comments) == 1, "Added comment not found in GET response"

    finally:
        # Cleanup: delete the created task to avoid clutter
        if created_task_id:
            try:
                delete_task(created_task_id)
            except Exception as e:
                print(f"Cleanup failed: could not delete task {created_task_id}. Error: {e}")


test_add_comment_to_task()