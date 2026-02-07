/**
 * EARTHQUAKE EVENT NETWORK
 * ═══════════════════════════════════════════════════════════
 * Crowd sensing system: collects shaking reports from multiple phones.
 * Triggers earthquake alert only when N devices in the same location cell
 * report similar shaking within T seconds.
 *
 * This reduces false positives (car, drop, footstep) while enabling
 * faster detection than waiting for official seismic networks.
 */

export const EarthquakeEventNetwork = (() => {
  let events = []; // All recent events: {timestamp, cellId, intensity, deviceId, features}
  let alerts = []; // Triggered alerts: {timestamp, cellId, deviceCount, avgIntensity, status}
  let devices = new Map(); // Track active devices: {deviceId -> lastHeartbeat}

  const DEFAULT_CONFIG = {
    N_DEVICES: 3, // Require 3+ devices in same cell
    T_WINDOW: 4000, // Within 4 seconds
    MIN_INTENSITY: 2.0, // Minimum acceleration magnitude
    ALERT_COOLDOWN: 10000, // Don't re-alert same cell for 10s
  };

  let config = { ...DEFAULT_CONFIG };

  return {
    // Submit a shaking event from a device
    reportShaking(shakingEvent) {
      const { timestamp, locationCell, intensity, deviceId = "anon" } = shakingEvent;

      if (!locationCell) return null;

      // Record device heartbeat
      devices.set(deviceId, timestamp);

      // Add event
      const event = {
        timestamp,
        cellId: locationCell,
        intensity,
        deviceId,
        features: shakingEvent.features || {},
      };

      events.push(event);

      // Clean up old events (> 10 seconds)
      const cutoff = timestamp - 10000;
      events = events.filter((e) => e.timestamp > cutoff);

      // Check for earthquake alert threshold
      this.checkAlertTrigger(locationCell, timestamp);

      return event;
    },

    // Check if we should trigger an alert in this cell
    checkAlertTrigger(cellId, currentTime) {
      // Find recent events in this cell
      const recentEvents = events.filter(
        (e) =>
          e.cellId === cellId &&
          e.timestamp > currentTime - config.T_WINDOW &&
          e.intensity >= config.MIN_INTENSITY
      );

      // Check if we have enough devices
      if (recentEvents.length < config.N_DEVICES) {
        return null;
      }

      // Get unique devices
      const uniqueDevices = new Set(recentEvents.map((e) => e.deviceId));
      if (uniqueDevices.size < config.N_DEVICES) {
        return null; // Not enough unique devices
      }

      // Check alert cooldown
      const lastAlert = alerts.find(
        (a) =>
          a.cellId === cellId &&
          currentTime - a.timestamp < config.ALERT_COOLDOWN
      );
      if (lastAlert) {
        return null; // Alert cooldown active
      }

      // Calculate alert metrics
      const avgIntensity =
        recentEvents.reduce((sum, e) => sum + e.intensity, 0) /
        recentEvents.length;
      const maxIntensity = Math.max(...recentEvents.map((e) => e.intensity));

      // ALERT TRIGGERED!
      const alert = {
        timestamp: currentTime,
        cellId,
        deviceCount: uniqueDevices.size,
        avgIntensity,
        maxIntensity,
        devices: Array.from(uniqueDevices),
        status: "ALERT",
        confidence:
          Math.min(100, (uniqueDevices.size / config.N_DEVICES) * 100 +
          (avgIntensity / 10) * 30), // Rough confidence score
      };

      alerts.push(alert);

      // Keep only recent alerts
      const alertCutoff = currentTime - 60000;
      alerts = alerts.filter((a) => a.timestamp > alertCutoff);

      return alert;
    },

    // Get recent events (for debugging/visualization)
    getRecentEvents(cellId = null, limit = 100) {
      let result = events;
      if (cellId) {
        result = result.filter((e) => e.cellId === cellId);
      }
      return result.slice(-limit);
    },

    // Get active alerts
    getAlerts() {
      return [...alerts];
    },

    // Get alert for specific cell
    getAlertForCell(cellId) {
      return alerts.find((a) => a.cellId === cellId);
    },

    // Get device count
    getActiveDevices() {
      const now = Date.now();
      const timeout = 30000; // Device timeout after 30s
      const activeDevices = Array.from(devices.entries())
        .filter(([, lastSeen]) => now - lastSeen < timeout)
        .map(([id]) => id);
      return activeDevices;
    },

    // Update configuration
    setConfig(newConfig) {
      config = { ...config, ...newConfig };
      return config;
    },

    // Get current configuration
    getConfig() {
      return { ...config };
    },

    // Clear all data (for testing)
    reset() {
      events = [];
      alerts = [];
      devices.clear();
    },

    // Get event statistics
    getStats() {
      const now = Date.now();
      const recentCutoff = now - 60000;
      const recentEvents = events.filter((e) => e.timestamp > recentCutoff);

      const cellStats = {};
      recentEvents.forEach((e) => {
        if (!cellStats[e.cellId]) {
          cellStats[e.cellId] = {
            count: 0,
            devices: new Set(),
            avgIntensity: 0,
            maxIntensity: 0,
          };
        }
        const stat = cellStats[e.cellId];
        stat.count++;
        stat.devices.add(e.deviceId);
        stat.avgIntensity += e.intensity;
        stat.maxIntensity = Math.max(stat.maxIntensity, e.intensity);
      });

      // Convert to proper objects
      for (const cellId in cellStats) {
        const stat = cellStats[cellId];
        stat.devices = Array.from(stat.devices);
        stat.avgIntensity = stat.count > 0 ? stat.avgIntensity / stat.count : 0;
      }

      return {
        totalEvents: recentEvents.length,
        totalAlerts: alerts.filter((a) => a.timestamp > recentCutoff).length,
        activeDevices: this.getActiveDevices().length,
        cellStats,
      };
    },
  };
})();
