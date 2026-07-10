const POLL_INTERVAL_MS = 300;
const SCRAPE_TIMEOUT_MS = 10000;

function scrapePageData() {
  const bodyText = document.body.innerText || '';
  const cleanText = bodyText.replace(/\s+/g, ' ');

  const dailyMatch = cleanText.match(/Current usage.*?(\d+)\s*%\s*used/i);
  const dailyResetMatch = cleanText.match(/Resets at\s*(\d+:\d+\s*(?:AM|PM))/i);
  const weeklyMatch = cleanText.match(/Weekly limit.*?(\d+)\s*%\s*used/i);
  const weeklyResetMatch = cleanText.match(/Resets\s*([A-Za-z]{3}\s*\d+\s*at\s*\d+:\d+\s*(?:AM|PM))/i);

  if (dailyMatch || weeklyMatch) {
    return {
      dailyUsed: dailyMatch ? parseInt(dailyMatch[1]) : 0,
      dailyReset: dailyResetMatch ? dailyResetMatch[1] : 'Unknown',
      weeklyUsed: weeklyMatch ? parseInt(weeklyMatch[1]) : 0,
      weeklyReset: weeklyResetMatch ? weeklyResetMatch[1] : 'Unknown',
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }
  return null;
}

const checkInterval = setInterval(() => {
  const data = scrapePageData();
  if (data) {
    clearInterval(checkInterval);
    chrome.runtime.sendMessage({ action: 'SYNC_COMPLETE', data });
  }
}, POLL_INTERVAL_MS);

setTimeout(() => {
  clearInterval(checkInterval);
  chrome.runtime.sendMessage({ action: 'SYNC_FAILED' });
}, SCRAPE_TIMEOUT_MS);