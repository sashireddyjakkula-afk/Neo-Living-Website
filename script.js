/* ============================================================
   NEO LIVING — interactions + GSAP/Lenis motion layer
   Progressive enhancement: if GSAP (CDN) is unavailable or the
   user prefers reduced motion, we drop <html class="js"> so all
   content is shown statically. Nothing is ever left hidden.
   ============================================================ */
(function () {
  "use strict";

  var docEl = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = !!(window.gsap && window.ScrollTrigger);

  /* ========== always-on UI (works with or without GSAP) ========== */

  // mobile nav
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    var setNav = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    toggle.addEventListener("click", function () { setNav(!nav.classList.contains("is-open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setNav(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setNav(false); });
  }

  // header scroll state (kept as a fallback; also updated by Lenis below)
  var header = document.getElementById("header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // footer year
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // contact form → composes an email (no backend needed)
  var form = document.getElementById("contactForm");
  if (form) {
    var status = document.getElementById("formStatus");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var topic = (data.get("topic") || "General enquiry").toString();
      var message = (data.get("message") || "").toString().trim();
      var to = form.getAttribute("data-to") || "hello@neolivinginfra.com";
      var subject = "Neo Living — " + topic + (name ? " — " + name : "");
      var body = "Name: " + name + "\n" + "Email: " + email + "\n" + "Topic: " + topic + "\n\n" + message + "\n";
      window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      if (status) {
        status.textContent = "Thanks, " + (name || "there") + " — your email app should open with the message ready to send. If it doesn't, write to us directly at " + to + ".";
        status.classList.add("is-shown");
      }
      form.reset();
    });
  }

  /* ========== fallback path: no GSAP or reduced motion ========== */
  if (!hasGSAP || reduce) {
    docEl.classList.remove("js"); // reveal everything, disable transition overlay
    if (!reduce && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
      }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
      document.querySelectorAll(".reveal, .wave").forEach(function (el) { io.observe(el); });
    }
    return;
  }

  /* ============================================================
     FULL MOTION LAYER (GSAP + Lenis)
     ============================================================ */
  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  /* ---- Lenis smooth scroll, synced to ScrollTrigger ---- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.12, wheelMultiplier: 1, smoothWheel: true, syncTouch: false });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* ---- scroll progress bar + auto-hiding nav ---- */
  var bar = document.querySelector(".scroll-progress");
  var updateChrome = function (scroll, progress, direction) {
    if (bar) gsap.set(bar, { scaleX: progress || 0 });
    if (header) {
      header.classList.toggle("is-scrolled", scroll > 8);
      if (direction === 1 && scroll > 260) header.classList.add("nav-hidden");
      else if (direction === -1) header.classList.remove("nav-hidden");
    }
  };
  if (lenis) {
    lenis.on("scroll", function (e) { updateChrome(e.scroll, e.progress, e.direction); });
  } else {
    window.addEventListener("scroll", function () {
      var max = docEl.scrollHeight - window.innerHeight;
      updateChrome(window.scrollY, max > 0 ? window.scrollY / max : 0, 0);
    }, { passive: true });
  }

  /* ---- helper: split an element's text into masked words (keeps <em>) ---- */
  function splitWords(root) {
    var words = [];
    (function process(parent) {
      Array.prototype.slice.call(parent.childNodes).forEach(function (node) {
        if (node.nodeType === 3) {
          var frag = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(function (part) {
            if (part === "") return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var outer = document.createElement("span"); outer.className = "word";
            var inner = document.createElement("span"); inner.className = "word__inner";
            inner.textContent = part;
            outer.appendChild(inner); frag.appendChild(outer);
            words.push(inner);
          });
          parent.replaceChild(frag, node);
        } else if (node.nodeType === 1 && node.tagName !== "BR") {
          process(node);
        }
      });
    })(root);
    return words;
  }

  /* ---- intro timeline for hero / page-hero ---- */
  function intro(scopeSel) {
    var scope = document.querySelector(scopeSel);
    if (!scope) return;
    var eyebrow = scope.querySelector(".eyebrow");
    var titleEl = scope.querySelector("h1");
    var words = titleEl ? splitWords(titleEl) : [];
    var rest = gsap.utils.toArray(scope.querySelectorAll(".reveal")).filter(function (el) {
      return el.tagName !== "H1" && !el.classList.contains("eyebrow");
    });

    gsap.set(scope.querySelectorAll(".reveal"), { autoAlpha: 0 });
    if (titleEl) gsap.set(titleEl, { autoAlpha: 1 });
    if (words.length) gsap.set(words, { yPercent: 118 });

    var tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.15 });
    if (eyebrow) tl.fromTo(eyebrow, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 0);
    if (words.length) tl.to(words, { yPercent: 0, duration: 1, stagger: 0.05, ease: "power4.out" }, 0.15);
    if (rest.length) tl.fromTo(rest, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.85, stagger: 0.12 }, "-=0.55");

    var mark = scope.querySelector(".hero__markbg");
    if (mark) gsap.fromTo(mark, { opacity: 0, scale: 1.12 }, { opacity: 0.07, scale: 1, duration: 1.8, ease: "power2.out" });
  }
  intro(".hero");
  intro(".pagehero");

  /* ---- scroll reveals for everything below the fold ---- */
  var facts = gsap.utils.toArray(".facts");
  var reveals = gsap.utils.toArray(".reveal").filter(function (el) {
    return !el.closest(".hero") && !el.closest(".pagehero") && !el.classList.contains("facts");
  });
  gsap.set(reveals, { autoAlpha: 0, y: 28 });
  ScrollTrigger.batch(reveals, {
    start: "top 88%", once: true,
    onEnter: function (batch) {
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1, ease: "power3.out", overwrite: true });
    }
  });

  /* facts: reveal the big numerals one by one */
  facts.forEach(function (block) {
    var items = block.querySelectorAll(".fact");
    gsap.set(block, { autoAlpha: 1 });
    gsap.set(items, { autoAlpha: 0, y: 26 });
    ScrollTrigger.create({
      trigger: block, start: "top 85%", once: true,
      onEnter: function () { gsap.to(items, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.13, ease: "power3.out" }); }
    });
  });

  /* ---- wave motifs: scroll-linked stroke draw + parallax drift ---- */
  gsap.utils.toArray(".wave").forEach(function (wave) {
    var paths = wave.querySelectorAll("path");
    gsap.fromTo(paths,
      { strokeDashoffset: function (i, t) { return parseFloat(t.style.getPropertyValue("--len")) || 900; } },
      { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: wave, start: "top 95%", end: "top 45%", scrub: 1 } }
    );
    if (!wave.classList.contains("site-footer__wave")) {
      var sect = wave.closest("section") || wave.parentElement;
      gsap.to(wave, { yPercent: -14, ease: "none", scrollTrigger: { trigger: sect, start: "top bottom", end: "bottom top", scrub: true } });
    }
  });

  /* hero mark parallax */
  var heroMark = document.querySelector(".hero__markbg");
  if (heroMark) gsap.to(heroMark, { yPercent: 14, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  /* ---- Approach: growth spine fills as you read the principles ---- */
  var spineFill = document.querySelector(".growth-spine__fill");
  if (spineFill) {
    gsap.to(spineFill, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".principles", start: "top 72%", end: "bottom 82%", scrub: true } });
  }

  /* ---- magnetic hero / CTA buttons (fine pointers only) ---- */
  if (window.matchMedia("(pointer:fine)").matches) {
    document.querySelectorAll(".hero__actions .btn, .band__cta .btn").forEach(function (btn) {
      btn.classList.add("magnetic");
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - (r.left + r.width / 2)) * 0.3, y: (e.clientY - (r.top + r.height / 2)) * 0.35, duration: 0.4, ease: "power3.out" });
      });
      btn.addEventListener("pointerleave", function () {
        gsap.to(btn, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.45)" });
      });
    });
  }

  /* ---- hero canvas: living wave-line flow field ---- */
  var canvas = document.querySelector(".hero__canvas");
  if (canvas) initHeroCanvas(canvas);

  function initHeroCanvas(cv) {
    var ctx = cv.getContext("2d");
    var w = 0, h = 0, dpr = 1, paused = false, mx = 0.5, my = 0.5, tmx = 0.5, tmy = 0.5;
    var N = 8;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      var r = cv.getBoundingClientRect(); w = r.width; h = r.height;
      cv.width = Math.max(1, Math.round(w * dpr)); cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    // Re-size whenever the canvas box actually changes — fixes the first-load
    // blur where the canvas was sized before Fraunces loaded and grew the hero.
    if (window.ResizeObserver) { new ResizeObserver(resize).observe(cv); }
    else { window.addEventListener("resize", resize); }
    window.addEventListener("load", resize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
    function frame(now) {
      requestAnimationFrame(frame);
      if (paused || w === 0) return;
      var t = now * 0.001;
      tmx += (mx - tmx) * 0.05; tmy += (my - tmy) * 0.05;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < N; i++) {
        var f = i / (N - 1);
        var yBase = h * (0.16 + f * 0.74);
        var amp = (13 + i * 4) * (h / 720);
        var cream = i % 3 === 0;
        ctx.beginPath();
        for (var x = 0; x <= w; x += 10) {
          var px = x / w;
          var y = yBase
            + Math.sin(px * 3.1 + t * 0.5 + i * 0.6) * amp
            + Math.sin(px * 6.7 - t * 0.32 + i) * amp * 0.4
            + (tmy - 0.5) * 26 * (f - 0.5) * 2
            + (tmx - 0.5) * 16 * Math.sin(px * 3.14159);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = cream ? "rgba(252,235,197," + (0.07 + f * 0.05).toFixed(3) + ")" : "rgba(147,184,76," + (0.10 + f * 0.08).toFixed(3) + ")";
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
    }
    requestAnimationFrame(frame);
    var hero = cv.closest(".hero");
    (hero || cv).addEventListener("pointermove", function (e) {
      var r = cv.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width; my = (e.clientY - r.top) / r.height;
    });
    document.addEventListener("visibilitychange", function () { paused = document.hidden; });
    ScrollTrigger.create({ trigger: hero, start: "top bottom", end: "bottom top", onToggle: function (self) { paused = !self.isActive; } });
  }

  /* ---- page-transition wipe between the four pages ---- */
  var overlay = document.querySelector(".page-transition");
  if (overlay) {
    // enter: overlay starts covering (CSS .js) → rise out
    overlay.classList.add("is-active");
    gsap.to(overlay, { yPercent: -101, duration: 0.7, ease: "power3.inOut", onComplete: function () { overlay.classList.remove("is-active"); } });

    document.querySelectorAll('a[href$=".html"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var url = a.getAttribute("href");
        if (!url || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        overlay.classList.add("is-active");
        gsap.timeline({ onComplete: function () { window.location.href = url; } })
          .fromTo(overlay, { yPercent: -101 }, { yPercent: 0, duration: 0.55, ease: "power3.inOut" });
      });
    });
  }

  /* ---- refresh triggers once assets/fonts settle ---- */
  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
