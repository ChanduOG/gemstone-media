(() => {
  const root = document.documentElement;
  const hero = document.querySelector("#hero");
  const stage = hero?.querySelector(".stage");
  const photo = hero?.querySelector(".hero-photo");
  const photoImg = hero?.querySelector(".hero-photo__img");
  const facets = hero?.querySelector(".hero-facets");
  const heroCopy = hero?.querySelector(".hero-copy");
  const heroLetter = hero?.querySelector(".hero-letter");
  const siteNav = document.querySelector("#site-nav");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = [...document.querySelectorAll(".site-links a")];
  const progressBar = document.querySelector(".scroll-progress");
  const parallaxItems = [...document.querySelectorAll("[data-parallax]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionTargets = [...document.querySelectorAll("[data-motion-reveal]")];
  let motionObserver = null;
  let lenis = null;

  /* ---------- Reveal on scroll ---------- */
  function showMotionContent() {
    root.classList.remove("motion-ready");
    motionTargets.forEach((target) => target.classList.add("is-visible"));
  }

  function setupMotionReveals() {
    if (reducedMotion.matches || !("IntersectionObserver" in window) || motionTargets.length === 0) {
      showMotionContent();
      return;
    }

    try {
      document.querySelectorAll("[data-motion-stagger]").forEach((group) => {
        [...group.children]
          .filter((item) => item.matches("[data-motion-reveal]"))
          .forEach((item, index) => {
            item.style.setProperty("--motion-delay", `${Math.min(index * 65, 195)}ms`);
          });
      });

      motionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            motionObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });

      motionTargets.forEach((target) => motionObserver.observe(target));
      root.classList.add("motion-ready");
    } catch {
      motionObserver?.disconnect();
      showMotionContent();
    }
  }

  setupMotionReveals();

  /* ---------- Navigation ---------- */
  function setNavigationOpen(isOpen) {
    siteNav?.classList.toggle("is-open", isOpen);
    navToggle?.setAttribute("aria-expanded", String(isOpen));
    navToggle?.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  }

  navToggle?.addEventListener("click", () => {
    setNavigationOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  navLinks.forEach((link) => link.addEventListener("click", () => setNavigationOpen(false)));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setNavigationOpen(false);
  });

  const currentYear = document.querySelector("#current-year");
  if (currentYear) currentYear.textContent = String(new Date().getFullYear());

  // Highlight the nav link for the section in view.
  if ("IntersectionObserver" in window) {
    const linkFor = new Map(navLinks.map((link) => [link.getAttribute("href"), link]));
    const sections = [...linkFor.keys()]
      .map((hash) => document.querySelector(hash))
      .filter(Boolean);
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => link.classList.remove("is-current"));
        linkFor.get(`#${entry.target.id}`)?.classList.add("is-current");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  /* ---------- Smooth scrolling ---------- */
  function startLenis() {
    if (lenis || reducedMotion.matches || typeof window.Lenis !== "function") return;
    try {
      lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 0.95, smoothWheel: true });
      const raf = (time) => {
        lenis?.raf(time);
        if (lenis) requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
      lenis.on("scroll", onScroll);
    } catch {
      lenis = null;
    }
  }

  function stopLenis() {
    lenis?.destroy();
    lenis = null;
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !lenis) return;
    const hash = link.getAttribute("href");
    const target = hash === "#" ? null : document.querySelector(hash);
    if (!target) return;
    event.preventDefault();
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    lenis.scrollTo(target === hero ? 0 : target, { offset: -margin, duration: 1.4 });
    history.pushState(null, "", hash);
  });

  /* ---------- Founder hero: a gem that opens into the story ---------- */
  const IMG_W = 1200;
  const IMG_H = 1484;
  const FOCUS_X = 0.47; // the founder's position inside the photo
  const FOCUS_Y = 0.5;

  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (p, start, end) => clamp((p - start) / (end - start));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  let layout = null;
  let heroTarget = 0;
  let heroCurrent = 0;
  let heroFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointerCurrentX = 0;
  let pointerCurrentY = 0;

  function measure() {
    if (!hero || !stage) return;
    const vw = stage.clientWidth;
    const vh = stage.clientHeight;
    const mobile = vw <= 700;
    const gutter = parseFloat(getComputedStyle(heroCopy).left) || 24;

    if (!mobile) {
      const gemH = Math.min(vh * 0.74, (vw * 0.4) / 0.74);
      const gemW = gemH * 0.74;
      const cx = Math.min(vw * 0.71, vw - gutter - gemW / 2);
      layout = {
        mobile,
        vw,
        vh,
        keys: [
          { at: 0, x: cx - gemW / 2, y: vh * 0.53 - gemH / 2, w: gemW, h: gemH, cut: 0.2 },
          { at: 1, x: vw * 0.44, y: 0, w: vw * 0.56, h: vh, cut: 0 },
        ],
        // progress windows
        expand: [0.06, 0.5],
        copyOut: [0.06, 0.3],
        letterIn: [0.4, 0.58],
        letterDrift: [0.6, 0.96],
        letterTop: null,
      };
    } else {
      const copyBottom = heroCopy.offsetTop + heroCopy.offsetHeight;
      const top = copyBottom + 22;
      const bottom = vh - 96;
      const gemH = Math.max(180, bottom - top);
      const gemW = Math.min(vw - gutter * 2, gemH * 0.76);
      const bandH = Math.round(vh * 0.36);
      layout = {
        mobile,
        vw,
        vh,
        keys: [
          { at: 0, x: (vw - gemW) / 2, y: top, w: gemW, h: gemH, cut: 0.2 },
          { at: 1, x: 0, y: 0, w: vw, h: vh, cut: 0 },
          { at: 2, x: 0, y: 0, w: vw, h: bandH, cut: 0 },
        ],
        expand: [0.04, 0.36],
        settle: [0.5, 0.66],
        copyOut: [0.04, 0.22],
        letterIn: [0.58, 0.72],
        letterDrift: [0.72, 0.97],
        letterTop: bandH + 26,
      };
      hero.style.setProperty("--letter-top", `${layout.letterTop}px`);
    }

    // How much the letter overflows its space, scrolled through by the visitor.
    hero.style.setProperty("--letter-y", "0px");
    const letterRect = heroLetter.getBoundingClientRect();
    const available = layout.mobile ? vh - layout.letterTop - 28 : vh - 140;
    layout.letterOverflow = Math.max(0, letterRect.height - available);
    hero.style.setProperty("--gem-cx", `${((layout.keys[0].x + layout.keys[0].w / 2) / vw) * 100}%`);
    hero.style.setProperty("--gem-cy", `${((layout.keys[0].y + layout.keys[0].h / 2) / vh) * 100}%`);
  }

  function windowAt(p) {
    const { keys } = layout;
    let a;
    let b;
    let t;
    if (!layout.mobile) {
      t = ease(range(p, ...layout.expand));
      [a, b] = keys;
    } else if (p < layout.settle[0]) {
      t = ease(range(p, ...layout.expand));
      [a, b] = keys;
    } else {
      t = ease(range(p, ...layout.settle));
      a = keys[1];
      b = keys[2];
    }
    if (reducedMotion.matches) t = t < 0.5 ? 0 : 1;
    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      w: lerp(a.w, b.w, t),
      h: lerp(a.h, b.h, t),
      cut: lerp(a.cut, b.cut, t),
      gem: a === keys[0] ? t : 1,
    };
  }

  function octagon(r, inset = 0) {
    const x0 = r.x + inset;
    const y0 = r.y + inset;
    const x1 = r.x + r.w - inset;
    const y1 = r.y + r.h - inset;
    const c = Math.max(0, Math.min(r.w, r.h) * r.cut - inset * 0.42);
    return [
      [x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c],
      [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c],
    ];
  }

  const toPoints = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  let rays = [];
  function ensureRays() {
    const group = facets.querySelector(".hero-facets__rays");
    if (rays.length) return;
    for (let i = 0; i < 8; i += 1) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      group.appendChild(line);
      rays.push(line);
    }
  }

  function renderHero(p) {
    if (!layout) return;
    const reduce = reducedMotion.matches;
    const r = windowAt(p);
    const e = r.gem;
    const px = reduce ? 0 : pointerCurrentX * (1 - e);
    const py = reduce ? 0 : pointerCurrentY * (1 - e);

    // Gem-shaped window onto the photo.
    const outer = octagon(r);
    photo.style.clipPath = `polygon(${outer.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;

    // Photo always fills its window, with a slow settle in zoom.
    const zoom = lerp(1.14, 1, easeOut(e));
    const scale = Math.max(r.w / IMG_W, r.h / IMG_H) * zoom;
    const dw = IMG_W * scale;
    const dh = IMG_H * scale;
    let ix = r.x + r.w / 2 - FOCUS_X * dw;
    let iy = r.y + r.h / 2 - FOCUS_Y * dh;
    ix = clamp(ix, r.x + r.w - dw, r.x);
    iy = clamp(iy, r.y + r.h - dh, r.y);
    photoImg.style.transform = `translate3d(${(ix - px * 0.6).toFixed(2)}px, ${(iy - py * 0.6).toFixed(2)}px, 0) scale(${scale.toFixed(5)})`;

    // Facet lines sit on a nearer plane, so they drift further with the pointer.
    hero.style.setProperty("--e", e.toFixed(4));
    if (e < 0.999) {
      ensureRays();
      const shifted = { ...r, x: r.x + px, y: r.y + py };
      const inset = Math.min(r.w, r.h) * 0.075;
      const outerPts = octagon(shifted);
      const innerPts = octagon(shifted, inset);
      facets.querySelector(".hero-facets__outer").setAttribute("points", toPoints(outerPts));
      facets.querySelector(".hero-facets__inner").setAttribute("points", toPoints(innerPts));
      rays.forEach((line, i) => {
        line.setAttribute("x1", outerPts[i][0].toFixed(1));
        line.setAttribute("y1", outerPts[i][1].toFixed(1));
        line.setAttribute("x2", innerPts[i][0].toFixed(1));
        line.setAttribute("y2", innerPts[i][1].toFixed(1));
      });
    }

    // Opening copy lifts away, the founder's letter arrives.
    const copyT = range(p, ...layout.copyOut);
    const copyO = reduce ? (copyT < 0.5 ? 1 : 0) : 1 - easeOut(copyT);
    hero.style.setProperty("--copy-o", copyO.toFixed(3));
    hero.style.setProperty("--copy-y", `${reduce ? 0 : (-60 * easeOut(copyT)).toFixed(1)}px`);
    heroCopy.style.visibility = copyO < 0.02 ? "hidden" : "";

    const letterT = range(p, ...layout.letterIn);
    const letterO = reduce ? (letterT < 0.5 ? 0 : 1) : easeOut(letterT);
    const drift = range(p, ...layout.letterDrift);
    const letterY = reduce
      ? -layout.letterOverflow * drift
      : 36 * (1 - easeOut(letterT)) - layout.letterOverflow * drift - 18 * drift;
    hero.style.setProperty("--letter-o", letterO.toFixed(3));
    hero.style.setProperty("--letter-y", `${letterY.toFixed(1)}px`);
    heroLetter.classList.toggle("is-active", letterO > 0.5);
    heroLetter.style.visibility = letterO < 0.02 ? "hidden" : "";
  }

  function heroProgress() {
    const distance = hero.offsetHeight - window.innerHeight;
    return distance > 0 ? clamp(-hero.getBoundingClientRect().top / distance) : 0;
  }

  function heroLoop() {
    heroFrame = 0;
    const smoothing = reducedMotion.matches ? 1 : 0.18;
    heroCurrent += (heroTarget - heroCurrent) * smoothing;
    pointerCurrentX += (pointerX - pointerCurrentX) * 0.08;
    pointerCurrentY += (pointerY - pointerCurrentY) * 0.08;
    if (Math.abs(heroTarget - heroCurrent) < 0.0002) heroCurrent = heroTarget;
    renderHero(heroCurrent);
    const settled = heroCurrent === heroTarget
      && Math.abs(pointerX - pointerCurrentX) < 0.05
      && Math.abs(pointerY - pointerCurrentY) < 0.05;
    if (!settled) heroFrame = requestAnimationFrame(heroLoop);
  }

  function requestHero() {
    if (!heroFrame) heroFrame = requestAnimationFrame(heroLoop);
  }

  /* ---------- Scroll-linked page effects ---------- */
  function onScroll() {
    const y = window.scrollY;
    siteNav?.classList.toggle("is-scrolled", y > 24);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar?.style.setProperty("--page-progress", max > 0 ? (y / max).toFixed(4) : "0");

    if (!reducedMotion.matches) {
      const vh = window.innerHeight;
      parallaxItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > vh + 100) return;
        const t = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
        item.style.setProperty("--py", `${(clamp(t, -1, 1) * rect.height * 0.05).toFixed(1)}px`);
      });
    }

    if (layout) {
      heroTarget = heroProgress();
      requestHero();
    }
  }

  if (hero && stage && photo && photoImg && facets && heroCopy && heroLetter) {
    hero.classList.add("is-live", "is-scrollable");
    measure();
    heroCurrent = heroTarget = heroProgress();
    renderHero(heroCurrent);

    window.addEventListener("resize", () => {
      measure();
      heroTarget = heroProgress();
      heroCurrent = heroTarget;
      renderHero(heroCurrent);
    }, { passive: true });

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        measure();
        renderHero(heroCurrent);
      });
    }

    window.matchMedia("(hover: hover) and (pointer: fine)").matches && stage.addEventListener("pointermove", (event) => {
      if (reducedMotion.matches) return;
      const rect = stage.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 22;
      pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 16;
      requestHero();
    });

    stage.addEventListener("pointerleave", () => {
      pointerX = 0;
      pointerY = 0;
      requestHero();
    });
  }

  window.addEventListener("scroll", () => {
    if (!lenis) onScroll();
  }, { passive: true });

  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) {
      motionObserver?.disconnect();
      showMotionContent();
      stopLenis();
      parallaxItems.forEach((item) => item.style.removeProperty("--py"));
    } else {
      startLenis();
    }
    measure();
    onScroll();
  });

  startLenis();
  onScroll();
})();
