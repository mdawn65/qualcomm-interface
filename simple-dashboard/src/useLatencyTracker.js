import { useRef, useEffect } from 'react';

/**
 * Custom hook to track end-to-end latency from button click to image display
 * 
 * @param {string} imageUrl - The URL of the image to track
 * @param {Function} onLatencyCalculated - Callback when latency is calculated
 *                                          Receives (latencyInSeconds, view)
 */
export function useLatencyTracker(imageUrl, onLatencyCalculated) {
  const imageRef = useRef(null);
  const trackingDataRef = useRef(null); // { startTime, view, calculated }

  /**
   * Start tracking latency - call this when the user clicks the generate button
   * @param {string} view - The view at the time of submission ('Edge' or 'Cloud')
   */
  const startTracking = (view) => {
    console.log('[LatencyTracker] START TRACKING - View:', view);
    trackingDataRef.current = {
      startTime: performance.now(),
      view: view,
      calculated: false
    };
    console.log('[LatencyTracker] Start time:', trackingDataRef.current.startTime);
  };

  /**
   * Reset tracking state - call this on errors
   */
  const resetTracking = () => {
    console.log('[LatencyTracker] RESET TRACKING');
    trackingDataRef.current = null;
  };

  /**
   * Calculate and report latency
   */
  const calculateLatency = () => {
    const data = trackingDataRef.current;
    
    if (!data) {
      console.warn('[LatencyTracker] No tracking data!');
      return;
    }

    if (data.calculated) {
      console.log('[LatencyTracker] Already calculated, skipping');
      return;
    }

    data.calculated = true;
    const elapsedMs = performance.now() - data.startTime;
    const elapsedSeconds = (elapsedMs / 1000).toFixed(2);
    const latency = parseFloat(elapsedSeconds);
    
    console.log('[LatencyTracker] ===== IMAGE LOADED =====');
    console.log('[LatencyTracker] Latency:', latency, 'seconds');
    console.log('[LatencyTracker] View:', data.view);
    console.log('[LatencyTracker] Calling callback...');

    if (onLatencyCalculated) {
      onLatencyCalculated(latency, data.view);
      console.log('[LatencyTracker] Callback called');
    } else {
      console.error('[LatencyTracker] No callback provided!');
    }
  };

  /**
   * Handle image load event
   */
  const handleImageLoad = (e) => {
    console.log('[LatencyTracker] onLoad EVENT FIRED');
    console.log('[LatencyTracker] Event:', e);
    calculateLatency();
  };

  /**
   * Handle image error
   */
  const handleImageError = () => {
    console.error('[LatencyTracker] Image error');
    resetTracking();
  };

  // Watch for image element and attach listeners
  useEffect(() => {
    if (!imageUrl) {
      return;
    }

    console.log('[LatencyTracker] ===== IMAGE URL SET =====');
    console.log('[LatencyTracker] URL:', imageUrl);
    console.log('[LatencyTracker] Tracking data:', trackingDataRef.current);

    if (!trackingDataRef.current) {
      console.error('[LatencyTracker] ERROR: No tracking data when image URL set!');
      return;
    }

    // Reset calculated flag for new image
    trackingDataRef.current.calculated = false;

    // Wait for DOM to update, then check image
    const checkAndAttach = () => {
      const img = imageRef.current;
      console.log('[LatencyTracker] Checking image element...');
      console.log('[LatencyTracker] Image ref:', img);
      
      if (!img) {
        console.error('[LatencyTracker] ERROR: Image ref is null!');
        return;
      }

      console.log('[LatencyTracker] Image found!');
      console.log('[LatencyTracker] - src:', img.src);
      console.log('[LatencyTracker] - complete:', img.complete);
      console.log('[LatencyTracker] - naturalHeight:', img.naturalHeight);
      console.log('[LatencyTracker] - naturalWidth:', img.naturalWidth);

      // Attach load listener directly
      const loadHandler = () => {
        console.log('[LatencyTracker] Direct load listener fired!');
        calculateLatency();
      };
      
      img.addEventListener('load', loadHandler, { once: true });
      console.log('[LatencyTracker] Load listener attached');

      // If already loaded, calculate immediately
      if (img.complete && img.naturalHeight !== 0) {
        console.log('[LatencyTracker] Image already loaded, calculating now');
        // Use setTimeout to ensure it happens after the listener is attached
        setTimeout(() => {
          if (!trackingDataRef.current?.calculated) {
            calculateLatency();
          }
        }, 0);
      } else {
        console.log('[LatencyTracker] Image not loaded yet, waiting for load event');
      }
    };

    // Check after React renders
    const timeoutId = setTimeout(checkAndAttach, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [imageUrl, onLatencyCalculated]);

  return {
    imageRef,
    handleImageLoad,
    handleImageError,
    startTracking,
    resetTracking
  };
}
