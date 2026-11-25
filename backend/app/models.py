
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Float,
    ForeignKey,
    DateTime
)

from backend.app.database import Base


# ==================================================
# USER MANAGEMENT
# ==================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)


# ==================================================
# PRODUCT MANAGEMENT
# ==================================================

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String)
    pack_size_grams = Column(Integer, nullable=False)
    selling_price = Column(Float, nullable=False)
    gst_rate = Column(Float, default=5.0)
    hsn_code = Column(String)
    is_active = Column(Boolean, default=True)


# ==================================================
# CUSTOMER MANAGEMENT
# ==================================================

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    customer_type = Column(String)
    phone = Column(String)
    email = Column(String)
    gstin = Column(String)
    state = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)


# ==================================================
# SALES ORDER MANAGEMENT
# ==================================================

class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, nullable=False)
    salesman_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    status = Column(String, default="pending")
    order_date = Column(DateTime, default=datetime.utcnow)
    notes = Column(String)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("sales_orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)


# ==================================================
# INVENTORY MANAGEMENT
# ==================================================

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    item_type = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    current_stock = Column(Float, default=0)
    unit_cost = Column(Float, default=0)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)


# ==================================================
# BILL OF MATERIALS
# ==================================================

class BOM(Base):
    __tablename__ = "boms"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_size = Column(Integer, default=200)
    expected_output = Column(Integer, nullable=False)


class BOMItem(Base):
    __tablename__ = "bom_items"

    id = Column(Integer, primary_key=True, index=True)
    bom_id = Column(Integer, ForeignKey("boms.id"), nullable=False)
    inventory_item_id = Column(
        Integer,
        ForeignKey("inventory_items.id"),
        nullable=False
    )
    quantity_required = Column(Float, nullable=False)


# ==================================================
# PRODUCTION MANAGEMENT
# ==================================================

class ProductionRun(Base):
    __tablename__ = "production_runs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_size = Column(Integer, nullable=False)
    expected_output = Column(Integer, nullable=False)
    actual_output = Column(Integer, default=0)
    damaged_quantity = Column(Integer, default=0)
    status = Column(String, default="completed")
    production_date = Column(DateTime, default=datetime.utcnow)


class ProductionMaterialUsage(Base):
    __tablename__ = "production_material_usage"

    id = Column(Integer, primary_key=True, index=True)

    production_run_id = Column(
        Integer,
        ForeignKey("production_runs.id"),
        nullable=False
    )

    inventory_item_id = Column(
        Integer,
        ForeignKey("inventory_items.id"),
        nullable=False
    )

    planned_quantity = Column(Float, nullable=False)
    actual_quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, default=0)
    variance_percentage = Column(Float, default=0)


# ==================================================
# PRODUCTION COSTING
# ==================================================

class ProductionCost(Base):
    __tablename__ = "production_costs"

    id = Column(Integer, primary_key=True, index=True)

    production_run_id = Column(
        Integer,
        ForeignKey("production_runs.id"),
        nullable=False,
        unique=True
    )

    material_cost = Column(Float, default=0)
    labour_cost = Column(Float, default=0)
    power_cost = Column(Float, default=0)
    gas_cost = Column(Float, default=0)
    other_overhead = Column(Float, default=0)

    total_production_cost = Column(Float, default=0)
    cost_per_packet = Column(Float, default=0)


# ==================================================
# INVENTORY STOCK LEDGER
# ==================================================

class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)

    inventory_item_id = Column(
        Integer,
        ForeignKey("inventory_items.id"),
        nullable=False
    )

    movement_type = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    source_type = Column(String)
    source_id = Column(Integer)
    unit_cost = Column(Float, default=0)
    movement_date = Column(DateTime, default=datetime.utcnow)


# ==================================================
# PURCHASE MANAGEMENT
# ==================================================

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    purchase_number = Column(String, unique=True, nullable=False)
    supplier_name = Column(String, nullable=True)
    supplier_invoice_number = Column(String, nullable=True)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    total_amount = Column(Float, default=0)
    status = Column(String, default="received")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(Integer, primary_key=True, index=True)

    purchase_id = Column(
        Integer,
        ForeignKey("purchases.id"),
        nullable=False
    )

    inventory_item_id = Column(
        Integer,
        ForeignKey("inventory_items.id"),
        nullable=False
    )

    quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, nullable=False)
    line_total = Column(Float, nullable=False)


# ==================================================
# GST INVOICE MANAGEMENT
# ==================================================

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, nullable=False)
    order_id = Column(
        Integer,
        ForeignKey("sales_orders.id"),
        nullable=False,
        unique=True
    )
    customer_id = Column(
        Integer,
        ForeignKey("customers.id"),
        nullable=False
    )

    invoice_date = Column(DateTime, default=datetime.utcnow)
    place_of_supply = Column(String, nullable=False)

    taxable_amount = Column(Float, default=0)
    gst_rate = Column(Float, default=5.0)

    cgst_amount = Column(Float, default=0)
    sgst_amount = Column(Float, default=0)
    igst_amount = Column(Float, default=0)

    total_amount = Column(Float, default=0)
    status = Column(String, default="generated")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(Integer, primary_key=True, index=True)

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=False
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False
    )

    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    taxable_amount = Column(Float, nullable=False)
    gst_rate = Column(Float, default=5.0)
    total_amount = Column(Float, nullable=False)


# ==================================================
# DISPATCH MANAGEMENT
# ==================================================

class Dispatch(Base):
    __tablename__ = "dispatches"

    id = Column(Integer, primary_key=True, index=True)

    dispatch_number = Column(String, unique=True, nullable=False)

    order_id = Column(
        Integer,
        ForeignKey("sales_orders.id"),
        nullable=False
    )

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=False
    )

    dispatch_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="dispatched")


class DispatchItem(Base):
    __tablename__ = "dispatch_items"

    id = Column(Integer, primary_key=True, index=True)

    dispatch_id = Column(
        Integer,
        ForeignKey("dispatches.id"),
        nullable=False
    )

    product_id = Column(
        Integer,
        ForeignKey("products.id"),
        nullable=False
    )

    quantity = Column(Integer, nullable=False)


# ==================================================
# CUSTOMER PAYMENT MANAGEMENT
# ==================================================

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=False
    )

    amount = Column(Float, nullable=False)
    payment_date = Column(DateTime, default=datetime.utcnow)

    payment_method = Column(String, default="cash")
    reference_number = Column(String)
    notes = Column(String)
