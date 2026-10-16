"use strict";

const dateInput = document.getElementById("journalDate");
const slotList = document.getElementById("slotList");
const editor = document.getElementById("journalEditor");
const journalForm = document.getElementById("journalForm");
const journalMessage = document.getElementById("journalMessage");
const saveButton = document.getElementById("saveJournalButton");
let selectedSlot = null;
let slots = [];

function drawSlot(slot, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "slot-button";
  button.setAttribute("aria-pressed", String(selectedSlot?.id_jadwal === slot.id_jadwal));

  const content = document.createElement("span");
  const title = document.createElement("strong");
  title.textContent = `Jam ke-${slot.jam_ke} · ${String(slot.jam_mulai).slice(0, 5)}–${String(slot.jam_selesai).slice(0, 5)}`;
  const detail = document.createElement("small");
  detail.textContent = `${slot.nama_mapel} · ${slot.nama_kelas}`;
  content.append(title, detail);

  const status = document.createElement("span");
  status.className = `status-tag ${slot.id_jurnal ? "success" : "pending"}`;
  status.textContent = slot.id_jurnal ? "Jurnal tersedia" : "Belum diisi";
  button.append(content, status);
  button.addEventListener("click", () => selectSlot(index));
  return button;
}

async function loadJournal() {
  selectedSlot = null;
  editor.classList.add("hidden");
  GeoGuru.clearMessage(journalMessage);
  slotList.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "empty-state";
  loading.textContent = "Memuat jadwal mengajar…";
  slotList.append(loading);
  const date = dateInput.value;
  if (!date) {
    loading.textContent = "Pilih tanggal untuk melihat jadwal.";
    return;
  }
  try {
    const result = await GeoGuru.api(`/api/guru/jurnal?tanggal=${encodeURIComponent(date)}`);
    slots = Array.isArray(result.jurnal) ? result.jurnal : [];
    document.getElementById("dateHeading").textContent = GeoGuru.formatDate(date, { weekday: "long" });
    slotList.replaceChildren();
    if (!slots.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Tidak ada jadwal mengajar pada tanggal ini.";
      slotList.append(empty);
      return;
    }
    slots.forEach((slot, index) => slotList.append(drawSlot(slot, index)));
  } catch (error) {
    const errorElement = document.createElement("p");
    errorElement.className = "empty-state";
    errorElement.textContent = error.message;
    slotList.replaceChildren(errorElement);
    GeoGuru.showMessage(journalMessage, error.message);
  }
}

function selectSlot(index) {
  selectedSlot = slots[index];
  document.querySelectorAll(".slot-button").forEach((button, buttonIndex) => {
    button.setAttribute("aria-pressed", String(buttonIndex === index));
  });
  document.getElementById("selectedSubject").textContent = selectedSlot.nama_mapel || "Mata pelajaran";
  document.getElementById("selectedSchedule").textContent =
    `${selectedSlot.nama_kelas} · Jam ke-${selectedSlot.jam_ke} · ${String(selectedSlot.jam_mulai).slice(0, 5)}–${String(selectedSlot.jam_selesai).slice(0, 5)}`;
  document.getElementById("materialInput").value = selectedSlot.materi || "";
  document.getElementById("teacherNoteInput").value = selectedSlot.catatan_guru || "";
  document.getElementById("studentNote").textContent = selectedSlot.catatan_siswa || "Belum ada catatan siswa.";
  editor.classList.remove("hidden");
  editor.scrollIntoView({ behavior: "smooth", block: "start" });
}

journalForm.addEventListener("submit", async event => {
  event.preventDefault();
  GeoGuru.clearMessage(journalMessage);
  if (!selectedSlot) {
    GeoGuru.showMessage(journalMessage, "Pilih jadwal terlebih dahulu.");
    return;
  }
  const body = {
    materi: document.getElementById("materialInput").value.trim(),
    catatan_guru: document.getElementById("teacherNoteInput").value.trim(),
  };
  body.id_jadwal = selectedSlot.id_jadwal;
  body.tanggal = dateInput.value;
  saveButton.disabled = true;
  saveButton.textContent = "Menyimpan…";
  try {
    await GeoGuru.api(
      `/api/guru/jurnal${selectedSlot.id_jurnal ? `?id_jurnal=${encodeURIComponent(selectedSlot.id_jurnal)}` : ""}`,
      { method: "PUT", body },
    );
    GeoGuru.showMessage(journalMessage, "Jurnal guru berhasil disimpan. Catatan siswa tetap tersimpan terpisah.", "success");
    await loadJournal();
  } catch (error) {
    GeoGuru.showMessage(journalMessage, error.message);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Simpan jurnal guru";
  }
});

dateInput.value = GeoGuru.todayISO();
dateInput.addEventListener("change", loadJournal);
document.getElementById("reloadButton").addEventListener("click", loadJournal);

async function logout() {
  try {
    await GeoGuru.logout();
  } finally {
    window.location.replace("index.html");
  }
}
document.getElementById("logoutButton").addEventListener("click", logout);
document.getElementById("logoutNavButton").addEventListener("click", logout);

GeoGuru.currentActor().then(actor => {
  if (!actor || actor.role !== "guru") {
    window.location.replace("index.html");
    return;
  }
  loadJournal();
}).catch(error => {
  GeoGuru.showMessage(journalMessage, error.message);
});
