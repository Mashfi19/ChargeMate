/* ==========================================================================
   ChargeMate - Smart Charging Scheduler Logic
   ========================================================================== */

(function() {
    // Hardcoded stations matching map points
    const STATIONS = [
        { id: 'sz-1', name: 'Shenzhen Bay Hub', rate: 1.82, speed: 350, currency: '¥', spec: '350 kW DC' },
        { id: 'sz-2', name: 'Futian Central Plaza Grid', rate: 2.10, speed: 350, currency: '¥', spec: '350 kW DC' },
        { id: 'sz-3', name: 'Luohu MixC Plaza', rate: 1.65, speed: 150, currency: '¥', spec: '150 kW DC' },
        { id: 'ny-1', name: 'Times Square Central Plaza', rate: 0.45, speed: 350, currency: '$', spec: '350 kW DC' },
        { id: 'ny-2', name: 'Central Park West Depot', rate: 0.38, speed: 150, currency: '$', spec: '150 kW DC' },
        { id: 'ny-3', name: 'Brooklyn DUMBO Grid', rate: 0.42, speed: 350, currency: '$', spec: '350 kW DC' },
        { id: 'ldn-1', name: 'Hyde Park Charger Gate', rate: 0.48, speed: 150, currency: '£', spec: '150 kW DC' },
        { id: 'ldn-2', name: 'Westminster Hub', rate: 0.52, speed: 350, currency: '£', spec: '350 kW DC' },
        { id: 'ldn-3', name: 'Canary Wharf Plaza', rate: 0.45, speed: 350, currency: '£', spec: '350 kW DC' },
        { id: 'ldn-4', name: 'Heathrow Airport Plaza', rate: 0.50, speed: 350, currency: '£', spec: '350 kW DC' },
        { id: 'de-1', name: 'Munich Olympiapark Hub', rate: 0.52, speed: 350, currency: '€', spec: '350 kW DC' },
        { id: 'de-2', name: 'Munich Odeonsplatz Grid', rate: 0.48, speed: 150, currency: '€', spec: '150 kW DC' },
        { id: 'de-3', name: 'Marienplatz Station', rate: 0.50, speed: 150, currency: '€', spec: '150 kW DC' },
        { id: 'de-4', name: 'Munich Airport Plaza', rate: 0.55, speed: 350, currency: '€', spec: '350 kW DC' },
        { id: 'tx-1', name: 'Downtown Austin Center', rate: 0.39, speed: 350, currency: '$', spec: '350 kW DC' },
        { id: 'tx-2', name: 'Tesla Giga Texas Plaza', rate: 0.32, speed: 350, currency: '$', spec: '350 kW DC' },
        { id: 'tx-3', name: 'Domain Retail Grid', rate: 0.42, speed: 150, currency: '$', spec: '150 kW DC' },
        { id: 'tx-4', name: 'Austin Airport Depot', rate: 0.38, speed: 150, currency: '$', spec: '150 kW DC' }
    ];

    // Vehicles helper map
    const MODEL_NAMES = {
        'byd-seal': 'BYD Seal',
        'byd-han': 'BYD Han',
        'tesla-model-y': 'Tesla Model Y',
        'audi-etron': 'Audi e-tron',
        'taycan': 'Porsche Taycan'
    };

    // State Variables
    let schedulesList = [];
    let selectedDate = new Date();
    let currentMonth = new Date(); // Month currently viewed on calendar
    let isInitialized = false;

    // Default pre-populated schedule for demonstration matching dashboard ticket
    const DEFAULT_SCHEDULES = [
        {
            id: 'default-sched-1',
            date: getFormattedDateOffset(1), // Tomorrow
            time: '10:30',
            stationId: 'sz-2',
            startSoc: 20,
            targetSoc: 80,
            vehicleModel: 'byd-seal',
            capacity: 82,
            cost: 103.32, // 82 * 0.6 * 2.10
            duration: 9, // (82*0.6)/350 * 60 = ~8.4 min -> 9 min
            energy: 49.2
        }
    ];

    // Helper: Get YYYY-MM-DD string offset from today
    function getFormattedDateOffset(daysOffset) {
        const d = new Date();
        d.setDate(d.getDate() + daysOffset);
        return d.toISOString().split('T')[0];
    }

    // Expose Global Initializer
    window.initScheduler = function() {
        if (!isInitialized) {
            registerSchedulerEvents();
            isInitialized = true;
        }
        
        loadSchedules();
        populateStations();
        
        // Default form date to today
        const dateInput = document.getElementById('sched-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        updateEstimates();
        renderCalendar();
        renderTimeline();
        syncUpcomingReservationToDashboard();
    };

    // Expose Global Cleanup
    window.destroyScheduler = function() {
        schedulesList = [];
        localStorage.removeItem('chargemate_schedules');
        isInitialized = false;
    };

    // Local Storage Loader
    function loadSchedules() {
        const saved = localStorage.getItem('chargemate_schedules');
        if (saved) {
            try {
                schedulesList = JSON.parse(saved);
            } catch (e) {
                console.error("Error loading schedules", e);
                schedulesList = [...DEFAULT_SCHEDULES];
            }
        } else {
            schedulesList = [...DEFAULT_SCHEDULES];
            saveSchedulesState();
        }
    }

    function saveSchedulesState() {
        localStorage.setItem('chargemate_schedules', JSON.stringify(schedulesList));
    }

    // Populates Station Selector Dropdown
    function populateStations() {
        const select = document.getElementById('sched-station');
        if (!select) return;

        // Clean out default placeholder
        select.innerHTML = '';

        STATIONS.forEach(st => {
            const opt = document.createElement('option');
            opt.value = st.id;
            opt.textContent = `${st.name} (${st.spec} • ${st.currency}${st.rate}/kWh)`;
            select.appendChild(opt);
        });
    }

    // Cost and Duration Math Calculations
    function updateEstimates() {
        const startSlider = document.getElementById('sched-start-soc');
        const targetSlider = document.getElementById('sched-target-soc');
        const stationSelect = document.getElementById('sched-station');
        
        const estCostEl = document.getElementById('sched-est-cost');
        const estTimeEl = document.getElementById('sched-est-time');
        const estEnergyEl = document.getElementById('sched-est-energy');
        const estSpeedEl = document.getElementById('sched-est-speed');

        if (!startSlider || !targetSlider || !stationSelect) return;

        // Clean constraints: Starting SoC must be less than Target SoC
        let startSoc = parseInt(startSlider.value);
        let targetSoc = parseInt(targetSlider.value);

        if (targetSoc <= startSoc) {
            targetSoc = Math.min(startSoc + 5, 100);
            targetSlider.value = targetSoc;
            const targetDisplay = document.getElementById('sched-target-display');
            if (targetDisplay) targetDisplay.textContent = `${targetSoc}%`;
        }

        // Active vehicle details
        const activeCar = typeof window.getActiveVehicle === 'function' ? window.getActiveVehicle() : null;
        const capacity = activeCar && activeCar.battery ? activeCar.battery : 82; // Default to BYD Seal 82kWh

        // Selected station details
        const station = STATIONS.find(s => s.id === stationSelect.value) || STATIONS[0];

        // Math Formulas
        const energyRequired = capacity * (targetSoc - startSoc) / 100; // kWh
        const costVal = energyRequired * station.rate; // Currency
        const durationMin = Math.max(10, Math.round((energyRequired / station.speed) * 60)); // Minutes (10m minimum)

        // Render Values
        if (estCostEl) estCostEl.textContent = `${station.currency}${costVal.toFixed(2)}`;
        if (estTimeEl) {
            if (durationMin >= 60) {
                const hrs = Math.floor(durationMin / 60);
                const mins = durationMin % 60;
                estTimeEl.textContent = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
            } else {
                estTimeEl.textContent = `${durationMin} mins`;
            }
        }
        if (estEnergyEl) estEnergyEl.textContent = `${energyRequired.toFixed(1)} kWh`;
        if (estSpeedEl) estSpeedEl.textContent = `${station.speed} kW`;

        return {
            cost: costVal,
            duration: durationMin,
            energy: energyRequired,
            currency: station.currency
        };
    }

    // Dynamic Calendar Drawer
    function renderCalendar() {
        const cellsContainer = document.getElementById('calendar-cells');
        const monthTitle = document.getElementById('calendar-month-title');
        if (!cellsContainer || !monthTitle) return;

        cellsContainer.innerHTML = '';

        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // Month Names header
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        monthTitle.textContent = `${monthNames[month]} ${year}`;

        // Get first day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
        // Convert to Mon=0, Tue=1, ..., Sun=6 grid offset
        const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevMonthTotalDays = new Date(year, month, 0).getDate();

        // Total grid blocks: 35 or 42 based on layout
        const totalCellsNeeded = firstDayIndex + totalDays > 35 ? 42 : 35;

        // Render Previous Month Padding Days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const dayNum = prevMonthTotalDays - i;
            const cell = createCalendarDayElement(dayNum, false, true, year, month - 1);
            cellsContainer.appendChild(cell);
        }

        // Render Current Month Days
        for (let i = 1; i <= totalDays; i++) {
            const cell = createCalendarDayElement(i, true, false, year, month);
            cellsContainer.appendChild(cell);
        }

        // Render Next Month Padding Days
        const remainingCells = totalCellsNeeded - (firstDayIndex + totalDays);
        for (let i = 1; i <= remainingCells; i++) {
            const cell = createCalendarDayElement(i, false, true, year, month + 1);
            cellsContainer.appendChild(cell);
        }
    }

    function createCalendarDayElement(dayNum, isActiveMonth, isPadding, year, monthIdx) {
        // Adjust for padding month indices under/overflow
        let targetYear = year;
        let targetMonth = monthIdx;
        if (targetMonth < 0) {
            targetMonth = 11;
            targetYear--;
        } else if (targetMonth > 11) {
            targetMonth = 0;
            targetYear++;
        }

        const dateString = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const dayCell = document.createElement('div');
        dayCell.className = `calendar-day ${isActiveMonth ? 'active-day' : 'other-month'}`;
        dayCell.setAttribute('data-date', dateString);

        // Date text
        dayCell.innerHTML = `<span>${dayNum}</span><span class="dot"></span>`;

        // Check if selected
        const isSelected = selectedDate.getFullYear() === targetYear &&
                           selectedDate.getMonth() === targetMonth &&
                           selectedDate.getDate() === dayNum;
        if (isSelected) {
            dayCell.classList.add('selected');
        }

        // Check if today
        const today = new Date();
        const isToday = today.getFullYear() === targetYear &&
                        today.getMonth() === targetMonth &&
                        today.getDate() === dayNum;
        if (isToday) {
            dayCell.classList.add('today');
        }

        // Check if has scheduled slots
        const hasSchedule = schedulesList.some(s => s.date === dateString);
        if (hasSchedule) {
            dayCell.classList.add('has-schedule');
        }

        // Click Handler
        dayCell.addEventListener('click', () => {
            selectedDate = new Date(targetYear, targetMonth, dayNum);
            
            // If they click a padding day, adjust calendar viewed month
            if (isPadding) {
                currentMonth = new Date(targetYear, targetMonth, 1);
            }

            renderCalendar();
            renderTimeline();
        });

        return dayCell;
    }

    // Daily Vertical Timeline Drawer
    function renderTimeline() {
        const axisContainer = document.getElementById('timeline-axis-element');
        const slotsContainer = document.getElementById('timeline-slots-container');
        const dateDisplay = document.getElementById('timeline-date-display');
        const placeholder = document.getElementById('timeline-no-events-placeholder');

        if (!axisContainer || !slotsContainer || !dateDisplay || !placeholder) return;

        // Render timeline selected header date string
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        dateDisplay.textContent = selectedDate.toLocaleDateString('en-US', options);

        // 1. Generate Hourly Axis (Grid line rows)
        axisContainer.innerHTML = '';
        for (let hour = 0; hour < 24; hour++) {
            const row = document.createElement('div');
            row.className = 'timeline-hour-row';
            
            // Format hour label (e.g. 10:00 AM)
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 === 0 ? 12 : hour % 12;
            const hourLabelStr = `${displayHour}:00 ${ampm}`;

            row.innerHTML = `<div class="timeline-hour-lbl">${hourLabelStr}</div>`;
            axisContainer.appendChild(row);
        }

        // 2. Plot absolutely positioned schedule capsules
        // Clear previous blocks, keeping placeholder
        const blocks = slotsContainer.querySelectorAll('.timeline-block');
        blocks.forEach(b => b.remove());

        // Find schedules matching selected date (YYYY-MM-DD)
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const daySchedules = schedulesList.filter(s => s.date === dateStr);

        if (daySchedules.length > 0) {
            placeholder.style.display = 'none';

            daySchedules.forEach(sched => {
                const station = STATIONS.find(s => s.id === sched.stationId) || STATIONS[0];
                const modelName = MODEL_NAMES[sched.vehicleModel] || sched.vehicleModel;
                
                // Parse Time (HH:MM) to calculate top offset
                const timeParts = sched.time.split(':');
                const startHour = parseInt(timeParts[0]);
                const startMin = parseInt(timeParts[1]);

                // Vertical Layout Math: 60px = 1 hour (1px = 1 minute)
                const topPos = (startHour * 60) + startMin;
                const heightVal = sched.duration; // minutes = pixels

                // Format times for display label
                const ampm = startHour >= 12 ? 'PM' : 'AM';
                const displayHr = startHour % 12 === 0 ? 12 : startHour % 12;
                const startLabel = `${displayHr}:${String(startMin).padStart(2, '0')} ${ampm}`;

                // Calculate end time
                const endTotalMin = (startHour * 60) + startMin + sched.duration;
                const endHour = Math.floor(endTotalMin / 60) % 24;
                const endMin = endTotalMin % 60;
                const endAmpm = endHour >= 12 ? 'PM' : 'AM';
                const displayEndHr = endHour % 12 === 0 ? 12 : endHour % 12;
                const endLabel = `${displayEndHr}:${String(endMin).padStart(2, '0')} ${endAmpm}`;

                const block = document.createElement('div');
                block.className = `timeline-block ${station.speed >= 350 ? 'dc-fast' : ''}`;
                block.style.top = `${topPos}px`;
                block.style.height = `${heightVal}px`;

                block.innerHTML = `
                    <span class="title">${station.name}</span>
                    <span class="time-lbl">${startLabel} - ${endLabel} • ${modelName} (${sched.startSoc}%➔${sched.targetSoc}%)</span>
                `;

                // Add delete option on hover/click if wanted
                block.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`Remove scheduled session at ${station.name} (${startLabel})?`)) {
                        schedulesList = schedulesList.filter(s => s.id !== sched.id);
                        saveSchedulesState();
                        renderCalendar();
                        renderTimeline();
                        syncUpcomingReservationToDashboard();
                    }
                });

                slotsContainer.appendChild(block);
            });
        } else {
            placeholder.style.display = 'flex';
        }
    }

    // Dynamic count-up utility
    function countUp(elementId, start, end, duration, decimals = 0, prefix = '', suffix = '') {
        const obj = document.getElementById(elementId);
        if (!obj) return;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
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

    // Sync Schedules to Control Center upcoming reservations ticket
    function syncUpcomingReservationToDashboard() {
        const reservationCard = document.querySelector('.upcoming-reservation-card');
        if (!reservationCard) return;

        const ticketHeader = reservationCard.querySelector('.ticket-header');
        const ticketDetails = reservationCard.querySelector('.ticket-details');
        const directionsBtn = document.getElementById('btn-dash-directions');

        if (!ticketHeader || !ticketDetails) return;

        // Find closest future reservation
        const now = new Date();
        const futureSchedules = schedulesList.filter(sched => {
            const sDate = new Date(`${sched.date}T${sched.time}:00`);
            return sDate > now;
        }).sort((a, b) => {
            const dA = new Date(`${a.date}T${a.time}:00`);
            const dB = new Date(`${b.date}T${b.time}:00`);
            return dA - dB;
        });

        if (futureSchedules.length > 0) {
            const nextSched = futureSchedules[0];
            const station = STATIONS.find(s => s.id === nextSched.stationId) || STATIONS[0];
            
            // Format datetime for ticket display
            const sDate = new Date(`${nextSched.date}T${nextSched.time}:00`);
            const opt = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const formattedTimeStr = sDate.toLocaleDateString('en-US', opt).replace(/,([^,]*)$/, ' at $1');

            // Render details
            ticketHeader.innerHTML = `
                <span class="station-name">${station.name} Spot #2</span>
                <span class="reservation-badge">Reserved</span>
            `;
            
            ticketDetails.innerHTML = `
                <div class="row">
                    <span class="lbl">Schedule</span>
                    <span class="val">${formattedTimeStr}</span>
                </div>
                <div class="row">
                    <span class="lbl">Specs</span>
                    <span class="val">${station.spec} (Target: ${nextSched.targetSoc}%)</span>
                </div>
            `;

            if (directionsBtn) {
                directionsBtn.style.display = 'inline-flex';
                directionsBtn.onclick = function() {
                    const mapSection = document.getElementById('map');
                    if (mapSection) {
                        const offset = 80;
                        const bodyRect = document.body.getBoundingClientRect().top;
                        const elementRect = mapSection.getBoundingClientRect().top;
                        const elementPosition = elementRect - bodyRect;
                        const offsetPosition = elementPosition - offset;
                        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                    }
                    // Select node in map.js if loaded
                    if (typeof CITIES_DATA !== 'undefined' && typeof selectStation === 'function') {
                        // Find station by name or prefix
                        const mappedStation = STATIONS.find(s => s.id === nextSched.stationId);
                        if (mappedStation) {
                            // Find matching map node inside cities
                            let cityKey = 'shenzhen';
                            if (nextSched.stationId.startsWith('ny-')) cityKey = 'newyork';
                            if (nextSched.stationId.startsWith('de-')) cityKey = 'munich';
                            if (nextSched.stationId.startsWith('ldn-')) cityKey = 'london';
                            if (nextSched.stationId.startsWith('tx-')) cityKey = 'austin';

                            const mapNode = CITIES_DATA[cityKey]?.stations.find(s => s.id === nextSched.stationId);
                            if (mapNode) {
                                const tabBtn = document.querySelector(`.city-tab[data-city="${cityKey}"]`);
                                if (tabBtn && !tabBtn.classList.contains('active')) tabBtn.click();
                                selectStation(mapNode);
                            }
                        }
                    }
                };
            }
        } else {
            // No reservation state
            ticketHeader.innerHTML = `
                <span class="station-name">No Active Reservations</span>
                <span class="reservation-badge" style="background-color: var(--border-color); color: var(--clr-text-muted);">None</span>
            `;
            ticketDetails.innerHTML = `
                <div class="row" style="justify-content: center; padding: 10px 0;">
                    <span class="lbl">Use the Scheduler to reserve a charging slot.</span>
                </div>
            `;
            if (directionsBtn) {
                directionsBtn.style.display = 'none';
            }
        }
    }

    // Bind Event Listeners
    function registerSchedulerEvents() {
        const form = document.getElementById('scheduler-form');
        const startSlider = document.getElementById('sched-start-soc');
        const targetSlider = document.getElementById('sched-target-soc');
        const stationSelect = document.getElementById('sched-station');

        // Sliders live text updates
        if (startSlider) {
            startSlider.addEventListener('input', (e) => {
                const display = document.getElementById('sched-start-display');
                if (display) display.textContent = `${e.target.value}%`;
                updateEstimates();
            });
        }

        if (targetSlider) {
            targetSlider.addEventListener('input', (e) => {
                const display = document.getElementById('sched-target-display');
                if (display) display.textContent = `${e.target.value}%`;
                updateEstimates();
            });
        }

        if (stationSelect) {
            stationSelect.addEventListener('change', updateEstimates);
        }

        // Calendar month arrows navigation
        const prevBtn = document.getElementById('btn-cal-prev');
        const nextBtn = document.getElementById('btn-cal-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentMonth.setMonth(currentMonth.getMonth() - 1);
                renderCalendar();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentMonth.setMonth(currentMonth.getMonth() + 1);
                renderCalendar();
            });
        }

        // Tab Switching calendar vs timeline
        const tabs = document.querySelectorAll('.scheduler-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                
                // Toggle active classes
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                document.getElementById('scheduler-tab-calendar').classList.remove('active');
                document.getElementById('scheduler-tab-timeline').classList.remove('active');

                if (target === 'calendar') {
                    document.getElementById('scheduler-tab-calendar').classList.add('active');
                } else {
                    document.getElementById('scheduler-tab-timeline').classList.add('active');
                    renderTimeline(); // Recalculate dimensions inside scroll area
                }
            });
        });

        // Form Submit Handler
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                handleScheduleSubmit();
            });
        }

        // Modal success dismiss btn
        const closeSuccess = document.getElementById('btn-close-schedule-success');
        if (closeSuccess) {
            closeSuccess.addEventListener('click', () => {
                const modal = document.getElementById('schedule-success-modal');
                if (modal) modal.classList.remove('active');
            });
        }

        const successModal = document.getElementById('schedule-success-modal');
        if (successModal) {
            successModal.addEventListener('click', (e) => {
                if (e.target === successModal) {
                    successModal.classList.remove('active');
                }
            });
        }
    }

    // Schedule reservation execution
    function handleScheduleSubmit() {
        const dateInput = document.getElementById('sched-date').value;
        const timeInput = document.getElementById('sched-time').value;
        const stationId = document.getElementById('sched-station').value;
        const startSoc = parseInt(document.getElementById('sched-start-soc').value);
        const targetSoc = parseInt(document.getElementById('sched-target-soc').value);

        const submitBtn = document.getElementById('btn-schedule-session');
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }

        setTimeout(() => {
            const activeCar = typeof window.getActiveVehicle === 'function' ? window.getActiveVehicle() : null;
            const capacity = activeCar && activeCar.battery ? activeCar.battery : 82;
            const modelKey = activeCar ? activeCar.model : 'byd-seal';

            const estimates = updateEstimates();
            const station = STATIONS.find(s => s.id === stationId) || STATIONS[0];

            // Build schedule object
            const scheduleData = {
                id: 'sched-' + Date.now(),
                date: dateInput,
                time: timeInput,
                stationId: stationId,
                startSoc: startSoc,
                targetSoc: targetSoc,
                vehicleModel: modelKey,
                capacity: capacity,
                cost: estimates.cost,
                duration: estimates.duration,
                energy: estimates.energy
            };

            // Store schedule state
            schedulesList.push(scheduleData);
            saveSchedulesState();

            // Re-render views
            renderCalendar();
            
            // If date is selected date, redraw timeline
            const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
            if (dateInput === selectedDateStr) {
                renderTimeline();
            }

            // Sync widget
            syncUpcomingReservationToDashboard();

            // Animate confirmation modal receipt values
            document.getElementById('receipt-station').textContent = station.name;
            
            // Format datetime label
            const sDate = new Date(`${dateInput}T${timeInput}:00`);
            const datetimeLabel = sDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            document.getElementById('receipt-datetime').textContent = datetimeLabel;

            // Formatted duration
            let durationLabel = '';
            if (estimates.duration >= 60) {
                const hrs = Math.floor(estimates.duration / 60);
                const mins = estimates.duration % 60;
                durationLabel = mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
            } else {
                durationLabel = `${estimates.duration} mins`;
            }
            document.getElementById('receipt-duration').textContent = durationLabel;

            // Cost countup animation inside receipt
            const receiptCost = document.getElementById('receipt-cost');
            if (receiptCost) {
                receiptCost.textContent = `${estimates.currency}0.00`;
                setTimeout(() => {
                    countUp('receipt-cost', 0, estimates.cost, 1000, 2, estimates.currency);
                }, 400);
            }

            // Open Confirmation modal
            const successModal = document.getElementById('schedule-success-modal');
            if (successModal) successModal.classList.add('active');

            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        }, 1200);
    }
})();
