"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const frontendRoot = path.join(projectRoot, "src", "frontend");
const onboardingRoot = frontendRoot;
const guruRoot = path.join(projectRoot, "src", "frontend", "guru");
const siswaRoot = path.join(projectRoot, "src", "frontend", "siswa");
const javascriptRoot = path.join(guruRoot, "js");
const studentJavascriptRoot = path.join(siswaRoot, "js");
const pageScripts = {
  "index.html": "login.js",
  "register.html": "register.js",
  "home.html": "home.js",
  "jurnal.html": "jurnal.js",
  "riwayat.html": "riwayat.js",
};

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function loadGeoGuru(options = {}) {
  const sessionValues = new Map();
  if (options.csrfToken) sessionValues.set("geokbm_csrf", options.csrfToken);
  const sessionStorage = {
    getItem(key) {
      return sessionValues.get(key) ?? null;
    },
    setItem(key, value) {
      sessionValues.set(key, String(value));
    },
    removeItem(key) {
      sessionValues.delete(key);
    },
  };
  const context = {
    Headers,
    URL,
    Intl,
    Date,
    Math,
    Number,
    String,
    Promise,
    Array,
    Error,
    JSON,
    sessionStorage,
    navigator: options.navigator || {},
    fetch: options.fetch || (async () => {
      throw new Error("Unexpected fetch call in frontend test.");
    }),
    window: { GEOKBM_ENV: { API_BASE: "https://example.test/api-root/" } },
  };

  vm.runInNewContext(readFile(path.join(javascriptRoot, "shared.js")), context, {
    filename: "shared.js",
  });
  return { geoGuru: context.window.GeoGuru, sessionValues };
}

test("guru pages and their local assets exist", () => {
  for (const [pageName, scriptName] of Object.entries(pageScripts)) {
    const pagePath = path.join(guruRoot, pageName);
    const html = readFile(pagePath);

    assert.match(html, /<html lang="id">/, `${pageName} declares Indonesian language`);
    assert.match(html, new RegExp(`src="js/${scriptName}"`), `${pageName} loads ${scriptName}`);
    assert.ok(fs.existsSync(path.join(javascriptRoot, scriptName)), `${scriptName} exists`);

    for (const [, reference] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:|tel:|#)/.test(reference)) continue;
      const localPath = reference.split(/[?#]/, 1)[0];
      assert.ok(
        fs.existsSync(path.resolve(path.dirname(pagePath), localPath)),
        `${pageName} local reference exists: ${reference}`,
      );
    }
  }
});

test("onboarding page links to both portals and its local script/style", () => {
  const html = readFile(path.join(onboardingRoot, "index.html"));
  assert.match(html, /href="guru\/index\.html"[^>]*data-portal="guru"/);
  assert.match(html, /href="siswa\/index\.html"[^>]*data-portal="siswa"/);
  assert.ok(fs.existsSync(path.join(frontendRoot, "js", "onboarding.js")));
  assert.ok(fs.existsSync(path.join(frontendRoot, "css", "onboarding.css")));
  for (const [, reference] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|tel:|#)/.test(reference)) continue;
    assert.ok(fs.existsSync(path.resolve(frontendRoot, reference)), `onboarding asset exists: ${reference}`);
  }
});

test("teacher attendance history supports search, filters, and current-view CSV", () => {
  const html = readFile(path.join(guruRoot, "riwayat.html"));
  const script = readFile(path.join(javascriptRoot, "riwayat.js"));
  const requiredControls = [
    "searchInput",
    "statusFilter",
    "startDate",
    "endDate",
    "clearFiltersButton",
    "downloadCsvButton",
    "historyList",
  ];
  for (const id of requiredControls) {
    assert.match(html, new RegExp(`id="${id}"`), `history page includes #${id}`);
  }
  assert.match(script, /\/api\/guru\/riwayat\?limit=100/);
  assert.match(script, /const shown = visibleRecords\(\)/, "CSV exports the filtered visible records");
  assert.match(script, /text\.replace\(\/"\/g, '""'\)/, "CSV escapes embedded quotes");
  assert.match(script, /populateStatusFilter\(\)/, "status filters are based on loaded records");
  assert.match(script, /createObjectURL\(blob\)/, "CSV is downloaded in the browser");
  assert.match(html, /CSV berisi baris yang sedang ditampilkan/);
  assert.match(readFile(path.join(guruRoot, "home.html")), /href="riwayat\.html"/);
});

test("teacher history filters records and exports only the visible rows", async () => {
  const html = readFile(path.join(guruRoot, "riwayat.html"));
  const elements = new Map();
  const makeElement = id => ({
    id,
    value: "",
    textContent: "",
    className: "",
    disabled: false,
    children: [],
    listeners: new Map(),
    addEventListener(eventName, handler) {
      this.listeners.set(eventName, handler);
    },
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute() {},
    click() {
      this.clicked = true;
    },
    remove() {},
  });
  const pageIds = Array.from(html.matchAll(/\bid="([^"]+)"/g), match => match[1]);
  pageIds.forEach(id => elements.set(id, makeElement(id)));
  const created = [];
  let downloadedBlob;
  const context = {
    document: {
      getElementById: id => elements.get(id),
      querySelectorAll: () => [],
      createElement: tagName => {
        const element = makeElement(tagName);
        created.push(element);
        return element;
      },
      body: { append() {} },
    },
    window: { location: { replace() {} } },
    URL: {
      createObjectURL: blob => {
        downloadedBlob = blob;
        return "blob:test";
      },
      revokeObjectURL() {},
    },
    Blob,
    Intl,
    Date,
    String,
    Set,
    Array,
    Error,
    Promise,
    GeoGuru: {
      currentActor: async () => ({ role: "guru", name: "Guru Uji" }),
      api: async () => ({
        riwayat: [
          { waktu_absen: "2026-10-16 07:00:00", status: "Hadir", jarak_dari_sekolah_meter: 12, skor_kemiripan_wajah: 0.91 },
          { waktu_absen: "2026-10-15 07:05:00", status: "Terlambat", jarak_dari_sekolah_meter: 18, skor_kemiripan_wajah: 0.88 },
        ],
      }),
      safeCell: (row, key) => row[key] == null ? "—" : String(row[key]),
      todayISO: () => "2026-10-16",
      clearMessage() {},
      showMessage() {},
      logout: async () => {},
    },
  };
  vm.runInNewContext(readFile(path.join(javascriptRoot, "riwayat.js")), context, {
    filename: "riwayat.js",
  });
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.equal(elements.get("recordCount").textContent, "2 catatan");
  assert.equal(elements.get("historyList").children.length, 2);
  assert.deepEqual(
    elements.get("statusFilter").children.map(option => option.value),
    ["", "Hadir", "Terlambat"],
  );

  elements.get("statusFilter").value = "Hadir";
  elements.get("statusFilter").listeners.get("change")();
  assert.equal(elements.get("visibleCount").textContent, "1 catatan");
  assert.equal(elements.get("historyList").children.length, 1);

  elements.get("downloadCsvButton").listeners.get("click")();
  const csv = await downloadedBlob.text();
  assert.match(csv, /Waktu presensi/);
  assert.match(csv, /2026-10-16 07:00:00/);
  assert.doesNotMatch(csv, /2026-10-15 07:05:00/);
});

test("onboarding JavaScript supports browsing slides and persists completed intro", () => {
  const listeners = new Map();
  const slidesTrack = { style: {} };
  const makeControl = dataset => ({
    dataset,
    classList: { toggle() {} },
    addEventListener: (name, handler) => listeners.set(`${dataset.slide ?? "control"}:${name}`, handler),
    setAttribute() {},
    removeAttribute() {},
  });
  const dotControls = [0, 1, 2].map(slide => makeControl({ slide: String(slide) }));
  const controls = new Map([
    ["slidesTrack", slidesTrack],
    ["onboarding", { clientWidth: 400, addEventListener: (name, handler) => listeners.set(`onboarding:${name}`, handler) }],
    ["nextButton", { hidden: false, addEventListener: (name, handler) => listeners.set(`next:${name}`, handler) }],
    ["skipButton", { hidden: false, addEventListener: (name, handler) => listeners.set(`skip:${name}`, handler) }],
  ]);
  const stored = new Map();
  const context = {
    document: {
      getElementById: id => controls.get(id),
      querySelectorAll: () => dotControls,
    },
    localStorage: {
      getItem: key => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
    },
    Number,
    Math,
  };
  vm.runInNewContext(readFile(path.join(frontendRoot, "js", "onboarding.js")), context);

  assert.equal(slidesTrack.style.transform, "translateX(0%)");
  listeners.get("next:click")();
  assert.equal(slidesTrack.style.transform, "translateX(-100%)");
  listeners.get("skip:click")();
  assert.equal(slidesTrack.style.transform, "translateX(-200%)");
  assert.equal(stored.get("geokbm_onboarding_done"), "1");
});

test("student pages and their local assets exist", () => {
  const studentPageScripts = {
    "index.html": "login.js",
    "home.html": "home.js",
    "jurnal.html": "jurnal.js",
    "laporan.html": "laporan.js",
  };
  for (const [pageName, scriptName] of Object.entries(studentPageScripts)) {
    const pagePath = path.join(siswaRoot, pageName);
    const html = readFile(pagePath);
    assert.match(html, /<html lang="id">/, `${pageName} declares Indonesian language`);
    assert.match(html, new RegExp(`src="js/${scriptName}"`), `${pageName} loads ${scriptName}`);
    assert.ok(fs.existsSync(path.join(studentJavascriptRoot, scriptName)), `${scriptName} exists`);
    assert.ok(fs.existsSync(path.join(siswaRoot, "css", "siswa.css")), "student stylesheet exists");

    for (const [, reference] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (/^(?:https?:|mailto:|tel:|#)/.test(reference)) continue;
      const localPath = reference.split(/[?#]/, 1)[0];
      assert.ok(
        fs.existsSync(path.resolve(path.dirname(pagePath), localPath)),
        `${pageName} local reference exists: ${reference}`,
      );
    }
  }
});

test("page scripts only query elements present in their page", () => {
  for (const [pageName, scriptName] of Object.entries(pageScripts)) {
    const html = readFile(path.join(guruRoot, pageName));
    const script = readFile(path.join(javascriptRoot, scriptName));
    const ids = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), match => match[1]));
    const queriedIds = Array.from(
      script.matchAll(/getElementById\("([^"]+)"\)/g),
      match => match[1],
    );

    for (const id of queriedIds) {
      assert.ok(ids.has(id), `${scriptName} refers to missing #${id} in ${pageName}`);
    }
  }
});

test("student page scripts only query elements present in their page", () => {
  const studentPageScripts = {
    "index.html": "login.js",
    "home.html": "home.js",
    "jurnal.html": "jurnal.js",
    "laporan.html": "laporan.js",
  };
  for (const [pageName, scriptName] of Object.entries(studentPageScripts)) {
    const html = readFile(path.join(siswaRoot, pageName));
    const script = readFile(path.join(studentJavascriptRoot, scriptName));
    const ids = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), match => match[1]));
    for (const [, id] of script.matchAll(/getElementById\("([^"]+)"\)/g)) {
      assert.ok(ids.has(id), `${scriptName} refers to missing #${id} in ${pageName}`);
    }
  }
});

test("API configuration uses the local backend or deployed page origin", () => {
  const configScript = readFile(path.join(javascriptRoot, "config.js"));
  const configure = location => {
    const context = { window: { location } };
    vm.runInNewContext(configScript, context, { filename: "config.js" });
    return context.window.GEOKBM_ENV.API_BASE;
  };

  assert.equal(
    configure({ hostname: "localhost", protocol: "http:", origin: "http://localhost:5500" }),
    "http://localhost:8000",
  );
  assert.equal(
    configure({ hostname: "geokbm.example", protocol: "https:", origin: "https://geokbm.example" }),
    "https://geokbm.example",
  );
});

test("student API uses the backend session and CSRF token", async () => {
  const sessionValues = new Map();
  const requests = [];
  const context = {
    Headers,
    Promise,
    String,
    JSON,
    sessionStorage: {
      getItem: key => sessionValues.get(key) ?? null,
      setItem: (key, value) => sessionValues.set(key, String(value)),
      removeItem: key => sessionValues.delete(key),
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      const payload = url.endsWith("/api/auth/csrf")
        ? { csrf_token: "student-test-token" }
        : { data_siswa: { id_siswa: 1 } };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(payload),
      };
    },
    window: { GEOKBM_ENV: { API_BASE: "https://students.example.test" } },
  };
  vm.runInNewContext(readFile(path.join(studentJavascriptRoot, "shared.js")), context, {
    filename: "student-shared.js",
  });

  const result = await context.window.GeoSiswa.api("/api/siswa/login", {
    method: "POST",
    body: { username: "student-nis", password: "test-password" },
  });

  assert.deepEqual(result.data_siswa, { id_siswa: 1 });
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, "https://students.example.test/api/auth/csrf");
  assert.equal(requests[1].url, "https://students.example.test/api/siswa/login");
  assert.equal(requests[1].options.credentials, "include");
  assert.equal(requests[1].options.headers.get("X-CSRF-Token"), "student-test-token");
});

test("registration displays and clears the checked teacher name", async () => {
  const html = readFile(path.join(guruRoot, "register.html"));
  assert.match(html, /id="teacherName"[^>]*disabled/);

  const elements = new Map();
  const getElementById = id => {
    if (!elements.has(id)) {
      const listeners = new Map();
      elements.set(id, {
        value: "",
        disabled: id === "teacherName",
        textContent: "",
        className: "",
        listeners,
        addEventListener: (eventName, handler) => listeners.set(eventName, handler),
        classList: { remove() {} },
        scrollIntoView() {},
        focus() {},
      });
    }
    return elements.get(id);
  };
  const context = {
    document: { getElementById },
    window: { addEventListener() {} },
    GeoGuru: {
      api: async () => ({ ditemukan: true, nama: "Dewi Lestari" }),
      clearMessage() {},
      showMessage() {},
      stopCamera() {},
    },
  };
  vm.runInNewContext(readFile(path.join(javascriptRoot, "register.js")), context, {
    filename: "register.js",
  });

  const nip = getElementById("nip");
  const name = getElementById("teacherName");
  const checkButton = getElementById("checkNipButton");
  nip.value = "198001012005011001";
  await checkButton.listeners.get("click")();

  assert.equal(name.disabled, true);
  assert.equal(name.value, "Dewi Lestari");
  assert.equal(getElementById("continueButton").disabled, false);

  nip.value = "198001012005011002";
  nip.listeners.get("input")();
  assert.equal(name.value, "");
  assert.equal(getElementById("continueButton").disabled, true);
});

test("all teacher portal JavaScript files parse", () => {
  for (const fileName of fs.readdirSync(javascriptRoot).filter(name => name.endsWith(".js"))) {
    assert.doesNotThrow(
      () => new vm.Script(readFile(path.join(javascriptRoot, fileName)), { filename: fileName }),
      `${fileName} has valid JavaScript syntax`,
    );
  }
});

test("all student portal JavaScript files parse", () => {
  for (const fileName of fs.readdirSync(studentJavascriptRoot).filter(name => name.endsWith(".js"))) {
    assert.doesNotThrow(
      () => new vm.Script(readFile(path.join(studentJavascriptRoot, fileName)), { filename: fileName }),
      `${fileName} has valid JavaScript syntax`,
    );
  }
});

test("API requests include the configured base URL and session credentials", async () => {
  let requestUrl;
  let requestOptions;
  const { geoGuru } = loadGeoGuru({
    fetch: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ result: "ok" }),
      };
    },
  });

  const result = await geoGuru.api("/api/guru/riwayat");

  assert.equal(requestUrl, "https://example.test/api-root/api/guru/riwayat");
  assert.equal(requestOptions.credentials, "include");
  assert.equal(requestOptions.cache, "no-store");
  assert.equal(result.result, "ok");
});

test("mutating API requests send JSON and the stored CSRF token", async () => {
  let requestOptions;
  const { geoGuru } = loadGeoGuru({
    csrfToken: "test-csrf-token",
    fetch: async (_url, options) => {
      requestOptions = options;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ saved: true }),
      };
    },
  });

  await geoGuru.api("/api/guru/jurnal", {
    method: "PUT",
    body: { materi: "Matematika" },
  });

  assert.equal(requestOptions.method, "PUT");
  assert.equal(requestOptions.headers.get("Content-Type"), "application/json");
  assert.equal(requestOptions.headers.get("X-CSRF-Token"), "test-csrf-token");
  assert.deepEqual(JSON.parse(requestOptions.body), { materi: "Matematika" });
});

test("API errors surface server messages and invalid JSON responses", async t => {
  await t.test("server error", async () => {
    const { geoGuru } = loadGeoGuru({
      fetch: async () => ({
        ok: false,
        status: 422,
        text: async () => JSON.stringify({ pesan: "Data tidak valid." }),
      }),
    });

    await assert.rejects(geoGuru.api("/api/guru/login"), /Data tidak valid\./);
  });

  await t.test("invalid JSON", async () => {
    const { geoGuru } = loadGeoGuru({
      fetch: async () => ({
        ok: true,
        status: 200,
        text: async () => "<html>Unexpected response</html>",
      }),
    });

    await assert.rejects(geoGuru.api("/api/guru/login"), /respons yang tidak valid/);
  });
});

test("API connection errors identify the configured endpoint", async () => {
  const { geoGuru } = loadGeoGuru({
    fetch: async () => {
      throw new Error("Failed to fetch");
    },
  });

  await assert.rejects(
    geoGuru.api("/api/auth/csrf"),
    /Tidak dapat terhubung ke API di https:\/\/example\.test\/api-root/,
  );
});

test("face embeddings are averaged and normalized", () => {
  const { geoGuru } = loadGeoGuru();
  const embedding = geoGuru.averageEmbeddings([[1, 0], [0, 1]]);
  const magnitude = Math.sqrt(embedding.reduce((sum, value) => sum + value ** 2, 0));

  assert.ok(Math.abs(magnitude - 1) < 1e-12);
  assert.ok(Math.abs(embedding[0] - Math.SQRT1_2) < 1e-12);
  assert.ok(Math.abs(embedding[1] - Math.SQRT1_2) < 1e-12);
});

test("invalid face embedding samples are rejected", () => {
  const { geoGuru } = loadGeoGuru();

  assert.throws(() => geoGuru.averageEmbeddings([]), /tidak lengkap/);
  assert.throws(() => geoGuru.averageEmbeddings([[1, 0], [1]]), /tidak lengkap/);
  assert.throws(() => geoGuru.averageEmbeddings([[0, 0]]), /tidak valid/);
});

test("helper functions format dates and provide safe display fallbacks", () => {
  const { geoGuru } = loadGeoGuru();

  assert.match(geoGuru.formatDate("2026-10-16"), /16/);
  assert.equal(geoGuru.safeCell({ status: "Hadir" }, "status"), "Hadir");
  assert.equal(geoGuru.safeCell({ status: "" }, "status"), "—");
  assert.equal(geoGuru.safeCell({}, "status", "Tidak ada"), "Tidak ada");
});
