"use strict";

const video = document.getElementById("attendanceVideo");
const cameraOverlay = document.getElementById("cameraOverlay");
const prepareButton = document.getElementById("prepareButton");
const attendanceButton = document.getElementById("attendanceButton");
const cancelButton = document.getElementById("cancelVerificationButton");
const dashboardMessage = document.getElementById("dashboardMessage");
const historyList = document.getElementById("historyList");
const verificationStatus = document.getElementById("verificationStatus");
const livenessStatus = document.getElementById("livenessStatus");

let actor = null;
let modelsReady = false;
let detector = null;
let verificationInProgress = false;

function setStatus(text, tone = "warn") {
  verificationStatus.textContent = text;
  verificationStatus.className = `status-pill ${tone}`;
}

function formatDateTime(value) {
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function makeHistoryRecord(row) {
  const record = document.createElement("article");
  record.className = "record";
  const content = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = row.status === "Hadir" ? "Presensi berhasil" : `Status: ${GeoGuru.safeCell(row, "status")}`;
  const detail = document.createElement("p");
  detail.textContent = `${formatDateTime(row.waktu_absen)} · ${GeoGuru.safeCell(row, "jarak_dari_sekolah_meter")} m dari sekolah`;
  content.append(title, detail);
  const tag = document.createElement("span");
  tag.className = `status-tag ${row.status === "Hadir" ? "success" : ""}`;
  tag.textContent = GeoGuru.safeCell(row, "status");
  record.append(content, tag);
  return record;
}

async function loadHistory() {
  historyList.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "empty-state";
  loading.textContent = "Memuat riwayat presensi…";
  historyList.append(loading);
  try {
    const result = await GeoGuru.api("/api/guru/riwayat?limit=20");
    const records = Array.isArray(result.riwayat) ? result.riwayat : [];
    document.getElementById("historySummary").textContent = `${records.filter(row => String(row.waktu_absen).startsWith(GeoGuru.todayISO())).length} hari ini`;
    historyList.replaceChildren();
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Belum ada catatan presensi.";
      historyList.append(empty);
      return;
    }
    records.forEach(row => historyList.append(makeHistoryRecord(row)));
  } catch (error) {
    document.getElementById("historySummary").textContent = "Tidak tersedia";
    historyList.replaceChildren();
    const errorText = document.createElement("p");
    errorText.className = "empty-state";
    errorText.textContent = error.message;
    historyList.append(errorText);
  }
}

async function prepareAttendance() {
  GeoGuru.clearMessage(dashboardMessage);
  prepareButton.disabled = true;
  document.getElementById("cameraSummary").textContent = "Memuat kamera & model…";
  cameraOverlay.textContent = "Meminta izin kamera…";
  cameraOverlay.hidden = false;
  try {
    await GeoGuru.startCamera(video);
    await GeoGuru.loadFaceModels("./models");
    detector = new LivenessDetector(video, {
      onStatus: text => { livenessStatus.textContent = text; },
    });
    modelsReady = true;
    cameraOverlay.hidden = true;
    document.getElementById("cameraSummary").textContent = "Siap";
    prepareButton.textContent = "Kamera siap";
    attendanceButton.disabled = false;
    setStatus("Siap diverifikasi", "ok");
    try {
      const position = await GeoGuru.getLocation();
      document.getElementById("gpsSummary").textContent = `GPS terhubung · ±${Math.round(position.accuracy)} m`;
    } catch (error) {
      document.getElementById("gpsSummary").textContent = "Perlu izin lokasi";
      GeoGuru.showMessage(dashboardMessage, error.message);
    }
  } catch (error) {
    GeoGuru.stopCamera();
    video.srcObject = null;
    document.getElementById("cameraSummary").textContent = "Tidak siap";
    cameraOverlay.hidden = false;
    cameraOverlay.textContent = "Kamera/model belum siap.";
    setStatus("Tidak siap", "error");
    GeoGuru.showMessage(dashboardMessage, error.message);
  } finally {
    prepareButton.disabled = false;
  }
}

async function verifyAndAttend() {
  if (!modelsReady || !detector || verificationInProgress) return;
  GeoGuru.clearMessage(dashboardMessage);
  verificationInProgress = true;
  attendanceButton.disabled = true;
  prepareButton.disabled = true;
  cancelButton.classList.remove("hidden");
  setStatus("Verifikasi berlangsung…");
  try {
    const isLive = await detector.verify({ timeoutMs: 15000 });
    if (!isLive) {
      setStatus("Coba verifikasi lagi", "warn");
      GeoGuru.showMessage(dashboardMessage, "Pemeriksaan gerakan wajah belum berhasil. Pastikan wajah terlihat jelas lalu coba lagi.", "info");
      return;
    }
    const embedding = await GeoGuru.faceDescriptor(video);
    if (!embedding) throw new Error("Wajah tidak terdeteksi saat mengambil embedding. Coba lagi dengan pencahayaan yang cukup.");
    const location = await GeoGuru.getLocation();
    document.getElementById("gpsSummary").textContent = `GPS terhubung · ±${Math.round(location.accuracy)} m`;
    const result = await GeoGuru.api("/api/guru/absen", {
      method: "POST",
      body: {
        latitude: location.latitude,
        longitude: location.longitude,
        embedding,
      },
    });
    setStatus("Presensi berhasil", "ok");
    GeoGuru.showMessage(
      dashboardMessage,
      `${result.pesan || "Presensi berhasil dicatat."} Jarak dari sekolah: ${result.detail_log?.jarak_ke_sekolah ?? "—"} m.`,
      "success",
    );
    await loadHistory();
  } catch (error) {
    setStatus("Presensi belum tercatat", "error");
    GeoGuru.showMessage(dashboardMessage, error.message);
  } finally {
    verificationInProgress = false;
    attendanceButton.disabled = !modelsReady;
    prepareButton.disabled = false;
    cancelButton.classList.add("hidden");
  }
}

async function logout() {
  const buttons = [document.getElementById("logoutButton"), document.getElementById("logoutNavButton")];
  buttons.forEach(button => { button.disabled = true; });
  try {
    await GeoGuru.logout();
  } catch (error) {
    GeoGuru.showMessage(dashboardMessage, error.message);
  } finally {
    window.location.replace("index.html");
  }
}

prepareButton.addEventListener("click", prepareAttendance);
attendanceButton.addEventListener("click", verifyAndAttend);
cancelButton.addEventListener("click", () => detector?.cancel());
document.getElementById("refreshHistoryButton").addEventListener("click", loadHistory);
document.getElementById("logoutButton").addEventListener("click", logout);
document.getElementById("logoutNavButton").addEventListener("click", logout);

async function initialize() {
  try {
    actor = await GeoGuru.currentActor();
    if (!actor || actor.role !== "guru") {
      window.location.replace("index.html");
      return;
    }
    document.getElementById("teacherGreeting").textContent = `Halo, ${actor.name || "Guru"}`;
    document.getElementById("todayLabel").textContent = GeoGuru.formatDate(GeoGuru.todayISO(), { weekday: "long" });
    await loadHistory();
  } catch (error) {
    GeoGuru.showMessage(dashboardMessage, error.message);
    document.getElementById("teacherGreeting").textContent = "Sesi belum dapat diperiksa";
  }
}

window.addEventListener("pagehide", () => {
  detector?.cancel();
  GeoGuru.stopCamera();
});
initialize();
