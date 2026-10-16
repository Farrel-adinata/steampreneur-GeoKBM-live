"use strict";

const homeMessage = document.getElementById("homeMessage");
const todayJournal = document.getElementById("todayJournal");
let actor = null;

function renderTodayRecords(records) {
  todayJournal.replaceChildren();
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Belum ada jurnal yang diisi hari ini.";
    todayJournal.append(empty);
    return;
  }

  for (const row of records.slice(0, 6)) {
    const item = document.createElement("article");
    item.className = "record";
    const content = document.createElement("div");
    content.className = "record-content";
    const subject = document.createElement("strong");
    subject.textContent = `Jam ${row.jam_ke} · ${row.nama_mapel}`;
    const teacher = document.createElement("small");
    teacher.textContent = `${row.nama_guru}${row.gelar_belakang ? `, ${row.gelar_belakang}` : ""}`;
    content.append(subject, teacher);
    const badge = document.createElement("span");
    badge.className = `badge ${GeoSiswa.statusClass(row.status_guru)}`;
    badge.textContent = row.status_guru || "Belum diisi";
    item.append(content, badge);
    todayJournal.append(item);
  }
}

async function loadDashboard() {
  const today = GeoSiswa.todayISO();
  const [journalResult, weekResult] = await Promise.allSettled([
    GeoSiswa.api(`/api/siswa/jurnal?tanggal=${encodeURIComponent(today)}`),
    (() => {
      const weekday = new Date().getDay();
      const offsetFromMonday = weekday === 0 ? -6 : 1 - weekday;
      const start = GeoSiswa.addDays(today, offsetFromMonday);
      const end = GeoSiswa.addDays(start, 6);
      return GeoSiswa.api(`/api/siswa/laporan?tanggal_mulai=${start}&tanggal_akhir=${end}`);
    })(),
  ]);

  if (journalResult.status === "fulfilled") {
    const records = Array.isArray(journalResult.value.jurnal) ? journalResult.value.jurnal : [];
    document.getElementById("todayCount").textContent = `${records.length} entri`;
    document.getElementById("presentCount").textContent =
      `${records.filter(row => row.status_guru === "Hadir").length} jam`;
    document.getElementById("absentCount").textContent =
      `${records.filter(row => row.status_guru && row.status_guru !== "Hadir").length} jam`;
    renderTodayRecords(records);
  } else {
    document.getElementById("todayCount").textContent = "Tidak tersedia";
    todayJournal.replaceChildren();
    const error = document.createElement("p");
    error.className = "empty-state";
    error.textContent = journalResult.reason.message;
    todayJournal.append(error);
  }

  if (weekResult.status === "fulfilled") {
    document.getElementById("weekCount").textContent = `${weekResult.value.total_entri || 0} entri`;
  } else {
    document.getElementById("weekCount").textContent = "Tidak tersedia";
    GeoSiswa.showMessage(homeMessage, weekResult.reason.message);
  }
}

async function initialize() {
  GeoSiswa.bindLogout();
  try {
    actor = await GeoSiswa.requireStudent();
    if (!actor) return;
    document.getElementById("studentGreeting").textContent = `Hai, ${actor.name || "Siswa"}`;
    document.getElementById("classLabel").textContent = `${actor.nama_kelas || "Kelas"} · Ketua kelas`;
    document.getElementById("todayHeading").textContent = GeoSiswa.formatDate(GeoSiswa.todayISO(), { weekday: true });
    await loadDashboard();
  } catch (error) {
    GeoSiswa.showMessage(homeMessage, error.message);
    document.getElementById("studentGreeting").textContent = "Beranda belum dapat dimuat";
  }
}

initialize();
