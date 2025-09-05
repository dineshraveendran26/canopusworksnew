import requests
import uuid

BASE_URL = "http://localhost:3004"
ASSIGN_TASK_ENDPOINT = "/api/assign-task"
TASKS_ENDPOINT = "/api/tasks"

AUTH_TOKEN = "jBMLjRGKADM9vDnSbVzimOsPaaQeldvmIOHnBbyEusbc6BxJHIbW5Dm+AACKsPbDuDKRmLtUSmbRfNduIOe9yg=="
HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json",
}

def test_assign_users_to_tasks():
    """
    Test the /api/assign-task POST endpoint to ensure multiple users can be assigned to tasks,
    including subtasks and team member management.
    Steps:
    - Create a new main task.
    - Create subtasks for that main task.
    - Assign multiple users to the main task and subtasks via /api/assign-task.
    - Verify response success.
    - Cleanup created tasks.
    """
    created_task_ids = []
    created_subtask_ids = []
    try:
        # Step 1: Create main task
        main_task_payload = {
            "title": f"Integration Test Task {str(uuid.uuid4())[:8]}",
            "description": "Main task for user assignment testing",
            "priority": "Medium",
            "status": "To Do",
            "department": "Manufacturing"
        }
        resp_main = requests.post(
            f"{BASE_URL}{TASKS_ENDPOINT}",
            json=main_task_payload,
            headers=HEADERS,
            timeout=30
        )
        assert resp_main.status_code == 201 or resp_main.status_code == 200, f"Failed to create main task: {resp_main.text}"
        main_task = resp_main.json()
        main_task_id = main_task.get("id")
        assert main_task_id, "Main task creation response missing 'id'"
        created_task_ids.append(main_task_id)

        # Step 2: Create subtasks (simulate subtasks by creating tasks with parent reference if supported)
        # Assuming subtask creation is done by POST /api/tasks with parentTaskId or similar
        subtask_payload = {
            "title": f"Subtask 1 for {main_task_id}",
            "description": "First subtask for user assignment testing",
            "priority": "Low",
            "status": "To Do",
            "department": "Manufacturing",
            "parentTaskId": main_task_id
        }
        resp_sub1 = requests.post(
            f"{BASE_URL}{TASKS_ENDPOINT}",
            json=subtask_payload,
            headers=HEADERS,
            timeout=30
        )
        assert resp_sub1.status_code == 201 or resp_sub1.status_code == 200, f"Failed to create subtask 1: {resp_sub1.text}"
        subtask1 = resp_sub1.json()
        subtask1_id = subtask1.get("id")
        assert subtask1_id, "Subtask 1 creation response missing 'id'"
        created_subtask_ids.append(subtask1_id)

        subtask_payload_2 = {
            "title": f"Subtask 2 for {main_task_id}",
            "description": "Second subtask for user assignment testing",
            "priority": "Low",
            "status": "To Do",
            "department": "Manufacturing",
            "parentTaskId": main_task_id
        }
        resp_sub2 = requests.post(
            f"{BASE_URL}{TASKS_ENDPOINT}",
            json=subtask_payload_2,
            headers=HEADERS,
            timeout=30
        )
        assert resp_sub2.status_code == 201 or resp_sub2.status_code == 200, f"Failed to create subtask 2: {resp_sub2.text}"
        subtask2 = resp_sub2.json()
        subtask2_id = subtask2.get("id")
        assert subtask2_id, "Subtask 2 creation response missing 'id'"
        created_subtask_ids.append(subtask2_id)

        # Step 3: Assign multiple users to main task and subtasks using /api/assign-task
        # Sample payload structure (assuming):
        # {
        #   "taskId": str,
        #   "userIds": [str]
        # }
        # For team member management and subtasks include assignments separately or combined.
        # We'll perform three assignments:
        # - Assign users to main task
        # - Assign users to subtask 1
        # - Assign users to subtask 2

        user_ids_main_task = ["user-uuid-1", "user-uuid-2"]   # Example user IDs; replace with realistic IDs if known.
        user_ids_subtask1 = ["user-uuid-3"]
        user_ids_subtask2 = ["user-uuid-4", "user-uuid-5"]

        # Assign users to main task
        assign_main_payload = {
            "taskId": main_task_id,
            "userIds": user_ids_main_task
        }
        resp_assign_main = requests.post(
            f"{BASE_URL}{ASSIGN_TASK_ENDPOINT}",
            json=assign_main_payload,
            headers=HEADERS,
            timeout=30
        )
        assert resp_assign_main.status_code == 200, f"Failed to assign users to main task: {resp_assign_main.text}"
        assign_main_resp = resp_assign_main.json()
        assert assign_main_resp.get("success") is True or assign_main_resp.get("assignedUsers"), "Main task user assignment unsuccessful"

        # Assign users to subtask 1
        assign_sub1_payload = {
            "taskId": subtask1_id,
            "userIds": user_ids_subtask1
        }
        resp_assign_sub1 = requests.post(
            f"{BASE_URL}{ASSIGN_TASK_ENDPOINT}",
            json=assign_sub1_payload,
            headers=HEADERS,
            timeout=30
        )
        assert resp_assign_sub1.status_code == 200, f"Failed to assign users to subtask 1: {resp_assign_sub1.text}"
        assign_sub1_resp = resp_assign_sub1.json()
        assert assign_sub1_resp.get("success") is True or assign_sub1_resp.get("assignedUsers"), "Subtask 1 user assignment unsuccessful"

        # Assign users to subtask 2
        assign_sub2_payload = {
            "taskId": subtask2_id,
            "userIds": user_ids_subtask2
        }
        resp_assign_sub2 = requests.post(
            f"{BASE_URL}{ASSIGN_TASK_ENDPOINT}",
            json=assign_sub2_payload,
            headers=HEADERS,
            timeout=30
        )
        assert resp_assign_sub2.status_code == 200, f"Failed to assign users to subtask 2: {resp_assign_sub2.text}"
        assign_sub2_resp = resp_assign_sub2.json()
        assert assign_sub2_resp.get("success") is True or assign_sub2_resp.get("assignedUsers"), "Subtask 2 user assignment unsuccessful"

    finally:
        # Cleanup tasks and subtasks created to maintain test environment
        delete_headers = HEADERS.copy()
        try:
            for subtask_id in created_subtask_ids:
                resp_del_sub = requests.delete(
                    f"{BASE_URL}{TASKS_ENDPOINT}/{subtask_id}",
                    headers=delete_headers,
                    timeout=30
                )
                # Accept 200 or 204 for successful deletion; log if failure
                assert resp_del_sub.status_code in (200, 204), f"Failed to delete subtask {subtask_id}: {resp_del_sub.text}"
        except Exception as e:
            print(f"Error deleting subtasks: {e}")

        try:
            for task_id in created_task_ids:
                resp_del_task = requests.delete(
                    f"{BASE_URL}{TASKS_ENDPOINT}/{task_id}",
                    headers=delete_headers,
                    timeout=30
                )
                assert resp_del_task.status_code in (200, 204), f"Failed to delete task {task_id}: {resp_del_task.text}"
        except Exception as e:
            print(f"Error deleting tasks: {e}")

test_assign_users_to_tasks()