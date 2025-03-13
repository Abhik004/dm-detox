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
        chrome.storage.sync.get(["priorityKeywords", "careerKeywords", "academicKeywords", "customKeywords"], (data) => {
            resolve({
                priority: data.priorityKeywords || ["internship", "job", "opportunity", "interview", "application"],
                career: data.careerKeywords || [],
                academic: data.academicKeywords || [],
                custom: data.customKeywords || []
            });
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
    chrome.storage.sync.set({ messageStats });
};

const addOpportunity = (title, sender, content) => {
    messageStats.opportunities.push({
        id: Date.now().toString(),
        title: title || "Untitled Opportunity",
        sender: sender || "Unknown",
        date: new Date().toISOString(),
        content: content || "",
        status: "New"
    });
    chrome.storage.sync.set({ messageStats });
};

const filterMessages = async () => {
    const platform = getCurrentPlatform();
    if (!platform) return;
    
    const { priority, career, academic, custom } = await getStoredKeywords();
    const selectors = PLATFORM_SELECTORS[platform];
    resetHighlighting(platform);
    messageStats.totalMessages = 0;
    
    document.querySelectorAll(selectors.messageContainer).forEach(message => {
        messageStats.totalMessages++;
        const textContent = (message.innerText || '').toLowerCase();
        const sender = message.querySelector(selectors.messageSender)?.innerText || 'Unknown';
        
        let category = null;
        if (career.some(keyword => textContent.includes(keyword))) category = 'career';
        else if (academic.some(keyword => textContent.includes(keyword))) category = 'academic';
        else if (custom.some(keyword => textContent.includes(keyword))) category = 'custom';
        
        if (category) {
            message.classList.add(`dm-detox-${category}`, 'dm-detox-important');
            updateMessageStats(category, sender);
            if (category === 'career' && priority.some(keyword => textContent.includes(keyword))) {
                addOpportunity('Career Opportunity', sender, textContent);
            }
        }
    });
};

const setupMutationObserver = () => {
    const observer = new MutationObserver(filterMessages);
    observer.observe(document.body, { childList: true, subtree: true });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "refreshFilters") filterMessages();
    else if (request.action === "getStats") sendResponse({ stats: messageStats });
    return true;
});

chrome.storage.sync.get("messageStats", (data) => {
    if (data.messageStats) messageStats = data.messageStats;
    filterMessages();
    setupMutationObserver();
    setInterval(filterMessages, 5000);
});

chrome.storage.onChanged.addListener(filterMessages);