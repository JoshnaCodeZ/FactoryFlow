<img width="1282" height="816" alt="image" src="https://github.com/user-attachments/assets/f49c8aa9-3afa-4f2d-ae24-969e868f17fc" /># FactoryFlow – Manufacturing Order-to-Audit Management System

FactoryFlow is a Python-based manufacturing management system designed to manage and track business operations across the complete order-to-audit workflow.

The system integrates sales order management, inventory tracking, production management, GST invoicing, dispatch operations, payment recording, and audit reporting into a unified application.

## 🚀 Technologies Used

- **Backend:** Python, FastAPI
- **Frontend:** HTML5, CSS3, JavaScript
- **Database:** SQLite
- **ORM:** SQLAlchemy
- **Authentication:** JWT, Password Hashing
- **API Documentation:** Swagger UI

## ✨ Implemented Features

### 1. User Management
- User authentication
- Role-based access control
- JWT-based authentication

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

### 10. Frontend Interface
- Dashboard overview
- Module-based navigation
- English and Tamil language options
- Voice assistant interface
- Responsive layout

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
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── .gitignore
├── README.md
└── requirements.txt
```

## ⚙️ Getting Started

### Prerequisites

- Python 3.10 or later
- Git
- pip

### 1. Clone the Repository

```bash
git clone https://github.com/JoshnaCodeZ/FactoryFlow.git
```

### 2. Navigate to the Project Directory

```bash
cd FactoryFlow
```

### 3. Create a Virtual Environment

```bash
python -m venv venv
```

### 4. Activate the Virtual Environment

**Windows:**

```bash
venv\Scripts\activate
```

**Linux / macOS:**

```bash
source venv/bin/activate
```

### 5. Install Dependencies

```bash
pip install -r requirements.txt
```

### 6. Run the Backend Application

From the project root directory:

```bash
uvicorn backend.app.main:app --reload
```

The backend server will be available at:

```text
http://127.0.0.1:8000
```

### 7. API Documentation

Open the following URL in your browser:

```text
http://127.0.0.1:8000/docs
```

Swagger UI provides an interactive interface to explore and test the available API endpoints.

## Application Access and Execution

**Project:** FactoryFlow – Order-to-Audit Manufacturing Management System

### Application URLs

- Frontend: http://127.0.0.1:5500
- Backend API: http://127.0.0.1:8000
- API Documentation: http://127.0.0.1:8000/docs
- GitHub Repository: [Insert repository URL]

*Note: The application currently runs locally. These URLs are accessible when the application is running on the host computer.*

### Execution Instructions

1. Clone the GitHub repository.
2. Create and activate a Python virtual environment.
3. Install dependencies using `pip install -r requirements.txt`.
4. Start the FastAPI backend using:

   `python -m uvicorn backend.app.main:app --reload`

5. Start the frontend using:

   `python -m http.server 5500`

6. Open `http://127.0.0.1:5500` in a browser.

### Test Credentials

- Administrator: [Insert username and password]
- Salesman: [Insert username and password]


## 🔧 Development Status

FactoryFlow is under active development.

The application currently includes backend modules for manufacturing operations, GST invoicing, dispatch management, payment recording, and audit reporting, along with a frontend interface.

### Planned Improvements

- Complete frontend and backend integration testing
- Verify all manufacturing workflow scenarios
- Invoice PDF generation
- Additional automated testing
- Improved audit history and documentation
- Final demonstration and performance verification

## 👩‍💻 Developer

**JoshnaSrini**

GitHub: [JoshnaCodeZ](https://github.com/JoshnaCodeZ)

---

*FactoryFlow – Connecting Manufacturing Operations from Order to Audit.*
