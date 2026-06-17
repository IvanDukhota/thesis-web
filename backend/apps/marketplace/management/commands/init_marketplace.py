from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.marketplace.models import Category, Tag, Order
from decimal import Decimal
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = 'Create initial marketplace data (categories, tags, and sample orders)'

    def handle(self, *args, **options):
        # Создание категорий
        categories_data = [
            {'name': 'Web Development', 'description': 'Web applications and websites', 'icon': '🌐'},
            {'name': 'Mobile Development', 'description': 'iOS and Android applications', 'icon': '📱'},
            {'name': 'Design', 'description': 'UI/UX and graphic design', 'icon': '🎨'},
            {'name': 'Data Science', 'description': 'Machine learning and analytics', 'icon': '📊'},
            {'name': 'DevOps', 'description': 'Infrastructure and deployment', 'icon': '⚙️'},
            {'name': 'Marketing', 'description': 'Digital marketing and SEO', 'icon': '📈'},
        ]

        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults={
                    'description': cat_data['description'],
                    'icon': cat_data['icon'],
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created category: {category.name}'))

        # Создание тегов
        tags_data = [
            'Python', 'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular',
            'Node.js', 'Django', 'Flask', 'FastAPI', 'Express',
            'PostgreSQL', 'MongoDB', 'MySQL', 'Redis',
            'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
            'Swift', 'Kotlin', 'Flutter', 'React Native',
            'Figma', 'Adobe XD', 'Photoshop', 'Illustrator',
            'TensorFlow', 'PyTorch', 'Scikit-learn', 'Pandas',
            'Git', 'CI/CD', 'Jenkins', 'GitHub Actions',
            'SEO', 'Google Analytics', 'Social Media', 'Content Writing',
        ]

        for tag_name in tags_data:
            tag, created = Tag.objects.get_or_create(name=tag_name)
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created tag: {tag.name}'))

        # Создание тестовых orders
        # Получаем или создаем тестового пользователя (заказчика)
        test_buyer, created = User.objects.get_or_create(
            email='buyer@example.com',
            defaults={
                'full_name': 'Jane Doe',
                'nickname': 'janedoe',
            }
        )
        if created:
            test_buyer.set_password('testpass123')
            test_buyer.save()
            self.stdout.write(self.style.SUCCESS(f'Created test buyer: {test_buyer.email}'))

        # Получаем категории и теги
        web_dev = Category.objects.get(name='Web Development')
        mobile_dev = Category.objects.get(name='Mobile Development')
        design = Category.objects.get(name='Design')
        data_science = Category.objects.get(name='Data Science')

        python_tag = Tag.objects.get(name='Python')
        react_tag = Tag.objects.get(name='React')
        django_tag = Tag.objects.get(name='Django')
        nodejs_tag = Tag.objects.get(name='Node.js')
        typescript_tag = Tag.objects.get(name='TypeScript')
        flutter_tag = Tag.objects.get(name='Flutter')
        figma_tag = Tag.objects.get(name='Figma')
        postgresql_tag = Tag.objects.get(name='PostgreSQL')

        # Создание sample orders (заданий от заказчиков)
        orders_data = [
            {
                'title': 'Need Full-Stack Developer for E-commerce Platform',
                'description': 'Looking for an experienced developer to build a modern e-commerce platform with React frontend and Django backend. Must include user authentication, product catalog, shopping cart, payment integration, and admin dashboard.',
                'price': Decimal('5000.00'),
                'delivery_time': '4 weeks',
                'category': web_dev,
                'tags': [python_tag, react_tag, django_tag, postgresql_tag],
                'features': ['User Authentication', 'Payment Integration', 'Admin Dashboard', 'Responsive Design'],
                'requirements': 'Must have 3+ years experience with React and Django. Portfolio required.',
                'status': 'published',
            },
            {
                'title': 'React Native Developer Needed for Mobile App',
                'description': 'Seeking a skilled React Native developer to create a cross-platform mobile application. The app should include API integration, push notifications, offline mode, and modern UI/UX.',
                'price': Decimal('3500.00'),
                'delivery_time': '3 weeks',
                'category': mobile_dev,
                'tags': [react_tag, typescript_tag, nodejs_tag],
                'features': ['Cross-platform', 'Push Notifications', 'Offline Mode', 'API Integration'],
                'requirements': 'Experience with React Native and TypeScript required.',
                'status': 'published',
            },
            {
                'title': 'UI/UX Designer for SaaS Product',
                'description': 'Need a talented UI/UX designer to create complete design system for our SaaS product. Should include wireframes, high-fidelity mockups, design system, and interactive prototypes in Figma.',
                'price': Decimal('2500.00'),
                'delivery_time': '2 weeks',
                'category': design,
                'tags': [figma_tag],
                'features': ['Wireframes', 'High-fidelity Mockups', 'Design System', 'Interactive Prototype'],
                'requirements': 'Strong portfolio in SaaS design. Figma expertise required.',
                'status': 'published',
            },
            {
                'title': 'Machine Learning Engineer for Predictive Analytics',
                'description': 'Looking for ML engineer to develop and train custom machine learning models for predictive analytics. Project includes data preprocessing, model training, evaluation, and deployment.',
                'price': Decimal('4500.00'),
                'delivery_time': '5 weeks',
                'category': data_science,
                'tags': [python_tag],
                'features': ['Data Preprocessing', 'Model Training', 'Model Evaluation', 'Deployment Support'],
                'requirements': 'PhD or Masters in ML/AI preferred. Python and TensorFlow/PyTorch experience required.',
                'status': 'published',
            },
            {
                'title': 'Backend Developer for RESTful API',
                'description': 'Need backend developer to build a scalable RESTful API using Node.js and Express. Must include authentication, rate limiting, documentation, and database integration.',
                'price': Decimal('2000.00'),
                'delivery_time': '2 weeks',
                'category': web_dev,
                'tags': [nodejs_tag, typescript_tag, postgresql_tag],
                'features': ['JWT Authentication', 'Rate Limiting', 'API Documentation', 'Database Integration'],
                'requirements': 'Node.js and Express experience. Must provide API documentation.',
                'status': 'published',
            },
            {
                'title': 'Flutter Developer for iOS/Android App',
                'description': 'Seeking Flutter developer to create a beautiful mobile app for both iOS and Android. Should include custom animations, state management, and backend integration.',
                'price': Decimal('3000.00'),
                'delivery_time': '3 weeks',
                'category': mobile_dev,
                'tags': [flutter_tag],
                'features': ['Custom Animations', 'State Management', 'Backend Integration', 'Native Performance'],
                'requirements': 'Flutter experience required. Previous apps on App Store/Play Store preferred.',
                'status': 'published',
            },
        ]

        for order_data in orders_data:
            tags = order_data.pop('tags')
            order, created = Order.objects.get_or_create(
                title=order_data['title'],
                defaults={
                    'buyer': test_buyer,
                    'description': order_data['description'],
                    'price': order_data['price'],
                    'delivery_time': order_data['delivery_time'],
                    'category': order_data['category'],
                    'features': order_data['features'],
                    'requirements': order_data.get('requirements', ''),
                    'status': order_data['status'],
                    'published_at': timezone.now(),
                }
            )
            if created:
                order.tags.set(tags)
                order.save()
                self.stdout.write(self.style.SUCCESS(f'Created order: {order.title}'))

        self.stdout.write(self.style.SUCCESS('Successfully initialized marketplace data'))
