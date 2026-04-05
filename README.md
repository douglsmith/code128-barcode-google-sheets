# Code 128 Encoder for Google Sheets

A Google Apps Script custom function that encodes text for use with the [Libre Barcode 128](https://fonts.google.com/specimen/Libre+Barcode+128) font, producing scannable Code 128 barcodes directly in Google Sheets.

Simply typing text in a barcode font won't produce a valid barcode — the data must first be encoded with a start symbol, a weighted checksum, and a stop symbol. This script handles all of that automatically.

## How It Works

The encoder converts your input text into a string of special characters that, when rendered in the Libre Barcode 128 font, produce a scannable barcode. It automatically optimizes for the shortest possible barcode by switching between Code 128's three character sets:

- **Code Set A** — uppercase letters, digits, control characters (ASCII 0–95)
- **Code Set B** — upper and lowercase letters, digits, punctuation (ASCII 32–127)
- **Code Set C** — double-density numeric encoding (digit pairs 00–99)

The encoder uses Code Set C whenever there are enough consecutive digits to make switching worthwhile (4+ at the start/end, 6+ in the middle), and uses SHIFT for isolated characters that need the other A/B set. It then computes the mandatory mod-103 weighted checksum and wraps everything with the proper start and stop symbols.

## Setup

1. Open your Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Delete any existing code in the editor.
4. Copy and paste the contents of [`Code128_Encoder.gs`](Code128_Encoder.gs) into the editor.
5. Click the **Save** icon (or press Ctrl+S / Cmd+S).
6. Close the Apps Script tab and return to your sheet.

## Usage

In any cell, enter the formula:

```
=BARCODE128(A1)
```

or with a literal string:

```
=BARCODE128("Hello World")
```

Then set the font of that cell to **Libre Barcode 128** (available in Google Sheets' font picker via Google Fonts) and increase the font size as needed (36pt or larger works well).

### Example

| Column A (Input) | Column B (Formula & Display) |
|---|---|
| `ABC123456DEF` | `=BARCODE128(A1)` |
| `9876543210` | `=BARCODE128(A2)` |
| `Hello` | `=BARCODE128(A3)` |

Set the font of the formula cells to **Libre Barcode 128** to display the barcode.

## Supported Input

- All printable ASCII characters (letters, digits, punctuation, spaces)
- ASCII control characters (tabs, newlines, etc. — ASCII 0–31)
- Any combination of the above
- Maximum input length: 128 characters

Characters outside the ASCII range (accented letters, emoji, etc.) will produce an error.

## Font Variants

The Libre Barcode 128 family on [Google Fonts](https://fonts.google.com/?query=Libre+Barcode+128) includes two variants:

- **Libre Barcode 128** — barcode bars only
- **Libre Barcode 128 Text** — barcode bars with human-readable text underneath

Both work with the encoded output from this script.

## How the Encoding Maps to the Font

The Libre Barcode 128 font places barcode glyphs at specific Unicode code points:

- Code 128 values 0–94 map to Unicode code points 32–126 (standard ASCII printable range)
- Code 128 values 95–106 (special symbols including start, stop, and checksum characters) map to Unicode code points 195–206 (Ã through Î)

## Running Tests

A self-contained test suite is included in [`Code128_Tests.gs`](Code128_Tests.gs). It verifies the encoder against hand-traced expected outputs covering all three code sets, set switching, SHIFT operations, checksum calculation, and error handling — useful for catching regressions if you modify the encoding logic. To run it:

1. Open the Apps Script editor (**Extensions → Apps Script**).
2. Add `Code128_Tests.gs` as a new file alongside `Code128_Encoder.gs`.
3. Select **`runTests`** from the function dropdown and click **Run**.
4. View results in the Execution Log (**View → Logs** or the **Executions** tab).

The test file also adds a **Barcode Tests → Run All Tests** menu to the spreadsheet, available after reloading the sheet.

See [`TESTING.md`](TESTING.md) for a full reference of all test cases, including the symbol sequences, checksums, and worked examples showing how each expected value was derived.

## References

- [Libre Barcode Project — Code 128 documentation](https://graphicore.github.io/librebarcode/documentation/code128.html)
- [Libre Barcode 128 on Google Fonts](https://fonts.google.com/specimen/Libre+Barcode+128)
- [Wikipedia — Code 128](https://en.wikipedia.org/wiki/Code_128)
- [Code 128 specification: ISO/IEC 15417:2007](https://www.iso.org/standard/43896.html)

## License

MIT
