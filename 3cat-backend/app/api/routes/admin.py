# app/api/routes/admin.py
from fastapi import APIRouter, Depends, HTTPException
from app.tasks.scheduled_tasks import process_pending_compensation_changes_task
from app.tasks.celery_app import celery_app
# from app.api.deps import get_current_admin_user  # You'll need to implement admin auth

router = APIRouter()

@router.post("/trigger-compensation-processing")
def trigger_compensation_processing():
    """Trigger processing of pending compensation changes"""
    task = process_pending_compensation_changes_task.delay()
    return {"success": True, "task_id": task.id}

@router.get("/task-status/{task_id}")
def get_task_status(task_id: str):
    """Get the status of a Celery task"""
    task = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task.status,
        "result": task.result if task.ready() else None
    }
    
    