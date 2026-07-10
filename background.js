const ALARM_NAME = 'gemini-auto-sync';
const DEFAULT_INTERVAL = 30;
const NOTIF_DAILY_ID = 'gemini-daily-warning';
const NOTIF_WEEKLY_ID = 'gemini-weekly-warning';
const SYNC_WINDOW_TIMEOUT_MS = 15000;

let syncTimeoutId = null;
let isSyncing = false;

function setupFrameRules() {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            { header: 'x-frame-options', operation: 'remove' },
            { header: 'content-security-policy', operation: 'remove' }
          ]
        },
        condition: {
          urlFilter: '||gemini.google.com/usage*',
          resourceTypes: ['sub_frame']
        }
      }
    ]
  }).catch(() => {});
}

async function performSilentSync() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    setupFrameRules();
    
    const offscreenUrl = chrome.runtime.getURL('offscreen.html');
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [offscreenUrl]
    });

    if (existingContexts.length === 0) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_SCRAPING'],
        justification: 'Scraping Gemini usage statistics in the background'
      });
    }

    if (syncTimeoutId) clearTimeout(syncTimeoutId);
    syncTimeoutId = setTimeout(() => {
      chrome.runtime.sendMessage({ action: 'SYNC_TIMEOUT' }).catch(() => {});
      cleanupSyncWindow();
    }, SYNC_WINDOW_TIMEOUT_MS);

    chrome.runtime.sendMessage({
      action: 'SCRAPE_HIDDEN',
      url: 'https://gemini.google.com/usage'
    }).catch(() => {
      cleanupSyncWindow();
    });

  } catch (err) {
    cleanupSyncWindow();
  }
}

function cleanupSyncWindow() {
  isSyncing = false;
  if (syncTimeoutId) {
    clearTimeout(syncTimeoutId);
    syncTimeoutId = null;
  }
  chrome.offscreen.closeDocument().catch(() => {});
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SYNC_COMPLETE') {
    const freshTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    const updatedData = { ...request.data, lastUpdated: freshTime };

    chrome.storage.local.set({ geminiUsage: updatedData }, () => {
      checkThresholds(updatedData);
      updateBadge(updatedData);
      cleanupSyncWindow();
    });
  }

  if (request.action === 'SYNC_FAILED') {
    chrome.runtime.sendMessage({ action: 'SYNC_TIMEOUT' }).catch(() => {});
    cleanupSyncWindow();
  }

  if (request.action === 'START_SYNC') {
    performSilentSync();
    sendResponse({ success: true });
  }
  return true;
});

function updateBadge(data) {
  if (!data || data.dailyUsed === undefined) {
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  const num = Math.min(data.dailyUsed, 99).toString();
  chrome.action.setBadgeText({ text: num });

  let color = '#146c2e';
  if (data.dailyUsed >= 90) color = '#ef5350';
  else if (data.dailyUsed >= 75) color = '#ffb300';
  chrome.action.setBadgeBackgroundColor({ color });
}

function checkThresholds(data) {
  const today = new Date().toDateString();
  chrome.storage.local.get(
    ['dailyThreshold', 'weeklyThreshold', 'lastDailyWarningDate', 'lastWeeklyWarningDate'],
    (settings) => {
      const updates = {};

      if (settings.dailyThreshold && data.dailyUsed >= settings.dailyThreshold) {
        if (settings.lastDailyWarningDate !== today) {
          showNotification(NOTIF_DAILY_ID, 'Daily Limit Reached', `You've used ${data.dailyUsed}% of your daily limit.`);
          updates.lastDailyWarningDate = today;
        }
      }

      if (settings.weeklyThreshold && data.weeklyUsed >= settings.weeklyThreshold) {
        if (settings.lastWeeklyWarningDate !== today) {
          showNotification(NOTIF_WEEKLY_ID, 'Weekly Limit Reached', `You've used ${data.weeklyUsed}% of your weekly limit.`);
          updates.lastWeeklyWarningDate = today;
        }
      }

      if (Object.keys(updates).length > 0) chrome.storage.local.set(updates);
    }
  );
}

function showNotification(id, title, message) {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icon.png',
    title,
    message,
    priority: 2,
    requireInteraction: true
  });
}

function createAlarm(intervalMinutes) {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: intervalMinutes });
}

function clearAlarm() {
  chrome.alarms.clear(ALARM_NAME);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) performSilentSync();
});

function updateAlarmState(enabled) {
  if (enabled) {
    chrome.storage.local.get('syncInterval', (res) => {
      createAlarm(res.syncInterval || DEFAULT_INTERVAL);
    });
  } else {
    clearAlarm();
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  if (changes.autoSyncEnabled) updateAlarmState(changes.autoSyncEnabled.newValue);

  if (changes.syncInterval && changes.syncInterval.newValue) {
    chrome.storage.local.get('autoSyncEnabled', (res) => {
      if (res.autoSyncEnabled) createAlarm(changes.syncInterval.newValue);
    });
  }

  if (changes.geminiUsage) updateBadge(changes.geminiUsage.newValue);
});

chrome.runtime.onStartup.addListener(() => {
  initAlarms();
  setupFrameRules();
});

chrome.runtime.onInstalled.addListener(() => {
  initAlarms();
  setupFrameRules();
});

function initAlarms() {
  chrome.storage.local.get(['autoSyncEnabled', 'syncInterval', 'geminiUsage'], (res) => {
    updateBadge(res.geminiUsage || null);
    if (res.autoSyncEnabled) createAlarm(res.syncInterval || DEFAULT_INTERVAL);
  });
}