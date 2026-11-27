
/* ==========================================
   FACTORYFLOW - MAIN JAVASCRIPT
   Language + Voice + API + Navigation + Products
   + Customers + Orders
========================================== */

const API_BASE_URL = "http://127.0.0.1:8000";
const TOKEN_KEY = "factoryflow-access-token";

let currentLanguage = "en";
let soundEnabled = true;
let factoryProducts = [];
let allCustomers = [];
let allOrders = [];

// ==========================================
// TRANSLATIONS
// ==========================================

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
        totalSales: "Total Sales",
        invoiceValue: "Invoice value",
        paymentsReceived: "Payments Received",
        totalCollections: "Total collections",
        outstanding: "Outstanding",
        pendingPayments: "Pending payments",
        inventoryValue: "Inventory Value",
        currentStock: "Current stock valuation",
        productionOverview: "Production Overview",
        liveReport: "Live Report",
        productionRuns: "Production Runs",
        expectedOutput: "Expected Output",
        actualOutput: "Actual Output",
        systemInformation: "System Information",
        outputVariance: "Output variance",
        listening: "Listening... Speak now!",
        received: "I received your question.",
        tryAgain: "Please try again.",
        unsupported: "Voice recognition is not supported in this browser."
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
        totalSales: "மொத்த விற்பனை",
        invoiceValue: "விலைப்பட்டியல் மதிப்பு",
        paymentsReceived: "பெறப்பட்ட பணம்",
        totalCollections: "மொத்த வசூல்",
        outstanding: "நிலுவைத் தொகை",
        pendingPayments: "நிலுவை பணம்",
        inventoryValue: "சரக்கு மதிப்பு",
        currentStock: "தற்போதைய சரக்கு மதிப்பீடு",
        productionOverview: "உற்பத்தி கண்ணோட்டம்",
        liveReport: "நேரடி அறிக்கை",
        productionRuns: "உற்பத்தி சுற்றுகள்",
        expectedOutput: "எதிர்பார்க்கப்படும் உற்பத்தி",
        actualOutput: "உண்மையான உற்பத்தி",
        systemInformation: "கணினி தகவல்",
        outputVariance: "உற்பத்தி வேறுபாடு",
        listening: "கேட்டுக்கொண்டிருக்கிறேன்... பேசுங்கள்!",
        received: "உங்கள் கேள்வியைப் பெற்றுக்கொண்டேன்.",
        tryAgain: "மீண்டும் முயற்சிக்கவும்.",
        unsupported: "இந்த உலாவியில் குரல் வசதி ஆதரிக்கப்படவில்லை."
    }
};

function getElement(id) {
    return document.getElementById(id);
}

// ==========================================
// LANGUAGE MANAGEMENT
// ==========================================

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

    if (!button) return;

    const t = translations[currentLanguage];

    button.textContent = soundEnabled ? t.soundOn : t.soundOff;
}

// ==========================================
// VOICE ASSISTANT
// ==========================================

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

    recognition.onerror = event => {
        console.error("Voice recognition error:", event.error);

        if (message) {
            message.textContent = translations[currentLanguage].tryAgain;
        }
    };

    recognition.start();
}

// ==========================================
// AUTHENTICATION
// ==========================================

function getAccessToken() {
    let token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
        token = prompt("Paste your FactoryFlow access token:");

        if (token && token.trim()) {
            token = token.trim();
            localStorage.setItem(TOKEN_KEY, token);
        }
    }

    return token ? token.trim() : null;
}

async function apiRequest(endpoint, options = {}) {
    const token = getAccessToken();

    if (!token) {
        throw new Error("Authentication token is missing.");
    }

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    // Only 401 means authentication is invalid.
    // A 403 may simply mean the user lacks permission.
    if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);

        throw new Error(
            "Your session has expired or your token is invalid. Please log in again."
        );
    }

    let data = {};

    const responseText = await response.text();

    if (responseText) {
        try {
            data = JSON.parse(responseText);
        } catch {
            data = { detail: responseText };
        }
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

// ==========================================
// FORMATTING
// ==========================================

function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
    }).format(Number(value || 0));
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// ==========================================
// DASHBOARD
// ==========================================


async function loadDashboardData() {
    const token = localStorage.getItem(TOKEN_KEY);

    let userRole = null;

    try {
        const payload = JSON.parse(
            atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
        );

        userRole = payload.role;

    } catch (error) {
        console.error("Unable to identify user role:", error);
    }

    console.log("Detected dashboard role:", userRole);
    
    const adminSections = [
    "admin-welcome-section",
    "admin-kpi-section",
    "admin-dashboard-panels"
];

adminSections.forEach(id => {
    const section = getElement(id);
    if (section) {
        section.style.display =
            userRole === "salesman" ? "none" : "";
    }
});

    // SALESMAN DASHBOARD
   
if (userRole === "salesman") {
    try {
        const data = await apiRequest("/sales/dashboard");

        const message = getElement("assistant-message");

        if (message) {
            message.textContent = `Welcome, ${data.username}! Here's your sales overview.`;
        }

        console.log("Salesman dashboard loaded successfully.", data);

        // Update dashboard statistics
        const stats = {
            "total-orders": data.total_orders,
            "pending-orders": data.pending_orders,
            "approved-orders": data.approved_orders,
            "total-sales": formatCurrency(data.total_sales),
            "total-items": data.total_items
        };

        Object.entries(stats).forEach(([id, value]) => {
            const element = getElement(id);
            if (element) element.textContent = value;
        });

const ordersBody = getElement("salesman-recent-orders");

if (ordersBody) {
    if (!data.recent_orders || data.recent_orders.length === 0) {
        ordersBody.innerHTML = `
            <tr>
                <td colspan="6">No orders found.</td>
            </tr>
        `;
    } else {
        ordersBody.innerHTML = data.recent_orders.map(order => `
            <tr>
                <td>${escapeHTML(order.order_number)}</td>
                <td>${escapeHTML(order.customer)}</td>
                <td>${order.order_date
                    ? new Date(order.order_date).toLocaleDateString()
                    : "-"}</td>
                <td>${order.quantity}</td>
                <td>${formatCurrency(order.total_amount)}</td>
                <td>${escapeHTML(order.status)}</td>
            </tr>
        `).join("");
    }
}


    } catch (error) {
        console.error("Salesman dashboard loading failed:", error);
    }

    return;
}

    // ADMIN / ACCOUNTANT / OWNER DASHBOARD
    try {
        const data = await apiRequest("/reports/audit-dashboard");

        const setText = (id, value) => {
            const element = getElement(id);

            if (element) element.textContent = value;
        };

        setText(
            "total-sales",
            formatCurrency(data.sales?.total_sales_with_tax)
        );

        setText(
            "payments-received",
            formatCurrency(data.payments?.total_received)
        );

        setText(
            "outstanding",
            formatCurrency(data.payments?.total_outstanding)
        );

        setText(
            "inventory-value",
            formatCurrency(data.inventory?.total_inventory_value)
        );

        setText(
            "production-runs",
            data.production?.total_runs ?? 0
        );

        setText(
            "expected-output",
            data.production?.expected_output ?? 0
        );

        setText(
            "actual-output",
            data.production?.actual_output ?? 0
        );

        const variance = getElement("production-variance");

        if (variance) {
            variance.textContent =
                `${translations[currentLanguage].outputVariance}: ${data.production?.output_variance ?? 0}`;
        }

        console.log("Dashboard loaded successfully.", data);

    } catch (error) {
        console.error("Dashboard loading failed:", error);

        const message = getElement("assistant-message");

        if (message) message.textContent = error.message;
    }
}
// ==========================================
// SIDEBAR NAVIGATION
// ==========================================

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

    if (selectedLink) {
        selectedLink.classList.add("active");
    }

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

    if (pageName === "products") {
        loadProductsModule();

    } else if (pageName === "customers") {
        loadCustomersModule();

    } else if (pageName === "orders") {
        loadOrdersModule();

    } else if (pageName === "inventory") {
    loadInventoryModule();

} else if (pageName === "invoices") {
    loadInvoicesModule();

}else if (pageName === "dispatch") {
    loadDispatchModule();

}else if (pageName === "payments") {
    loadPaymentsModule();
 }else if (pageName === "reports") {
    loadReportsModule();
 } else if (pageName === "production") {
    loadProductionModule();
 }
 else {
        getElement("module-content").innerHTML = `
            <div class="module-placeholder">
                <div class="module-placeholder-icon">⚙️</div>
                <h3>${escapeHTML(details.title)} Module</h3>
                <p>Module interface will be implemented next.</p>
            </div>
        `;
    }
}

// ==========================================
// PRODUCTS MODULE
// ==========================================

async function loadProductsModule() {
    const container = getElement("module-content");

    container.innerHTML = `
        <div class="products-toolbar">
            <input
                type="search"
                id="product-search"
                placeholder="Search products by name, category or HSN..."
            >

            <button id="show-product-form" type="button">
                + Add Product
            </button>
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

    getElement("show-product-form")
        .addEventListener("click", showProductForm);

    getElement("product-search")
        .addEventListener("input", filterProducts);

    await fetchProducts();
}

async function fetchProducts() {
    const tableBody = getElement("products-table-body");
    const countElement = getElement("product-count");

    try {
        const data = await apiRequest("/products");

        factoryProducts = data.products || [];

        renderProducts(factoryProducts);

        countElement.textContent =
            `Total Products: ${data.total_products ?? factoryProducts.length}`;

    } catch (error) {
        console.error("Product loading failed:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">${escapeHTML(error.message)}</td>
            </tr>
        `;

        countElement.textContent = "Unable to load products.";
    }
}

function renderProducts(products) {
    const tableBody = getElement("products-table-body");

    if (!tableBody) return;

    if (!products.length) {
        tableBody.innerHTML = `
            <tr><td colspan="7">No products found.</td></tr>
        `;
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
    const searchText = event.target.value.toLowerCase();

    const filtered = factoryProducts.filter(product =>
        String(product.name || "").toLowerCase().includes(searchText) ||
        String(product.category || "").toLowerCase().includes(searchText) ||
        String(product.hsn_code || "").toLowerCase().includes(searchText)
    );

    renderProducts(filtered);
}

// ==========================================
// INVENTORY MODULE
// ==========================================

async function loadInventoryModule() {
    const container = getElement("module-content");

    container.innerHTML = `
        <div class="products-table-wrapper">
            <h3>Inventory Overview</h3>
            <p id="inventory-count">Loading inventory...</p>

            <table class="products-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Item Name</th>
                        <th>Type</th>
                        <th>Current Stock</th>
                        <th>Unit</th>
                        <th>Unit Cost</th>
                        <th>Stock Value</th>
                    </tr>
                </thead>
                <tbody id="inventory-table-body">
                    <tr>
                        <td colspan="7">Loading...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    await fetchInventory();
}

async function fetchInventory() {
    const tableBody = getElement("inventory-table-body");
    const countElement = getElement("inventory-count");

    try {
        const data = await apiRequest("/reports/inventory");

        const inventory = data.inventory || [];

        tableBody.innerHTML = inventory.map(item => `
            <tr>
                <td>${escapeHTML(item.inventory_id)}</td>
                <td><strong>${escapeHTML(item.item_name)}</strong></td>
                <td>${escapeHTML(item.item_type)}</td>
                <td>${escapeHTML(item.current_stock)}</td>
                <td>${escapeHTML(item.unit)}</td>
                <td>${formatCurrency(item.unit_cost)}</td>
                <td>${formatCurrency(item.stock_value)}</td>
            </tr>
        `).join("");

        countElement.textContent =
            `Total Items: ${data.total_items} | Total Value: ${formatCurrency(data.total_inventory_value)}`;

    } catch (error) {
        console.error("Inventory loading failed:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">${escapeHTML(error.message)}</td>
            </tr>
        `;

        countElement.textContent = "Unable to load inventory.";
    }
}

// ==========================================
// GST INVOICES MODULE
// ==========================================

async function loadInvoicesModule() {
    const container = getElement("module-content");

    container.innerHTML = `
        <div class="products-table-wrapper">
            <h3>GST Invoice Register</h3>
            <p id="invoice-count">Loading invoices...</p>

            <table class="products-table">
                <thead>
                    <tr>
                        <th>Invoice Number</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Taxable Amount</th>
                        <th>CGST</th>
                        <th>SGST</th>
                        <th>IGST</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody id="invoices-table-body">
                    <tr>
                        <td colspan="9">Loading invoices...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    await fetchInvoices();
}

async function fetchInvoices() {
    const tableBody = getElement("invoices-table-body");
    const countElement = getElement("invoice-count");

    try {
        const data = await apiRequest("/invoices");

        const invoices = data.invoices || [];

        if (!invoices.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9">No invoices found.</td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = invoices.map(invoice => `
                <tr>
                    <td><strong>${escapeHTML(invoice.invoice_number)}</strong></td>
                    <td>${escapeHTML(invoice.customer)}</td>
                    <td>${escapeHTML(
                        new Date(invoice.invoice_date).toLocaleDateString("en-IN")
                    )}</td>
                    <td>${formatCurrency(invoice.taxable_amount)}</td>
                    <td>${formatCurrency(invoice.cgst)}</td>
                    <td>${formatCurrency(invoice.sgst)}</td>
                    <td>${formatCurrency(invoice.igst)}</td>
                    <td><strong>${formatCurrency(invoice.total_amount)}</strong></td>
                    <td>${escapeHTML(invoice.status)}</td>
                </tr>
            `).join("");
        }

        countElement.textContent =
            `Total Invoices: ${data.total_invoices ?? invoices.length}`;

    } catch (error) {
        console.error("Invoice loading failed:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="9">${escapeHTML(error.message)}</td>
            </tr>
        `;

        countElement.textContent = "Unable to load invoices.";
    }
}

// ==========================================
// DISPATCH MODULE
// ==========================================

async function loadDispatchModule() {
    const container = getElement("module-content");

    container.innerHTML = `
        <div class="products-table-wrapper">
            <h3>Dispatch Register</h3>
            <p id="dispatch-count">Loading dispatches...</p>

            <table class="products-table">
                <thead>
                    <tr>
                        <th>Dispatch ID</th>
                        <th>Dispatch Number</th>
                        <th>Order ID</th>
                        <th>Invoice ID</th>
                        <th>Dispatch Date</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody id="dispatch-table-body">
                    <tr>
                        <td colspan="6">Loading dispatches...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    await fetchDispatches();
}

async function fetchDispatches() {
    const tableBody = getElement("dispatch-table-body");
    const countElement = getElement("dispatch-count");

    try {
        const data = await apiRequest("/dispatches");

        const dispatches = data.dispatches || [];

        if (!dispatches.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">No dispatch records found.</td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = dispatches.map(dispatch => `
                <tr>
                    <td>${escapeHTML(dispatch.dispatch_id)}</td>
                    <td><strong>${escapeHTML(dispatch.dispatch_number)}</strong></td>
                    <td>${escapeHTML(dispatch.order_id)}</td>
                    <td>${escapeHTML(dispatch.invoice_id)}</td>
                    <td>${escapeHTML(
                        new Date(dispatch.dispatch_date).toLocaleDateString("en-IN")
                    )}</td>
                    <td>${escapeHTML(dispatch.status)}</td>
                </tr>
            `).join("");
        }

        countElement.textContent =
            `Total Dispatches: ${data.total_dispatches ?? dispatches.length}`;

    } catch (error) {
        console.error("Dispatch loading failed:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">${escapeHTML(error.message)}</td>
            </tr>
        `;

        countElement.textContent = "Unable to load dispatches.";
    }
}

// ==========================================
// PAYMENTS MODULE
// ==========================================

async function loadPaymentsModule() {
    const container = getElement("module-content");

    container.innerHTML = `
        <div class="products-table-wrapper">
            <h3>Payments Register</h3>
            <p id="payments-count">Loading payments...</p>

            <table class="products-table">
                <thead>
                    <tr>
                        <th>Payment ID</th>
                        <th>Invoice Number</th>
                        <th>Amount</th>
                        <th>Payment Method</th>
                        <th>Reference Number</th>
                        <th>Payment Date</th>
                    </tr>
                </thead>

                <tbody id="payments-table-body">
                    <tr>
                        <td colspan="6">Loading payments...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    await fetchPayments();
}

async function fetchPayments() {
    const tableBody = getElement("payments-table-body");
    const countElement = getElement("payments-count");

    try {
        const data = await apiRequest("/payments");
        const payments = data.payments || [];

        if (!payments.length) {
            tableBody.innerHTML = `
                <tr><td colspan="6">No payment records found.</td></tr>
            `;
        } else {
            tableBody.innerHTML = payments.map(payment => `
                <tr>
                    <td>${escapeHTML(payment.payment_id)}</td>
                    <td><strong>${escapeHTML(payment.invoice_number)}</strong></td>
                    <td>${formatCurrency(payment.amount)}</td>
                    <td>${escapeHTML(payment.payment_method)}</td>
                    <td>${escapeHTML(payment.reference_number || "-")}</td>
                    <td>${escapeHTML(new Date(payment.payment_date).toLocaleDateString("en-IN"))}</td>
                </tr>
            `).join("");
        }

        countElement.textContent =
            `Total Payments: ${data.total_payments ?? payments.length}`;

    } catch (error) {
        console.error("Payment loading failed:", error);

        tableBody.innerHTML = `
            <tr><td colspan="6">${escapeHTML(error.message)}</td></tr>
        `;

        countElement.textContent = "Unable to load payments.";
    }
}


// ==========================================
// REPORTS MODULE
// ==========================================

async function loadReportsModule() {
    const container = getElement("module-content");

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
    const reportGrid = getElement("report-grid");
    const reportStatus = getElement("report-status");

    try {
        const data = await apiRequest("/reports/audit-dashboard");

        reportStatus.textContent = "Audit dashboard updated successfully.";

        reportGrid.innerHTML = `
            <div class="stat-card">
                <h3>Total Invoices</h3>
                <p>${data.sales.invoice_count}</p>
            </div>

            <div class="stat-card">
                <h3>Taxable Sales</h3>
                <p>${formatCurrency(data.sales.taxable_sales)}</p>
            </div>

            <div class="stat-card">
                <h3>Total Sales (With GST)</h3>
                <p>${formatCurrency(data.sales.total_sales_with_tax)}</p>
            </div>

            <div class="stat-card">
                <h3>Payments Received</h3>
                <p>${formatCurrency(data.payments.total_received)}</p>
            </div>

            <div class="stat-card">
                <h3>Outstanding Balance</h3>
                <p>${formatCurrency(data.payments.total_outstanding)}</p>
            </div>

            <div class="stat-card">
                <h3>Production Runs</h3>
                <p>${data.production.total_runs}</p>
            </div>

            <div class="stat-card">
                <h3>Production Output</h3>
                <p>${data.production.actual_output} / ${data.production.expected_output}</p>
            </div>

            <div class="stat-card">
                <h3>Inventory Value</h3>
                <p>${formatCurrency(data.inventory.total_inventory_value)}</p>
            </div>
        `;

    } catch (error) {
        console.error("Audit report loading failed:", error);

        reportStatus.textContent = "Unable to load audit reports.";
        reportGrid.innerHTML = `<p>${escapeHTML(error.message)}</p>`;
    }
}

// ==========================================
// PRODUCTION MODULE
// ==========================================

async function loadProductionModule() {
    const container = getElement("module-content");

    container.innerHTML = `
        <div class="products-table-wrapper">
            <h3>Production Overview</h3>
            <p id="production-status">Loading production report...</p>

            <div class="report-grid" id="production-summary"></div>

            <h3>Production Run Register</h3>

            <table class="products-table">
                <thead>
                    <tr>
                        <th>Run ID</th>
                        <th>Expected Output</th>
                        <th>Actual Output</th>
                        <th>Output Variance</th>
                        <th>Production Cost</th>
                        <th>Cost per Packet</th>
                    </tr>
                </thead>

                <tbody id="production-table-body">
                    <tr>
                        <td colspan="6">Loading production runs...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    await fetchProductionReport();
}

async function fetchProductionReport() {
    const summary = getElement("production-summary");
    const tableBody = getElement("production-table-body");
    const status = getElement("production-status");

    try {
        const data = await apiRequest("/reports/production");

        const report = data.summary;
        const runs = data.production_runs || [];

        summary.innerHTML = `
            <div class="stat-card">
                <h3>Total Production Runs</h3>
                <p>${report.total_runs}</p>
            </div>

            <div class="stat-card">
                <h3>Expected Output</h3>
                <p>${report.total_expected_output}</p>
            </div>

            <div class="stat-card">
                <h3>Actual Output</h3>
                <p>${report.total_actual_output}</p>
            </div>

            <div class="stat-card">
                <h3>Total Output Variance</h3>
                <p>${report.total_output_variance}</p>
            </div>

            <div class="stat-card">
                <h3>Total Production Cost</h3>
                <p>${formatCurrency(report.total_production_cost)}</p>
            </div>
        `;

        if (!runs.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">No production records found.</td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = runs.map(run => `
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

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">${escapeHTML(error.message)}</td>
            </tr>
        `;
    }
}

// ==========================================
// ADD PRODUCT
// ==========================================

function showProductForm() {
    const container = getElement("product-form-container");

    container.innerHTML = `
        <div class="product-form-panel">
            <h3>Add New Product</h3>

            <form id="add-product-form">
                <div class="product-form-grid">

                    <div>
                        <label for="product-name">Product Name</label>
                        <input id="product-name" name="name" required>
                    </div>

                    <div>
                        <label for="product-category">Category</label>
                        <input id="product-category" name="category" required>
                    </div>

                    <div>
                        <label for="pack-size">Pack Size (grams)</label>
                        <input
                            id="pack-size"
                            name="pack_size_grams"
                            type="number"
                            min="1"
                            required
                        >
                    </div>

                    <div>
                        <label for="selling-price">Selling Price (₹)</label>
                        <input
                            id="selling-price"
                            name="selling_price"
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                        >
                    </div>

                    <div>
                        <label for="gst-rate">GST Rate (%)</label>
                        <input
                            id="gst-rate"
                            name="gst_rate"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                        >
                    </div>

                    <div>
                        <label for="hsn-code">HSN Code</label>
                        <input id="hsn-code" name="hsn_code" required>
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

    getElement("cancel-product-form")
        .addEventListener("click", () => {
            container.innerHTML = "";
        });
}

async function createProduct(event) {
    event.preventDefault();

    const form = event.target;
    const message = getElement("product-form-message");
    const submitButton = form.querySelector('button[type="submit"]');

    const productData = {
        name: form.elements["name"].value.trim(),
        category: form.elements["category"].value.trim(),
        pack_size_grams: Number(form.elements["pack_size_grams"].value),
        selling_price: Number(form.elements["selling_price"].value),
        gst_rate: Number(form.elements["gst_rate"].value),
        hsn_code: form.elements["hsn_code"].value.trim()
    };

    submitButton.disabled = true;
    submitButton.textContent = "Saving...";

    try {
        await apiRequest("/admin/products", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(productData)
        });

        message.textContent = "Product added successfully!";
        message.style.color = "green";

        await fetchProducts();

        setTimeout(() => {
            const formContainer = getElement("product-form-container");

            if (formContainer) formContainer.innerHTML = "";
        }, 1000);

    } catch (error) {
        console.error("Product creation failed:", error);

        message.textContent = error.message;
        message.style.color = "red";

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Save Product";
    }
}

// ==========================================
// CUSTOMERS MODULE
// ==========================================

async function loadCustomersModule() {
    const content = getElement("module-content");

    content.innerHTML = `
        <div class="module-toolbar">
            <input
                type="text"
                id="customer-search"
                placeholder="Search customers by name, type, phone or GSTIN..."
            />

            <button class="primary-btn" id="add-customer-btn">
                + Add Customer
            </button>
        </div>

        <div id="customer-form-container" style="display:none;">
            <div class="products-table-card">
                <h3>Add New Customer</h3>

                <form id="customer-form" class="customer-form">
                    <div class="form-grid">
                        <input name="name" placeholder="Customer Name" required />

                        <select name="customer_type" required>
                            <option value="">Select Customer Type</option>
                            <option value="Retailer">Retailer</option>
                            <option value="Distributor">Distributor</option>
                            <option value="Wholesaler">Wholesaler</option>
                        </select>

                        <input
                            name="phone"
                            type="tel"
                            placeholder="Phone Number"
                            required
                        />

                        <input
                            name="email"
                            type="email"
                            placeholder="Email Address"
                            required
                        />

                        <input name="gstin" placeholder="GSTIN" required />

                        <input name="state" placeholder="State" required />
                    </div>

                    <button type="submit" class="primary-btn">
                        Save Customer
                    </button>

                    <button
                        type="button"
                        class="secondary-btn"
                        id="cancel-customer-btn"
                    >
                        Cancel
                    </button>
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
                            <th>ID</th>
                            <th>Customer</th>
                            <th>Type</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>GSTIN</th>
                            <th>State</th>
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

    getElement("add-customer-btn")
        .addEventListener("click", () => {
            getElement("customer-form-container").style.display = "block";
        });

    getElement("cancel-customer-btn")
        .addEventListener("click", () => {
            getElement("customer-form-container").style.display = "none";
        });

    getElement("customer-form")
        .addEventListener("submit", createCustomer);

    await fetchCustomers();
}

async function fetchCustomers() {
    const tableBody = getElement("customers-table-body");
    const count = getElement("customer-count");

    try {
        tableBody.innerHTML = `
            <tr><td colspan="7">Loading customers...</td></tr>
        `;

        const response = await apiRequest("/customers");

        allCustomers = response.customers || [];

        renderCustomers(allCustomers);

        count.textContent =
            `Total Customers: ${response.total_customers ?? allCustomers.length}`;

    } catch (error) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    Unable to load customers. ${escapeHTML(error.message)}
                </td>
            </tr>
        `;

        count.textContent = "Customer loading failed.";
    }
}

function renderCustomers(customers) {
    const tableBody = getElement("customers-table-body");

    if (!tableBody) return;

    if (!customers.length) {
        tableBody.innerHTML = `
            <tr><td colspan="7">No customers found.</td></tr>
        `;
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
    const searchValue = getElement("customer-search")
        .value.toLowerCase().trim();

    const filteredCustomers = allCustomers.filter(customer => {
        return [
            customer.name,
            customer.customer_type,
            customer.phone,
            customer.email,
            customer.gstin,
            customer.state
        ].some(value =>
            String(value || "").toLowerCase().includes(searchValue)
        );
    });

    renderCustomers(filteredCustomers);
}

async function createCustomer(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const customerData = {
        name: formData.get("name").trim(),
        customer_type: formData.get("customer_type"),
        phone: formData.get("phone").trim(),
        email: formData.get("email").trim(),
        gstin: formData.get("gstin").trim().toUpperCase(),
        state: formData.get("state").trim()
    };

    const submitButton = form.querySelector('button[type="submit"]');

    submitButton.disabled = true;

    try {
        await apiRequest("/admin/customers", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(customerData)
        });

        alert("Customer added successfully!");

        form.reset();

        getElement("customer-form-container").style.display = "none";

        await fetchCustomers();

    } catch (error) {
        alert("Unable to add customer: " + error.message);

    } finally {
        submitButton.disabled = false;
    }
}

// ==========================================
// ORDERS MODULE
// ==========================================

async function loadOrdersModule() {
    const content = getElement("module-content");

    content.innerHTML = `
        <div class="module-toolbar">
            <input
                type="text"
                id="order-search"
                placeholder="Search by order number, customer or salesman..."
            />

            <button class="primary-btn" id="refresh-orders">
                ↻ Refresh
            </button>
        </div>

        <div class="products-table-card">
            <h3>Order Directory</h3>

            <p id="order-count">Loading orders...</p>

            <div class="table-responsive">
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Order Number</th>
                            <th>Customer</th>
                            <th>Salesman</th>
                            <th>Products</th>
                            <th>Quantity</th>
                            <th>Order Value</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody id="orders-table-body">
                        <tr><td colspan="8">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    getElement("order-search")
        .addEventListener("input", filterOrders);

    getElement("refresh-orders")
        .addEventListener("click", fetchOrders);

    await fetchOrders();
}

// IMPORTANT:
// The backend has GET /admin/orders.
// GET /orders does not exist in the inspected backend.

async function fetchOrders() {
    const tableBody = getElement("orders-table-body");
    const count = getElement("order-count");

    if (!tableBody || !count) return;

    try {
        tableBody.innerHTML = `
            <tr><td colspan="8">Loading orders...</td></tr>
        `;

        count.textContent = "Loading orders...";

        const response = await apiRequest("/admin/orders");

        allOrders = response.orders || [];

        renderOrders(allOrders);

        count.textContent =
            `Total Orders: ${response.total_orders ?? allOrders.length}`;

        console.log("Orders loaded successfully:", response);

    } catch (error) {
        console.error("Order loading failed:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    Unable to load orders: ${escapeHTML(error.message)}
                </td>
            </tr>
        `;

        count.textContent = "Order loading failed.";
    }
}

function renderOrders(orders) {
    const tableBody = getElement("orders-table-body");

    if (!tableBody) return;

    if (!orders.length) {
        tableBody.innerHTML = `
            <tr><td colspan="8">No orders found.</td></tr>
        `;
        return;
    }

    tableBody.innerHTML = orders.map(order => {
        const items = order.items || [];

        const products = items.map(item =>
            escapeHTML(
                item.product ||
                item.product_name ||
                item.name ||
                "-"
            )
        ).join(", ");

        const quantity = items.reduce(
            (total, item) =>
                total + Number(item.quantity || 0),
            0
        );

        const orderValue = Number(
            order.total_amount ??
            order.total ??
            order.grand_total ??
            items.reduce(
                (total, item) =>
                    total + Number(item.subtotal || 0),
                0
            )
        );

        const status = String(order.status || "unknown").toLowerCase();

        return `
            <tr>
                <td>${escapeHTML(order.order_id ?? order.id ?? "-")}</td>

                <td>
                    <strong>${escapeHTML(order.order_number || "-")}</strong>
                </td>

                <td>${escapeHTML(order.customer || "-")}</td>

                <td>${escapeHTML(order.salesman || "-")}</td>

                <td>${products || "-"}</td>

                <td>${quantity}</td>

                <td>${formatCurrency(orderValue)}</td>

                <td>
                    <span class="order-status status-${escapeHTML(status)}">
                        ${escapeHTML(status.replace(/_/g, " "))}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

function filterOrders() {
    const searchElement = getElement("order-search");

    if (!searchElement) return;

    const search = searchElement.value.toLowerCase().trim();

    const filtered = allOrders.filter(order => {
        return [
            order.order_number,
            order.customer,
            order.salesman,
            order.status
        ].some(value =>
            String(value || "").toLowerCase().includes(search)
        );
    });

    renderOrders(filtered);
}

// ==========================================
// APPLICATION INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

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

    // Voice
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

    // Stop
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
            location.reload();
        });
    }

    // Initial dashboard
    loadDashboardData();

});
