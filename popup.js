document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.querySelector('.app-container');

  const dailyProgress = document.getElementById('daily-progress');
  const dailyPercentText = document.getElementById('daily-percent-text');
  const dailyReset = document.getElementById('daily-reset');
  const dailyTrack = dailyProgress.parentElement;

  const weeklyProgress = document.getElementById('weekly-progress');
  const weeklyPercentText = document.getElementById('weekly-percent-text');
  const weeklyReset = document.getElementById('weekly-reset');
  const weeklyTrack = weeklyProgress.parentElement;

  const lastUpdatedText = document.getElementById('last-updated');
  const syncStatus = document.getElementById('sync-status');
  const refreshBtn = document.getElementById('refresh-btn');
  const openGeminiBtn = document.getElementById('open-gemini-btn');
  const noticeBanner = document.getElementById('notice-banner');
  const snackbar = document.getElementById('snackbar');
  const snackbarText = document.getElementById('snackbar-text');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');

  const insightsCard = document.getElementById('insights-card');
  const insightSyncStatus = document.getElementById('insight-sync-status');
  const insightWatchers = document.getElementById('insight-watchers');
  const insightAdvice = document.getElementById('insight-advice');

  const themeToggleBtn = document.getElementById('theme-toggle');
  const moonIcon = document.querySelector('.moon-icon');
  const sunIcon = document.querySelector('.sun-icon');

  const settingsBtn = document.getElementById('settings-btn');
  const backBtn = document.getElementById('back-btn');
  const autoSyncToggle = document.getElementById('auto-sync-toggle');
  const resetDataBtn = document.getElementById('reset-data-btn');
  const versionText = document.getElementById('version-text');

  const dailyThresholdInput = document.getElementById('daily-threshold');
  const weeklyThresholdInput = document.getElementById('weekly-threshold');
  const intervalChips = document.querySelectorAll('.interval-chip');

  const resetDialog = document.getElementById('reset-dialog');
  const resetStepChoose = document.getElementById('reset-step-choose');
  const resetStepConfirm = document.getElementById('reset-step-confirm');
  const resetDialogCancel = document.getElementById('reset-dialog-cancel');
  const resetOptionStats = document.getElementById('reset-option-stats');
  const resetOptionAll = document.getElementById('reset-option-all');
  const resetConfirmTitle = document.getElementById('reset-confirm-title');
  const resetConfirmMessage = document.getElementById('reset-confirm-message');
  const resetConfirmBack = document.getElementById('reset-confirm-back');
  const resetConfirmYes = document.getElementById('reset-confirm-yes');

  let snackbarTimer = null;
  let isManualSync = false;
  let loadingStepTimer = null;
  let popupSyncTimeoutId = null;
  let pendingResetChoice = null;

  versionText.textContent = chrome.runtime.getManifest().version;

  function showSuccessToast(message) {
    clearTimeout(snackbarTimer);
    snackbarText.textContent = message;
    snackbar.classList.remove('show');
    void snackbar.offsetWidth;
    snackbar.classList.add('show');
    snackbarTimer = setTimeout(() => snackbar.classList.remove('show'), 3000);
  }

  function showErrorToast(message) {
    clearTimeout(snackbarTimer);
    snackbarText.textContent = message;
    snackbar.classList.remove('show');
    void snackbar.offsetWidth;
    snackbar.classList.add('show');
    snackbarTimer = setTimeout(() => snackbar.classList.remove('show'), 4000);
  }

  function reloadInsightsAndStats() {
    chrome.storage.local.get(['geminiUsage', 'autoSyncEnabled', 'dailyThreshold', 'weeklyThreshold', 'syncInterval'], (res) => {
      renderInsights(res.geminiUsage || null, res);
      if (res.geminiUsage) {
        renderUI(res.geminiUsage);
      }
    });
  }

  chrome.storage.local.get(['dailyThreshold', 'weeklyThreshold', 'syncInterval'], (res) => {
    if (res.dailyThreshold) dailyThresholdInput.value = res.dailyThreshold;
    if (res.weeklyThreshold) weeklyThresholdInput.value = res.weeklyThreshold;

    const activeInterval = res.syncInterval || 30;
    intervalChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.getAttribute('data-value')) === activeInterval);
    });
  });

  dailyThresholdInput.addEventListener('change', () => {
    const raw = dailyThresholdInput.value.trim();
    if (raw === '') {
      chrome.storage.local.remove('dailyThreshold', () => {
        dailyThresholdInput.value = '';
        reloadInsightsAndStats();
        showSuccessToast('Daily warning cleared');
      });
      return;
    }
    const val = parseInt(raw);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      chrome.storage.local.set({ dailyThreshold: val }, reloadInsightsAndStats);
      showSuccessToast(`Daily warning set to ${val}%`);
    } else {
      dailyThresholdInput.value = '';
    }
  });

  weeklyThresholdInput.addEventListener('change', () => {
    const raw = weeklyThresholdInput.value.trim();
    if (raw === '') {
      chrome.storage.local.remove('weeklyThreshold', () => {
        weeklyThresholdInput.value = '';
        reloadInsightsAndStats();
        showSuccessToast('Weekly warning cleared');
      });
      return;
    }
    const val = parseInt(raw);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      chrome.storage.local.set({ weeklyThreshold: val }, reloadInsightsAndStats);
      showSuccessToast(`Weekly warning set to ${val}%`);
    } else {
      weeklyThresholdInput.value = '';
    }
  });

  intervalChips.forEach(chip => {
    chip.addEventListener('click', () => {
      intervalChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const val = parseInt(chip.getAttribute('data-value'));
      chrome.storage.local.set({ syncInterval: val }, () => {
        showSuccessToast(`Sync interval set to ${val} min`);
        reloadInsightsAndStats();
      });
    });
  });

  function openSettings() {
    chrome.storage.local.get(['autoSyncEnabled', 'syncInterval'], (res) => {
      autoSyncToggle.checked = res.autoSyncEnabled === true;
      const activeInterval = res.syncInterval || 30;
      intervalChips.forEach(chip => {
        chip.classList.toggle('active', parseInt(chip.getAttribute('data-value')) === activeInterval);
      });
      appContainer.classList.add('is-settings-open');
    });
  }

  function closeSettings() {
    appContainer.classList.remove('is-settings-open');
  }

  settingsBtn.addEventListener('click', openSettings);
  backBtn.addEventListener('click', closeSettings);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && appContainer.classList.contains('is-settings-open')) {
      closeSettings();
    }
  });

  function applyTheme(isLight) {
    document.body.classList.toggle('light-theme', isLight);
    moonIcon.style.display = isLight ? 'none' : 'block';
    sunIcon.style.display = isLight ? 'block' : 'none';
  }

  themeToggleBtn.addEventListener('click', () => {
    const isLight = !document.body.classList.contains('light-theme');
    applyTheme(isLight);
    chrome.storage.local.set({ theme: isLight ? 'light' : 'dark' });
  });

  function renderInsights(usageData, settings) {
    insightsCard.classList.remove('hidden');

    if (settings.autoSyncEnabled) {
      insightSyncStatus.textContent = `Active (${settings.syncInterval || 30} min)`;
      insightSyncStatus.className = 'insight-value value-active';
    } else {
      insightSyncStatus.textContent = 'Disabled';
      insightSyncStatus.className = 'insight-value value-inactive';
    }

    const watchers = [];
    if (settings.dailyThreshold) watchers.push(`Daily (> ${settings.dailyThreshold}%)`);
    if (settings.weeklyThreshold) watchers.push(`Weekly (> ${settings.weeklyThreshold}%)`);

    if (watchers.length > 0) {
      insightWatchers.textContent = watchers.join(' / ');
      insightWatchers.classList.remove('value-inactive');
    } else {
      insightWatchers.textContent = 'None configured';
      insightWatchers.classList.add('value-inactive');
    }

    if (!usageData) {
      insightAdvice.innerHTML = 'No usage data synced yet. Perform your first sync to unlock smart predictions.';
      return;
    }

    const dailyUsed = usageData.dailyUsed || 0;
    const weeklyUsed = usageData.weeklyUsed || 0;
    const dThreshold = settings.dailyThreshold || 90;
    const wThreshold = settings.weeklyThreshold || 90;

    if (dailyUsed >= dThreshold) {
      insightAdvice.innerHTML = `
        <svg class="insight-icon warning" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L1 21h22L12 2zm0 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-4h-2V8h2v5z"/>
        </svg>
        <span>Daily usage (${dailyUsed}%) has exceeded your configured threshold (${dThreshold}%). Consider pausing heavy tasks.</span>
      `;
    } else if (weeklyUsed >= wThreshold) {
      insightAdvice.innerHTML = `
        <svg class="insight-icon warning" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L1 21h22L12 2zm0 15c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm1-4h-2V8h2v5z"/>
        </svg>
        <span>Weekly usage (${weeklyUsed}%) has reached your threshold (${wThreshold}%). Monitor usage until reset.</span>
      `;
    } else if (dailyUsed < 30 && weeklyUsed < 30) {
      insightAdvice.innerHTML = `
        <svg class="insight-icon success" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>Excellent! Your limits are highly optimal. You have a massive safe margin remaining.</span>
      `;
    } else {
      insightAdvice.innerHTML = `
        <svg class="insight-icon info" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        <span>Smart Watcher: Your consumption is balanced. No immediate exhaust thresholds detected.</span>
      `;
    }
  }

  function renderUI(data) {
    dailyTrack.classList.remove('empty');
    weeklyTrack.classList.remove('empty');
    dailyProgress.style.width = `${data.dailyUsed}%`;
    dailyPercentText.textContent = `${data.dailyUsed}%`;
    dailyReset.textContent = `Resets at ${data.dailyReset}`;
    weeklyProgress.style.width = `${data.weeklyUsed}%`;
    weeklyPercentText.textContent = `${data.weeklyUsed}%`;
    weeklyReset.textContent = `Resets ${data.weeklyReset}`;
    lastUpdatedText.textContent = `Synced today at ${data.lastUpdated}`;
    syncStatus.textContent = 'Synced';
    syncStatus.style.backgroundColor = '#146c2e';
    syncStatus.style.color = '#e8f5e9';
    noticeBanner.classList.add('hidden');
    noticeBanner.classList.remove('error');
  }

  function onSyncSuccess() {
    showSuccessToast('Updated successfully');
    reloadInsightsAndStats();
  }

  autoSyncToggle.addEventListener('change', () => {
    const enabled = autoSyncToggle.checked;
    chrome.storage.local.set({ autoSyncEnabled: enabled }, reloadInsightsAndStats);
    showSuccessToast(enabled ? 'Auto-sync enabled' : 'Auto-sync disabled');
  });

  const RESET_COPY = {
    stats: {
      title: 'Reset Stats?',
      message: 'This will clear your saved usage stats. Your settings will stay untouched.'
    },
    all: {
      title: 'Reset Everything?',
      message: 'This will clear usage stats and restore auto-sync, interval, and warning limits to defaults.'
    }
  };

  function openResetDialog() {
    pendingResetChoice = null;
    resetStepConfirm.classList.add('hidden');
    resetStepChoose.classList.remove('hidden');
    resetDialog.showModal();
  }

  function showResetConfirmStep(choice) {
    pendingResetChoice = choice;
    resetConfirmTitle.textContent = RESET_COPY[choice].title;
    resetConfirmMessage.textContent = RESET_COPY[choice].message;
    resetConfirmYes.classList.toggle('btn-danger', choice === 'all');
    resetStepChoose.classList.add('hidden');
    resetStepConfirm.classList.remove('hidden');
  }

  function backToChooseStep() {
    pendingResetChoice = null;
    resetStepConfirm.classList.add('hidden');
    resetStepChoose.classList.remove('hidden');
  }

  function closeResetDialog() {
    resetDialog.close();
    pendingResetChoice = null;
  }

  resetOptionStats.addEventListener('click', () => showResetConfirmStep('stats'));
  resetOptionAll.addEventListener('click', () => showResetConfirmStep('all'));
  resetDialogCancel.addEventListener('click', closeResetDialog);
  resetConfirmBack.addEventListener('click', backToChooseStep);
  resetDialog.addEventListener('click', (e) => {
    if (e.target === resetDialog) closeResetDialog();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && resetDialog.open) closeResetDialog();
  });

  function resetStatsUI() {
    dailyTrack.classList.add('empty');
    weeklyTrack.classList.add('empty');
    dailyProgress.style.width = '0%';
    dailyPercentText.textContent = '--%';
    dailyReset.textContent = 'Sync to view reset time';
    weeklyProgress.style.width = '0%';
    weeklyPercentText.textContent = '--%';
    weeklyReset.textContent = 'Sync to view reset time';
    lastUpdatedText.textContent = 'Click the sync icon above to fetch your stats.';
    syncStatus.textContent = 'Not Synced';
    syncStatus.style.backgroundColor = '#5c4300';
    syncStatus.style.color = '#ffe082';
    noticeBanner.classList.add('hidden');
  }

  function resetSettingsUI() {
    autoSyncToggle.checked = false;
    dailyThresholdInput.value = '';
    weeklyThresholdInput.value = '';
    intervalChips.forEach(chip => {
      chip.classList.toggle('active', parseInt(chip.getAttribute('data-value')) === 30);
    });
  }

  function performReset(choice) {
    const keysToRemove = ['geminiUsage'];
    if (choice === 'all') {
      keysToRemove.push('autoSyncEnabled', 'syncInterval', 'dailyThreshold', 'weeklyThreshold', 'lastDailyWarningDate', 'lastWeeklyWarningDate');
    }

    chrome.storage.local.remove(keysToRemove, () => {
      resetStatsUI();
      if (choice === 'all') resetSettingsUI();

      reloadInsightsAndStats();
      closeSettings();
      showSuccessToast(choice === 'all' ? 'Everything reset' : 'Stats cleared');
    });
  }

  resetDataBtn.addEventListener('click', openResetDialog);

  resetConfirmYes.addEventListener('click', () => {
    const choice = pendingResetChoice;
    closeResetDialog();
    if (choice) performReset(choice);
  });

  chrome.storage.local.get(['geminiUsage', 'theme', 'autoSyncEnabled', 'dailyThreshold', 'weeklyThreshold', 'syncInterval'], (result) => {
    applyTheme(result.theme === 'light');
    renderInsights(result.geminiUsage || null, result);
    if (result.geminiUsage) {
      renderUI(result.geminiUsage);
    }
  });

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'SYNC_TIMEOUT' && refreshBtn.disabled) {
      stopLoading();
      isManualSync = false;
      showErrorToast('Sync took too long. Please try again.');
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.geminiUsage) {
      const newData = changes.geminiUsage.newValue;
      if (newData) {
        if (isManualSync) {
          onSyncSuccess();
          isManualSync = false;
        } else {
          reloadInsightsAndStats();
        }
        stopLoading();
      }
    }
  });

  refreshBtn.addEventListener('click', () => {
    if (refreshBtn.disabled) return;

    refreshBtn.disabled = true;
    refreshBtn.classList.add('spinning');

    isManualSync = true;
    loadingOverlay.classList.remove('hidden');
    noticeBanner.classList.add('hidden');
    noticeBanner.classList.remove('error');

    const steps = ['Connecting to Gemini ...', 'Fetching usage stats ...', 'Updating dashboard ...'];
    let stepIndex = 0;
    loadingText.textContent = steps[0];
    loadingText.style.opacity = '1';

    clearInterval(loadingStepTimer);
    loadingStepTimer = setInterval(() => {
      loadingText.style.opacity = '0';
      setTimeout(() => {
        stepIndex = Math.min(stepIndex + 1, steps.length - 1);
        loadingText.textContent = steps[stepIndex];
        loadingText.style.opacity = '1';
      }, 200);
    }, 2500);

    chrome.runtime.sendMessage({ action: 'START_SYNC' }, () => {
      clearTimeout(popupSyncTimeoutId);
      popupSyncTimeoutId = setTimeout(() => {
        if (refreshBtn.disabled) {
          stopLoading();
          isManualSync = false;
          showErrorToast('Sync took too long. Please try again.');
        }
      }, 17000);
    });
  });

  function stopLoading() {
    refreshBtn.disabled = false;
    refreshBtn.classList.remove('spinning');
    loadingOverlay.classList.add('hidden');
    clearInterval(loadingStepTimer);
    loadingStepTimer = null;
    clearTimeout(popupSyncTimeoutId);
    popupSyncTimeoutId = null;
  }

  openGeminiBtn.addEventListener('click', () => chrome.tabs.create({ url: 'https://gemini.google.com/' }));
});