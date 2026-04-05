/**
 * Encodes text as a Code 128 barcode for use with the Libre Barcode 128 font.
 *
 * Set the cell's font to "Libre Barcode 128" (available via Google Fonts in the
 * font picker) and increase the font size to 36pt or larger for best results.
 *
 * @param {string} text  The text to encode (up to 128 ASCII characters).
 * @return {string}      The encoded barcode string.
 * @customfunction
 */
function BARCODE128(text) {
  // ── Handle empty / missing input ──────────────────────────────────────
  if (text === undefined || text === null || text === "") return "";
  text = String(text);

  const n = text.length;

  // ── Validate length ────────────────────────────────────────────────────
  if (n > 128) {
    throw new Error(
      "Input length " + n + " exceeds the 128-character maximum."
    );
  }

  // ── Validate: only ASCII 0-127 is encodable ──────────────────────────
  for (let i = 0; i < n; i++) {
    const code = text.charCodeAt(i);
    if (code > 127) {
      throw new Error(
        "Character '" + text.charAt(i) + "' (code " + code +
        ") at position " + i + " cannot be encoded in Code 128."
      );
    }
  }

  // ── Code 128 special-symbol values ────────────────────────────────────
  const SHIFT   = 98;
  const TO_C    = 99;   // Switch to Code Set C
  const TO_B    = 100;  // Switch to Code Set B (from A or C)
  const TO_A    = 101;  // Switch to Code Set A (from B or C)
  const START_A = 103;
  const START_B = 104;
  const START_C = 105;
  const STOP    = 106;

  // ── Helper: is character at pos a digit? ──────────────────────────────
  function isDigit(pos) {
    if (pos >= n) return false;
    const c = text.charCodeAt(pos);
    return c >= 48 && c <= 57;
  }

  // ── Helper: count consecutive digits starting at pos ──────────────────
  function countDigits(pos) {
    let count = 0;
    while (pos + count < n && isDigit(pos + count)) count++;
    return count;
  }

  // ── Helper: does char require Code A? (ASCII control chars 0-31) ──────
  function needsA(charCode) {
    return charCode < 32;
  }

  // ── Helper: does char require Code B? (lowercase + 96-127) ────────────
  function needsB(charCode) {
    return charCode >= 96 && charCode <= 127;
  }

  // ── Compute the Code 128 value for a character in Code Set A ──────────
  //    ASCII 0-31  → values 64-95
  //    ASCII 32-95 → values 0-63
  function valueA(charCode) {
    return charCode < 32 ? charCode + 64 : charCode - 32;
  }

  // ── Compute the Code 128 value for a character in Code Set B ──────────
  //    ASCII 32-127 → values 0-95
  function valueB(charCode) {
    return charCode - 32;
  }

  // ── Compute the Code 128 value for a digit pair in Code Set C ─────────
  //    Two-digit string "00"-"99" → values 0-99
  function valueC(pos) {
    return (text.charCodeAt(pos) - 48) * 10 + (text.charCodeAt(pos + 1) - 48);
  }

  // ── Convert a Code 128 value (0-106) to the Libre Barcode 128 glyph ──
  //    Values  0-94  → Unicode codepoint  (value + 32)    i.e. U+0020 – U+007E
  //    Values 95-106 → Unicode codepoint  (value + 100)   i.e. U+00C3 – U+00CE
  function valueToFontChar(val) {
    return String.fromCharCode(val < 95 ? val + 32 : val + 100);
  }

  // ════════════════════════════════════════════════════════════════════════
  //  ENCODING ALGORITHM  (greedy optimiser following GS1 / ISO 15417 rules)
  // ════════════════════════════════════════════════════════════════════════
  //
  //  When to use Code Set C (double-density digits):
  //    • At the start of data:  4+ leading digits  (or entire string is even-length digits)
  //    • At the end of data:    4+ trailing digits
  //    • In the middle of data: 6+ consecutive digits
  //
  //  If the digit run is odd-length, one digit is encoded in A/B first so
  //  the remaining even-length run can go into C.
  //
  //  Code Set A is chosen when control characters (ASCII 0-31) are needed.
  //  Code Set B is the default for printable ASCII including lowercase.
  //  SHIFT is used when a single character from the other A/B set appears.
  // ════════════════════════════════════════════════════════════════════════

  const symbols = [];   // Will hold Code 128 symbol values
  let currentSet;       // 'A', 'B', or 'C'
  let pos = 0;

  // ── Choose starting Code Set ──────────────────────────────────────────
  const leadDigits = countDigits(0);

  if (leadDigits >= 2 && leadDigits === n && n % 2 === 0) {
    // Entire input is an even number of digits → Code C is ideal
    currentSet = "C";
    symbols.push(START_C);
  } else if (leadDigits >= 4) {
    // 4+ leading digits → start in C
    currentSet = "C";
    symbols.push(START_C);
  } else if (n > 0 && needsA(text.charCodeAt(0))) {
    currentSet = "A";
    symbols.push(START_A);
  } else {
    currentSet = "B";
    symbols.push(START_B);
  }

  // ── Walk through the input ────────────────────────────────────────────
  while (pos < n) {

    // ─── Currently in Code Set C ────────────────────────────────────────
    if (currentSet === "C") {
      if (countDigits(pos) >= 2) {
        symbols.push(valueC(pos));
        pos += 2;
      } else {
        // Must leave C — pick A or B for the next character
        const cc = text.charCodeAt(pos);
        if (needsA(cc)) {
          symbols.push(TO_A);
          currentSet = "A";
        } else {
          symbols.push(TO_B);
          currentSet = "B";
        }
      }
      continue;
    }

    // ─── Currently in Code Set A or B ───────────────────────────────────
    const digits = countDigits(pos);
    let switchToC = false;

    if (digits >= 6) {
      // Middle run (or anywhere): 6+ consecutive digits → worth switching
      switchToC = true;
    } else if (digits >= 4 && pos + digits >= n) {
      // Trailing run: 4+ digits that reach the end
      switchToC = true;
    }

    if (switchToC) {
      // If odd digit count, encode one digit in current A/B first
      if (digits % 2 !== 0) {
        const cc = text.charCodeAt(pos);
        symbols.push(currentSet === "A" ? valueA(cc) : valueB(cc));
        pos++;
      }
      symbols.push(TO_C);
      currentSet = "C";
      continue;
    }

    // ── Encode a single character in Code A or B ────────────────────────
    const cc = text.charCodeAt(pos);

    if (currentSet === "A") {
      if (cc <= 95) {
        // Directly encodable in A
        symbols.push(valueA(cc));
        pos++;
      } else {
        // cc 96-127 → needs Code B
        // Check how many consecutive chars need B
        let run = 0;
        for (let k = pos; k < n; k++) {
          if (needsB(text.charCodeAt(k))) run++;
          else break;
        }
        if (run === 1) {
          // Single char: use SHIFT
          symbols.push(SHIFT);
          symbols.push(valueB(cc));
          pos++;
        } else {
          // Multiple chars: full switch to B
          symbols.push(TO_B);
          currentSet = "B";
        }
      }
    } else {
      // currentSet === "B"
      if (cc >= 32 && cc <= 127) {
        // Directly encodable in B
        symbols.push(valueB(cc));
        pos++;
      } else {
        // cc 0-31 → needs Code A
        let run = 0;
        for (let k = pos; k < n; k++) {
          if (needsA(text.charCodeAt(k))) run++;
          else break;
        }
        if (run === 1) {
          symbols.push(SHIFT);
          symbols.push(valueA(cc));
          pos++;
        } else {
          symbols.push(TO_A);
          currentSet = "A";
        }
      }
    }
  }

  // ── Calculate weighted checksum (mod 103) ─────────────────────────────
  //    checksum = startValue + Σ (symbol[i] × i)  for i = 1 … len-1
  let sum = symbols[0];
  for (let i = 1; i < symbols.length; i++) {
    sum += symbols[i] * i;
  }
  const checksumValue = sum % 103;

  symbols.push(checksumValue);
  symbols.push(STOP);

  // ── Map every symbol value to a Libre Barcode 128 font character ──────
  let result = "";
  for (let i = 0; i < symbols.length; i++) {
    result += valueToFontChar(symbols[i]);
  }

  return result;
}
