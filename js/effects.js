/* ==========================================================================
   ChargeMate - Premium Micro-interactions & Visual Effects Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initLoadingScreen();
    initScrollProgress();
    initFloatingParticles();
    initMagneticElements();
    initRippleClick();
    initScrollObserver();
    initParallaxScroll();
    initNewsletterForm();
});

/* --------------------------------------------------------------------------
   1. Loading Screen diagnostic loader
   -------------------------------------------------------------------------- */
function initLoadingScreen() {
    const loader = document.getElementById('loading-screen');
    const loaderBar = document.getElementById('loader-bar');
    const loaderStatus = document.querySelector('.loader-status');
    if (!loader || !loaderBar) return;

    const messages = [
        "Connecting grid infrastructure...",
        "Calibrating fast charging channels...",
        "Synchronizing digital wallet payload...",
        "Powering telemetry sensors...",
        "System diagnostics completed."
    ];

    let progress = 0;
    let messageIndex = 0;
    
    // Simulate loading progress
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            finishLoading();
        }
        
        loaderBar.style.width = `${progress}%`;
        
        // Update messages periodically
        if (progress > (messageIndex + 1) * 20 && messageIndex < messages.length - 1) {
            messageIndex++;
            if (loaderStatus) {
                loaderStatus.style.opacity = '0';
                setTimeout(() => {
                    loaderStatus.textContent = messages[messageIndex];
                    loaderStatus.style.opacity = '1';
                }, 200);
            }
        }
    }, 100);

    function finishLoading() {
        if (loaderStatus) loaderStatus.textContent = "Welcome to ChargeMate Grid.";
        setTimeout(() => {
            loader.classList.add('fade-out');
            document.body.classList.remove('loading-lock');
            setTimeout(() => {
                loader.remove();
            }, 800);
        }, 300);
    }
}

/* --------------------------------------------------------------------------
   2. Scroll Progress Bar
   -------------------------------------------------------------------------- */
function initScrollProgress() {
    const progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = `${scrollPercent}%`;
    }, { passive: true });
}


/* --------------------------------------------------------------------------
   4. Floating Canvas Particles
   -------------------------------------------------------------------------- */
function initFloatingParticles() {
    const canvas = document.getElementById('ambient-particles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: null, y: null, radius: 120 };

    function resizeCanvas() {
        const parent = canvas.parentElement;
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
    }
    resizeCanvas();

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 3 + 1;
            this.baseX = this.x;
            this.baseY = this.y;
            this.speedX = Math.random() * 0.4 - 0.2;
            this.speedY = Math.random() * 0.4 - 0.2;
            this.density = (Math.random() * 30) + 1;
            
            // Neon cyan or purple tints for highlights
            const colors = ['rgba(6, 182, 212, 0.2)', 'rgba(59, 130, 246, 0.15)', 'rgba(99, 102, 241, 0.15)'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        update() {
            // Drift movement
            this.x += this.speedX;
            this.y += this.speedY;

            // Bounce on boundary collisions
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

            // Cursor proximity repulsion
            if (mouse.x !== null && mouse.y !== null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < mouse.radius) {
                    let forceDirectionX = dx / distance;
                    let forceDirectionY = dy / distance;
                    let maxDistance = mouse.radius;
                    let force = (maxDistance - distance) / maxDistance;
                    let directionX = forceDirectionX * force * this.density * 0.3;
                    let directionY = forceDirectionY * force * this.density * 0.3;
                    
                    this.x -= directionX;
                    this.y -= directionY;
                }
            }
        }
    }

    function init() {
        particles = [];
        const numParticles = Math.min(Math.floor(canvas.width * canvas.height / 30000), 50);
        for (let i = 0; i < numParticles; i++) {
            particles.push(new Particle());
        }
    }
    init();

    // Debounce both canvas resize and particle re-distribution to prevent layout thrashing
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resizeCanvas();
            init();
        }, 150);
    }, { passive: true });

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();
        }
        
        requestAnimationFrame(animate);
    }
    animate();
}

/* --------------------------------------------------------------------------
   5. Magnetic Buttons hover pull
   -------------------------------------------------------------------------- */
function initMagneticElements() {
    const isTouch = window.matchMedia("(pointer: coarse)").matches || 'ontouchstart' in window;
    if (isTouch) return;

    // Attach magnetic listeners only to primary/secondary buttons, cards, and CTA cards
    const magnetics = document.querySelectorAll('.btn-primary, .btn-secondary, .card-panel, .charger-card, .developer-card');

    magnetics.forEach(elem => {
        elem.addEventListener('mousemove', (e) => {
            const rect = elem.getBoundingClientRect();
            const x = e.clientX - rect.left - (rect.width / 2);
            const y = e.clientY - rect.top - (rect.height / 2);
            
            // Premium soft pull: larger cards pull less (5-6%) than small buttons (18%) to feel heavy and premium
            const isCard = elem.classList.contains('card-panel') || elem.classList.contains('charger-card') || elem.classList.contains('developer-card');
            const pullFactor = isCard ? 0.05 : 0.18; 
            
            elem.style.transition = 'transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)';
            elem.style.transform = `translate(${x * pullFactor}px, ${y * pullFactor}px)`;
        });

        elem.addEventListener('mouseleave', () => {
            elem.style.transform = '';
            elem.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        });
    });
}

/* --------------------------------------------------------------------------
   6. Ripple Click Feedback
   -------------------------------------------------------------------------- */
function initRippleClick() {
    const buttons = document.querySelectorAll('.btn, .social-icon-btn, .dev-social-btn');

    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Remove any existing active ripples
            const oldRipple = this.querySelector('.ripple-span');
            if (oldRipple) oldRipple.remove();

            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple-span';
            ripple.style.width = ripple.style.height = `${size}px`;
            
            const x = e.clientX - rect.left - (size / 2);
            const y = e.clientY - rect.top - (size / 2);
            
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            // Cleanup ripple span after completion of scale out transition
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

/* --------------------------------------------------------------------------
   7. Scroll Intersection Observer for reveals
   -------------------------------------------------------------------------- */
function initScrollObserver() {
    const revealElements = document.querySelectorAll('.reveal-fade-up, .reveal-img-wrapper, .reveal-text-mask');
    if (revealElements.length === 0) return;

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -60px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // Once animated, cancel further monitoring to save CPU cycles
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(elem => observer.observe(elem));
}

/* --------------------------------------------------------------------------
   8. Parallax scrolling details
   -------------------------------------------------------------------------- */
function initParallaxScroll() {
    const isTouch = window.matchMedia("(pointer: coarse)").matches || 'ontouchstart' in window;
    if (isTouch) return;

    const parallaxItems = document.querySelectorAll('.parallax-scroll');
    if (parallaxItems.length === 0) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        
        parallaxItems.forEach(item => {
            const speed = parseFloat(item.getAttribute('data-parallax-speed')) || 0.12;
            const direction = item.getAttribute('data-parallax-dir') === 'up' ? -1 : 1;
            const offset = scrolled * speed * direction;
            
            // Bind translation without affecting flex or grid alignment properties
            item.style.transform = `translateY(${offset}px)`;
        });
    }, { passive: true });
}

/* --------------------------------------------------------------------------
   9. Newsletter Form Submission Handling
   -------------------------------------------------------------------------- */
function initNewsletterForm() {
    const form = document.getElementById('footer-newsletter-form');
    const feedback = document.getElementById('newsletter-feedback');
    if (!form || !feedback) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const input = form.querySelector('.newsletter-input');
        const submitBtn = form.querySelector('.btn-newsletter-submit');
        if (!input || !submitBtn) return;

        // Visual loading state
        submitBtn.disabled = true;
        input.disabled = true;
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = "Verifying...";
        
        feedback.className = "newsletter-feedback";
        feedback.textContent = "";

        setTimeout(() => {
            submitBtn.textContent = originalBtnText;
            
            // Simulating successful subscription
            feedback.textContent = "Subscribed successfully!";
            feedback.classList.add('success');
            
            // Visual success cues
            input.style.borderColor = "#10B981";
            input.value = "";
        }, 1000);
    });
}

/* --------------------------------------------------------------------------
   10. Keyboard Accessibility Modal Focus Trap
   -------------------------------------------------------------------------- */
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    // Find the active modal dialog
    const activeModal = document.querySelector('.auth-overlay.active, .modal-overlay.active');
    if (!activeModal) return;

    // Find all focusable elements inside the modal
    const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';
    const focusableElements = Array.from(activeModal.querySelectorAll(focusableSelectors));
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
        // Shift + Tab: if on first element, cycle back to last
        if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
        }
    } else {
        // Tab: if on last element, cycle forward to first
        if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
        }
    }
});
