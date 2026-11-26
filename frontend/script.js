
// ==========================================
// FACTORYFLOW - BILINGUAL VOICE ASSISTANT
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

let currentLanguage = "en";
let soundEnabled = true;


// ==========================================
// SAFE ELEMENT HELPER
// ==========================================

function getElement(id) {
    return document.getElementById(id);
}


// ==========================================
// LANGUAGE MANAGEMENT
// ==========================================

function changeLanguage(language) {

    if (!translations[language]) {
        language = "en";
    }

    currentLanguage = language;

    const t = translations[language];

    document.documentElement.lang = language;

    document.querySelectorAll("[data-i18n]").forEach(element => {

        const key = element.dataset.i18n;

        if (t[key]) {
            element.textContent = t[key];
        }

    });

    const updates = {
        "assistant-title": t.assistantTitle,
        "assistant-message": t.assistantMessage,
        "voice-btn": t.speak,
        "repeat-btn": t.repeat,
        "stop-speech-btn": t.stop,
        "system-status-text": t.systemOnline,
        "logout-btn": t.logout
    };

    Object.entries(updates).forEach(([id, value]) => {

        const element = getElement(id);

        if (element) {
            element.textContent = value;
        }

    });

    updateSoundButton();

    localStorage.setItem("factoryflow-language", language);
}


// ==========================================
// SOUND BUTTON
// ==========================================

function updateSoundButton() {

    const button = getElement("sound-btn");

    if (!button) return;

    const t = translations[currentLanguage];

    button.textContent = soundEnabled ? t.soundOn : t.soundOff;
}


// ==========================================
// TEXT TO SPEECH
// ==========================================

function speakMessage(message) {

    if (!soundEnabled) return;

    if (!("speechSynthesis" in window)) {
        console.warn("Speech synthesis is unavailable.");
        return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(message);

    speech.lang = currentLanguage === "ta" ? "ta-IN" : "en-IN";

    speech.rate = 0.9;

    window.speechSynthesis.speak(speech);
}


// ==========================================
// VOICE RECOGNITION
// ==========================================

function startVoiceAssistant() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    const message = getElement("assistant-message");

    if (!SpeechRecognition) {

        alert(translations[currentLanguage].unsupported);

        return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang =
        currentLanguage === "ta" ? "ta-IN" : "en-IN";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.onstart = () => {

        if (message) {
            message.textContent =
                translations[currentLanguage].listening;
        }

    };

    recognition.onresult = event => {

        const spokenText =
            event.results[0][0].transcript;

        if (message) {
            message.textContent = spokenText;
        }

        speakMessage(
            translations[currentLanguage].received
        );

    };

    recognition.onerror = event => {

        console.error("Voice recognition error:", event.error);

        if (message) {
            message.textContent =
                translations[currentLanguage].tryAgain;
        }

    };

    recognition.start();
}


// ==========================================
// INITIALIZE APPLICATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // Language selector

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


    // Voice button

    const voiceButton = getElement("voice-btn");

    if (voiceButton) {
        voiceButton.addEventListener(
            "click",
            startVoiceAssistant
        );
    }


    // Sound toggle

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


    // Repeat speech

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

});
