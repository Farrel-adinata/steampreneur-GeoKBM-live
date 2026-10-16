"use strict";

(() => {
  const apiBase = String(window.GEOKBM_ENV?.API_BASE || "http://127.0.0.1:8000").replace(/\/$/, "");
  let csrfToken = sessionStorage.getItem("geokbm_csrf") || "";
  let cameraStream = null;

  async function api(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }
    let response;
    try {
      response = await fetch(`${apiBase}${path}`, {
        method,
        headers,
        credentials: "include",
        cache: "no-store",
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      throw new Error("Tidak dapat terhubung ke server. Periksa koneksi dan konfigurasi API.");
    }
    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(`Server memberi respons yang tidak valid (HTTP ${response.status}).`);
    }
    if (!response.ok) throw new Error(data.pesan || `Permintaan gagal (HTTP ${response.status}).`);
    if (data.csrf_token) setCsrf(data.csrf_token);
    return data;
  }

  function setCsrf(token) {
    csrfToken = token;
    sessionStorage.setItem("geokbm_csrf", token);
  }

  async function ensureCsrf() {
    if (!csrfToken) {
      const result = await api("/api/auth/csrf");
      if (!result.csrf_token) throw new Error("Token keamanan sesi tidak tersedia.");
    }
    return csrfToken;
  }

  async function currentActor() {
    const result = await api("/api/auth/me");
    if (result.csrf_token) setCsrf(result.csrf_token);
    return result.authenticated ? result.actor : null;
  }

  async function logout() {
    try {
      await ensureCsrf();
      await api("/api/auth/logout", { method: "POST", body: {} });
    } finally {
      csrfToken = "";
      sessionStorage.removeItem("geokbm_csrf");
      stopCamera();
    }
  }

  function showMessage(element, text, type = "error") {
    if (!element) return;
    element.textContent = text;
    element.className = `notice${type === "success" ? " success" : type === "info" ? " info" : ""}`;
    element.hidden = false;
  }

  function clearMessage(element) {
    if (!element) return;
    element.textContent = "";
    element.hidden = true;
  }

  async function startCamera(video) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Browser tidak mendukung kamera. Gunakan browser modern melalui HTTPS atau localhost.");
    }
    stopCamera();
    cameraStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    });
    video.srcObject = cameraStream;
    await video.play();
    return cameraStream;
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
  }

  async function loadFaceModels(modelPath = "./models") {
    if (typeof faceapi === "undefined") {
      throw new Error("Library pengenalan wajah belum dimuat. Periksa koneksi internet, lalu muat ulang halaman.");
    }
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
    ]);
  }

  async function faceDescriptor(video) {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.55 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection ? Array.from(detection.descriptor) : null;
  }

  function averageEmbeddings(vectors) {
    if (!vectors.length || vectors.some(vector => vector.length !== vectors[0].length)) {
      throw new Error("Sampel wajah tidak lengkap atau dimensinya berbeda.");
    }
    const result = new Array(vectors[0].length).fill(0);
    vectors.forEach(vector => vector.forEach((value, index) => { result[index] += value / vectors.length; }));
    const norm = Math.sqrt(result.reduce((sum, value) => sum + value * value, 0));
    if (!Number.isFinite(norm) || norm === 0) throw new Error("Embedding wajah tidak valid. Silakan ambil ulang sampel.");
    return result.map(value => value / norm);
  }

  function getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Browser tidak mendukung GPS."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        position => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
        error => {
          const messages = {
            1: "Izin lokasi ditolak. Izinkan akses lokasi untuk melanjutkan.",
            2: "Lokasi belum tersedia. Aktifkan GPS dan coba lagi.",
            3: "Permintaan GPS melewati batas waktu. Coba lagi.",
          };
          reject(new Error(messages[error.code] || "Gagal mendapatkan lokasi."));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  function formatDate(dateString, options = {}) {
    const [year, month, day] = dateString.split("-").map(Number);
    const formatOptions = options.weekday
      ? { weekday: options.weekday, day: "2-digit", month: "long", year: "numeric" }
      : { dateStyle: "medium", ...options };
    return new Intl.DateTimeFormat("id-ID", formatOptions)
      .format(new Date(year, month - 1, day));
  }

  function todayISO() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function safeCell(row, key, fallback = "—") {
    return row[key] == null || row[key] === "" ? fallback : String(row[key]);
  }

  window.GeoGuru = {
    api, ensureCsrf, currentActor, logout, showMessage, clearMessage,
    startCamera, stopCamera, loadFaceModels, faceDescriptor, averageEmbeddings,
    getLocation, formatDate, todayISO, safeCell,
  };
})();
