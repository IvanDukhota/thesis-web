from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from .models import Category, Tag, Order, OrderAttachment, OrderApplication, OrderTranslation
from apps.messages.models import Message, MessageTranslation

User = get_user_model()


class CategoryModelTest(TestCase):
    """Category model tests"""

    def setUp(self):
        self.parent_category = Category.objects.create(
            name="Development",
            slug="development",
            description="Development services"
        )

    def test_category_creation(self):
        """Test category creation"""
        self.assertEqual(self.parent_category.name, "Development")
        self.assertEqual(self.parent_category.slug, "development")
        self.assertTrue(self.parent_category.is_active)

    def test_category_with_parent(self):
        """Test subcategory creation"""
        subcategory = Category.objects.create(
            name="Web Development",
            slug="web-development",
            parent=self.parent_category
        )
        self.assertEqual(subcategory.parent, self.parent_category)
        self.assertIn(subcategory, self.parent_category.subcategories.all())

    def test_category_ordering(self):
        """Test category ordering"""
        cat1 = Category.objects.create(name="Cat1", slug="cat1", order=2)
        cat2 = Category.objects.create(name="Cat2", slug="cat2", order=1)
        categories = list(Category.objects.filter(slug__in=['cat1', 'cat2']).order_by('order'))
        self.assertEqual(categories[0], cat2)
        self.assertEqual(categories[1], cat1)


class TagModelTest(TestCase):
    """Tag model tests"""

    def test_tag_creation(self):
        """Test tag creation"""
        tag = Tag.objects.create(name="Python", slug="python")
        self.assertEqual(tag.name, "Python")
        self.assertEqual(tag.usage_count, 0)

    def test_tag_usage_increment(self):
        """Test tag usage counter increment"""
        tag = Tag.objects.create(name="Django", slug="django", usage_count=5)
        tag.usage_count += 1
        tag.save()
        self.assertEqual(tag.usage_count, 6)


class OrderModelTest(TestCase):
    """Order model tests"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(
            name="Web Development",
            slug="web-dev"
        )

    def test_order_creation(self):
        """Test order creation"""
        order = Order.objects.create(
            title="Build a website",
            description="Need a professional website",
            buyer=self.user,
            category=self.category,
            price=Decimal("500.00"),
            estimated_days=14
        )
        self.assertEqual(order.title, "Build a website")
        self.assertEqual(order.status, Order.OPEN)
        self.assertEqual(order.views_count, 0)
        self.assertEqual(order.applications_count, 0)

    def test_order_slug_generation(self):
        """Test automatic slug generation"""
        order = Order.objects.create(
            title="Build Website",
            description="Test",
            buyer=self.user,
            category=self.category,
            price=Decimal("500.00"),
            estimated_days=14
        )
        self.assertIsNotNone(order.slug)
        self.assertTrue(len(order.slug) > 0)

    def test_order_with_tags(self):
        """Test order with tags relationship"""
        order = Order.objects.create(
            title="Python Project",
            description="Test",
            buyer=self.user,
            category=self.category,
            price=Decimal("500.00"),
            estimated_days=14
        )
        tag1 = Tag.objects.create(name="Python", slug="python")
        tag2 = Tag.objects.create(name="Django", slug="django")
        order.tags.add(tag1, tag2)

        self.assertEqual(order.tags.count(), 2)
        self.assertIn(tag1, order.tags.all())

    def test_order_status_transitions(self):
        """Test order status changes"""
        order = Order.objects.create(
            title="Test Order",
            description="Test",
            buyer=self.user,
            category=self.category,
            price=Decimal("100.00"),
            estimated_days=7,
            status=Order.OPEN
        )
        order.status = Order.IN_PROGRESS
        order.save()
        self.assertEqual(order.status, Order.IN_PROGRESS)


class OrderApplicationModelTest(TestCase):
    """OrderApplication model tests"""

    def setUp(self):
        self.buyer = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='pass123'
        )
        self.applicant = User.objects.create_user(
            username='applicant',
            email='applicant@example.com',
            password='pass123'
        )
        self.category = Category.objects.create(name="Test", slug="test")
        self.order = Order.objects.create(
            title="Test Order",
            description="Test description",
            buyer=self.buyer,
            category=self.category,
            price=Decimal("200.00"),
            estimated_days=10
        )

    def test_application_creation(self):
        """Test order application creation"""
        application = OrderApplication.objects.create(
            order=self.order,
            applicant=self.applicant,
            message="I can do this job",
            proposed_price=Decimal("180.00"),
            proposed_days=8
        )
        self.assertEqual(application.status, OrderApplication.PENDING)
        self.assertEqual(application.applicant, self.applicant)

    def test_application_acceptance(self):
        """Test application acceptance"""
        application = OrderApplication.objects.create(
            order=self.order,
            applicant=self.applicant,
            message="Test",
            proposed_price=Decimal("180.00"),
            proposed_days=8
        )
        application.status = OrderApplication.ACCEPTED
        application.save()
        self.assertEqual(application.status, OrderApplication.ACCEPTED)


class OrderTranslationModelTest(TestCase):
    """OrderTranslation model tests"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='pass123'
        )
        self.category = Category.objects.create(name="Test", slug="test")
        self.order = Order.objects.create(
            title="Build a website",
            description="Need professional help",
            buyer=self.user,
            category=self.category,
            price=Decimal("500.00"),
            estimated_days=14
        )

    def test_translation_creation(self):
        """Test order translation creation"""
        translation = OrderTranslation.objects.create(
            order=self.order,
            target_language="uk",
            translated_title="Створити веб-сайт",
            translated_description="Потрібна професійна допомога"
        )
        self.assertEqual(translation.target_language, "uk")
        self.assertEqual(translation.order, self.order)

    def test_translation_unique_constraint(self):
        """Test translation uniqueness for order-language pair"""
        OrderTranslation.objects.create(
            order=self.order,
            target_language="uk",
            translated_title="Title",
            translated_description="Desc"
        )
        with self.assertRaises(Exception):
            OrderTranslation.objects.create(
                order=self.order,
                target_language="uk",
                translated_title="Another title",
                translated_description="Another desc"
            )


class OrderAPITest(APITestCase):
    """Order API tests"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='pass123'
        )
        self.category = Category.objects.create(
            name="Development",
            slug="development"
        )
        self.client.force_authenticate(user=self.user)

    def test_list_orders(self):
        """Test getting list of orders"""
        Order.objects.create(
            title="Order 1",
            description="Desc 1",
            buyer=self.user,
            category=self.category,
            price=Decimal("100.00"),
            estimated_days=7
        )
        response = self.client.get('/api/marketplace/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)

    def test_create_order(self):
        """Test order creation via API"""
        data = {
            'title': 'New Project',
            'description': 'Project description',
            'category': self.category.id,
            'price': '250.00',
            'estimated_days': 10,
            'status': 'open',
            'tag_names': ['Python', 'Django']
        }
        response = self.client.post('/api/marketplace/orders/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)
        order = Order.objects.first()
        self.assertEqual(order.title, 'New Project')
        self.assertEqual(order.buyer, self.user)

    def test_retrieve_order(self):
        """Test getting order details"""
        order = Order.objects.create(
            title="Test Order",
            description="Description",
            buyer=self.user,
            category=self.category,
            price=Decimal("200.00"),
            estimated_days=5
        )
        response = self.client.get(f'/api/marketplace/orders/{order.slug}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Order')

    def test_update_order_owner(self):
        """Test order update by owner"""
        order = Order.objects.create(
            title="Original Title",
            description="Original Description",
            buyer=self.user,
            category=self.category,
            price=Decimal("100.00"),
            estimated_days=7
        )
        data = {
            'title': 'Updated Title',
            'description': 'Updated Description',
            'category': self.category.id,
            'price': '150.00',
            'estimated_days': 10,
            'status': 'open'
        }
        response = self.client.put(
            f'/api/marketplace/orders/{order.slug}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.title, 'Updated Title')

    def test_update_order_not_owner(self):
        """Test order update prohibition for non-owner"""
        order = Order.objects.create(
            title="Order",
            description="Desc",
            buyer=self.other_user,
            category=self.category,
            price=Decimal("100.00"),
            estimated_days=7
        )
        data = {
            'title': 'Hacked Title',
            'description': 'Desc',
            'category': self.category.id,
            'price': '100.00',
            'estimated_days': 7,
            'status': 'open'
        }
        response = self.client.put(
            f'/api/marketplace/orders/{order.slug}/',
            data,
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_order_owner(self):
        """Test order deletion by owner"""
        order = Order.objects.create(
            title="Order to delete",
            description="Desc",
            buyer=self.user,
            category=self.category,
            price=Decimal("100.00"),
            estimated_days=7
        )
        response = self.client.delete(f'/api/marketplace/orders/{order.slug}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Order.objects.count(), 0)

    def test_filter_orders_by_category(self):
        """Test order filtering by category"""
        cat1 = Category.objects.create(name="Cat1", slug="cat1")
        cat2 = Category.objects.create(name="Cat2", slug="cat2")

        Order.objects.create(
            title="Order 1",
            description="Desc",
            buyer=self.user,
            category=cat1,
            price=Decimal("100.00"),
            estimated_days=7
        )
        Order.objects.create(
            title="Order 2",
            description="Desc",
            buyer=self.user,
            category=cat2,
            price=Decimal("100.00"),
            estimated_days=7
        )

        response = self.client.get(f'/api/marketplace/orders/?category={cat1.slug}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_filter_orders_by_price_range(self):
        """Test order filtering by price range"""
        Order.objects.create(
            title="Cheap",
            description="Desc",
            buyer=self.user,
            category=self.category,
            price=Decimal("50.00"),
            estimated_days=7
        )
        Order.objects.create(
            title="Expensive",
            description="Desc",
            buyer=self.user,
            category=self.category,
            price=Decimal("500.00"),
            estimated_days=7
        )

        response = self.client.get('/api/marketplace/orders/?min_price=100&max_price=600')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Expensive')

    def test_search_orders(self):
        """Test order search by text"""
        Order.objects.create(
            title="Python Developer Needed",
            description="Django project",
            buyer=self.user,
            category=self.category,
            price=Decimal("300.00"),
            estimated_days=14
        )
        Order.objects.create(
            title="Java Developer",
            description="Spring Boot",
            buyer=self.user,
            category=self.category,
            price=Decimal("400.00"),
            estimated_days=20
        )

        response = self.client.get('/api/marketplace/orders/?search=Python')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)


class OrderApplicationAPITest(APITestCase):
    """OrderApplication API tests"""

    def setUp(self):
        self.client = APIClient()
        self.buyer = User.objects.create_user(
            username='buyer',
            email='buyer@example.com',
            password='pass123'
        )
        self.applicant = User.objects.create_user(
            username='applicant',
            email='applicant@example.com',
            password='pass123'
        )
        self.category = Category.objects.create(name="Test", slug="test")
        self.order = Order.objects.create(
            title="Test Order",
            description="Description",
            buyer=self.buyer,
            category=self.category,
            price=Decimal("300.00"),
            estimated_days=10
        )
        self.client.force_authenticate(user=self.applicant)

    def test_create_application(self):
        """Test order application creation"""
        data = {
            'order': self.order.id,
            'message': 'I want to work on this project',
            'proposed_price': '280.00',
            'proposed_days': 9
        }
        response = self.client.post('/api/marketplace/applications/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(OrderApplication.objects.count(), 1)

    def test_cannot_apply_to_own_order(self):
        """Test prohibition of applying to own order"""
        self.client.force_authenticate(user=self.buyer)
        data = {
            'order': self.order.id,
            'message': 'Test',
            'proposed_price': '250.00',
            'proposed_days': 8
        }
        response = self.client.post('/api/marketplace/applications/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_apply_twice(self):
        """Test prohibition of duplicate applications"""
        OrderApplication.objects.create(
            order=self.order,
            applicant=self.applicant,
            message='First application',
            proposed_price=Decimal('280.00'),
            proposed_days=9
        )
        data = {
            'order': self.order.id,
            'message': 'Second application',
            'proposed_price': '270.00',
            'proposed_days': 8
        }
        response = self.client.post('/api/marketplace/applications/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
