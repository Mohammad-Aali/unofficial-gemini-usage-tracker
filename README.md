# 📊 Unofficial Gemini Usage Tracker

A Chrome extension that displays your daily and weekly Google Gemini usage
quota in a small Material Design popup, with optional background auto-sync
and threshold notifications.

**This project is not affiliated with, endorsed by, or associated with
Google in any way.** It is an independent, unofficial tool built because
Google does not currently provide a public API to check Gemini usage quota.

<br>
<p align="center">
<img width="1536" height="1024" alt="Gemini Usage Tracker" src="https://github.com/user-attachments/assets/b80f0be2-73b1-436f-8f3b-cdc892249bfb" />
</p>

---

## ✨ Features

- Daily / weekly usage progress bars with reset time
- Optional background auto-sync on a configurable interval (15m–4h)
- Configurable warning notifications at custom usage thresholds
- Dark / light theme
- **Badge icon** - the toolbar icon shows your current daily usage
  percentage at a glance, no need to open the popup. Badge color
  shifts as a warning cue:
  - 🟢 Green - under 75% used
  - 🟡 Amber - 75–89% used
  - 🔴 Red - 90%+ used

## ⚙️ How it works

Google does not expose usage data through any documented API. The only
place this data currently exists is on the rendered
`gemini.google.com/usage` page, inside your logged-in session.

To read it, this extension:

1. Uses a Chrome **offscreen document** (a standard, Google-provided MV3
   API for background DOM work) to load `gemini.google.com/usage` in a
   hidden iframe, using your existing browser session/cookies.
2. Runs a content script on that hidden page to parse the usage numbers
   out of the rendered text.
3. Sends the parsed numbers back to the extension popup and clears the
   iframe.

I tried a few approaches before landing here - including scraping via a
normal background tab - but that meant either flashing a new tab/window
open every sync interval (visually disruptive, especially with auto-sync
on a short interval) or leaving a tab pinned open permanently. The hidden
offscreen approach avoids both, which is why I went with it. **You should
understand the tradeoff before installing or forking this**, which is
explained fully below.

## ⚠️ Security & privacy notes - please read

I want to be direct about this rather than gloss over it, since it's the
most important thing to understand before installing:

- **This extension removes Google's `X-Frame-Options` and
  `Content-Security-Policy` response headers** (via
  `declarativeNetRequest`) specifically for `gemini.google.com/usage`, in
  order to load that page inside a hidden iframe. Google sets those
  headers deliberately to prevent its authenticated pages from being
  framed by other origins. This extension circumvents that on your own
  machine, for your own account, so it can read the page's contents.
- Because of this, the technique sits in a **gray/risk area of Google's
  Terms of Service** around automated or non-standard access to your
  account, even though no third-party server, credential, or other
  account is ever touched - everything happens locally in your own
  browser, using your own session.
- I have **no visibility into Google's internal detection or enforcement
  systems** and cannot promise this won't ever be flagged. In practice,
  low-frequency personal use (checking a quota page every 15 min–4 h)
  looks nothing like abuse, but "probably fine" is not a guarantee.
- **Use this at your own risk, on your own account, and only if you're
  comfortable with that tradeoff.** If you're not, don't enable
  auto-sync, or don't use the extension at all - a manual visit to
  `gemini.google.com/usage` in a normal tab carries none of this risk.
- The extension only ever requests `gemini.google.com/*` host permission.
  It does not talk to any third-party server - all code runs locally, all
  data stays in `chrome.storage.local` on your machine.
- The code is fully open source in this repo. Please read
  `background.js`, `content.js`, and `offscreen.js` yourself before
  installing rather than trusting this description - that's the point of
  publishing it openly.
- If Google changes the `/usage` page's markup or actively blocks this
  framing pattern, syncing will simply stop working (fail closed) rather
  than break in an unsafe way.

## 🚀 Installation (unpacked / developer mode)

1. Download or clone this repo.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Pin the extension and click the icon to open the popup.
6. Click the sync icon to fetch your current usage.

## 🔐 Permissions used

| Permission | Why |
|---|---|
| `storage` | Save usage data and settings locally |
| `alarms` | Schedule background auto-sync |
| `notifications` | Warn when usage crosses your threshold |
| `offscreen` | Load the usage page in the background to parse it |
| `declarativeNetRequest` | Strip framing-prevention headers for `gemini.google.com/usage` only (see Security notes above) |
| `host_permissions: gemini.google.com/*` | Required to read the usage page |

## ⚖️ Disclaimer

This is an unofficial, community-built tool, provided as-is, with no
warranty. It is not produced, reviewed, or supported by Google. Use it at
your own discretion and risk. If Google's Terms of Service change, or if
this technique is ever flagged as violating them, that risk is borne by
the user running the extension, not by this project.

## License

MIT (or your choice - update this section to match your `LICENSE` file)
