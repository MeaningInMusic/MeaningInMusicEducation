// Meaning in Music — applies admin-edited site content to the page.
// Elements with data-site-text="key" get their text replaced (only when the
// saved value differs from the current text, so untouched formatting stays
// intact). Elements with data-site-img="key" get their src swapped.
// Falls back from the PHP API to the static site-content.json file.

(function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function apply(content) {
    var fields = content && content.fields;
    if (!fields || !fields.length) return;
    var m = {};
    for (var i = 0; i < fields.length; i++) {
      if (fields[i] && fields[i].key != null) m[fields[i].key] = fields[i].value;
    }

    document.querySelectorAll("[data-site-text]").forEach(function (el) {
      var key = el.getAttribute("data-site-text");
      if (m[key] == null) return;
      var value = String(m[key]);
      if ((el.textContent || "").trim() === value.trim()) return; // untouched
      el.innerHTML = esc(value);
    });

    document.querySelectorAll("[data-site-img]").forEach(function (el) {
      var key = el.getAttribute("data-site-img");
      if (!m[key]) return;
      if ((el.getAttribute("src") || "") === m[key]) return;
      el.setAttribute("src", m[key]);
    });
  }

  function load(urls, i) {
    if (i >= urls.length) return;
    fetch(urls[i], { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("bad");
        return r.json();
      })
      .then(function (data) {
        apply(data);
      })
      .catch(function () {
        load(urls, i + 1);
      });
  }

  function go() {
    if (!document.querySelector("[data-site-text],[data-site-img]")) return;
    load(["site.php?get=1", "site-content.json"], 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", go);
  } else {
    go();
  }
})();