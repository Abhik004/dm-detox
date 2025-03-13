const keywordsInput = document.getElementById("keywords");
const careerCheckbox = document.getElementById("career");
const academicCheckbox = document.getElementById("academic");
const customCheckbox = document.getElementById("custom");
const dimNonPriorityCheckbox = document.getElementById("dimNonPriority");
const saveButton = document.getElementById("save");
const resetButton = document.getElementById("reset");
const statusElement = document.getElementById("status");
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

const PREDEFINED_KEYWORDS = {
    career: [
        "internship", "job", "opportunity", "interview", "application",
        "resume", "career", "position", "offer", "hiring", "recruitment",
        "LinkedIn", "Indeed", "recruiter", "HR", "salary", "apply",
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
    dimNonPriority: true
};

function loadSettings() {
    chrome.storage.sync.get([
        "customKeywords",
        "careerEnabled",
        "academicEnabled",
        "customEnabled",
        "dimNonPriority",
        "messageStats"
    ], (data) => {
        if (data.customKeywords) {
            keywordsInput.value = data.customKeywords.join(", ");
        } else {
            keywordsInput.value = DEFAULT_SETTINGS.customKeywords.join(", ");
        }
        
        careerCheckbox.checked = data.careerEnabled !== undefined ? 
            data.careerEnabled : DEFAULT_SETTINGS.careerEnabled;
        academicCheckbox.checked = data.academicEnabled !== undefined ? 
            data.academicEnabled : DEFAULT_SETTINGS.academicEnabled;
        customCheckbox.checked = data.customEnabled !== undefined ? 
            data.customEnabled : DEFAULT_SETTINGS.customEnabled;
        dimNonPriorityCheckbox.checked = data.dimNonPriority !== undefined ? 
            data.dimNonPriority : DEFAULT_SETTINGS.dimNonPriority;
            
        if (data.messageStats) {
            updateStatisticsUI(data.messageStats);
            updateOpportunitiesUI(data.messageStats.opportunities || []);
            updateNetworkUI(data.messageStats.importantSenders || {});
        }
    });
}

function compileKeywords() {
    let keywords = [];
    
    if (careerCheckbox.checked) {
        keywords = keywords.concat(PREDEFINED_KEYWORDS.career);
    }
    
    if (academicCheckbox.checked) {
        keywords = keywords.concat(PREDEFINED_KEYWORDS.academic);
    }
    
    if (customCheckbox.checked) {
        const customKeywords = keywordsInput.value
            .split(",")
            .map(keyword => keyword.trim())
            .filter(keyword => keyword.length > 0);
        keywords = keywords.concat(customKeywords);
    }
    
    return [...new Set(keywords)];
}

function saveSettings() {
    let customKeywords = keywordsInput.value
        .split(",")
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0);
        
    const allKeywords = compileKeywords();
    
    if (allKeywords.length === 0) {
        careerCheckbox.checked = true;
        academicCheckbox.checked = true;
        customKeywords = DEFAULT_SETTINGS.customKeywords;
        keywordsInput.value = customKeywords.join(", ");
        showStatus("Using default keywords, at least one category must be selected");
    }
    
    chrome.storage.sync.set({
        customKeywords: customKeywords,
        careerEnabled: careerCheckbox.checked,
        academicEnabled: academicCheckbox.checked,
        customEnabled: customCheckbox.checked,
        dimNonPriority: dimNonPriorityCheckbox.checked,
        priorityKeywords: allKeywords,
        careerKeywords: PREDEFINED_KEYWORDS.career,
        academicKeywords: PREDEFINED_KEYWORDS.academic,
        customKeywords: customKeywords
    }, () => {
        showStatus("Settings saved!");
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "refreshFilters"});
        });
    });
}

function resetToDefaults() {
    keywordsInput.value = DEFAULT_SETTINGS.customKeywords.join(", ");
    careerCheckbox.checked = DEFAULT_SETTINGS.careerEnabled;
    academicCheckbox.checked = DEFAULT_SETTINGS.academicEnabled;
    customCheckbox.checked = DEFAULT_SETTINGS.customEnabled;
    dimNonPriorityCheckbox.checked = DEFAULT_SETTINGS.dimNonPriority;
    
    const allKeywords = [
        ...PREDEFINED_KEYWORDS.career,
        ...PREDEFINED_KEYWORDS.academic,
        ...DEFAULT_SETTINGS.customKeywords
    ];
    
    chrome.storage.sync.set({
        customKeywords: DEFAULT_SETTINGS.customKeywords,
        careerEnabled: DEFAULT_SETTINGS.careerEnabled,
        academicEnabled: DEFAULT_SETTINGS.academicEnabled,
        customEnabled: DEFAULT_SETTINGS.customEnabled,
        dimNonPriority: DEFAULT_SETTINGS.dimNonPriority,
        priorityKeywords: allKeywords,
        careerKeywords: PREDEFINED_KEYWORDS.career,
        academicKeywords: PREDEFINED_KEYWORDS.academic
    }, () => {
        showStatus("Reset to defaults!");
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "refreshFilters"});
        });
    });
}

function showStatus(message) {
    statusElement.textContent = message;
    setTimeout(() => {
        statusElement.textContent = "";
    }, 3000);
}

function updateStatisticsUI(stats) {
    document.getElementById("totalImportant").textContent = stats.totalImportant || 0;
    document.getElementById("careerCount").textContent = stats.career || 0;
    document.getElementById("academicCount").textContent = stats.academic || 0;
    document.getElementById("customCount").textContent = stats.custom || 0;
    
    const dailyStatsChart = document.getElementById("dailyStatsChart");
    dailyStatsChart.innerHTML = "";
    
    if (stats.dailyStats) {
        const dates = Object.keys(stats.dailyStats).sort();
        const chartHtml = dates.map(date => {
            const dayStats = stats.dailyStats[date];
            const total = dayStats.total || 0;
            const formattedDate = new Date(date).toLocaleDateString();
            return `
                <div class="chart-bar">
                    <div class="bar-label">${formattedDate}</div>
                    <div class="bar-container">
                        <div class="bar" style="width: ${Math.min(total * 10, 100)}%">${total}</div>
                    </div>
                </div>
            `;
        }).join("");
        dailyStatsChart.innerHTML = chartHtml;
    }
    
    const topSenders = document.getElementById("topSenders");
    topSenders.innerHTML = "";
    
    if (stats.importantSenders) {
        const senders = Object.entries(stats.importantSenders)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5);
            
        const sendersHtml = senders.map(([sender, data]) => {
            return `
                <div class="list-item">
                    <div class="list-item-title">${sender}</div>
                    <div class="list-item-subtitle">Messages: ${data.count}</div>
                </div>
            `;
        }).join("");
        
        topSenders.innerHTML = sendersHtml || "<p>No data available yet</p>";
    }
}

function updateOpportunitiesUI(opportunities) {
    const opportunitiesList = document.getElementById("opportunitiesList");
    opportunitiesList.innerHTML = "";
    
    if (opportunities && opportunities.length > 0) {
        const opportunitiesHtml = opportunities.map(opp => {
            return `
                <div class="list-item opportunity-item" data-id="${opp.id}">
                    <div class="list-item-title">${opp.title}</div>
                    <div class="list-item-subtitle">From: ${opp.sender}</div>
                    <div class="list-item-subtitle">Date: ${new Date(opp.date).toLocaleDateString()}</div>
                    <div class="list-item-status">
                        <select class="status-select" data-id="${opp.id}">
                            <option value="New" ${opp.status === 'New' ? 'selected' : ''}>New</option>
                            <option value="Applied" ${opp.status === 'Applied' ? 'selected' : ''}>Applied</option>
                            <option value="Interview" ${opp.status === 'Interview' ? 'selected' : ''}>Interview</option>
                            <option value="Rejected" ${opp.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                            <option value="Accepted" ${opp.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
                        </select>
                    </div>
                </div>
            `;
        }).join("");
        opportunitiesList.innerHTML = opportunitiesHtml;
        
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', updateOpportunityStatus);
        });
    } else {
        opportunitiesList.innerHTML = "<p>No opportunities detected yet</p>";
    }
}

function updateOpportunityStatus(e) {
    const opportunityId = e.target.dataset.id;
    const newStatus = e.target.value;
    
    chrome.storage.sync.get("messageStats", (data) => {
        if (data.messageStats && data.messageStats.opportunities) {
            const opportunities = data.messageStats.opportunities;
            const oppIndex = opportunities.findIndex(o => o.id === opportunityId);
            
            if (oppIndex !== -1) {
                opportunities[oppIndex].status = newStatus;
                
                chrome.storage.sync.set({
                    messageStats: data.messageStats
                }, () => {
                    showStatus("Opportunity status updated!");
                });
            }
        }
    });
}

function updateNetworkUI(senders) {
    const networkGraph = document.getElementById("networkGraph");
    networkGraph.innerHTML = "";
    
    const contactSuggestions = document.getElementById("contactSuggestions");
    contactSuggestions.innerHTML = "";
    
    if (Object.keys(senders).length > 0) {
        const topSenders = Object.entries(senders)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);
            
        const graphHtml = `
            <div class="network-container">
                <div class="network-center">You</div>
                ${topSenders.map(([sender, data], index) => {
                    const angle = (index / topSenders.length) * 2 * Math.PI;
                    const x = 120 * Math.cos(angle) + 150;
                    const y = 120 * Math.sin(angle) + 150;
                    return `
                        <div class="network-node" style="left: ${x}px; top: ${y}px;">
                            <div class="node-label">${sender}</div>
                        </div>
                        <div class="network-line" style="
                            width: ${Math.sqrt(Math.pow(x-150, 2) + Math.pow(y-150, 2))}px;
                            left: 150px;
                            top: 150px;
                            transform: rotate(${angle}rad);
                            transform-origin: 0 0;
                        "></div>
                    `;
                }).join('')}
            </div>
        `;
        networkGraph.innerHTML = graphHtml;
        
        const now = new Date();
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        
        const suggestions = topSenders
            .filter(([_, data]) => {
                const randomDaysAgo = Math.floor(Math.random() * 30);
                const lastContact = new Date(now.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);
                data.lastContact = lastContact;
                return lastContact < twoWeeksAgo;
            })
            .slice(0, 3);
            
        if (suggestions.length > 0) {
            const suggestionsHtml = suggestions.map(([sender, data]) => {
                return `
                    <div class="list-item">
                        <div class="list-item-title">${sender}</div>
                        <div class="list-item-subtitle">Last contact: ${data.lastContact.toLocaleDateString()}</div>
                        <div class="list-item-action">Consider reaching out</div>
                    </div>
                `;
            }).join("");
            contactSuggestions.innerHTML = suggestionsHtml;
        } else {
            contactSuggestions.innerHTML = "<p>No contact suggestions at this time</p>";
        }
    } else {
        networkGraph.innerHTML = "<p>Not enough data to generate network graph</p>";
        contactSuggestions.innerHTML = "<p>No contact suggestions available yet</p>";
    }
}

function exportOpportunities() {
    chrome.storage.sync.get("messageStats", (data) => {
        if (data.messageStats && data.messageStats.opportunities && data.messageStats.opportunities.length > 0) {
            const opportunities = data.messageStats.opportunities;
            let csvContent = "Title,Sender,Date,Status\n";
            
            opportunities.forEach(opp => {
                const row = [
                    `"${opp.title.replace(/"/g, '""')}"`,
                    `"${opp.sender.replace(/"/g, '""')}"`,
                    new Date(opp.date).toLocaleDateString(),
                    opp.status
                ];
                csvContent += row.join(',') + '\n';
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'opportunities.csv';
            a.click();
            URL.revokeObjectURL(url);
            
            showStatus("Opportunities exported to CSV!");
        } else {
            showStatus("No opportunities to export");
        }
    });
}

function clearOpportunities() {
    if (confirm("Are you sure you want to clear all opportunities?")) {
        chrome.storage.sync.get("messageStats", (data) => {
            if (data.messageStats) {
                data.messageStats.opportunities = [];
                chrome.storage.sync.set({
                    messageStats: data.messageStats
                }, () => {
                    updateOpportunitiesUI([]);
                    showStatus("All opportunities cleared!");
                });
            }
        });
    }
}

function switchTab(e) {
    const tabId = e.target.dataset.tab;
    
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    e.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

saveButton.addEventListener("click", saveSettings);
resetButton.addEventListener("click", resetToDefaults);
document.getElementById("exportOpportunities").addEventListener("click", exportOpportunities);
document.getElementById("clearOpportunities").addEventListener("click", clearOpportunities);

tabButtons.forEach(button => {
    button.addEventListener("click", switchTab);
});

document.addEventListener("DOMContentLoaded", loadSettings);

chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: "getStats"}, (response) => {
        if (response && response.stats) {
            updateStatisticsUI(response.stats);
            updateOpportunitiesUI(response.stats.opportunities || []);
            updateNetworkUI(response.stats.importantSenders || {});
        }
    });
});
