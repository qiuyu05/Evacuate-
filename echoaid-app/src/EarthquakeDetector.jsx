import { useState, useEffect, useRef, useCallback } from "react";

/**
 * EARTHQUAKE DETECTOR
 * ══════════════════════════════════════════════════════════
 * Low-power motion monitoring via DeviceMotionEvent
 * Detects strong shaking patterns (> threshold acceleration)
 * Feeds into crowd sensing system for confirmation
 */

export const EarthquakeDetector = ({
  onShakingDetected,     // callback(event): reports shaking to server
  locationCell,          // current location cell ID
  enabled = false,
  sensitivityLevel = 2,  // 1=very sensitive, 2=normal, 3=less sensitive
}) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastShakings, setLastShakings] = useState([]);
  const [shakingIntensity, setShakingIntensity] = useState(0);
  const motionHistoryRef = useRef(new Float32Array(60)); // Rolling 60-sample window
  const motionIndexRef = useRef(0);
  const lastReportRef = useRef(0);

  // Sensitivity thresholds (acceleration in m/s²)
  const THRESHOLDS = {
    1: { shakeMagnitude: 2.0, confirmationWindow: 5000 },    // Very sensitive
    2: { shakeMagnitude: 3.0, confirmationWindow: 4000 },    // Normal
    3: { shakeMagnitude: 4.5, confirmationWindow: 3000 },    // Less sensitive
  };

  const config = THRESHOLDS[Math.min(3, Math.max(1, sensitivityLevel))];

  // Request permission (iOS 13+)
  const requestPermission = useCallback(async () => {
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission === "granted") {
          window.addEventListener("devicemotion", handleMotion);
          setIsMonitoring(true);
        }
      } catch (err) {
        console.error("Permission denied:", err);
      }
    } else {
      // Non-iOS: assume permission granted
      window.addEventListener("devicemotion", handleMotion);
      setIsMonitoring(true);
    }
  }, []);

  const calculateMagnitude = (x, y, z) => {
    // Euclidean magnitude of acceleration vector (ignore gravity ~9.8 m/s²)
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    return magnitude;
  };

  const handleMotion = useCallback((event) => {
    if (!enabled || !locationCell) return;

    const { x, y, z } = event.acceleration || { x: 0, y: 0, z: 0 };
    const magnitude = calculateMagnitude(x, y, z);

    // Store in rolling window
    const idx = motionIndexRef.current % 60;
    motionHistoryRef.current[idx] = magnitude;
    motionIndexRef.current++;

    // Current intensity (recent average)
    const recentWindow = Array.from(motionHistoryRef.current).slice(
      Math.max(0, motionIndexRef.current - 15),
      motionIndexRef.current
    );
    const avgRecent = recentWindow.length > 0
      ? recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length
      : 0;

    setShakingIntensity(avgRecent);

    // Detect shaking event if magnitude exceeds threshold
    if (
      magnitude > config.shakeMagnitude &&
      Date.now() - lastReportRef.current > 1000 // Rate limit: 1 event per second
    ) {
      // Shaking detected
      const timestamp = Date.now();
      lastReportRef.current = timestamp;

      const shakingEvent = {
        timestamp,
        locationCell,
        intensity: magnitude,
        magnitude: avgRecent,
        features: {
          peakAcceleration: magnitude,
          recentAverage: avgRecent,
          windowSize: recentWindow.length,
        },
      };

      // Report to crowd sensing system
      if (onShakingDetected) {
        onShakingDetected(shakingEvent);
      }

      // Log locally
      setLastShakings((prev) =>
        [shakingEvent, ...prev].slice(0, 20) // Keep last 20 events
      );
    }
  }, [enabled, locationCell, config.shakeMagnitude, onShakingDetected]);

  const stopMonitoring = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    setIsMonitoring(false);
  }, [handleMotion]);

  useEffect(() => {
    if (enabled && locationCell) {
      requestPermission();
    } else if (isMonitoring) {
      stopMonitoring();
    }

    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [enabled, locationCell, isMonitoring, requestPermission, stopMonitoring]);

  return {
    isMonitoring,
    shakingIntensity,
    lastShakings,
    requestPermission,
    stopMonitoring,
    config,
  };
};
