# FactoryFlow – Manufacturing Order-to-Audit Management System

FactoryFlow is a Python-based manufacturing management system designed to manage and track business operations across the order-to-audit workflow.

The system brings together sales order management, inventory tracking, production management, GST invoicing, dispatch operations, payment recording, and audit reporting.

## 🚀 Technologies Used

- **Backend:** Python, FastAPI
- **Database:** SQLite
- **ORM:** SQLAlchemy
- **API Documentation:** Swagger UI

## ✨ Implemented Features

### 1. User Management
- User authentication
- Role-based access control

### 2. Product and Customer Management
- Product management
- Customer information management
- Product and customer records

### 3. Sales Order Management
- Sales order creation
- Order approval workflow
- Order status tracking

### 4. Inventory Management
- Inventory tracking
- Stock movement records
- Finished goods stock management

### 5. Production Management
- Bill of Materials (BOM)
- Production run tracking
- Material usage tracking
- Production cost calculation

### 6. GST Invoice Management
- GST invoice generation
- CGST, SGST and IGST calculations
- Invoice status tracking

### 7. Dispatch Management
- Dispatch creation
- Finished goods stock deduction
- Dispatch tracking

### 8. Payment Management
- Payment recording
- Partial payment tracking
- Outstanding balance calculation

### 9. Audit and Reporting
- Sales reports
- Payment reports
- Production reports
- Inventory reports
- Combined audit dashboard

## 📁 Project Structure

```text
FactoryFlow/
│
├── backend/
│   └── app/
│       ├── __init__.py
│       ├── auth.py
│       ├── database.py
│       ├── main.py
│       └── models.py
│
├── .gitignore
└── README.md
```

## ⚙️ Getting Started

### Prerequisites

- Python 3.10 or later
- Git
- pip

### Installation

1. Clone the repository:

```bash
git clone https://github.com/JoshnaCodeZ/FactoryFlow.git
```

2. Navigate into the project:

```bash
cd FactoryFlow
```

3. Create a virtual environment:

```bash
python -m venv venv
```

4. Activate the virtual environment on Windows:

```bash
venv\Scripts\activate
```

5. Install the required dependencies:

```bash
pip install fastapi uvicorn sqlalchemy
```

Additional dependencies may be required depending on the authentication and application modules.

### Run the Application

```bash
uvicorn backend.app.main:app --reload
```

### API Documentation

After starting the server, open:

http://127.0.0.1:8000/docs

Swagger UI provides an interactive interface to explore and test the API endpoints.

## 🔧 Current Development Status

FactoryFlow is under active development.

The backend currently includes core manufacturing workflow modules, GST invoicing, dispatch management, payment recording, and audit reporting.

Upcoming improvements:

- Inventory and combined dashboard verification
- Frontend dashboard development
- Invoice PDF generation
- Additional automated testing
- Improved audit history and documentation

## 👩‍💻 Developer

**Joshna Srini**

GitHub: [JoshnaCodeZ](https://github.com/JoshnaCodeZ)

---

*FactoryFlow – Connecting Manufacturing Operations from Order to Audit.*