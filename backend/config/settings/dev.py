import os
import dj_database_url
from .base import *
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'backend']

DATABASES = {
'default': dj_database_url.config(
    default='postgres://user:password@localhost:5432/teamhub_db',
    conn_max_age=600
    )
}