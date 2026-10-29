// Don't edit this directly, it uses env vars in prod via serve.js
// These are dev values
window.API_URL = "/api";
(() => {
  const url = new URL("/", window.location.href);
  url.port = 3400;
  window.PORTAL_URL = url.href.replace(/\/$/, "");
})();
window.USE_PORTAL_PRIVACY_POLICY = true;
