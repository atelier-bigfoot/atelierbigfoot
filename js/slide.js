let boxes = document.querySelectorAll(".togglebox");
let tabs = document.querySelectorAll(".binder-tab");

function syncDocViewportVars() {
  const root = document.documentElement;
  if (!root) return;

  const viewport = window.visualViewport;
  const width = Math.max(0, Math.floor(viewport?.width || window.innerWidth || 0));
  const height = Math.max(0, Math.floor(viewport?.height || window.innerHeight || 0));

  if (width) {
    root.style.setProperty("--doc-width", `${width}px`);
  }
  if (height) {
    root.style.setProperty("--doc-height", `${height}px`);
  }

  syncProjectMobilePanelHeight(height);
}

function syncProjectMobilePanelHeight(viewportHeight = 0) {
  const body = document.body;
  if (!body || !body.matches("body.project-page.project-template")) return;

  if (!window.matchMedia("(max-width: 749px)").matches) {
    body.style.removeProperty("--project-mobile-panel-min-height");
    return;
  }

  const binder = body.querySelector(".slide.binder");
  const nav = binder?.querySelector(".binder-nav");
  const content = binder?.querySelector(".binder-content");
  if (!binder || !nav || !content) return;

  const resolvedViewportHeight = Math.max(
    0,
    Math.floor(viewportHeight || window.visualViewport?.height || window.innerHeight || 0)
  );
  if (!resolvedViewportHeight) return;

  const bodyStyles = window.getComputedStyle(body);
  const binderStyles = window.getComputedStyle(binder);
  const navRect = nav.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const gutter =
    parseFloat(bodyStyles.getPropertyValue("--project-mobile-gutter")) ||
    parseFloat(binderStyles.paddingBottom) ||
    0;
  const gapToContent =
    contentRect.top > navRect.bottom
      ? contentRect.top - navRect.bottom
      : parseFloat(binderStyles.rowGap || binderStyles.gap) || 0;

  // Keep a 1px safety buffer so mobile browsers do not create a tiny page scroll.
  const availableHeight = Math.floor(
    resolvedViewportHeight - navRect.bottom - gapToContent - gutter - 1
  );

  if (availableHeight > 0) {
    body.style.setProperty("--project-mobile-panel-min-height", `${availableHeight}px`);
  }
}

function withCloudinaryWidth(url, width) {
  if (!url || !/res\.cloudinary\.com/i.test(url) || !/\/upload\//i.test(url)) {
    return url;
  }

  const marker = "/upload/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return url;

  const head = url.slice(0, markerIndex + marker.length);
  const tail = url.slice(markerIndex + marker.length);
  const slashIndex = tail.indexOf("/");
  const firstSegment = slashIndex === -1 ? tail : tail.slice(0, slashIndex);
  const remainder = slashIndex === -1 ? "" : tail.slice(slashIndex);

  const hasVersionSegment = /^v\d+$/i.test(firstSegment);
  const hasNoTransformSegment = firstSegment === "";

  if (hasVersionSegment || hasNoTransformSegment) {
    return `${head}f_auto,q_auto,w_${width}/${tail}`;
  }

  const cleanedTransform = firstSegment
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !/^w_\d+$/i.test(part));

  cleanedTransform.push(`w_${width}`);

  return `${head}${cleanedTransform.join(",")}${remainder}`;
}

function buildCloudinarySrcset(url, widths) {
  if (!url) return "";

  const uniqueWidths = Array.from(new Set(widths))
    .filter((w) => Number.isFinite(w) && w > 0)
    .sort((a, b) => a - b);

  return uniqueWidths
    .map((w) => `${withCloudinaryWidth(url, w)} ${w}w`)
    .join(", ");
}

function setIntrinsicSize(img) {
  if (!img || img.dataset.intrinsicBound === "1") return;

  const applyIntrinsic = () => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    if (!img.hasAttribute("width")) {
      img.setAttribute("width", String(img.naturalWidth));
    }
    if (!img.hasAttribute("height")) {
      img.setAttribute("height", String(img.naturalHeight));
    }
  };

  if (img.complete) {
    applyIntrinsic();
  }

  img.addEventListener(
    "load",
    () => {
      applyIntrinsic();
    },
    { once: true }
  );

  img.dataset.intrinsicBound = "1";
}

function enhanceResponsiveImage(img, options = {}) {
  if (!img || img.nodeType !== 1) return;

  const sizes = options.sizes || "(max-width: 749px) 95vw, 50vw";
  const widths = options.widths || [700, 1000, 1400, 1800];
  const baseUrl = options.baseUrl || img.currentSrc || img.src || "";

  if (!img.getAttribute("sizes")) {
    img.setAttribute("sizes", sizes);
  }

  if (!img.getAttribute("srcset")) {
    const srcset = buildCloudinarySrcset(baseUrl, widths);
    if (srcset) {
      img.setAttribute("srcset", srcset);
    }
  }

  if (!img.getAttribute("decoding")) {
    img.setAttribute("decoding", "async");
  }

  if (!img.getAttribute("loading")) {
    img.setAttribute("loading", "eager");
  }

  setIntrinsicSize(img);
}

function applyResponsiveInfoMedia(root = document) {
  const targets = root.querySelectorAll("#i1 #includedContent .c img, #i1 #includedContent .c .card__image");
  if (!targets.length) return;

  targets.forEach((img) => {
    enhanceResponsiveImage(img, {
      sizes: "(max-width: 749px) 95vw, 50vw",
      widths: [700, 1000, 1400, 1800],
    });
  });
}

function syncInfoBandVars() {
  const root = document.documentElement;
  const wrapper = document.querySelector("#i1 #includedContent > .wrapper");
  if (!root || !wrapper) return;

  const titleBand = wrapper.querySelector(":scope > .a");
  const metaBand = wrapper.querySelector(":scope > .b");
  const captionBand = wrapper.querySelector(":scope > .d");

  if (titleBand) {
    const titleHeight = Math.ceil(titleBand.getBoundingClientRect().height);
    if (titleHeight > 0) {
      root.style.setProperty("--info-band-top-height", `${titleHeight}px`);
    }
  }

  const bottomHeight = Math.ceil(
    Math.max(
      metaBand ? metaBand.getBoundingClientRect().height : 0,
      captionBand ? captionBand.getBoundingClientRect().height : 0
    )
  );

  if (bottomHeight > 0) {
    root.style.setProperty("--info-band-bottom-height", `${bottomHeight}px`);
  }
}

function attachInfoScrollIndicator(root = document) {
  const panel = root.querySelector("#i1 #includedContent > .wrapper > .f");
  if (!panel) return;

  const wrapper = panel.parentElement;
  if (!wrapper) return;

  let rail = wrapper.querySelector(":scope > .info-scrollbar");
  let thumb = rail ? rail.querySelector(".info-scrollbar__thumb") : null;

  if (!rail) {
    rail = document.createElement("div");
    rail.className = "info-scrollbar";
    thumb = document.createElement("div");
    thumb.className = "info-scrollbar__thumb";
    rail.appendChild(thumb);
    wrapper.appendChild(rail);
  }

  const update = () => {
    const visible = panel.clientHeight;
    const total = panel.scrollHeight;
    const overflow = total - visible;
    const scrollable = overflow > 10;

    panel.classList.toggle("is-scrollable", scrollable);
    rail.classList.toggle("is-visible", scrollable);
    if (!thumb) return;

    if (!scrollable) {
      thumb.style.height = "";
      thumb.style.transform = "translateY(0)";
      return;
    }

    const ratio = visible / total;
    const thumbHeight = Math.max(44, Math.round(visible * ratio));
    const maxTravel = Math.max(0, visible - thumbHeight);
    const maxScroll = Math.max(1, total - visible);
    const y = Math.round((panel.scrollTop / maxScroll) * maxTravel);

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${y}px)`;
  };

  if (panel.dataset.scrollIndicatorBound !== "1") {
    panel.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    panel.dataset.scrollIndicatorBound = "1";
  }

  requestAnimationFrame(update);
}

function cloneProjectTitleMarkup(options = {}) {
  const source = document.querySelector("#i1 #includedContent .info_title");
  if (!source) return null;

  const clone = source.cloneNode(true);
  const { removeIndex = false, removeSubtitle = false } = options;
  const isTitleOnly = removeIndex && removeSubtitle;
  const projectIndex = clone.querySelector(".project_index");
  const projectSubtitle = clone.querySelector(".project_subtitle");
  if (removeIndex && projectIndex) {
    projectIndex.remove();
  }
  if (removeSubtitle && projectSubtitle) {
    projectSubtitle.remove();
  }

  clone.classList.toggle("info_title--title-only", isTitleOnly);

  return clone;
}

function syncProjectTitleOverlays() {
  const strippedTitleMarkup = cloneProjectTitleMarkup({
    removeIndex: true,
    removeSubtitle: true,
  });
  const imageHost = document.getElementById("i3");
  const canvasHost = document.getElementById("i2");

  if (imageHost) {
    let imageTitleHost = imageHost.querySelector(".image-split__title");
    if (!imageTitleHost) {
      imageTitleHost = document.createElement("div");
      imageTitleHost.className = "image-split__title";
      imageHost.appendChild(imageTitleHost);
    }

    imageTitleHost.innerHTML = "";
    if (strippedTitleMarkup) {
      imageTitleHost.appendChild(strippedTitleMarkup.cloneNode(true));
    }
  }

  if (canvasHost) {
    let canvasTitleHost = canvasHost.querySelector(".canvas-title-overlay");
    if (!canvasTitleHost) {
      canvasTitleHost = document.createElement("div");
      canvasTitleHost.className = "canvas-title-overlay";
      canvasHost.appendChild(canvasTitleHost);
    }

    canvasTitleHost.innerHTML = "";
    if (strippedTitleMarkup) {
      canvasTitleHost.appendChild(strippedTitleMarkup.cloneNode(true));
    }
  }
}

function enforceProjectTemplateDesktopLayout() {
  const legacyStyle = document.getElementById("project-template-desktop-restore");
  if (legacyStyle) {
    legacyStyle.remove();
  }
}

function observeIncludedContent() {
  const host = document.getElementById("includedContent");
  if (!host || host.dataset.responsiveObserverBound === "1") return;

  const observer = new MutationObserver(() => {
    applyResponsiveInfoMedia(host);
    syncProjectTitleOverlays();
    attachInfoScrollIndicator(host);
    enforceProjectTemplateDesktopLayout();
  });

  observer.observe(host, { childList: true, subtree: true });
  host.dataset.responsiveObserverBound = "1";
}

async function loadIncludedContent() {
  const host = document.getElementById("includedContent");
  if (!host || host.dataset.loadState === "loading" || host.dataset.loadState === "loaded") {
    return;
  }

  host.dataset.loadState = "loading";

  try {
    const response = await fetch("text.html", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Failed to load text.html (${response.status})`);
    }

    host.innerHTML = await response.text();
    host.dataset.loadState = "loaded";
    applyResponsiveInfoMedia(host);
    syncInfoBandVars();
    syncProjectTitleOverlays();
    attachInfoScrollIndicator(host);
    enforceProjectTemplateDesktopLayout();
    window.dispatchEvent(new Event("resize"));
  } catch (error) {
    console.error("[slide] text.html load error:", error);
    host.dataset.loadState = "error";
  }
}

function setActive(targetId) {
  if (!targetId) return;

  boxes.forEach((tbox) => tbox.classList.remove("active"));
  tabs.forEach((tab) => tab.classList.remove("active"));

  const target = document.getElementById(targetId);
  if (target) target.classList.add("active");

  const tab = document.querySelector(`.binder-tab[data-target="${targetId}"]`);
  if (tab) tab.classList.add("active");

  requestAnimationFrame(() => {
    syncDocViewportVars();
    applyResponsiveInfoMedia();
    syncInfoBandVars();
    enforceProjectTemplateDesktopLayout();
    window.dispatchEvent(new Event("resize"));
  });
}

function start() {
  boxes = document.querySelectorAll(".togglebox");
  tabs = document.querySelectorAll(".binder-tab");

  if (tabs.length) {
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.stopPropagation();
        setActive(tab.dataset.target);
      });
    });
  }

  boxes.forEach((box) => {
    box.addEventListener("click", (e) => {
      if (tabs.length) {
        if (box.classList.contains("active")) {
          return;
        }
        if (e.target.closest(".binder-tab")) {
          return;
        }
        setActive(box.id);
      } else {
        boxes.forEach((tbox) => tbox.classList.remove("active"));
        box.classList.toggle("active");
      }
    });
  });

  syncDocViewportVars();
  loadIncludedContent();
  applyResponsiveInfoMedia();
  syncInfoBandVars();
  syncProjectTitleOverlays();
  observeIncludedContent();
  enforceProjectTemplateDesktopLayout();
}

  window.__syncDocViewportVars = syncDocViewportVars;
window.__cloudinaryWidthUrl = withCloudinaryWidth;
window.__cloudinarySrcset = buildCloudinarySrcset;
window.__enhanceResponsiveImage = enhanceResponsiveImage;
window.__syncInfoBandVars = syncInfoBandVars;
window.__enforceProjectTemplateDesktopLayout = enforceProjectTemplateDesktopLayout;
window.start = start;

window.addEventListener(
  "resize",
  () => {
    syncDocViewportVars();
    enforceProjectTemplateDesktopLayout();
  },
  { passive: true }
);
window.addEventListener(
  "orientationchange",
  () => {
    syncDocViewportVars();
    enforceProjectTemplateDesktopLayout();
  },
  { passive: true }
);
window.addEventListener(
  "load",
  () => {
    syncDocViewportVars();
    enforceProjectTemplateDesktopLayout();
  },
  { passive: true }
);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncDocViewportVars, { passive: true });
}

document.addEventListener("DOMContentLoaded", () => {
  syncDocViewportVars();
  loadIncludedContent();
  applyResponsiveInfoMedia();
  syncInfoBandVars();
  syncProjectTitleOverlays();
  observeIncludedContent();
  enforceProjectTemplateDesktopLayout();
});
