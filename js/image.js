document.addEventListener("DOMContentLoaded", () => {
  // Load content from image.html into carousel and gallery
  $("#includedimage1").load("image.html", () => {
    initializeCarousel();
    initializeImageEvents();
  });

  $("#includedimage2").load("image.html", initializeImageEvents);

  const modal = document.getElementById("fullscreen-modal");
  const modalImg = modal.querySelector("img");
  const closeBtn = modal.querySelector(".close-btn");

  let allImages = [];
  let currentIndex = -1;

  // Activate modal on image click
  function initializeImageEvents() {
    allImages = Array.from(document.querySelectorAll(".carousel-track img, .gallery img"));

    allImages.forEach((img, index) => {
      img.addEventListener("click", () => {
        currentIndex = index;
        showImageInModal(currentIndex);
      });
    });
  }

  function showImageInModal(index) {
    if (index < 0 || index >= allImages.length) return;
    modalImg.src = allImages[index].src;
    modal.classList.add("show");
  }

  function closeModal() {
    modal.classList.remove("show");
    modalImg.src = "";
    currentIndex = -1;
  }

  closeBtn.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("show")) return;

    if (e.key === "Escape") {
      closeModal();
    } else if (e.key === "ArrowRight") {
      currentIndex = (currentIndex + 1) % allImages.length;
      showImageInModal(currentIndex);
    } else if (e.key === "ArrowLeft") {
      currentIndex = (currentIndex - 1 + allImages.length) % allImages.length;
      showImageInModal(currentIndex);
    }
  });

  // === Carousel Button Logic ===
  function initializeCarousel() {
    const track = document.querySelector(".carousel-track");
    const prevBtn = document.querySelector(".carousel-btn.prev");
    const nextBtn = document.querySelector(".carousel-btn.next");
    const images = track.querySelectorAll("img");

    let currentIndex = 0;

    function updateCarousel() {
      const imageWidth = images[0].offsetWidth + 10; // + gap
      const offset = -currentIndex * imageWidth;
      track.style.transform = `translateX(${offset}px)`;
    }

    nextBtn.addEventListener("click", () => {
      if (currentIndex < images.length - 1) {
        currentIndex++;
        updateCarousel();
      }
    });

    prevBtn.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });

    window.addEventListener("resize", updateCarousel);
  }
});
