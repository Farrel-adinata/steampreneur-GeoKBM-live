"use strict";

const reportMessage = document.getElementById("reportMessage");
const reportList = document.getElementById("reportList");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");
let actor = null;

function mondayOf(dateString) {
  const day = new Date(`${dateString}T00:00:00`).getDay();
  return GeoSiswa.addDays(dateString, day === 0 ? -6 : 1 - day);
}

function setPeriod(period) {
  const today = GeoSiswa.todayISO();
  if (period === "today") {
    startDate.value = today;
    endDate.value = today;
  } else if (period === "week") {
    startDate.value = mondayOf(today);
    endDate.value = GeoSiswa.addDays(startDate.value, 6);
  } else if (period === "month") {
    startDate.value = `${today.slice(0, 7)}-01`;
    const [year, month] = today.split("-").map(Number);
    endDate.value = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;
  } else {
    startDate.value = GeoSiswa.addDays(today, -6);
    endDate.value = today;
  }
  document.querySelectorAll("[data-period]").forEach(button => {
    button.classList.toggle("active", button.dataset.period === period);
  });
}

function updateSummary(entries, total) {
  const present = entries
    .filter(entry => entry.status_guru === "Hadir")
    .reduce((sum, entry) => sum + Number(entry.total_entri || 0), 0);
  const absent = entries
    .filter(entry => entry.status_guru && entry.status_guru !== "Hadir")
    .reduce((sum, entry) => sum + Number(entry.total_entri || 0), 0);
  document.getElementById("totalCount").textContent = String(total);
  document.getElementById("reportPresentCount").textContent = String(present);
  document.getElementById("reportAbsentCount").textContent = String(absent);
  document.getElementById("attendancePercent").textContent =
    total ? `${Math.round((present / total) * 100)}%` : "—";
}

function renderReport(entries) {
  reportList.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Belum ada data jurnal pada periode ini.";
    reportList.append(empty);
    return;
  }

  const grouped = new Map();
  entries.forEach(entry => {
    if (!grouped.has(entry.tanggal)) grouped.set(entry.tanggal, []);
    grouped.get(entry.tanggal).push(entry);
  });
  for (const [date, dailyEntries] of grouped) {
    const section = document.createElement("section");
    section.className = "record";
    section.style.alignItems = "flex-start";
    const content = document.createElement("div");
    content.className = "record-content";
    const heading = document.createElement("strong");
    heading.textContent = GeoSiswa.formatDate(date, { weekday: true });
    content.append(heading);
    dailyEntries.forEach(entry => {
      const detail = document.createElement("small");
      detail.textContent = `${entry.status_guru}: ${entry.total_entri} jam`;
      content.append(detail);
    });
    section.append(content);
    reportList.append(section);
  }
}

async function loadReport(event) {
  if (event) event.preventDefault();
  GeoSiswa.clearMessage(reportMessage);
  const from = startDate.value;
  const to = endDate.value;
  if (!from || !to || from > to) {
    GeoSiswa.showMessage(reportMessage, "Pilih rentang tanggal yang valid.");
    return;
  }
  const submit = document.querySelector("#reportFilterForm button[type='submit']");
  submit.disabled = true;
  submit.textContent = "Memuat laporan…";
  reportList.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "empty-state";
  loading.textContent = "Memuat data laporan…";
  reportList.append(loading);
  try {
    const result = await GeoSiswa.api(
      `/api/siswa/laporan?tanggal_mulai=${encodeURIComponent(from)}&tanggal_akhir=${encodeURIComponent(to)}`,
    );
    const entries = Array.isArray(result.laporan) ? result.laporan : [];
    updateSummary(entries, Number(result.total_entri || 0));
    renderReport(entries);
    document.querySelectorAll("[data-period]").forEach(button => button.classList.remove("active"));
  } catch (error) {
    reportList.replaceChildren();
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = error.message;
    reportList.append(message);
    GeoSiswa.showMessage(reportMessage, error.message);
  } finally {
    submit.disabled = false;
    submit.textContent = "Tampilkan laporan";
  }
}

document.getElementById("reportFilterForm").addEventListener("submit", loadReport);
document.querySelectorAll("[data-period]").forEach(button => {
  button.addEventListener("click", () => {
    setPeriod(button.dataset.period);
    loadReport();
  });
});

async function initialize() {
  GeoSiswa.bindLogout();
  try {
    actor = await GeoSiswa.requireStudent();
    if (!actor) return;
    document.getElementById("reportGreeting").textContent = `Laporan ${actor.name || "Siswa"}`;
    document.getElementById("reportClass").textContent = `${actor.nama_kelas || "Kelas"} · Ketua kelas`;
    setPeriod("week");
    await loadReport();
  } catch (error) {
    GeoSiswa.showMessage(reportMessage, error.message);
  }
}

initialize();
