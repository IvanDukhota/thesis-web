from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

REGISTER_URL = '/api/auth/register/'
LOGIN_URL    = '/api/auth/login/'
ME_URL       = '/api/auth/me/'


def _register(client, email='alice@test.com', username='alice', password='Pass1234!'):
    return client.post(REGISTER_URL, {
        'email': email,
        'username': username,
        'password': password,
        'password_confirm': password,
    })


class RegisterTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_success_returns_tokens_and_user(self):
        res = _register(self.client)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertEqual(res.data['user']['email'], 'alice@test.com')
        self.assertEqual(res.data['user']['username'], 'alice')

    def test_duplicate_email_rejected(self):
        _register(self.client)
        res = _register(self.client, username='bob')  # same email, different username
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_username_rejected(self):
        _register(self.client)
        res = _register(self.client, email='bob@test.com')  # different email, same username
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_mismatch_rejected(self):
        res = self.client.post(REGISTER_URL, {
            'email': 'x@test.com',
            'username': 'xuser',
            'password': 'Pass1234!',
            'password_confirm': 'Different!',
        })
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_fields_rejected(self):
        res = self.client.post(REGISTER_URL, {'email': 'y@test.com'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        _register(self.client)
        self.client.credentials()  # clear auth header

    def test_correct_credentials_return_tokens(self):
        res = self.client.post(LOGIN_URL, {'email': 'alice@test.com', 'password': 'Pass1234!'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

    def test_wrong_password_rejected(self):
        res = self.client.post(LOGIN_URL, {'email': 'alice@test.com', 'password': 'wrong'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_nonexistent_user_rejected(self):
        res = self.client.post(LOGIN_URL, {'email': 'ghost@test.com', 'password': 'Pass1234!'})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)


class MeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        res = _register(self.client)
        self.token = res.data['access']

    def test_authenticated_returns_user_data(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.get(ME_URL)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['email'], 'alice@test.com')
        self.assertEqual(res.data['username'], 'alice')

    def test_unauthenticated_returns_401(self):
        res = self.client.get(ME_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_language(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        res = self.client.patch(ME_URL, {'language': 'ru'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['language'], 'ru')

    def test_invalid_token_returns_401(self):
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalidtoken')
        res = self.client.get(ME_URL)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
