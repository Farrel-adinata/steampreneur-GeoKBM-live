/*
 * Test BUG #4: PPN dibulatkan ke bawah, bukan ke rupiah terdekat
 * (Spesifikasi §5: "PPN 11% ... dibulatkan ke rupiah terdekat, 0,5 ke atas
 * dibulatkan naik").
 *
 * Kode asli:  Math.floor((dasar * 11) / 100)
 * Seharusnya: Math.round((dasar * 11) / 100)
 *
 * Contoh perbedaan:
 *   dasar 14.550 → 14.550 * 11 / 100 = 1.600,5
 *     floor = 1.600 (SALAH)
 *     round = 1.601 (BENAR, 0,5 ke atas dibulatkan naik)
 */

const test = require("node:test");
const assert = require("node:assert");
const kasir = require("../kasir.js");

test("Bug #4: PPN atas dasar 14.550 harus 1.601 (0,5 ke atas dibulatkan naik)", () => {
  // 14550 * 11 / 100 = 1600.5
  // Kode asli: Math.floor(1600.5) = 1600 → salah.
  assert.strictEqual(kasir.hitungPPN(14550), 1601);
});

test("Bug #4: PPN atas dasar 13.645 harus 1.501 (0,95 dibulatkan ke terdekat)", () => {
  // 13645 * 11 / 100 = 1500.95
  // Kode asli: Math.floor(1500.95) = 1500 → salah.
  assert.strictEqual(kasir.hitungPPN(13645), 1501);
});

test("Bug #4: PPN atas dasar 5.000 harus 550", () => {
  // 5000 * 11 / 100 = 550 (tepat, floor/round sama) — regression test.
  assert.strictEqual(kasir.hitungPPN(5000), 550);
});

test("Bug #4: PPN atas dasar 1 harus 0 (0,11 dibulatkan turun ke 0)", () => {
  // 1 * 11 / 100 = 0.11 → round 0. (floor juga 0, tapi ini menjaga
  // agar round tidak membulatkan ke atas secara keliru.)
  assert.strictEqual(kasir.hitungPPN(1), 0);
});

test("Bug #4: PPN atas dasar 5 harus 1 (0,55 dibulatkan naik)", () => {
  // 5 * 11 / 100 = 0.55
  // Kode asli: Math.floor(0.55) = 0 → salah.
  assert.strictEqual(kasir.hitungPPN(5), 1);
});
