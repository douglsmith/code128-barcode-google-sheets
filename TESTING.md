# Test Case Reference

The test suite in [`Code128_Tests.gs`](Code128_Tests.gs) contains 23 test cases that exercise every code path in the encoder. Each expected output was derived by hand-tracing the encoding algorithm — walking through the code set selection, symbol generation, checksum calculation, and font glyph mapping step by step.

## How expected values are computed

For each test input, the trace follows these steps:

1. **Choose starting code set** — Code C if there are enough leading digits, Code A if the first character is a control character, otherwise Code B.
2. **Encode each character** — producing a sequence of Code 128 symbol values (0–106), including any SHIFT or code-set-switch symbols.
3. **Calculate the checksum** — `(start_value + symbol[1]*1 + symbol[2]*2 + ... + symbol[n]*n) mod 103`.
4. **Append checksum and stop** — checksum value, then stop symbol (106).
5. **Map to font characters** — values 0–94 become `String.fromCharCode(value + 32)`, values 95–106 become `String.fromCharCode(value + 100)`.

### Worked example: `"Hello"`

| Step | Position | Character | ASCII | Operation | Symbol value |
|------|----------|-----------|-------|-----------|--------------|
| Start | — | — | — | No leading digits, first char not control → Start B | 104 |
| 1 | 0 | `H` | 72 | valueB(72) = 72 − 32 | 40 |
| 2 | 1 | `e` | 101 | valueB(101) = 101 − 32 | 69 |
| 3 | 2 | `l` | 108 | valueB(108) = 108 − 32 | 76 |
| 4 | 3 | `l` | 108 | valueB(108) = 108 − 32 | 76 |
| 5 | 4 | `o` | 111 | valueB(111) = 111 − 32 | 79 |

**Checksum:** 104 + 40\*1 + 69\*2 + 76\*3 + 76\*4 + 79\*5 = 1209. 1209 mod 103 = **76**.

**Symbol sequence:** `[104, 40, 69, 76, 76, 79, 76, 106]`

**Font mapping:** 104→`\u00CC` (I-grave), 40→`H`, 69→`e`, 76→`l`, 76→`l`, 79→`o`, 76→`l`, 106→`\u00CE` (I-circumflex)

**Expected output:** `"\u00CCHellol\u00CE"` — the input text is visible in the encoded string, bookended by start/stop glyphs, with the checksum character `l` appended.

## Test cases

### Empty and missing input

| # | Input | Expected | What it tests |
|---|-------|----------|---------------|
| 1 | `""` | `""` | Empty string returns empty |
| 2 | `null` | `""` | Null returns empty |
| 3 | `undefined` | `""` | Undefined returns empty |

### Error cases

| # | Input | Expected error | What it tests |
|---|-------|----------------|---------------|
| 4 | 129 x `"A"` | `"exceeds the 128-character maximum"` | Length validation |
| 5 | `"Héllo"` | `"cannot be encoded in Code 128"` | Non-ASCII rejection |

### Code Set B (printable ASCII)

| # | Input | Symbols | Checksum | Expected output | What it tests |
|---|-------|---------|----------|-----------------|---------------|
| 6 | `"A"` | `[104, 33]` | 34 | `"\u00CCAB\u00CE"` | Single character |
| 7 | `"Hello"` | `[104, 40, 69, 76, 76, 79]` | 76 | `"\u00CCHellol\u00CE"` | Multiple characters |
| 8 | `"0"` | `[104, 16]` | 17 | `"\u00CC01\u00CE"` | Single digit stays in B |
| 9 | `"123"` | `[104, 17, 18, 19]` | 8 | `"\u00CC123(\u00CE"` | 3 digits not enough for C |
| 10 | `"A123B"` | `[104, 33, 17, 18, 19, 34]` | 59 | `"\u00CCA123B[\u00CE"` | 3 mid digits, no C switch |

### Code Set C (digit pairs)

| # | Input | Symbols | Checksum | Expected output | What it tests |
|---|-------|---------|----------|-----------------|---------------|
| 11 | `"00"` | `[105, 0]` | 2 | `"\u00CD \"\u00CE"` | 2 even digits, all-digit shortcut |
| 12 | `"1234"` | `[105, 12, 34]` | 82 | `"\u00CD,Br\u00CE"` | 4 even digits |
| 13 | `"123456"` | `[105, 12, 34, 56]` | 44 | `"\u00CD,BXL\u00CE"` | 6 even digits |
| 14 | `"12345"` | `[105, 12, 34, 100, 21]` | 54 | `"\u00CD,B\u00C85V\u00CE"` | 5 odd digits: C for 4, then B for last |

### Mixed set switching (B and C)

| # | Input | Symbols | Checksum | Expected output | What it tests |
|---|-------|---------|----------|-----------------|---------------|
| 15 | `"ABC123456"` | `[104, 33, 34, 35, 99, 12, 34, 56]` | 23 | `"\u00CCABC\u00C7,BX7\u00CE"` | B→C for 6 trailing digits |
| 16 | `"AB1234"` | `[104, 33, 34, 99, 12, 34]` | 102 | `"\u00CCAB\u00C7,B\u00CA\u00CE"` | B→C for 4 trailing digits |
| 17 | `"A12345"` | `[104, 33, 17, 99, 23, 45]` | 64 | `"\u00CCA1\u00C77M\x60\u00CE"` | B→C with odd trailing run (encode 1 in B first) |
| 18 | `"12345A"` | `[105, 12, 34, 100, 21, 33]` | 13 | `"\u00CD,B\u00C85A-\u00CE"` | Start C, switch to B for trailing alpha |

### Code Set A (control characters)

| # | Input | Symbols | Checksum | Expected output | What it tests |
|---|-------|---------|----------|-----------------|---------------|
| 19 | `"\t"` | `[103, 73]` | 73 | `"\u00CBii\u00CE"` | Single control char starts in A |
| 20 | `"A\x01B"` | `[104, 33, 98, 65, 34]` | 46 | `"\u00CCA\u00C6aBN\u00CE"` | SHIFT from B to A for one control char |
| 21 | `"\x01a\x02"` | `[103, 65, 98, 65, 66]` | 102 | `"\u00CBa\u00C6ab\u00CA\u00CE"` | SHIFT from A to B for one lowercase char |
| 22 | `"\x01ab"` | `[103, 65, 100, 65, 66]` | 3 | `"\u00CBa\u00C8ab#\u00CE"` | Full switch from A to B for multiple lowercase |

### Edge case

| # | Input | Expected | What it tests |
|---|-------|----------|---------------|
| 23 | 128 x `"A"` | Non-empty, starts with `\u00CC`, ends with `\u00CE` | Maximum length accepted |

## Symbol value quick reference

These special symbol values appear in the traces above:

| Symbol | Value | Font character |
|--------|-------|----------------|
| SHIFT | 98 | `\u00C6` (AE ligature) |
| Switch to C | 99 | `\u00C7` (C-cedilla) |
| Switch to B | 100 | `\u00C8` (E-grave) |
| Switch to A | 101 | `\u00C9` (E-acute) |
| Start Code A | 103 | `\u00CB` (E-diaeresis) |
| Start Code B | 104 | `\u00CC` (I-grave) |
| Start Code C | 105 | `\u00CD` (I-acute) |
| Stop | 106 | `\u00CE` (I-circumflex) |
