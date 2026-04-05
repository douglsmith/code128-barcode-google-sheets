/**
 * Test suite for BARCODE128().
 *
 * Run from the Apps Script editor: select "runTests" and click Run.
 * Results appear in the Execution Log (View > Logs).
 */

/** Adds a menu item to run tests from the spreadsheet UI. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Barcode Tests")
    .addItem("Run All Tests", "runTests")
    .addToUi();
}

/** Runs all BARCODE128 test cases and logs a summary. */
function runTests() {
  let passed = 0;
  let failed = 0;

  function assertEquals(actual, expected, label) {
    if (actual === expected) {
      Logger.log("PASS: " + label);
      passed++;
    } else {
      Logger.log("FAIL: " + label +
        "\n  expected: " + JSON.stringify(expected) +
        "\n  actual:   " + JSON.stringify(actual));
      failed++;
    }
  }

  function assertThrows(fn, substring, label) {
    try {
      fn();
      Logger.log("FAIL: " + label + " (no error thrown)");
      failed++;
    } catch (e) {
      if (e.message.indexOf(substring) !== -1) {
        Logger.log("PASS: " + label);
        passed++;
      } else {
        Logger.log("FAIL: " + label +
          "\n  expected error containing: " + JSON.stringify(substring) +
          "\n  actual error: " + JSON.stringify(e.message));
        failed++;
      }
    }
  }

  // ── Empty / null / undefined ────────────────────────────────────────
  assertEquals(BARCODE128(""),        "", "empty string");
  assertEquals(BARCODE128(null),      "", "null");
  assertEquals(BARCODE128(undefined), "", "undefined");

  // ── Error cases ─────────────────────────────────────────────────────
  assertThrows(
    function() { BARCODE128(Array(130).join("A")); },
    "exceeds the 128-character maximum",
    "input too long (129 chars)"
  );
  assertThrows(
    function() { BARCODE128("H\u00e9llo"); },
    "cannot be encoded in Code 128",
    "non-ASCII character"
  );

  // ── Code B: printable ASCII ─────────────────────────────────────────
  assertEquals(BARCODE128("A"),     "\u00CCAB\u00CE",       "single char 'A'");
  assertEquals(BARCODE128("Hello"), "\u00CCHellol\u00CE",   "word 'Hello'");
  assertEquals(BARCODE128("0"),     "\u00CC01\u00CE",       "single digit '0'");
  assertEquals(BARCODE128("123"),   "\u00CC123(\u00CE",     "3 digits '123' stays in B");
  assertEquals(BARCODE128("A123B"), "\u00CCA123B[\u00CE",   "3 mid digits, no C switch");

  // ── Code C: digit pairs ─────────────────────────────────────────────
  assertEquals(BARCODE128("00"),     "\u00CD \"\u00CE",           "2 digits '00'");
  assertEquals(BARCODE128("1234"),   "\u00CD,Br\u00CE",          "4 digits '1234'");
  assertEquals(BARCODE128("123456"), "\u00CD,BXL\u00CE",         "6 digits '123456'");
  assertEquals(BARCODE128("12345"),  "\u00CD,B\u00C85V\u00CE",   "5 digits '12345' (odd)");

  // ── Mixed set switching (B↔C) ──────────────────────────────────────
  assertEquals(BARCODE128("ABC123456"), "\u00CCABC\u00C7,BX7\u00CE",     "B\u2192C trailing 6 digits");
  assertEquals(BARCODE128("AB1234"),    "\u00CCAB\u00C7,B\u00CA\u00CE",  "B\u2192C trailing 4 digits");
  assertEquals(BARCODE128("A12345"),    "\u00CCA1\u00C77M\x60\u00CE",    "B\u2192C trailing 5 odd digits");
  assertEquals(BARCODE128("12345A"),    "\u00CD,B\u00C85A-\u00CE",       "C start \u2192 B for alpha");

  // ── Code A: control characters ──────────────────────────────────────
  assertEquals(BARCODE128("\t"),          "\u00CBii\u00CE",             "single TAB (Code A)");
  assertEquals(BARCODE128("A\x01B"),     "\u00CCA\u00C6aBN\u00CE",    "B + SHIFT to A");
  assertEquals(BARCODE128("\x01a\x02"),  "\u00CBa\u00C6ab\u00CA\u00CE", "A + SHIFT to B");
  assertEquals(BARCODE128("\x01ab"),     "\u00CBa\u00C8ab#\u00CE",     "A \u2192 B full switch");

  // ── Edge case: exactly 128 characters ──────────────────────────────
  var result128 = BARCODE128(Array(129).join("A"));
  var ok128 = result128.length > 0 &&
    result128.charAt(0) === "\u00CC" &&
    result128.charAt(result128.length - 1) === "\u00CE";
  assertEquals(ok128, true, "128 chars accepted, correct start/stop");

  // ── Summary ─────────────────────────────────────────────────────────
  Logger.log("────────────────────────────────");
  Logger.log("Tests: " + (passed + failed) + "  Passed: " + passed + "  Failed: " + failed);
  if (failed === 0) {
    Logger.log("All tests passed.");
  }
}
