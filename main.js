const PAGES = [
  { href: "index.html", label: "Home" },
  { href: "about.html", label: "About" },
  { href: "team.html", label: "Team" },
  { href: "contact.html", label: "Contact" },
];

function currentPage() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  return path;
}

function injectNav() {
  const current = currentPage();
  const links = PAGES.map(
    (p) =>
      `<li><a href="${p.href}" class="${p.href === current ? "active" : ""}">${p.label}</a></li>`,
  ).join("");

  const nav = document.createElement("nav");
  nav.className = "nav";
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="brand" aria-label="Meaning in Music home">
        <img class="brand-logo" src="logo.png" alt="Meaning in Music logo" />
        <span class="brand-name">
          <strong>Meaning in Music</strong>
        </span>
      </a>
      <ul class="nav-links" id="navLinks">
        ${links}
        <li><a href="apply.html" class="nav-cta-inline">Apply for lessons</a></li>
      </ul>
      <button class="nav-burger" id="navBurger" aria-label="Toggle menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  `;
  document.body.insertBefore(nav, document.body.firstChild);

  const burger = document.getElementById("navBurger");
  const linksEl = document.getElementById("navLinks");
  burger.addEventListener("click", () => {
    const open = linksEl.classList.toggle("open");
    burger.classList.toggle("open", open);
    burger.setAttribute("aria-expanded", String(open));
  });
  linksEl.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      linksEl.classList.remove("open");
      burger.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }),
  );
}

function injectFooter() {
  const current = currentPage();
  const links = PAGES.map(
    (p) =>
      `<li><a href="${p.href}" class="${p.href === current ? "active" : ""}">${p.label}</a></li>`,
  ).join("");

  const footer = document.createElement("footer");
  footer.innerHTML = `
    <div class="footer-inner">
      <div>
        <p class="footer-name">Meaning in Music</p>
        <p>Free music lessons for kids, taught by high school students in the Bay Area.
          <a href="mailto:meaninginmusiceducation@gmail.com" style="color:inherit">meaninginmusiceducation@gmail.com</a></p>
        <p class="footer-credits">&copy; ${new Date().getFullYear()} Meaning in Music.</p>
      </div>
      <ul class="footer-links">
        ${links}
        <li><a href="apply.html">Apply for lessons</a></li>
      </ul>
    </div>
  `;
  document.body.appendChild(footer);
}

function setupReveal() {
  const revealEls = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  revealEls.forEach((el) => observer.observe(el));
}

document.addEventListener("DOMContentLoaded", () => {
  injectNav();
  injectFooter();
  setupReveal();

  document.querySelectorAll("a[href^='#']").forEach((a) =>
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      }
    }),
  );
});