
/* =========================================================
   FACTORYFLOW - COMPLETE MAIN JAVASCRIPT
   Authentication | Language | Voice | Dashboard
   Products | Customers | Orders | Inventory | Production
   Invoices | Dispatch | Payments | Reports
========================================================= */

const API_BASE_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "factoryflow-access-token";

let currentLanguage = "en";
let soundEnabled = true;

let factoryProducts = [];
let allCustomers = [];
let allOrders = [];

// =========================================================
// TRANSLATIONS
// =========================================================

const translations = {
    en: {
        dashboard: "Dashboard",
        products: "Products",
        customers: "Customers",
        orders: "Orders",
        inventory: "Inventory",
        production: "Production",
        invoices: "Invoices",
        dispatch: "Dispatch",
        payments: "Payments",
        reports: "Reports",
        systemOnline: "System Online",
        logout: "Logout",
        assistantTitle: "FactoryFlow Voice Assistant",
        assistantMessage: "Speak in Tamil or English. I'm ready to help!",
        speak: "🎤 Speak",
        soundOn: "🔊 Sound On",
        soundOff: "🔇 Sound Off",
        repeat: "🔊 Repeat",
        stop: "⏹ Stop",
        listening: "Listening... Speak now!",
        received: "I received your question.",
        tryAgain: "Please try again.",
        unsupported: "Voice recognition is not supported in this browser.",
        outputVariance: "Output variance"
    },

    ta: {
        dashboard: "முகப்பு",
        products: "பொருட்கள்",
        customers: "வாடிக்கையாளர்கள்",
        orders: "ஆர்டர்கள்",
        inventory: "சரக்கு இருப்பு",
        production: "உற்பத்தி",
        invoices: "விலைப்பட்டியல்",
        dispatch: "அனுப்புதல்",
        payments: "பணம் செலுத்துதல்",
        reports: "அறிக்கைகள்",
        systemOnline: "கணினி செயல்பாட்டில் உள்ளது",
        logout: "வெளியேறு",
        assistantTitle: "FactoryFlow குரல் உதவியாளர்",
        assistantMessage: "தமிழில் அல்லது ஆங்கிலத்தில் பேசுங்கள். உதவ நான் தயார்!",
        speak: "🎤 பேசுங்கள்",
        soundOn: "🔊 ஒலி இயக்கு",
        soundOff: "🔇 ஒலியை நிறுத்து",
        repeat: "🔊 மீண்டும் கேட்க",
        stop: "⏹ நிறுத்து",
        listening: "கேட்டுக்கொண்டிருக்கிறேன்... பேசுங்கள்!",
        received: "உங்கள் கேள்வியைப் பெற்றுக்கொண்டேன்.",
        tryAgain: "மீண்டும் முயற்சிக்கவும்.",
        unsupported: "இந்த உலாவியில் குரல் வசதி ஆதரிக்கப்படவில்லை.",
        outputVariance: "உற்பத்தி வேறுபாடு"
    }
};

// =========================================================
// COMMON HELPERS
// =========================================================

function getElement(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[char]);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    }).format(Number(value || 0));
}

function formatOrderDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "-"
        : date.toLocaleDateString("en-IN");
}

function showMessage(id, message, color = "red") {
    const element = getElement(id);

    if (element) {
        element.textContent = message;
        element.style.color = color;
    }
}

// =========================================================
// AUTHENTICATION
// =========================================================

function getAccessToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function getCurrentRole() {
    const token = getAccessToken();

    if (!token) return null;

    try {
        const payloadPart = token.split(".")[1];

        if (!payloadPart) return null;

        const normalized = payloadPart
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const padded = normalized.padEnd(
            normalized.length + (4 - normalized.length % 4) % 4,
            "="
        );

        const payload = JSON.parse(atob(padded));

        return String(payload.role || "").toLowerCase();

    } catch (error) {
        console.error("Unable to read user role:", error);
        return null;
    }
}

function isSalesman() {
    return getCurrentRole() === "salesman";
}

async function apiRequest(endpoint, options = {}) {
    const token = getAccessToken();

    if (!token) {
        throw new Error("Your session is missing. Please log in again.");
    }

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const responseText = await response.text();

    let data = {};

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            data = { detail: responseText };
        }
    }

    if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);

        throw new Error(
            "Your session has expired. Please log in again."
        );
    }

    if (!response.ok) {
        const detail = data.detail || `HTTP ${response.status}`;

        throw new Error(
            typeof detail === "string"
                ? detail
                : JSON.stringify(detail)
        );
    }

    return data;
}

// =========================================================
// LANGUAGE MANAGEMENT
// =========================================================

function changeLanguage(language) {
    if (!translations[language]) language = "en";

    currentLanguage = language;
    document.documentElement.lang = language;

    const t = translations[language];

    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.dataset.i18n;

        if (t[key]) {
            element.textContent = t[key];
        }
    });

    const updates = {
        "assistant-title": t.assistantTitle,
        "voice-btn": t.speak,
        "repeat-btn": t.repeat,
        "stop-speech-btn": t.stop,
        "system-status-text": t.systemOnline,
        "logout-btn": t.logout
    };

    Object.entries(updates).forEach(([id, value]) => {
        const element = getElement(id);

        if (element) element.textContent = value;
    });

    updateSoundButton();

    localStorage.setItem("factoryflow-language", language);
}

function updateSoundButton() {
    const button = getElement("sound-btn");

    if (button) {
        button.textContent = soundEnabled
            ? translations[currentLanguage].soundOn
            : translations[currentLanguage].soundOff;
    }
}

// =========================================================
// VOICE ASSISTANT
// =========================================================

function speakMessage(message) {
    if (!soundEnabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(message);

    speech.lang = currentLanguage === "ta" ? "ta-IN" : "en-IN";
    speech.rate = 0.9;

    window.speechSynthesis.speak(speech);
}

function startVoiceAssistant() {
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

    const message = getElement("assistant-message");

    if (!SpeechRecognition) {
        alert(translations[currentLanguage].unsupported);
        return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = currentLanguage === "ta" ? "ta-IN" : "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        if (message) {
            message.textContent = translations[currentLanguage].listening;
        }
    };

    recognition.onresult = event => {
        const spokenText = event.results[0][0].transcript;

        if (message) message.textContent = spokenText;

        speakMessage(translations[currentLanguage].received);
    };

    recognition.onerror = error => {
        console.error("Voice recognition error:", error);

        if (message) {
            message.textContent = translations[currentLanguage].tryAgain;
        }
    };

    try {
        recognition.start();
    } catch (error) {
        console.error("Voice assistant could not start:", error);
    }
}

// =========================================================
// ROLE PERMISSIONS
// =========================================================

function applyRolePermissions() {
    const role = getCurrentRole();

    const salesmanPages = [
        "dashboard",
        "products",
        "customers",
        "orders"
    ];

    document.querySelectorAll(".nav-link[data-page]").forEach(link => {
        const page = link.dataset.page;

        link.style.display =
            role === "salesman" && !salesmanPages.includes(page)
                ? "none"
                : "";
    });
}

// =========================================================
// DASHBOARD
// =========================================================

async function loadDashboardData() {
    if (isSalesman()) {
        await loadSalesmanDashboard();
        return;
    }

    try {
        const data = await apiRequest("/reports/audit-dashboard");

        const adminSections = [
            "admin-welcome-section",
            "admin-kpi-section",
            "admin-dashboard-panels"
        ];

        adminSections.forEach(id => {
            const element = getElement(id);
            if (element) element.style.display = "";
        });

        const salesmanSection = getElement("salesman-dashboard-section");

        if (salesmanSection) {
            salesmanSection.style.display = "none";
        }

        const values = {
            "total-sales": formatCurrency(data.sales?.total_sales_with_tax),
            "payments-received": formatCurrency(data.payments?.total_received),
            "outstanding": formatCurrency(data.payments?.total_outstanding),
            "inventory-value": formatCurrency(data.inventory?.total_inventory_value),
            "production-runs": data.production?.total_runs ?? 0,
            "expected-output": data.production?.expected_output ?? 0,
            "actual-output": data.production?.actual_output ?? 0
        };

        Object.entries(values).forEach(([id, value]) => {
            const element = getElement(id);
            if (element) element.textContent = value;
        });

        const variance = getElement("production-variance");

        if (variance) {
            variance.textContent =
                `${translations[currentLanguage].outputVariance}: ${data.production?.output_variance ?? 0}`;
        }

        console.log("Admin dashboard loaded.", data);

    } catch (error) {
        console.error("Dashboard loading failed:", error);

        showMessage("assistant-message", error.message);
    }
}

async function loadSalesmanDashboard() {
    const dashboard = getElement("salesman-dashboard-section");

    [
        "admin-welcome-section",
        "admin-kpi-section",
        "admin-dashboard-panels"
    ].forEach(id => {
        const element = getElement(id);
        if (element) element.style.display = "none";
    });

    if (dashboard) dashboard.style.display = "block";

    try {
        const data = await apiRequest("/sales/dashboard");

        const welcome = getElement("salesman-welcome");

        if (welcome) {
            welcome.textContent = `Welcome, ${data.username || "Salesman"}!`;
        }

        const values = {
            "salesman-total-orders": data.total_orders,
            "salesman-pending-orders": data.pending_orders,
            "salesman-approved-orders": data.approved_orders,
            "salesman-total-sales": formatCurrency(data.total_sales),
            "salesman-total-items": data.total_items
        };

        Object.entries(values).forEach(([id, value]) => {
            const element = getElement(id);

            if (element) element.textContent = value ?? 0;
        });

        const tableBody = getElement("salesman-recent-orders");

        if (!tableBody) return;

        const orders = data.recent_orders || [];

        if (!orders.length) {
            tableBody.innerHTML = `
                <tr><td colspan="6">You haven't placed any orders yet.</td></tr>
            `;
            return;
        }

        tableBody.innerHTML = orders.map(order => `
            <tr>
                <td>${escapeHTML(order.order_number)}</td>
                <td>${escapeHTML(order.customer)}</td>
                <td>${formatOrderDate(order.order_date)}</td>
                <td>${Number(order.quantity || 0)}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td>${escapeHTML(order.status)}</td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Salesman dashboard loading failed:", error);
        showMessage("assistant-message", error.message);
    }
}

// =========================================================
// NAVIGATION
// =========================================================

const moduleDetails = {
    products: {
        title: "Products",
        description: "Manage manufactured products and product details."
    },
    customers: {
        title: "Customers",
        description: "Manage customer information."
    },
    orders: {
        title: "Orders",
        description: "Create and manage customer sales orders."
    },
    inventory: {
        title: "Inventory",
        description: "Monitor raw materials and finished goods."
    },
    production: {
        title: "Production",
        description: "Manage production runs and production costs."
    },
    invoices: {
        title: "GST Invoices",
        description: "Generate and manage GST invoices."
    },
    dispatch: {
        title: "Dispatch",
        description: "Manage finished goods dispatches."
    },
    payments: {
        title: "Payments",
        description: "Record payments and monitor outstanding balances."
    },
    reports: {
        title: "Audit Reports",
        description: "Review sales, production, inventory and payment reports."
    }
};

function openFactoryFlowPage(pageName) {
    if (
        isSalesman() &&
        !["dashboard", "products", "customers", "orders"].includes(pageName)
    ) {
        alert("You do not have permission to access this module.");
        return;
    }

    const dashboardPage = getElement("dashboard-page");
    const modulePage = getElement("module-page");
    const pageTitle = getElement("page-title");

    if (!dashboardPage || !modulePage || !pageTitle) {
        console.error("Dashboard or module page element is missing.");
        return;
    }

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
    });

    const selectedLink = document.querySelector(
        `.nav-link[data-page="${pageName}"]`
    );

    if (selectedLink) selectedLink.classList.add("active");

    if (pageName === "dashboard") {
        dashboardPage.classList.add("active-page");
        modulePage.classList.remove("active-page");

        pageTitle.textContent = "Dashboard Overview";

        loadDashboardData();
        return;
    }

    const details = moduleDetails[pageName];

    if (!details) {
        console.error("Unknown module:", pageName);
        return;
    }

    dashboardPage.classList.remove("active-page");
    modulePage.classList.add("active-page");

    pageTitle.textContent = details.title;

    const heading = getElement("module-heading");
    const description = getElement("module-description");

    if (heading) heading.textContent = details.title;
    if (description) description.textContent = details.description;

    const loaders = {
        products: loadProductsModule,
        customers: loadCustomersModule,
        orders: loadOrdersModule,
        inventory: loadInventoryModule,
        invoices: loadInvoicesModule,
        dispatch: loadDispatchModule,
        payments: loadPaymentsModule,
        reports: loadReportsModule,
        production: loadProductionModule
    };

    if (loaders[pageName]) {
        loaders[pageName]();
    }
}

// =========================================================
// PRODUCTS MODULE
// =========================================================

async function loadProductsModule() {
    const container = getElement("module-content");
    if (!container) return;

    container.innerHTML = `
        <div class="products-toolbar">
            <input type="search" id="product-search"
                placeholder="Search products by name, category or HSN...">

            ${!isSalesman() ? `
                <button id="show-product-form" type="button">
                    + Add Product
                </button>
            ` : ""}
        </div>

        <div id="product-form-container"></div>

        <div class="products-table-wrapper">
            <h3>Product Catalogue</h3>
            <p id="product-count">Loading products...</p>

            <table class="products-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Pack Size</th>
                        <th>Selling Price</th>
                        <th>GST</th>
                        <th>HSN Code</th>
                    </tr>
                </thead>
                <tbody id="products-table-body">
                    <tr><td colspan="7">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    const addButton = getElement("show-product-form");

    if (addButton) {
        addButton.addEventListener("click", showProductForm);
    }

    getElement("product-search").addEventListener("input", filterProducts);

    await fetchProducts();
}

async function fetchProducts() {
    const tableBody = getElement("products-table-body");
    const count = getElement("product-count");

    if (!tableBody || !count) return;

    try {
        const data = await apiRequest("/products");

        factoryProducts = data.products || [];

        renderProducts(factoryProducts);

        count.textContent =
            `Total Products: ${data.total_products ?? factoryProducts.length}`;

    } catch (error) {
        console.error("Product loading failed:", error);

        tableBody.innerHTML =
            `<tr><td colspan="7">${escapeHTML(error.message)}</td></tr>`;

        count.textContent = "Unable to load products.";
    }
}

function renderProducts(products) {
    const tableBody = getElement("products-table-body");
    if (!tableBody) return;

    if (!products.length) {
        tableBody.innerHTML =
            `<tr><td colspan="7">No products found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = products.map(product => `
        <tr>
            <td>${escapeHTML(product.id)}</td>
            <td><strong>${escapeHTML(product.name)}</strong></td>
            <td>${escapeHTML(product.category)}</td>
            <td>${escapeHTML(product.pack_size_grams)} g</td>
            <td>${formatCurrency(product.selling_price)}</td>
            <td>${escapeHTML(product.gst_rate)}%</td>
            <td>${escapeHTML(product.hsn_code)}</td>
        </tr>
    `).join("");
}

function filterProducts(event) {
    const search = event.target.value.toLowerCase();

    renderProducts(factoryProducts.filter(product =>
        String(product.name || "").toLowerCase().includes(search) ||
        String(product.category || "").toLowerCase().includes(search) ||
        String(product.hsn_code || "").toLowerCase().includes(search)
    ));
}

// =========================================================
// ADD PRODUCT
// =========================================================

function showProductForm() {
    if (isSalesman()) return;

    const container = getElement("product-form-container");
    if (!container) return;

    container.innerHTML = `
        <div class="product-form-panel">
            <h3>Add New Product</h3>

            <form id="add-product-form">
                <div class="product-form-grid">
                    <div>
                        <label>Product Name</label>
                        <input name="name" required>
                    </div>
                    <div>
                        <label>Category</label>
                        <input name="category" required>
                    </div>
                    <div>
                        <label>Pack Size (grams)</label>
                        <input name="pack_size_grams" type="number" min="1" required>
                    </div>
                    <div>
                        <label>Selling Price (₹)</label>
                        <input name="selling_price" type="number" min="0.01"
                            step="0.01" required>
                    </div>
                    <div>
                        <label>GST Rate (%)</label>
                        <input name="gst_rate" type="number" min="0"
                            step="0.01" required>
                    </div>
                    <div>
                        <label>HSN Code</label>
                        <input name="hsn_code" required>
                    </div>
                </div>

                <div class="product-form-actions">
                    <button type="submit">Save Product</button>
                    <button type="button" id="cancel-product-form">Cancel</button>
                </div>

                <p id="product-form-message"></p>
            </form>
        </div>
    `;

    getElement("add-product-form")
        .addEventListener("submit", createProduct);

    getElement("cancel-product-form").addEventListener("click", () => {
        container.innerHTML = "";
    });
}

async function createProduct(event) {
    event.preventDefault();

    if (isSalesman()) return;

    const form = event.target;
    const button = form.querySelector('button[type="submit"]');

    const productData = {
        name: form.elements.name.value.trim(),
        category: form.elements.category.value.trim(),
        pack_size_grams: Number(form.elements.pack_size_grams.value),
        selling_price: Number(form.elements.selling_price.value),
        gst_rate: Number(form.elements.gst_rate.value),
        hsn_code: form.elements.hsn_code.value.trim()
    };

    button.disabled = true;

    try {
        await apiRequest("/admin/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productData)
        });

        showMessage("product-form-message", "Product added successfully!", "green");

        await fetchProducts();

        setTimeout(() => {
            const container = getElement("product-form-container");
            if (container) container.innerHTML = "";
        }, 1000);

    } catch (error) {
        showMessage("product-form-message", error.message);

    } finally {
        button.disabled = false;
    }
}

// =========================================================
// CUSTOMERS MODULE
// =========================================================

async function loadCustomersModule() {
    const content = getElement("module-content");
    if (!content) return;

    content.innerHTML = `
        <div class="module-toolbar">
            <input type="text" id="customer-search"
                placeholder="Search customers by name, type, phone or GSTIN...">

            ${!isSalesman() ? `
                <button class="primary-btn" id="add-customer-btn">
                    + Add Customer
                </button>
            ` : ""}
        </div>

        <div id="customer-form-container" style="display:none;">
            <div class="products-table-card">
                <h3>Add New Customer</h3>

                <form id="customer-form">
                    <div class="form-grid">
                        <input name="name" placeholder="Customer Name" required>

                        <select name="customer_type" required>
                            <option value="">Select Customer Type</option>
                            <option value="Retailer">Retailer</option>
                            <option value="Distributor">Distributor</option>
                            <option value="Wholesaler">Wholesaler</option>
                        </select>

                        <input name="phone" type="tel" placeholder="Phone Number" required>
                        <input name="email" type="email" placeholder="Email Address" required>
                        <input name="gstin" placeholder="GSTIN" required>
                        <input name="state" placeholder="State" required>
                    </div>

                    <button type="submit" class="primary-btn">Save Customer</button>
                    <button type="button" class="secondary-btn"
                        id="cancel-customer-btn">Cancel</button>
                </form>
            </div>
        </div>

        <div class="products-table-card">
            <h3>Customer Directory</h3>
            <p id="customer-count">Loading customers...</p>

            <div class="table-responsive">
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>ID</th><th>Customer</th><th>Type</th>
                            <th>Phone</th><th>Email</th><th>GSTIN</th><th>State</th>
                        </tr>
                    </thead>
                    <tbody id="customers-table-body">
                        <tr><td colspan="7">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    getElement("customer-search")
        .addEventListener("input", filterCustomers);

    const addButton = getElement("add-customer-btn");

    if (addButton) {
        addButton.addEventListener("click", () => {
            getElement("customer-form-container").style.display = "block";
        });
    }

    const cancelButton = getElement("cancel-customer-btn");

    if (cancelButton) {
        cancelButton.addEventListener("click", () => {
            getElement("customer-form-container").style.display = "none";
        });
    }

    const form = getElement("customer-form");

    if (form) {
        form.addEventListener("submit", createCustomer);
    }

    await fetchCustomers();
}

async function fetchCustomers() {
    const tableBody = getElement("customers-table-body");
    const count = getElement("customer-count");

    if (!tableBody || !count) return;

    try {
        const response = await apiRequest("/customers");

        allCustomers = response.customers || [];

        renderCustomers(allCustomers);

        count.textContent =
            `Total Customers: ${response.total_customers ?? allCustomers.length}`;

    } catch (error) {
        tableBody.innerHTML =
            `<tr><td colspan="7">${escapeHTML(error.message)}</td></tr>`;

        count.textContent = "Customer loading failed.";
    }
}

function renderCustomers(customers) {
    const tableBody = getElement("customers-table-body");
    if (!tableBody) return;

    if (!customers.length) {
        tableBody.innerHTML =
            `<tr><td colspan="7">No customers found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = customers.map(customer => `
        <tr>
            <td>${escapeHTML(customer.id)}</td>
            <td><strong>${escapeHTML(customer.name)}</strong></td>
            <td>${escapeHTML(customer.customer_type)}</td>
            <td>${escapeHTML(customer.phone || "-")}</td>
            <td>${escapeHTML(customer.email || "-")}</td>
            <td>${escapeHTML(customer.gstin || "-")}</td>
            <td>${escapeHTML(customer.state || "-")}</td>
        </tr>
    `).join("");
}

function filterCustomers() {
    const searchElement = getElement("customer-search");
    if (!searchElement) return;

    const search = searchElement.value.toLowerCase().trim();

    const filtered = allCustomers.filter(customer =>
        [
            customer.name,
            customer.customer_type,
            customer.phone,
            customer.email,
            customer.gstin,
            customer.state
        ].some(value =>
            String(value || "").toLowerCase().includes(search)
        )
    );

    renderCustomers(filtered);
}

async function createCustomer(event) {
    event.preventDefault();

    if (isSalesman()) return;

    const form = event.target;
    const formData = new FormData(form);
    const button = form.querySelector('button[type="submit"]');

    const customerData = {
        name: String(formData.get("name") || "").trim(),
        customer_type: formData.get("customer_type"),
        phone: String(formData.get("phone") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        gstin: String(formData.get("gstin") || "").trim().toUpperCase(),
        state: String(formData.get("state") || "").trim()
    };

    button.disabled = true;

    try {
        await apiRequest("/admin/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(customerData)
        });

        alert("Customer added successfully!");

        form.reset();

        getElement("customer-form-container").style.display = "none";

        await fetchCustomers();

    } catch (error) {
        alert("Unable to add customer: " + error.message);

    } finally {
        button.disabled = false;
    }
}

// =========================================================
// ORDERS MODULE
// =========================================================

async function loadOrdersModule() {
    if (isSalesman()) {
        await loadSalesmanOrdersModule();
        return;
    }

    const content = getElement("module-content");
    if (!content) return;

    content.innerHTML = `
        <div class="module-toolbar">
            <input type="text" id="order-search"
                placeholder="Search by order number, customer or salesman...">

            <button class="primary-btn" id="refresh-orders">↻ Refresh</button>
        </div>

        <div class="products-table-card">
            <h3>Order Directory</h3>
            <p id="order-count">Loading orders...</p>

            <div class="table-responsive">
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>Order ID</th><th>Order Number</th>
                            <th>Customer</th><th>Salesman</th>
                            <th>Products</th><th>Quantity</th>
                            <th>Order Value</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="orders-table-body">
                        <tr><td colspan="8">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    getElement("order-search").addEventListener("input", filterOrders);
    getElement("refresh-orders").addEventListener("click", fetchOrders);

    await fetchOrders();
}

// =========================================================
// SALESMAN ORDER FORM
// =========================================================

async function loadSalesmanOrdersModule() {
    const content = getElement("module-content");
    if (!content) return;

    content.innerHTML = `
        <div class="products-table-card">
            <h3>Create New Sales Order</h3>

            <form id="sales-order-form">
                <div class="form-grid">
                    <div>
                        <label>Select Customer</label>
                        <select id="sales-order-customer" required>
                            <option value="">Loading customers...</option>
                        </select>
                    </div>

                    <div>
                        <label>Select Product</label>
                        <select id="sales-order-product" required>
                            <option value="">Loading products...</option>
                        </select>
                    </div>

                    <div>
                        <label>Quantity</label>
                        <input type="number" id="sales-order-quantity"
                            min="1" value="1" required>
                    </div>
                </div>

                <div style="margin-top:15px;">
                    <label>Order Notes</label>
                    <textarea id="sales-order-notes"
                        placeholder="Enter additional order notes..."></textarea>
                </div>

                <button type="submit" class="primary-btn"
                    id="submit-sales-order">Create Order</button>

                <p id="sales-order-message"></p>
            </form>
        </div>

        <div class="products-table-card">
            <h3>My Sales Orders</h3>

            <button class="primary-btn" id="refresh-sales-orders">
                ↻ Refresh Orders
            </button>

            <p id="sales-order-count">Loading orders...</p>

            <div class="table-responsive">
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>Order Number</th><th>Customer</th>
                            <th>Quantity</th><th>Order Value</th>
                            <th>Date</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="sales-orders-table-body">
                        <tr><td colspan="6">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    getElement("sales-order-form")
        .addEventListener("submit", submitSalesOrder);

    getElement("refresh-sales-orders")
        .addEventListener("click", fetchSalesmanOrders);

    await loadSalesOrderOptions();
    await fetchSalesmanOrders();
}

async function loadSalesOrderOptions() {
    try {
        const [customerData, productData] = await Promise.all([
            apiRequest("/customers"),
            apiRequest("/products")
        ]);

        const customerSelect = getElement("sales-order-customer");
        const productSelect = getElement("sales-order-product");

        customerSelect.innerHTML = `
            <option value="">Select Customer</option>
            ${(customerData.customers || []).map(customer => `
                <option value="${customer.id}">
                    ${escapeHTML(customer.name)}
                </option>
            `).join("")}
        `;

        productSelect.innerHTML = `
            <option value="">Select Product</option>
            ${(productData.products || []).map(product => `
                <option value="${product.id}">
                    ${escapeHTML(product.name)} -
                    ${formatCurrency(product.selling_price)}
                </option>
            `).join("")}
        `;

    } catch (error) {
        console.error("Sales order options loading failed:", error);
        showMessage("sales-order-message", error.message);
    }
}

async function submitSalesOrder(event) {
    event.preventDefault();

    const customerId = Number(getElement("sales-order-customer").value);
    const productId = Number(getElement("sales-order-product").value);
    const quantity = Number(getElement("sales-order-quantity").value);
    const notes = getElement("sales-order-notes").value.trim();

    const button = getElement("submit-sales-order");

    if (!customerId || !productId || quantity <= 0) {
        showMessage("sales-order-message",
            "Please complete all required fields.");
        return;
    }

    button.disabled = true;
    button.textContent = "Creating Order...";

    try {
        const response = await apiRequest("/sales/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: customerId,
                items: [{
                    product_id: productId,
                    quantity: quantity
                }],
                notes: notes
            })
        });

        showMessage(
            "sales-order-message",
            `Order ${response.order_number} created successfully!`,
            "green"
        );

        getElement("sales-order-form").reset();

        await fetchSalesmanOrders();

    } catch (error) {
        showMessage("sales-order-message", error.message);

    } finally {
        button.disabled = false;
        button.textContent = "Create Order";
    }
}

async function fetchSalesmanOrders() {
    const tableBody = getElement("sales-orders-table-body");
    const count = getElement("sales-order-count");

    if (!tableBody || !count) return;

    try {
        const response = await apiRequest("/sales/orders");
        const orders = response.orders || [];

        if (!orders.length) {
            tableBody.innerHTML =
                `<tr><td colspan="6">No sales orders found.</td></tr>`;
        } else {
            tableBody.innerHTML = orders.map(order => `
                <tr>
                    <td><strong>${escapeHTML(order.order_number)}</strong></td>
                    <td>${escapeHTML(order.customer)}</td>
                    <td>${Number(order.quantity || 0)}</td>
                    <td>${formatCurrency(order.total_amount)}</td>
                    <td>${formatOrderDate(order.order_date)}</td>
                    <td>${escapeHTML(order.status)}</td>
                </tr>
            `).join("");
        }

        count.textContent =
            `Total Orders: ${response.total_orders ?? orders.length}`;

    } catch (error) {
        tableBody.innerHTML =
            `<tr><td colspan="6">${escapeHTML(error.message)}</td></tr>`;

        count.textContent = "Unable to load orders.";
    }
}

// =========================================================
// ADMIN ORDERS
// =========================================================

async function fetchOrders() {
    const tableBody = getElement("orders-table-body");
    const count = getElement("order-count");

    if (!tableBody || !count) return;

    try {
        const response = await apiRequest("/admin/orders");

        allOrders = response.orders || [];

        renderOrders(allOrders);

        count.textContent =
            `Total Orders: ${response.total_orders ?? allOrders.length}`;

    } catch (error) {
        console.error("Order loading failed:", error);

        tableBody.innerHTML =
            `<tr><td colspan="8">${escapeHTML(error.message)}</td></tr>`;

        count.textContent = "Order loading failed.";
    }
}

function renderOrders(orders) {
    const tableBody = getElement("orders-table-body");
    if (!tableBody) return;

    if (!orders.length) {
        tableBody.innerHTML =
            `<tr><td colspan="8">No orders found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = orders.map(order => {
        const items = order.items || [];

        const products = items.map(item =>
            escapeHTML(item.product || item.product_name || "-")
        ).join(", ");

        const quantity = items.reduce(
            (total, item) => total + Number(item.quantity || 0),
            0
        );

        const amount = items.reduce(
            (total, item) => total + Number(item.subtotal || 0),
            0
        );

        return `
            <tr>
                <td>${escapeHTML(order.order_id ?? order.id ?? "-")}</td>
                <td><strong>${escapeHTML(order.order_number)}</strong></td>
                <td>${escapeHTML(order.customer)}</td>
                <td>${escapeHTML(order.salesman)}</td>
                <td>${products || "-"}</td>
                <td>${quantity}</td>
                <td>${formatCurrency(amount)}</td>
                <td>${escapeHTML(order.status)}</td>
            </tr>
        `;
    }).join("");
}

function filterOrders() {
    const searchElement = getElement("order-search");
    if (!searchElement) return;

    const search = searchElement.value.toLowerCase().trim();

    const filtered = allOrders.filter(order =>
        [
            order.order_number,
            order.customer,
            order.salesman,
            order.status
        ].some(value =>
            String(value || "").toLowerCase().includes(search)
        )
    );

    renderOrders(filtered);
}

// =========================================================
// GENERIC TABLE RENDERER
// =========================================================

function renderSimpleTable(containerId, columns, rows) {
    const body = getElement(containerId);
    if (!body) return;

    if (!rows.length) {
        body.innerHTML =
            `<tr><td colspan="${columns.length}">No records found.</td></tr>`;
        return;
    }

    body.innerHTML = rows.map(row => `
        <tr>
            ${columns.map(column => `
                <td>${escapeHTML(row[column] ?? "-")}</td>
            `).join("")}
        </tr>
    `).join("");
}

// =========================================================
// INVENTORY MODULE
// =========================================================

async function loadInventoryModule() {
    const container = getElement("module-content");
    if (!container) return;

    container.innerHTML = `
        <div class="products-table-wrapper">
            <h3>Inventory Overview</h3>
            <p id="inventory-count">Loading inventory...</p>

            <table class="products-table">
                <thead>
                    <tr>
                        <th>ID</th><th>Item Name</th><th>Type</th>
                        <th>Current Stock</th><th>Unit</th>
                        <th>Unit Cost</th><th>Stock Value</th>
                    </tr>
                </thead>
                <tbody id="inventory-table-body">
                    <tr><td colspan="7">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    await fetchInventory();
}

async function fetchInventory() {
    const body = getElement("inventory-table-body");
    const count = getElement("inventory-count");

    try {
        const data = await apiRequest("/reports/inventory");
        const inventory = data.inventory || [];

        if (!inventory.length) {
            body.innerHTML =
                `<tr><td colspan="7">No inventory records found.</td></tr>`;
        } else {
            body.innerHTML = inventory.map(item => `
                <tr>
                    <td>${escapeHTML(item.inventory_id)}</td>
                    <td>${escapeHTML(item.item_name)}</td>
                    <td>${escapeHTML(item.item_type)}</td>
                    <td>${escapeHTML(item.current_stock)}</td>
                    <td>${escapeHTML(item.unit)}</td>
                    <td>${formatCurrency(item.unit_cost)}</td>
                    <td>${formatCurrency(item.stock_value)}</td>
                </tr>
            `).join("");
        }

        count.textContent =
            `Total Items: ${data.total_items ?? inventory.length} | Total Value: ${formatCurrency(data.total_inventory_value)}`;

    } catch (error) {
        body.innerHTML =
            `<tr><td colspan="7">${escapeHTML(error.message)}</td></tr>`;

        count.textContent = "Unable to load inventory.";
    }
}

// =========================================================
// INVOICES MODULE
// =========================================================

async function loadInvoicesModule() {
    const container = getElement("module-content");
    if (!container) return;

    container.innerHTML = `
        <div class="products-table-wrapper">
            <h3>GST Invoice Register</h3>
            <p id="invoice-count">Loading invoices...</p>

            <table class="products-table">
                <thead>
                    <tr>
                        <th>Invoice Number</th><th>Customer</th><th>Date</th>
                        <th>Taxable Amount</th><th>CGST</th><th>SGST</th>
                        <th>IGST</th><th>Total</th><th>Status</th>
                    </tr>
                </thead>
                <tbody id="invoices-table-body">
                    <tr><td colspan="9">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    await fetchInvoices();
}

async function fetchInvoices() {
    const body = getElement("invoices-table-body");
    const count = getElement("invoice-count");

    try {
        const data = await apiRequest("/invoices");
        const invoices = data.invoices || [];

        if (!invoices.length) {
            body.innerHTML =
                `<tr><td colspan="9">No invoices found.</td></tr>`;
        } else {
            body.innerHTML = invoices.map(invoice => `
                <tr>
                    <td>${escapeHTML(invoice.invoice_number)}</td>
                    <td>${escapeHTML(invoice.customer)}</td>
                    <td>${formatOrderDate(invoice.invoice_date)}</td>
                    <td>${formatCurrency(invoice.taxable_amount)}</td>
                    <td>${formatCurrency(invoice.cgst)}</td>
                    <td>${formatCurrency(invoice.sgst)}</td>
                    <td>${formatCurrency(invoice.igst)}</td>
                    <td>${formatCurrency(invoice.total_amount)}</td>
                    <td>${escapeHTML(invoice.status)}</td>
                </tr>
            `).join("");
        }

        count.textContent =
            `Total Invoices: ${data.total_invoices ?? invoices.length}`;

    } catch (error) {
        body.innerHTML =
            `<tr><td colspan="9">${escapeHTML(error.message)}</td></tr>`;

        count.textContent = "Unable to load invoices.";
    }
}

// =========================================================
// DISPATCH MODULE
// =========================================================

async function loadDispatchModule() {
    const container = getElement("module-content");
    if (!container) return;

    container.innerHTML = `
        <div class="products-table-wrapper">
            <h3>Dispatch Register</h3>
            <p id="dispatch-count">Loading dispatches...</p>

            <table class="products-table">
                <thead>
                    <tr>
                        <th>Dispatch ID</th><th>Dispatch Number</th>
                        <th>Order ID</th><th>Invoice ID</th>
                        <th>Dispatch Date</th><th>Status</th>
                    </tr>
                </thead>
                <tbody id="dispatch-table-body">
                    <tr><td colspan="6">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    await fetchDispatches();
}

async function fetchDispatches() {
    const body = getElement("dispatch-table-body");
    const count = getElement("dispatch-count");

    try {
        const data = await apiRequest("/dispatches");
        const dispatches = data.dispatches || [];

        if (!dispatches.length) {
            body.innerHTML =
                `<tr><td colspan="6">No dispatch records found.</td></tr>`;
        } else {
            body.innerHTML = dispatches.map(item => `
                <tr>
                    <td>${escapeHTML(item.dispatch_id)}</td>
                    <td>${escapeHTML(item.dispatch_number)}</td>
                    <td>${escapeHTML(item.order_id)}</td>
                    <td>${escapeHTML(item.invoice_id)}</td>
                    <td>${formatOrderDate(item.dispatch_date)}</td>
                    <td>${escapeHTML(item.status)}</td>
                </tr>
            `).join("");
        }

        count.textContent =
            `Total Dispatches: ${data.total_dispatches ?? dispatches.length}`;

    } catch (error) {
        body.innerHTML =
            `<tr><td colspan="6">${escapeHTML(error.message)}</td></tr>`;

        count.textContent = "Unable to load dispatches.";
    }
}

// =========================================================
// PAYMENTS MODULE
// =========================================================

async function loadPaymentsModule() {
    const container = getElement("module-content");
    if (!container) return;

    container.innerHTML = `
        <div class="products-table-wrapper">
            <h3>Payments Register</h3>
            <p id="payments-count">Loading payments...</p>

            <table class="products-table">
                <thead>
                    <tr>
                        <th>Payment ID</th><th>Invoice Number</th>
                        <th>Amount</th><th>Payment Method</th>
                        <th>Reference Number</th><th>Payment Date</th>
                    </tr>
                </thead>
                <tbody id="payments-table-body">
                    <tr><td colspan="6">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    await fetchPayments();
}

async function fetchPayments() {
    const body = getElement("payments-table-body");
    const count = getElement("payments-count");

    try {
        const data = await apiRequest("/payments");
        const payments = data.payments || [];

        if (!payments.length) {
            body.innerHTML =
                `<tr><td colspan="6">No payment records found.</td></tr>`;
        } else {
            body.innerHTML = payments.map(payment => `
                <tr>
                    <td>${escapeHTML(payment.payment_id)}</td>
                    <td>${escapeHTML(payment.invoice_number)}</td>
                    <td>${formatCurrency(payment.amount)}</td>
                    <td>${escapeHTML(payment.payment_method)}</td>
                    <td>${escapeHTML(payment.reference_number || "-")}</td>
                    <td>${formatOrderDate(payment.payment_date)}</td>
                </tr>
            `).join("");
        }

        count.textContent =
            `Total Payments: ${data.total_payments ?? payments.length}`;

    } catch (error) {
        body.innerHTML =
            `<tr><td colspan="6">${escapeHTML(error.message)}</td></tr>`;

        count.textContent = "Unable to load payments.";
    }
}

// =========================================================
// REPORTS MODULE
// =========================================================

async function loadReportsModule() {
    const container = getElement("module-content");
    if (!container) return;

    container.innerHTML = `
        <div class="products-table-wrapper">
            <h3>FactoryFlow Owner Audit Dashboard</h3>
            <p id="report-status">Loading audit reports...</p>
            <div class="report-grid" id="report-grid"></div>
        </div>
    `;

    await fetchAuditDashboard();
}

async function fetchAuditDashboard() {
    const grid = getElement("report-grid");
    const status = getElement("report-status");

    try {
        const data = await apiRequest("/reports/audit-dashboard");

        status.textContent = "Audit dashboard updated successfully.";

        grid.innerHTML = `
            <div class="stat-card">
                <h3>Total Invoices</h3>
                <p>${data.sales?.invoice_count ?? 0}</p>
            </div>

            <div class="stat-card">
                <h3>Taxable Sales</h3>
                <p>${formatCurrency(data.sales?.taxable_sales)}</p>
            </div>

            <div class="stat-card">
                <h3>Total Sales (With GST)</h3>
                <p>${formatCurrency(data.sales?.total_sales_with_tax)}</p>
            </div>

            <div class="stat-card">
                <h3>Payments Received</h3>
                <p>${formatCurrency(data.payments?.total_received)}</p>
            </div>

            <div class="stat-card">
                <h3>Outstanding Balance</h3>
                <p>${formatCurrency(data.payments?.total_outstanding)}</p>
            </div>

            <div class="stat-card">
                <h3>Production Runs</h3>
                <p>${data.production?.total_runs ?? 0}</p>
            </div>

            <div class="stat-card">
                <h3>Production Output</h3>
                <p>${data.production?.actual_output ?? 0} /
                    ${data.production?.expected_output ?? 0}</p>
            </div>

            <div class="stat-card">
                <h3>Inventory Value</h3>
                <p>${formatCurrency(data.inventory?.total_inventory_value)}</p>
            </div>
        `;

    } catch (error) {
        console.error("Audit report loading failed:", error);

        status.textContent = "Unable to load audit reports.";
        grid.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
    }
}

// =========================================================
// PRODUCTION MODULE
// =========================================================

async function loadProductionModule() {
    const container = getElement("module-content");
    if (!container) return;

    container.innerHTML = `
        <div class="products-table-wrapper">
            <h3>Production Overview</h3>
            <p id="production-status">Loading production report...</p>

            <div class="report-grid" id="production-summary"></div>

            <h3>Production Run Register</h3>

            <table class="products-table">
                <thead>
                    <tr>
                        <th>Run ID</th><th>Expected Output</th>
                        <th>Actual Output</th><th>Output Variance</th>
                        <th>Production Cost</th><th>Cost per Packet</th>
                    </tr>
                </thead>
                <tbody id="production-table-body">
                    <tr><td colspan="6">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;

    await fetchProductionReport();
}

async function fetchProductionReport() {
    const summary = getElement("production-summary");
    const body = getElement("production-table-body");
    const status = getElement("production-status");

    try {
        const data = await apiRequest("/reports/production");

        const report = data.summary || {};
        const runs = data.production_runs || [];

        summary.innerHTML = `
            <div class="stat-card">
                <h3>Total Production Runs</h3>
                <p>${report.total_runs ?? 0}</p>
            </div>

            <div class="stat-card">
                <h3>Expected Output</h3>
                <p>${report.total_expected_output ?? 0}</p>
            </div>

            <div class="stat-card">
                <h3>Actual Output</h3>
                <p>${report.total_actual_output ?? 0}</p>
            </div>

            <div class="stat-card">
                <h3>Total Output Variance</h3>
                <p>${report.total_output_variance ?? 0}</p>
            </div>

            <div class="stat-card">
                <h3>Total Production Cost</h3>
                <p>${formatCurrency(report.total_production_cost)}</p>
            </div>
        `;

        if (!runs.length) {
            body.innerHTML =
                `<tr><td colspan="6">No production records found.</td></tr>`;
        } else {
            body.innerHTML = runs.map(run => `
                <tr>
                    <td>${escapeHTML(run.run_id)}</td>
                    <td>${escapeHTML(run.expected_output)}</td>
                    <td>${escapeHTML(run.actual_output)}</td>
                    <td>${escapeHTML(run.output_variance)}</td>
                    <td>${formatCurrency(run.production_cost)}</td>
                    <td>${formatCurrency(run.cost_per_packet)}</td>
                </tr>
            `).join("");
        }

        status.textContent = "Production report loaded successfully.";

    } catch (error) {
        console.error("Production report loading failed:", error);

        status.textContent = "Unable to load production report.";

        body.innerHTML =
            `<tr><td colspan="6">${escapeHTML(error.message)}</td></tr>`;
    }
}

// =========================================================
// APPLICATION INITIALIZATION
// =========================================================

// =========================================================
// APPLICATION INITIALIZATION
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

    // STEP 1: REQUEST ACCESS TOKEN BEFORE ANY API REQUEST
    requestAccessToken();

    // Language
    const languageSelect = getElement("language-select");

    const savedLanguage =
        localStorage.getItem("factoryflow-language") || "en";

    if (languageSelect) {
        languageSelect.value = savedLanguage;

        languageSelect.addEventListener("change", event => {
            changeLanguage(event.target.value);
        });
    }

    changeLanguage(savedLanguage);

    // Voice assistant
    const voiceButton = getElement("voice-btn");

    if (voiceButton) {
        voiceButton.addEventListener("click", startVoiceAssistant);
    }

    // Sound
    const soundButton = getElement("sound-btn");

    if (soundButton) {
        soundButton.addEventListener("click", () => {
            soundEnabled = !soundEnabled;
            updateSoundButton();

            if (!soundEnabled && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
        });
    }

    // Repeat
    const repeatButton = getElement("repeat-btn");

    if (repeatButton) {
        repeatButton.addEventListener("click", () => {
            const message = getElement("assistant-message");

            if (message) {
                speakMessage(message.textContent);
            }
        });
    }

    // Stop speech
    const stopButton = getElement("stop-speech-btn");

    if (stopButton) {
        stopButton.addEventListener("click", () => {
            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
        });
    }

    // Sidebar navigation
    document.querySelectorAll(".nav-link[data-page]").forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            openFactoryFlowPage(link.dataset.page);
        });
    });

    // Logout
    const logoutButton = getElement("logout-btn");

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem(TOKEN_KEY);

            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }

            location.reload();
        });
    }

    // Role permissions
    applyRolePermissions();

    // Initial dashboard
    if (getAccessToken()) {
        loadDashboardData();
    } else {
        console.warn("No access token found.");
        showMessage(
            "assistant-message",
            "Please enter a valid access token to continue."
        );
    }
});
function requestAccessToken() {
    let token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
        token = prompt("FactoryFlow: Please enter your access token:");

        if (token && token.trim()) {
            localStorage.setItem(TOKEN_KEY, token.trim());
        }
    }

    return token;
}