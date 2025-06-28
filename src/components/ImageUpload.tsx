// -----------------------------------------------------------------------------
// Image Upload Component
// -----------------------------------------------------------------------------
// Handles image selection, pose detection, and optional OCR label extraction.
// Displays results in a gallery format with visual metrics.
// -----------------------------------------------------------------------------

import React, { useRef, useState } from 'react';

import { usePoseLandmarker } from '../hooks/usePoseLandmarker';
import {
  computeAllMetrics,
  horizontalScoreDetailed,
} from '../lib/postureMetrics';
import type {
  PoseLandmarks,
  HorizontalScoreDebug,
} from '../lib/postureMetrics';

import { useOcrLabel } from '../hooks/useOcrLabel';
import ScoreDisplay from './ScoreDisplay';
import ExportButton from './ExportButton';

/* ---------- Local Types ---------- */

export interface Analysis {
  url: string;
  scores: Record<string, number>;
  debug: HorizontalScoreDebug | null;
  landmarks: PoseLandmarks;
  manual_score?: number | null;     // manual label (OCR)
  abs_error?: number | null;  // |manual − algo|
}

export default function ImageUpload() {
  const { ready, process } = usePoseLandmarker('IMAGE');
  const { recognise: ocr, loading: ocrBusy } = useOcrLabel();

  const [analyses, setAnalyses] = useState<Analysis[]>([]);

  /* ---------- Handle File Selection ---------- */
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!ready || files.length === 0) return;

    for (const file of files) {
      const url = URL.createObjectURL(file);

      /* ---- Load image element so we can pass to both OCR & pose ---- */
      const imgEl = await new Promise<HTMLImageElement>((res) => {
        const img = new Image();
        img.onload = () => res(img as HTMLImageElement);
        img.src = url;
      });

      /* ---- Run pose estimation ---- */
      const imgBitmap = await createImageBitmap(file);
      const pose = await process(imgBitmap);
      if (!pose) continue;

      const scores = computeAllMetrics(pose);
      const debug  = horizontalScoreDetailed(pose);

      /* ---- Run OCR (may return null) ---- */
      const manual_score = await ocr(imgBitmap);
      const abs_error =
          manual_score != null ? Math.abs(manual_score - scores.horizontalScore) : null;

      /* ---- Commit to state ---- */
        setAnalyses((prev) => [
        ...prev,
        { url, scores, debug, landmarks: pose, manual_score, abs_error },
      ]);
    }

    // allow re-selection of the same files
    e.target.value = '';
  };

  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <input type="file" accept="image/*" multiple onChange={handleChange} />
        {!ready && <p>Loading pose model…</p>}
        {ocrBusy && <p>Reading labels…</p>}

        <ExportButton analyses={analyses} />

        <div style={galleryStyle}>
          {analyses.map((a, idx) => (
              <ImageCard key={idx} analysis={a} />
          ))}
        </div>
      </div>
  );
}

function ImageCard({ analysis }: { analysis: Analysis }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ---------- Choose Card Tint from Delta ---------- */
  const getTint = (d?: number | null) => {
    if (d == null) return '#ffffff';           // no label → white
    if (d <= 0.10)  return '#e8fbe8';          // GREEN   (excellent)
    if (d <= 0.25)  return '#e6f1ff';          // BLUE    (acceptable)
    if (d <= 0.50)  return '#fff9d9';          // YELLOW  (noticeable)
    return '#ffecec';                          // RED     (large mismatch)
  };

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!canvasRef.current) return;
    canvasRef.current.width  = img.naturalWidth;
    canvasRef.current.height = img.naturalHeight;
    drawOverlay(canvasRef.current, analysis.landmarks);
  };

  return (
      <div style={{ ...cardStyle, background: getTint(analysis.abs_error) }}>
        <div style={{ position: 'relative', width: '100%', margin: '0 auto' }}>
          <img src={analysis.url} onLoad={onImgLoad} style={{ width: '100%' }}  alt={`Pose analysis for ${analysis.url}`} />
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
        </div>
        <ScoreDisplay
            scores={analysis.scores}
            debug={analysis.debug}
            manual_score={analysis.manual_score}
            delta={analysis.abs_error}
        />
      </div>
  );
}

/* ---------- Overlay Drawing Helper ---------- */

function drawOverlay(canvas: HTMLCanvasElement, pose: PoseLandmarks) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const L_SHOULDER = 11;
  const R_SHOULDER = 12;
  const NOSE       = 0;

  const ls   = pose[L_SHOULDER];
  const rs   = pose[R_SHOULDER];
  const nose = pose[NOSE];
  const le   = pose[2];
  const re   = pose[5];

  /* ---- Helpers ---- */
  const drawPoint = (lm: any, color = 'red', radius = 6) => {
    ctx.fillStyle   = color;
    ctx.strokeStyle = 'white';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };

  if (ls && rs) {
    ctx.strokeStyle = 'lime';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.moveTo(ls.x * width, ls.y * height);
    ctx.lineTo(rs.x * width, rs.y * height);
    ctx.stroke();

    drawPoint(ls, 'yellow');
    drawPoint(rs, 'yellow');
  }

  const visible = (lm: any) => (lm?.visibility ?? 1) > 0.3;

  if (nose && visible(nose)) drawPoint(nose, 'cyan', 7);
  if (le   && visible(le))   drawPoint(le,   'magenta', 5);
  if (re   && visible(re))   drawPoint(re,   'magenta', 5);
}

/* ---------- Styles ---------- */

const galleryStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '40px 32px',              // row 40, column 32
  alignItems: 'start',
};

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 260,
};
