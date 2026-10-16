"use strict";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

GeoSiswa.currentActor().then(actor => {
  if (actor?.role === "ketua_kelas") window.location.replace("home.html");
}).catch(() => {});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  GeoSiswa.clearMessage(loginMessage);
  const identity = document.getElementById("identity").value.trim();
  const password = document.getElementById("password").value;
  if (!identity || !password) {
    GeoSiswa.showMessage(loginMessage, "NIS, username/email, dan kata sandi wajib diisi.");
    return;
  }

  loginButton.disabled = true;
  loginButton.textContent = "Memeriksa akun…";
  try {
    const result = await GeoSiswa.api("/api/siswa/login", {
      method: "POST",
      body: { username: identity, password },
    });
    if (!result.data_siswa) {
      throw new Error("Akun ini tidak memiliki akses ketua kelas.");
    }
    window.location.replace("home.html");
  } catch (error) {
    GeoSiswa.showMessage(loginMessage, error.message);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Masuk ke Jurnal KBM";
  }
});
