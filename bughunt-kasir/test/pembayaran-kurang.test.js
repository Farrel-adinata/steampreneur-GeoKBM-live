/*
 * Test BUG #5: Pembayaran kurang tidak ditolak (Spesifikasi §7).
 *
 * Spesifikasi: "jika uang yang dibayar kurang dari total, transaksi
 * ditolak dengan pesan 'Uang pembayaran kurang'".
 *
 * Kode asli `hitungKembalian(total, bayar)` langsung mengembalikan
 * `bayar - total` tanpa validasi → kembalian bisa negatif dan UI
 * menampilkan "Pembayaran berhasil".
 */

const test = require("node:test");
const assert = require("node:assert");
const kasir = require("../kasir.js");

test("Bug #5: bayar kurang dari total harus ditolak dengan pesan 'Uang pembayaran kurang'", () => {
  // Kode asli: return 5000 - 10000 = -5000 (tidak throw) → test ini gagal.
  assert.throws(
    () => kasir.hitungKembalian(10000, 5000),
    /Uang pembayaran kurang/
  );
});

test("Bug #5: bayar = 0 dengan total > 0 harus ditolak", () => {
  assert.throws(
    () => kasir.hitungKembalian(15000, 0),
    /Uang pembayaran kurang/
  );
});

test("bayar lebih dari total → kembalian positif", () => {
  assert.strictEqual(kasir.hitungKembalian(10000, 15000), 5000);
});

test("bayar pas dengan total → kembalian 0 (tidak ditolak)", () => {
  assert.strictEqual(kasir.hitungKembalian(10000, 10000), 0);
});

test("integrasi: total keranjang dan bayar kurang → ditolak", () => {
  const keranjang = [];
  kasir.tambahItem(keranjang, "K01", 2); // Nasi Goreng 2 x 15.000 = 30.000
  const r = kasir.hitungRingkasan(keranjang, false);
  // non-member subtotal 30.000 < 100.000 → tidak ada diskon.
  // PPN = round(30.000 * 11 / 100) = round(3.300) = 3.300.
  // Total = 30.000 - 0 + 3.300 = 33.300.
  assert.strictEqual(r.total, 33300);
  assert.throws(
    () => kasir.hitungKembalian(r.total, 30000),
    /Uang pembayaran kurang/
  );
});
