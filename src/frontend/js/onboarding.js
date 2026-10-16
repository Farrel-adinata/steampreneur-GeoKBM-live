"use strict";

const ONBOARDING_KEY = "geokbm_onboarding_done";
const LAST_SLIDE = 2;
const slidesTrack = document.getElementById("slidesTrack");
const onboarding = document.getElementById("onboarding");
const nextButton = document.getElementById("nextButton");
const skipButton = document.getElementById("skipButton");
const dots = [...document.querySelectorAll("[data-slide]")];
let currentSlide = 0;
let touchStartX = 0;
let touchDeltaX = 0;

function showSlide(index, animate = true) {
  currentSlide = Math.max(0, Math.min(index, LAST_SLIDE));
  slidesTrack.style.transition = animate ? "" : "none";
  const offset = currentSlide === 0 ? 0 : -currentSlide * 100;
  slidesTrack.style.transform = `translateX(${offset}%)`;
  dots.forEach((dot, dotIndex) => {
    const active = dotIndex === currentSlide;
    dot.classList.toggle("active", active);
    if (active) dot.setAttribute("aria-current", "step");
    else dot.removeAttribute("aria-current");
  });
  const isLast = currentSlide === LAST_SLIDE;
  nextButton.hidden = isLast;
  skipButton.hidden = isLast;
}

function finishIntroduction() {
  localStorage.setItem(ONBOARDING_KEY, "1");
  showSlide(LAST_SLIDE);
}

nextButton.addEventListener("click", () => showSlide(currentSlide + 1));
skipButton.addEventListener("click", finishIntroduction);
dots.forEach(dot => dot.addEventListener("click", () => showSlide(Number(dot.dataset.slide))));

onboarding.addEventListener("touchstart", event => {
  if (!event.touches.length) return;
  touchStartX = event.touches[0].clientX;
  touchDeltaX = 0;
}, { passive: true });
onboarding.addEventListener("touchmove", event => {
  if (!event.touches.length) return;
  touchDeltaX = event.touches[0].clientX - touchStartX;
}, { passive: true });
onboarding.addEventListener("touchend", () => {
  const threshold = onboarding.clientWidth * 0.18;
  if (touchDeltaX < -threshold) showSlide(currentSlide + 1);
  if (touchDeltaX > threshold) showSlide(currentSlide - 1);
  touchDeltaX = 0;
});

if (localStorage.getItem(ONBOARDING_KEY) === "1") {
  showSlide(LAST_SLIDE, false);
} else {
  showSlide(0, false);
}
