# models/order.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # CSV columns (excluding "Details" as requested)
    order_number = Column(String(50), index=True)
    ordered_at = Column(DateTime)
    status = Column(String(50))
    customer = Column(String(100))
    fulfillment = Column(String(50))

    items = Column(Text)
    promotions = Column(Text)
    completion_time = Column(String(50))
    notes = Column(Text)
    scheduled = Column(String(50))
    channel = Column(String(50))
    provider = Column(String(50))
    subtotal = Column(Float)
    custom_surcharge = Column(Float)
    custom_discounts = Column(Float)
    up_charge = Column(Float)
    delivery_charge = Column(Float)
    third_party_delivery_charge = Column(Float)
    snackpass_fee = Column(Float)
    processing_fee = Column(Float)
    estimated_third_party_fees = Column(Float)
    cust_to_store_fees = Column(Float)
    tax = Column(Float)
    estimated_third_party_taxes = Column(Float)
    tips = Column(Float)
    total = Column(Float)
    net_sales = Column(Float)
    gross_sales = Column(Float)
    estimated_third_party_payout = Column(Float)
    payment_method = Column(String(50))
    cash = Column(Float)
    gift_card_redemption = Column(Float)
    store_credit_redemption = Column(Float)
    refunded_by = Column(String(100))
    refunded_amount = Column(Float)
    up_charged_by = Column(String(100))
    cash_accepted_by = Column(String(100))
    created_by = Column(String(100))
    employee = Column(String(100))
    
    # Additional column for location
    location = Column(Integer, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow) 