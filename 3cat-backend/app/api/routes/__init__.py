from fastapi import APIRouter
from app.api.routes import webhooks, employees, forms, compensation, admin, time_punch, time_off, tally_routes, pay_periods, platforms, file_upload, orders

# Initialize the main router
api_router = APIRouter()

# Include all route modules with appropriate prefixes
api_router.include_router(webhooks.router, prefix="/webhook", tags=["Webhooks"])
api_router.include_router(employees.router, prefix="/employees", tags=["Employees"])
api_router.include_router(forms.router, prefix="/forms", tags=["Forms"])
api_router.include_router(compensation.router, prefix="/compensation", tags=["Compensation"])
# BambooHR webhooks removed - direct to 7shifts
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(time_punch.router, prefix="/time-punch", tags=["Time Punch"])
api_router.include_router(time_off.router, prefix="/time-off", tags=["Time Off"])
api_router.include_router(tally_routes.router, prefix="/tally", tags=["Tally"])
api_router.include_router(pay_periods.router, prefix="/pay-periods", tags=["Pay Periods"])
api_router.include_router(platforms.router, prefix="/platforms", tags=["Platforms"])
api_router.include_router(file_upload.router, prefix="/file-upload", tags=["File Upload"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])