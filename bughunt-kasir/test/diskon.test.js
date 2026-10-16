/*
 * Test BUG #2 & #3: Aturan diskon (Spesifikasi §4).
 *
 * Spesifikasi resmi:
 *  - Member → diskon 10% dari subtotal.
 *  - Non-member dengan subtotal MINIMAL Rp100.000 → diskon 5% dari subtotal.
 *  - Diskon TIDAK BOLEH digabung, hanya satu yang berlaku.
 *  - Nilai diskon dibulatkan ke rupiah terdekat.
 *
 * Kode asli:
 *    if (subtotal > 100000) diskon += 5%;   // salah: ">" bukan ">="
 *    if (member)            diskon += 10%;  // salah: diskon digabung
 *
 * Semua test di bawah seharusnya GAGAL pada kode asli dan LULUS setelah
 * `hitungDiskon` memakai if/else-if eksklusif dan ambang ">=".
 */

const test = require("node:test");
const assert = require("node:assert");
const kasir = require("../kasir.js");

test("Bug #2: member dengan subtotal 150.000 hanya dapat 10%, bukan 15%", () => {
  // Benar: 10% x 150.000 = 15.000
  // Kode asli: 5% x 150.000 + 10% x 150.000 = 7.500 + 15.000 = 22.500
  assert.strictEqual(kasir.hitungDiskon(150000, true), 15000);
});

test("Bug #2: member dengan subtotal 50.000 tetap hanya 10%", () => {
  assert.strictEqual(kasir.hitungDiskon(50000, true), 5000);
});

test("Bug #3: non-member dengan subtotal TEPAT 100.000 harus dapat 5%", () => {
  // Benar: 5% x 100.000 = 5.000
  // Kode asli: "100000 > 100000" === false → diskon 0.
  assert.strictEqual(kasir.hitungDiskon(100000, false), 5000);
});

test("non-member dengan subtotal 99.999 tidak dapat diskon", () => {
  assert.strictEqual(kasir.hitungDiskon(99999, false), 0);
});

test("non-member dengan subtotal 100.001 dapat 5% (pembulatan rupiah terdekat)", () => {
  // 5% x 100.001 = 5000.05 → round = 5000
  assert.strictEqual(kasir.hitungDiskon(100001, false), 5000);
});

test("member dengan subtotal 100.001 tetap 10% (bukan 5% + 10%)", () => {
  // Benar: round(10.0001) = 10000
  // Kode asli: round(5000.05 + 10000.1) = round(15000.15) = 15000 → salah.
  assert.strictEqual(kasir.hitungDiskon(100001, true), 10000);
});

test("diskon dibulatkan ke rupiah terdekat: member subtotal 15.000 → 1.500", () => {
  assert.strictEqual(kasir.hitungDiskon(15000, true), 1500);
});

test("diskon dibulatkan ke rupiah terdekat: member subtotal 14.545 → 1455 (0,5 ke atas)", () => {
  // 10% x 14545 = 1454.5 → round ke rupiah terdekat (0,5 ke atas) = 1455
  assert.strictEqual(kasir.hitungDiskon(14545, true), 1455);
});
