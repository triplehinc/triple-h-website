/* ========================================
   Triple H - Main JavaScript
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ========================================
  // Slideshow
  // ========================================
  const slideshows = document.querySelectorAll('.slideshow');

  slideshows.forEach(slideshow => {
    const slidesContainer = slideshow.querySelector('.slideshow-slides');
    const slides = slideshow.querySelectorAll('.slideshow-slide');
    const prevBtn = slideshow.querySelector('.slideshow-btn.prev');
    const nextBtn = slideshow.querySelector('.slideshow-btn.next');
    const dotsContainer = slideshow.querySelector('.slideshow-dots');

    if (!slides.length) return;

    let currentIndex = 0;
    let autoplayInterval;

    // Create dots
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.classList.add('slideshow-dot');
      if (i === 0) dot.classList.add('active');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    });

    const dots = dotsContainer.querySelectorAll('.slideshow-dot');

    function goToSlide(index) {
      currentIndex = index;
      slidesContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
      });
    }

    function nextSlide() {
      goToSlide((currentIndex + 1) % slides.length);
    }

    function prevSlide() {
      goToSlide((currentIndex - 1 + slides.length) % slides.length);
    }

    // Button events
    nextBtn.addEventListener('click', () => {
      nextSlide();
      resetAutoplay();
    });

    prevBtn.addEventListener('click', () => {
      prevSlide();
      resetAutoplay();
    });

    // Autoplay
    function startAutoplay() {
      autoplayInterval = setInterval(nextSlide, 5000);
    }

    function resetAutoplay() {
      clearInterval(autoplayInterval);
      startAutoplay();
    }

    startAutoplay();

    // Pause on hover
    slideshow.addEventListener('mouseenter', () => clearInterval(autoplayInterval));
    slideshow.addEventListener('mouseleave', startAutoplay);
  });

  // ========================================
  // Contact Form (submits to Formspree via fetch, keeps user on page)
  // Form's action attribute must be a Formspree endpoint. If it's still
  // the placeholder, fall back to the old fake-success behavior so the
  // site doesn't look broken before the user finishes Formspree signup.
  // ========================================
  const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const action = contactForm.getAttribute('action') || '';
      const isPlaceholder = !action || action.includes('YOUR_FORMSPREE_ID');

      if (isPlaceholder) {
        // Not wired yet — just show the success message so nothing looks broken
        formSuccess.textContent = 'Thanks — form not wired yet. Meanwhile, please email contact@triple-h.ca';
        formSuccess.style.display = 'block';
        contactForm.reset();
        setTimeout(() => { formSuccess.style.display = 'none'; }, 5000);
        return;
      }

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalLabel = submitBtn ? submitBtn.textContent : null;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      try {
        const res = await fetch(action, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
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
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
        setTimeout(() => { formSuccess.style.display = 'none'; }, 6000);
      }
    });
  }

  // ========================================
  // Active nav link highlight
  // ========================================
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.site-nav a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });

});
