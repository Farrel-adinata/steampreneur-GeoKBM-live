"use strict";

const journalMessage = document.getElementById("journalMessage");
const dateInput = document.getElementById("dateInput");
const dayLabel = document.getElementById("dayLabel");
const scheduleList = document.getElementById("scheduleList");
const journalFormPanel = document.getElementById("journalFormPanel");
const journalForm = document.getElementById("journalForm");
const saveJournalButton = document.getElementById("saveJournalButton");
let selectedSchedule = null;
let journalDate = "";
let schedules = [];

function setDayLabel(date) {
  const [year, month, day] = date.split("-").map(Number);
  dayLabel.textContent = new Intl.DateTimeFormat("id-ID", { weekday: "long" })
    .format(new Date(year, month - 1, day));
}

function renderSchedules(existingJournals, restoreId = null) {
  const existingBySchedule = new Map(
    existingJournals.map(entry => [String(entry.id_jadwal), entry]),
  );
  scheduleList.replaceChildren();
  selectedSchedule = null;
  journalFormPanel.classList.add("hidden");

  if (!schedules.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Tidak ada jadwal KBM untuk kelas ini pada tanggal tersebut.";
    scheduleList.append(empty);
    return;
  }

  for (const slot of schedules) {
    const existing = existingBySchedule.get(String(slot.id_jadwal)) || null;
    const button = document.createElement("button");
    button.className = "schedule-card";
    button.type = "button";
    button.dataset.scheduleId = String(slot.id_jadwal);
    button.setAttribute("aria-pressed", "false");
    const info = document.createElement("span");
    info.className = "schedule-info";
    const subject = document.createElement("strong");
    subject.textContent = `Jam ${slot.jam_ke} · ${slot.nama_mapel}`;
    const details = document.createElement("small");
    details.textContent = `${slot.jam_mulai}–${slot.jam_selesai} · ${slot.nama_guru}${slot.gelar_belakang ? `, ${slot.gelar_belakang}` : ""}`;
    info.append(subject, details);
    const badge = document.createElement("span");
    badge.className = `badge ${existing ? GeoSiswa.statusClass(existing.status_guru) : ""}`;
    badge.textContent = existing?.status_guru || "Belum diisi";
    button.append(info, badge);
    button.addEventListener("click", () => selectSchedule(slot, existing));
    scheduleList.append(button);
    if (restoreId !== null && String(slot.id_jadwal) === String(restoreId)) {
      selectSchedule(slot, existing);
    }
  }
}

function selectSchedule(slot, existing) {
  selectedSchedule = slot;
  scheduleList.querySelectorAll(".schedule-card").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.scheduleId === String(slot.id_jadwal)));
  });
  document.getElementById("selectedSubject").textContent = `${slot.kode_mapel} · ${slot.nama_mapel}`;
  document.getElementById("selectedTeacher").textContent =
    `${slot.nama_guru}${slot.gelar_belakang ? `, ${slot.gelar_belakang}` : ""}`;
  document.getElementById("selectedTime").textContent =
    `Jam ke-${slot.jam_ke} · ${slot.jam_mulai}–${slot.jam_selesai}`;
  document.getElementById("teacherStatus").value = existing?.status_guru || "";
  document.getElementById("studentNote").value = existing?.catatan_siswa || "";
  saveJournalButton.textContent = existing ? "Perbarui jurnal" : "Simpan jurnal";
  journalFormPanel.classList.remove("hidden");
}

async function loadJournal(date, restoreId = null) {
  journalDate = date;
  GeoSiswa.clearMessage(journalMessage);
  const loading = document.createElement("p");
  loading.className = "empty-state";
  loading.textContent = "Memuat jadwal kelas…";
  scheduleList.replaceChildren(loading);
  journalFormPanel.classList.add("hidden");
  try {
    const [scheduleResult, journalResult] = await Promise.all([
      GeoSiswa.api(`/api/siswa/jadwal?tanggal=${encodeURIComponent(date)}`),
      GeoSiswa.api(`/api/siswa/jurnal?tanggal=${encodeURIComponent(date)}`),
    ]);
    schedules = Array.isArray(scheduleResult.jadwal) ? scheduleResult.jadwal : [];
    const journals = Array.isArray(journalResult.jurnal) ? journalResult.jurnal : [];
    renderSchedules(journals, restoreId);
  } catch (error) {
    schedules = [];
    scheduleList.replaceChildren();
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = error.message;
    scheduleList.append(message);
    GeoSiswa.showMessage(journalMessage, error.message);
  }
}

dateInput.addEventListener("change", () => {
  if (!dateInput.value) return;
  setDayLabel(dateInput.value);
  loadJournal(dateInput.value);
});

journalForm.addEventListener("submit", async event => {
  event.preventDefault();
  GeoSiswa.clearMessage(journalMessage);
  const status = document.getElementById("teacherStatus").value;
  if (!selectedSchedule || !journalDate || !status) {
    GeoSiswa.showMessage(journalMessage, "Pilih jam pelajaran dan status kehadiran guru terlebih dahulu.");
    return;
  }

  saveJournalButton.disabled = true;
  saveJournalButton.textContent = "Menyimpan…";
  const selectedId = selectedSchedule.id_jadwal;
  try {
    const result = await GeoSiswa.api("/api/siswa/jurnal", {
      method: "POST",
      body: {
        tanggal: journalDate,
        id_jadwal: selectedId,
        status_guru: status,
        catatan_siswa: document.getElementById("studentNote").value,
      },
    });
    GeoSiswa.showMessage(journalMessage, result.pesan || "Jurnal berhasil disimpan.", "success");
    await loadJournal(journalDate, selectedId);
    GeoSiswa.showMessage(journalMessage, result.pesan || "Jurnal berhasil disimpan.", "success");
  } catch (error) {
    GeoSiswa.showMessage(journalMessage, error.message);
  } finally {
    saveJournalButton.disabled = false;
    saveJournalButton.textContent = selectedSchedule?.id_jadwal === selectedId ? "Perbarui jurnal" : "Simpan jurnal";
  }
});

async function initialize() {
  GeoSiswa.bindLogout();
  try {
    if (!await GeoSiswa.requireStudent()) return;
    dateInput.value = GeoSiswa.todayISO();
    setDayLabel(dateInput.value);
    await loadJournal(dateInput.value);
  } catch (error) {
    GeoSiswa.showMessage(journalMessage, error.message);
  }
}

initialize();
