/* ========================================
   Triple H — single-page scroll cinematic
   GSAP + ScrollTrigger + Lenis
   ======================================== */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    const hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

    // ====================
    // Lenis smooth scroll (skip on reduced-motion so system defaults win)
    // ====================
    if (typeof Lenis !== 'undefined' && !reduceMotion && hasGSAP) {
      const lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      window.lenis = lenis;
    }

    // ====================
    // Nav — solid background after scrolling past hero
    // ====================
    const nav = document.getElementById('nav');
    if (nav) {
      const onScroll = () => {
        if (window.scrollY > 40) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // ====================
    // Reveal-on-scroll (IntersectionObserver — cheaper than ScrollTrigger for simple fades)
    // ====================
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
      document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    } else {
      // Fallback: show everything
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in-view'));
    }

    // ====================
    // Act 1 — Hero: gently fade + rise the overlay text as the user scrolls out
    // ====================
    if (hasGSAP && !reduceMotion) {
      const heroContent = document.querySelector('.hero__content');
      if (heroContent) {
        gsap.to(heroContent, {
          opacity: 0,
          y: -40,
          ease: 'none',
          scrollTrigger: {
            trigger: '.act--hero',
            start: 'top top',
            end: 'bottom top',
            scrub: 0.5,
          },
        });
      }
      const heroScroll = document.querySelector('.hero__scroll');
      if (heroScroll) {
        gsap.to(heroScroll, {
          opacity: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: '.act--hero',
            start: 'top top',
            end: '10% top',
            scrub: true,
          },
        });
      }
    }

    // ====================
    // Act 2 — Approach: scroll-scrubbed video
    // ScrollTrigger drives video.currentTime as user scrolls through the pinned section.
    // ====================
    const approachSection = document.querySelector('.act--approach');
    const approachVideo = document.querySelector('.approach__video');

    if (hasGSAP && !reduceMotion && approachSection && approachVideo) {
      // iOS/Safari need the video to have "played once" before currentTime updates render.
      // We do a silent play+pause on the first user interaction so the frames become scrubbable.
      let scrubUnlocked = false;
      const unlockScrub = () => {
        if (scrubUnlocked) return;
        scrubUnlocked = true;
        const p = approachVideo.play();
        if (p && typeof p.then === 'function') {
          p.then(() => approachVideo.pause()).catch(() => {});
        }
      };
      ['scroll', 'touchstart', 'pointerdown'].forEach((ev) =>
        window.addEventListener(ev, unlockScrub, { once: true, passive: true })
      );

      const setupScrub = () => {
        if (!approachVideo.duration || !isFinite(approachVideo.duration)) return;
        ScrollTrigger.create({
          trigger: approachSection,
          start: 'top top',
          end: '+=200%',   // pin for 2 viewports of scroll → smooth scrub
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          onUpdate: (self) => {
            const t = self.progress * approachVideo.duration;
            // Only update if changed meaningfully (avoids over-work on some browsers)
            if (Math.abs(approachVideo.currentTime - t) > 0.03) {
              approachVideo.currentTime = t;
            }
          },
        });
      };

      if (approachVideo.readyState >= 1) setupScrub();
      else approachVideo.addEventListener('loadedmetadata', setupScrub, { once: true });
    }

    // ====================
    // Act 4 — Transformation: crossfade "before" out to reveal "after" underneath
    // ====================
    if (hasGSAP && !reduceMotion) {
      const transformSection = document.querySelector('.act--transform');
      const beforeImg = document.querySelector('.transform__img--before');
      const dateSpan = document.getElementById('transformDate');

      if (transformSection && beforeImg) {
        ScrollTrigger.create({
          trigger: transformSection,
          start: 'top top',
          end: '+=180%',
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
          onUpdate: (self) => {
            // Dissolve happens in the first 60% of the pin; last 40% lingers on "after"
            const p = self.progress;
            const dissolve = Math.min(1, p / 0.6);
            beforeImg.style.opacity = String(1 - dissolve);
            if (dateSpan) {
              dateSpan.textContent = p < 0.5 ? 'May 2025' : 'Dec 2025';
            }
          },
        });
      }
    }

    // ====================
    // Contact form (Formspree)
    // If action still has YOUR_FORMSPREE_ID, show a friendly fallback pointing to email.
    // ====================
    const contactForm = document.getElementById('contactForm');
    const formSuccess = document.getElementById('formSuccess');

    if (contactForm && formSuccess) {
      contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const action = contactForm.getAttribute('action') || '';
        const isPlaceholder = !action || action.includes('YOUR_FORMSPREE_ID');

        if (isPlaceholder) {
          formSuccess.textContent = 'Form is not wired yet — meanwhile, please email contact@triple-h.ca directly.';
          formSuccess.style.display = 'block';
          contactForm.reset();
          setTimeout(() => { formSuccess.style.display = 'none'; }, 6000);
          return;
        }

        const btn = contactForm.querySelector('button[type="submit"]');
        const originalText = btn ? btn.textContent : null;
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

        try {
          const res = await fetch(action, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new FormData(contactForm),
          });
          if (res.ok) {
            formSuccess.textContent = 'Thanks for reaching out — we\'ll be in touch shortly.';
            formSuccess.style.display = 'block';
            contactForm.reset();
          } else {
            formSuccess.textContent = 'Something went wrong. Please email contact@triple-h.ca directly.';
            formSuccess.style.display = 'block';
          }
        } catch {
          formSuccess.textContent = 'Network error. Please email contact@triple-h.ca directly.';
          formSuccess.style.display = 'block';
        } finally {
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
          setTimeout(() => { formSuccess.style.display = 'none'; }, 6000);
        }
      });
    }

    // Refresh ScrollTrigger once images/videos settle so pins measure correctly
    if (hasGSAP) {
      window.addEventListener('load', () => ScrollTrigger.refresh());
    }
  });
})();
