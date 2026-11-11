document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("fullscreen-modal");
  const modalImg = document.getElementById("fullscreen-img");
  const closeBtn = modal ? modal.querySelector(".close-btn") : null;
  let modalMedia = modal ? modal.querySelector(".modal-media") : null;

  if (modal && !modalMedia && modalImg) {
    modalMedia = document.createElement("div");
    modalMedia.className = "modal-media";
    modal.insertBefore(modalMedia, modalImg);
    modalMedia.appendChild(modalImg);
  }

  let mediaItems = [];
  let thumbButtons = [];
  let currentSlideIndex = 0;
  let currentModalIndex = -1;

  const getCloudinaryWidthUrl = window.__cloudinaryWidthUrl || ((url) => url);
  const buildCloudinarySrcset =
    window.__cloudinarySrcset ||
    ((url, widths) => widths.map((w) => `${url} ${w}w`).join(", "));

  function setIntrinsicDimensions(img) {
    if (!img || img.dataset.intrinsicBound === "1") return;

    const apply = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      if (!img.hasAttribute("width")) img.setAttribute("width", String(img.naturalWidth));
      if (!img.hasAttribute("height")) img.setAttribute("height", String(img.naturalHeight));
    };

    if (img.complete) {
      apply();
    }

    img.addEventListener(
      "load",
      () => {
        apply();
      },
      { once: true }
    );

    img.dataset.intrinsicBound = "1";
  }

  function applyResponsiveAttrs(img, options = {}) {
    if (!img) return;

    const baseUrl = options.baseUrl || img.currentSrc || img.src || "";
    const widths = options.widths || [700, 1000, 1400, 1800];
    const sizes = options.sizes || "(max-width: 749px) calc(100vw - 24px), 88vw";

    if (!img.getAttribute("srcset") && baseUrl) {
      const srcset = buildCloudinarySrcset(baseUrl, widths);
      if (srcset) {
        img.setAttribute("srcset", srcset);
      }
    }

    if (!img.getAttribute("sizes")) {
      img.setAttribute("sizes", sizes);
    }

    if (!img.getAttribute("decoding")) {
      img.setAttribute("decoding", "async");
    }

    if (options.loading && !img.getAttribute("loading")) {
      img.setAttribute("loading", options.loading);
    }

    if (options.fetchPriority && !img.getAttribute("fetchpriority")) {
      img.setAttribute("fetchpriority", options.fetchPriority);
    }

    setIntrinsicDimensions(img);
  }

  function isMediaMetaElement(el) {
    return Boolean(
      el &&
        el.matches(
          ".media-note, .media-meta, .image-note, .image-meta, .media-details, .media-caption, figcaption"
        )
    );
  }

  function collectMediaItems(temp) {
    const items = [];
    const claimedImgs = new Set();
    const claimedMeta = new Set();

    const pushItem = (img, metaEl) => {
      if (!img) return;

      const src = img.getAttribute("src") || img.dataset.full || "";
      const fullSrc = img.dataset.full || src;
      const thumbSrc = img.dataset.thumb || src || fullSrc;

      if (!src && !fullSrc && !thumbSrc) return;

      items.push({
        src,
        fullSrc,
        thumbSrc,
        alt: img.getAttribute("alt") || `Vue ${items.length + 1}`,
        className: img.className || "card__image",
        noteHtml: metaEl ? metaEl.innerHTML.trim() : "",
      });
    };

    temp.querySelectorAll(".media-entry").forEach((entry) => {
      const img = entry.querySelector("img");
      const metaEl = entry.querySelector(
        ".media-note, .media-meta, .image-note, .image-meta, .media-details, .media-caption, figcaption"
      );

      if (img) {
        claimedImgs.add(img);
      }
      if (metaEl) {
        claimedMeta.add(metaEl);
      }

      pushItem(img, metaEl);
    });

    Array.from(temp.querySelectorAll("img")).forEach((img) => {
      if (claimedImgs.has(img)) return;

      let metaEl = null;
      const next = img.nextElementSibling;
      if (isMediaMetaElement(next) && !claimedMeta.has(next)) {
        metaEl = next;
        claimedMeta.add(next);
      }

      pushItem(img, metaEl);
      claimedImgs.add(img);
    });

    return items;
  }

  function createHeroImage(item, index) {
    const img = document.createElement("img");
    const fullSrc = item.fullSrc || item.src;
    const heroSrc = getCloudinaryWidthUrl(fullSrc, 1400) || fullSrc;
    const fullHiRes = getCloudinaryWidthUrl(fullSrc, 2200) || fullSrc;

    img.className = item.className || "card__image";
    img.alt = item.alt;
    img.dataset.index = String(index);

    if (heroSrc) {
      img.src = heroSrc;
    }
    if (fullHiRes) {
      img.dataset.full = fullHiRes;
    }
    

    applyResponsiveAttrs(img, {
      baseUrl: fullSrc,
      widths: [700, 1000, 1400, 1800, 2200],
      sizes: "(max-width: 749px) calc(100vw - 24px), (max-width: 1139px) calc(100vw - 48px), 72vw",
      loading: index === 0 ? "eager" : "lazy",
      fetchPriority: index === 0 ? "high" : "auto",
    });

    return img;
  }

  function createThumbButton(item, index) {
    const button = document.createElement("button");
    const img = document.createElement("img");
    const indexTag = document.createElement("span");

    button.type = "button";
    button.className = "gallery__item";
    button.dataset.index = String(index);
    button.dataset.cursor = "pointer";
    button.setAttribute("aria-label", `Afficher ${item.alt}`);
    if (item.noteHtml) {
      button.classList.add("has-meta");
    }

    const thumbSrc = item.thumbSrc || item.src || item.fullSrc;
    if (thumbSrc) {
      img.src = thumbSrc;
    }
    img.alt = item.alt;
    img.dataset.full = item.fullSrc || item.src || thumbSrc;

    applyResponsiveAttrs(img, {
      baseUrl: thumbSrc || item.fullSrc || item.src,
      widths: [240, 450, 700],
      sizes: "(max-width: 749px) 30vw, 12vw",
      loading: "lazy",
    });

    indexTag.className = "gallery__item-index";
    indexTag.textContent = String(index + 1).padStart(2, "0");

    button.appendChild(img);
    button.appendChild(indexTag);

    button.addEventListener("click", () => {
      if (typeof window.__carouselGoto === "function") {
        window.__carouselGoto(index);
      }
    });

    button.addEventListener("mouseenter", () => {
      const preload = item.fullSrc || item.src;
      if (!preload) return;
      const pre = new Image();
      pre.src = preload;
    });

    return button;
  }

  function renderMeta(index) {
    const metaHost = document.getElementById("includedimage3");
    const item = mediaItems[index];

    if (!metaHost) return;

    if (!item || !item.noteHtml) {
      metaHost.classList.add("is-empty");
      metaHost.innerHTML = "";
      return;
    }

    metaHost.classList.remove("is-empty");
    metaHost.innerHTML = `<div class="image-split__meta-body">${item.noteHtml}</div>`;
  }

  function updateThumbState(index) {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    thumbButtons.forEach((button, buttonIndex) => {
      const isActive = buttonIndex === index;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    const activeButton = thumbButtons[index];
    if (activeButton) {
      activeButton.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }

  function decodeOrLoad(imgEl) {
    if (imgEl.complete && imgEl.naturalWidth > 0) {
      return imgEl.decode ? imgEl.decode().catch(() => {}) : Promise.resolve();
    }

    return new Promise((resolve) => {
      imgEl.onload = () => {
        if (imgEl.decode) imgEl.decode().catch(() => {}).finally(resolve);
        else resolve();
      };
      imgEl.onerror = () => resolve();
    });
  }

  function fitBox(aspect) {
    const maxW = Math.floor(window.innerWidth * 0.9);
    const maxH = Math.floor(window.innerHeight * 0.9);

    let w = maxW;
    let h = Math.floor(w / aspect);

    if (h > maxH) {
      h = maxH;
      w = Math.floor(h * aspect);
    }

    return { w, h };
  }

  function updateModalBoxSize() {
    if (!modal || !modalMedia || !modalImg) return;
    if (!modal.classList.contains("show")) return;
    if (!modalImg.naturalWidth || !modalImg.naturalHeight) return;

    const aspect = modalImg.naturalWidth / modalImg.naturalHeight || 1;
    const { w, h } = fitBox(aspect);
    modalMedia.style.width = `${w}px`;
    modalMedia.style.height = `${h}px`;
  }

  async function showImageInModal(index) {
    if (!modal || !modalMedia || !modalImg) return;
    if (index < 0 || index >= mediaItems.length) return;

    const item = mediaItems[index];
    const thumbSrc =
      getCloudinaryWidthUrl(item.thumbSrc || item.fullSrc || item.src, 1000) ||
      item.thumbSrc ||
      item.fullSrc ||
      item.src;
    const fullSrc =
      getCloudinaryWidthUrl(item.fullSrc || item.src, 2200) || item.fullSrc || item.src;

    currentModalIndex = index;
    modalImg.classList.remove("is-full");
    modalImg.classList.add("is-placeholder");

    modalMedia.style.width = "";
    modalMedia.style.height = "";

    modalImg.src = thumbSrc;
    modal.classList.add("show");

    await decodeOrLoad(modalImg);

    const aspect = modalImg.naturalWidth / modalImg.naturalHeight || 1;
    const { w, h } = fitBox(aspect);
    modalMedia.style.width = `${w}px`;
    modalMedia.style.height = `${h}px`;

    const pre = new Image();
    pre.decoding = "async";

    const fullReady = new Promise((resolve) => {
      pre.onload = () => {
        if (pre.decode) pre.decode().catch(() => {}).finally(resolve);
        else resolve();
      };
      pre.onerror = () => resolve();
    });

    pre.src = fullSrc;

    await Promise.race([fullReady, new Promise((resolve) => setTimeout(resolve, 4000))]);

    if (!modal.classList.contains("show") || index !== currentModalIndex) return;

    modalImg.src = fullSrc;
    modalImg.setAttribute(
      "srcset",
      buildCloudinarySrcset(fullSrc, [1000, 1400, 1800, 2200, 2600])
    );
    modalImg.setAttribute("sizes", "90vw");

    requestAnimationFrame(() => {
      modalImg.classList.remove("is-placeholder");
      modalImg.classList.add("is-full");
    });
  }

  function closeModal() {
    if (!modal || !modalImg || !modalMedia) return;

    modal.classList.remove("show");
    modalImg.src = "";
    modalImg.classList.remove("is-placeholder", "is-full");
    modalMedia.style.width = "";
    modalMedia.style.height = "";
    currentModalIndex = -1;
  }

  function initializeCarousel() {
    const track = document.querySelector(".carousel-track");
    const prevBtn = document.querySelector(".carousel-btn.prev");
    const nextBtn = document.querySelector(".carousel-btn.next");
    const images = track ? Array.from(track.querySelectorAll("img")) : [];
    const counter = document.querySelector(".carousel-counter");
    let counterCurrent = counter ? counter.querySelector(".carousel-count.current") : null;
    let counterTotal = counter ? counter.querySelector(".carousel-count.total") : null;
    const container = document.querySelector(".carousel-container");
    const isSplitLayout = Boolean(document.querySelector(".image-split"));
    let idx = 0;
    let pendingLoadToken = 0;
    let wheelLock = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchDeltaX = 0;
    let touchDeltaY = 0;
    let touchTracking = false;
    let touchSwipeActive = false;
    let suppressClickUntil = 0;

    if (isSplitLayout && images.length) {
      images.forEach((img, imageIndex) => {
        img.style.display = imageIndex === idx ? "block" : "none";
      });
    }

    const ensureCounterMarkup = () => {
      if (!counter) return;
      if (counterCurrent && counterTotal) return;
      counter.innerHTML =
        '<span class="carousel-count current">00</span><span class="carousel-sep" aria-hidden="true"></span><span class="carousel-count total">00</span>';
      counterCurrent = counter.querySelector(".carousel-count.current");
      counterTotal = counter.querySelector(".carousel-count.total");
    };

    function updateCarousel() {
      if (!images.length) return;

      currentSlideIndex = idx;

      if (isSplitLayout) {
        const targetIndex = idx;
        const targetImg = images[targetIndex];
        const token = ++pendingLoadToken;

        const commitSwap = () => {
          if (token !== pendingLoadToken) return;
          if (container) container.classList.add("is-fading");

          setTimeout(() => {
            if (token !== pendingLoadToken) return;

            images.forEach((img, imageIndex) => {
              img.style.display = imageIndex === targetIndex ? "block" : "none";
            });

            if (track) {
              track.style.transform = "translateX(0px)";
            }

            if (container) {
              container.classList.remove("is-fading");
            }

            updateThumbState(targetIndex);
            renderMeta(targetIndex);
          }, 180);
        };

        if (targetImg && targetImg.complete && targetImg.naturalWidth > 0) {
          commitSwap();
        } else if (targetImg) {
          if (container) container.classList.remove("is-fading");
          targetImg.loading = "eager";
          targetImg.addEventListener("load", commitSwap, { once: true });
          targetImg.addEventListener("error", commitSwap, { once: true });
        }
      } else {
        const w = images[0].getBoundingClientRect().width + 10;
        if (track) {
          track.style.transform = `translateX(${-idx * w}px)`;
        }
      }

      ensureCounterMarkup();
      if (counterCurrent && counterTotal) {
        counterCurrent.textContent = String(idx + 1).padStart(2, "0");
        counterTotal.textContent = String(images.length).padStart(2, "0");
      }
    }

    window.__carouselGoto = (index) => {
      if (!images.length) return;
      idx = ((index % images.length) + images.length) % images.length;
      updateCarousel();
    };

    const stepCarousel = (delta) => {
      if (!images.length) return;
      idx = (idx + delta + images.length) % images.length;
      updateCarousel();
    };

    const resetTouchState = () => {
      touchStartX = 0;
      touchStartY = 0;
      touchDeltaX = 0;
      touchDeltaY = 0;
      touchTracking = false;
      touchSwipeActive = false;
    };

    const bindTouchNavigation = (target) => {
      if (!target) return;

      target.addEventListener(
        "touchstart",
        (e) => {
          if (window.innerWidth >= 750) return;
          if (!images.length) return;
          if (modal && modal.classList.contains("show")) return;
          if (e.touches.length !== 1) {
            resetTouchState();
            return;
          }

          const touch = e.touches[0];
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
          touchDeltaX = 0;
          touchDeltaY = 0;
          touchTracking = true;
          touchSwipeActive = false;
        },
        { passive: true }
      );

      target.addEventListener(
        "touchmove",
        (e) => {
          if (!touchTracking || window.innerWidth >= 750) return;
          if (e.touches.length !== 1) {
            resetTouchState();
            return;
          }

          const touch = e.touches[0];
          touchDeltaX = touch.clientX - touchStartX;
          touchDeltaY = touch.clientY - touchStartY;

          if (!touchSwipeActive) {
            const absX = Math.abs(touchDeltaX);
            const absY = Math.abs(touchDeltaY);

            if (absY > 12 && absY > absX) {
              resetTouchState();
              return;
            }

            if (absX > 12 && absX > absY) {
              touchSwipeActive = true;
            }
          }

          if (touchSwipeActive) {
            e.preventDefault();
          }
        },
        { passive: false }
      );

      target.addEventListener(
        "touchend",
        () => {
          if (!touchTracking || window.innerWidth >= 750) {
            resetTouchState();
            return;
          }

          const absX = Math.abs(touchDeltaX);
          const absY = Math.abs(touchDeltaY);

          if (touchSwipeActive && absX > 44 && absX > absY) {
            suppressClickUntil = Date.now() + 400;
            stepCarousel(touchDeltaX < 0 ? 1 : -1);
          }

          resetTouchState();
        },
        { passive: true }
      );

      target.addEventListener(
        "touchcancel",
        () => {
          resetTouchState();
        },
        { passive: true }
      );
    };

    const bindWheelNavigation = (target) => {
      if (!target) return;

      target.addEventListener(
        "wheel",
        (e) => {
          if (window.innerWidth < 750) return;
          if (!images.length) return;
          if (modal && modal.classList.contains("show")) return;
          if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;

          e.preventDefault();

          if (wheelLock) return;
          wheelLock = true;
          window.setTimeout(() => {
            wheelLock = false;
          }, 140);

          stepCarousel(e.deltaY > 0 ? 1 : -1);
        },
        { passive: false }
      );
    };

    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        stepCarousel(1);
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        stepCarousel(-1);
      });
    }

    if (container) {
      container.addEventListener("click", (e) => {
        if (!images.length) return;
        if (modal && modal.classList.contains("show")) return;
        if (e.target.closest(".image-hero-controls, .carousel-btn")) return;
        if (Date.now() < suppressClickUntil) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x < rect.width / 2) stepCarousel(-1);
        else stepCarousel(1);
      });
    }

    bindWheelNavigation(container);
    bindTouchNavigation(container);

    document.addEventListener("keydown", (e) => {
      if (modal && modal.classList.contains("show")) return;
      const i3 = document.getElementById("i3");
      if (!i3 || !i3.classList.contains("active")) return;

      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();

      const active = document.activeElement;
      if (active && active.classList && active.classList.contains("binder-tab")) {
        active.blur();
      }

      if (e.key === "ArrowRight") {
        stepCarousel(1);
      } else {
        stepCarousel(-1);
      }
    });

    window.addEventListener("resize", updateCarousel);
    updateCarousel();
  }

  fetch("image.html")
    .then((r) => r.text())
    .then((html) => {
      const temp = document.createElement("div");
      temp.innerHTML = html;

      mediaItems = collectMediaItems(temp);

      const carouselHost = document.getElementById("includedimage1");
      const metaHost = document.getElementById("includedimage3");

      if (!carouselHost || !metaHost) return;

      carouselHost.innerHTML = "";
      metaHost.innerHTML = "";

      mediaItems.forEach((item, index) => {
        carouselHost.appendChild(createHeroImage(item, index));
      });

      thumbButtons = [];

      initializeCarousel();
      updateThumbState(0);
      renderMeta(0);
      if (typeof window.__enforceProjectTemplateDesktopLayout === "function") {
        window.__enforceProjectTemplateDesktopLayout();
      }
    })
    .catch((err) => console.error("Failed to load image.html:", err));

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }

  document.addEventListener("keydown", (e) => {
    if (!modal || !modal.classList.contains("show")) return;

    if (e.key === "Escape") {
      closeModal();
    } else if (e.key === "ArrowRight") {
      currentModalIndex = (currentModalIndex + 1) % mediaItems.length;
      showImageInModal(currentModalIndex);
    } else if (e.key === "ArrowLeft") {
      currentModalIndex = (currentModalIndex - 1 + mediaItems.length) % mediaItems.length;
      showImageInModal(currentModalIndex);
    }
  });

  window.addEventListener(
    "resize",
    () => {
      if (typeof window.__syncDocViewportVars === "function") {
        window.__syncDocViewportVars();
      }
      updateModalBoxSize();
    },
    { passive: true }
  );
});
