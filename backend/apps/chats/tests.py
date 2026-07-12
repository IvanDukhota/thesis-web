from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import Chat, ChatMember

User = get_user_model()


class ChatModelTest(TestCase):
    """Chat model tests"""

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

    def test_direct_chat_creation(self):
        """Test direct chat creation"""
        chat = Chat.objects.create(
            title="Private Chat",
            type=Chat.ChatType.DIRECT,
            created_by=self.user1
        )
        ChatMember.objects.create(chat=chat, user=self.user1)
        ChatMember.objects.create(chat=chat, user=self.user2)

        self.assertEqual(chat.type, Chat.ChatType.DIRECT)
        self.assertEqual(chat.members.count(), 2)

    def test_group_chat_creation(self):
        """Test group chat creation"""
        user3 = User.objects.create_user(
            username='user3',
            email='user3@example.com',
            password='pass123'
        )
        chat = Chat.objects.create(
            title="Group Chat",
            type=Chat.ChatType.GROUP,
            created_by=self.user1
        )
        ChatMember.objects.create(chat=chat, user=self.user1, role=ChatMember.Role.OWNER)
        ChatMember.objects.create(chat=chat, user=self.user2)
        ChatMember.objects.create(chat=chat, user=user3)

        self.assertEqual(chat.type, Chat.ChatType.GROUP)
        self.assertEqual(chat.members.count(), 3)

    def test_chat_with_creator(self):
        """Test chat with creator"""
        chat = Chat.objects.create(
            title="Test Chat",
            type=Chat.ChatType.GROUP,
            created_by=self.user1
        )
        ChatMember.objects.create(chat=chat, user=self.user1, role=ChatMember.Role.OWNER)

        self.assertEqual(chat.created_by, self.user1)
        self.assertEqual(chat.members.count(), 1)

    def test_chat_member_roles(self):
        """Test chat member roles"""
        chat = Chat.objects.create(
            title="Test Chat",
            type=Chat.ChatType.GROUP,
            created_by=self.user1
        )
        owner = ChatMember.objects.create(chat=chat, user=self.user1, role=ChatMember.Role.OWNER)
        member = ChatMember.objects.create(chat=chat, user=self.user2, role=ChatMember.Role.MEMBER)

        self.assertEqual(owner.role, ChatMember.Role.OWNER)
        self.assertEqual(member.role, ChatMember.Role.MEMBER)


class ChatMemberTest(TestCase):
    """ChatMember model tests"""

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
            type=Chat.ChatType.GROUP,
            created_by=self.user1
        )

    def test_add_member(self):
        """Test adding chat member"""
        member = ChatMember.objects.create(chat=self.chat, user=self.user1)

        self.assertEqual(self.chat.members.count(), 1)
        self.assertEqual(member.role, ChatMember.Role.MEMBER)

    def test_remove_member(self):
        """Test removing chat member"""
        member1 = ChatMember.objects.create(chat=self.chat, user=self.user1)
        member2 = ChatMember.objects.create(chat=self.chat, user=self.user2)

        self.assertEqual(self.chat.members.count(), 2)

        member2.delete()
        self.assertEqual(self.chat.members.count(), 1)

    def test_member_unique_constraint(self):
        """Test user can only be member once per chat"""
        ChatMember.objects.create(chat=self.chat, user=self.user1)

        with self.assertRaises(Exception):
            ChatMember.objects.create(chat=self.chat, user=self.user1)

    def test_check_user_is_member(self):
        """Test checking if user is chat member"""
        ChatMember.objects.create(chat=self.chat, user=self.user1)

        self.assertTrue(self.chat.members.filter(user=self.user1).exists())
        self.assertFalse(self.chat.members.filter(user=self.user2).exists())
