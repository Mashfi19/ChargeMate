/* ==========================================================================
   ChargeMate - Savings & Speed Calculator Logic
   ========================================================================== */

const EV_DATABASE = {
    'byd-seal': {
        name: 'BYD Seal',
        capacity: 82.5, // kWh
        efficiency: 0.233, // kWh per mile
        maxChargingDC: 150 // max DC charging rate in kW
    },
    'byd-han': {
        name: 'BYD Han',
        capacity: 85.4, // kWh
        efficiency: 0.263, // kWh per mile
        maxChargingDC: 120
    },
    'tesla-model-y': {
        name: 'Tesla Model Y',
        capacity: 75.0, // kWh
        efficiency: 0.242, // kWh per mile
        maxChargingDC: 250
    },
    'audi-etron': {
        name: 'Audi e-tron GT',
        capacity: 95.0, // kWh
        efficiency: 0.409, // kWh per mile
        maxChargingDC: 270
    },
    'taycan': {
        name: 'Porsche Taycan',
        capacity: 93.4, // kWh
        efficiency: 0.312, // kWh per mile
        maxChargingDC: 270
    }
};

const CHARGER_SPEEDS = {
    'home-slow': 2.3, // kW (standard outlet)
    'home-pro': 22.0, // kW (ChargeMate Pro Home)
    'ultra': 350.0 // kW (ChargeMate Ultra Public)
};

// Gas vehicle reference factors for savings computation
const GAS_MPG = 25; // Average miles per gallon
const GAS_PRICE_PER_GALLON = 3.80; // USD
const ELECTRIC_RATE_PER_KWH = 0.14; // Average utility price in USD

// Carbon emission reference factors (grams of CO2 per mile)
const CO2_GAS_CAR = 404; // g CO2/mi
const CO2_EV_CHARGE = 110; // g CO2/mi (average electrical grid carbon factor)

document.addEventListener('DOMContentLoaded', () => {
    initCalculator();
});

function initCalculator() {
    const vehicleSelect = document.getElementById('calc-vehicle');
    const distanceSlider = document.getElementById('calc-distance');
    const distanceValLabel = document.getElementById('distance-val');
    const sourceRadios = document.getElementsByName('calc-source');
    
    if (!vehicleSelect || !distanceSlider || !distanceValLabel) return;

    // Trigger calculation when inputs are changed
    vehicleSelect.addEventListener('change', calculateOutputs);
    
    distanceSlider.addEventListener('input', (e) => {
        distanceValLabel.textContent = `${e.target.value} mi`;
        calculateOutputs();
    });

    sourceRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            // Update active styles on radio labels
            document.querySelectorAll('.source-toggle-card').forEach(card => {
                card.classList.remove('active');
            });
            if (e.target.checked) {
                e.target.closest('.source-toggle-card').classList.add('active');
            }
            calculateOutputs();
        });
    });

    // Run initial calculation
    calculateOutputs();
}

function calculateOutputs() {
    const vehicleId = document.getElementById('calc-vehicle').value;
    const distance = parseFloat(document.getElementById('calc-distance').value);
    
    let selectedSource = 'home-slow';
    const sourceRadios = document.getElementsByName('calc-source');
    for (const radio of sourceRadios) {
        if (radio.checked) {
            selectedSource = radio.value;
            break;
        }
    }

    const vehicle = EV_DATABASE[vehicleId];
    const power = CHARGER_SPEEDS[selectedSource];

    if (!vehicle || !power) return;

    // 1. Calculate Charging Time
    let hours = 0;
    let chargePercentageText = "100%";
    
    if (selectedSource === 'ultra') {
        // DC Fast charging is non-linear. It charges very fast up to 80%, then tapers down.
        // Also the car's maximum DC capacity limits the rate.
        const effectivePower = Math.min(power, vehicle.maxChargingDC);
        
        // Time to 80% (assuming average of 90% peak output speed)
        const energyNeededTo80 = vehicle.capacity * 0.8;
        const timeTo80 = energyNeededTo80 / (effectivePower * 0.9);
        
        // Time from 80% to 100% (significantly tapered, takes about same duration)
        const time80to100 = (vehicle.capacity * 0.2) / (effectivePower * 0.15);
        
        hours = timeTo80 + time80to100;
        chargePercentageText = "100% (0-80% in " + Math.round(timeTo80 * 60) + " min)";
    } else {
        // AC Charging has standard 90% power transfer efficiency
        const efficiencyFactor = 0.9;
        hours = vehicle.capacity / (power * efficiencyFactor);
    }

    // Format charging time display string
    const timeDisplay = document.getElementById('calc-time');
    const timeDesc = document.getElementById('calc-time-desc');
    
    if (timeDisplay) {
        if (hours < 1) {
            const minutes = Math.round(hours * 60);
            timeDisplay.textContent = `${minutes} min`;
        } else {
            const h = Math.floor(hours);
            const m = Math.round((hours - h) * 60);
            timeDisplay.textContent = m > 0 ? `${h}h ${m}m` : `${h}h`;
        }
    }
    
    if (timeDesc) {
        timeDesc.textContent = `Estimated duration to fully charge from 0 to ${chargePercentageText}.`;
    }

    // 2. Calculate Monthly Savings
    const monthlyMileage = distance * 30.4; // Average days per month
    const gasGallons = monthlyMileage / GAS_MPG;
    const gasMonthlyCost = gasGallons * GAS_PRICE_PER_GALLON;
    
    const evKWhNeeded = monthlyMileage * vehicle.efficiency;
    const evMonthlyCost = evKWhNeeded * ELECTRIC_RATE_PER_KWH;
    
    const monthlySavings = Math.max(0, gasMonthlyCost - evMonthlyCost);
    
    const savingsDisplay = document.getElementById('calc-savings');
    if (savingsDisplay) {
        savingsDisplay.textContent = `$${monthlySavings.toFixed(2)}`;
    }

    // 3. Calculate Environmental Impact (Annual CO2 offset)
    // Savings per mile = Gas Car CO2 - EV CO2
    const co2SavedPerMileG = CO2_GAS_CAR - CO2_EV_CHARGE;
    const annualMileage = distance * 365;
    const annualGramsSaved = annualMileage * co2SavedPerMileG;
    const annualTonsSaved = annualGramsSaved / 1000000; // Convert grams to metric tons

    const carbonDisplay = document.getElementById('calc-carbon');
    if (carbonDisplay) {
        carbonDisplay.textContent = `${annualTonsSaved.toFixed(1)} Tons`;
    }
}
