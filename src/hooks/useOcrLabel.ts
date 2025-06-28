// -----------------------------------------------------------------------------
// OCR Label Hook
// -----------------------------------------------------------------------------
// React hook for extracting numerical labels from images.
// Manages loading state during API calls.
// -----------------------------------------------------------------------------
import { useState, useCallback } from 'react';
import { openaiExtractLabel }   from '../lib/openaiClient';

export function useOcrLabel() {
    const [loading, setLoading] = useState(false);

    const recognise = useCallback(async (bmp: ImageBitmap) => {
        setLoading(true);
        try {
            return await openaiExtractLabel(bmp);   // 0…1 or null
        } finally {
            setLoading(false);
        }
    }, []);

    return { recognise, loading } as const;
}
