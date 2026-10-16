"use strict";

(() => {
  const apiBase = String(window.GEOKBM_ENV?.API_BASE || "http://127.0.0.1:8000").replace(/\/$/, "");
  let csrfToken = sessionStorage.getItem("geokbm_csrf") || "";

  function setCsrf(token) {
    csrfToken = token;
    sessionStorage.setItem("geokbm_csrf", token);
  }

  async function api(path, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      if (!csrfToken) await ensureCsrf();
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
      throw new Error(`Tidak dapat terhubung ke API di ${apiBase}. Periksa server dan konfigurasi API.`);
    }

    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error(`Server memberi respons yang tidak valid (HTTP ${response.status}).`);
    }
    if (!response.ok) {
      if (response.status === 419) {
        csrfToken = "";
        sessionStorage.removeItem("geokbm_csrf");
      }
      throw new Error(data.pesan || `Permintaan gagal (HTTP ${response.status}).`);
    }
    if (data.csrf_token) setCsrf(data.csrf_token);
    return data;
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

  async function requireStudent() {
    const actor = await currentActor();
    if (!actor || actor.role !== "ketua_kelas") {
      window.location.replace("index.html");
      return null;
    }
    return actor;
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST", body: {} });
    } finally {
      csrfToken = "";
      sessionStorage.removeItem("geokbm_csrf");
      window.location.replace("index.html");
    }
  }

  function showMessage(element, message, type = "error") {
    if (!element) return;
    element.textContent = message;
    element.className = `notice${type === "success" ? " success" : ""}`;
    element.hidden = false;
  }

  function clearMessage(element) {
    if (!element) return;
    element.textContent = "";
    element.hidden = true;
  }

  function todayISO() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function addDays(dateString, amount) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + amount);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatDate(dateString, options = {}) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: options.weekday ? "long" : undefined,
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  }

  function statusClass(status) {
    if (status === "Hadir") return "present";
    if (status === "Tidak Hadir" || status === "Sakit" || status === "Izin") return "absent";
    return "";
  }

  function bindLogout() {
    for (const button of document.querySelectorAll("#logoutButton, #logoutNavButton")) {
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await logout();
        } catch (error) {
          button.disabled = false;
          const message = document.getElementById("homeMessage")
            || document.getElementById("journalMessage")
            || document.getElementById("reportMessage");
          showMessage(message, error.message);
        }
      });
    }
  }

  window.GeoSiswa = {
    api, currentActor, requireStudent, logout, bindLogout,
    showMessage, clearMessage, todayISO, addDays, formatDate, statusClass,
  };
})();
