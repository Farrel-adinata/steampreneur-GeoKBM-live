"use strict";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("formMessage");

GeoGuru.currentActor().then(actor => {
  if (actor?.role === "guru") window.location.replace("home.html");
}).catch(() => {});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  GeoGuru.clearMessage(loginMessage);
  const nip = document.getElementById("nip").value.trim();
  const password = document.getElementById("password").value;
  if (!nip || !password) {
    GeoGuru.showMessage(loginMessage, "NIP dan kata sandi wajib diisi.");
    return;
  }
  loginButton.disabled = true;
  loginButton.textContent = "Memeriksa akun…";
  try {
    await GeoGuru.ensureCsrf();
    await GeoGuru.api("/api/guru/login", {
      method: "POST",
      body: { nip, password_polos: password },
    });
    window.location.replace("home.html");
  } catch (error) {
    GeoGuru.showMessage(loginMessage, error.message);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Masuk ke portal guru";
  }
});
