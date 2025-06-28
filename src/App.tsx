import React, { useState } from 'react';

import type { HorizontalScoreDebug } from './lib/postureMetrics';

import CameraInput from './components/CameraInput';
import ImageUpload from './components/ImageUpload';
import ScoreDisplay from './components/ScoreDisplay';

export default function App() {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [scores, setScores] = useState<Record<string, number> | null>(null);
  const [hDebug, setHDebug] = useState<HorizontalScoreDebug | null>(null);

  return (
    <div style={styles.container}>
      <h1>Shoulder Presentation Evaluation</h1>

      <div style={styles.modeSwitch}>
        <button onClick={() => setMode('camera')} disabled={mode === 'camera'}>
          Live Camera
        </button>
        <button onClick={() => setMode('upload')} disabled={mode === 'upload'}>
          Image Upload
        </button>
      </div>

      {mode === 'camera' ? (
        <>
          <CameraInput onScores={setScores} onDebug={setHDebug} />
          <ScoreDisplay scores={scores} debug={hDebug} />
        </>
      ) : (
        <ImageUpload />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: 'sans-serif',
    maxWidth: '100%',
    margin: '0 auto',
    padding: 16,
  },
  modeSwitch: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
};
