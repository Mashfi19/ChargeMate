/* ==========================================================================
   ChargeMate - Control Center Dashboard Telemetry & Controls
   ========================================================================== */

(function() {
    let telemetryInterval = null;
    let timerInterval = null;
    let waveAnimationId = null;
    let phase = 0;

    // Telemetry State
    let chargingActive = true;
    let batteryPercent = 50;
    let targetLimit = 90;
    let speed = 120; // kW
    let elapsedSeconds = 1452; // 24m 12s
    let sessionEnergy = 34.2; // kWh
    let sessionCost = 12.45; // USD
    let sessionCarbon = 8.4; // lbs
    let walletBalance = 78.50; // USD
    let todayEnergy = 42.8; // kWh
    let todayCost = 6.20; // USD
    let monthlyEnergy = 310.4; // kWh
    let monthlyCost = 46.80; // USD
    let portLocked = true; // Secured by default

    // Clean initial state values for reset/reload
    const DEFAULTS = {
        chargingActive: true,
        batteryPercent: 50,
        targetLimit: 90,
        speed: 120,
        elapsedSeconds: 1452,
        sessionEnergy: 34.2,
        sessionCost: 12.45,
        sessionCarbon: 8.4,
        walletBalance: 78.50,
        todayEnergy: 42.8,
        todayCost: 6.20,
        monthlyEnergy: 310.4,
        monthlyCost: 46.80,
        portLocked: true
    };

    // Load state from localStorage if exists
    function loadDashboardState() {
        const saved = localStorage.getItem('chargemate_dashboard_state');
        const activeCar = typeof window.getActiveVehicle === 'function' ? window.getActiveVehicle() : null;
        const lastActiveVehicleIndex = localStorage.getItem('chargemate_last_active_vehicle_index');
        const currentActiveVehicleIndex = localStorage.getItem('chargemate_active_vehicle_index') || '0';

        if (saved && lastActiveVehicleIndex === currentActiveVehicleIndex) {
            try {
                const state = JSON.parse(saved);
                chargingActive = state.chargingActive !== undefined ? state.chargingActive : DEFAULTS.chargingActive;
                batteryPercent = state.batteryPercent !== undefined ? state.batteryPercent : DEFAULTS.batteryPercent;
                targetLimit = state.targetLimit !== undefined ? state.targetLimit : DEFAULTS.targetLimit;
                speed = state.speed !== undefined ? state.speed : DEFAULTS.speed;
                elapsedSeconds = state.elapsedSeconds !== undefined ? state.elapsedSeconds : DEFAULTS.elapsedSeconds;
                sessionEnergy = state.sessionEnergy !== undefined ? state.sessionEnergy : DEFAULTS.sessionEnergy;
                sessionCost = state.sessionCost !== undefined ? state.sessionCost : DEFAULTS.sessionCost;
                sessionCarbon = state.sessionCarbon !== undefined ? state.sessionCarbon : DEFAULTS.sessionCarbon;
                walletBalance = state.walletBalance !== undefined ? state.walletBalance : DEFAULTS.walletBalance;
                todayEnergy = state.todayEnergy !== undefined ? state.todayEnergy : DEFAULTS.todayEnergy;
                todayCost = state.todayCost !== undefined ? state.todayCost : DEFAULTS.todayCost;
                monthlyEnergy = state.monthlyEnergy !== undefined ? state.monthlyEnergy : DEFAULTS.monthlyEnergy;
                monthlyCost = state.monthlyCost !== undefined ? state.monthlyCost : DEFAULTS.monthlyCost;
                portLocked = state.portLocked !== undefined ? state.portLocked : DEFAULTS.portLocked;
            } catch (e) {
                console.error("Error loading dashboard state", e);
            }
        } else {
            // Vehicle swapped or first load! Reset session parameters to 0
            localStorage.setItem('chargemate_last_active_vehicle_index', currentActiveVehicleIndex);
            
            // Read wallet and cumulative stats from saved if exists
            if (saved) {
                try {
                    const state = JSON.parse(saved);
                    walletBalance = state.walletBalance !== undefined ? state.walletBalance : DEFAULTS.walletBalance;
                    todayEnergy = state.todayEnergy !== undefined ? state.todayEnergy : DEFAULTS.todayEnergy;
                    todayCost = state.todayCost !== undefined ? state.todayCost : DEFAULTS.todayCost;
                    monthlyEnergy = state.monthlyEnergy !== undefined ? state.monthlyEnergy : DEFAULTS.monthlyEnergy;
                    monthlyCost = state.monthlyCost !== undefined ? state.monthlyCost : DEFAULTS.monthlyCost;
                } catch(e) {}
            }
            
            chargingActive = true;
            speed = 120;
            elapsedSeconds = 0;
            sessionEnergy = 0;
            sessionCost = 0;
            sessionCarbon = 0;
            portLocked = true;
            
            if (activeCar) {
                batteryPercent = activeCar.currentPercent !== undefined ? activeCar.currentPercent : DEFAULTS.batteryPercent;
                targetLimit = activeCar.limit !== undefined ? activeCar.limit : DEFAULTS.targetLimit;
            } else {
                batteryPercent = DEFAULTS.batteryPercent;
                targetLimit = DEFAULTS.targetLimit;
            }
        }
    }

    function saveDashboardState() {
        const state = {
            chargingActive,
            batteryPercent,
            targetLimit,
            speed,
            elapsedSeconds,
            sessionEnergy,
            sessionCost,
            sessionCarbon,
            walletBalance,
            todayEnergy,
            todayCost,
            monthlyEnergy,
            monthlyCost,
            portLocked
        };
        localStorage.setItem('chargemate_dashboard_state', JSON.stringify(state));

        // Sync battery percent and limit back to the garage fleet state
        syncBatteryStateToGarage(batteryPercent, targetLimit);
    }

    // Helper to calculate miles remaining relative to battery capacity
    function calculateRemainingRange(percent) {
        const activeCar = typeof window.getActiveVehicle === 'function' ? window.getActiveVehicle() : null;
        const capacity = activeCar && activeCar.battery ? activeCar.battery : 82;
        // Estimate 4.4 miles per kWh capacity
        const maxRange = capacity * 4.4;
        return Math.round(maxRange * percent / 100);
    }

    // Helper to sync charging state changes back to garage cards
    function syncBatteryStateToGarage(percent, limit) {
        const activeIdxStr = localStorage.getItem('chargemate_active_vehicle_index');
        const savedVehiclesStr = localStorage.getItem('chargemate_vehicles');
        if (activeIdxStr !== null && savedVehiclesStr !== null) {
            try {
                const idx = parseInt(activeIdxStr);
                const list = JSON.parse(savedVehiclesStr);
                if (idx >= 0 && idx < list.length) {
                    list[idx].currentPercent = percent;
                    if (limit !== undefined) {
                        list[idx].limit = limit;
                    }
                    localStorage.setItem('chargemate_vehicles', JSON.stringify(list));
                    
                    // Update current card specs in the DOM if garage is loaded
                    const container = document.getElementById('vehicles-container');
                    if (container) {
                        const card = container.children[idx];
                        if (card) {
                            const specLimit = card.querySelector('.vehicle-specs-list .vehicle-spec-item:nth-child(2) .val');
                            if (specLimit) specLimit.textContent = `${limit}%`;
                            const specBattery = card.querySelector('.vehicle-specs-list .vehicle-spec-item:nth-child(1) .val');
                            // Re-calculate or trigger general DOM values if helpful
                        }
                    }
                }
            } catch(e) {}
        }
    }

    function resetToDefaults() {
        chargingActive = DEFAULTS.chargingActive;
        batteryPercent = DEFAULTS.batteryPercent;
        targetLimit = DEFAULTS.targetLimit;
        speed = DEFAULTS.speed;
        elapsedSeconds = DEFAULTS.elapsedSeconds;
        sessionEnergy = DEFAULTS.sessionEnergy;
        sessionCost = DEFAULTS.sessionCost;
        sessionCarbon = DEFAULTS.sessionCarbon;
        walletBalance = DEFAULTS.walletBalance;
        todayEnergy = DEFAULTS.todayEnergy;
        todayCost = DEFAULTS.todayCost;
        monthlyEnergy = DEFAULTS.monthlyEnergy;
        monthlyCost = DEFAULTS.monthlyCost;
        portLocked = DEFAULTS.portLocked;
    }

    // Smooth Count-Up Utility
    function countUp(elementId, start, end, duration, decimals = 0, prefix = '', suffix = '') {
        const obj = document.getElementById(elementId);
        if (!obj) return;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            const value = start + ease * (end - start);
            
            if (decimals === 0) {
                obj.textContent = prefix + Math.round(value) + suffix;
            } else {
                obj.textContent = prefix + value.toFixed(decimals) + suffix;
            }
            
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                obj.textContent = prefix + end.toFixed(decimals) + suffix;
            }
        }
        requestAnimationFrame(update);
    }

    // Update Battery Ring
    function updateBatteryRing(percent) {
        const ring = document.getElementById('dash-battery-ring');
        if (ring) {
            const offset = 534 * (1 - percent / 100);
            ring.style.strokeDashoffset = offset;
        }
    }

    // Animate Charging Speed Wave Graph
    function animateWave() {
        const wavePath = document.getElementById('dash-wave-path');
        if (!wavePath) return;

        if (!chargingActive || speed === 0) {
            wavePath.setAttribute('d', 'M 0 20 L 120 20');
            if (waveAnimationId) {
                cancelAnimationFrame(waveAnimationId);
                waveAnimationId = null;
            }
            return;
        }

        phase += 0.08;
        let d = 'M 0 ' + (20 + Math.sin(phase) * 3);
        for (let x = 5; x <= 120; x += 5) {
            let y = 20 + Math.sin(x * 0.15 - phase) * 4;
            d += ` L ${x} ${y}`;
        }
        wavePath.setAttribute('d', d);
        waveAnimationId = requestAnimationFrame(animateWave);
    }

    // Toggle Port Lock State
    function setPortLockState(locked) {
        portLocked = locked;
        const lockStateEl = document.getElementById('dash-lock-state');
        const btnTextPortLock = document.getElementById('btn-text-port-lock');
        const portStateEl = document.getElementById('dash-port-state');

        if (!lockStateEl || !btnTextPortLock) return;

        if (portLocked) {
            lockStateEl.textContent = 'Secured';
            lockStateEl.className = 'val';
            btnTextPortLock.textContent = 'Unlock Port';
            if (portStateEl) {
                portStateEl.textContent = 'Connected';
                portStateEl.className = 'val text-teal';
            }
        } else {
            lockStateEl.textContent = 'Unsecured';
            lockStateEl.className = 'val text-coral';
            btnTextPortLock.textContent = 'Lock Port';
            if (portStateEl) {
                portStateEl.textContent = 'Unlocked';
                portStateEl.className = 'val text-coral';
            }
        }
        saveDashboardState();
    }

    // Toggle Charging Active State
    function setChargingState(active) {
        chargingActive = active;
        const connectionStatus = document.getElementById('dash-connection-status');
        const batteryStatus = document.getElementById('dash-battery-status');
        const btnTextCharging = document.getElementById('btn-text-charging');
        const speedVal = document.getElementById('dash-speed-val');
        const indicator = document.querySelector('.status-indicator');

        if (!connectionStatus || !batteryStatus || !btnTextCharging || !speedVal) return;

        if (chargingActive) {
            speed = 120;
            connectionStatus.textContent = 'Connected';
            batteryStatus.textContent = 'Charging';
            btnTextCharging.textContent = 'Pause Session';
            speedVal.textContent = `${speed} kW`;
            if (indicator) indicator.classList.add('active');
            
            // Auto lock the port when starting charging
            if (!portLocked) {
                setPortLockState(true);
            }

            // Start wave animation if not running
            if (!waveAnimationId) {
                animateWave();
            }
        } else {
            speed = 0;
            if (batteryPercent >= targetLimit) {
                connectionStatus.textContent = 'Finished';
                batteryStatus.textContent = 'Target Reached';
                btnTextCharging.textContent = 'Resume Session';
            } else {
                connectionStatus.textContent = 'Paused';
                batteryStatus.textContent = 'Paused';
                btnTextCharging.textContent = 'Resume Session';
            }
            speedVal.textContent = `0 kW`;
            if (indicator) indicator.classList.remove('active');

            // Flatten wave
            if (waveAnimationId) {
                cancelAnimationFrame(waveAnimationId);
                waveAnimationId = null;
            }
            const wavePath = document.getElementById('dash-wave-path');
            if (wavePath) {
                wavePath.setAttribute('d', 'M 0 20 L 120 20');
            }
        }
        saveDashboardState();
    }

    // Initialize Dashboard Elements & Loops
    window.initDashboard = function(user) {
        // Load stored state if any, else default
        loadDashboardState();

        // 1. Display Vehicle Name (User registered vehicle or active garage fleet car)
        const vehicleNameEl = document.getElementById('dash-vehicle-name');
        const activeCar = typeof window.getActiveVehicle === 'function' ? window.getActiveVehicle() : null;
        if (vehicleNameEl) {
            const vehicleNameMap = {
                'byd-seal': 'BYD Seal',
                'byd-han': 'BYD Han',
                'tesla-model-y': 'Tesla Model Y',
                'audi-etron': 'Audi e-tron GT',
                'taycan': 'Porsche Taycan'
            };
            if (activeCar) {
                vehicleNameEl.textContent = vehicleNameMap[activeCar.model] || activeCar.model;
            } else if (user && user.car) {
                vehicleNameEl.textContent = vehicleNameMap[user.car] || 'BYD Seal';
            }
        }

        // 2. Set up initial slider displays
        const targetSlider = document.getElementById('dash-target-slider');
        const sliderDisplay = document.getElementById('dash-target-slider-display');
        const topDisplay = document.getElementById('dash-target-display');
        if (targetSlider) {
            targetSlider.value = targetLimit;
            if (sliderDisplay) sliderDisplay.textContent = `${targetLimit}%`;
            if (topDisplay) topDisplay.textContent = `${targetLimit}%`;
        }

        // 3. Trigger Count-Up Animations for Premium SaaS Feel
        // Animate the progress ring from 0 to current percent
        const ring = document.getElementById('dash-battery-ring');
        if (ring) {
            ring.style.strokeDashoffset = 534;
            setTimeout(() => {
                updateBatteryRing(batteryPercent);
            }, 50);
        }

        countUp('dash-battery-percent', 0, batteryPercent, 1200, 0, '', '%');
        countUp('dash-remaining-range', 0, calculateRemainingRange(batteryPercent), 1200, 0, '', ' mi');
        countUp('dash-speed-val', 0, chargingActive ? speed : 0, 1200, 0, '', ' kW');
        countUp('dash-session-cost', 0, sessionCost, 1200, 2, '$');
        countUp('dash-session-energy', 0, sessionEnergy, 1200, 1, '', ' kWh');
        countUp('dash-session-carbon', 0, sessionCarbon, 1200, 1, '', ' lbs');
        countUp('dash-wallet-balance', 0, walletBalance, 1200, 2, '$');
        countUp('dash-today-energy', 0, todayEnergy, 1200, 1, '', ' kWh');
        countUp('dash-today-cost', 0, todayCost, 1200, 2, '$', ' • 2 sessions');
        countUp('dash-monthly-energy', 0, monthlyEnergy, 1200, 1, '', ' kWh');
        countUp('dash-monthly-cost', 0, monthlyCost, 1200, 2, '$', ' • 14 sessions');

        // Apply locked & charging active configurations
        setPortLockState(portLocked);
        setChargingState(chargingActive);

        // 4. Register Action Button Event Listeners
        const btnTogglePort = document.getElementById('btn-toggle-port-lock');
        if (btnTogglePort) {
            btnTogglePort.onclick = function() {
                setPortLockState(!portLocked);
            };
        }

        const btnToggleCharging = document.getElementById('btn-toggle-charging');
        if (btnToggleCharging) {
            btnToggleCharging.onclick = function() {
                // Cannot charge if port is not secured/connected
                if (!chargingActive && !portLocked) {
                    // Lock the port first
                    setPortLockState(true);
                }
                setChargingState(!chargingActive);
            };
        }

        const sliderInput = document.getElementById('dash-target-slider');
        if (sliderInput) {
            sliderInput.oninput = function() {
                targetLimit = parseInt(this.value);
                if (sliderDisplay) sliderDisplay.textContent = `${targetLimit}%`;
                if (topDisplay) topDisplay.textContent = `${targetLimit}%`;
                saveDashboardState();

                // If battery is below new target, allow resuming
                if (batteryPercent < targetLimit && !chargingActive && document.getElementById('dash-battery-status').textContent === 'Target Reached') {
                    setChargingState(true);
                }
            };
        }

        const btnWalletTopup = document.getElementById('btn-wallet-topup');
        if (btnWalletTopup) {
            btnWalletTopup.onclick = function() {
                const walletSec = document.getElementById('wallet');
                if (walletSec) {
                    walletSec.scrollIntoView({ behavior: 'smooth' });
                    // Update active link state in navigation
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === '#wallet') {
                            link.classList.add('active');
                        }
                    });
                }
            };
        }

        const btnDirections = document.getElementById('btn-dash-directions');
        if (btnDirections) {
            btnDirections.onclick = function() {
                // Scroll to Map Section
                const mapSection = document.getElementById('map');
                if (mapSection) {
                    const offset = 80;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = mapSection.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }

                // Programmatically trigger map focus in Shenzhen sz-2 station (Futian Central Plaza)
                if (typeof CITIES_DATA !== 'undefined' && typeof selectStation === 'function') {
                    const futian = CITIES_DATA['shenzhen']?.stations.find(s => s.id === 'sz-2');
                    if (futian) {
                        // Switch active map tab
                        const szTab = document.querySelector('.city-tab[data-city="shenzhen"]');
                        if (szTab && !szTab.classList.contains('active')) {
                            szTab.click();
                        }
                        // Focus on node
                        selectStation(futian);
                    }
                }
            };
        }

        // 5. Start Telemetry Loops
        // A. Timer clock loop (ticks every 1s)
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (chargingActive) {
                elapsedSeconds++;
                const mins = Math.floor(elapsedSeconds / 60);
                const secs = elapsedSeconds % 60;
                const elapsedStr = `${mins}m ${secs}s`;
                
                const elapsedEl = document.getElementById('dash-elapsed-time');
                if (elapsedEl) elapsedEl.textContent = elapsedStr;

                // Physics-based session increments
                const energyAdded = speed / 3600; // kW * s -> kWh
                sessionEnergy += energyAdded;
                sessionCost += energyAdded * 0.18; // rate $0.18 per kWh
                sessionCarbon += energyAdded * 0.245; // carbon savings factor

                const energyEl = document.getElementById('dash-session-energy');
                const costEl = document.getElementById('dash-session-cost');
                const carbonEl = document.getElementById('dash-session-carbon');

                if (energyEl) energyEl.textContent = `${sessionEnergy.toFixed(1)} kWh`;
                if (costEl) costEl.textContent = `$${sessionCost.toFixed(2)}`;
                if (carbonEl) carbonEl.textContent = `${sessionCarbon.toFixed(1)} lbs`;

                // Update cumulative stats
                todayEnergy += energyAdded;
                todayCost += energyAdded * 0.18;
                monthlyEnergy += energyAdded;
                monthlyCost += energyAdded * 0.18;

                const todayEnergyEl = document.getElementById('dash-today-energy');
                const todayCostEl = document.getElementById('dash-today-cost');
                const monthlyEnergyEl = document.getElementById('dash-monthly-energy');
                const monthlyCostEl = document.getElementById('dash-monthly-cost');

                if (todayEnergyEl) todayEnergyEl.textContent = `${todayEnergy.toFixed(1)} kWh`;
                if (todayCostEl) todayCostEl.textContent = `$${todayCost.toFixed(2)} • 2 sessions`;
                if (monthlyEnergyEl) monthlyEnergyEl.textContent = `${monthlyEnergy.toFixed(1)} kWh`;
                if (monthlyCostEl) monthlyCostEl.textContent = `$${monthlyCost.toFixed(2)} • 14 sessions`;

                saveDashboardState();
            }
        }, 1000);

        // B. Battery Charging loop (ticks every 5 seconds)
        if (telemetryInterval) clearInterval(telemetryInterval);
        telemetryInterval = setInterval(() => {
            if (chargingActive) {
                if (batteryPercent < targetLimit) {
                    batteryPercent++;
                    
                    const percentEl = document.getElementById('dash-battery-percent');
                    const rangeEl = document.getElementById('dash-remaining-range');

                    if (percentEl) percentEl.textContent = `${batteryPercent}%`;
                    if (rangeEl) rangeEl.textContent = `${calculateRemainingRange(batteryPercent)} mi`;

                    updateBatteryRing(batteryPercent);

                    // Reached limit trigger
                    if (batteryPercent >= targetLimit) {
                        setChargingState(false);
                    }
                    saveDashboardState();
                }
            }
        }, 5000);

        animateWave();
        if (typeof window.initScheduler === 'function') {
            window.initScheduler();
        }
    };

    // Clean up timers & animation loop when logging out
    window.destroyDashboard = function() {
        if (telemetryInterval) {
            clearInterval(telemetryInterval);
            telemetryInterval = null;
        }
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        if (waveAnimationId) {
            cancelAnimationFrame(waveAnimationId);
            waveAnimationId = null;
        }
        resetToDefaults();
        localStorage.removeItem('chargemate_dashboard_state');
    };
})();
