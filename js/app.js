/* ==========================================================================
   ChargeMate - Main App Shell & State Manager
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initScrollReveal();
    initMobileNav();
    initAuthFlow();
    initBookingForm();
    initThemeToggle();
    initProfileSettings();
    checkExistingAuth();
});

/* --------------------------------------------------------------------------
   Scroll Triggered Reveal Animations
   -------------------------------------------------------------------------- */
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // Once revealed, we don't need to observe it anymore
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => observer.observe(el));
    
    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                const offset = 80; // Header height
                const bodyRect = document.body.getBoundingClientRect().top;
                const elementRect = targetEl.getBoundingClientRect().top;
                const elementPosition = elementRect - bodyRect;
                const offsetPosition = elementPosition - offset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
                
                // Update active link state
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                if (this.classList.contains('nav-link')) {
                    this.classList.add('active');
                }
            }
        });
    });
}

/* --------------------------------------------------------------------------
   Mobile Menu Drawer Toggle
   -------------------------------------------------------------------------- */
function initMobileNav() {
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    const drawer = document.querySelector('.mobile-drawer');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    const header = document.querySelector('.site-header');

    if (!toggleBtn || !drawer) return;

    function toggleMenu() {
        toggleBtn.classList.toggle('active');
        drawer.classList.toggle('active');
        
        // Animated Hamburger Transform
        const lines = toggleBtn.querySelectorAll('.hamburger-line');
        if (toggleBtn.classList.contains('active')) {
            lines[0].style.transform = 'translateY(8px) rotate(45deg)';
            lines[1].style.opacity = '0';
            lines[2].style.transform = 'translateY(-8px) rotate(-45deg)';
        } else {
            lines[0].style.transform = 'none';
            lines[1].style.opacity = '1';
            lines[2].style.transform = 'none';
        }
    }

    toggleBtn.addEventListener('click', toggleMenu);

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (drawer.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // Header shadow on scroll (Throttled with state flag to prevent CLS/reflows)
    let isHeaderScrolled = false;
    window.addEventListener('scroll', () => {
        const thresholdCrossed = window.scrollY > 20;
        if (thresholdCrossed !== isHeaderScrolled) {
            isHeaderScrolled = thresholdCrossed;
            if (isHeaderScrolled) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }
    }, { passive: true });
}

/* --------------------------------------------------------------------------
   Authentication Modal & Mock Validation Flow
   -------------------------------------------------------------------------- */
function initAuthFlow() {
    const triggers = document.querySelectorAll('.auth-trigger');
    const authModal = document.getElementById('auth-modal');
    const closeBtn = document.querySelector('.auth-close');
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    const signinForm = document.getElementById('signin-form');
    const registerForm = document.getElementById('register-form');
    const profileBtn = document.getElementById('profile-menu-button');
    const dropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('btn-logout');

    if (!authModal) return;

    // Toggle Modal Open/Close
    triggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            authModal.classList.add('active');
            
            // Close mobile menu if open
            const drawer = document.querySelector('.mobile-drawer');
            if (drawer && drawer.classList.contains('active')) {
                document.querySelector('.mobile-menu-toggle').click();
            }
        });
    });

    closeBtn.addEventListener('click', () => {
        authModal.classList.remove('active');
    });

    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.classList.remove('active');
        }
    });

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetFormId = tab.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            forms.forEach(f => {
                f.classList.remove('active');
                if ((targetFormId === 'signin' && f.id === 'signin-form') || 
                    (targetFormId === 'register' && f.id === 'register-form')) {
                    f.classList.add('active');
                }
            });
        });
    });

    // Sign In Submission
    signinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = signinForm.querySelector('button[type="submit"]');
        const emailInput = document.getElementById('login-email').value;

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        setTimeout(() => {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            
            // Save mock user state
            const mockUser = {
                name: 'Alex Rivera',
                email: emailInput || 'alex@chargemate.com',
                car: 'byd-seal'
            };
            localStorage.setItem('chargemate_user', JSON.stringify(mockUser));
            applyAuthState(mockUser);
            
            authModal.classList.remove('active');
            signinForm.reset();
        }, 1200);
    });

    // Register Submission
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const nameInput = document.getElementById('reg-name').value;
        const emailInput = document.getElementById('reg-email').value;
        const carSelect = document.getElementById('reg-car').value;

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        setTimeout(() => {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            
            // Save mock user state
            const mockUser = {
                name: nameInput,
                email: emailInput,
                car: carSelect || 'byd-seal'
            };
            localStorage.setItem('chargemate_user', JSON.stringify(mockUser));
            applyAuthState(mockUser);
            
            authModal.classList.remove('active');
            registerForm.reset();
            
            // If registered with a specific car, update the calculator
            if (carSelect) {
                const calcCar = document.getElementById('calc-vehicle');
                if (calcCar) {
                    calcCar.value = carSelect;
                    calcCar.dispatchEvent(new Event('change'));
                }
            }
        }, 1200);
    });

    // User Profile Dropdown Toggle
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        if (dropdown && dropdown.classList.contains('active')) {
            dropdown.classList.remove('active');
        }
    });

    // Log Out click
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('chargemate_user');
        removeAuthState();
    });
}

function applyAuthState(user) {
    const loginTriggers = document.querySelectorAll('.auth-trigger');
    const profileMenu = document.getElementById('user-profile-menu');
    const profileLetter = document.querySelector('.avatar-letter');
    const profileImage = document.querySelector('.avatar-image');
    const profileName = document.querySelector('.dropdown-header .user-name');
    const profileEmail = document.querySelector('.dropdown-header .user-email');

    // Mobile screen settings avatar elements
    const phoneSettingsAvatarLetter = document.querySelector('.phone-settings-avatar-letter');
    const phoneSettingsAvatarImage = document.querySelector('.phone-settings-avatar-image');
    const phoneSettingsUsername = document.getElementById('phone-settings-username');
    const phoneSettingsEmail = document.getElementById('phone-settings-email');

    // Update avatar elements
    if (user.avatar) {
        if (profileImage) {
            profileImage.src = user.avatar;
            profileImage.style.display = 'block';
        }
        if (profileLetter) {
            profileLetter.style.display = 'none';
        }
        if (phoneSettingsAvatarImage) {
            phoneSettingsAvatarImage.src = user.avatar;
            phoneSettingsAvatarImage.style.display = 'block';
        }
        if (phoneSettingsAvatarLetter) {
            phoneSettingsAvatarLetter.style.display = 'none';
        }
    } else {
        if (profileImage) {
            profileImage.src = '';
            profileImage.style.display = 'none';
        }
        if (profileLetter) {
            profileLetter.textContent = user.name.charAt(0).toUpperCase();
            profileLetter.style.display = 'block';
        }
        if (phoneSettingsAvatarImage) {
            phoneSettingsAvatarImage.src = '';
            phoneSettingsAvatarImage.style.display = 'none';
        }
        if (phoneSettingsAvatarLetter) {
            // Generate initials up to 2 characters
            const initials = user.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
            phoneSettingsAvatarLetter.textContent = initials || 'U';
            phoneSettingsAvatarLetter.style.display = 'block';
        }
    }

    if (profileName) profileName.textContent = user.name;
    if (profileEmail) profileEmail.textContent = user.email;

    if (phoneSettingsUsername) phoneSettingsUsername.textContent = user.name;
    if (phoneSettingsEmail) phoneSettingsEmail.textContent = user.email;

    // Show/Hide buttons
    loginTriggers.forEach(btn => btn.style.display = 'none');
    if (profileMenu) profileMenu.style.display = 'block';

    // Unlock Dashboard & Garage & Scheduler & Wallet & Reservations & Init Telemetry
    const dashboardOverlay = document.getElementById('dashboard-lock-overlay');
    if (dashboardOverlay) {
        dashboardOverlay.classList.add('unlocked');
    }
    const garageOverlay = document.getElementById('garage-lock-overlay');
    if (garageOverlay) {
        garageOverlay.classList.add('unlocked');
    }
    const schedulerOverlay = document.getElementById('scheduler-lock-overlay');
    if (schedulerOverlay) {
        schedulerOverlay.classList.add('unlocked');
    }
    const walletOverlay = document.getElementById('wallet-lock-overlay');
    if (walletOverlay) {
        walletOverlay.classList.add('unlocked');
    }
    const reservationsOverlay = document.getElementById('reservations-lock-overlay');
    if (reservationsOverlay) {
        reservationsOverlay.classList.add('unlocked');
    }
    if (typeof window.initDashboard === 'function') {
        window.initDashboard(user);
    }
    if (typeof window.initWallet === 'function') {
        window.initWallet();
    }
    if (typeof window.initReservations === 'function') {
        window.initReservations();
    }
}

function removeAuthState() {
    const loginTriggers = document.querySelectorAll('.auth-trigger');
    const profileMenu = document.getElementById('user-profile-menu');
    const profileLetter = document.querySelector('.avatar-letter');
    const profileImage = document.querySelector('.avatar-image');
    const phoneSettingsAvatarLetter = document.querySelector('.phone-settings-avatar-letter');
    const phoneSettingsAvatarImage = document.querySelector('.phone-settings-avatar-image');

    // Reset avatar states
    if (profileImage) {
        profileImage.src = '';
        profileImage.style.display = 'none';
    }
    if (profileLetter) {
        profileLetter.textContent = 'U';
        profileLetter.style.display = 'block';
    }
    if (phoneSettingsAvatarImage) {
        phoneSettingsAvatarImage.src = '';
        phoneSettingsAvatarImage.style.display = 'none';
    }
    if (phoneSettingsAvatarLetter) {
        phoneSettingsAvatarLetter.textContent = 'MR';
        phoneSettingsAvatarLetter.style.display = 'block';
    }

    loginTriggers.forEach(btn => {
        // Restore buttons display state
        if (btn.id === 'btn-login-trigger') {
            btn.style.display = 'inline-flex';
        } else if (btn.id === 'mobile-login-trigger') {
            btn.style.display = 'block';
        } else {
            btn.style.display = 'block';
        }
    });
    if (profileMenu) profileMenu.style.display = 'none';

    // Lock Dashboard, Garage, Scheduler, Wallet & Reservations & Destroy Loops
    const dashboardOverlay = document.getElementById('dashboard-lock-overlay');
    if (dashboardOverlay) {
        dashboardOverlay.classList.remove('unlocked');
    }
    const garageOverlay = document.getElementById('garage-lock-overlay');
    if (garageOverlay) {
        garageOverlay.classList.remove('unlocked');
    }
    const schedulerOverlay = document.getElementById('scheduler-lock-overlay');
    if (schedulerOverlay) {
        schedulerOverlay.classList.remove('unlocked');
    }
    const walletOverlay = document.getElementById('wallet-lock-overlay');
    if (walletOverlay) {
        walletOverlay.classList.remove('unlocked');
    }
    const reservationsOverlay = document.getElementById('reservations-lock-overlay');
    if (reservationsOverlay) {
        reservationsOverlay.classList.remove('unlocked');
    }
    if (typeof window.destroyDashboard === 'function') {
        window.destroyDashboard();
    }
    if (typeof window.destroyScheduler === 'function') {
        window.destroyScheduler();
    }
    if (typeof window.destroyWallet === 'function') {
        window.destroyWallet();
    }
    if (typeof window.destroyReservations === 'function') {
        window.destroyReservations();
    }
}

function checkExistingAuth() {
    const savedUser = localStorage.getItem('chargemate_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            applyAuthState(user);
        } catch (err) {
            localStorage.removeItem('chargemate_user');
        }
    }
}

/* --------------------------------------------------------------------------
   Inquiry Reservation Form Handling
   -------------------------------------------------------------------------- */
function initBookingForm() {
    const bookingForm = document.getElementById('booking-form');
    const successModal = document.getElementById('success-modal');
    const successMessage = document.getElementById('success-modal-message');
    const closeSuccessBtn = document.getElementById('btn-close-success');

    if (!bookingForm || !successModal) return;

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = bookingForm.querySelector('button[type="submit"]');
        const bookingType = document.getElementById('reserve-type').value;
        const nameVal = document.getElementById('booking-name').value;

        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        setTimeout(() => {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            
            // Format success description message based on selections
            let typeDesc = "home charging hardware unit";
            if (bookingType === "ultra-fleet") {
                typeDesc = "commercial charging network partnership query";
            } else if (bookingType === "network-pass") {
                typeDesc = "metropolitan charging grid network pass reservation";
            }

            successMessage.textContent = `Thanks ${nameVal}! Your reservation request for a ${typeDesc} has been logged. Our charging dispatch team will follow up via email shortly.`;
            
            // Clear form and open success overlay
            bookingForm.reset();
            successModal.classList.add('active');
        }, 1500);
    });

    closeSuccessBtn.addEventListener('click', () => {
        successModal.classList.remove('active');
    });

    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) {
            successModal.classList.remove('active');
        }
    });
}

/* --------------------------------------------------------------------------
   Theme Switcher Toggler Logic
   -------------------------------------------------------------------------- */
function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        if (newTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem('chargemate_theme', newTheme);
    });
}

/* --------------------------------------------------------------------------
   Profile & Settings Modal Handling
   -------------------------------------------------------------------------- */
function initProfileSettings() {
    const btnProfileSettings = document.getElementById('btn-profile-settings');
    const settingsModal = document.getElementById('profile-settings-modal');
    const settingsClose = document.getElementById('profile-settings-close');
    const settingsCancel = document.getElementById('btn-cancel-settings');
    const settingsForm = document.getElementById('profile-settings-form');
    
    const settingsUsername = document.getElementById('settings-username');
    const settingsEmail = document.getElementById('settings-email');
    const settingsPassword = document.getElementById('settings-password');
    const settingsConfirmPassword = document.getElementById('settings-confirm-password');
    
    // Avatar upload elements
    const avatarInput = document.getElementById('settings-avatar-input');
    const btnSelectAvatar = document.getElementById('btn-select-avatar');
    const btnRemoveAvatar = document.getElementById('btn-remove-avatar');
    const avatarLetter = document.getElementById('settings-avatar-letter');
    const avatarImage = document.getElementById('settings-avatar-image');
    
    let currentAvatarData = null;

    if (!settingsModal) return;

    // Toggle Modal Open
    btnProfileSettings.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Retrieve current user
        const savedUser = localStorage.getItem('chargemate_user');
        if (!savedUser) {
            showToast('Please sign in first.', 'error');
            return;
        }
        
        const user = JSON.parse(savedUser);
        
        // Prefill fields
        settingsUsername.value = user.name || '';
        settingsEmail.value = user.email || '';
        settingsPassword.value = '';
        settingsConfirmPassword.value = '';
        
        // Set avatar preview in modal
        if (user.avatar) {
            currentAvatarData = user.avatar;
            avatarImage.src = user.avatar;
            avatarImage.style.display = 'block';
            avatarLetter.style.display = 'none';
        } else {
            currentAvatarData = null;
            avatarImage.src = '';
            avatarImage.style.display = 'none';
            avatarLetter.style.display = 'block';
            avatarLetter.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        }
        
        settingsModal.classList.add('active');
        
        // Close dropdown
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown) dropdown.classList.remove('active');
    });

    // Toggle Modal Close
    function closeModal() {
        settingsModal.classList.remove('active');
    }

    settingsClose.addEventListener('click', closeModal);
    settingsCancel.addEventListener('click', closeModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeModal();
    });

    // File selection trigger
    btnSelectAvatar.addEventListener('click', () => {
        avatarInput.click();
    });

    // Handle avatar file change
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast('Image size exceeds 2MB limit.', 'error');
            avatarInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            currentAvatarData = event.target.result;
            avatarImage.src = currentAvatarData;
            avatarImage.style.display = 'block';
            avatarLetter.style.display = 'none';
        };
        reader.readAsDataURL(file);
    });

    // Remove photo trigger
    btnRemoveAvatar.addEventListener('click', () => {
        currentAvatarData = null;
        avatarImage.src = '';
        avatarImage.style.display = 'none';
        avatarLetter.style.display = 'block';
        
        const nameVal = settingsUsername.value || 'U';
        avatarLetter.textContent = nameVal.charAt(0).toUpperCase();
        avatarInput.value = '';
    });

    // Update avatar letter when name changes in settings modal
    settingsUsername.addEventListener('input', () => {
        if (!currentAvatarData) {
            const val = settingsUsername.value;
            avatarLetter.textContent = val ? val.charAt(0).toUpperCase() : 'U';
        }
    });

    // Form submit save settings
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const usernameVal = settingsUsername.value.trim();
        const passwordVal = settingsPassword.value;
        const confirmPasswordVal = settingsConfirmPassword.value;

        if (!usernameVal) {
            showToast('Full Name is required.', 'error');
            return;
        }

        // Validate password mismatch
        if (passwordVal || confirmPasswordVal) {
            if (passwordVal !== confirmPasswordVal) {
                showToast('Passwords do not match.', 'error');
                // Form shake effect for validation error
                const card = settingsModal.querySelector('.auth-card');
                card.classList.add('shake-animation');
                setTimeout(() => card.classList.remove('shake-animation'), 400);
                return;
            }
            if (passwordVal.length < 6) {
                showToast('Password must be at least 6 characters.', 'error');
                return;
            }
        }

        // Save state to localStorage
        const savedUser = localStorage.getItem('chargemate_user');
        if (!savedUser) return;

        const user = JSON.parse(savedUser);
        user.name = usernameVal;
        user.avatar = currentAvatarData;
        
        // If password changed, update in user object (mocked)
        if (passwordVal) {
            user.password = passwordVal;
        }

        localStorage.setItem('chargemate_user', JSON.stringify(user));
        
        // Synchronize state across navigation and layout
        applyAuthState(user);
        
        showToast('Settings saved successfully.', 'success');
        closeModal();
    });
}

/* --------------------------------------------------------------------------
   Dynamic Toast Notification Manager
   -------------------------------------------------------------------------- */
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    
    // Choose icons based on type
    let icon = '';
    if (type === 'success') {
        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
    } else {
        icon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    }

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close-btn" aria-label="Close notification">&times;</button>
    `;

    container.appendChild(toast);

    // Close button click handler
    toast.querySelector('.toast-close-btn').addEventListener('click', () => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 400);
    });

    // Auto remove after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 400);
        }
    }, 4000);
}

// Bind to window to allow access from other modules
window.showToast = showToast;
