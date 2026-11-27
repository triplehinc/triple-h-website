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
    // JOURNEY — one pinned section, 8 beats, data-driven.
    //
    // Pin lasts +=700% of scroll (7 extra viewports). Scroll progress 0→1
    // is divided into 8 beats. Beat data lives in BEATS — each room beat
    // declares when it fades in and when its video scrubs.
    // ====================
    const journeySection    = document.querySelector('.act--journey');
    const journeyVideo      = journeySection && journeySection.querySelector('.journey__video');
    const layerExterior     = journeySection && journeySection.querySelector('.journey__layer--exterior');
    const timelapseWrap     = journeySection && journeySection.querySelector('.journey__timelapse');
    const timelapseFrames   = journeySection ? Array.from(journeySection.querySelectorAll('.journey__frame')) : [];
    const captions          = journeySection ? journeySection.querySelectorAll('.journey__caption') : [];
    const progressItems     = journeySection ? journeySection.querySelectorAll('.journey__progress li') : [];
    const journeyDate       = document.getElementById('journeyDate');

    // Per-beat config. Each room has:
    //   layer:       the fading container
    //   video:       the Luma video that scrubs
    //   fadeIn:      [start, end] opacity ramp (0 → 1)
    //   scrub:       [start, end] range mapped onto the video's duration
    //   beatStart:   scroll progress at which this caption/progress goes active
    const ROOM_BEATS = journeySection ? [
      { id: 'entrance', beat: 3, beatStart: 0.22, fadeIn: [0.18, 0.26], scrub: [0.22, 0.35] },
      { id: 'kitchen',  beat: 4, beatStart: 0.35, fadeIn: [0.32, 0.40], scrub: [0.35, 0.48] },
      { id: 'living',   beat: 5, beatStart: 0.48, fadeIn: [0.45, 0.53], scrub: [0.48, 0.60] },
      { id: 'bedroom',  beat: 6, beatStart: 0.60, fadeIn: [0.57, 0.65], scrub: [0.60, 0.72] },
      { id: 'office',   beat: 7, beatStart: 0.72, fadeIn: [0.69, 0.77], scrub: [0.72, 0.84] },
    ].map((b) => ({
      ...b,
      layer: journeySection.querySelector(`.journey__layer--${b.id}`),
      video: journeySection.querySelector(`video[data-room="${b.id}"]`),
    })) : [];

    // Format YYYYMMDD → "MON D, YYYY" for the time-lapse date label
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    function formatDate(d) {
      const y = d.slice(0, 4);
      const m = parseInt(d.slice(4, 6), 10) - 1;
      const day = parseInt(d.slice(6, 8), 10);
      return `${MONTHS[m]} ${day}, ${y}`;
    }

    if (hasGSAP && !reduceMotion && journeySection && journeyVideo) {
      // iOS/Safari: videos need to have "played once" before currentTime updates render.
      // Unlock all scrubbable videos (exterior + every room clip) on first interaction.
      let scrubUnlocked = false;
      const unlockScrub = () => {
        if (scrubUnlocked) return;
        scrubUnlocked = true;
        const all = [journeyVideo, ...ROOM_BEATS.map((b) => b.video)].filter(Boolean);
        all.forEach((v) => {
          const p = v.play();
          if (p && typeof p.then === 'function') {
            p.then(() => v.pause()).catch(() => {});
          }
        });
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
          end: '+=700%',          // 7 viewports of scroll while pinned (one per beat after hero)
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          onUpdate: (self) => {
            const p = self.progress;

            // ---- Beat 01 (0.00 → 0.12): exterior video scrubs 0 → end ----
            const videoP = clamp01(p / 0.12);
            const t = videoP * journeyVideo.duration;
            if (Math.abs(journeyVideo.currentTime - t) > 0.03) {
              journeyVideo.currentTime = t;
            }

            // ---- Beat 02 (0.12 → 0.22): exterior zooms + darkens ----
            const zoom = 1 + fade(p, 0.00, 0.26) * 0.4;
            const bright = 1 - fade(p, 0.14, 0.26) * 0.75;
            layerExterior.style.transform = `scale(${zoom.toFixed(3)})`;
            layerExterior.style.filter = `brightness(${bright.toFixed(3)}) contrast(1.05)`;

            // ---- Beats 03–07 (room orbits): fade layer in + scrub its video ----
            for (const b of ROOM_BEATS) {
              if (!b.layer || !b.video) continue;
              b.layer.style.opacity = fade(p, b.fadeIn[0], b.fadeIn[1]).toFixed(3);
              if (b.video.duration) {
                const sp = clamp01((p - b.scrub[0]) / (b.scrub[1] - b.scrub[0]));
                const vt = sp * b.video.duration;
                if (Math.abs(b.video.currentTime - vt) > 0.03) {
                  b.video.currentTime = vt;
                }
              }
            }

            // ---- Beat 08 (0.84 → 1.00): 7-frame construction time-lapse ----
            if (timelapseWrap) {
              timelapseWrap.style.opacity = fade(p, 0.82, 0.86).toFixed(3);
            }
            if (timelapseFrames.length) {
              const subP = clamp01((p - 0.86) / (0.99 - 0.86));
              const n = timelapseFrames.length;
              const pos = subP * (n - 1);
              const lo = Math.floor(pos);
              const hi = Math.min(n - 1, lo + 1);
              const tf = pos - lo;
              for (let i = 0; i < n; i++) {
                let op = 0;
                if (i === lo && i === hi) op = 1;
                else if (i === lo) op = 1 - tf;
                else if (i === hi) op = tf;
                timelapseFrames[i].style.opacity = op.toFixed(3);
              }
              if (journeyDate) {
                const dominantIdx = tf >= 0.5 ? hi : lo;
                const date = timelapseFrames[dominantIdx]?.dataset.date;
                if (date) {
                  const label = formatDate(date);
                  if (journeyDate.textContent !== label) journeyDate.textContent = label;
                }
              }
            }

            // Active beat for caption + progress indicator
            let beat = 1;
            if (p >= 0.12) beat = 2;
            for (const b of ROOM_BEATS) if (p >= b.beatStart) beat = b.beat;
            if (p >= 0.84) beat = 8;
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
