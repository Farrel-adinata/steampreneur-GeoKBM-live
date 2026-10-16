"use strict";

window.GEOKBM_ENV = window.GEOKBM_ENV || {};
const hostname = window.location?.hostname || "";
const isLocalHost = hostname === "localhost"
  || hostname === "127.0.0.1"
  || hostname === "::1";
const defaultApiBase = isLocalHost
  ? `${window.location.protocol}//${hostname}:8000`
  : window.location?.origin || "http://127.0.0.1:8000";
window.GEOKBM_ENV.API_BASE = String(
  window.GEOKBM_ENV.API_BASE || defaultApiBase,
).replace(/\/$/, "");
