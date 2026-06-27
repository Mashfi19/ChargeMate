/* ==========================================================================
   ChargeMate - Hardware customizer & Interactive Phone App UI
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initHeroCustomizer();
    initChargerFinishes();
    initPhoneApp();
});

/* --------------------------------------------------------------------------
   Hero Section EV Color / Model Switcher
   -------------------------------------------------------------------------- */
function initHeroCustomizer() {
    const colorDots = document.querySelectorAll('.color-dot');
    const heroImages = document.querySelectorAll('.hero-img');
    const modelLabel = document.getElementById('hero-car-model');
    const livePower = document.getElementById('live-power-output');
    const livePercent = document.getElementById('live-battery-percent');
    const batteryFill = document.getElementById('battery-fill-rect');

    if (!colorDots.length) return;

    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            // Update dots active class
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');

            const color = dot.getAttribute('data-color');

            // Switch active image
            heroImages.forEach(img => img.classList.remove('active'));
            const activeImg = document.getElementById(`hero-image-${color}`);
            if (activeImg) activeImg.classList.add('active');

            // Update stats layout dynamically based on model selection
            if (color === 'blue') {
                if (modelLabel) modelLabel.textContent = 'BYD Seal';
                if (livePower) livePower.textContent = 'Active • 120 kW';
                if (livePercent) livePercent.textContent = '78% Charged';
                if (batteryFill) batteryFill.setAttribute('width', '8');
                
                // Update stats in hero left column
                document.getElementById('hero-stat-speed').textContent = '350 kW';
                document.getElementById('hero-stat-time').textContent = '12 min';
            } else if (color === 'grey') {
                if (modelLabel) modelLabel.textContent = 'BYD Han';
                if (livePower) livePower.textContent = 'Active • 85 kW';
                if (livePercent) livePercent.textContent = '90% Charged';
                if (batteryFill) batteryFill.setAttribute('width', '9');
                
                document.getElementById('hero-stat-speed').textContent = '380 kW';
                document.getElementById('hero-stat-time').textContent = '15 min';
            } else if (color === 'white') {
                if (modelLabel) modelLabel.textContent = 'BYD Han';
                if (livePower) livePower.textContent = 'Active • 145 kW';
                if (livePercent) livePercent.textContent = '42% Charged';
                if (batteryFill) batteryFill.setAttribute('width', '4');
                
                document.getElementById('hero-stat-speed').textContent = '380 kW';
                document.getElementById('hero-stat-time').textContent = '15 min';
            }
        });
    });
}

/* --------------------------------------------------------------------------
   ChargeMate Pro Finish customizer (Dynamic SVG gradients modifier)
   -------------------------------------------------------------------------- */
function initChargerFinishes() {
    const dots = document.querySelectorAll('.finish-dot');
    const proImg = document.getElementById('charger-pro-img');

    if (!dots.length || !proImg) return;

    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            dots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');

            const finish = dot.getAttribute('data-finish');

            if (finish === 'silver') {
                proImg.src = 'assets/images/charger-pro-silver.png';
                proImg.alt = 'ChargeMate Pro Arctic Silver Finish';
            } else if (finish === 'dark') {
                proImg.src = 'assets/images/charger-pro-dark.png';
                proImg.alt = 'ChargeMate Pro Space Charcoal Finish';
            } else if (finish === 'coral') {
                proImg.src = 'assets/images/charger-pro-coral.png';
                proImg.alt = 'ChargeMate Pro ChargeMate Coral Finish';
            }
        });
    });
}

/* --------------------------------------------------------------------------
   Interactive Mock Phone Dashboard App UI & Real-Time charging loop
   -------------------------------------------------------------------------- */
function initPhoneApp() {
    const phoneTabs = document.querySelectorAll('.phone-tab');
    const slider = document.querySelector('.phone-screens-slider');
    const phoneBellBtn = document.getElementById('phone-bell-btn');
    const notifBadge = document.querySelector('.notif-badge');

    const screens = ['screen-dash', 'screen-charge', 'screen-map', 'screen-wallet', 'screen-stats', 'screen-settings', 'screen-notif'];

    function goToScreen(index) {
        if (!slider) return;
        const percent = index * 14.2857;
        slider.style.transform = `translateX(-${percent}%)`;
        
        phoneTabs.forEach((tab, i) => {
            if (i === index) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        if (index === 6) { // Notifications is now index 6
            if (phoneBellBtn) phoneBellBtn.style.color = 'var(--clr-accent)';
            if (notifBadge) notifBadge.style.display = 'none';
        } else {
            if (phoneBellBtn) phoneBellBtn.style.color = 'var(--clr-text-secondary)';
        }
    }

    phoneTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            goToScreen(index);
        });
    });

    if (phoneBellBtn) {
        phoneBellBtn.addEventListener('click', () => {
            goToScreen(6);
        });
    }

    // Telemetry Sync
    function syncPhoneWithGlobalState() {
        const activeCar = typeof window.getActiveVehicle === 'function' ? window.getActiveVehicle() : null;
        
        let dashState = {};
        const savedDash = localStorage.getItem('chargemate_dashboard_state');
        if (savedDash) {
            try { dashState = JSON.parse(savedDash); } catch(e){}
        }

        const MODEL_NAMES = {
            'byd-seal': 'BYD Seal',
            'byd-han': 'BYD Han',
            'tesla-model-y': 'Tesla Model Y',
            'audi-etron': 'Audi e-tron',
            'taycan': 'Porsche Taycan'
        };

        const VEHICLE_IMAGES = {
            'byd-seal': 'assets/images/byd-seal-card.png',
            'byd-han': 'assets/images/byd-han-card.png',
            'tesla-model-y': 'assets/images/tesla-y.png',
            'audi-etron': 'assets/images/audi-etron.png',
            'taycan': 'assets/images/taycan.png'
        };

        const phoneModelLabel = document.getElementById('phone-dash-model');
        const phoneModelImg = document.getElementById('phone-dash-img');
        const phoneStatusLabel = document.querySelector('.phone-vehicle-status');
        const phoneRangeLabel = document.getElementById('phone-dash-range');
        const phoneSocLabel = document.getElementById('phone-dash-soc');

        const currentSoc = parseInt(dashState.batteryPercent !== undefined ? dashState.batteryPercent : 78);
        const targetLmt = parseInt(dashState.targetLimit !== undefined ? dashState.targetLimit : 90);
        const portLocked = dashState.portLocked !== false;
        const chargingActive = dashState.chargingActive !== false;

        if (activeCar) {
            const codeName = activeCar.model;
            if (phoneModelLabel) phoneModelLabel.textContent = MODEL_NAMES[codeName] || codeName;
            if (phoneModelImg) phoneModelImg.src = VEHICLE_IMAGES[codeName] || 'assets/images/byd-seal-card.png';
            
            let rangeFactor = 3.2;
            if (codeName === 'byd-han') rangeFactor = 3.4;
            else if (codeName === 'tesla-model-y') rangeFactor = 4.1;
            else if (codeName === 'audi-etron') rangeFactor = 2.8;
            else if (codeName === 'taycan') rangeFactor = 3.0;

            const rangeVal = Math.round(currentSoc * rangeFactor);
            if (phoneRangeLabel) phoneRangeLabel.textContent = `${rangeVal} mi`;
        } else {
            if (phoneModelLabel) phoneModelLabel.textContent = 'BYD Seal';
            if (phoneModelImg) phoneModelImg.src = 'assets/images/byd-seal-card.png';
            if (phoneRangeLabel) phoneRangeLabel.textContent = `${Math.round(currentSoc * 3.2)} mi`;
        }

        if (phoneSocLabel) phoneSocLabel.textContent = `${currentSoc}%`;

        if (phoneStatusLabel) {
            phoneStatusLabel.textContent = `${chargingActive ? 'CHARGING' : 'CONNECTED'} • PORT ${portLocked ? 'LOCKED' : 'UNLOCKED'}`;
            phoneStatusLabel.style.color = portLocked ? 'var(--clr-teal)' : 'var(--clr-accent)';
        }

        const portToggleBtn = document.getElementById('phone-toggle-port');
        if (portToggleBtn) {
            if (portLocked) {
                portToggleBtn.classList.add('active');
                portToggleBtn.textContent = 'LOCKED';
                portToggleBtn.style.background = '';
                portToggleBtn.style.color = '';
            } else {
                portToggleBtn.classList.remove('active');
                portToggleBtn.textContent = 'UNLOCKED';
                portToggleBtn.style.background = 'rgba(255, 90, 54, 0.2)';
                portToggleBtn.style.color = 'var(--clr-accent)';
            }
        }

        const chargePercentText = document.getElementById('phone-battery-percent');
        const chargeGaugeProgress = document.getElementById('phone-gauge-progress');
        const chargePowerText = document.getElementById('phone-stat-power');
        const chargeTimeText = document.getElementById('phone-stat-time');
        const limitDisplay = document.getElementById('phone-limit-display');
        const limitSlider = document.getElementById('phone-limit-slider');

        if (chargePercentText) chargePercentText.textContent = `${currentSoc}%`;
        if (chargeGaugeProgress) {
            const circumference = 251.2;
            const offset = circumference * (1 - currentSoc / 100);
            chargeGaugeProgress.setAttribute('stroke-dashoffset', offset);
            
            if (chargingActive) {
                chargeGaugeProgress.setAttribute('stroke', 'var(--clr-accent)');
            } else {
                chargeGaugeProgress.setAttribute('stroke', 'var(--clr-teal)');
            }
        }

        if (chargePowerText) {
            chargePowerText.textContent = chargingActive ? '120 kW' : '0 kW';
        }

        if (chargeTimeText) {
            if (!chargingActive) {
                chargeTimeText.textContent = 'Idle';
            } else if (currentSoc >= targetLmt) {
                chargeTimeText.textContent = 'Target Reached';
            } else {
                const minsLeft = Math.ceil((targetLmt - currentSoc) * 0.8);
                chargeTimeText.textContent = `${minsLeft}m left`;
            }
        }

        if (limitDisplay) limitDisplay.textContent = `${targetLmt}%`;
        if (limitSlider) limitSlider.value = targetLmt;

        const walletBalanceText = document.getElementById('phone-wallet-balance');
        const rawBalance = parseFloat(dashState.walletBalance !== undefined ? dashState.walletBalance : 78.50);
        if (walletBalanceText) {
            walletBalanceText.textContent = `$${rawBalance.toFixed(2)}`;
        }

        // Sync Settings User profile card
        const user = JSON.parse(localStorage.getItem('chargemate_user'));
        const phoneSettingsUsername = document.getElementById('phone-settings-username');
        const phoneSettingsEmail = document.getElementById('phone-settings-email');
        const phoneAvatarLetter = document.querySelector('#phone-settings-avatar-badge .phone-settings-avatar-letter');
        const phoneAvatarImage = document.querySelector('#phone-settings-avatar-badge .phone-settings-avatar-image');

        if (user) {
            if (phoneSettingsUsername) phoneSettingsUsername.textContent = user.name;
            if (phoneSettingsEmail) phoneSettingsEmail.textContent = user.email || `${user.name.toLowerCase().replace(/\s+/g, '')}@chargemate.ev`;
            
            if (user.avatar) {
                if (phoneAvatarImage) {
                    phoneAvatarImage.src = user.avatar;
                    phoneAvatarImage.style.display = 'block';
                }
                if (phoneAvatarLetter) {
                    phoneAvatarLetter.style.display = 'none';
                }
            } else {
                if (phoneAvatarImage) {
                    phoneAvatarImage.src = '';
                    phoneAvatarImage.style.display = 'none';
                }
                if (phoneAvatarLetter) {
                    const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                    phoneAvatarLetter.textContent = initials || 'U';
                    phoneAvatarLetter.style.display = 'block';
                }
            }
        } else {
            if (phoneSettingsUsername) phoneSettingsUsername.textContent = "Guest Driver";
            if (phoneSettingsEmail) phoneSettingsEmail.textContent = "driver@chargemate.ev";
            if (phoneAvatarImage) {
                phoneAvatarImage.src = '';
                phoneAvatarImage.style.display = 'none';
            }
            if (phoneAvatarLetter) {
                phoneAvatarLetter.textContent = "GD";
                phoneAvatarLetter.style.display = 'block';
            }
        }

        // Sync Theme toggle switch checkbox
        const darkToggle = document.getElementById('phone-settings-dark-toggle');
        if (darkToggle) {
            const isCurrentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (darkToggle.checked !== isCurrentlyDark) {
                darkToggle.checked = isCurrentlyDark;
            }
        }
    }

    // Top up function from Phone
    function topupFromPhone(amount) {
        let dashState = {};
        const savedDash = localStorage.getItem('chargemate_dashboard_state');
        if (savedDash) {
            try { dashState = JSON.parse(savedDash); } catch(e){}
        }
        
        let balance = parseFloat(dashState.walletBalance || 78.50);
        balance += amount;
        dashState.walletBalance = balance;
        localStorage.setItem('chargemate_dashboard_state', JSON.stringify(dashState));

        let txns = [];
        const savedTxns = localStorage.getItem('chargemate_transactions');
        if (savedTxns) {
            try { txns = JSON.parse(savedTxns); } catch(e){}
        }
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
        
        const newTxn = {
            id: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
            date: dateStr,
            time: timeStr,
            type: 'Wallet Top-up',
            method: 'Mobile App',
            amount: amount,
            status: 'Success',
            subtotal: amount
        };
        txns.unshift(newTxn);
        localStorage.setItem('chargemate_transactions', JSON.stringify(txns));

        if (typeof window.initDashboard === 'function') {
            const user = JSON.parse(localStorage.getItem('chargemate_user'));
            window.initDashboard(user);
        }
        if (typeof window.initWallet === 'function') {
            window.initWallet();
        }

        addPhoneNotification('Wallet Reloaded', `Added $${amount.toFixed(2)} successfully from Mobile App.`, timeStr);
    }

    function addPhoneNotification(title, text, timeStr = 'Just now') {
        const list = document.querySelector('.phone-notif-list');
        if (!list) return;
        
        const notif = document.createElement('div');
        notif.className = 'phone-notif-item';
        notif.innerHTML = `
            <span class="title">${title}</span>
            <p class="text">${text}</p>
            <span class="time">${timeStr}</span>
        `;
        list.insertBefore(notif, list.firstChild);
        
        if (notifBadge) {
            notifBadge.style.display = 'block';
            notifBadge.classList.add('pulse');
        }
    }

    // Toggle locks
    const portToggleBtn = document.getElementById('phone-toggle-port');
    if (portToggleBtn) {
        portToggleBtn.addEventListener('click', () => {
            const desktopBtn = document.getElementById('btn-toggle-port-lock');
            if (desktopBtn) {
                desktopBtn.click();
            }
        });
    }

    const climateToggleBtn = document.getElementById('phone-toggle-climate');
    if (climateToggleBtn) {
        climateToggleBtn.addEventListener('click', () => {
            const isActive = climateToggleBtn.classList.contains('active');
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
            
            if (isActive) {
                climateToggleBtn.classList.remove('active');
                climateToggleBtn.textContent = 'OFF';
                climateToggleBtn.style.background = '';
                climateToggleBtn.style.color = '';
                addPhoneNotification('Climate Off', 'Cabin climate control deactivated.', timeStr);
            } else {
                climateToggleBtn.classList.add('active');
                climateToggleBtn.textContent = '21.5°C ON';
                climateToggleBtn.style.background = 'rgba(255, 90, 54, 0.2)';
                climateToggleBtn.style.color = 'var(--clr-accent)';
                addPhoneNotification('Climate On', 'Pre-cooling cabin to 21.5°C.', timeStr);
            }
        });
    }

    // Limit slider
    const limitSlider = document.getElementById('phone-limit-slider');
    if (limitSlider) {
        limitSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            const display = document.getElementById('phone-limit-display');
            if (display) display.textContent = `${val}%`;

            const desktopSlider = document.getElementById('dash-target-slider');
            if (desktopSlider) {
                desktopSlider.value = val;
                if (typeof desktopSlider.oninput === 'function') {
                    desktopSlider.oninput();
                }
            }
        });
    }

    // Top up buttons
    const topupBtns = document.querySelectorAll('.topup-shortcut-btn');
    topupBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseFloat(btn.getAttribute('data-amt'));
            if (!isNaN(amount) && amount > 0) {
                topupFromPhone(amount);
            }
        });
    });

    // Settings switch listeners
    const darkToggle = document.getElementById('phone-settings-dark-toggle');
    if (darkToggle) {
        darkToggle.addEventListener('change', () => {
            const isCurrentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const shouldBeDark = darkToggle.checked;
            if (shouldBeDark !== isCurrentlyDark) {
                const themeBtn = document.getElementById('theme-toggle-btn');
                if (themeBtn) {
                    themeBtn.click();
                }
            }
        });
    }

    const careToggle = document.getElementById('phone-settings-care-mode');
    if (careToggle) {
        careToggle.addEventListener('change', () => {
            const checked = careToggle.checked;
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
            if (checked) {
                addPhoneNotification('Battery Care Enabled', 'Charging target capped at 80% to maximize lifespan.', timeStr);
                const currentLimitSlider = document.getElementById('phone-limit-slider');
                if (currentLimitSlider && parseInt(currentLimitSlider.value) > 80) {
                    currentLimitSlider.value = 80;
                    // Trigger input event to update displays
                    currentLimitSlider.dispatchEvent(new Event('input'));
                }
            } else {
                addPhoneNotification('Battery Care Disabled', 'Charging allowed up to 100%.', timeStr);
            }
        });
    }

    const notifToggle = document.getElementById('phone-settings-notif-toggle');
    if (notifToggle) {
        notifToggle.addEventListener('change', () => {
            const checked = notifToggle.checked;
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);
            if (checked) {
                addPhoneNotification('Alerts Enabled', 'You will receive notifications for charging status.', timeStr);
            } else {
                addPhoneNotification('Alerts Silenced', 'Push notifications disabled.', timeStr);
            }
        });
    }

    const resetBtn = document.getElementById('phone-btn-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("Reset application cache? This will clear all fleet vehicles, wallet balance, and reservation schedules.")) {
                localStorage.clear();
                window.location.reload();
            }
        });
    }

    // Hook window.initDashboard
    const originalInitDashboard = window.initDashboard;
    window.initDashboard = function(user) {
        if (typeof originalInitDashboard === 'function') {
            originalInitDashboard(user);
        }
        syncPhoneWithGlobalState();
    };

    // Initial sync
    syncPhoneWithGlobalState();

    // 2-second polling to update charging percentage smoothly
    setInterval(() => {
        syncPhoneWithGlobalState();
    }, 2000);
}
