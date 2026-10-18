(() => {
  const FRAME_COUNT = 101;
  const START_FRAME = 1;
  const EASING = 0.32;
  const AUTOPLAY_DURATION = 5000;
  const PRELOAD_CONCURRENCY = 8;

  const hero = document.querySelector("#hero");
  const stage = document.querySelector(".stage");
  const canvas = document.querySelector(".sequence");
  const poster = document.querySelector(".poster");
  const loading = document.querySelector("#loading");
  const loadingLabel = document.querySelector("#loading-label");
  const loadingProgress = document.querySelector("#loading-progress");
  const siteNav = document.querySelector("#site-nav");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelectorAll(".site-links a");
  const context = canvas?.getContext("2d", { alpha: false });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const motionTargets = [...document.querySelectorAll("[data-motion-reveal]")];
  let motionObserver = null;

  function showMotionContent() {
    document.documentElement.classList.remove("motion-ready");
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
      document.documentElement.classList.add("motion-ready");
    } catch {
      motionObserver?.disconnect();
      showMotionContent();
    }
  }

  setupMotionReveals();

  reducedMotion.addEventListener("change", (event) => {
    if (event.matches) {
      motionObserver?.disconnect();
      showMotionContent();
    }
  });

  function setNavigationOpen(isOpen) {
    siteNav?.classList.toggle("is-open", isOpen);
    navToggle?.setAttribute("aria-expanded", String(isOpen));
    navToggle?.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  }

  navToggle?.addEventListener("click", () => {
    setNavigationOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => setNavigationOpen(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setNavigationOpen(false);
  });

  window.addEventListener("scroll", () => {
    siteNav?.classList.toggle("is-scrolled", window.scrollY > 24);
  }, { passive: true });

  const currentYear = document.querySelector("#current-year");
  if (currentYear) currentYear.textContent = String(new Date().getFullYear());

  if (!hero || !stage || !canvas || !poster || !context) {
    if (loadingLabel) loadingLabel.textContent = "Sequence preview";
    return;
  }

  const frames = new Array(FRAME_COUNT).fill(null);
  let targetFrame = START_FRAME;
  let currentFrame = targetFrame;
  let autoplayStartedAt = 0;
  let isAutoplaying = !reducedMotion.matches && window.scrollY < 1 && (!window.location.hash || window.location.hash === "#hero");
  let lastDrawnFrame = -1;
  let loadedCount = 0;
  let settledCount = 0;
  let nextFrameIndex = 0;
  let isReady = false;
  let preloadStarted = false;
  let canvasWidth = 0;
  let canvasHeight = 0;
  let pixelRatio = 1;
  let animationFrameId = 0;

  if (!reducedMotion.matches) hero.classList.add("is-scrollable");

  function updateProgress() {
    const percent = Math.round((settledCount / FRAME_COUNT) * 100);
    loadingProgress.style.width = `${percent}%`;

    if (percent === 100) {
      loadingLabel.textContent = loadedCount === FRAME_COUNT
        ? "Film ready"
        : "Film ready · using available frames";
    } else if (percent >= 10) {
      loadingLabel.textContent = `Preparing the film · ${percent}%`;
    }
  }

  function settle(index, image) {
    settledCount += 1;
    if (image) {
      frames[index] = image;
      loadedCount += 1;
    }
    updateProgress();

    if (!isReady && (loadedCount >= 2 || settledCount === FRAME_COUNT)) {
      isReady = true;
      currentFrame = targetFrame;
      if (isAutoplaying) autoplayStartedAt = performance.now();
      canvas.classList.remove("is-hidden");
      loading.classList.add("is-hidden");
      if (reducedMotion.matches) {
        drawFrame(START_FRAME - 1);
      } else {
        scheduleDrawLoop();
      }
    }
  }

  function loadFrame(index) {
    return new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        settle(index, image);
        resolve();
      };
      image.onerror = () => {
        settle(index, null);
        resolve();
      };
      image.src = `./frame${String(index + 1).padStart(2, "0")}.png`;
    });
  }

  async function preloadWorker() {
    while (nextFrameIndex < FRAME_COUNT) {
      const index = nextFrameIndex;
      nextFrameIndex += 1;
      await loadFrame(index);
    }
  }

  function startPreloading() {
    if (preloadStarted) return;
    preloadStarted = true;
    canvas.classList.add("is-hidden");
    poster.hidden = false;
    loading.classList.remove("is-hidden");
    for (let worker = 0; worker < PRELOAD_CONCURRENCY; worker += 1) preloadWorker();
  }

  function resizeCanvas() {
    const rect = stage.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvasWidth = Math.max(1, Math.round(rect.width * pixelRatio));
    canvasHeight = Math.max(1, Math.round(rect.height * pixelRatio));

    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      lastDrawnFrame = -1;
      if (isReady && reducedMotion.matches) drawFrame(Math.round(currentFrame) - 1);
    }
  }

  function nearestLoadedFrame(frameIndex) {
    if (frames[frameIndex]) return frameIndex;
    for (let distance = 1; distance < FRAME_COUNT; distance += 1) {
      const before = frameIndex - distance;
      const after = frameIndex + distance;
      if (before >= 0 && frames[before]) return before;
      if (after < FRAME_COUNT && frames[after]) return after;
    }
    return -1;
  }

  function drawFrame(frameIndex) {
    const availableIndex = nearestLoadedFrame(frameIndex);
    if (availableIndex < 0 || availableIndex === lastDrawnFrame) return;

    const image = frames[availableIndex];
    const scale = Math.max(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const isNarrow = stage.clientWidth <= 600;
    const horizontalFocus = isNarrow ? 0.68 : 0.54;
    const x = (canvasWidth - width) * horizontalFocus;
    const y = (canvasHeight - height) / 2;

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(image, x, y, width, height);
    lastDrawnFrame = availableIndex;
    poster.hidden = true;
  }

  function drawLoop() {
    animationFrameId = 0;
    if (!reducedMotion.matches) {
      if (isAutoplaying) {
        const progress = Math.min((performance.now() - autoplayStartedAt) / AUTOPLAY_DURATION, 1);
        targetFrame = START_FRAME + progress * (FRAME_COUNT - START_FRAME);
        if (progress === 1) isAutoplaying = false;
      }

      currentFrame += (targetFrame - currentFrame) * EASING;
      if (Math.abs(targetFrame - currentFrame) < 0.015) currentFrame = targetFrame;
    }

    drawFrame(Math.round(currentFrame) - 1);
    if (!reducedMotion.matches) animationFrameId = requestAnimationFrame(drawLoop);
  }

  function scheduleDrawLoop() {
    if (!animationFrameId && !reducedMotion.matches) {
      animationFrameId = requestAnimationFrame(drawLoop);
    }
  }

  function updateTargetFrame() {
    if (reducedMotion.matches) return;
    if (isAutoplaying && window.scrollY > 0) isAutoplaying = false;
    const scrollableDistance = hero.offsetHeight - window.innerHeight;
    const progress = scrollableDistance > 0
      ? Math.max(0, Math.min(1, -hero.getBoundingClientRect().top / scrollableDistance))
      : 0;
    targetFrame = START_FRAME + progress * (FRAME_COUNT - START_FRAME);
  }

  function handleMotionPreferenceChange(event) {
    if (event.matches) {
      isAutoplaying = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
      hero.classList.remove("is-scrollable");
      targetFrame = START_FRAME;
      currentFrame = START_FRAME;
      resizeCanvas();
      if (isReady) {
        canvas.classList.remove("is-hidden");
        drawFrame(START_FRAME - 1);
      } else {
        canvas.classList.add("is-hidden");
        poster.hidden = false;
      }
    } else {
      hero.classList.add("is-scrollable");
      isAutoplaying = window.scrollY < 1 && (!window.location.hash || window.location.hash === "#hero");
      if (isReady && isAutoplaying) autoplayStartedAt = performance.now();
      updateTargetFrame();
      startPreloading();
      if (isReady) scheduleDrawLoop();
    }
  }

  resizeCanvas();
  updateTargetFrame();
  window.addEventListener("scroll", updateTargetFrame, { passive: true });
  window.addEventListener("resize", () => {
    resizeCanvas();
    updateTargetFrame();
  }, { passive: true });
  reducedMotion.addEventListener("change", handleMotionPreferenceChange);

  if ("ResizeObserver" in window) {
    new ResizeObserver(resizeCanvas).observe(stage);
  }

  if (reducedMotion.matches) {
    canvas.classList.add("is-hidden");
    loading.classList.add("is-hidden");
  } else {
    startPreloading();
  }
})();