# services/order_service.py
import pandas as pd
import io
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.order import Order
from app.config import logger

class OrderService:
    
    @staticmethod
    def parse_money_string(money_str: str) -> float:
        """Parse money strings like '$27.80' to float"""
        if pd.isna(money_str) or money_str == '':
            return 0.0
        try:
            # Remove $ and commas, then convert to float
            cleaned = str(money_str).replace('$', '').replace(',', '').strip()
            return float(cleaned) if cleaned else 0.0
        except (ValueError, TypeError):
            return 0.0
    
    @staticmethod
    def parse_datetime(date_str: str) -> datetime:
        """Parse datetime strings like '9:40 PM 7/22/2025' to datetime object"""
        if pd.isna(date_str) or date_str == '':
            return None
        try:
            # Parse format like "9:40 PM 7/22/2025"
            return datetime.strptime(date_str, "%I:%M %p %m/%d/%Y")
        except (ValueError, TypeError):
            logger.warning(f"Could not parse datetime: {date_str}")
            return None
    
    @staticmethod
    def validate_csv_dates(csv_content: bytes, expected_start_date: str, expected_end_date: str) -> Dict[str, Any]:
        """
        Validate that CSV dates match the expected date range
        Returns validation result with min/max dates found and whether they match
        """
        try:
            from datetime import datetime, timedelta
            
            # Read CSV content
            df = pd.read_csv(io.BytesIO(csv_content))
            
            # Check if required columns exist
            if 'Ordered At' not in df.columns:
                return {
                    "valid": False,
                    "error": "CSV file does not contain 'Ordered At' column"
                }
            
            # Remove rows where all values are NaN
            df = df.dropna(how='all')
            
            # Skip the first row if it's just column headers
            if df.iloc[0]['Order #'] == 'Order #':
                df = df.iloc[1:]
            
            # Parse dates from CSV
            csv_dates = []
            for index, row in df.iterrows():
                if not pd.isna(row['Ordered At']) and row['Ordered At'] != '':
                    parsed_date = OrderService.parse_datetime(row['Ordered At'])
                    if parsed_date:
                        csv_dates.append(parsed_date)
            
            if not csv_dates:
                return {
                    "valid": False,
                    "error": "No valid dates found in CSV file"
                }
            
            # Find min and max dates in CSV
            min_csv_date = min(csv_dates)
            max_csv_date = max(csv_dates)
            
            # Convert to date only (remove time)
            min_csv_date_only = min_csv_date.date()
            max_csv_date_only = max_csv_date.date()
            
            # Parse expected dates (handle timezone issues by using local timezone)
            expected_start = datetime.strptime(expected_start_date, "%Y-%m-%d").replace(tzinfo=None).date()
            expected_end = datetime.strptime(expected_end_date, "%Y-%m-%d").replace(tzinfo=None).date()
            
            # Check if start and end dates are the same (single date selection)
            if expected_start == expected_end:
                # For single date, just check if the CSV contains data for that date
                csv_contains_target_date = (min_csv_date_only <= expected_start and max_csv_date_only >= expected_start)
                csv_exactly_matches = csv_contains_target_date
            else:
                # For date range, check if CSV dates exactly match the expected range
                csv_exactly_matches = (min_csv_date_only == expected_start and max_csv_date_only == expected_end)
            
            return {
                "valid": csv_exactly_matches,
                "csv_min_date": min_csv_date_only.isoformat(),
                "csv_max_date": max_csv_date_only.isoformat(),
                "expected_start_date": expected_start.isoformat(),
                "expected_end_date": expected_end.isoformat(),
                "csv_exactly_matches": csv_exactly_matches,
                "total_orders": len(csv_dates)
            }
            
        except Exception as e:
            logger.error(f"Error validating CSV dates: {str(e)}")
            return {
                "valid": False,
                "error": f"Error validating dates: {str(e)}"
            }
    
    @staticmethod
    def check_existing_data_for_date_range(
        location_id: int, 
        start_date: str, 
        end_date: str, 
        db: Session
    ) -> Dict[str, Any]:
        """
        Check if there are existing orders in the database for the given date range
        Returns information about existing data including dates and counts
        """
        try:
            from datetime import datetime, timedelta
            
            # Parse dates
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            
            # Query for existing orders in the date range
            existing_orders = db.query(Order).filter(
                Order.location == location_id,
                Order.ordered_at >= start_datetime,
                Order.ordered_at < end_datetime
            ).all()
            
            if not existing_orders:
                return {
                    "has_existing_data": False,
                    "existing_dates": [],
                    "total_existing_orders": 0
                }
            
            # Group orders by date and count them
            from collections import defaultdict
            date_counts = defaultdict(int)
            
            for order in existing_orders:
                if order.ordered_at:
                    date_key = order.ordered_at.date().isoformat()
                    date_counts[date_key] += 1
            
            # Convert to list of dates with counts
            existing_dates = [
                {
                    "date": date,
                    "count": count,
                    "formatted_date": datetime.strptime(date, "%Y-%m-%d").strftime("%m/%d/%Y")
                }
                for date, count in sorted(date_counts.items())
            ]
            
            return {
                "has_existing_data": True,
                "existing_dates": existing_dates,
                "total_existing_orders": len(existing_orders)
            }
            
        except Exception as e:
            logger.error(f"Error checking existing data: {str(e)}")
            return {
                "has_existing_data": False,
                "existing_dates": [],
                "total_existing_orders": 0,
                "error": str(e)
            }
    
    @staticmethod
    def process_csv_and_insert_orders(csv_content: bytes, location_id: int, db: Session, overwrite_existing: bool = False, start_date: str = None, end_date: str = None) -> Dict[str, Any]:
        """
        Process CSV content and insert all orders into the database
        """
        try:
            # Delete existing data if overwriting
            if overwrite_existing and start_date and end_date:
                from datetime import datetime, timedelta
                start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
                end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                
                # Delete existing orders in the date range
                deleted_count = db.query(Order).filter(
                    Order.location == location_id,
                    Order.ordered_at >= start_datetime,
                    Order.ordered_at < end_datetime
                ).delete()
                
                logger.info(f"Deleted {deleted_count} existing orders for overwrite")
            
            # Read CSV content
            df = pd.read_csv(io.BytesIO(csv_content))
            
            # Check if required columns exist
            required_columns = ['Order #', 'Ordered At', 'Status', 'Customer']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            # Remove rows where all values are NaN
            df = df.dropna(how='all')
            
            # Skip the first row if it's just column headers
            if df.iloc[0]['Order #'] == 'Order #':
                df = df.iloc[1:]
            
            orders_created = 0
            orders_skipped = 0
            errors = []
            
            for index, row in df.iterrows():
                try:
                    # Skip rows that don't have essential data
                    if pd.isna(row['Order #']) or row['Order #'] == '':
                        orders_skipped += 1
                        logger.info("skipping row %s because it doesn't have an order number", index)
                        continue
                    
                    # Parse the order date
                    order_datetime = OrderService.parse_datetime(row['Ordered At'])
                    if not order_datetime:
                        orders_skipped += 1
                        logger.info("skipping row %s because it doesn't have an order date", index)
                        continue
                    
                    # Filter by date range if provided
                    if start_date and end_date:
                        from datetime import datetime, timedelta
                        start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
                        end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                        
                        # Skip orders outside the selected date range
                        if order_datetime < start_datetime or order_datetime >= end_datetime:
                            orders_skipped += 1
                            logger.info("skipping row %s because it's outside the date range", index)
                            continue
                    
                    # Check if order already exists
                    existing_order = db.query(Order).filter(
                        Order.location == location_id,
                        Order.subtotal == OrderService.parse_money_string(row['Subtotal']),
                        Order.customer == str(row['Customer']) if not pd.isna(row['Customer']) else '',
                        Order.ordered_at == OrderService.parse_datetime(row['Ordered At'])
                    ).first()
                    
                    if existing_order:
                        orders_skipped += 1
                        logger.info("skipping row %s because it already exists", index)
                        continue
                    
                    # Create new order
                    order = Order(
                        order_number=str(row['Order #']),
                        ordered_at=order_datetime,
                        status=str(row['Status']) if not pd.isna(row['Status']) else '',
                        customer=str(row['Customer']) if not pd.isna(row['Customer']) else '',
                        fulfillment=str(row['Fulfillment']) if not pd.isna(row['Fulfillment']) else '',

                        items=str(row['Items']) if not pd.isna(row['Items']) else '',
                        promotions=str(row['Promotions']) if not pd.isna(row['Promotions']) else '',
                        completion_time=str(row['Completion Time']) if not pd.isna(row['Completion Time']) else '',
                        notes=str(row['Notes']) if not pd.isna(row['Notes']) else '',
                        scheduled=str(row['Scheduled']) if not pd.isna(row['Scheduled']) else '',
                        channel=str(row['Channel']) if not pd.isna(row['Channel']) else '',
                        provider=str(row['Provider']) if not pd.isna(row['Provider']) else '',
                        subtotal=OrderService.parse_money_string(row['Subtotal']),
                        custom_surcharge=OrderService.parse_money_string(row['Custom Surcharge']),
                        custom_discounts=OrderService.parse_money_string(row['Custom Discounts']),
                        up_charge=OrderService.parse_money_string(row['Up Charge']),
                        delivery_charge=OrderService.parse_money_string(row['Delivery Charge']),
                        third_party_delivery_charge=OrderService.parse_money_string(row['3P Delivery Charge']),
                        snackpass_fee=OrderService.parse_money_string(row['Snackpass Fee']),
                        processing_fee=OrderService.parse_money_string(row['Processing Fee']),
                        estimated_third_party_fees=OrderService.parse_money_string(row['Estimated Third Party Fees']),
                        cust_to_store_fees=OrderService.parse_money_string(row['Cust. To Store Fees']),
                        tax=OrderService.parse_money_string(row['Tax']),
                        estimated_third_party_taxes=OrderService.parse_money_string(row['Estimated Third-Party Taxes']),
                        tips=OrderService.parse_money_string(row['Tips']),
                        total=OrderService.parse_money_string(row['Total']),
                        net_sales=OrderService.parse_money_string(row['Net Sales']),
                        gross_sales=OrderService.parse_money_string(row['Gross Sales']),
                        estimated_third_party_payout=OrderService.parse_money_string(row['Estimated Third-Party Payout']),
                        payment_method=str(row['Payment Method']) if not pd.isna(row['Payment Method']) else '',
                        cash=OrderService.parse_money_string(row['Cash']),
                        gift_card_redemption=OrderService.parse_money_string(row['Gift Card Redemp.']),
                        store_credit_redemption=OrderService.parse_money_string(row['Store Credit Redemp.']),
                        refunded_by=str(row['Refunded By']) if not pd.isna(row['Refunded By']) else '',
                        refunded_amount=OrderService.parse_money_string(row['Refunded Amount']),
                        up_charged_by=str(row['Up-Charged By']) if not pd.isna(row['Up-Charged By']) else '',
                        cash_accepted_by=str(row['Cash Accepted By']) if not pd.isna(row['Cash Accepted By']) else '',
                        created_by=str(row['Created By']) if not pd.isna(row['Created By']) else '',
                        employee=str(row['Employee']) if not pd.isna(row['Employee']) else '',
                        location=location_id
                    )
                    
                    db.add(order)
                    orders_created += 1
                    
                except Exception as e:
                    error_msg = f"Error processing row {index + 1}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    orders_skipped += 1
                    logger.info("error processing row %s: %s", index, error_msg)
                    continue
            
            # Commit all changes
            db.commit()
            
            return {
                "success": True,
                "orders_created": orders_created,
                "orders_skipped": orders_skipped,
                "errors": errors,
                "total_rows_processed": len(df)
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error processing CSV: {str(e)}")
            raise ValueError(f"Error processing CSV file: {str(e)}")
    
    @staticmethod
    def get_orders_by_location(location_id: int, db: Session, limit: int = 100) -> List[Order]:
        """Get orders for a specific location"""
        return db.query(Order).filter(Order.location == location_id).limit(limit).all()
    
    @staticmethod
    def get_orders_summary(location_id: int, db: Session) -> Dict[str, Any]:
        """Get summary statistics for orders at a location"""
        total_orders = db.query(Order).filter(Order.location == location_id).count()
        total_sales = db.query(Order).filter(Order.location == location_id).with_entities(
            func.sum(Order.total)
        ).scalar() or 0.0
        
        return {
            "total_orders": total_orders,
            "total_sales": float(total_sales)
        }

    @staticmethod
    def get_orders_summary_by_date_range(
        location_id: int, 
        start_date: str = None, 
        end_date: str = None, 
        db: Session = None
    ) -> Dict[str, Any]:
        """Get summary statistics for orders at a location within a date range"""
        from datetime import datetime, timedelta
        
        query = db.query(Order).filter(Order.location == location_id)
        
        # Apply date filters if provided
        if start_date:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(Order.ordered_at >= start_datetime)
        
        if end_date:
            # Add one day to include the entire end date
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(Order.ordered_at < end_datetime)
        
        # Get total orders count
        total_orders = query.count()
        
        # Get aggregated sales data
        result = query.with_entities(
            func.sum(Order.total).label('total_sales'),
            func.sum(Order.subtotal).label('total_subtotal'),
            func.sum(Order.gross_sales).label('total_gross_sales'),
            func.sum(Order.net_sales).label('total_net_sales'),
            func.sum(Order.tax).label('total_tax'),
            func.sum(Order.estimated_third_party_taxes).label('total_estimated_third_party_taxes'),
            func.sum(Order.tips).label('total_tips'),
            func.sum(Order.delivery_charge).label('total_delivery_charge'),
            func.sum(Order.custom_discounts).label('total_discounts'),
            func.sum(Order.refunded_amount).label('total_refunds'),
            func.sum(Order.cash).label('total_cash'),
            func.sum(Order.gift_card_redemption).label('total_gift_card_redemption'),
            func.sum(Order.store_credit_redemption).label('total_store_credit_redemption'),
            func.sum(Order.processing_fee).label('total_processing_fees'),
            func.sum(Order.snackpass_fee).label('total_snackpass_fees')
        ).first()
        

        
        return {
            "total_orders": total_orders,
            "total_sales": float(result.total_sales or 0.0),
            "total_subtotal": float(result.total_subtotal or 0.0),
            "total_gross_sales": float(result.total_gross_sales or 0.0),
            "total_net_sales": float(result.total_net_sales or 0.0),
            "total_tax": float(result.total_tax or 0.0),
            "total_estimated_third_party_taxes": float(result.total_estimated_third_party_taxes or 0.0),
            "total_tips": float(result.total_tips or 0.0),
            "total_delivery_charge": float(result.total_delivery_charge or 0.0),
            "total_discounts": float(result.total_discounts or 0.0),
            "total_refunds": float(result.total_refunds or 0.0),
            "total_cash": float(result.total_cash or 0.0),
            "total_gift_card_redemption": float(result.total_gift_card_redemption or 0.0),
            "total_store_credit_redemption": float(result.total_store_credit_redemption or 0.0),
            "total_processing_fees": float(result.total_processing_fees or 0.0),
            "total_snackpass_fees": float(result.total_snackpass_fees or 0.0),
            "start_date": start_date,
            "end_date": end_date
        }

    @staticmethod
    def delete_orders_by_date_range(
        location_id: int,
        start_date: str,
        end_date: str,
        db: Session
    ) -> Dict[str, Any]:
        """Delete orders for a specific location within a date range"""
        from datetime import datetime, timedelta
        
        try:
            # Convert dates to datetime objects
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
            end_datetime = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            
            # Query orders to be deleted
            orders_to_delete = db.query(Order).filter(
                Order.location == location_id,
                Order.ordered_at >= start_datetime,
                Order.ordered_at < end_datetime
            )
            
            # Count orders before deletion
            orders_count = orders_to_delete.count()
            
            # Delete the orders
            deleted_count = orders_to_delete.delete()
            
            # Commit the changes
            db.commit()
            
            logger.info(f"Deleted {deleted_count} orders for location {location_id} from {start_date} to {end_date}")
            
            return {
                "success": True,
                "deleted_count": deleted_count,
                "orders_count": orders_count,
                "location_id": location_id,
                "start_date": start_date,
                "end_date": end_date
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting orders: {str(e)}")
            raise ValueError(f"Error deleting orders: {str(e)}") 