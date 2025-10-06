console.log("DM Detox content script loaded");

const PLATFORM_SELECTORS = {
    'mail.google.com': {
        messageContainer: 'tr.zA',
        messageSubject: '.y6 span',
        messageSender: '.yW span',
        messagePreview: '.y2'
    },
    'web.whatsapp.com': {
        messageContainer: '._1uQFG',
        messageText: '.selectable-text'
    },
    'web.telegram.org': {
        messageContainer: '.message',
        messageText: '.text-content'
    }
};

let messageStats = {
    career: 0,
    academic: 0,
    custom: 0,
    totalImportant: 0,
    totalMessages: 0,
    importantSenders: {},
    dailyStats: {},
    opportunities: []
};

const getCurrentPlatform = () => Object.keys(PLATFORM_SELECTORS).find(platform => window.location.hostname.includes(platform)) || null;

const getStoredKeywords = async () => {
    return new Promise((resolve) => {
        chrome.storage.sync.get([
            "careerKeywords", 
            "academicKeywords", 
            "customKeywords",
            "careerEnabled",
            "academicEnabled",
            "customEnabled"
        ], (data) => {
            const keywords = {
                career: (data.careerEnabled && data.careerKeywords) ? data.careerKeywords : [],
                academic: (data.academicEnabled && data.academicKeywords) ? data.academicKeywords : [],
                custom: (data.customEnabled && data.customKeywords) ? data.customKeywords : []
            };
            resolve(keywords);
        });
    });
};

const resetHighlighting = (platform) => {
    const selectors = PLATFORM_SELECTORS[platform];
    if (!selectors) return;
    document.querySelectorAll(selectors.messageContainer).forEach(container => {
        container.classList.remove('dm-detox-important', 'dm-detox-career', 'dm-detox-academic', 'dm-detox-custom');
        container.style.backgroundColor = '';
        container.style.fontWeight = '';
    });
};

const updateMessageStats = (category, sender) => {
    messageStats.totalImportant++;
    messageStats[category]++;
    const today = new Date().toISOString().split('T')[0];
    messageStats.dailyStats[today] = messageStats.dailyStats[today] || { total: 0, career: 0, academic: 0, custom: 0 };
    messageStats.dailyStats[today].total++;
    messageStats.dailyStats[today][category]++;
    if (sender) {
        messageStats.importantSenders[sender] = messageStats.importantSenders[sender] || { count: 0, categories: {} };
        messageStats.importantSenders[sender].count++;
        messageStats.importantSenders[sender].categories[category] = (messageStats.importantSenders[sender].categories[category] || 0) + 1;
    }
    saveMessageStats();
};

const addOpportunity = (title, sender, content) => {
    const existingOpp = messageStats.opportunities.find(opp => 
        opp.sender === sender && opp.title === title && 
        Math.abs(new Date(opp.date).getTime() - Date.now()) < 60000 // Within 1 minute
    );
    
    if (!existingOpp) {
        messageStats.opportunities.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            title: title || "Untitled Opportunity",
            sender: sender || "Unknown",
            date: new Date().toISOString(),
            content: content || "",
            status: "New"
        });
        saveMessageStats();
    }
};

const saveMessageStats = () => {
    chrome.storage.sync.set({ messageStats }, () => {
        console.log("Message stats saved:", messageStats);
    });
};

const filterMessages = async () => {
    const platform = getCurrentPlatform();
    if (!platform) return;
    
    const { career, academic, custom } = await getStoredKeywords();
    const selectors = PLATFORM_SELECTORS[platform];
    
    const previousOpportunities = messageStats.opportunities;
    messageStats = {
        career: 0,
        academic: 0,
        custom: 0,
        totalImportant: 0,
        totalMessages: 0,
        importantSenders: {},
        dailyStats: messageStats.dailyStats || {},
        opportunities: previousOpportunities || []
    };
    
    resetHighlighting(platform);
    
    document.querySelectorAll(selectors.messageContainer).forEach(message => {
        messageStats.totalMessages++;
        const textContent = (message.innerText || '').toLowerCase();
        const sender = message.querySelector(selectors.messageSender)?.innerText || 'Unknown';
        
        let category = null;
        let matchedKeyword = '';
        
        if (career.length > 0) {
            for (const keyword of career) {
                if (textContent.includes(keyword.toLowerCase())) {
                    category = 'career';
                    matchedKeyword = keyword;
                    break;
                }
            }
        }
        
        if (!category && academic.length > 0) {
            for (const keyword of academic) {
                if (textContent.includes(keyword.toLowerCase())) {
                    category = 'academic';
                    matchedKeyword = keyword;
                    break;
                }
            }
        }
        
        if (!category && custom.length > 0) {
            for (const keyword of custom) {
                if (textContent.includes(keyword.toLowerCase())) {
                    category = 'custom';
                    matchedKeyword = keyword;
                    break;
                }
            }
        }
        
        if (category) {
            message.classList.add(`dm-detox-${category}`, 'dm-detox-important');
            updateMessageStats(category, sender);
            
            if (category === 'career') {
                const careerOpportunityKeywords = ['internship', 'job', 'opportunity', 'interview', 'position', 'hiring'];
                if (careerOpportunityKeywords.some(keyword => textContent.includes(keyword))) {
                    addOpportunity('Career Opportunity: ' + matchedKeyword, sender, textContent.substring(0, 200));
                }
            }
        }
    });
    
    saveMessageStats();
};

const setupMutationObserver = () => {
    const observer = new MutationObserver(() => {
        clearTimeout(window.filterTimeout);
        window.filterTimeout = setTimeout(filterMessages, 1000);
    });
    observer.observe(document.body, { childList: true, subtree: true });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "refreshFilters") {
        console.log("Refreshing filters...");
        filterMessages().then(() => {
            sendResponse({ status: "filters refreshed" });
        });
    } else if (request.action === "getStats") {
        sendResponse({ stats: messageStats });
    }
    return true;
});

chrome.storage.sync.get("messageStats", (data) => {
    if (data.messageStats) {
        messageStats = { ...messageStats, ...data.messageStats };
    }
    filterMessages();
    setupMutationObserver();
    
    setInterval(filterMessages, 10000);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        console.log("Storage changed, refreshing filters...");
        filterMessages();
    }
});