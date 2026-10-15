// Data synchronization utility for FERMS
// Coordinates immediate and polling-based updates across components and tabs

const SYNC_CHANNEL_NAME = 'ferms_data_sync';

/**
 * Broadcast an update event across the current window and all open browser tabs/windows.
 */
export function notifyDataSync(detail = {}) {
  try {
    // 1. Same-window custom event
    window.dispatchEvent(new CustomEvent('ferms:sync', { detail }));

    // 2. Cross-tab BroadcastChannel (standard native browser API)
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
      bc.postMessage(detail);
      bc.close();
    }
  } catch (err) {
    // Silently continue if broadcast is unavailable
  }
}

/**
 * Subscribe to data synchronization events from any component or tab.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeDataSync(callback) {
  const handleCustomEvent = (e) => {
    if (callback && typeof callback === 'function') {
      callback(e.detail || {});
    }
  };

  window.addEventListener('ferms:sync', handleCustomEvent);

  let bc = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel(SYNC_CHANNEL_NAME);
      bc.onmessage = (e) => {
        if (callback && typeof callback === 'function') {
          callback(e.data || {});
        }
      };
    } catch (err) {
      // BroadcastChannel fallback
    }
  }

  return () => {
    window.removeEventListener('ferms:sync', handleCustomEvent);
    if (bc) {
      try {
        bc.close();
      } catch (err) {
        // ignore
      }
    }
  };
}
