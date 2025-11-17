import { gsap } from "gsap";

/** Fade In Animation */
export const fadeIn = (target, delay = 0) => {
  gsap.fromTo(
    target,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 1.2, ease: "power3.out", delay }
  );
};

/** Slide Up Animation */
export const slideUp = (target, delay = 0) => {
  gsap.fromTo(
    target,
    { opacity: 0, y: 60 },
    { opacity: 1, y: 0, duration: 1.3, ease: "power2.out", delay }
  );
};

/** Pop / Scale Animation */
export const popIn = (target, delay = 0) => {
  gsap.fromTo(
    target,
    { opacity: 0, scale: 0.85 },
    { opacity: 1, scale: 1, duration: 0.9, ease: "back.out(1.7)", delay }
  );
};

/** Fade Out Animation */
export const fadeOut = (target) => {
  gsap.to(target, { opacity: 0, duration: 0.6, ease: "power1.inOut" });
};
