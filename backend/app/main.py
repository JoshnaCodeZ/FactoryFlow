import csv
import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from fastapi.responses import StreamingResponse
from datetime import datetime
from uuid import uuid4
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import jwt, JWTError

from backend.app.database import engine, Base, SessionLocal
from backend.app import models
from backend.app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM
)


# ==================================================
# 1. APPLICATION SETUP
# ==================================================

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FactoryFlow",
    description="Order-to-Audit Management System",
    version="1.2.0"
)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ==========================================
# CORS CONFIGURATION
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


# ==================================================
# 2. DATABASE CONNECTION
# ==================================================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==================================================
# 3. REQUEST MODELS
# ==================================================

class AdminSetup(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class EmployeeCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str


class ProductCreate(BaseModel):
    name: str
    category: str
    pack_size_grams: int
    selling_price: float
    gst_rate: float = 5.0
    hsn_code: str


class CustomerCreate(BaseModel):
    name: str
    customer_type: str
    phone: str
    email: str
    gstin: str
    state: str


class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int


class SalesOrderCreate(BaseModel):
    customer_id: int
    items: list[OrderItemCreate]
    notes: str = ""


class OrderDecision(BaseModel):
    action: str


class InventoryItemCreate(BaseModel):
    name: str
    item_type: str
    unit: str
    current_stock: float = 0
    unit_cost: float = 0
    product_id: int | None = None


class PurchaseItemCreate(BaseModel):
    inventory_item_id: int
    quantity: float
    unit_cost: float


class PurchaseCreate(BaseModel):
    supplier_name: str = ""
    supplier_invoice_number: str = ""
    items: list[PurchaseItemCreate]

class PaymentCreate(BaseModel):
    amount: float
    payment_method: str = "cash"
    reference_number: str = ""
    notes: str = ""

# BOM REQUEST MODELS

class BOMItemCreate(BaseModel):
    inventory_item_id: int
    quantity_required: float


class BOMCreate(BaseModel):
    product_id: int
    batch_size: int
    expected_output: int
    items: list[BOMItemCreate]


# ==================================================
# 4. AUTHENTICATION
# ==================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        username = payload.get("sub")

        if not username:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = db.query(models.User).filter(
        models.User.username == username
    ).first()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="User not found or inactive"
        )

    return user


# ==================================================
# 5. ROLE-BASED ACCESS CONTROL
# ==================================================

def require_role(*allowed_roles):

    def role_checker(
        current_user: models.User = Depends(get_current_user)
    ):

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Access denied. Required role: "
                    f"{', '.join(allowed_roles)}. "
                    f"Your role: {current_user.role}"
                )
            )

        return current_user

    return role_checker


# ==================================================
# 6. HOME AND HEALTH APIs
# ==================================================

@app.get("/")
def home():
    return {
        "message": "Welcome to FactoryFlow!",
        "status": "Backend is running successfully"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected"
    }


# ==================================================
# 7. ONE-TIME ADMINISTRATOR SETUP
# ==================================================

@app.post("/setup-admin")
def setup_admin(
    data: AdminSetup,
    db: Session = Depends(get_db)
):

    if db.query(models.User).count() > 0:
        raise HTTPException(
            status_code=403,
            detail="Administrator setup has already been completed."
        )

    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters."
        )

    admin = models.User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        role="admin"
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)

    return {
        "message": "Administrator created successfully",
        "username": admin.username,
        "role": admin.role
    }


# ==================================================
# 8. LOGIN API
# ==================================================

@app.post("/login")
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):

    user = db.query(models.User).filter(
        models.User.username == data.username
    ).first()

    if user is None or not verify_password(
        data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="This account is inactive"
        )

    token = create_access_token(
        user.username,
        user.role
    )

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role
    }


# ==================================================
# 9. CURRENT USER PROFILE
# ==================================================

@app.get("/me")
def my_profile(
    user: models.User = Depends(get_current_user)
):
    return {
        "username": user.username,
        "email": user.email,
        "role": user.role
    }


# ==================================================
# 10. ADMIN DASHBOARD
# ==================================================

@app.get("/admin/dashboard")
def admin_dashboard(
    user: models.User = Depends(require_role("admin"))
):
    return {
        "message": "Welcome to the Admin Dashboard",
        "access": "Administrator",
        "username": user.username
    }


# ==================================================
# 11. PRODUCTION DASHBOARD
# ==================================================

@app.get("/production/dashboard")
def production_dashboard(
    user: models.User = Depends(require_role("production"))
):
    return {
        "message": "Welcome to Production Dashboard",
        "access": "Production Supervisor",
        "username": user.username
    }


# ==================================================
# 12. SALESMAN DASHBOARD
# ==================================================

@app.get("/sales/dashboard")
def sales_dashboard(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("salesman"))
):
    orders = (
        db.query(models.SalesOrder)
        .filter(models.SalesOrder.salesman_id == user.id)
        .order_by(models.SalesOrder.order_date.desc())
        .all()
    )

    total_orders = len(orders)
    pending_orders = sum(1 for order in orders if order.status == "pending")
    approved_orders = sum(1 for order in orders if order.status == "approved")

    total_sales = 0
    total_items = 0
    recent_orders = []

    for order in orders:
        items = (
            db.query(models.OrderItem)
            .filter(models.OrderItem.order_id == order.id)
            .all()
        )

        order_total = sum(item.quantity * item.unit_price for item in items)
        item_count = sum(item.quantity for item in items)

        total_sales += order_total
        total_items += item_count

        if len(recent_orders) < 5:
            customer = db.query(models.Customer).filter(
                models.Customer.id == order.customer_id
            ).first()

            recent_orders.append({
                "order_number": order.order_number,
                "customer": customer.name if customer else "Unknown",
                "status": order.status,
                "order_date": order.order_date.isoformat() if order.order_date else None,
                "quantity": item_count,
                "total_amount": round(order_total, 2)
            })

    return {
        "message": "Welcome to Sales Dashboard",
        "access": "Salesman",
        "username": user.username,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "approved_orders": approved_orders,
        "total_items": total_items,
        "total_sales": round(total_sales, 2),
        "recent_orders": recent_orders
    }



# ==================================================
# 13. ACCOUNTANT DASHBOARD
# ==================================================

@app.get("/accountant/dashboard")
def accountant_dashboard(
    user: models.User = Depends(require_role("accountant"))
):
    return {
        "message": "Welcome to Accountant Dashboard",
        "access": "Accountant",
        "username": user.username
    }


# ==================================================
# 14. OWNER DASHBOARD
# ==================================================

@app.get("/owner/dashboard")
def owner_dashboard(
    user: models.User = Depends(require_role("owner"))
):
    return {
        "message": "Welcome to Owner Dashboard",
        "access": "Owner",
        "username": user.username
    }


# ==================================================
# 15. CREATE EMPLOYEE ACCOUNT
# ==================================================

@app.post("/admin/create-employee")
def create_employee(
    data: EmployeeCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role("admin"))
):

    allowed_roles = [
        "salesman",
        "production",
        "accountant",
        "owner"
    ]

    if data.role not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Invalid employee role"
        )

    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters"
        )

    existing_username = db.query(models.User).filter(
        models.User.username == data.username
    ).first()

    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    existing_email = db.query(models.User).filter(
        models.User.email == data.email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    employee = models.User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=data.role
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    return {
        "message": "Employee created successfully",
        "employee": {
            "id": employee.id,
            "username": employee.username,
            "email": employee.email,
            "role": employee.role
        }
    }


# ==================================================
# 16. PRODUCT MANAGEMENT
# ==================================================

@app.post("/admin/products")
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):

    if product.pack_size_grams <= 0 or product.selling_price < 0:
        raise HTTPException(
            status_code=400,
            detail="Pack size must be positive and price cannot be negative"
        )

    if product.gst_rate < 0:
        raise HTTPException(
            status_code=400,
            detail="GST rate cannot be negative"
        )

    new_product = models.Product(
        name=product.name,
        category=product.category,
        pack_size_grams=product.pack_size_grams,
        selling_price=product.selling_price,
        gst_rate=product.gst_rate,
        hsn_code=product.hsn_code
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return {
        "message": "Product created successfully",
        "product": {
            "id": new_product.id,
            "name": new_product.name,
            "category": new_product.category,
            "pack_size_grams": new_product.pack_size_grams,
            "selling_price": new_product.selling_price,
            "gst_rate": new_product.gst_rate,
            "hsn_code": new_product.hsn_code
        }
    }


# ==================================================
# 17. VIEW PRODUCTS
# ==================================================

@app.get("/products")
def get_products(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    products = db.query(models.Product).filter(
        models.Product.is_active == True
    ).all()

    return {
        "total_products": len(products),
        "products": [
            {
                "id": product.id,
                "name": product.name,
                "category": product.category,
                "pack_size_grams": product.pack_size_grams,
                "selling_price": product.selling_price,
                "gst_rate": product.gst_rate,
                "hsn_code": product.hsn_code
            }
            for product in products
        ]
    }


# ==================================================
# 18. CUSTOMER MANAGEMENT
# ==================================================

@app.post("/admin/customers")
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):

    new_customer = models.Customer(
        name=customer.name,
        customer_type=customer.customer_type,
        phone=customer.phone,
        email=customer.email,
        gstin=customer.gstin,
        state=customer.state
    )

    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)

    return {
        "message": "Customer created successfully",
        "customer": {
            "id": new_customer.id,
            "name": new_customer.name,
            "customer_type": new_customer.customer_type,
            "state": new_customer.state
        }
    }


# ==================================================
# 19. VIEW CUSTOMERS
# ==================================================

@app.get("/customers")
def get_customers(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    customers = db.query(models.Customer).filter(
        models.Customer.is_active == True
    ).all()

    return {
        "total_customers": len(customers),
        "customers": [
            {
                "id": customer.id,
                "name": customer.name,
                "customer_type": customer.customer_type,
                "phone": customer.phone,
                "email": customer.email,
                "gstin": customer.gstin,
                "state": customer.state
            }
            for customer in customers
        ]
    }


# ==================================================
# 20. SALES ORDER MANAGEMENT
# ==================================================

@app.post("/sales/orders")
def create_sales_order(
    order: SalesOrderCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("salesman"))
):

    if not order.items:
        raise HTTPException(
            status_code=400,
            detail="An order must contain at least one item"
        )

    customer = db.query(models.Customer).filter(
        models.Customer.id == order.customer_id,
        models.Customer.is_active == True
    ).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    new_order = models.SalesOrder(
        order_number=f"ORD-{uuid4().hex[:8].upper()}",
        salesman_id=current_user.id,
        customer_id=customer.id,
        status="pending",
        notes=order.notes
    )

    db.add(new_order)
    db.flush()

    total_amount = 0

    for item in order.items:

        if item.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Quantity must be greater than zero"
            )

        product = db.query(models.Product).filter(
            models.Product.id == item.product_id,
            models.Product.is_active == True
        ).first()

        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product {item.product_id} not found"
            )

        db.add(models.OrderItem(
            order_id=new_order.id,
            product_id=product.id,
            quantity=item.quantity,
            unit_price=product.selling_price
        ))

        total_amount += item.quantity * product.selling_price

    db.commit()
    db.refresh(new_order)

    return {
        "message": "Order submitted successfully",
        "order_number": new_order.order_number,
        "status": new_order.status,
        "customer": customer.name,
        "total_amount": round(total_amount, 2)
    }

@app.get("/sales/orders")
def get_sales_orders(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("salesman"))
):
    orders = db.query(models.SalesOrder).filter(
        models.SalesOrder.salesman_id == current_user.id
    ).order_by(
        models.SalesOrder.id.desc()
    ).all()

    result = []

    for order in orders:
        customer = db.query(models.Customer).filter(
            models.Customer.id == order.customer_id
        ).first()

        items = db.query(models.OrderItem).filter(
            models.OrderItem.order_id == order.id
        ).all()

        total_quantity = sum(item.quantity for item in items)

        total_amount = sum(
            item.quantity * item.unit_price for item in items
        )

        result.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "customer": customer.name if customer else "Unknown",
            "order_date": order.created_at.isoformat() if order.created_at else None,
            "quantity": total_quantity,
            "total_amount": round(total_amount, 2),
            "status": order.status
        })

    return {
        "total_orders": len(result),
        "orders": result
    }
# ==================================================
# 21. ADMIN VIEW ALL SALES ORDERS
# ==================================================

@app.get("/admin/orders")
def get_all_orders(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):

    orders = db.query(models.SalesOrder).order_by(
        models.SalesOrder.id.desc()
    ).all()

    result = []

    for order in orders:

        customer = db.query(models.Customer).filter(
            models.Customer.id == order.customer_id
        ).first()

        salesman = db.query(models.User).filter(
            models.User.id == order.salesman_id
        ).first()

        items = db.query(models.OrderItem).filter(
            models.OrderItem.order_id == order.id
        ).all()

        order_items = []

        for item in items:

            product = db.query(models.Product).filter(
                models.Product.id == item.product_id
            ).first()

            order_items.append({
                "product": product.name if product else "Unknown",
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "subtotal": round(item.quantity * item.unit_price, 2)
            })

        result.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "customer": customer.name if customer else "Unknown",
            "salesman": salesman.username if salesman else "Unknown",
            "status": order.status,
            "items": order_items
        })

    return {
        "total_orders": len(result),
        "orders": result
    }


# ==================================================
# 22. ADMIN APPROVE / REJECT ORDERS
# ==================================================


# ==================================================
# 22. ADMIN APPROVE / REJECT ORDERS
# ==================================================

@app.put("/admin/orders/{order_id}/decision")
def decide_order(
    order_id: int,
    decision: OrderDecision,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):
    try:
        # Fetch the latest database value.
        order = (
            db.query(models.SalesOrder)
            .filter(models.SalesOrder.id == order_id)
            .populate_existing()
            .first()
        )

        if not order:
            raise HTTPException(
                status_code=404,
                detail=f"Order ID {order_id} not found"
            )

        current_status = (order.status or "").strip().lower()

        print(
            "DEBUG - Order ID:", order.id,
            "| Stored status:", repr(order.status),
            "| Normalized status:", repr(current_status)
        )

        if current_status != "pending":
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Only pending orders can be processed",
                    "order_id": order.id,
                    "actual_status": repr(order.status)
                }
            )

        action = decision.action.strip().lower()

        if action not in ["approve", "reject"]:
            raise HTTPException(
                status_code=400,
                detail="Action must be approve or reject"
            )

        if action == "approve":

            order_items = (
                db.query(models.OrderItem)
                .filter(models.OrderItem.order_id == order.id)
                .all()
            )

            if not order_items:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot approve an order without items"
                )

            # Combine quantities if the same product
            # appears in multiple order lines.
            requested_quantities = {}

            for line in order_items:
                requested_quantities[line.product_id] = (
                    requested_quantities.get(line.product_id, 0)
                    + line.quantity
                )

            shortages = []

            for product_id, requested_quantity in (
                requested_quantities.items()
            ):

                finished_goods = (
                    db.query(models.InventoryItem)
                    .filter(
                        models.InventoryItem.product_id == product_id,
                        models.InventoryItem.item_type == "finished_goods"
                    )
                    .first()
                )

                if not finished_goods:
                    raise HTTPException(
                        status_code=404,
                        detail=(
                            "Finished goods inventory not found "
                            f"for product ID {product_id}"
                        )
                    )

                approved_items = (
                    db.query(models.OrderItem)
                    .join(
                        models.SalesOrder,
                        models.OrderItem.order_id
                        == models.SalesOrder.id
                    )
                    .filter(
                        models.OrderItem.product_id == product_id,
                        models.SalesOrder.status == "approved",
                        models.SalesOrder.id != order.id
                    )
                    .all()
                )

                reserved_quantity = sum(
                    item.quantity for item in approved_items
                )

                physical_stock = finished_goods.current_stock or 0

                available_quantity = (
                    physical_stock - reserved_quantity
                )

                if requested_quantity > available_quantity:
                    shortages.append({
                        "product_id": product_id,
                        "requested_quantity": requested_quantity,
                        "physical_stock": physical_stock,
                        "already_reserved": reserved_quantity,
                        "available_quantity": max(
                            0, available_quantity
                        ),
                        "shortage_quantity": max(
                            0,
                            requested_quantity - available_quantity
                        )
                    })

            if shortages:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": "Insufficient finished goods stock",
                        "shortages": shortages
                    }
                )

            order.status = "approved"

        else:
            order.status = "rejected"

        db.commit()
        db.refresh(order)

        return {
            "message": f"Order {action}d successfully",
            "order_id": order.id,
            "order_number": order.order_number,
            "status": order.status
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as error:
        db.rollback()
        print("ORDER DECISION ERROR:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to process the order. Check server logs."
        )


# ==================================================
# SALESMAN: VIEW ONLY THEIR OWN ORDERS
# ==================================================

@app.get("/sales/orders")
def get_salesman_orders(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("salesman"))
):
    orders = (
        db.query(models.SalesOrder)
        .filter(models.SalesOrder.salesman_id == current_user.id)
        .order_by(models.SalesOrder.id.desc())
        .all()
    )

    result = []

    for order in orders:
        customer = db.query(models.Customer).filter(
            models.Customer.id == order.customer_id
        ).first()

        items = db.query(models.OrderItem).filter(
            models.OrderItem.order_id == order.id
        ).all()

        order_items = []
        total_amount = 0
        total_quantity = 0

        for item in items:
            product = db.query(models.Product).filter(
                models.Product.id == item.product_id
            ).first()

            subtotal = item.quantity * item.unit_price
            total_amount += subtotal
            total_quantity += item.quantity

            order_items.append({
                "product_id": item.product_id,
                "product": product.name if product else "Unknown",
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "subtotal": round(subtotal, 2)
            })

        result.append({
            "order_id": order.id,
            "order_number": order.order_number,
            "customer": customer.name if customer else "Unknown",
            "status": order.status,
            "order_date": (
                order.order_date.isoformat()
                if order.order_date else None
            ),
            "quantity": total_quantity,
            "total_amount": round(total_amount, 2),
            "items": order_items
        })

    return {
        "total_orders": len(result),
        "orders": result
    }


# ==================================================
# 23. INVENTORY ITEM MANAGEMENT
# ==================================================

@app.post("/admin/inventory")
def create_inventory_item(
    item: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):

    if item.current_stock < 0:
        raise HTTPException(
            status_code=400,
            detail="Opening stock cannot be negative"
        )

    if item.unit_cost < 0:
        raise HTTPException(
            status_code=400,
            detail="Unit cost cannot be negative"
        )

    if not item.name.strip():
        raise HTTPException(
            status_code=400,
            detail="Inventory item name is required"
        )

    if not item.unit.strip():
        raise HTTPException(
            status_code=400,
            detail="Inventory unit is required"
        )

    existing_item = db.query(models.InventoryItem).filter(
        models.InventoryItem.name.ilike(item.name.strip())
    ).first()

    if existing_item:
        raise HTTPException(
            status_code=400,
            detail="Inventory item already exists"
        )

    if item.product_id is not None:
        product = db.query(models.Product).filter(
            models.Product.id == item.product_id
        ).first()

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Linked product not found"
            )

    new_item = models.InventoryItem(
        name=item.name.strip(),
        item_type=item.item_type.strip().lower(),
        unit=item.unit.strip(),
        current_stock=item.current_stock,
        unit_cost=item.unit_cost,
        product_id=item.product_id
    )

    try:
        db.add(new_item)
        db.flush()

        if item.current_stock > 0:
            opening_movement = models.StockMovement(
                inventory_item_id=new_item.id,
                movement_type="opening_balance",
                quantity=item.current_stock,
                source_type="opening_stock",
                source_id=new_item.id,
                unit_cost=item.unit_cost
            )
            db.add(opening_movement)

        db.commit()
        db.refresh(new_item)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create inventory item"
        )

    return {
        "message": "Inventory item created successfully",
        "item": {
            "id": new_item.id,
            "name": new_item.name,
            "item_type": new_item.item_type,
            "unit": new_item.unit,
            "current_stock": new_item.current_stock,
            "unit_cost": new_item.unit_cost,
            "product_id": new_item.product_id
        }
    }


# ==================================================
# 24. VIEW ALL INVENTORY ITEMS
# ==================================================

@app.get("/inventory")
def get_inventory(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(
            "admin",
            "production",
            "owner",
            "accountant"
        )
    )
):

    items = db.query(models.InventoryItem).order_by(
        models.InventoryItem.id
    ).all()

    return {
        "total_items": len(items),
        "items": [
            {
                "id": item.id,
                "name": item.name,
                "item_type": item.item_type,
                "unit": item.unit,
                "current_stock": item.current_stock,
                "unit_cost": item.unit_cost,
                "product_id": item.product_id
            }
            for item in items
        ]
    }


# ==================================================
# 25. VIEW STOCK MOVEMENT LEDGER
# ==================================================

@app.get("/inventory/{item_id}/movements")
def get_inventory_movements(
    item_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(
            "admin",
            "production",
            "owner",
            "accountant"
        )
    )
):

    inventory_item = db.query(models.InventoryItem).filter(
        models.InventoryItem.id == item_id
    ).first()

    if not inventory_item:
        raise HTTPException(
            status_code=404,
            detail="Inventory item not found"
        )

    movements = db.query(models.StockMovement).filter(
        models.StockMovement.inventory_item_id == item_id
    ).order_by(
        models.StockMovement.movement_date.desc()
    ).all()

    return {
        "inventory_item": inventory_item.name,
        "current_stock": inventory_item.current_stock,
        "unit": inventory_item.unit,
        "total_movements": len(movements),
        "movements": [
            {
                "movement_id": movement.id,
                "movement_type": movement.movement_type,
                "quantity": movement.quantity,
                "source_type": movement.source_type,
                "source_id": movement.source_id,
                "unit_cost": movement.unit_cost,
                "movement_date": movement.movement_date
            }
            for movement in movements
        ]
    }


# ==================================================
# 26. RECORD A PURCHASE AND RECEIVE STOCK
# ==================================================

@app.post("/admin/purchases")
def create_purchase(
    purchase: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):

    if not purchase.items:
        raise HTTPException(
            status_code=400,
            detail="A purchase must contain at least one item"
        )

    validated_items = []
    total_amount = 0.0

    for line in purchase.items:

        if line.quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Purchase quantity must be greater than zero"
            )

        if line.unit_cost < 0:
            raise HTTPException(
                status_code=400,
                detail="Purchase unit cost cannot be negative"
            )

        inventory_item = db.query(models.InventoryItem).filter(
            models.InventoryItem.id == line.inventory_item_id
        ).first()

        if not inventory_item:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Inventory item {line.inventory_item_id} "
                    f"was not found"
                )
            )

        line_total = line.quantity * line.unit_cost
        total_amount += line_total

        validated_items.append({
            "inventory_item": inventory_item,
            "quantity": line.quantity,
            "unit_cost": line.unit_cost,
            "line_total": line_total
        })

    purchase_number = f"PUR-{uuid4().hex[:8].upper()}"

    new_purchase = models.Purchase(
        purchase_number=purchase_number,
        supplier_name=purchase.supplier_name.strip() or None,
        supplier_invoice_number=(
            purchase.supplier_invoice_number.strip() or None
        ),
        total_amount=round(total_amount, 2),
        status="received"
    )

    try:
        db.add(new_purchase)
        db.flush()

        received_lines = []

        for line in validated_items:

            inventory_item = line["inventory_item"]
            quantity = line["quantity"]
            unit_cost = line["unit_cost"]
            line_total = line["line_total"]

            old_stock = inventory_item.current_stock or 0
            old_cost = inventory_item.unit_cost or 0

            new_stock = old_stock + quantity

            new_average_cost = (
                (old_stock * old_cost) +
                (quantity * unit_cost)
            ) / new_stock

            inventory_item.current_stock = round(new_stock, 4)
            inventory_item.unit_cost = round(new_average_cost, 4)

            purchase_line = models.PurchaseItem(
                purchase_id=new_purchase.id,
                inventory_item_id=inventory_item.id,
                quantity=quantity,
                unit_cost=unit_cost,
                line_total=round(line_total, 2)
            )
            db.add(purchase_line)

            movement = models.StockMovement(
                inventory_item_id=inventory_item.id,
                movement_type="purchase_receipt",
                quantity=quantity,
                source_type="purchase",
                source_id=new_purchase.id,
                unit_cost=unit_cost
            )
            db.add(movement)

            received_lines.append({
                "inventory_item_id": inventory_item.id,
                "item_name": inventory_item.name,
                "quantity_received": quantity,
                "unit": inventory_item.unit,
                "purchase_rate": unit_cost,
                "line_total": round(line_total, 2),
                "new_stock": round(inventory_item.current_stock, 4),
                "new_weighted_average_cost": round(
                    inventory_item.unit_cost,
                    4
                )
            })

        db.commit()
        db.refresh(new_purchase)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Purchase could not be saved. No stock was changed."
        )

    return {
        "message": "Purchase recorded and stock received successfully",
        "purchase_number": new_purchase.purchase_number,
        "supplier_name": new_purchase.supplier_name,
        "total_amount": round(new_purchase.total_amount, 2),
        "status": new_purchase.status,
        "items": received_lines
    }


# ==================================================
# 27. VIEW PURCHASE HISTORY
# ==================================================

@app.get("/admin/purchases")
def get_purchases(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("admin", "owner", "accountant")
    )
):

    purchases = db.query(models.Purchase).order_by(
        models.Purchase.id.desc()
    ).all()

    result = []

    for purchase in purchases:

        purchase_items = db.query(models.PurchaseItem).filter(
            models.PurchaseItem.purchase_id == purchase.id
        ).all()

        items = []

        for line in purchase_items:

            inventory_item = db.query(
                models.InventoryItem
            ).filter(
                models.InventoryItem.id == line.inventory_item_id
            ).first()

            items.append({
                "item_name": (
                    inventory_item.name if inventory_item else "Unknown"
                ),
                "quantity": line.quantity,
                "unit": (
                    inventory_item.unit if inventory_item else None
                ),
                "unit_cost": line.unit_cost,
                "line_total": line.line_total
            })

        result.append({
            "purchase_id": purchase.id,
            "purchase_number": purchase.purchase_number,
            "supplier_name": purchase.supplier_name,
            "supplier_invoice_number": purchase.supplier_invoice_number,
            "purchase_date": purchase.purchase_date,
            "total_amount": purchase.total_amount,
            "status": purchase.status,
            "items": items
        })

    return {
        "total_purchases": len(result),
        "purchases": result
    }


# ==================================================
# 28. CREATE BILL OF MATERIALS (BOM)
# ==================================================

@app.post("/admin/boms")
def create_bom(
    data: BOMCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):

    # Validate batch details.
    if data.batch_size <= 0:
        raise HTTPException(
            status_code=400,
            detail="Batch size must be greater than zero"
        )

    if data.expected_output <= 0:
        raise HTTPException(
            status_code=400,
            detail="Expected output must be greater than zero"
        )

    if not data.items:
        raise HTTPException(
            status_code=400,
            detail="A BOM must contain at least one material"
        )

    # Check that the finished product exists.
    product = db.query(models.Product).filter(
        models.Product.id == data.product_id,
        models.Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    # Prevent multiple BOMs for the same product for now.
    existing_bom = db.query(models.BOM).filter(
        models.BOM.product_id == data.product_id
    ).first()

    if existing_bom:
        raise HTTPException(
            status_code=400,
            detail="A BOM already exists for this product"
        )

    # Validate every material before saving anything.
    validated_items = []
    used_inventory_ids = set()

    for line in data.items:

        if line.quantity_required <= 0:
            raise HTTPException(
                status_code=400,
                detail="Required material quantity must be greater than zero"
            )

        if line.inventory_item_id in used_inventory_ids:
            raise HTTPException(
                status_code=400,
                detail="The same inventory item cannot appear twice in a BOM"
            )

        used_inventory_ids.add(line.inventory_item_id)

        inventory_item = db.query(models.InventoryItem).filter(
            models.InventoryItem.id == line.inventory_item_id
        ).first()

        if not inventory_item:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Inventory item {line.inventory_item_id} "
                    f"was not found"
                )
            )

        validated_items.append({
            "inventory_item": inventory_item,
            "quantity_required": line.quantity_required
        })

    # Save BOM and its material requirements together.
    try:
        new_bom = models.BOM(
            product_id=data.product_id,
            batch_size=data.batch_size,
            expected_output=data.expected_output
        )

        db.add(new_bom)
        db.flush()

        saved_materials = []

        for line in validated_items:

            inventory_item = line["inventory_item"]
            quantity_required = line["quantity_required"]

            bom_item = models.BOMItem(
                bom_id=new_bom.id,
                inventory_item_id=inventory_item.id,
                quantity_required=quantity_required
            )

            db.add(bom_item)

            saved_materials.append({
                "inventory_item_id": inventory_item.id,
                "material_name": inventory_item.name,
                "quantity_required": quantity_required,
                "unit": inventory_item.unit
            })

        db.commit()
        db.refresh(new_bom)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="BOM could not be saved"
        )

    return {
        "message": "Bill of Materials created successfully",
        "bom_id": new_bom.id,
        "product_id": product.id,
        "product_name": product.name,
        "batch_size": new_bom.batch_size,
        "expected_output": new_bom.expected_output,
        "materials": saved_materials
    }


# ==================================================
# 29. VIEW ALL BOMS
# ==================================================

@app.get("/boms")
def get_all_boms(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("admin", "production", "owner", "accountant")
    )
):

    boms = db.query(models.BOM).order_by(
        models.BOM.id.desc()
    ).all()

    result = []

    for bom in boms:

        product = db.query(models.Product).filter(
            models.Product.id == bom.product_id
        ).first()

        materials = db.query(models.BOMItem).filter(
            models.BOMItem.bom_id == bom.id
        ).all()

        material_list = []

        for line in materials:

            inventory_item = db.query(
                models.InventoryItem
            ).filter(
                models.InventoryItem.id == line.inventory_item_id
            ).first()

            material_list.append({
                "inventory_item_id": line.inventory_item_id,
                "material_name": (
                    inventory_item.name if inventory_item else "Unknown"
                ),
                "quantity_required": line.quantity_required,
                "unit": (
                    inventory_item.unit if inventory_item else None
                )
            })

        result.append({
            "bom_id": bom.id,
            "product_id": bom.product_id,
            "product_name": product.name if product else "Unknown",
            "batch_size": bom.batch_size,
            "expected_output": bom.expected_output,
            "materials": material_list
        })

    return {
        "total_boms": len(result),
        "boms": result
    }


# ==================================================
# 30. VIEW ONE BOM
# ==================================================

@app.get("/boms/{bom_id}")
def get_bom(
    bom_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("admin", "production", "owner", "accountant")
    )
):

    bom = db.query(models.BOM).filter(
        models.BOM.id == bom_id
    ).first()

    if not bom:
        raise HTTPException(
            status_code=404,
            detail="BOM not found"
        )

    product = db.query(models.Product).filter(
        models.Product.id == bom.product_id
    ).first()

    materials = db.query(models.BOMItem).filter(
        models.BOMItem.bom_id == bom.id
    ).all()

    material_list = []

    for line in materials:

        inventory_item = db.query(
            models.InventoryItem
        ).filter(
            models.InventoryItem.id == line.inventory_item_id
        ).first()

        material_list.append({
            "inventory_item_id": line.inventory_item_id,
            "material_name": (
                inventory_item.name if inventory_item else "Unknown"
            ),
            "quantity_required": line.quantity_required,
            "unit": (
                inventory_item.unit if inventory_item else None
            )
        })

    return {
        "bom_id": bom.id,
        "product_id": bom.product_id,
        "product_name": product.name if product else "Unknown",
        "batch_size": bom.batch_size,
        "expected_output": bom.expected_output,
        "materials": material_list
    }

# ==================================================
# 31. PRODUCTION RUN REQUEST MODELS
# ==================================================

class ProductionMaterialInput(BaseModel):
    inventory_item_id: int
    actual_quantity: float


class ProductionRunCreate(BaseModel):
    product_id: int
    batch_size: int
    actual_output: int
    damaged_quantity: int = 0
    materials: list[ProductionMaterialInput]

    labour_cost: float = 0
    power_cost: float = 0
    gas_cost: float = 0
    other_overhead: float = 0


# ==================================================
# 32. CREATE PRODUCTION RUN
# ==================================================

@app.post("/production/runs")
def create_production_run(
    data: ProductionRunCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "production"))
):

    # ----------------------------------------------
    # A. Validate production input
    # ----------------------------------------------

    if data.batch_size <= 0:
        raise HTTPException(
            status_code=400,
            detail="Batch size must be greater than zero"
        )

    if data.actual_output <= 0:
        raise HTTPException(
            status_code=400,
            detail="Actual output must be greater than zero"
        )

    if data.damaged_quantity < 0:
        raise HTTPException(
            status_code=400,
            detail="Damaged quantity cannot be negative"
        )

    costs = [
        data.labour_cost,
        data.power_cost,
        data.gas_cost,
        data.other_overhead
    ]

    if any(cost < 0 for cost in costs):
        raise HTTPException(
            status_code=400,
            detail="Production costs cannot be negative"
        )

    # ----------------------------------------------
    # B. Find product and BOM
    # ----------------------------------------------

    product = db.query(models.Product).filter(
        models.Product.id == data.product_id,
        models.Product.is_active == True
    ).first()

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    bom = db.query(models.BOM).filter(
        models.BOM.product_id == data.product_id
    ).first()

    if not bom:
        raise HTTPException(
            status_code=404,
            detail="Bill of Materials not found for this product"
        )

    if data.batch_size % bom.batch_size != 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "Production batch size must be a whole multiple "
                "of the BOM batch size"
            )
        )

    batch_multiplier = data.batch_size / bom.batch_size

    expected_output = int(
        bom.expected_output * batch_multiplier
    )

    # ----------------------------------------------
    # C. Load BOM materials
    # ----------------------------------------------

    bom_items = db.query(models.BOMItem).filter(
        models.BOMItem.bom_id == bom.id
    ).all()

    if not bom_items:
        raise HTTPException(
            status_code=400,
            detail="BOM contains no materials"
        )

    planned_materials = {}

    for bom_item in bom_items:
        planned_materials[bom_item.inventory_item_id] = (
            bom_item.quantity_required * batch_multiplier
        )

    supplied_ids = [
        material.inventory_item_id
        for material in data.materials
    ]

    if len(supplied_ids) != len(set(supplied_ids)):
        raise HTTPException(
            status_code=400,
            detail="A material cannot be entered more than once"
        )

    if set(supplied_ids) != set(planned_materials.keys()):
        raise HTTPException(
            status_code=400,
            detail=(
                "Submitted materials must exactly match "
                "the materials defined in the BOM"
            )
        )

    # ----------------------------------------------
    # D. Validate stock and calculate material costs
    # ----------------------------------------------

    validated_materials = []
    total_material_cost = 0.0

    for material in data.materials:

        if material.actual_quantity <= 0:
            raise HTTPException(
                status_code=400,
                detail="Actual material quantity must be greater than zero"
            )

        inventory_item = db.query(
            models.InventoryItem
        ).filter(
            models.InventoryItem.id == material.inventory_item_id
        ).first()

        if not inventory_item:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"Inventory item {material.inventory_item_id} "
                    "not found"
                )
            )

        if inventory_item.current_stock < material.actual_quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient stock for {inventory_item.name}. "
                    f"Available: {inventory_item.current_stock} "
                    f"{inventory_item.unit}, "
                    f"Required: {material.actual_quantity} "
                    f"{inventory_item.unit}"
                )
            )

        planned_quantity = planned_materials[
            material.inventory_item_id
        ]

        unit_cost = inventory_item.unit_cost or 0

        material_cost = material.actual_quantity * unit_cost

        variance_percentage = (
            (material.actual_quantity - planned_quantity)
            / planned_quantity
        ) * 100

        total_material_cost += material_cost

        validated_materials.append({
            "inventory_item": inventory_item,
            "planned_quantity": planned_quantity,
            "actual_quantity": material.actual_quantity,
            "unit_cost": unit_cost,
            "material_cost": material_cost,
            "variance_percentage": variance_percentage
        })

    # ----------------------------------------------
    # E. Find finished goods inventory
    # ----------------------------------------------

    finished_goods = db.query(
        models.InventoryItem
    ).filter(
        models.InventoryItem.product_id == product.id,
        models.InventoryItem.item_type == "finished_goods"
    ).first()

    if not finished_goods:
        raise HTTPException(
            status_code=404,
            detail=(
                "Finished goods inventory not found. "
                "Create a finished goods inventory item first."
            )
        )

    # ----------------------------------------------
    # F. Calculate production cost
    # ----------------------------------------------

    total_overhead = (
        data.labour_cost
        + data.power_cost
        + data.gas_cost
        + data.other_overhead
    )

    total_production_cost = (
        total_material_cost + total_overhead
    )

    cost_per_packet = (
        total_production_cost / data.actual_output
    )

    yield_variance_percentage = (
        (data.actual_output - expected_output)
        / expected_output
    ) * 100

    # ----------------------------------------------
    # G. Save production run and stock movements
    # ----------------------------------------------

    try:

        production_run = models.ProductionRun(
            product_id=product.id,
            batch_size=data.batch_size,
            expected_output=expected_output,
            actual_output=data.actual_output,
            damaged_quantity=data.damaged_quantity,
            status="completed"
        )

        db.add(production_run)
        db.flush()

        material_results = []
        alerts = []

        for line in validated_materials:

            inventory_item = line["inventory_item"]

            # Deduct consumed raw material.
            inventory_item.current_stock = round(
                inventory_item.current_stock
                - line["actual_quantity"],
                4
            )

            usage = models.ProductionMaterialUsage(
                production_run_id=production_run.id,
                inventory_item_id=inventory_item.id,
                planned_quantity=line["planned_quantity"],
                actual_quantity=line["actual_quantity"],
                unit_cost=line["unit_cost"],
                variance_percentage=round(
                    line["variance_percentage"], 2
                )
            )

            db.add(usage)

            # Negative quantity represents stock consumption.
            movement = models.StockMovement(
                inventory_item_id=inventory_item.id,
                movement_type="production_issue",
                quantity=-line["actual_quantity"],
                source_type="production_run",
                source_id=production_run.id,
                unit_cost=line["unit_cost"]
            )

            db.add(movement)

            if abs(line["variance_percentage"]) > 3:
                alerts.append({
                    "type": "material_variance",
                    "material": inventory_item.name,
                    "variance_percentage": round(
                        line["variance_percentage"], 2
                    ),
                    "message": "Material consumption variance exceeds 3%"
                })

            material_results.append({
                "material": inventory_item.name,
                "planned_quantity": line["planned_quantity"],
                "actual_quantity": line["actual_quantity"],
                "unit": inventory_item.unit,
                "unit_cost": line["unit_cost"],
                "material_cost": round(line["material_cost"], 2),
                "variance_percentage": round(
                    line["variance_percentage"], 2
                ),
                "closing_stock": inventory_item.current_stock
            })

        # Add actual good production to finished goods stock.
        old_finished_stock = finished_goods.current_stock or 0
        old_finished_cost = finished_goods.unit_cost or 0

        new_finished_stock = (
            old_finished_stock + data.actual_output
        )

        # Weighted average finished goods valuation.
        new_finished_cost = (
            (old_finished_stock * old_finished_cost)
            + total_production_cost
        ) / new_finished_stock

        finished_goods.current_stock = new_finished_stock
        finished_goods.unit_cost = round(new_finished_cost, 4)

        finished_movement = models.StockMovement(
            inventory_item_id=finished_goods.id,
            movement_type="production_output",
            quantity=data.actual_output,
            source_type="production_run",
            source_id=production_run.id,
            unit_cost=round(cost_per_packet, 4)
        )

        db.add(finished_movement)

        # Save production cost breakdown.
        production_cost = models.ProductionCost(
            production_run_id=production_run.id,
            material_cost=round(total_material_cost, 2),
            labour_cost=data.labour_cost,
            power_cost=data.power_cost,
            gas_cost=data.gas_cost,
            other_overhead=data.other_overhead,
            total_production_cost=round(
                total_production_cost, 2
            ),
            cost_per_packet=round(cost_per_packet, 4)
        )

        db.add(production_cost)

        if abs(yield_variance_percentage) > 3:
            alerts.append({
                "type": "yield_variance",
                "expected_output": expected_output,
                "actual_output": data.actual_output,
                "variance_percentage": round(
                    yield_variance_percentage, 2
                ),
                "message": "Production yield variance exceeds 3%"
            })

        db.commit()
        db.refresh(production_run)

    except Exception as error:
        db.rollback()

        if isinstance(error, HTTPException):
            raise error

        raise HTTPException(
            status_code=500,
            detail=f"Production run could not be saved: {str(error)}"
        )

    # ----------------------------------------------
    # H. Return production report
    # ----------------------------------------------

    return {
        "message": "Production run recorded successfully",
        "production_run_id": production_run.id,
        "product": product.name,
        "batch_size": data.batch_size,
        "expected_output": expected_output,
        "actual_output": data.actual_output,
        "damaged_quantity": data.damaged_quantity,
        "yield_variance_percentage": round(
            yield_variance_percentage, 2
        ),
        "materials": material_results,
        "finished_goods": {
            "item": finished_goods.name,
            "added_quantity": data.actual_output,
            "closing_stock": finished_goods.current_stock
        },
        "costing": {
            "material_cost": round(total_material_cost, 2),
            "labour_cost": data.labour_cost,
            "power_cost": data.power_cost,
            "gas_cost": data.gas_cost,
            "other_overhead": data.other_overhead,
            "total_production_cost": round(
                total_production_cost, 2
            ),
            "cost_per_packet": round(cost_per_packet, 4)
        },
        "alerts": alerts
    }


# ==================================================
# 33. VIEW ALL PRODUCTION RUNS
# ==================================================

@app.get("/production/runs")
def get_production_runs(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("admin", "production", "owner", "accountant")
    )
):

    runs = db.query(models.ProductionRun).order_by(
        models.ProductionRun.id.desc()
    ).all()

    results = []

    for run in runs:

        product = db.query(models.Product).filter(
            models.Product.id == run.product_id
        ).first()

        cost = db.query(models.ProductionCost).filter(
            models.ProductionCost.production_run_id == run.id
        ).first()

        results.append({
            "production_run_id": run.id,
            "product": product.name if product else "Unknown",
            "batch_size": run.batch_size,
            "expected_output": run.expected_output,
            "actual_output": run.actual_output,
            "damaged_quantity": run.damaged_quantity,
            "status": run.status,
            "production_date": run.production_date,
            "total_production_cost": (
                cost.total_production_cost if cost else 0
            ),
            "cost_per_packet": (
                cost.cost_per_packet if cost else 0
            )
        })

    return {
        "total_runs": len(results),
        "production_runs": results
    }


# ==================================================
# 34. VIEW ONE PRODUCTION RUN
# ==================================================

@app.get("/production/runs/{run_id}")
def get_production_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("admin", "production", "owner", "accountant")
    )
):

    run = db.query(models.ProductionRun).filter(
        models.ProductionRun.id == run_id
    ).first()

    if not run:
        raise HTTPException(
            status_code=404,
            detail="Production run not found"
        )

    product = db.query(models.Product).filter(
        models.Product.id == run.product_id
    ).first()

    usages = db.query(
        models.ProductionMaterialUsage
    ).filter(
        models.ProductionMaterialUsage.production_run_id == run.id
    ).all()

    material_details = []

    for usage in usages:

        inventory_item = db.query(
            models.InventoryItem
        ).filter(
            models.InventoryItem.id == usage.inventory_item_id
        ).first()

        material_details.append({
            "material": (
                inventory_item.name if inventory_item else "Unknown"
            ),
            "planned_quantity": usage.planned_quantity,
            "actual_quantity": usage.actual_quantity,
            "unit_cost": usage.unit_cost,
            "variance_percentage": usage.variance_percentage
        })

    cost = db.query(models.ProductionCost).filter(
        models.ProductionCost.production_run_id == run.id
    ).first()

    return {
        "production_run_id": run.id,
        "product": product.name if product else "Unknown",
        "batch_size": run.batch_size,
        "expected_output": run.expected_output,
        "actual_output": run.actual_output,
        "damaged_quantity": run.damaged_quantity,
        "status": run.status,
        "production_date": run.production_date,
        "materials": material_details,
        "costing": {
            "material_cost": cost.material_cost if cost else 0,
            "labour_cost": cost.labour_cost if cost else 0,
            "power_cost": cost.power_cost if cost else 0,
            "gas_cost": cost.gas_cost if cost else 0,
            "other_overhead": cost.other_overhead if cost else 0,
            "total_production_cost": (
                cost.total_production_cost if cost else 0
            ),
            "cost_per_packet": cost.cost_per_packet if cost else 0
        } if cost else None
    }


# ==================================================
# 35. GST INVOICE MANAGEMENT
# ==================================================

def get_financial_year():
    today = datetime.now()

    if today.month >= 4:
        start_year = today.year
        end_year = today.year + 1
    else:
        start_year = today.year - 1
        end_year = today.year

    return f"{start_year}-{str(end_year)[-2:]}"


@app.post("/invoices/generate/{order_id}")
def generate_invoice(
    order_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):

    # 1. Find the sales order.
    order = db.query(models.SalesOrder).filter(
        models.SalesOrder.id == order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Sales order not found"
        )

    # 2. Only approved orders can be invoiced.
    if order.status != "approved":
        raise HTTPException(
            status_code=400,
            detail="Only approved orders can be invoiced"
        )

    # 3. Prevent duplicate invoices.
    existing_invoice = db.query(models.Invoice).filter(
        models.Invoice.order_id == order_id
    ).first()

    if existing_invoice:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "An invoice already exists for this order",
                "invoice_number": existing_invoice.invoice_number
            }
        )

    # 4. Find customer.
    customer = db.query(models.Customer).filter(
        models.Customer.id == order.customer_id
    ).first()

    if not customer:
        raise HTTPException(
            status_code=404,
            detail="Customer not found"
        )

    # 5. Find order items.
    order_items = db.query(models.OrderItem).filter(
        models.OrderItem.order_id == order.id
    ).all()

    if not order_items:
        raise HTTPException(
            status_code=400,
            detail="Cannot generate an invoice for an empty order"
        )

    # 6. Determine GST type using place of supply.
    customer_state = (customer.state or "").strip().lower()

    if customer_state in ["tamil nadu", "tamilnadu", "tn"]:
        gst_type = "intra_state"
    else:
        gst_type = "inter_state"

    taxable_amount = 0.0
    total_gst = 0.0
    invoice_lines = []

    # 7. Calculate product-wise tax.
    for line in order_items:

        product = db.query(models.Product).filter(
            models.Product.id == line.product_id
        ).first()

        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product {line.product_id} not found"
            )

        line_taxable = round(
            line.quantity * line.unit_price, 2
        )

        gst_rate = product.gst_rate or 0

        line_gst = round(
            line_taxable * gst_rate / 100, 2
        )

        line_total = round(
            line_taxable + line_gst, 2
        )

        taxable_amount += line_taxable
        total_gst += line_gst

        invoice_lines.append({
            "product": product,
            "quantity": line.quantity,
            "unit_price": line.unit_price,
            "taxable_amount": line_taxable,
            "gst_rate": gst_rate,
            "gst_amount": line_gst,
            "total_amount": line_total
        })

    taxable_amount = round(taxable_amount, 2)
    total_gst = round(total_gst, 2)

    # 8. Calculate CGST, SGST or IGST.
    if gst_type == "intra_state":
        cgst_amount = round(total_gst / 2, 2)
        sgst_amount = round(total_gst - cgst_amount, 2)
        igst_amount = 0.0
    else:
        cgst_amount = 0.0
        sgst_amount = 0.0
        igst_amount = total_gst

    total_amount = round(
        taxable_amount + total_gst, 2
    )

    # 9. Generate financial-year invoice number.
    financial_year = get_financial_year()

    invoice_count = db.query(models.Invoice).filter(
        models.Invoice.invoice_number.like(
            f"FF/{financial_year}/%"
        )
    ).count()

    invoice_number = (
        f"FF/{financial_year}/{invoice_count + 1:04d}"
    )

    # 10. Save invoice and invoice items together.
    try:

        invoice = models.Invoice(
            invoice_number=invoice_number,
            order_id=order.id,
            customer_id=customer.id,
            place_of_supply=customer.state,
            taxable_amount=taxable_amount,
            gst_rate=(
                invoice_lines[0]["gst_rate"]
                if len(invoice_lines) == 1
                else 0
            ),
            cgst_amount=cgst_amount,
            sgst_amount=sgst_amount,
            igst_amount=igst_amount,
            total_amount=total_amount,
            status="generated"
        )

        db.add(invoice)
        db.flush()

        saved_items = []

        for line in invoice_lines:

            invoice_item = models.InvoiceItem(
                invoice_id=invoice.id,
                product_id=line["product"].id,
                quantity=line["quantity"],
                unit_price=line["unit_price"],
                taxable_amount=line["taxable_amount"],
                gst_rate=line["gst_rate"],
                total_amount=line["total_amount"]
            )

            db.add(invoice_item)

            saved_items.append({
                "product": line["product"].name,
                "hsn_code": line["product"].hsn_code,
                "quantity": line["quantity"],
                "unit_price": line["unit_price"],
                "taxable_amount": line["taxable_amount"],
                "gst_rate": line["gst_rate"],
                "gst_amount": line["gst_amount"],
                "total_amount": line["total_amount"]
            })

        db.commit()
        db.refresh(invoice)

    except Exception as error:
        db.rollback()
        print("INVOICE GENERATION ERROR:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Invoice generation failed"
        )

    return {
        "message": "GST invoice generated successfully",
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "order_id": order.id,
        "order_number": order.order_number,
        "customer": customer.name,
        "customer_gstin": customer.gstin,
        "place_of_supply": customer.state,
        "gst_type": gst_type,
        "items": saved_items,
        "tax_summary": {
            "taxable_amount": taxable_amount,
            "cgst": cgst_amount,
            "sgst": sgst_amount,
            "igst": igst_amount,
            "total_gst": total_gst,
            "invoice_total": total_amount
        },
        "status": invoice.status
    }


# ==================================================
# 36. VIEW ALL GST INVOICES
# ==================================================

@app.get("/invoices")
def get_all_invoices(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("admin", "owner", "accountant")
    )
):

    invoices = db.query(models.Invoice).order_by(
        models.Invoice.id.desc()
    ).all()

    results = []

    for invoice in invoices:

        customer = db.query(models.Customer).filter(
            models.Customer.id == invoice.customer_id
        ).first()

        results.append({
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "order_id": invoice.order_id,
            "customer": (
                customer.name if customer else "Unknown"
            ),
            "place_of_supply": invoice.place_of_supply,
            "invoice_date": invoice.invoice_date,
            "taxable_amount": invoice.taxable_amount,
            "cgst": invoice.cgst_amount,
            "sgst": invoice.sgst_amount,
            "igst": invoice.igst_amount,
            "total_amount": invoice.total_amount,
            "status": invoice.status
        })

    return {
        "total_invoices": len(results),
        "invoices": results
    }


# ==================================================
# 37. VIEW ONE GST INVOICE
# ==================================================

@app.get("/invoices/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("admin", "owner", "accountant")
    )
):

    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    customer = db.query(models.Customer).filter(
        models.Customer.id == invoice.customer_id
    ).first()

    items = db.query(models.InvoiceItem).filter(
        models.InvoiceItem.invoice_id == invoice.id
    ).all()

    invoice_items = []

    for item in items:

        product = db.query(models.Product).filter(
            models.Product.id == item.product_id
        ).first()

        invoice_items.append({
            "product": product.name if product else "Unknown",
            "hsn_code": product.hsn_code if product else None,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "taxable_amount": item.taxable_amount,
            "gst_rate": item.gst_rate,
            "total_amount": item.total_amount
        })

    return {
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "order_id": invoice.order_id,
        "customer": customer.name if customer else "Unknown",
        "customer_gstin": customer.gstin if customer else None,
        "place_of_supply": invoice.place_of_supply,
        "invoice_date": invoice.invoice_date,
        "items": invoice_items,
        "tax_summary": {
            "taxable_amount": invoice.taxable_amount,
            "cgst": invoice.cgst_amount,
            "sgst": invoice.sgst_amount,
            "igst": invoice.igst_amount,
            "total_amount": invoice.total_amount
        },
        "status": invoice.status
    }


# ==================================================
# 38. DISPATCH MANAGEMENT
# ==================================================

@app.post("/dispatches/create/{invoice_id}")
def create_dispatch(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin"))
):

    # 1. Find the invoice.
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    # 2. Find the related order.
    order = db.query(models.SalesOrder).filter(
        models.SalesOrder.id == invoice.order_id
    ).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Sales order not found"
        )

    # 3. Prevent duplicate dispatch.
    existing_dispatch = db.query(models.Dispatch).filter(
        models.Dispatch.order_id == order.id
    ).first()

    if existing_dispatch:
        raise HTTPException(
            status_code=400,
            detail="This order has already been dispatched"
        )

    # 4. Get invoice items.
    invoice_items = db.query(models.InvoiceItem).filter(
        models.InvoiceItem.invoice_id == invoice.id
    ).all()

    if not invoice_items:
        raise HTTPException(
            status_code=400,
            detail="Invoice contains no items"
        )

    # 5. Validate finished-goods stock.
    validated_items = []

    for item in invoice_items:

        inventory_item = db.query(
            models.InventoryItem
        ).filter(
            models.InventoryItem.product_id == item.product_id,
            models.InventoryItem.item_type == "finished_goods"
        ).first()

        if not inventory_item:
            raise HTTPException(
                status_code=404,
                detail=f"Finished goods inventory not found for product {item.product_id}"
            )

        if inventory_item.current_stock < item.quantity:
            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Insufficient finished goods stock",
                    "product_id": item.product_id,
                    "required_quantity": item.quantity,
                    "available_quantity": inventory_item.current_stock,
                    "shortage": item.quantity - inventory_item.current_stock
                }
            )

        validated_items.append({
            "invoice_item": item,
            "inventory_item": inventory_item
        })

    # 6. Create dispatch and update stock.
    dispatch_number = f"DSP-{uuid4().hex[:8].upper()}"

    try:

        dispatch = models.Dispatch(
            dispatch_number=dispatch_number,
            order_id=order.id,
            invoice_id=invoice.id,
            status="dispatched"
        )

        db.add(dispatch)
        db.flush()

        dispatched_items = []

        for line in validated_items:

            invoice_item = line["invoice_item"]
            inventory_item = line["inventory_item"]

            quantity = invoice_item.quantity

            # Deduct finished goods.
            inventory_item.current_stock = (
                inventory_item.current_stock - quantity
            )

            # Save dispatch item.
            dispatch_item = models.DispatchItem(
                dispatch_id=dispatch.id,
                product_id=invoice_item.product_id,
                quantity=quantity
            )

            db.add(dispatch_item)

            # Record stock movement.
            movement = models.StockMovement(
                inventory_item_id=inventory_item.id,
                movement_type="dispatch",
                quantity=-quantity,
                source_type="dispatch",
                source_id=dispatch.id,
                unit_cost=inventory_item.unit_cost
            )

            db.add(movement)

            dispatched_items.append({
                "product_id": invoice_item.product_id,
                "quantity_dispatched": quantity,
                "stock_remaining": inventory_item.current_stock
            })

        # Update order status.
        order.status = "dispatched"

        db.commit()
        db.refresh(dispatch)

    except Exception as error:

        db.rollback()

        if isinstance(error, HTTPException):
            raise error

        print("DISPATCH ERROR:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Dispatch could not be completed"
        )

    return {
        "message": "Dispatch completed successfully",
        "dispatch_id": dispatch.id,
        "dispatch_number": dispatch.dispatch_number,
        "order_id": order.id,
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "items": dispatched_items,
        "status": dispatch.status
    }


# ==================================================
# 39. VIEW ALL DISPATCHES
# ==================================================

@app.get("/dispatches")
def get_all_dispatches(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("admin", "owner", "accountant")
    )
):

    dispatches = db.query(models.Dispatch).order_by(
        models.Dispatch.id.desc()
    ).all()

    results = []

    for dispatch in dispatches:

        results.append({
            "dispatch_id": dispatch.id,
            "dispatch_number": dispatch.dispatch_number,
            "order_id": dispatch.order_id,
            "invoice_id": dispatch.invoice_id,
            "dispatch_date": dispatch.dispatch_date,
            "status": dispatch.status
        })

    return {
        "total_dispatches": len(results),
        "dispatches": results
    }


# ==================================================
# 40. PAYMENT MANAGEMENT
# ==================================================

@app.post("/payments/record/{invoice_id}")
def record_payment(
    invoice_id: int,
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant"))
):

    # 1. Find invoice
    invoice = db.query(models.Invoice).filter(
        models.Invoice.id == invoice_id
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found"
        )

    # 2. Validate payment amount
    if data.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than zero"
        )

    # 3. Calculate existing payments
    existing_payments = db.query(models.Payment).filter(
        models.Payment.invoice_id == invoice_id
    ).all()

    total_paid = sum(
        payment.amount for payment in existing_payments
    )

    outstanding = round(
        invoice.total_amount - total_paid, 2
    )

    if data.amount > outstanding:
        raise HTTPException(
            status_code=400,
            detail=f"Payment exceeds outstanding balance of {outstanding}"
        )

    # 4. Create payment record
    new_payment = models.Payment(
        invoice_id=invoice_id,
        amount=data.amount,
        payment_method=data.payment_method,
        reference_number=data.reference_number,
        notes=data.notes
    )

    try:
        db.add(new_payment)
        db.commit()
        db.refresh(new_payment)

    except Exception as error:
        db.rollback()
        print("PAYMENT RECORDING ERROR:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Payment could not be recorded"
        )

    # 5. Calculate updated balance
    updated_total_paid = round(
        total_paid + data.amount, 2
    )

    updated_outstanding = round(
        invoice.total_amount - updated_total_paid, 2
    )

    # 6. Update invoice payment status
    if updated_outstanding == 0:
        invoice.status = "paid"
    else:
        invoice.status = "partially_paid"

    db.commit()

    return {
        "message": "Payment recorded successfully",
        "payment_id": new_payment.id,
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "payment_received": data.amount,
        "total_paid": updated_total_paid,
        "invoice_total": invoice.total_amount,
        "outstanding_balance": updated_outstanding,
        "payment_status": invoice.status
    }


# ==================================================
# 41. VIEW ALL PAYMENTS
# ==================================================

@app.get("/payments")
def get_all_payments(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role("admin", "accountant", "owner")
    )
):

    payments = db.query(models.Payment).order_by(
        models.Payment.id.desc()
    ).all()

    results = []

    for payment in payments:

        invoice = db.query(models.Invoice).filter(
            models.Invoice.id == payment.invoice_id
        ).first()

        results.append({
            "payment_id": payment.id,
            "invoice_id": payment.invoice_id,
            "invoice_number": (
                invoice.invoice_number if invoice else None
            ),
            "amount": payment.amount,
            "payment_date": payment.payment_date,
            "payment_method": payment.payment_method,
            "reference_number": payment.reference_number,
            "notes": payment.notes
        })

    return {
        "total_payments": len(results),
        "payments": results
    }


# ==================================================
# 42. SALES AUDIT REPORT
# ==================================================

@app.get("/reports/sales")
def sales_audit_report(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant", "owner"))
):
    from datetime import datetime, time

    query = db.query(models.Invoice)

    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(models.Invoice.invoice_date >= start)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="start_date must use YYYY-MM-DD format"
            )

    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d")
            end = end.replace(hour=23, minute=59, second=59)
            query = query.filter(models.Invoice.invoice_date <= end)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="end_date must use YYYY-MM-DD format"
            )

    invoices = query.order_by(models.Invoice.invoice_date).all()

    results = []
    total_taxable = 0
    total_cgst = 0
    total_sgst = 0
    total_igst = 0
    total_invoice_value = 0

    for invoice in invoices:
        customer = db.query(models.Customer).filter(
            models.Customer.id == invoice.customer_id
        ).first()

        results.append({
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "invoice_date": invoice.invoice_date,
            "customer": customer.name if customer else None,
            "taxable_amount": invoice.taxable_amount,
            "cgst": invoice.cgst_amount,
            "sgst": invoice.sgst_amount,
            "igst": invoice.igst_amount,
            "invoice_total": invoice.total_amount,
            "status": invoice.status
        })

        total_taxable += invoice.taxable_amount
        total_cgst += invoice.cgst_amount
        total_sgst += invoice.sgst_amount
        total_igst += invoice.igst_amount
        total_invoice_value += invoice.total_amount

    return {
        "report": "Sales Audit Report",
        "start_date": start_date,
        "end_date": end_date,
        "total_invoices": len(results),
        "summary": {
            "taxable_amount": round(total_taxable, 2),
            "cgst": round(total_cgst, 2),
            "sgst": round(total_sgst, 2),
            "igst": round(total_igst, 2),
            "total_invoice_value": round(total_invoice_value, 2)
        },
        "invoices": results
    }


@app.get("/reports/sales/export/csv")
def export_sales_csv(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant", "owner"))
):
    from datetime import datetime

    query = db.query(models.Invoice)

    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(models.Invoice.invoice_date >= start)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="start_date must use YYYY-MM-DD format"
            )

    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d")
            end = end.replace(hour=23, minute=59, second=59)
            query = query.filter(models.Invoice.invoice_date <= end)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="end_date must use YYYY-MM-DD format"
            )

    invoices = query.order_by(models.Invoice.invoice_date).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Invoice ID",
        "Invoice Number",
        "Invoice Date",
        "Customer",
        "Taxable Amount",
        "CGST",
        "SGST",
        "IGST",
        "Invoice Total",
        "Status"
    ])

    for invoice in invoices:
        customer = db.query(models.Customer).filter(
            models.Customer.id == invoice.customer_id
        ).first()

        writer.writerow([
            invoice.id,
            invoice.invoice_number,
            invoice.invoice_date.isoformat() if invoice.invoice_date else "",
            customer.name if customer else "Unknown",
            invoice.taxable_amount,
            invoice.cgst_amount,
            invoice.sgst_amount,
            invoice.igst_amount,
            invoice.total_amount,
            invoice.status
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                "attachment; filename=FactoryFlow_Sales_Register.csv"
        }
    )


@app.get("/reports/sales/export/excel")
def export_sales_excel(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant", "owner"))
):
    from datetime import datetime

    query = db.query(models.Invoice)

    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(models.Invoice.invoice_date >= start)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="start_date must use YYYY-MM-DD format"
            )

    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d")
            end = end.replace(hour=23, minute=59, second=59)
            query = query.filter(models.Invoice.invoice_date <= end)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="end_date must use YYYY-MM-DD format"
            )

    invoices = query.order_by(models.Invoice.invoice_date).all()

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Sales Register"

    headers = [
        "Invoice ID", "Invoice Number", "Invoice Date",
        "Customer", "Taxable Amount", "CGST", "SGST",
        "IGST", "Invoice Total", "Status"
    ]

    sheet.append(headers)

    for cell in sheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(
            start_color="2563EB",
            end_color="2563EB",
            fill_type="solid"
        )
        cell.alignment = Alignment(horizontal="center")

    for invoice in invoices:
        customer = db.query(models.Customer).filter(
            models.Customer.id == invoice.customer_id
        ).first()

        sheet.append([
            invoice.id,
            invoice.invoice_number,
            invoice.invoice_date.isoformat() if invoice.invoice_date else "",
            customer.name if customer else "Unknown",
            invoice.taxable_amount,
            invoice.cgst_amount,
            invoice.sgst_amount,
            invoice.igst_amount,
            invoice.total_amount,
            invoice.status
        ])

    for column in sheet.columns:
        max_length = max(
            len(str(cell.value or "")) for cell in column
        )
        sheet.column_dimensions[
            column[0].column_letter
        ].width = max_length + 4

    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
                "attachment; filename=FactoryFlow_Sales_Register.xlsx"
        }
    )


@app.get("/reports/stock-ledger/export/csv")
def export_stock_ledger_csv(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant", "owner"))
):
    from datetime import datetime

    query = (
        db.query(models.StockMovement, models.InventoryItem)
        .join(
            models.InventoryItem,
            models.StockMovement.inventory_item_id == models.InventoryItem.id
        )
    )

    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(
                models.StockMovement.movement_date >= start
            )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="start_date must use YYYY-MM-DD format"
            )

    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d")
            end = end.replace(hour=23, minute=59, second=59)
            query = query.filter(
                models.StockMovement.movement_date <= end
            )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="end_date must use YYYY-MM-DD format"
            )

    movements = query.order_by(
        models.StockMovement.movement_date,
        models.StockMovement.id
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Movement ID",
        "Date",
        "Inventory Item",
        "Item Type",
        "Movement Type",
        "Quantity",
        "Unit",
        "Unit Cost",
        "Source Type",
        "Source ID"
    ])

    for movement, item in movements:
        writer.writerow([
            movement.id,
            movement.movement_date.isoformat()
            if movement.movement_date else "",
            item.name,
            item.item_type,
            movement.movement_type,
            movement.quantity,
            item.unit,
            movement.unit_cost,
            movement.source_type,
            movement.source_id
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                "attachment; filename=FactoryFlow_Stock_Ledger.csv"
        }
    )


@app.get("/reports/stock-ledger/export/excel")
def export_stock_ledger_excel(
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant", "owner"))
):
    from datetime import datetime

    query = (
        db.query(models.StockMovement, models.InventoryItem)
        .join(
            models.InventoryItem,
            models.StockMovement.inventory_item_id == models.InventoryItem.id
        )
    )

    if start_date:
        try:
            start = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(
                models.StockMovement.movement_date >= start
            )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="start_date must use YYYY-MM-DD format"
            )

    if end_date:
        try:
            end = datetime.strptime(end_date, "%Y-%m-%d")
            end = end.replace(hour=23, minute=59, second=59)
            query = query.filter(
                models.StockMovement.movement_date <= end
            )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="end_date must use YYYY-MM-DD format"
            )

    movements = query.order_by(
        models.StockMovement.movement_date,
        models.StockMovement.id
    ).all()

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Stock Ledger"

    headers = [
        "Movement ID", "Date", "Inventory Item", "Item Type",
        "Movement Type", "Quantity", "Unit", "Unit Cost",
        "Source Type", "Source ID"
    ]

    sheet.append(headers)

    for cell in sheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(
            start_color="2563EB",
            end_color="2563EB",
            fill_type="solid"
        )
        cell.alignment = Alignment(horizontal="center")

    for movement, item in movements:
        sheet.append([
            movement.id,
            movement.movement_date.isoformat()
            if movement.movement_date else "",
            item.name,
            item.item_type,
            movement.movement_type,
            movement.quantity,
            item.unit,
            movement.unit_cost,
            movement.source_type,
            movement.source_id
        ])

    for column in sheet.columns:
        max_length = max(
            len(str(cell.value or "")) for cell in column
        )
        sheet.column_dimensions[
            column[0].column_letter
        ].width = max_length + 4

    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
                "attachment; filename=FactoryFlow_Stock_Ledger.xlsx"
        }
    )

# ==================================================
# 43. PAYMENT AUDIT REPORT
# ==================================================

@app.get("/reports/payments")
def payment_audit_report(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant", "owner"))
):
    invoices = db.query(models.Invoice).all()

    results = []
    total_invoiced = 0
    total_received = 0
    total_outstanding = 0

    for invoice in invoices:
        payments = db.query(models.Payment).filter(
            models.Payment.invoice_id == invoice.id
        ).all()

        paid = sum(payment.amount for payment in payments)
        outstanding = round(invoice.total_amount - paid, 2)

        total_invoiced += invoice.total_amount
        total_received += paid
        total_outstanding += outstanding

        results.append({
            "invoice_number": invoice.invoice_number,
            "invoice_total": invoice.total_amount,
            "amount_received": round(paid, 2),
            "outstanding_balance": outstanding,
            "payment_status": invoice.status
        })

    return {
        "report": "Payment Audit Report",
        "summary": {
            "total_invoiced": round(total_invoiced, 2),
            "total_received": round(total_received, 2),
            "total_outstanding": round(total_outstanding, 2)
        },
        "invoices": results
    }


# ==================================================
# 44. PRODUCTION AUDIT REPORT
# ==================================================

@app.get("/reports/production")
def production_audit_report(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant", "owner"))
):
    runs = db.query(models.ProductionRun).order_by(
        models.ProductionRun.id.desc()
    ).all()

    results = []
    total_expected = 0
    total_actual = 0
    total_cost = 0

    for run in runs:
        cost = db.query(models.ProductionCost).filter(
            models.ProductionCost.production_run_id == run.id
        ).first()

        expected = run.expected_output or 0
        actual = run.actual_output or 0
        production_cost = cost.total_production_cost if cost else 0

        total_expected += expected
        total_actual += actual
        total_cost += production_cost

        results.append({
            "run_id": run.id,
            "expected_output": expected,
            "actual_output": actual,
            "output_variance": actual - expected,
            "production_cost": round(production_cost, 2),
            "cost_per_packet": round(
                production_cost / actual, 2
            ) if actual else 0
        })

    return {
        "report": "Production Audit Report",
        "summary": {
            "total_runs": len(results),
            "total_expected_output": total_expected,
            "total_actual_output": total_actual,
            "total_output_variance": total_actual - total_expected,
            "total_production_cost": round(total_cost, 2)
        },
        "production_runs": results
    }


# ==================================================
# 45. INVENTORY AUDIT REPORT
# ==================================================

@app.get("/reports/inventory")
def inventory_audit_report(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant", "owner"))
):
    items = db.query(models.InventoryItem).order_by(
        models.InventoryItem.id
    ).all()

    results = []
    total_inventory_value = 0

    for item in items:
        stock_value = round(
            (item.current_stock or 0) * (item.unit_cost or 0), 2
        )

        total_inventory_value += stock_value

        results.append({
            "inventory_id": item.id,
            "item_name": item.name,
            "item_type": item.item_type,
            "unit": item.unit,
            "current_stock": item.current_stock,
            "unit_cost": item.unit_cost,
            "stock_value": stock_value
        })

    return {
        "report": "Inventory Audit Report",
        "total_items": len(results),
        "total_inventory_value": round(total_inventory_value, 2),
        "inventory": results
    }


@app.get("/reports/inventory/export/csv")
def export_inventory_csv(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant", "owner"))
):
    items = db.query(models.InventoryItem).order_by(
        models.InventoryItem.id
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Inventory ID",
        "Item Name",
        "Item Type",
        "Unit",
        "Current Stock",
        "Unit Cost",
        "Stock Value"
    ])

    for item in items:
        stock = item.current_stock or 0
        unit_cost = item.unit_cost or 0
        stock_value = round(stock * unit_cost, 2)

        writer.writerow([
            item.id,
            item.name,
            item.item_type,
            item.unit,
            stock,
            unit_cost,
            stock_value
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition":
                "attachment; filename=FactoryFlow_Inventory_Report.csv"
        }
    )


@app.get("/reports/inventory/export/excel")
def export_inventory_excel(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant", "owner"))
):
    items = db.query(models.InventoryItem).order_by(
        models.InventoryItem.id
    ).all()

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Inventory Report"

    headers = [
        "Inventory ID",
        "Item Name",
        "Item Type",
        "Unit",
        "Current Stock",
        "Unit Cost",
        "Stock Value"
    ]

    sheet.append(headers)

    for cell in sheet[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(
            start_color="2563EB",
            end_color="2563EB",
            fill_type="solid"
        )
        cell.alignment = Alignment(horizontal="center")

    for item in items:
        stock = item.current_stock or 0
        unit_cost = item.unit_cost or 0

        sheet.append([
            item.id,
            item.name,
            item.item_type,
            item.unit,
            stock,
            unit_cost,
            round(stock * unit_cost, 2)
        ])

    for column in sheet.columns:
        max_length = max(
            len(str(cell.value or "")) for cell in column
        )
        sheet.column_dimensions[
            column[0].column_letter
        ].width = max_length + 4

    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition":
                "attachment; filename=FactoryFlow_Inventory_Report.xlsx"
        }
    )

# ==================================================
# 46. OWNER AUDIT DASHBOARD
# ==================================================

@app.get("/reports/audit-dashboard")
def audit_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(require_role("admin", "accountant", "owner"))
):
    invoices = db.query(models.Invoice).all()
    payments = db.query(models.Payment).all()
    production_runs = db.query(models.ProductionRun).all()
    inventory_items = db.query(models.InventoryItem).all()

    total_sales = sum(invoice.total_amount for invoice in invoices)
    total_taxable = sum(invoice.taxable_amount for invoice in invoices)

    total_received = sum(payment.amount for payment in payments)
    total_outstanding = round(total_sales - total_received, 2)

    total_expected = sum(
        run.expected_output or 0 for run in production_runs
    )
    total_actual = sum(
        run.actual_output or 0 for run in production_runs
    )

    inventory_value = sum(
        (item.current_stock or 0) * (item.unit_cost or 0)
        for item in inventory_items
    )

    return {
        "report": "FactoryFlow Owner Audit Dashboard",
        "sales": {
            "invoice_count": len(invoices),
            "taxable_sales": round(total_taxable, 2),
            "total_sales_with_tax": round(total_sales, 2)
        },
        "payments": {
            "total_received": round(total_received, 2),
            "total_outstanding": total_outstanding
        },
        "production": {
            "total_runs": len(production_runs),
            "expected_output": total_expected,
            "actual_output": total_actual,
            "output_variance": total_actual - total_expected
        },
        "inventory": {
            "total_items": len(inventory_items),
            "total_inventory_value": round(inventory_value, 2)
        }
    }
