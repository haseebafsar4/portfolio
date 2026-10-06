const waterCanvas = document.querySelector("#water-canvas");
if (waterCanvas) {
  import("./water.js?v=20261006-2")
    .then(({ createWaterEffect }) => createWaterEffect(waterCanvas))
    .catch((error) => console.warn("The interactive water effect could not be loaded.", error));
}

const menuToggle = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#primary-nav");

if (menuToggle && navigation) {
  const setMenuOpen = (open) => {
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.querySelector(".sr-only").textContent = open ? "Close navigation" : "Open navigation";
    navigation.classList.toggle("is-open", open);
  };

  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!navigation.contains(event.target) && !menuToggle.contains(event.target)) {
      setMenuOpen(false);
    }
  });
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealItems = document.querySelectorAll("[data-reveal]");

if (reducedMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

const portrait = document.querySelector("[data-tilt]");
if (portrait && !reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  portrait.addEventListener("pointermove", (event) => {
    const bounds = portrait.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const rotateY = (x - 0.5) * 6;
    const rotateX = (0.5 - y) * 5;
    portrait.style.transform = `perspective(1000px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`;
  });
  portrait.addEventListener("pointerleave", () => {
    portrait.style.transform = "";
  });
}

const programCards = document.querySelectorAll(".program-card");
if (!reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  programCards.forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      card.style.setProperty("--water-x", `${x * 100}%`);
      card.style.setProperty("--water-y", `${y * 100}%`);
      card.style.setProperty("--card-tilt-x", `${(0.5 - y) * 4}deg`);
      card.style.setProperty("--card-tilt-y", `${(x - 0.5) * 5}deg`);
      card.classList.add("is-water-raised");
    });

    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-water-raised");
      card.style.removeProperty("--water-x");
      card.style.removeProperty("--water-y");
      card.style.removeProperty("--card-tilt-x");
      card.style.removeProperty("--card-tilt-y");
    });
  });
}

const year = document.querySelector("#current-year");
if (year) year.textContent = String(new Date().getFullYear());

const showcaseSlider = document.querySelector(".showcase-slider");
if (showcaseSlider) {
  const slides = [...showcaseSlider.querySelectorAll("[data-showcase-slide]")];
  const dots = [...showcaseSlider.querySelectorAll("[data-showcase-to]")];
  const currentIndex = document.querySelector("#showcase-current");
  let activeSlide = 0;

  const showSlide = (index) => {
    activeSlide = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      slide.hidden = slideIndex !== activeSlide;
    });

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeSlide;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-pressed", String(isActive));
    });

    if (currentIndex) currentIndex.textContent = String(activeSlide + 1).padStart(2, "0");
  };

  showcaseSlider.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const directionButton = event.target.closest("[data-showcase-direction]");
    if (directionButton) {
      showSlide(activeSlide + Number(directionButton.getAttribute("data-showcase-direction")));
      return;
    }

    const slideButton = event.target.closest("[data-showcase-to]");
    if (slideButton) showSlide(Number(slideButton.getAttribute("data-showcase-to")));
  });

  showcaseSlider.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showSlide(activeSlide - 1);
    if (event.key === "ArrowRight") showSlide(activeSlide + 1);
  });
}

const bookCarousel = document.querySelector("[data-book-carousel]");
if (bookCarousel) {
  const slides = [...bookCarousel.querySelectorAll("[data-book-slide]")];
  const dots = [...bookCarousel.querySelectorAll("[data-book-to]")];
  const currentIndex = bookCarousel.querySelector("[data-book-current]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeSlide = 0;
  let isInView = false;
  let isInteracting = false;
  let autoplayTimer = 0;

  const stopAutoplay = () => {
    window.clearTimeout(autoplayTimer);
    autoplayTimer = 0;
  };

  const startAutoplay = () => {
    stopAutoplay();
    if (prefersReducedMotion || !isInView || isInteracting || document.hidden) return;

    autoplayTimer = window.setTimeout(() => {
      showBookSlide(activeSlide + 1);
    }, 3000);
  };

  const showBookSlide = (index) => {
    activeSlide = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      slide.hidden = slideIndex !== activeSlide;
      slide.classList.toggle("is-active", slideIndex === activeSlide);
    });

    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeSlide;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-pressed", String(isActive));
    });

    if (currentIndex) currentIndex.textContent = String(activeSlide + 1).padStart(2, "0");
    startAutoplay();
  };

  bookCarousel.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const direction = event.target.closest("[data-book-direction]");
    if (direction) {
      showBookSlide(activeSlide + Number(direction.getAttribute("data-book-direction")));
      return;
    }

    const slideButton = event.target.closest("[data-book-to]");
    if (slideButton) showBookSlide(Number(slideButton.getAttribute("data-book-to")));
  });

  bookCarousel.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") showBookSlide(activeSlide - 1);
    if (event.key === "ArrowRight") showBookSlide(activeSlide + 1);
  });

  bookCarousel.addEventListener("focusin", () => {
    isInteracting = true;
    bookCarousel.classList.add("is-paused");
    stopAutoplay();
  });

  bookCarousel.addEventListener("focusout", (event) => {
    if (event.relatedTarget instanceof Node && bookCarousel.contains(event.relatedTarget)) return;
    isInteracting = false;
    bookCarousel.classList.toggle("is-paused", isInteracting);
    startAutoplay();
  });

  document.addEventListener("visibilitychange", startAutoplay);

  const carouselObserver = new IntersectionObserver(([entry]) => {
    isInView = entry.isIntersecting;
    startAutoplay();
  });
  carouselObserver.observe(bookCarousel);
}
