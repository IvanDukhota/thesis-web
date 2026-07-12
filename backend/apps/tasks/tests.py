from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

REGISTER_URL = '/api/auth/register/'
PROJECTS_URL = '/api/projects/'


def _make_client(email='u@test.com', username='user1', password='Pass1234!'):
    client = APIClient()
    res = client.post(REGISTER_URL, {
        'email': email, 'username': username,
        'password': password, 'password_confirm': password,
    })
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {res.data["access"]}')
    return client


def _tasks_url(project_id):
    return f'{PROJECTS_URL}{project_id}/tasks/'


class TaskCRUDTests(TestCase):
    def setUp(self):
        self.client = _make_client()
        res = self.client.post(PROJECTS_URL, {'name': 'Test Project', 'type': 'solo'})
        self.project_id = res.data['id']
        self.url = _tasks_url(self.project_id)

    def test_create_task(self):
        res = self.client.post(self.url, {'title': 'Fix login bug', 'column': 'To Do'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['title'], 'Fix login bug')
        self.assertEqual(res.data['column'], 'To Do')

    def test_create_task_with_priority_and_tag(self):
        res = self.client.post(self.url, {
            'title': 'Build API',
            'column': 'In Progress',
            'priority': 'high',
            'tag': 'backend',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['priority'], 'high')
        self.assertEqual(res.data['tag'], 'backend')

    def test_list_tasks_returns_all_project_tasks(self):
        self.client.post(self.url, {'title': 'T1', 'column': 'To Do'})
        self.client.post(self.url, {'title': 'T2', 'column': 'In Progress'})
        res = self.client.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)

    def test_update_task_column(self):
        task_id = self.client.post(self.url, {'title': 'T', 'column': 'To Do'}).data['id']
        res = self.client.patch(f'{self.url}{task_id}/', {'column': 'Finished'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['column'], 'Finished')

    def test_update_task_title(self):
        task_id = self.client.post(self.url, {'title': 'Old', 'column': 'To Do'}).data['id']
        res = self.client.patch(f'{self.url}{task_id}/', {'title': 'New'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['title'], 'New')

    def test_delete_task(self):
        task_id = self.client.post(self.url, {'title': 'Del', 'column': 'To Do'}).data['id']
        res = self.client.delete(f'{self.url}{task_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        res = self.client.get(self.url)
        ids = [t['id'] for t in res.data]
        self.assertNotIn(task_id, ids)

    def test_create_task_missing_title_rejected(self):
        res = self.client.post(self.url, {'column': 'To Do'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_column_rejected(self):
        res = self.client.post(self.url, {'title': 'T', 'column': 'Nonexistent'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class TaskPermissionTests(TestCase):
    def setUp(self):
        self.owner = _make_client()
        self.stranger = _make_client(email='s@test.com', username='stranger')
        res = self.owner.post(PROJECTS_URL, {'name': 'P', 'type': 'solo'})
        self.project_id = res.data['id']
        self.url = _tasks_url(self.project_id)

    def test_non_member_cannot_list_tasks(self):
        res = self.stranger.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_member_cannot_create_task(self):
        res = self.stranger.post(self.url, {'title': 'Inject', 'column': 'To Do'})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_member_cannot_update_task(self):
        task_id = self.owner.post(self.url, {'title': 'T', 'column': 'To Do'}).data['id']
        res = self.stranger.patch(f'{self.url}{task_id}/', {'title': 'Hacked'})
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_unauthenticated_cannot_list_tasks(self):
        unauth = APIClient()
        res = unauth.get(self.url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
