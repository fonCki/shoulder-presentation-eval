// -----------------------------------------------------------------------------
// Camera Input Component
// -----------------------------------------------------------------------------
// Provides real-time webcam feed with pose detection and visualization.
// Includes landmark smoothing for stable metrics.
// -----------------------------------------------------------------------------
import React, {useEffect, useRef} from 'react';

import {usePoseLandmarker} from '../hooks/usePoseLandmarker';
import {computeAllMetrics, HorizontalScoreDebug, horizontalScoreDetailed} from '../lib/postureMetrics';

interface Props {
  onScores: (s: Record<string, number> | null) => void;
  onDebug?: (d: HorizontalScoreDebug | null) => void;
}

export default function CameraInput({ onScores, onDebug }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Keep a rolling buffer of recent scores for smoothing.
  const bufferRef = useRef<Record<string, number[]>>({});
  const { ready, process } = usePoseLandmarker('VIDEO');

  // For landmark de-jittering (simple exponential moving average).
  const smoothedPoseRef = useRef<Record<number, any> | null>(null);
  const SMOOTH_ALPHA = 0.2; // 0 -> no smoothing, 1 -> fully smoothed (slow).

  // Ask for user media.
  useEffect(() => {
    let stream: MediaStream;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Could not access camera', err);
      }
    })();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Process frames at regular interval.
  useEffect(() => {
    if (!ready) return;

    let id: number;
    const BUFFER_SIZE = 30; // ~1 second at 30 FPS.

    const renderLoop = async () => {
      if (
        videoRef.current &&
        !videoRef.current.paused &&
        !videoRef.current.ended &&
        videoRef.current.readyState >= 2
      ) {
        const pose = await process(videoRef.current);
        if (pose) {
          /* ---------- Landmark Smoothing (EMA on x/y/z) ---------- */
          if (!smoothedPoseRef.current) {
            smoothedPoseRef.current = pose;
          } else {
            for (const idx in pose) {
              const p = pose[idx];
              const s = smoothedPoseRef.current[idx] ?? p;
              // exponential moving average
              s.x = SMOOTH_ALPHA * p.x + (1 - SMOOTH_ALPHA) * s.x;
              s.y = SMOOTH_ALPHA * p.y + (1 - SMOOTH_ALPHA) * s.y;
              s.z = SMOOTH_ALPHA * p.z + (1 - SMOOTH_ALPHA) * s.z;
              smoothedPoseRef.current[idx] = s;
            }
          }

          const smoothedPose = smoothedPoseRef.current;

          const raw = computeAllMetrics(smoothedPose as any);

          // Debug details (no smoothing for now)
          const hDebug = horizontalScoreDetailed(smoothedPose as any);

          onDebug?.(hDebug);

          /* ---------- Smooth Scores ---------- */
          if (!bufferRef.current) bufferRef.current = {};
          const buffer = bufferRef.current;
          for (const [k, v] of Object.entries(raw)) {
            buffer[k] = buffer[k] ?? [];
            buffer[k].push(v);
            if (buffer[k].length > BUFFER_SIZE) buffer[k].shift();
          }

          const avgScores: Record<string, number> = {};
          for (const [k, arr] of Object.entries(buffer)) {
            avgScores[k] = arr.reduce((a, b) => a + b, 0) / arr.length;
          }

          onScores(avgScores);

          // draw overlay
          if (canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current;
            // Keep canvas resolution in sync with displayed size.
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            const { width, height } = canvas;
            ctx.clearRect(0, 0, width, height);

            // landmarks indices
            const L_SHOULDER = 11;
            const R_SHOULDER = 12;
            const NOSE = 0;

            const ls = smoothedPose[L_SHOULDER];
            const rs = smoothedPose[R_SHOULDER];
            const nose = smoothedPose[NOSE];
            const leye = smoothedPose[2];
            const reye = smoothedPose[5];

            const drawPoint = (lm: any, color = 'red', radius = 6) => {
              ctx.fillStyle = color;
              ctx.strokeStyle = 'white';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(lm.x * width, lm.y * height, radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
            };

            if (ls && rs) {
              // line between shoulders
              ctx.strokeStyle = 'lime';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(ls.x * width, ls.y * height);
              ctx.lineTo(rs.x * width, rs.y * height);
              ctx.stroke();

              drawPoint(ls, 'yellow', 6);
              drawPoint(rs, 'yellow', 6);
            }

            const visible = (lm: any) => (lm?.visibility ?? 1) > 0.3;

            if (nose && visible(nose)) drawPoint(nose, 'cyan', 7);
            if (leye && visible(leye)) drawPoint(leye, 'magenta', 5);
            if (reye && visible(reye)) drawPoint(reye, 'magenta', 5);
          }
        }
      }
      id = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => cancelAnimationFrame(id);
  }, [ready, process, onScores]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 640 }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', borderRadius: 8 }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      {!ready && (
        <div style={overlayStyle}>Loading pose model…</div>
      )}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(2px)',
  color: 'white',
  fontWeight: 'bold',
};
