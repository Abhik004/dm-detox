const PREDEFINED_KEYWORDS = {
    career: [
        "internship", "job", "opportunity", "interview", "application",
        "resume", "career", "position", "offer", "hiring", "recruitment",
        "LinkedIn", "Indeed", "recruiter", "HR", "salary", "apply", "placement",
        "company", "employer", "start-up", "cover letter", "portfolio"
    ],
    academic: [
        "assignment", "deadline", "exam", "project", "grade", "quiz",
        "homework", "professor", "course", "class", "semester", "syllabus",
        "lecture", "tutorial", "laboratory", "lab", "research", "study",
        "paper", "essay", "group project", "presentation", "report", "thesis",
        "scholarship", "grant", "financial aid", "tuition", "registration"
    ]
};

const DEFAULT_SETTINGS = {
    customKeywords: ["urgent", "important", "meeting"],
    careerEnabled: true,
    academicEnabled: true,
    customEnabled: true,
    dimNonPriority: true,
    careerKeywords: PREDEFINED_KEYWORDS.career,
    academicKeywords: PREDEFINED_KEYWORDS.academic,
    messageStats: {
        career: 0,
        academic: 0,
        custom: 0,
        totalImportant: 0,
        totalMessages: 0,
        importantSenders: {},
        dailyStats: {},
        opportunities: []
    }
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(() => {
    console.log("DM Detox for Students installed!");
    
    chrome.storage.sync.get(null, (data) => {
        const updates = {};
        
        // Set defaults for missing settings
        Object.keys(DEFAULT_SETTINGS).forEach(key => {
            if (data[key] === undefined) {
                updates[key] = DEFAULT_SETTINGS[key];
            }
        });
        
        // If there are updates needed, apply them
        if (Object.keys(updates).length > 0) {
            chrome.storage.sync.set(updates, () => {
                console.log("Default settings initialized:", updates);
            });
        }
    });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "refreshFilters") {
        // Broadcast refresh to all tabs with supported platforms
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && (
                    tab.url.includes('mail.google.com') ||
                    tab.url.includes('web.whatsapp.com') ||
                    tab.url.includes('web.telegram.org')
                )) {
                    chrome.tabs.sendMessage(tab.id, {action: "refreshFilters"}, (response) => {
                        // Ignore errors for tabs that might not have the content script loaded
                        if (chrome.runtime.lastError) {
                            console.log("Could not refresh tab:", tab.id);
                        }
                    });
                }
            });
        });
        sendResponse({status: "refresh requested"});
    }
    return true;
});