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

function getCurrentPlatform() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('mail.google.com')) return 'mail.google.com';
  if (hostname.includes('web.whatsapp.com')) return 'web.whatsapp.com';
  if (hostname.includes('web.telegram.org')) return 'web.telegram.org';
  
  return null;
}

async function getPriorityKeywords() {
  return new Promise((resolve) => {
    chrome.storage.sync.get("priorityKeywords", (data) => {
      resolve(data.priorityKeywords || [
        "internship", "job", "opportunity", "interview", "application", 
        "assignment", "deadline", "exam", "project", "grade", 
        "resume", "career", "position", "offer", "scholarship"
      ]);
    });
  });
}

function resetHighlighting(platform) {
  const selectors = PLATFORM_SELECTORS[platform];
  if (!selectors) return;
  
  document.querySelectorAll(selectors.messageContainer).forEach(container => {
    container.classList.remove('dm-detox-important');
    container.style.backgroundColor = '';
    container.style.fontWeight = '';
  });
}

async function filterMessages() {
  const platform = getCurrentPlatform();
  if (!platform) return;
  
  const keywords = await getPriorityKeywords();
  const selectors = PLATFORM_SELECTORS[platform];
  
  resetHighlighting(platform);
  
  if (platform === 'mail.google.com') {
    document.querySelectorAll(selectors.messageContainer).forEach(message => {
      const subjectElem = message.querySelector(selectors.messageSubject);
      const senderElem = message.querySelector(selectors.messageSender);
      const previewElem = message.querySelector(selectors.messagePreview);
      
      const subject = subjectElem ? subjectElem.innerText.toLowerCase() : '';
      const sender = senderElem ? senderElem.innerText.toLowerCase() : '';
      const preview = previewElem ? previewElem.innerText.toLowerCase() : '';
      
      const messageText = `${subject} ${sender} ${preview}`;
      
      if (keywords.some(keyword => messageText.includes(keyword.toLowerCase().trim()))) {
        message.classList.add('dm-detox-important');
      } else {
        message.classList.add('dm-detox-normal');
      }
    });
  }
  
  else if (platform === 'web.whatsapp.com') {
    document.querySelectorAll(selectors.messageContainer).forEach(message => {
      const textElem = message.querySelector(selectors.messageText);
      if (!textElem) return;
      
      const messageText = textElem.innerText.toLowerCase();
      
      if (keywords.some(keyword => messageText.includes(keyword.toLowerCase().trim()))) {
        message.classList.add('dm-detox-important');
      }
    });
  }
  
  else if (platform === 'web.telegram.org') {
    document.querySelectorAll(selectors.messageContainer).forEach(message => {
      const textElem = message.querySelector(selectors.messageText);
      if (!textElem) return;
      
      const messageText = textElem.innerText.toLowerCase();
      
      if (keywords.some(keyword => messageText.includes(keyword.toLowerCase().trim()))) {
        message.classList.add('dm-detox-important');
      }
    });
  }
}

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    filterMessages();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

filterMessages();

setupMutationObserver();

setInterval(filterMessages, 5000);

chrome.storage.onChanged.addListener((changes) => {
  if (changes.priorityKeywords) {
    filterMessages();
  }
});