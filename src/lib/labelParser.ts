// -----------------------------------------------------------------------------
// Label Parser
// -----------------------------------------------------------------------------
// Maps raw OCR tokens to a one-decimal label in [0,1].
// -----------------------------------------------------------------------------
type Parsed = number | null;

const ALIAS: Record<string, string> = {
    I: '1', i: '1', l: '1', '|': '1', '!': '1',  // look-alike → 1
    O: '0', o: '0'
};

function norm(raw: string): string {
    return raw
        .replace(',', '.')
        .split('')
        .map(ch => ALIAS[ch] ?? ch)
        .join('')
        .trim();
}

/**
 * Parses a raw string token from OCR into a numeric label.
 * Handles common OCR errors and variations in number formatting.
 * @param raw The raw string from OCR.
 * @returns A number between 0 and 1, or null if unparseable.
 */
export function parseLabelToken(raw: string): Parsed {
    const tok = norm(raw);
    if (!tok) return null;

    if (/^0+(\.0+)?$/.test(tok)) return 0.0;           // 0 / 0.0
    if (tok.startsWith('1'))       return 1.0;         // 1 / 17 / 1.0
    if (/^0\.[0-9]$/.test(tok))    return +tok;        // 0.x  (one decimal)
    if (/^0[0-9]$/.test(tok))      return +tok[1] / 10;   // 04 → 0.4
    if (/^[2-9][0-9]*$/.test(tok)) return +tok[0] / 10;   // 7 / 47 → 0.7
    return null;
}
