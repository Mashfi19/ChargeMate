/* ==========================================================================
   ChargeMate - Garage Fleet & Vehicle Management Script
   ========================================================================== */

(function() {
    // Global Garage State
    let vehiclesList = [];
    let activeVehicleIndex = 0;

    // Model name mapping helpers
    const MODEL_NAMES = {
        'byd-seal': 'BYD Seal',
        'byd-han': 'BYD Han',
        'tesla-model-y': 'Tesla Model Y',
        'audi-etron': 'Audi e-tron GT',
        'taycan': 'Porsche Taycan'
    };

    const VEHICLE_IMAGES = {
        'byd-seal': 'assets/images/byd-seal-card.png',
        'byd-han': 'assets/images/byd-han-card.png',
        'tesla-model-y': 'assets/images/tesla-y.png',
        'audi-etron': 'assets/images/audi-etron.png',
        'taycan': 'assets/images/taycan.png'
    };

    // Default mock fleet if localStorage is empty
    const DEFAULT_VEHICLES = [
        {
            model: 'byd-seal',
            battery: 82,
            software: 'v2.4.1',
            tire: 36,
            service: '2026-05-12',
            charger: 'ChargeMate Pro (22kW)',
            health: 'Excellent',
            chargeStart: '22:00',
            chargeEnd: '06:00',
            limit: 90,
            currentPercent: 78 // Default state
        },
        {
            model: 'byd-han',
            battery: 76.9,
            software: 'v2.3.9',
            tire: 35,
            service: '2026-04-02',
            charger: 'ChargeMate Pro (22kW)',
            health: 'Good',
            chargeStart: '23:00',
            chargeEnd: '05:00',
            limit: 85,
            currentPercent: 62 // Starts lower for variety
        }
    ];

    document.addEventListener('DOMContentLoaded', () => {
        initGarage();
    });

    function initGarage() {
        loadVehicles();
        renderVehicles();
        registerEvents();
    }

    function loadVehicles() {
        const savedVehicles = localStorage.getItem('chargemate_vehicles');
        const savedActiveIndex = localStorage.getItem('chargemate_active_vehicle_index');

        if (savedVehicles) {
            try {
                vehiclesList = JSON.parse(savedVehicles);
                activeVehicleIndex = savedActiveIndex !== null ? parseInt(savedActiveIndex) : 0;
                
                // Safety bound check
                if (activeVehicleIndex >= vehiclesList.length) {
                    activeVehicleIndex = vehiclesList.length > 0 ? 0 : -1;
                }
            } catch (e) {
                console.error("Error loading vehicles from localStorage", e);
                resetToDefaultFleet();
            }
        } else {
            resetToDefaultFleet();
        }
    }

    function resetToDefaultFleet() {
        vehiclesList = JSON.parse(JSON.stringify(DEFAULT_VEHICLES));
        activeVehicleIndex = 0;
        saveVehiclesState();
    }

    function saveVehiclesState() {
        localStorage.setItem('chargemate_vehicles', JSON.stringify(vehiclesList));
        localStorage.setItem('chargemate_active_vehicle_index', activeVehicleIndex.toString());
    }

    // Exposed helper for dashboard to read current vehicle configurations
    window.getActiveVehicle = function() {
        if (activeVehicleIndex >= 0 && activeVehicleIndex < vehiclesList.length) {
            return vehiclesList[activeVehicleIndex];
        }
        return null;
    };

    // Render vehicle cards grid dynamically
    function renderVehicles() {
        const container = document.getElementById('vehicles-container');
        if (!container) return;

        container.innerHTML = '';

        // Render existing vehicles
        vehiclesList.forEach((car, index) => {
            const isActive = index === activeVehicleIndex;
            const modelName = MODEL_NAMES[car.model] || car.model;
            
            // Health badge settings
            let healthClass = 'healthy';
            if (car.health === 'Service Required') healthClass = 'warning';
            
            // Preferred time formatting
            const timeFormat = `${car.chargeStart} - ${car.chargeEnd}`;

            const card = document.createElement('div');
            card.className = `vehicle-card ${isActive ? 'active' : ''} reveal-on-scroll`;
            
            const imageSrc = VEHICLE_IMAGES[car.model] || 'assets/images/byd-seal-card.png';

            card.innerHTML = `
                <div class="vehicle-card-header">
                    <div>
                        <h4 class="vehicle-model-title">${modelName}</h4>
                        <span class="widget-tag">Active Drive Diagnostics</span>
                    </div>
                    ${isActive ? `<span class="vehicle-active-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        Active
                     </span>` : ''}
                </div>

                <div class="vehicle-card-image reveal-img-wrapper">
                    <img src="${imageSrc}" alt="${modelName}" class="reveal-img" width="1024" height="1024" loading="lazy" onerror="this.style.display='none'">
                </div>

                <div class="vehicle-specs-list">
                    <div class="vehicle-spec-item">
                        <span class="lbl">Battery Size</span>
                        <span class="val text-highlight">${car.battery} kWh</span>
                    </div>
                    <div class="vehicle-spec-item">
                        <span class="lbl">Charge Limit</span>
                        <span class="val">${car.limit}%</span>
                    </div>
                    <div class="vehicle-spec-item">
                        <span class="lbl">Diagnostics</span>
                        <span class="val diagnostic-status ${healthClass}">
                            <span class="status-dot"></span>
                            ${car.health}
                        </span>
                    </div>
                    <div class="vehicle-spec-item">
                        <span class="lbl">Tire Pressure</span>
                        <span class="val">${car.tire} psi</span>
                    </div>
                    <div class="vehicle-spec-item">
                        <span class="lbl">Software</span>
                        <span class="val">${car.software}</span>
                    </div>
                    <div class="vehicle-spec-item">
                        <span class="lbl">Home Charger</span>
                        <span class="val text-teal">${car.charger.replace(' (22kW)', '').replace(' (11kW)', '')}</span>
                    </div>
                    <div class="vehicle-spec-item" style="grid-column: span 2;">
                        <span class="lbl">Charge window</span>
                        <span class="val" style="font-size: 13px;">${timeFormat}</span>
                    </div>
                    <div class="vehicle-spec-item" style="grid-column: span 2;">
                        <span class="lbl">Last Service</span>
                        <span class="val" style="font-size: 13px;">${car.service}</span>
                    </div>
                </div>

                <div class="vehicle-card-actions">
                    ${!isActive ? `<button class="btn btn-outline btn-sm btn-set-active" data-index="${index}">Use Vehicle</button>` : `<span style="font-size: 12px; color: var(--clr-text-muted); font-weight: 500;">Currently Connected</span>`}
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-outline btn-sm btn-edit-vehicle" data-index="${index}" style="padding: 6px 10px; border-color: var(--border-color);" aria-label="Edit vehicle">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                        <button class="btn btn-outline btn-sm btn-delete-vehicle" data-index="${index}" style="padding: 6px 10px; border-color: var(--border-color); color: var(--clr-red);" aria-label="Remove vehicle">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Append the "Add Vehicle" card block
        const addCard = document.createElement('div');
        addCard.className = 'add-vehicle-card reveal-on-scroll';
        addCard.id = 'card-trigger-add-vehicle';
        addCard.innerHTML = `
            <div class="add-vehicle-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            <span>Add Vehicle</span>
        `;
        container.appendChild(addCard);

        // Bind clicks on rendered elements
        bindDynamicActions();
    }

    function bindDynamicActions() {
        // "Use Vehicle" (Set Active) click
        document.querySelectorAll('.btn-set-active').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                setActiveVehicle(index);
            });
        });

        // "Edit Vehicle" click
        document.querySelectorAll('.btn-edit-vehicle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                openVehicleModal(index);
            });
        });

        // "Delete Vehicle" click
        document.querySelectorAll('.btn-delete-vehicle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                removeVehicle(index);
            });
        });

        // "Add Vehicle" blank card trigger
        const addBtn = document.getElementById('card-trigger-add-vehicle');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                openVehicleModal(); // opens empty form
            });
        }
    }

    function setActiveVehicle(index) {
        if (index < 0 || index >= vehiclesList.length) return;
        activeVehicleIndex = index;
        saveVehiclesState();
        renderVehicles();
        
        // Notify dashboard to sync active specifications
        triggerDashboardSync();
    }

    function removeVehicle(index) {
        if (index < 0 || index >= vehiclesList.length) return;
        
        const modelName = MODEL_NAMES[vehiclesList[index].model] || vehiclesList[index].model;
        if (!confirm(`Are you sure you want to remove the ${modelName} from your garage fleet?`)) return;

        vehiclesList.splice(index, 1);

        // If we deleted the active vehicle, re-assign active index
        if (activeVehicleIndex === index) {
            activeVehicleIndex = vehiclesList.length > 0 ? 0 : -1;
        } else if (activeVehicleIndex > index) {
            activeVehicleIndex--;
        }

        saveVehiclesState();
        renderVehicles();
        triggerDashboardSync();
    }

    function openVehicleModal(editIndex = null) {
        const modal = document.getElementById('vehicle-modal');
        const form = document.getElementById('vehicle-form');
        const title = document.getElementById('vehicle-modal-title');
        const submitText = document.getElementById('vehicle-form-submit-text');
        const editField = document.getElementById('vehicle-edit-index');
        
        if (!modal || !form || !title || !submitText || !editField) return;

        form.reset();

        if (editIndex !== null && editIndex >= 0 && editIndex < vehiclesList.length) {
            // Edit Mode: Prefill values
            const car = vehiclesList[editIndex];
            editField.value = editIndex.toString();
            title.textContent = "Edit Vehicle Details";
            submitText.textContent = "Save Changes";

            document.getElementById('vehicle-model').value = car.model;
            document.getElementById('vehicle-battery').value = car.battery;
            document.getElementById('vehicle-software').value = car.software;
            document.getElementById('vehicle-tire').value = car.tire;
            document.getElementById('vehicle-service').value = car.service;
            document.getElementById('vehicle-charger').value = car.charger;
            document.getElementById('vehicle-health').value = car.health;
            document.getElementById('vehicle-charge-start').value = car.chargeStart;
            document.getElementById('vehicle-charge-end').value = car.chargeEnd;
            document.getElementById('vehicle-limit').value = car.limit;
            document.getElementById('modal-charge-limit-display').textContent = `${car.limit}%`;
        } else {
            // Add Mode: Reset values
            editField.value = "";
            title.textContent = "Add Vehicle to Garage";
            submitText.textContent = "Add Vehicle";
            document.getElementById('vehicle-service').value = new Date().toISOString().split('T')[0];
            document.getElementById('modal-charge-limit-display').textContent = "90%";
        }

        modal.classList.add('active');
    }

    function closeVehicleModal() {
        const modal = document.getElementById('vehicle-modal');
        if (modal) modal.classList.remove('active');
    }

    function registerEvents() {
        // Modal close button clicks
        const closeBtn = document.getElementById('vehicle-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeVehicleModal);
        }

        const modalOverlay = document.getElementById('vehicle-modal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) closeVehicleModal();
            });
        }

        // Live slider updates inside the form modal
        const slider = document.getElementById('vehicle-limit');
        const display = document.getElementById('modal-charge-limit-display');
        if (slider && display) {
            slider.addEventListener('input', (e) => {
                display.textContent = `${e.target.value}%`;
            });
        }

        // Form Submit handler
        const form = document.getElementById('vehicle-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                handleFormSubmit();
            });
        }
    }

    function handleFormSubmit() {
        const editField = document.getElementById('vehicle-edit-index');
        const model = document.getElementById('vehicle-model').value;
        const battery = parseFloat(document.getElementById('vehicle-battery').value);
        const software = document.getElementById('vehicle-software').value;
        const tire = parseInt(document.getElementById('vehicle-tire').value);
        const service = document.getElementById('vehicle-service').value;
        const charger = document.getElementById('vehicle-charger').value;
        const health = document.getElementById('vehicle-health').value;
        const chargeStart = document.getElementById('vehicle-charge-start').value;
        const chargeEnd = document.getElementById('vehicle-charge-end').value;
        const limit = parseInt(document.getElementById('vehicle-limit').value);
        
        const submitBtn = document.querySelector('#vehicle-form button[type="submit"]');

        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }

        setTimeout(() => {
            const editIndexStr = editField.value;
            const vehicleData = {
                model,
                battery,
                software,
                tire,
                service,
                charger,
                health,
                chargeStart,
                chargeEnd,
                limit
            };

            if (editIndexStr !== "") {
                // Save edit
                const idx = parseInt(editIndexStr);
                // Retain current percent state or merge
                vehicleData.currentPercent = vehiclesList[idx].currentPercent || 78;
                vehiclesList[idx] = vehicleData;

                // Sync to dashboard state if it is the active vehicle
                if (idx === activeVehicleIndex) {
                    const savedDashState = localStorage.getItem('chargemate_dashboard_state');
                    if (savedDashState) {
                        try {
                            const dashState = JSON.parse(savedDashState);
                            dashState.targetLimit = vehicleData.limit;
                            localStorage.setItem('chargemate_dashboard_state', JSON.stringify(dashState));
                        } catch (e) {
                            console.error("Error syncing edited vehicle limit to dashboard state", e);
                        }
                    }
                }
            } else {
                // Add new vehicle
                vehicleData.currentPercent = 78; // Initial battery
                vehiclesList.push(vehicleData);
                // If garage was empty, set active to the new car
                if (activeVehicleIndex === -1) {
                    activeVehicleIndex = 0;
                }
            }

            saveVehiclesState();
            renderVehicles();
            closeVehicleModal();

            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }

            // Sync dashboard
            triggerDashboardSync();
        }, 800);
    }

    function triggerDashboardSync() {
        if (typeof window.initDashboard === 'function') {
            const user = JSON.parse(localStorage.getItem('chargemate_user'));
            // This reboots the dashboard with the active vehicle state
            window.initDashboard(user);
        }
    }
})();
