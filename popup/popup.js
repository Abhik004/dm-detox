const keywordsInput = document.getElementById("keywords");
const careerCheckbox = document.getElementById("career");
const academicCheckbox = document.getElementById("academic");
const customCheckbox = document.getElementById("custom");
const dimNonPriorityCheckbox = document.getElementById("dimNonPriority");
const saveButton = document.getElementById("save");
const resetButton = document.getElementById("reset");
const statusElement = document.getElementById("status");

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
    "dimNonPriority"
  ], (data) => {
    if (data.customKeywords) {
      keywordsInput.value = data.customKeywords.join(", ");
    } else {
      keywordsInput.value = DEFAULT_SETTINGS.customKeywords.join(", ");
    }
    
    careerCheckbox.checked = data.careerEnabled !== undefined ? data.careerEnabled : DEFAULT_SETTINGS.careerEnabled;
    academicCheckbox.checked = data.academicEnabled !== undefined ? data.academicEnabled : DEFAULT_SETTINGS.academicEnabled;
    customCheckbox.checked = data.customEnabled !== undefined ? data.customEnabled : DEFAULT_SETTINGS.customEnabled;
    
    dimNonPriorityCheckbox.checked = data.dimNonPriority !== undefined ? data.dimNonPriority : DEFAULT_SETTINGS.dimNonPriority;
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
    priorityKeywords: allKeywords
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
    priorityKeywords: allKeywords
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

saveButton.addEventListener("click", saveSettings);
resetButton.addEventListener("click", resetToDefaults);

document.addEventListener("DOMContentLoaded", loadSettings);