"use strict";

window.GEOKBM_ENV = window.GEOKBM_ENV || {};
window.GEOKBM_ENV.API_BASE = String(
  window.GEOKBM_ENV.API_BASE || "http://127.0.0.1:8000",
).replace(/\/$/, "");
