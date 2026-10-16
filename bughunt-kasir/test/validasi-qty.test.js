/*
 * Test BUG #1: Validasi jumlah pesanan tidak ada (Spesifikasi §1 & §2).
 *
 * Spesifikasi:
 *  - qty harus bilangan bulat 1..99.
 *  - qty kosong / 0 / negatif / pecahan → ditolak dengan pesan kesalahan.
 *  - Total qty per produk (termasuk setelah dijumlahkan dengan item lama)
 *    tidak boleh lebih dari 99.
 *
 * Catatan: pada aplikasi nyata, `app.js` meneruskan `elQty.value` yang
 * berupa STRING ke `tambahItem`. Kode asli tidak memvalidasi tipe, sehingga
 * `itemLama.qty += qty` bisa melakukan string concatenation ("2" + "3" → "23").
 * Perbaikan: validasi di `tambahItem` + konversi ke Number di `app.js`.
 *
 * Semua test di bawah seharusnya GAGAL pada kode asli dan LULUS setelah
 * `tambahItem` memvalidasi qty.
 */

const test = require("node:test");
const assert = require("node:assert");
const kasir = require("../kasir.js");

test("qty = 0 harus ditolak", () => {
  const keranjang = [];
  assert.throws(() => kasir.tambahItem(keranjang, "K04", 0), /Jumlah|1 sampai 99|1-99/i);
});

test("qty negatif harus ditolak", () => {
  const keranjang = [];
  assert.throws(() => kasir.tambahItem(keranjang, "K04", -3), /Jumlah|1 sampai 99|1-99/i);
});

test("qty pecahan harus ditolak", () => {
  const keranjang = [];
  assert.throws(() => kasir.tambahItem(keranjang, "K04", 2.5), /Jumlah|bulat|1 sampai 99|1-99/i);
});

test("qty lebih dari 99 harus ditolak", () => {
  const keranjang = [];
  assert.throws(() => kasir.tambahItem(keranjang, "K04", 100), /Jumlah|1 sampai 99|1-99|99/i);
});

test("qty = Number(string kosong) === 0 harus ditolak", () => {
  const keranjang = [];
  // Inilah yang dikirim app.js saat input jumlah dikosongkan.
  assert.throws(() => kasir.tambahItem(keranjang, "K04", Number("")), /Jumlah|1 sampai 99|1-99/i);
});

test("qty bertipe string harus ditolak (mencegah string concatenation)", () => {
  const keranjang = [];
  // Kode asli menerima "3" apa adanya → bug.
  assert.throws(() => kasir.tambahItem(keranjang, "K04", "3"), /Jumlah|bilangan|bulat|1 sampai 99|1-99/i);
});

test("penjumlahan qty produk sama: Es Teh 2 + Es Teh 3 = Es Teh 5 (number)", () => {
  const keranjang = [];
  kasir.tambahItem(keranjang, "K04", 2);
  kasir.tambahItem(keranjang, "K04", 3);
  const item = keranjang.find((i) => i.kode === "K04");
  assert.strictEqual(item.qty, 5);
  assert.strictEqual(typeof item.qty, "number");
});

test("penjumlahan qty yang melampaui 99 harus ditolak", () => {
  const keranjang = [];
  kasir.tambahItem(keranjang, "K04", 60);
  assert.throws(() => kasir.tambahItem(keranjang, "K04", 50), /99|melebihi|tidak boleh/i);
});
