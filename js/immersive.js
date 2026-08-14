/* ========================================
   Triple H - Immersive Scroll Story
   GSAP + ScrollTrigger + Lenis + Pannellum
   ======================================== */

(function () {
  'use strict';

  // ---- Config ----
  const R2_BASE = 'https://pub-1008667921dc46088c845c1f999cb016.r2.dev';

  // Project paths (URL-encoded)
  const PROJECTS = {
    bakervale: '1-1067Bakervale%20Drive/images',
    pathfinder: '102%20Pathfinder%20Way/images',
    amiens: '2-303%20Amiens/images',
  };

  // Helper: build full image URL
  function img(project, date, room, floor) {
    const base = `${R2_BASE}/${PROJECTS[project]}/${date}`;
    if (floor) return `${base}/${floor}/${room}.jpg`;
    return `${base}/${room}.jpg`;
  }

  // Format YYYYMMDD -> "MAY 2025"
  function formatDate(d) {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const y = d.slice(0, 4);
    const m = parseInt(d.slice(4, 6), 10) - 1;
    return `${months[m]} ${y}`;
  }

  // Reduced motion?
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP/ScrollTrigger not loaded. Skipping immersive animations.');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // ====================
    // Lenis smooth scroll
    // ====================
    let lenis = null;
    if (typeof Lenis !== 'undefined' && !reduceMotion) {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
      });

      lenis.on('scroll', ScrollTrigger.update);

      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);

      // Expose for debugging / programmatic scroll
      window.lenis = lenis;
    }

    // ====================
    // Scene 1: Hero pano sweep
    // ====================
    const hero = document.querySelector('.scene-hero');
    if (hero) {
      const pano = hero.querySelector('.scene-hero__pano');
      const heroImage = hero.dataset.image
        || img('bakervale', '20251206', 'Living%20Room');

      // Preload then assign
      const preload = new Image();
      preload.onload = () => {
        pano.style.backgroundImage = `url('${heroImage}')`;
        pano.style.opacity = '1';
      };
      preload.src = heroImage;
      pano.style.opacity = '0';
      pano.style.transition = 'opacity 0.6s ease';

      // Horizontal pan as user scrolls
      gsap.to(pano, {
        backgroundPositionX: '100%',
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: '+=180%',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
        },
      });

      // Fade overlay text out as we scroll past hero
      const overlay = hero.querySelector('.scene-hero__overlay');
      const scrollHint = hero.querySelector('.scene-hero__scroll-hint');
      if (overlay) {
        gsap.to(overlay, {
          opacity: 0,
          y: -40,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: '+=80%',
            scrub: 1,
          },
        });
      }
      if (scrollHint) {
        gsap.to(scrollHint, {
          opacity: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: '+=20%',
            scrub: 1,
          },
        });
      }
    }

    // ====================
    // Scene 2: Time-lapse dissolves
    // (Two Pannellum viewers per scene, locked at fixed view, no warp)
    // ====================

    // Helper to init a non-interactive pano pane
    function initStaticPano(container, panoUrl, opts) {
      if (typeof pannellum === 'undefined') {
        applyFlatFallback(container, panoUrl);
        return null;
      }
      return pannellum.viewer(container, Object.assign({
        type: 'equirectangular',
        panorama: panoUrl,
        autoLoad: true,
        showControls: false,
        showZoomCtrl: false,
        showFullscreenCtrl: false,
        compass: false,
        mouseZoom: false,
        keyboardZoom: false,
        draggable: false,
        disableKeyboardCtrl: true,
        hfov: 75,        // narrower FOV = less perspective distortion
        minHfov: 75,
        maxHfov: 75,
        yaw: 0,
        pitch: 0,
        backgroundColor: [0.04, 0.035, 0.03],
      }, opts || {}, {
        // Common fallback for BOTH static + interactive viewers
        onError: () => applyFlatFallback(container, panoUrl),
      }));
    }

    // Graceful fallback when WebGL/CORS/network prevents the 360 from loading.
    // Instead of Pannellum's error message, show the pano as a flat cover image
    // so the visitor at least sees the space (albeit as a stretched slice).
    function applyFlatFallback(container, panoUrl) {
      if (!container) return;
      container.innerHTML = '';
      container.style.backgroundImage = `url('${panoUrl}')`;
      container.style.backgroundSize = 'cover';
      container.style.backgroundPosition = 'center';
      container.style.backgroundColor = '#0a0908';
      container.classList.add('pano-fallback');
    }

    document.querySelectorAll('.scene-timelapse').forEach((scene) => {
      const room = scene.dataset.room;
      const project = scene.dataset.project || 'bakervale';
      const earlyDate = scene.dataset.dateEarly;
      const lateDate = scene.dataset.dateLate;
      const floor = scene.dataset.floor || null;
      // Optional camera angle override per scene
      const yaw = parseFloat(scene.dataset.yaw || '0');
      const pitch = parseFloat(scene.dataset.pitch || '0');

      if (!room || !earlyDate || !lateDate) return;

      const earlyPane = scene.querySelector('.scene-timelapse__pano--early');
      const latePane = scene.querySelector('.scene-timelapse__pano--late');
      const earlyMount = earlyPane.querySelector('.scene-timelapse__pano-mount');
      const lateMount = latePane.querySelector('.scene-timelapse__pano-mount');
      const dateLabel = scene.querySelector('.scene-timelapse__date');
      const progressFill = scene.querySelector('.scene-timelapse__progress-fill');

      const earlyLabel = formatDate(earlyDate);
      const lateLabel = formatDate(lateDate);
      if (dateLabel) dateLabel.textContent = earlyLabel;

      // Lazy-init the two Pannellum viewers when the scene approaches
      let earlyViewer = null;
      let lateViewer = null;
      let initted = false;
      ScrollTrigger.create({
        trigger: scene,
        start: 'top bottom+=200',
        once: true,
        onEnter: () => {
          if (initted) return;
          initted = true;
          earlyViewer = initStaticPano(earlyMount, img(project, earlyDate, room, floor), { yaw, pitch });
          lateViewer = initStaticPano(lateMount, img(project, lateDate, room, floor), { yaw, pitch });
        },
      });

      // Pin scene + scrub dissolve, then hold
      // Timeline total duration = 1.0
      //   0.0 -> 0.5: dissolve animation runs
      //   0.5 -> 1.0: empty tween holds the finished view in place
      // ScrollTrigger maps scroll progress 0..1 onto timeline progress 0..1
      const DISSOLVE_PORTION = 0.5;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: scene,
          start: 'top top',
          end: '+=220%',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (dateLabel) {
              dateLabel.textContent = self.progress < DISSOLVE_PORTION ? earlyLabel : lateLabel;
            }
          },
        },
      });

      // Fade EARLY away (it sits on top with z-index 2). Late underneath is
      // always painted, so revealing it just means the early layer disappearing.
      tl.to(earlyPane, { opacity: 0, ease: 'none', duration: DISSOLVE_PORTION }, 0)
        .to(progressFill, { scaleX: 1, ease: 'none', duration: DISSOLVE_PORTION }, 0)
        // Empty tween extends timeline duration; user lingers on the final image
        .to({}, { duration: 1 - DISSOLVE_PORTION });
    });

    // ====================
    // Scene 3: 360 viewer (Pannellum)
    // ====================
    document.querySelectorAll('.scene-360__viewer').forEach((container) => {
      const project = container.dataset.project || 'bakervale';
      const date = container.dataset.date;
      const room = container.dataset.room;
      const floor = container.dataset.floor || null;

      if (!date || !room) return;

      const panoUrl = img(project, date, room, floor);

      if (typeof pannellum === 'undefined') {
        applyFlatFallback(container, panoUrl);
        return;
      }

      let viewer = null;

      // Lazy-init when scrolled near
      ScrollTrigger.create({
        trigger: container,
        start: 'top bottom',
        once: true,
        onEnter: () => {
          viewer = pannellum.viewer(container, {
            type: 'equirectangular',
            panorama: panoUrl,
            autoLoad: true,
            autoRotate: -1.5,
            autoRotateInactivityDelay: 3000,
            compass: false,
            showControls: false,
            showZoomCtrl: false,
            showFullscreenCtrl: false,
            mouseZoom: false,
            keyboardZoom: false,
            hfov: 90,
            minHfov: 70,
            maxHfov: 110,
            backgroundColor: [0, 0, 0],
            onError: () => applyFlatFallback(container, panoUrl),
          });

          // Pause auto-rotate on user interaction
          container.addEventListener('mousedown', () => viewer.stopAutoRotate());
          container.addEventListener('touchstart', () => viewer.stopAutoRotate(), { passive: true });
        },
      });
    });

    // ====================
    // 3D Tilt Cards (Services)
    // ====================
    if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
      document.querySelectorAll('.tilt-card').forEach((card) => {
        const maxTilt = 12;
        let raf = null;

        function onMove(e) {
          const rect = card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          if (raf) cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            card.style.transform = `perspective(1200px) rotateY(${x * maxTilt}deg) rotateX(${-y * maxTilt}deg) translateZ(8px)`;
          });
        }

        function onLeave() {
          if (raf) cancelAnimationFrame(raf);
          card.style.transform = 'perspective(1200px) rotateY(0) rotateX(0) translateZ(0)';
        }

        card.addEventListener('mousemove', onMove);
        card.addEventListener('mouseleave', onLeave);
      });
    }

    // ====================
    // Reveal on scroll
    // ====================
    document.querySelectorAll('.reveal').forEach((el) => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 85%',
        once: true,
        onEnter: () => el.classList.add('reveal-shown'),
      });
    });

    // ====================
    // About page parallax
    // ====================
    const aboutPanoBg = document.querySelector('.about-pano__bg');
    if (aboutPanoBg) {
      const heroImage = aboutPanoBg.dataset.image
        || img('bakervale', '20251206', 'Kitchen');
      aboutPanoBg.style.backgroundImage = `url('${heroImage}')`;

      gsap.to(aboutPanoBg, {
        y: '20%',
        ease: 'none',
        scrollTrigger: {
          trigger: '.about-pano',
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });

      // Fade title
      gsap.to('.about-pano__overlay', {
        opacity: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: '.about-pano',
          start: 'top top',
          end: 'bottom top',
          scrub: 1,
        },
      });
    }

    // Refresh ScrollTrigger after images may have shifted layout
    window.addEventListener('load', () => ScrollTrigger.refresh());
  });
})();
