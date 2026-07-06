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


class ProjectCreateTests(TestCase):
    def setUp(self):
        self.client = _make_client()

    def test_create_solo_project(self):
        res = self.client.post(PROJECTS_URL, {'name': 'My Project', 'type': 'solo'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name'], 'My Project')
        self.assertEqual(res.data['type'], 'solo')

    def test_created_project_has_owner_and_developer_roles(self):
        res = self.client.post(PROJECTS_URL, {'name': 'P', 'type': 'solo'})
        pk = res.data['id']
        roles_res = self.client.get(f'{PROJECTS_URL}{pk}/roles/')
        self.assertEqual(roles_res.status_code, status.HTTP_200_OK)
        role_names = {r['name'] for r in roles_res.data}
        self.assertIn('Owner', role_names)
        self.assertIn('Developer', role_names)

    def test_creator_is_automatically_owner_member(self):
        res = self.client.post(PROJECTS_URL, {'name': 'P', 'type': 'solo'})
        pk = res.data['id']
        members_res = self.client.get(f'{PROJECTS_URL}{pk}/members/')
        self.assertEqual(members_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(members_res.data), 1)
        self.assertTrue(members_res.data[0]['role']['is_owner'])

    def test_project_list_returns_only_own_projects(self):
        self.client.post(PROJECTS_URL, {'name': 'Mine', 'type': 'solo'})
        other = _make_client(email='other@test.com', username='other1')
        other.post(PROJECTS_URL, {'name': 'Theirs', 'type': 'solo'})

        res = self.client.get(PROJECTS_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        names = [p['name'] for p in res.data]
        self.assertIn('Mine', names)
        self.assertNotIn('Theirs', names)

    def test_empty_name_rejected(self):
        res = self.client.post(PROJECTS_URL, {'name': '', 'type': 'solo'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ProjectPermissionTests(TestCase):
    def setUp(self):
        self.owner = _make_client()
        self.stranger = _make_client(email='s@test.com', username='stranger')
        res = self.owner.post(PROJECTS_URL, {'name': 'Secret', 'type': 'solo'})
        self.project_id = res.data['id']

    def test_non_member_get_returns_403(self):
        res = self.stranger.get(f'{PROJECTS_URL}{self.project_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_member_delete_returns_403_or_404(self):
        res = self.stranger.delete(f'{PROJECTS_URL}{self.project_id}/')
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    def test_non_member_cannot_list_roles(self):
        res = self.stranger.get(f'{PROJECTS_URL}{self.project_id}/roles/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_project(self):
        res = self.owner.delete(f'{PROJECTS_URL}{self.project_id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        # Confirm it's gone
        res = self.owner.get(f'{PROJECTS_URL}{self.project_id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_request_returns_401(self):
        unauth = APIClient()
        res = unauth.get(PROJECTS_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_can_create_custom_role(self):
        res = self.owner.post(
            f'{PROJECTS_URL}{self.project_id}/roles/',
            {'name': 'Reviewer', 'can_view': True, 'can_edit': False},
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['name'], 'Reviewer')

    def test_non_member_cannot_create_role(self):
        res = self.stranger.post(
            f'{PROJECTS_URL}{self.project_id}/roles/',
            {'name': 'Hacker', 'can_view': True},
        )
        self.assertIn(res.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
