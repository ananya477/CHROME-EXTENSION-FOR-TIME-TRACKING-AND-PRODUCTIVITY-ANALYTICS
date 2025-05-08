let startTime;
let currentUrl;
let updateInterval;

const productiveWebsites = [
    'github.com',
    'stackoverflow.com',
    'leetcode.com',
    'developer.mozilla.org',
    'medium.com',
    'kaggle.com',
    'coursera.org',
    'udemy.com',
    'edx.org',
    'freecodecamp.org',
    'w3schools.com',
    'geeksforgeeks.org',
    'docs.google.com',
    'chat.openai.com',
    'linkedin.com/learning',
    'google.scholar.com',
    'researchgate.net'
];

const unproductiveWebsites = [
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'youtube.com',
    'netflix.com',
    'netflix',
    'spotify.com',
    'reddit.com',
    'tiktok.com',
    'snapchat.com',
    'pinterest.com',
    'tumblr.com',
    'twitch.tv',
    'discord.com',
    'whatsapp.com',
    'amazon.com',
    'primevideo.com',
    'hotstar.com',
    'hulu.com',
    'disneyplus.com',
    'vimeo.com',
    'dailymotion.com',
    '9gag.com',
    'buzzfeed.com',
    'imgur.com',
    'games.com',
    'miniclip.com',
    'chess.com',
    'spotify.com'
];

function saveTimeData(url, timeSpent) {
    try {
        const domain = new URL(url).hostname;
        console.log('Saving time for domain:', domain, 'Time spent:', timeSpent); // Debug log
        
        chrome.storage.local.get(['timeData'], (result) => {
            const timeData = result.timeData || {};
            if (!timeData[domain]) {
                timeData[domain] = {
                    totalTime: 0,
                    isProductive: productiveWebsites.some(site => domain.includes(site)),
                    isUnproductive: unproductiveWebsites.some(site => domain.includes(site))
                };
            }
            timeData[domain].totalTime += timeSpent;
            console.log('Updated time for', domain, ':', timeData[domain].totalTime); // Debug log
            chrome.storage.local.set({ timeData });
        });
    } catch (error) {
        console.error('Error saving time:', error);
    }
}

function updateCurrentTabTime() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url && tabs[0].url.startsWith('http')) {
            const now = new Date();
            const timeSpent = now - startTime;
            if (timeSpent > 0) {
                console.log('Updating time for:', tabs[0].url, 'Time spent:', timeSpent); // Debug log
                saveTimeData(tabs[0].url, timeSpent);
                startTime = now;
            }
        }
    });
}

// Start tracking immediately
startTime = new Date();
updateInterval = setInterval(updateCurrentTabTime, 1000);

// Add this new function to handle window focus
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0] && tabs[0].url) {
                handleTabChange(tabs[0].url);
            }
        });
    }
});

function handleTabChange(newUrl) {
    if (!newUrl || !newUrl.startsWith('http')) return;
    
    // Save time for the previous tab before switching
    if (currentUrl) {
        const endTime = new Date();
        const timeSpent = endTime - startTime;
        if (timeSpent > 0) {
            saveTimeData(currentUrl, timeSpent);
        }
    }
    
    startTime = new Date();
    currentUrl = newUrl;
}

// Remove the interval setup from onInstalled
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({ timeData: {} });
});

// Add cleanup when extension is unloaded
chrome.runtime.onSuspend.addListener(() => {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    updateCurrentTabTime(); // Final update before unloading
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url) {
            handleTabChange(tab.url);
        }
    } catch (error) {
        console.error('Error handling tab activation:', error);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        handleTabChange(changeInfo.url);
    }
});


const DAILY_LIMITS = {
    unproductive: 120, // 2 hours in minutes
    warning: 90 // Warning at 1.5 hours
};

function checkTimeLimit(timeData) {
    const totalUnproductiveTime = Object.entries(timeData)
        .filter(([_, data]) => data.isUnproductive)
        .reduce((acc, [_, data]) => acc + data.totalTime, 0);
    
    const minutesSpent = Math.round(totalUnproductiveTime / 60000);
    
    if (minutesSpent >= DAILY_LIMITS.unproductive) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'Daily Limit Reached!',
            message: 'You have reached your unproductive time limit for today.'
        });
    } else if (minutesSpent >= DAILY_LIMITS.warning) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'Warning!',
            message: 'Approaching daily limit for unproductive time.'
        });
    }
}


function blockUnproductiveSites(timeData) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        const domain = new URL(currentTab.url).hostname;
        
        if (isUnproductive(domain) && isOverLimit(timeData)) {
            chrome.tabs.update(currentTab.id, {
                url: chrome.runtime.getURL('blocked.html')
            });
        }
    });
}


function generateWeeklyReport() {
    chrome.storage.local.get(['timeData'], (result) => {
        const weeklyStats = calculateWeeklyStats(result.timeData);
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'Weekly Productivity Report',
            message: `Productive: ${weeklyStats.productive}hrs\nUnproductive: ${weeklyStats.unproductive}hrs`
        });
    });
}

// Add these functions after your existing code

function isOverLimit(timeData) {
    const totalUnproductiveTime = Object.entries(timeData)
        .filter(([_, data]) => data.isUnproductive)
        .reduce((acc, [_, data]) => acc + data.totalTime, 0);
    return Math.round(totalUnproductiveTime / 60000) >= DAILY_LIMITS.unproductive;
}

function calculateWeeklyStats(timeData) {
    const productive = Object.entries(timeData)
        .filter(([_, data]) => data.isProductive)
        .reduce((acc, [_, data]) => acc + data.totalTime, 0) / 3600000; // Convert to hours

    const unproductive = Object.entries(timeData)
        .filter(([_, data]) => data.isUnproductive)
        .reduce((acc, [_, data]) => acc + data.totalTime, 0) / 3600000;

    return {
        productive: Math.round(productive * 10) / 10,
        unproductive: Math.round(unproductive * 10) / 10
    };
}

// Set up weekly report alarm
chrome.alarms.create('weeklyReport', {
    periodInMinutes: 10080 // One week in minutes
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'weeklyReport') {
        generateWeeklyReport();
    }
});

// Check time limits every minute
setInterval(() => {
    chrome.storage.local.get(['timeData'], (result) => {
        checkTimeLimit(result.timeData || {});
        blockUnproductiveSites(result.timeData || {});
    });
}, 60000);