chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'SCRAPE_HIDDEN') {
    let frame = document.getElementById('gemini-frame');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'gemini-frame';
      document.body.appendChild(frame);
    }
    frame.src = request.url;
  }
  return true;
});