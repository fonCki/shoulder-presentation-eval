// -----------------------------------------------------------------------------
// Export Button Component
// -----------------------------------------------------------------------------
// Provides a button to export analysis data as CSV and Excel files.
// -----------------------------------------------------------------------------
import React from 'react';
import { exportAnalyses, ExportRow } from '../lib/exportData';
import type { Analysis } from './ImageUpload';

export default function ExportButton({ analyses }: { analyses: Analysis[] }) {
    const disabled = analyses.length === 0;

    const handleClick = () => {
        const rows: ExportRow[] = analyses.map((a) => ({
            file:         a.url.split('/').pop() ?? '',
            manual_score:           a.manual_score ?? '',
            horizontal_score:         a.scores.horizontalScore,
            shoulderTilt: a.scores.shoulderTiltScore,
            abs_error:        a.abs_error ?? '',
        }));
        exportAnalyses(rows);
    };

    return (
        <button
            disabled={disabled}
            onClick={handleClick}
            style={{ maxWidth: 180, alignSelf: 'center' }}
        >
            Export CSV / Excel
        </button>
    );
}
