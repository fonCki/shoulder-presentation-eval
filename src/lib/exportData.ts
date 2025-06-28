// -----------------------------------------------------------------------------
// Export Data
// -----------------------------------------------------------------------------
// Turns the analyses list into a CSV or XLSX file and triggers a download.
// -----------------------------------------------------------------------------
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

/** Shape of a single row for data export. */
export interface ExportRow {
    file:  string;
    manual_score?:   number | '';
    horizontal_score:  number;
    abs_error?: number | '';
    shoulderTilt: number;
}


/** Creates and downloads a CSV and XLSX file from analysis data. */
export function exportAnalyses(rows: ExportRow[]) {
    /* ---------- CSV ---------- */
    const csvLines = [
        'file,manual_score,horizontal_score,abs_error,shoulderTilt',
        ...rows.map(r => [
            r.file,
            r.manual_score ?? '',
            r.horizontal_score.toFixed(4),
            r.abs_error ?? '',
            r.shoulderTilt.toFixed(4),
        ].join(',')),
    ];
    const csvBlob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    saveAs(csvBlob, 'shoulder_eval.csv');

    /* ---------- XLSX ---------- */
    const ws = XLSX.utils.aoa_to_sheet(csvLines.map(l => l.split(',')));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Eval');
    XLSX.writeFile(wb, 'shoulder_eval.xlsx');
}
