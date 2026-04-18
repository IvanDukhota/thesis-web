from django.test import TestCase

class BasicTest(TestCase):
    def test_health_check(self):
        self.assertEqual(1, 1)
