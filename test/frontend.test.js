"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const guruRoot = path.join(projectRoot, "src", "frontend", "guru");
const javascriptRoot = path.join(guruRoot, "js");
const pageScripts = {
  "index.html": "login.js",
  "register.html": "register.js",
  "home.html": "home.js",
  "jurnal.html": "jurnal.js",
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

test("all teacher portal JavaScript files parse", () => {
  for (const fileName of fs.readdirSync(javascriptRoot).filter(name => name.endsWith(".js"))) {
    assert.doesNotThrow(
      () => new vm.Script(readFile(path.join(javascriptRoot, fileName)), { filename: fileName }),
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
