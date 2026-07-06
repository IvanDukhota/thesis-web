from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.marketplace.models import Category, Tag, Order, OrderApplication
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Create initial marketplace data (categories, tags, orders, and applications)'

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

        # Создание тестовых пользователей
        buyer1, created = User.objects.get_or_create(
            email='buyer1@example.com',
            defaults={
                'username': 'janedoe',
            }
        )
        if created:
            buyer1.set_password('testpass123')
            buyer1.save()
            self.stdout.write(self.style.SUCCESS(f'Created buyer: {buyer1.email}'))

        buyer2, created = User.objects.get_or_create(
            email='buyer2@example.com',
            defaults={
                'username': 'johnsmith',
            }
        )
        if created:
            buyer2.set_password('testpass123')
            buyer2.save()
            self.stdout.write(self.style.SUCCESS(f'Created buyer: {buyer2.email}'))

        # Создание тестовых исполнителей
        seller1, created = User.objects.get_or_create(
            email='seller1@example.com',
            defaults={
                'username': 'alicejohnson',
            }
        )
        if created:
            seller1.set_password('testpass123')
            seller1.save()
            self.stdout.write(self.style.SUCCESS(f'Created seller: {seller1.email}'))

        seller2, created = User.objects.get_or_create(
            email='seller2@example.com',
            defaults={
                'username': 'bobwilliams',
            }
        )
        if created:
            seller2.set_password('testpass123')
            seller2.save()
            self.stdout.write(self.style.SUCCESS(f'Created seller: {seller2.email}'))

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

        # Создание заказов
        orders_data = [
            {
                'title': 'Need Full-Stack Developer for E-commerce Platform',
                'description': 'Looking for an experienced developer to build a modern e-commerce platform with React frontend and Django backend. Must include user authentication, product catalog, shopping cart, payment integration, and admin dashboard.',
                'price': Decimal('5000.00'),
                'estimated_days': 28,
                'category': web_dev,
                'tags': [python_tag, react_tag, django_tag, postgresql_tag],
                'buyer': buyer1,
            },
            {
                'title': 'React Native Developer Needed for Mobile App',
                'description': 'Seeking a skilled React Native developer to create a cross-platform mobile application. The app should include API integration, push notifications, offline mode, and modern UI/UX.',
                'price': Decimal('3500.00'),
                'estimated_days': 21,
                'category': mobile_dev,
                'tags': [react_tag, typescript_tag, nodejs_tag],
                'buyer': buyer1,
            },
            {
                'title': 'UI/UX Designer for SaaS Product',
                'description': 'Need a talented UI/UX designer to create complete design system for our SaaS product. Should include wireframes, high-fidelity mockups, design system, and interactive prototypes in Figma.',
                'price': Decimal('2500.00'),
                'estimated_days': 14,
                'category': design,
                'tags': [figma_tag],
                'buyer': buyer2,
            },
            {
                'title': 'Machine Learning Engineer for Predictive Analytics',
                'description': 'Looking for ML engineer to develop and train custom machine learning models for predictive analytics. Project includes data preprocessing, model training, evaluation, and deployment.',
                'price': Decimal('4500.00'),
                'estimated_days': 35,
                'category': data_science,
                'tags': [python_tag],
                'buyer': buyer2,
            },
            {
                'title': 'Backend Developer for RESTful API',
                'description': 'Need backend developer to build a scalable RESTful API using Node.js and Express. Must include authentication, rate limiting, documentation, and database integration.',
                'price': Decimal('2000.00'),
                'estimated_days': 14,
                'category': web_dev,
                'tags': [nodejs_tag, typescript_tag, postgresql_tag],
                'buyer': buyer1,
            },
            {
                'title': 'Flutter Developer for iOS/Android App',
                'description': 'Seeking Flutter developer to create a beautiful mobile app for both iOS and Android. Should include custom animations, state management, and backend integration.',
                'price': Decimal('3000.00'),
                'estimated_days': 21,
                'category': mobile_dev,
                'tags': [flutter_tag],
                'buyer': buyer2,
            },
        ]

        created_orders = []
        for order_data in orders_data:
            tags = order_data.pop('tags')
            order, created = Order.objects.get_or_create(
                title=order_data['title'],
                defaults={
                    'buyer': order_data['buyer'],
                    'description': order_data['description'],
                    'price': order_data['price'],
                    'estimated_days': order_data['estimated_days'],
                    'category': order_data['category'],
                    'status': Order.OPEN,
                }
            )
            if created:
                order.tags.set(tags)
                order.save()
                created_orders.append(order)
                self.stdout.write(self.style.SUCCESS(f'Created order: {order.title}'))

        # Создание заявок на заказы
        if created_orders:
            # seller1 подает заявки на первые 3 заказа
            for order in created_orders[:3]:
                application, created = OrderApplication.objects.get_or_create(
                    order=order,
                    applicant=seller1,
                    defaults={
                        'message': f'I am interested in working on "{order.title}". I have relevant experience and can deliver quality results.',
                        'proposed_price': order.price * Decimal('0.95'),  # предлагает на 5% меньше
                        'proposed_days': max(1, order.estimated_days - 3),  # предлагает быстрее на 3 дня
                        'status': OrderApplication.PENDING,
                    }
                )
                if created:
                    order.applications_count += 1
                    order.save(update_fields=['applications_count'])
                    self.stdout.write(self.style.SUCCESS(f'Created application: {seller1.full_name} -> {order.title}'))

            # seller2 подает заявки на последние 3 заказа
            for order in created_orders[3:]:
                application, created = OrderApplication.objects.get_or_create(
                    order=order,
                    applicant=seller2,
                    defaults={
                        'message': f'Hello! I would love to work on "{order.title}". Please check my portfolio.',
                        'proposed_price': order.price * Decimal('0.90'),  # предлагает на 10% меньше
                        'proposed_days': order.estimated_days,  # то же время
                        'status': OrderApplication.PENDING,
                    }
                )
                if created:
                    order.applications_count += 1
                    order.save(update_fields=['applications_count'])
                    self.stdout.write(self.style.SUCCESS(f'Created application: {seller2.full_name} -> {order.title}'))

        self.stdout.write(self.style.SUCCESS('Successfully initialized marketplace data'))
