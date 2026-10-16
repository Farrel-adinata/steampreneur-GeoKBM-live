"use strict";

const historyList = document.getElementById("historyList");
const historyMessage = document.getElementById("historyMessage");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const downloadCsvButton = document.getElementById("downloadCsvButton");

let records = [];
let actor = null;

function formatDateTime(value) {
  const date = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function visibleRecords() {
  const query = searchInput.value.trim().toLocaleLowerCase("id-ID");
  const status = statusFilter.value;
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  return records.filter(record => {
    const recordDate = String(record.waktu_absen || "").slice(0, 10);
    if (status && record.status !== status) return false;
    if (startDate && recordDate < startDate) return false;
    if (endDate && recordDate > endDate) return false;
    if (!query) return true;

    const searchable = [
      record.waktu_absen,
      formatDateTime(record.waktu_absen),
      record.status,
      record.jarak_dari_sekolah_meter,
      record.skor_kemiripan_wajah,
    ].join(" ").toLocaleLowerCase("id-ID");
    return searchable.includes(query);
  });
}

function renderRecords() {
  const shown = visibleRecords();
  document.getElementById("visibleCount").textContent = `${shown.length} catatan`;
  downloadCsvButton.disabled = shown.length === 0;
  historyList.replaceChildren();

  if (!shown.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = records.length
      ? "Tidak ada riwayat yang cocok dengan pencarian atau filter."
      : "Belum ada catatan presensi.";
    historyList.append(empty);
    return;
  }

  for (const row of shown) {
    const item = document.createElement("article");
    item.className = "record";
    const content = document.createElement("div");
    content.className = "record-content";
    const title = document.createElement("h3");
    title.textContent = formatDateTime(row.waktu_absen);
    const detail = document.createElement("p");
    detail.textContent =
      `${GeoGuru.safeCell(row, "jarak_dari_sekolah_meter")} m dari sekolah · Skor wajah ${GeoGuru.safeCell(row, "skor_kemiripan_wajah")}`;
    content.append(title, detail);
    const status = document.createElement("span");
    status.className = `status-tag${row.status === "Hadir" ? " success" : ""}`;
    status.textContent = GeoGuru.safeCell(row, "status");
    item.append(content, status);
    historyList.append(item);
  }
}

function populateStatusFilter() {
  const selectedStatus = statusFilter.value;
  const statuses = [...new Set(records.map(record => String(record.status || "")).filter(Boolean))].sort();
  statusFilter.replaceChildren();
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "Semua status";
  statusFilter.append(allOption);
  statuses.forEach(status => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status;
    statusFilter.append(option);
  });
  statusFilter.value = statuses.includes(selectedStatus) ? selectedStatus : "";
}

function csvCell(value) {
  let text = value == null ? "" : String(value);
  const isNumber = /^-?(?:\d+\.?\d*|\.\d+)$/.test(text.trim());
  if (!isNumber && /^[\t\r ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv() {
  const shown = visibleRecords();
  if (!shown.length) return;

  const rows = [
    ["Waktu presensi", "Status", "Jarak dari sekolah (meter)", "Skor kemiripan wajah"],
    ...shown.map(row => [
      row.waktu_absen,
      row.status,
      row.jarak_dari_sekolah_meter,
      row.skor_kemiripan_wajah,
    ]),
  ];
  const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `riwayat-presensi-${GeoGuru.todayISO()}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function loadHistory() {
  const refreshButton = document.getElementById("refreshButton");
  refreshButton.disabled = true;
  historyList.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "empty-state";
  loading.textContent = "Memuat riwayat presensi…";
  historyList.append(loading);
  GeoGuru.clearMessage(historyMessage);

  try {
    const result = await GeoGuru.api("/api/guru/riwayat?limit=100");
    records = Array.isArray(result.riwayat) ? result.riwayat : [];
    populateStatusFilter();
    document.getElementById("recordCount").textContent =
      `${records.length} catatan${records.length === 100 ? " terbaru" : ""}`;
    renderRecords();
  } catch (error) {
    records = [];
    document.getElementById("recordCount").textContent = "Tidak tersedia";
    document.getElementById("visibleCount").textContent = "—";
    downloadCsvButton.disabled = true;
    historyList.replaceChildren();
    const errorText = document.createElement("p");
    errorText.className = "empty-state";
    errorText.textContent = error.message;
    historyList.append(errorText);
    GeoGuru.showMessage(historyMessage, error.message);
  } finally {
    refreshButton.disabled = false;
  }
}

async function initialize() {
  try {
    actor = await GeoGuru.currentActor();
    if (!actor || actor.role !== "guru") {
      window.location.replace("index.html");
      return;
    }
    document.getElementById("teacherGreeting").textContent = `Halo, ${actor.name || "Guru"}`;
    await loadHistory();
  } catch (error) {
    document.getElementById("recordCount").textContent = "Tidak tersedia";
    historyList.replaceChildren();
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = error.message;
    historyList.append(message);
  }
}

searchInput.addEventListener("input", renderRecords);
statusFilter.addEventListener("change", renderRecords);
startDateInput.addEventListener("change", renderRecords);
endDateInput.addEventListener("change", renderRecords);
document.getElementById("clearFiltersButton").addEventListener("click", () => {
  searchInput.value = "";
  statusFilter.value = "";
  startDateInput.value = "";
  endDateInput.value = "";
  renderRecords();
});
document.getElementById("refreshButton").addEventListener("click", loadHistory);
downloadCsvButton.addEventListener("click", downloadCsv);
for (const button of document.querySelectorAll("#logoutButton, #logoutNavButton")) {
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await GeoGuru.logout();
    } catch (error) {
      GeoGuru.showMessage(historyMessage, error.message);
      button.disabled = false;
    }
  });
}

initialize();
