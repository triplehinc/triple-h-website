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
    // JOURNEY — one pinned section, 5 beats, Belgrade-Arbor style layered reveal.
    //
    // Pin lasts +=500% of scroll (5 extra viewports of scrolling while pinned).
    // Scroll progress 0→1 is divided into 5 beats:
    //   [0.00, 0.20]  01 Approach    — video scrubs 0 → end
    //   [0.20, 0.35]  02 Arrive      — exterior scales up + fades to dark
    //   [0.35, 0.55]  03 Kitchen     — finished kitchen fades in on top
    //   [0.55, 0.75]  04 Living Room — crossfades to living room
    //   [0.75, 1.00]  05 Transform   — 7-frame construction time-lapse
    // ====================
    const journeySection    = document.querySelector('.act--journey');
    const journeyVideo      = journeySection && journeySection.querySelector('.journey__video');
    const layerExterior     = journeySection && journeySection.querySelector('.journey__layer--exterior');
    const layerKitchen      = journeySection && journeySection.querySelector('.journey__layer--kitchen');
    const layerLiving       = journeySection && journeySection.querySelector('.journey__layer--living');
    const timelapseWrap     = journeySection && journeySection.querySelector('.journey__timelapse');
    const timelapseFrames   = journeySection ? Array.from(journeySection.querySelectorAll('.journey__frame')) : [];
    const captions          = journeySection ? journeySection.querySelectorAll('.journey__caption') : [];
    const progressItems     = journeySection ? journeySection.querySelectorAll('.journey__progress li') : [];
    const journeyDate       = document.getElementById('journeyDate');

    // Format YYYYMMDD → "MON D, YYYY" for the time-lapse date label
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    function formatDate(d) {
      const y = d.slice(0, 4);
      const m = parseInt(d.slice(4, 6), 10) - 1;
      const day = parseInt(d.slice(6, 8), 10);
      return `${MONTHS[m]} ${day}, ${y}`;
    }

    if (hasGSAP && !reduceMotion && journeySection && journeyVideo) {
      // iOS/Safari: video needs to have "played once" before currentTime updates render
      let scrubUnlocked = false;
      const unlockScrub = () => {
        if (scrubUnlocked) return;
        scrubUnlocked = true;
        const p = journeyVideo.play();
        if (p && typeof p.then === 'function') {
          p.then(() => journeyVideo.pause()).catch(() => {});
        }
      };
      ['scroll', 'touchstart', 'pointerdown'].forEach((ev) =>
        window.addEventListener(ev, unlockScrub, { once: true, passive: true })
      );

      // Utility: clamp an un-clamped t (anywhere in ℝ) into [0, 1]
      const clamp01 = (t) => Math.max(0, Math.min(1, t));
      // Utility: fade range (returns 0 before `start`, 1 after `end`, linear in between)
      const fade = (p, start, end) => clamp01((p - start) / (end - start));

      // Track current beat to avoid redundant DOM writes on caption/progress swaps
      let activeBeat = 1;
      const setBeat = (beat) => {
        if (beat === activeBeat) return;
        activeBeat = beat;
        captions.forEach((c) => c.classList.toggle('is-active', +c.dataset.beat === beat));
        progressItems.forEach((li) => li.classList.toggle('is-active', +li.dataset.beat === beat));
      };

      const setupJourney = () => {
        if (!journeyVideo.duration || !isFinite(journeyVideo.duration)) return;

        ScrollTrigger.create({
          trigger: journeySection,
          start: 'top top',
          end: '+=500%',          // 5 viewports of scroll while pinned
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          onUpdate: (self) => {
            const p = self.progress;

            // ---- Beat 01 (0 → 0.20): video scrubs from frame 0 → end ----
            const videoP = clamp01(p / 0.20);
            const t = videoP * journeyVideo.duration;
            if (Math.abs(journeyVideo.currentTime - t) > 0.03) {
              journeyVideo.currentTime = t;
            }

            // ---- Beat 02 (0.20 → 0.35): exterior scales up 1 → 1.4, darkens ----
            const zoom = 1 + fade(p, 0.00, 0.40) * 0.4;
            const bright = 1 - fade(p, 0.25, 0.45) * 0.75;
            layerExterior.style.transform = `scale(${zoom.toFixed(3)})`;
            layerExterior.style.filter = `brightness(${bright.toFixed(3)}) contrast(1.05)`;

            // ---- Beat 03 (0.35 → 0.55): kitchen fades IN ----
            layerKitchen.style.opacity = fade(p, 0.32, 0.50).toFixed(3);

            // ---- Beat 04 (0.55 → 0.75): living room fades IN over kitchen ----
            layerLiving.style.opacity = fade(p, 0.55, 0.70).toFixed(3);

            // ---- Beat 05 (0.75 → 1.00): 7-frame construction time-lapse ----
            // Container fades in slightly before beat 5 starts so there's no gap.
            // Frames inside crossfade sequentially across the sub-range [0.78, 0.99].
            if (timelapseWrap) {
              timelapseWrap.style.opacity = fade(p, 0.73, 0.78).toFixed(3);
            }
            if (timelapseFrames.length) {
              // Map global p → subP in [0, 1] across the frame-crossfade range
              const subP = clamp01((p - 0.78) / (0.99 - 0.78));
              // Position within (N-1) intervals between the N frames
              const n = timelapseFrames.length;
              const pos = subP * (n - 1);
              const lo = Math.floor(pos);
              const hi = Math.min(n - 1, lo + 1);
              const t = pos - lo;
              // Only write opacity on the two active frames (lo + hi); clear the rest
              for (let i = 0; i < n; i++) {
                let op = 0;
                if (i === lo && i === hi) op = 1;
                else if (i === lo) op = 1 - t;
                else if (i === hi) op = t;
                timelapseFrames[i].style.opacity = op.toFixed(3);
              }
              // Date label follows the dominant frame
              if (journeyDate) {
                const dominantIdx = t >= 0.5 ? hi : lo;
                const date = timelapseFrames[dominantIdx]?.dataset.date;
                if (date) {
                  const label = formatDate(date);
                  if (journeyDate.textContent !== label) journeyDate.textContent = label;
                }
              }
            }

            // Which beat is "current" for caption + progress highlighting
            let beat = 1;
            if (p >= 0.20) beat = 2;
            if (p >= 0.35) beat = 3;
            if (p >= 0.55) beat = 4;
            if (p >= 0.75) beat = 5;
            setBeat(beat);
          },
        });
      };

      if (journeyVideo.readyState >= 1) setupJourney();
      else journeyVideo.addEventListener('loadedmetadata', setupJourney, { once: true });
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
