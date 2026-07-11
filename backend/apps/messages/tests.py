from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Message, MessageTranslation
from .tasks import has_translatable_text
from apps.chats.models import Chat, ChatMember

User = get_user_model()


class MessageModelTest(TestCase):
    """Message model tests"""

    def setUp(self):
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='pass123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='pass123'
        )
        self.chat = Chat.objects.create(
            title="Test Chat",
            type=Chat.ChatType.DIRECT,
            created_by=self.user1
        )
        ChatMember.objects.create(chat=self.chat, user=self.user1)
        ChatMember.objects.create(chat=self.chat, user=self.user2)

    def test_message_creation(self):
        """Test message creation"""
        message = Message.objects.create(
            chat=self.chat,
            sender=self.user1,
            text="Hello, World!",
            position=1
        )
        self.assertEqual(message.text, "Hello, World!")
        self.assertEqual(message.sender, self.user1)
        self.assertIsNone(message.source_language)

    def test_message_with_source_language(self):
        """Test saving message source language"""
        message = Message.objects.create(
            chat=self.chat,
            sender=self.user1,
            text="Hello",
            source_language="en",
            position=1
        )
        self.assertEqual(message.source_language, "en")

    def test_message_ordering(self):
        """Test message ordering by time"""
        msg1 = Message.objects.create(
            chat=self.chat,
            sender=self.user1,
            text="First",
            position=1
        )
        msg2 = Message.objects.create(
            chat=self.chat,
            sender=self.user2,
            text="Second",
            position=2
        )
        messages = list(Message.objects.filter(chat=self.chat).order_by('position'))
        self.assertEqual(messages[0], msg1)
        self.assertEqual(messages[1], msg2)


class MessageTranslationModelTest(TestCase):
    """MessageTranslation model tests"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='user',
            email='user@example.com',
            password='pass123'
        )
        self.chat = Chat.objects.create(title="Test", type=Chat.ChatType.DIRECT, created_by=self.user)
        self.message = Message.objects.create(
            chat=self.chat,
            sender=self.user,
            text="Hello, how are you?",
            source_language="en",
            position=1
        )

    def test_translation_creation(self):
        """Test message translation creation"""
        translation = MessageTranslation.objects.create(
            message=self.message,
            target_language="uk",
            translated_text="Привіт, як справи?"
        )
        self.assertEqual(translation.target_language, "uk")
        self.assertEqual(translation.message, self.message)

    def test_translation_unique_constraint(self):
        """Test translation uniqueness for message-language pair"""
        MessageTranslation.objects.create(
            message=self.message,
            target_language="uk",
            translated_text="Привіт"
        )
        with self.assertRaises(Exception):
            MessageTranslation.objects.create(
                message=self.message,
                target_language="uk",
                translated_text="Вітаю"
            )


class TranslatableTextTest(TestCase):
    """Translatable text validation tests"""

    def test_normal_text_is_translatable(self):
        """Test normal text"""
        text = "This is a normal message"
        self.assertTrue(has_translatable_text(text))

    def test_url_only_not_translatable(self):
        """Test URL-only text"""
        text = "https://example.com/page"
        self.assertFalse(has_translatable_text(text))

    def test_numbers_only_not_translatable(self):
        """Test numbers-only text"""
        text = "123456789"
        self.assertFalse(has_translatable_text(text))

    def test_empty_text_not_translatable(self):
        """Test empty text"""
        text = ""
        self.assertFalse(has_translatable_text(text))

    def test_whitespace_only_not_translatable(self):
        """Test whitespace-only text"""
        text = "   \n\t  "
        self.assertFalse(has_translatable_text(text))

    def test_text_with_url_is_translatable(self):
        """Test text with URL and words"""
        text = "Check this link https://example.com for more info"
        self.assertTrue(has_translatable_text(text))

    def test_mixed_content_is_translatable(self):
        """Test mixed content"""
        text = "Order #12345 is ready!"
        self.assertTrue(has_translatable_text(text))


class MessageTranslationIntegrationTest(TestCase):
    """Message translation integration tests"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='user',
            email='user@example.com',
            password='pass123',
            language='uk'
        )
        self.chat = Chat.objects.create(title="Test", type=Chat.ChatType.DIRECT, created_by=self.user)
        ChatMember.objects.create(chat=self.chat, user=self.user)

    def test_message_with_translation(self):
        """Test message with translation"""
        message = Message.objects.create(
            chat=self.chat,
            sender=self.user,
            text="Hello, how are you?",
            source_language="en",
            position=1
        )
        translation = MessageTranslation.objects.create(
            message=message,
            target_language="uk",
            translated_text="Привіт, як справи?"
        )

        self.assertEqual(message.translations.count(), 1)
        self.assertEqual(message.translations.first(), translation)

    def test_multiple_translations_same_message(self):
        """Test multiple translations for one message"""
        message = Message.objects.create(
            chat=self.chat,
            sender=self.user,
            text="Hello",
            source_language="en",
            position=1
        )
        MessageTranslation.objects.create(
            message=message,
            target_language="uk",
            translated_text="Привіт"
        )
        MessageTranslation.objects.create(
            message=message,
            target_language="de",
            translated_text="Hallo"
        )
        MessageTranslation.objects.create(
            message=message,
            target_language="fr",
            translated_text="Bonjour"
        )

        self.assertEqual(message.translations.count(), 3)

    def test_delete_message_cascades_translations(self):
        """Test cascade deletion of translations when message is deleted"""
        message = Message.objects.create(
            chat=self.chat,
            sender=self.user,
            text="Test message",
            source_language="en",
            position=1
        )
        MessageTranslation.objects.create(
            message=message,
            target_language="uk",
            translated_text="Тестове повідомлення"
        )

        self.assertEqual(MessageTranslation.objects.count(), 1)
        message.delete()
        self.assertEqual(MessageTranslation.objects.count(), 0)
