# routes/orders.py
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional
import os

from app.api import deps
from app.services.order_service import OrderService
from app.services.file_upload_service import FileUploadService
from app.config import logger

from datetime import datetime, timedelta
from sqlalchemy import func, cast, DateTime
from app.models.order import Order

router = APIRouter()

# ---- Helpers ----

def azure_enabled() -> bool:
    """Return True if Azure Storage is configured via env vars."""
    conn = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container = os.getenv("AZURE_STORAGE_CONTAINER")
    return bool(conn and container)

def _parse_date(s: str) -> datetime:
    try:
        return datetime.strptime(s, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="week_start must be YYYY-MM-DD")


# ---- Routes ----

@router.post("/upload-csv")
async def upload_orders_csv(
    file: UploadFile = File(...),
    location_id: int = Form(...),
    container_name: str = Form("3cat-orders"),
    period_start_date: Optional[str] = Form(None),
    period_end_date: Optional[str] = Form(None),
    validate_dates: bool = Form(True),
    overwrite_existing: bool = Form(False),
    append_mode: bool = Form(False),
    db: Session = Depends(deps.get_db),
):
    """
    Upload CSV, optionally upload the raw file to Azure, then parse & insert into DB.
    - In **dev**, if Azure env vars are missing, we *gracefully skip* blob upload and only insert to DB.
    - In **prod**, if Azure is expected and misconfigured, raise a 500.
    """
    try:
        if not file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail="File must be a CSV file")

        content = await file.read()

        # Optional: validate CSV dates window
        if validate_dates and period_start_date and period_end_date:
            date_validation = OrderService.validate_csv_dates(
                csv_content=content,
                expected_start_date=period_start_date,
                expected_end_date=period_end_date,
            )
            if not date_validation["valid"]:
                return {
                    "success": False,
                    "validation_error": True,
                    "date_validation": date_validation,
                    "message": "CSV dates do not match the selected date range",
                }

        # If a date range is given and neither overwrite nor append is requested,
        # check if data already exists and block to avoid duplicates.
        if period_start_date and period_end_date and not overwrite_existing and not append_mode:
            existing = OrderService.check_existing_data_for_date_range(
                location_id=location_id,
                start_date=period_start_date,
                end_date=period_end_date,
                db=db,
            )
            if existing["has_existing_data"]:
                return {
                    "success": False,
                    "existing_data_error": True,
                    "existing_data": existing,
                    "message": "Data already exists for the selected date range",
                }

        # Build a friendly blob filename (used if Azure is enabled)
        if period_start_date and period_end_date:
            ext = file.filename.split(".")[-1] if "." in file.filename else "csv"
            blob_filename = f"{period_start_date}_to_{period_end_date}.{ext}"
        else:
            blob_filename = file.filename

        # === Azure upload (graceful fallback) ===
        blob_result = None
        if azure_enabled():
            try:
                blob_result = await FileUploadService.upload_file_to_blob(
                    file_content=content,
                    filename=blob_filename,
                    container_name=container_name,
                    location_id=location_id,
                    db=db,
                )
            except Exception as e:
                # In prod you might want to raise; in dev we can log and continue
                logger.error(f"Azure upload failed; continuing with DB insert only: {e}")
        else:
            logger.warning("Azure not configured; skipping blob upload and inserting directly to DB")

        # === Parse CSV & insert into DB ===
        processing_result = OrderService.process_csv_and_insert_orders(
            csv_content=content,
            location_id=location_id,
            db=db,
            overwrite_existing=overwrite_existing,
            start_date=period_start_date,
            end_date=period_end_date,
            append_mode=append_mode,
        )

        return {
            "success": True,
            "file_upload": blob_result,
            "order_processing": processing_result,
            "message": f"Processed {processing_result.get('orders_created', 0)} orders"
                        + (" (blob uploaded)" if blob_result else " (no blob upload)"),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading orders CSV: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")


@router.post("/upload-csv-direct")
async def upload_orders_csv_direct(
    file: UploadFile = File(...),
    location_id: int = Form(...),
    overwrite_existing: bool = Form(True),  # default to True for direct mode
    period_start_date: Optional[str] = Form(None),  # optional, used for cleanup if provided
    period_end_date: Optional[str] = Form(None),
    db: Session = Depends(deps.get_db),
):
    """
    Dev-friendly endpoint: bypass Azure entirely and load CSV straight into Postgres.
    Useful when testing locally or when Azure is unavailable.
    """
    try:
        if not file.filename.lower().endswith(".csv"):
            raise HTTPException(status_code=400, detail="Please upload a .csv file")

        content = await file.read()

        processing_result = OrderService.process_csv_and_insert_orders(
            csv_content=content,
            location_id=location_id,
            db=db,
            overwrite_existing=overwrite_existing,
            start_date=period_start_date,
            end_date=period_end_date,

        )

        return {
            "success": True,
            "message": f"Inserted {processing_result.get('orders_created', 0)} orders directly",
            "order_processing": processing_result,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading CSV directly: {e}")
        raise HTTPException(status_code=500, detail=f"Direct upload failed: {e}")


@router.get("")
async def get_orders(
    location_id: int = Query(..., description="3Cat location ID"),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(deps.get_db),
):
    """Get recent orders for a location."""
    try:
        orders = OrderService.get_orders_by_location(location_id, db, limit)
        payload = [
            {
                "id": o.id,
                "order_number": o.order_number,
                "ordered_at": o.ordered_at.isoformat() if o.ordered_at else None,
                "status": o.status,
                "customer": o.customer,
                "fulfillment": o.fulfillment,
                "items": o.items,
                "total": o.total,
                "payment_method": o.payment_method,
                "location": o.location,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in orders
        ]
        return {"success": True, "orders": payload, "count": len(payload)}
    except Exception as e:
        logger.error(f"Error getting orders: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get orders: {e}")


@router.get("/check-existing-data")
async def check_existing_data(
    location_id: int = Query(...),
    start_date: str = Query(...),
    end_date: str = Query(...),
    db: Session = Depends(deps.get_db),
):
    """Check if orders exist for the given location & date range."""
    try:
        existing = OrderService.check_existing_data_for_date_range(
            location_id=location_id,
            start_date=start_date,
            end_date=end_date,
            db=db,
        )
        return {"success": True, "existing_data": existing}
    except Exception as e:
        logger.error(f"Error checking existing data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check existing data: {e}")


@router.get("/summary")
async def get_orders_summary(
    location_id: int = Query(...),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
):
    """Summary stats for a location in an optional date range."""
    try:
        summary = OrderService.get_orders_summary_by_date_range(
            location_id, start_date, end_date, db
        )
        return {"success": True, "summary": summary}
    except Exception as e:
        logger.error(f"Error getting orders summary: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get orders summary: {e}")


@router.delete("")
async def delete_orders(
    location_id: int = Query(...),
    start_date: str = Query(...),
    end_date: str = Query(...),
    db: Session = Depends(deps.get_db),
):
    """Delete orders for a specific location within a date range."""
    try:
        result = OrderService.delete_orders_by_date_range(
            location_id=location_id,
            start_date=start_date,
            end_date=end_date,
            db=db,
        )
        return {
            "success": True,
            "message": f"Successfully deleted {result['deleted_count']} orders",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting orders: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete orders: {e}")


@router.get("/sales/hourly-weekly")
def get_hourly_and_weekly_sales(
    location_id: int,
    start_date: str,
    end_date: str,
    tz: str = "America/Los_Angeles",
    db: Session = Depends(deps.get_db)
):
    start_dt = datetime.fromisoformat(start_date)
    end_dt = datetime.fromisoformat(end_date) + timedelta(days=1)  # include end date fully

    # Truncate/group by the local (store) hour
    tz_ordered_at = func.timezone(tz, cast(Order.ordered_at, DateTime))
    hour_expr = func.date_trunc("hour", tz_ordered_at)

    # --- Current week: hourly + daily ---
    hourly_sales_rows = (
        db.query(
            hour_expr.label("hour"),
            func.sum(Order.net_sales).label("net_sales")
        )
        .filter(Order.location == location_id)
        .filter(Order.ordered_at >= start_dt)
        .filter(Order.ordered_at < end_dt)
        .group_by(hour_expr)
        .order_by(hour_expr)
        .all()
    )

    hourly_sales: dict[str, dict[int, float]] = {}
    daily_sales_current: dict[str, float] = {}
    daily_sales_source: dict[str, str] = {}

    for row in hourly_sales_rows:
        day_name = row.hour.strftime("%A")
        hour_int = row.hour.hour
        amount = float(row.net_sales or 0)
        hourly_sales.setdefault(day_name, {})[hour_int] = amount
        daily_sales_current[day_name] = daily_sales_current.get(day_name, 0.0) + amount
        daily_sales_source[day_name] = "current"

    # --- Previous week window ---
    prev_start_dt = start_dt - timedelta(days=7)
    prev_end_dt = end_dt - timedelta(days=7)

    # Previous week: hourly (same grouping expr)
    prev_hourly_rows = (
        db.query(
            hour_expr.label("hour"),
            func.sum(Order.net_sales).label("net_sales")
        )
        .filter(Order.location == location_id)
        .filter(Order.ordered_at >= prev_start_dt)
        .filter(Order.ordered_at < prev_end_dt)
        .group_by(hour_expr)
        .order_by(hour_expr)
        .all()
    )

    prev_week_hourly_sales: dict[str, dict[int, float]] = {}
    for row in prev_hourly_rows:
        day_name = row.hour.strftime("%A")
        hour_int = row.hour.hour
        amount = float(row.net_sales or 0)
        prev_week_hourly_sales.setdefault(day_name, {})[hour_int] = amount

    # Previous week: daily totals (timezone-aware to keep labels consistent)
    daily_sales_prev_rows = (
        db.query(
            func.to_char(tz_ordered_at, 'Day').label('day'),
            func.sum(Order.net_sales).label('sales')
        )
        .filter(Order.location == location_id)
        .filter(Order.ordered_at >= prev_start_dt)
        .filter(Order.ordered_at < prev_end_dt)
        .group_by(func.to_char(tz_ordered_at, 'Day'))
        .all()
    )
    daily_sales_prev = {row.day.strip(): float(row.sales or 0) for row in daily_sales_prev_rows}

    # Fill missing current-week days with previous week daily total, and mark source
    for day, prev_sales in daily_sales_prev.items():
        if daily_sales_current.get(day, 0) == 0:
            daily_sales_current[day] = prev_sales
            daily_sales_source[day] = "prev_week"

    return {
        "hourly_sales": hourly_sales,
        "daily_sales": daily_sales_current,
        "prev_week_sales": daily_sales_prev,
        "daily_sales_source": daily_sales_source,
        "prev_week_hourly_sales": prev_week_hourly_sales,  # ← NEW
    }

