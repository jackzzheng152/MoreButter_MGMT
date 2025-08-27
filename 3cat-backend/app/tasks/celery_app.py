from celery import Celery
from celery.schedules import crontab
import os

# Use Redis URL from environment variable (Heroku) or fallback to localhost
redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
celery_app = Celery('tasks', broker=redis_url)

import app.tasks.scheduled_tasks

celery_app.conf.beat_schedule = {
    'process-pending-compensation-daily': {
        'task': 'app.tasks.scheduled_tasks.process_pending_compensation_changes_task',
        'schedule': crontab(hour=0, minute=5),
    },
}
