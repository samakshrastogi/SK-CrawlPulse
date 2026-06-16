import { useEffect } from "react";

export function useLandingAnimations() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      return;
    }

    let reverted = false;
    let cleanupAnimations = () => {};

    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([gsapModule, scrollTriggerModule]) => {
      if (reverted) {
        return;
      }

      const gsap = gsapModule.default;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      const smallScreen = window.matchMedia("(max-width: 767px)").matches;
      gsap.registerPlugin(ScrollTrigger);
      const cleanupHoverListeners: Array<() => void> = [];

      const context = gsap.context(() => {
      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          gsap.set(".landing-header,.landing-badge,.landing-title-line,.landing-copy,.landing-form,.landing-secondary,.landing-flow-card", {
            clearProps: "opacity,transform",
          });
        },
      });

      timeline
        .from(".landing-header", { y: smallScreen ? -8 : -14, opacity: 0, duration: smallScreen ? 0.28 : 0.45 })
        .from(".landing-badge", { y: smallScreen ? 8 : 14, opacity: 0, duration: smallScreen ? 0.26 : 0.42 }, "-=0.12")
        .from(".landing-title-line", { y: smallScreen ? 14 : 24, opacity: 0, duration: smallScreen ? 0.34 : 0.58, stagger: smallScreen ? 0.03 : 0.08 }, "-=0.12")
        .from(".landing-copy", { y: smallScreen ? 10 : 16, opacity: 0, duration: smallScreen ? 0.28 : 0.46 }, "-=0.18")
        .from(".landing-form", { y: smallScreen ? 10 : 18, opacity: 0, scale: smallScreen ? 0.99 : 0.98, duration: smallScreen ? 0.3 : 0.48 }, "-=0.16")
        .from(".landing-secondary", { y: smallScreen ? 6 : 12, opacity: 0, duration: smallScreen ? 0.18 : 0.36, stagger: smallScreen ? 0.02 : 0.06 }, "-=0.12")
        .from(".landing-flow-card", { y: smallScreen ? 8 : 18, opacity: 0, duration: smallScreen ? 0.22 : 0.42, stagger: smallScreen ? 0.03 : 0.06 }, "-=0.08");

      if (!smallScreen) {
        timeline.from(".landing-preview", { y: 22, opacity: 0, scale: 0.985, duration: 0.58 }, "-=0.6");
      }

      gsap.delayedCall(smallScreen ? 1.15 : 2.2, () => {
        gsap.set(".landing-form,.landing-secondary,.landing-flow-card", { opacity: 1 });
      });

      gsap.to(".landing-live-dot", {
        scale: 1.35,
        opacity: 0.35,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".landing-scan-bar", {
        xPercent: 145,
        duration: 1.6,
        repeat: -1,
        ease: "power1.inOut",
        stagger: 0.16,
      });

      gsap.to(".landing-preview", {
        y: smallScreen ? -3 : -8,
        duration: 3.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.utils.toArray<HTMLElement>(".landing-reveal").forEach((element) => {
        gsap.from(element, {
          scrollTrigger: {
            trigger: element,
            start: "top 86%",
          },
          y: 28,
          opacity: 0,
          duration: 0.55,
          ease: "power3.out",
        });
      });

      gsap.utils.toArray<HTMLElement>(".landing-hover").forEach((element) => {
        const onEnter = () => {
          gsap.to(element, { y: -3, scale: 1.015, duration: 0.2, ease: "power2.out" });
        };
        const onLeave = () => {
          gsap.to(element, { y: 0, scale: 1, duration: 0.22, ease: "power2.out" });
        };
        const onDown = () => {
          gsap.to(element, { scale: 0.985, duration: 0.08, ease: "power1.out" });
        };
        const onUp = () => {
          gsap.to(element, { scale: 1, duration: 0.16, ease: "power2.out" });
        };

        element.addEventListener("mouseenter", onEnter);
        element.addEventListener("mouseleave", onLeave);
        element.addEventListener("pointerdown", onDown);
        element.addEventListener("pointerup", onUp);
        cleanupHoverListeners.push(() => {
          element.removeEventListener("mouseenter", onEnter);
          element.removeEventListener("mouseleave", onLeave);
          element.removeEventListener("pointerdown", onDown);
          element.removeEventListener("pointerup", onUp);
        });
      });
    });

      cleanupAnimations = () => {
        cleanupHoverListeners.forEach((cleanup) => cleanup());
        context.revert();
      };
    });

    return () => {
      reverted = true;
      cleanupAnimations();
    };
  }, []);
}
