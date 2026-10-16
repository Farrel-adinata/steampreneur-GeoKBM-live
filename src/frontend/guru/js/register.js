"use strict";

const identityForm = document.getElementById("identityForm");
const nipInput = document.getElementById("nip");
const checkNipButton = document.getElementById("checkNipButton");
const continueButton = document.getElementById("continueButton");
const registerMessage = document.getElementById("registerMessage");
const nipResult = document.getElementById("nipResult");
const cameraStep = document.getElementById("cameraStep");
const video = document.getElementById("registerVideo");
const cameraOverlay = document.getElementById("cameraOverlay");
const modelStatus = document.getElementById("modelStatus");
const scanProgress = document.getElementById("scanProgress");
const startCameraButton = document.getElementById("startCameraButton");
const captureButton = document.getElementById("captureButton");
const saveButton = document.getElementById("saveEnrollmentButton");

let nipIsRegistered = false;
let samples = [];
let modelsReady = false;

checkNipButton.addEventListener("click", checkNip);
nipInput.addEventListener("input", () => {
  nipIsRegistered = false;
  continueButton.disabled = true;
  nipResult.textContent = "Periksa kembali NIP yang diisi.";
  GeoGuru.clearMessage(registerMessage);
});

async function checkNip() {
  const nip = nipInput.value.trim();
  GeoGuru.clearMessage(registerMessage);
  if (!nip) {
    GeoGuru.showMessage(registerMessage, "Masukkan NIP terlebih dahulu.");
    return;
  }
  checkNipButton.disabled = true;
  checkNipButton.textContent = "Memeriksa…";
  try {
    const result = await GeoGuru.api(`/api/guru/cek-nip?nip=${encodeURIComponent(nip)}`);
    nipIsRegistered = result.ditemukan === true;
    continueButton.disabled = !nipIsRegistered;
    nipResult.textContent = nipIsRegistered
      ? "NIP terdaftar. Lanjutkan dengan token aktivasi dari admin."
      : "NIP belum ditemukan. Minta admin mendaftarkan data guru terlebih dahulu.";
    nipResult.className = `small ${nipIsRegistered ? "muted" : "muted"}`;
    if (!nipIsRegistered) GeoGuru.showMessage(registerMessage, "NIP tidak ditemukan atau akun belum aktif.");
  } catch (error) {
    nipIsRegistered = false;
    continueButton.disabled = true;
    nipResult.textContent = "Pengecekan NIP gagal.";
    GeoGuru.showMessage(registerMessage, error.message);
  } finally {
    checkNipButton.disabled = false;
    checkNipButton.textContent = "Cek";
  }
}

identityForm.addEventListener("submit", event => {
  event.preventDefault();
  GeoGuru.clearMessage(registerMessage);
  const nip = nipInput.value.trim();
  const token = document.getElementById("enrollmentToken").value.trim();
  const password = document.getElementById("password").value;
  const confirmation = document.getElementById("confirmPassword").value;
  if (!nipIsRegistered || !nip || !token || password.length < 10) {
    GeoGuru.showMessage(registerMessage, "Periksa NIP, token aktivasi, dan kata sandi minimal 10 karakter.");
    return;
  }
  if (password !== confirmation) {
    GeoGuru.showMessage(registerMessage, "Kata sandi dan konfirmasi tidak sama.");
    return;
  }
  cameraStep.classList.remove("hidden");
  cameraStep.scrollIntoView({ behavior: "smooth", block: "start" });
  startCameraButton.focus();
});

startCameraButton.addEventListener("click", async () => {
  GeoGuru.clearMessage(registerMessage);
  startCameraButton.disabled = true;
  modelStatus.textContent = "Memuat model wajah lokal…";
  try {
    await GeoGuru.startCamera(video);
    cameraOverlay.hidden = true;
    await GeoGuru.loadFaceModels("./models");
    modelsReady = true;
    modelStatus.textContent = "Kamera dan model wajah siap.";
    captureButton.disabled = false;
    captureButton.textContent = "Ambil sampel 1/5";
  } catch (error) {
    GeoGuru.stopCamera();
    video.srcObject = null;
    cameraOverlay.hidden = false;
    cameraOverlay.textContent = "Kamera/model tidak siap. Pastikan izin kamera aktif dan model lokal tersedia.";
    modelStatus.textContent = "Inisialisasi gagal.";
    GeoGuru.showMessage(registerMessage, error.message);
  } finally {
    startCameraButton.disabled = false;
    startCameraButton.textContent = "Aktifkan kamera lagi";
  }
});

captureButton.addEventListener("click", async () => {
  GeoGuru.clearMessage(registerMessage);
  if (!modelsReady || video.readyState < 2) {
    GeoGuru.showMessage(registerMessage, "Tunggu hingga kamera dan model siap.");
    return;
  }
  captureButton.disabled = true;
  captureButton.textContent = "Mendeteksi wajah…";
  try {
    const descriptor = await GeoGuru.faceDescriptor(video);
    if (!descriptor) throw new Error("Wajah belum terdeteksi. Posisikan wajah di tengah kamera dan coba lagi.");
    if (samples.length && descriptor.length !== samples[0].length) {
      throw new Error("Dimensi sampel tidak konsisten. Silakan mulai ulang pendaftaran.");
    }
    samples.push(descriptor);
    scanProgress.textContent = `Sampel ${samples.length} dari 5 berhasil diambil.`;
    if (samples.length === 5) {
      captureButton.textContent = "Lima sampel siap";
      saveButton.disabled = false;
    } else {
      captureButton.textContent = `Ambil sampel ${samples.length + 1}/5`;
      captureButton.disabled = false;
    }
  } catch (error) {
    GeoGuru.showMessage(registerMessage, error.message);
    captureButton.textContent = `Ulangi sampel ${samples.length + 1}/5`;
    captureButton.disabled = false;
  }
});

saveButton.addEventListener("click", async () => {
  GeoGuru.clearMessage(registerMessage);
  saveButton.disabled = true;
  saveButton.textContent = "Menyimpan aktivasi…";
  try {
    const embedding = GeoGuru.averageEmbeddings(samples);
    await GeoGuru.ensureCsrf();
    await GeoGuru.api("/api/guru/register", {
      method: "POST",
      body: {
        nip: nipInput.value.trim(),
        enrollment_token: document.getElementById("enrollmentToken").value.trim(),
        password_polos: document.getElementById("password").value,
        embedding,
      },
    });
    GeoGuru.showMessage(registerMessage, "Aktivasi berhasil. Silakan masuk menggunakan NIP dan kata sandi yang dibuat.", "success");
    saveButton.textContent = "Aktivasi berhasil";
    GeoGuru.stopCamera();
    video.srcObject = null;
    window.setTimeout(() => window.location.replace("index.html"), 1800);
  } catch (error) {
    GeoGuru.showMessage(registerMessage, error.message);
    saveButton.disabled = false;
    saveButton.textContent = "Coba simpan lagi";
  }
});

window.addEventListener("pagehide", GeoGuru.stopCamera);
