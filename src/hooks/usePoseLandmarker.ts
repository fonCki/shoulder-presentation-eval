// -----------------------------------------------------------------------------
// React Hook for MediaPipe's PoseLandmarker
// -----------------------------------------------------------------------------
// Loads and initializes the MediaPipe pose detection model.
// Provides functionality to process images or video frames.
// -----------------------------------------------------------------------------
import { useEffect, useRef, useState, useCallback } from 'react';

import type { PoseLandmarks } from '../lib/postureMetrics';

type RunningMode = 'IMAGE' | 'VIDEO';

/**
 * React hook for MediaPipe's PoseLandmarker.
 *
 * Automatically loads the model from a CDN. `IMAGE` mode is for static
 * images, while `VIDEO` mode is for efficient real-time processing.
 *
 * @param mode The running mode for the landmarker.
 */
export function usePoseLandmarker(mode: RunningMode) {
  const landmarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Use the same version + CDN combination that the working CodePen uses.
      const version = '0.10.20';

      // Dynamically import the bundle. Using jsDelivr here keeps everything on
      // the same host as the WASM files we request below.
      const vision: any = await import(
        /* webpackIgnore: true */
        `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${version}`
      );

      // Resolve file paths (WASM + model) for PoseLandmarker.
      const fileset = await vision.FilesetResolver.forVisionTasks(
        `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${version}/wasm`
      );

      // Pick a lightweight model – enough for shoulder landmarks.
      const modelAssetPath =
        'https://storage.googleapis.com/mediapipe-models/pose_landmarker/' +
        'pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

      if (cancelled) return;

      landmarkerRef.current = await vision.PoseLandmarker.createFromOptions(
        fileset,
        {
          baseOptions: { modelAssetPath },
          runningMode: mode,
          numPoses: 1,
        },
      );

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      landmarkerRef.current?.close?.();
      landmarkerRef.current = null;
    };
  }, [mode]);

  /**
   * Process a single frame (video) or still image.
   * @returns A PoseLandmarks map or null if no person detected.
   */
  const process = useCallback(
    async (
      image: HTMLVideoElement | HTMLImageElement | ImageBitmap,
    ): Promise<PoseLandmarks | null> => {
      if (!ready || !landmarkerRef.current) return null;

      let result: any;
      if (mode === 'IMAGE') {
        // Still photographs.
        result = landmarkerRef.current.detect(image);
      } else {
        // Webcam – supply timestamp in ms.
        const now = performance.now();
        result = landmarkerRef.current.detectForVideo(image, now);
      }

      if (!result?.landmarks?.[0]) return null;

      const landmarkArray = result.landmarks[0];
      const map: PoseLandmarks = {} as PoseLandmarks;
      landmarkArray.forEach((lm: any, idx: number) => {
        map[idx] = lm;
      });

      return map;
    },
    [ready, mode],
  );

  return { ready, process } as const;
}
