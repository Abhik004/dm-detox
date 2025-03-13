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

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get([
      "customKeywords",
      "careerEnabled",
      "academicEnabled",
      "customEnabled",
      "dimNonPriority",
      "priorityKeywords",
      "careerKeywords",
      "academicKeywords",
      "messageStats"
  ], (data) => {
      if (!data.customKeywords) {
          chrome.storage.sync.set({
              customKeywords: ["urgent", "important", "meeting"]
          });
      }
      
      if (data.careerEnabled === undefined) {
          chrome.storage.sync.set({ careerEnabled: true });
      }
      
      if (data.academicEnabled === undefined) {
          chrome.storage.sync.set({ academicEnabled: true });
      }
      
      if (data.customEnabled === undefined) {
          chrome.storage.sync.set({ customEnabled: true });
      }
      
      if (data.dimNonPriority === undefined) {
          chrome.storage.sync.set({ dimNonPriority: true });
      }
        if (!data.priorityKeywords) {
            const allKeywords = [
                ...PREDEFINED_KEYWORDS.career,
                ...PREDEFINED_KEYWORDS.academic,
                "urgent", "important", "meeting"
            ];
            chrome.storage.sync.set({ priorityKeywords: allKeywords });
        }
        
        if (!data.careerKeywords) {
            chrome.storage.sync.set({ careerKeywords: PREDEFINED_KEYWORDS.career });
        }
        
        if (!data.academicKeywords) {
            chrome.storage.sync.set({ academicKeywords: PREDEFINED_KEYWORDS.academic });
        }
        
        if (!data.messageStats) {
            chrome.storage.sync.set({ 
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
            });
        }
    });
    
    console.log("DM Detox for Students installed successfully!");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "refreshFilters") {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "refreshFilters"});
        });
        sendResponse({status: "refresh requested"});
    }
    return true;
});
