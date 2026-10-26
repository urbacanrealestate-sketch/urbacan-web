/* Urbacan Real Estate — interacciones ligeras (sin dependencias) */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Menú móvil */
  var btnMenu = document.querySelector(".btn-menu");
  var menu = document.getElementById("menu-movil");
  if (btnMenu && menu) {
    btnMenu.addEventListener("click", function () {
      var abierto = btnMenu.getAttribute("aria-expanded") === "true";
      btnMenu.setAttribute("aria-expanded", String(!abierto));
      menu.hidden = abierto;
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) { menu.hidden = true; btnMenu.setAttribute("aria-expanded", "false"); }
    });
  }

  /* Aparición suave */
  var items = document.querySelectorAll(".aparece");
  if (!reducir && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("visible"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("visible"); });
  }

  /* Filtros por provincia */
  var filtros = document.querySelector(".filtros");
  if (filtros) {
    filtros.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var valor = b.getAttribute("data-filtro");
      filtros.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      var visibles = 0;
      document.querySelectorAll("[data-provincia]").forEach(function (t) {
        var ok = valor === "todas" || t.getAttribute("data-provincia") === valor;
        t.hidden = !ok; if (ok) visibles++;
      });
      var est = document.getElementById("estado-filtro");
      if (est) est.textContent = visibles + (visibles === 1 ? " propiedad" : " propiedades");
    });
  }

  /* Galería */
  var gal = document.querySelector(".galeria");
  if (gal) {
    var pista = gal.querySelector(".pista");
    var figs = Array.prototype.slice.call(pista.querySelectorAll("figure"));
    var contador = gal.querySelector(".contador");
    var actual = 0;
    var actualizar = function () {
      var ancho = figs[0].getBoundingClientRect().width || 1;
      actual = Math.round(pista.scrollLeft / ancho);
      if (actual > figs.length - 1) actual = figs.length - 1;
      if (contador) contador.textContent = (actual + 1) + " / " + figs.length;
    };
    var ir = function (i) {
      i = (i + figs.length) % figs.length;
      pista.scrollTo({ left: figs[i].offsetLeft - pista.offsetLeft, behavior: reducir ? "auto" : "smooth" });
    };
    var t;
    pista.addEventListener("scroll", function () { clearTimeout(t); t = setTimeout(actualizar, 60); }, { passive: true });
    var ant = gal.querySelector(".g-ant"), sig = gal.querySelector(".g-sig");
    if (ant) ant.addEventListener("click", function () { ir(actual - 1); });
    if (sig) sig.addEventListener("click", function () { ir(actual + 1); });

    /* Visor a pantalla completa */
    var visor = document.getElementById("visor");
    if (visor && typeof visor.showModal === "function") {
      var vimg = visor.querySelector("img"), vpie = visor.querySelector(".pie-foto"), vi = 0;
      var mostrar = function (i) {
        vi = (i + figs.length) % figs.length;
        var b = figs[vi].querySelector("button");
        vimg.src = b.getAttribute("data-grande");
        vimg.alt = b.querySelector("img").alt;
        vpie.textContent = (vi + 1) + " / " + figs.length + " · " + vimg.alt;
      };
      figs.forEach(function (f, i) {
        var b = f.querySelector("button");
        if (b) b.addEventListener("click", function () { mostrar(i); visor.showModal(); });
      });
      visor.querySelector(".cerrar").addEventListener("click", function () { visor.close(); });
      visor.querySelector(".ant").addEventListener("click", function () { mostrar(vi - 1); });
      visor.querySelector(".sig").addEventListener("click", function () { mostrar(vi + 1); });
      visor.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") mostrar(vi - 1);
        if (e.key === "ArrowRight") mostrar(vi + 1);
      });
      visor.addEventListener("close", function () { ir(vi); });
      var x0 = null;
      visor.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      visor.addEventListener("touchend", function (e) {
        if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 50) mostrar(vi + (dx < 0 ? 1 : -1)); x0 = null;
      });
    } else {
      figs.forEach(function (f) { var b = f.querySelector("button"); if (b) b.addEventListener("click", function () { window.open(b.getAttribute("data-grande"), "_blank", "noopener"); }); });
    }
  }

  /* Tarjeta: guardar contacto (vCard) */
  var vbtn = document.getElementById("guardar-contacto");
  if (vbtn) {
    vbtn.addEventListener("click", function (e) {
      e.preventDefault();
      var v = vbtn.getAttribute("data-vcard").replace(/\\n/g, "\r\n");
      var blob = new Blob([v], { type: "text/vcard;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "Sergio-Barranco-Urbacan.vcf";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
  }
})();
