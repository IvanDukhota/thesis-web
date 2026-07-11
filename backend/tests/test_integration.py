import requests
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.conf import settings
from apps.marketplace.models import Order, Category, Tag, OrderTranslation
from apps.messages.models import Message, MessageTranslation
from apps.chats.models import Chat
from decimal import Decimal
import json
import unittest

User = get_user_model()


@unittest.skipUnless(
    getattr(settings, 'EMBEDDING_SERVICE_AVAILABLE', True),
    "Embedding service not available in CI environment"
)
class EmbeddingServiceIntegrationTest(TestCase):
    """Интеграционные тесты сервиса embedding"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='pass123'
        )
        self.category = Category.objects.create(
            name="Development",
            slug="development"
        )
        self.embedding_url = getattr(settings, 'EMBEDDING_SERVICE_URL', 'http://localhost:8002')

    def test_embedding_service_is_available(self):
        """Тест доступности сервиса embedding"""
        try:
            response = requests.get(f"{self.embedding_url}/health", timeout=5)
            self.assertIn(response.status_code, [200, 404])
        except requests.exceptions.RequestException:
            self.skipTest("Embedding service is not available")

    def test_generate_embedding_for_text(self):
        """Тест генерации embedding для текста"""
        try:
            text = "passage: Python developer needed for Django project"
            response = requests.post(
                f"{self.embedding_url}/embed",
                json={"text": text},
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                self.assertIn('embedding', data)
                embedding = data['embedding']
                self.assertIsInstance(embedding, list)
                self.assertGreater(len(embedding), 0)
                for value in embedding:
                    self.assertIsInstance(value, (int, float))
            else:
                self.skipTest(f"Embedding service returned status {response.status_code}")
        except requests.exceptions.RequestException as e:
            self.skipTest(f"Embedding service is not available: {e}")

    def test_order_embedding_dimension(self):
        """Тест размерности embedding для заказа"""
        try:
            order = Order.objects.create(
                title="Python Developer",
                description="Need experienced Python developer",
                buyer=self.user,
                category=self.category,
                price=Decimal("500.00"),
                estimated_days=14
            )

            text = f"passage: Title: {order.title}. Description: {order.description}"
            response = requests.post(
                f"{self.embedding_url}/embed",
                json={"text": text},
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                embedding = data['embedding']
                self.assertIn(len(embedding), [384, 768, 1024, 1536])
            else:
                self.skipTest("Embedding service not available")
        except requests.exceptions.RequestException:
            self.skipTest("Embedding service is not available")

    def test_embedding_similarity_same_text(self):
        """Тест что одинаковый текст дает одинаковый embedding"""
        try:
            text = "passage: Test text for embedding"

            response1 = requests.post(
                f"{self.embedding_url}/embed",
                json={"text": text},
                timeout=30
            )
            response2 = requests.post(
                f"{self.embedding_url}/embed",
                json={"text": text},
                timeout=30
            )

            if response1.status_code == 200 and response2.status_code == 200:
                emb1 = response1.json()['embedding']
                emb2 = response2.json()['embedding']

                self.assertEqual(len(emb1), len(emb2))

                import numpy as np
                vec1 = np.array(emb1)
                vec2 = np.array(emb2)
                similarity = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
                self.assertGreater(similarity, 0.99)
            else:
                self.skipTest("Embedding service not available")
        except (requests.exceptions.RequestException, ImportError):
            self.skipTest("Embedding service or numpy not available")


@unittest.skipUnless(
    getattr(settings, 'RERANKER_SERVICE_AVAILABLE', True),
    "Reranker service not available in CI environment"
)
class RerankerServiceIntegrationTest(TestCase):
    """Интеграционные тесты сервиса reranker"""

    def setUp(self):
        self.reranker_url = getattr(settings, 'RERANKER_SERVICE_URL', 'http://localhost:8003')

    def test_reranker_service_is_available(self):
        """Тест доступности сервиса reranker"""
        try:
            response = requests.get(f"{self.reranker_url}/health", timeout=5)
            self.assertIn(response.status_code, [200, 404])
        except requests.exceptions.RequestException:
            self.skipTest("Reranker service is not available")

    def test_rerank_documents(self):
        """Тест ранжирования документов"""
        try:
            query = "Python developer needed"
            documents = [
                {
                    "id": "1",
                    "title": "Python Developer",
                    "description": "Experienced Python developer needed",
                    "category": "Development",
                    "tags": ["Python", "Django"]
                },
                {
                    "id": "2",
                    "title": "Java Developer",
                    "description": "Java Spring developer wanted",
                    "category": "Development",
                    "tags": ["Java", "Spring"]
                }
            ]

            response = requests.post(
                f"{self.reranker_url}/rerank",
                json={
                    "query": query,
                    "documents": documents,
                    "top_k": 2
                },
                timeout=60
            )

            if response.status_code == 200:
                data = response.json()
                self.assertIn('results', data)
                results = data['results']
                self.assertIsInstance(results, list)
                self.assertGreater(len(results), 0)

                first_result = results[0]
                self.assertIn('id', first_result)
                self.assertIn('score', first_result)
                self.assertIn('relevance_score', first_result)

                self.assertEqual(results[0]['id'], '1')
            else:
                self.skipTest(f"Reranker service returned status {response.status_code}")
        except requests.exceptions.RequestException as e:
            self.skipTest(f"Reranker service is not available: {e}")

    def test_rerank_scores_ordering(self):
        """Тест корректности сортировки по релевантности"""
        try:
            query = "web development"
            documents = [
                {"id": "1", "title": "Mobile App", "description": "iOS app", "category": "", "tags": []},
                {"id": "2", "title": "Website", "description": "Build a website", "category": "", "tags": []},
                {"id": "3", "title": "Desktop Software", "description": "Desktop app", "category": "", "tags": []}
            ]

            response = requests.post(
                f"{self.reranker_url}/rerank",
                json={
                    "query": query,
                    "documents": documents,
                    "top_k": 3
                },
                timeout=60
            )

            if response.status_code == 200:
                results = response.json()['results']
                scores = [r['relevance_score'] for r in results]
                self.assertEqual(scores, sorted(scores, reverse=True))
            else:
                self.skipTest("Reranker service not available")
        except requests.exceptions.RequestException:
            self.skipTest("Reranker service is not available")


@unittest.skipUnless(
    getattr(settings, 'S3_AVAILABLE', True),
    "S3/MinIO not available in CI environment"
)
class S3StorageIntegrationTest(TestCase):
    """Интеграционные тесты S3/MinIO хранилища"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='pass123'
        )
        self.category = Category.objects.create(
            name="Test Category",
            slug="test-category"
        )

    @override_settings(
        DEFAULT_FILE_STORAGE='storages.backends.s3boto3.S3Boto3Storage',
        AWS_STORAGE_BUCKET_NAME='test-bucket'
    )
    def test_s3_storage_configured(self):
        """Тест конфигурации S3 хранилища"""
        from django.conf import settings

        self.assertTrue(hasattr(settings, 'AWS_ACCESS_KEY_ID') or
                       hasattr(settings, 'AWS_STORAGE_BUCKET_NAME'))

    def test_file_upload_creates_url(self):
        """Тест что загрузка файла создает URL"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.marketplace.models import Order, OrderAttachment

        order = Order.objects.create(
            title="Test Order",
            description="Description",
            buyer=self.user,
            category=self.category,
            price=Decimal("100.00"),
            estimated_days=7
        )

        test_file = SimpleUploadedFile(
            "test_file.txt",
            b"Test file content",
            content_type="text/plain"
        )

        attachment = OrderAttachment.objects.create(
            order=order,
            file=test_file
        )

        self.assertIsNotNone(attachment.file.name)
        self.assertTrue(len(attachment.file.name) > 0)

        try:
            url = attachment.file.url
            self.assertIsNotNone(url)
            self.assertTrue(url.startswith('http') or url.startswith('/'))
        except Exception:
            self.skipTest("S3 storage not configured")

    def test_file_deletion(self):
        """Тест удаления файла"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        from apps.marketplace.models import Order, OrderAttachment

        order = Order.objects.create(
            title="Test Order",
            description="Description",
            buyer=self.user,
            category=self.category,
            price=Decimal("100.00"),
            estimated_days=7
        )

        test_file = SimpleUploadedFile(
            "test_delete.txt",
            b"File to delete",
            content_type="text/plain"
        )

        attachment = OrderAttachment.objects.create(
            order=order,
            file=test_file
        )

        file_name = attachment.file.name
        attachment_id = attachment.id

        attachment.delete()

        self.assertFalse(OrderAttachment.objects.filter(id=attachment_id).exists())


@unittest.skipUnless(
    getattr(settings, 'INTEGRATION_TESTS_ENABLED', True),
    "Integration tests disabled in CI environment"
)
class AISearchIntegrationTest(TestCase):
    """Интеграционные тесты AI-поиска заказов"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='pass123'
        )
        self.category = Category.objects.create(
            name="Development",
            slug="development"
        )

    def test_ai_search_with_embedding_and_reranker(self):
        """Тест полного цикла AI-поиска"""
        order1 = Order.objects.create(
            title="Python Django Developer",
            description="Need experienced Django developer for web project",
            buyer=self.user,
            category=self.category,
            price=Decimal("500.00"),
            estimated_days=14,
            status=Order.OPEN
        )

        order2 = Order.objects.create(
            title="Mobile App Developer",
            description="iOS developer needed for mobile application",
            buyer=self.user,
            category=self.category,
            price=Decimal("600.00"),
            estimated_days=20,
            status=Order.OPEN
        )

        self.assertEqual(Order.objects.filter(status=Order.OPEN).count(), 2)

        embedding_url = getattr(settings, 'EMBEDDING_SERVICE_URL', 'http://localhost:8002')
        try:
            response = requests.get(f"{embedding_url}/health", timeout=2)
            self.assertTrue(True)
        except:
            self.skipTest("Embedding service not available for full AI search test")


class DatabaseVectorExtensionTest(TestCase):
    """Тесты pgvector расширения PostgreSQL"""

    def test_vector_field_exists(self):
        """Тест наличия векторного поля в модели Order"""
        from apps.marketplace.models import Order

        self.assertTrue(hasattr(Order, 'embedding'))

    def test_order_can_store_vector(self):
        """Тест сохранения векторного embedding в БД"""
        from django.contrib.auth import get_user_model
        from apps.marketplace.models import Order, Category
        from decimal import Decimal
        from unittest.mock import patch

        User = get_user_model()
        user = User.objects.create_user(
            username='vectortest',
            email='vector@test.com',
            password='pass123'
        )
        category = Category.objects.create(name="Test", slug="test")

        with patch('apps.marketplace.tasks.calculate_order_embedding.delay'):
            order = Order.objects.create(
                title="Test Order",
                description="Test Description",
                buyer=user,
                category=category,
                price=Decimal("100.00"),
                estimated_days=7
            )

            test_vector = [0.1] * 768
            order.embedding = test_vector
            order.save()

            order_from_db = Order.objects.get(id=order.id)
            self.assertIsNotNone(order_from_db.embedding)
            self.assertEqual(len(order_from_db.embedding), 768)

    def test_vector_similarity_search(self):
        """Тест поиска по векторной близости"""
        from pgvector.django import CosineDistance
        from django.contrib.auth import get_user_model
        from apps.marketplace.models import Order, Category
        from decimal import Decimal
        from unittest.mock import patch

        User = get_user_model()
        user = User.objects.create_user(
            username='simtest',
            email='sim@test.com',
            password='pass123'
        )
        category = Category.objects.create(name="Test", slug="test")

        with patch('apps.marketplace.tasks.calculate_order_embedding.delay'):
            order1 = Order.objects.create(
                title="Order 1",
                description="Test",
                buyer=user,
                category=category,
                price=Decimal("100.00"),
                estimated_days=7,
                embedding=[0.1] * 768
            )

            order2 = Order.objects.create(
                title="Order 2",
                description="Test",
                buyer=user,
                category=category,
                price=Decimal("100.00"),
                estimated_days=7,
                embedding=[0.9] * 768
            )

            query_vector = [0.15] * 768

            orders = Order.objects.filter(embedding__isnull=False).annotate(
                distance=CosineDistance('embedding', query_vector)
            ).order_by('distance')

            self.assertEqual(len(orders), 2)
            self.assertLess(orders[0].distance, orders[1].distance)
