/* ==========================================================================
   ChargeMate - Digital Wallet & Billing Management Script
   ========================================================================== */

(function() {
    // Default mock data if localStorage is empty
    const DEFAULT_SAVED_CARDS = [
        {
            id: 'card_1',
            brand: 'visa',
            holder: 'Mashfi Rahman',
            number: '•••• •••• •••• 4321',
            rawNumber: '4532901234564321',
            expiry: '09/29',
            cvv: '123'
        },
        {
            id: 'card_2',
            brand: 'mastercard',
            holder: 'Mashfi Rahman',
            number: '•••• •••• •••• 8824',
            rawNumber: '5412751234568824',
            expiry: '04/28',
            cvv: '456'
        }
    ];

    const DEFAULT_TRANSACTIONS = [
        {
            id: 'TXN-908124',
            date: '2026-06-20',
            time: '18:42',
            type: 'Charging Session',
            method: 'Visa (•••• 4321)',
            amount: -12.45,
            status: 'Success',
            subtotal: 12.45
        },
        {
            id: 'TXN-907653',
            date: '2026-06-19',
            time: '22:15',
            type: 'Wallet Top-up',
            method: 'UPI (driver@upi)',
            amount: 50.00,
            status: 'Success',
            subtotal: 50.00
        },
        {
            id: 'TXN-892415',
            date: '2026-06-12',
            time: '11:05',
            type: 'Charging Session',
            method: 'MasterCard (•••• 8824)',
            amount: -18.90,
            status: 'Success',
            subtotal: 18.90
        },
        {
            id: 'TXN-891042',
            date: '2026-06-08',
            time: '09:15',
            type: 'Wallet Top-up',
            method: 'Apple Pay',
            amount: 25.00,
            status: 'Success',
            subtotal: 25.00
        }
    ];

    let savedCards = [];
    let transactionHistory = [];
    let walletBalance = 78.50;
    let lastAddedCardId = null;

    document.addEventListener('DOMContentLoaded', () => {
        initWallet();
    });

    window.initWallet = function() {
        loadWalletState();
        renderWalletDetails();
        registerWalletEvents();
    };

    window.destroyWallet = function() {
        // Reset wallet parameters when logged out
        savedCards = [];
        transactionHistory = [];
        walletBalance = 78.50;
    };

    function loadWalletState() {
        const savedCardsData = localStorage.getItem('chargemate_saved_cards');
        const savedTxnsData = localStorage.getItem('chargemate_transactions');
        const savedDashState = localStorage.getItem('chargemate_dashboard_state');

        // Load cards
        if (savedCardsData) {
            try { savedCards = JSON.parse(savedCardsData); } catch (e) { resetDefaultCards(); }
        } else {
            resetDefaultCards();
        }

        // Load transactions
        if (savedTxnsData) {
            try { transactionHistory = JSON.parse(savedTxnsData); } catch (e) { resetDefaultTransactions(); }
        } else {
            resetDefaultTransactions();
        }

        // Read wallet balance from Dashboard state
        if (savedDashState) {
            try {
                const dashState = JSON.parse(savedDashState);
                if (dashState.walletBalance !== undefined) {
                    walletBalance = parseFloat(dashState.walletBalance);
                }
            } catch (e) {
                console.error("Error reading balance from dashboard state", e);
            }
        }
    }

    function resetDefaultCards() {
        savedCards = JSON.parse(JSON.stringify(DEFAULT_SAVED_CARDS));
        localStorage.setItem('chargemate_saved_cards', JSON.stringify(savedCards));
    }

    function resetDefaultTransactions() {
        transactionHistory = JSON.parse(JSON.stringify(DEFAULT_TRANSACTIONS));
        localStorage.setItem('chargemate_transactions', JSON.stringify(transactionHistory));
    }

    function saveWalletState() {
        localStorage.setItem('chargemate_saved_cards', JSON.stringify(savedCards));
        localStorage.setItem('chargemate_transactions', JSON.stringify(transactionHistory));
        
        // Sync balance back to Dashboard State
        const savedDashState = localStorage.getItem('chargemate_dashboard_state');
        if (savedDashState) {
            try {
                const dashState = JSON.parse(savedDashState);
                dashState.walletBalance = walletBalance;
                localStorage.setItem('chargemate_dashboard_state', JSON.stringify(dashState));
            } catch (e) {
                console.error("Error writing balance back to dashboard state", e);
            }
        }
    }

    function renderWalletDetails() {
        // 1. Current Balance Showcase Card
        const balanceDisplay = document.getElementById('wallet-balance-display');
        if (balanceDisplay) {
            balanceDisplay.textContent = `$${walletBalance.toFixed(2)}`;
        }

        // Update card account holder name if logged in
        const accountHolderName = document.getElementById('wallet-account-holder');
        if (accountHolderName) {
            const savedUser = localStorage.getItem('chargemate_user');
            if (savedUser) {
                try {
                    const user = JSON.parse(savedUser);
                    accountHolderName.textContent = user.name.toUpperCase();
                } catch (e) {
                    accountHolderName.textContent = "EV DRIVER";
                }
            } else {
                accountHolderName.textContent = "EV DRIVER";
            }
        }

        // 2. Saved Cards container & dropdown select list
        const cardsContainer = document.getElementById('saved-cards-container');
        const cardDropdown = document.getElementById('recharge-select-card');
        
        let selectedId = cardDropdown ? cardDropdown.value : null;
        if (!selectedId && savedCards.length > 0) {
            selectedId = savedCards[0].id;
        }

        if (cardsContainer) {
            cardsContainer.innerHTML = '';
            if (savedCards.length === 0) {
                cardsContainer.innerHTML = '<div class="no-cards-placeholder">No saved payment methods. Add one above.</div>';
            } else {
                savedCards.forEach(card => {
                    const cardItem = document.createElement('div');
                    const isSelected = card.id === selectedId;
                    cardItem.className = `credit-card-item ${card.brand} ${isSelected ? 'selected' : ''}`;
                    cardItem.setAttribute('data-card-id', card.id);
                    
                    if (card.id === lastAddedCardId) {
                        cardItem.classList.add('glow-pulse');
                        setTimeout(() => cardItem.classList.remove('glow-pulse'), 1500);
                    }
                    
                    const brandLogo = card.brand === 'visa' 
                        ? '<span class="card-brand-logo visa-text">Visa</span>' 
                        : '<span class="card-brand-logo mc-text">MasterCard</span>';

                    cardItem.innerHTML = `
                        <div class="cc-header">
                            ${brandLogo}
                            <button type="button" class="btn-delete-card" data-card-id="${card.id}" aria-label="Delete card">&times;</button>
                        </div>
                        <div class="cc-number">${card.number}</div>
                        <div class="cc-footer">
                            <span class="cc-holder">${card.holder}</span>
                            <span class="cc-expiry">${card.expiry}</span>
                        </div>
                    `;
                    cardsContainer.appendChild(cardItem);
                });
            }
        }

        if (cardDropdown) {
            cardDropdown.innerHTML = '';
            if (savedCards.length === 0) {
                const opt = document.createElement('option');
                opt.value = "";
                opt.textContent = "No saved cards available";
                cardDropdown.appendChild(opt);
            } else {
                savedCards.forEach(card => {
                    const opt = document.createElement('option');
                    opt.value = card.id;
                    opt.textContent = `${card.brand.toUpperCase()} ending in ${card.number.slice(-4)}`;
                    cardDropdown.appendChild(opt);
                });
                if (selectedId && savedCards.some(c => c.id === selectedId)) {
                    cardDropdown.value = selectedId;
                } else if (savedCards[0]) {
                    cardDropdown.value = savedCards[0].id;
                }
            }
        }

        // 3. Render Transaction History Rows
        const txnContainer = document.getElementById('transaction-history-rows');
        if (txnContainer) {
            txnContainer.innerHTML = '';
            if (transactionHistory.length === 0) {
                txnContainer.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No transactions recorded.</td></tr>';
            } else {
                transactionHistory.forEach(txn => {
                    const isCredit = txn.amount > 0;
                    const amountText = isCredit ? `+$${txn.amount.toFixed(2)}` : `-$${Math.abs(txn.amount).toFixed(2)}`;
                    const amountClass = isCredit ? 'text-green font-bold' : 'text-highlight font-bold';
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${txn.date} <span class="txn-time">${txn.time}</span></td>
                        <td>${txn.type} <span class="txn-method-sub">${txn.method}</span></td>
                        <td class="${amountClass}">${amountText}</td>
                        <td><span class="status-indicator active">${txn.status}</span></td>
                        <td>
                            <button class="btn btn-outline btn-xs btn-download-invoice" data-txn-id="${txn.id}" style="padding: 4px 8px; font-size:11px;">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Invoice
                            </button>
                        </td>
                    `;
                    txnContainer.appendChild(row);
                });
            }
        }
        
        // Bind dynamic invoice actions
        bindInvoiceActions();
        lastAddedCardId = null;
    }

    function bindInvoiceActions() {
        document.querySelectorAll('.btn-download-invoice').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const txnId = e.currentTarget.getAttribute('data-txn-id');
                const txn = transactionHistory.find(t => t.id === txnId);
                if (txn) downloadMockInvoice(txn);
            });
        });
        
        // Delete Card handler
        document.querySelectorAll('.btn-delete-card').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Avoid triggering card tilt
                const cardId = e.currentTarget.getAttribute('data-card-id');
                removeSavedCard(cardId);
            });
        });

        // Select Card handler
        document.querySelectorAll('.credit-card-item').forEach(cardEl => {
            cardEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-delete-card')) return;
                
                const cardId = cardEl.getAttribute('data-card-id');
                
                // Select in dropdown
                const cardDropdown = document.getElementById('recharge-select-card');
                if (cardDropdown) {
                    cardDropdown.value = cardId;
                    cardDropdown.dispatchEvent(new Event('change'));
                }
                
                // Update visual selection
                document.querySelectorAll('.credit-card-item').forEach(el => el.classList.remove('selected'));
                cardEl.classList.add('selected');
                
                // Also toggle payment method radio to "saved-card"
                const savedCardRadio = document.querySelector('input[name="payment-method"][value="saved-card"]');
                if (savedCardRadio) {
                    savedCardRadio.checked = true;
                    // Trigger click to update the active UI state
                    savedCardRadio.closest('.pm-option').click();
                }
            });
        });
    }

    function removeSavedCard(cardId) {
        if (!confirm("Are you sure you want to remove this saved payment card?")) return;
        savedCards = savedCards.filter(c => c.id !== cardId);
        saveWalletState();
        renderWalletDetails();
    }

    function registerWalletEvents() {
        // Preset amount buttons click
        const presetButtons = document.querySelectorAll('.amount-presets .btn-preset');
        const customInput = document.getElementById('recharge-custom-amount');

        presetButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                presetButtons.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                const amount = e.currentTarget.getAttribute('data-amount');
                if (customInput) {
                    customInput.value = parseFloat(amount).toFixed(2);
                }
            });
        });

        if (customInput) {
            customInput.addEventListener('input', () => {
                // Remove preset button highlight when typing a custom value manually
                const val = parseFloat(customInput.value);
                presetButtons.forEach(b => {
                    const amt = parseFloat(b.getAttribute('data-amount'));
                    if (val === amt) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });
            });
        }

        // Radio method selectors toggling
        const options = document.querySelectorAll('.pm-option');
        options.forEach(opt => {
            opt.addEventListener('click', (e) => {
                options.forEach(o => o.classList.remove('active'));
                const parentLabel = e.currentTarget;
                parentLabel.classList.add('active');

                // Hide all details
                document.querySelectorAll('.recharge-pm-details').forEach(div => {
                    div.classList.remove('active');
                });

                // Show selected details div
                const methodType = parentLabel.getAttribute('data-pm-type');
                const detailDiv = document.getElementById(`recharge-pm-${methodType}`);
                if (detailDiv) {
                    detailDiv.classList.add('active');
                }
            });
        });

        // Dropdown card selector change updates list selection
        const selectCardDropdown = document.getElementById('recharge-select-card');
        if (selectCardDropdown) {
            selectCardDropdown.addEventListener('change', (e) => {
                const selectedVal = e.target.value;
                document.querySelectorAll('.credit-card-item').forEach(el => {
                    if (el.getAttribute('data-card-id') === selectedVal) {
                        el.classList.add('selected');
                    } else {
                        el.classList.remove('selected');
                    }
                });
            });
        }

        // Toggle Add Card form modal
        const toggleAddCardBtn = document.getElementById('btn-toggle-add-card');
        const cancelAddCardBtn = document.getElementById('btn-cancel-add-card');
        const closeAddCardModalBtn = document.getElementById('btn-close-add-card');
        const addCardModal = document.getElementById('add-card-modal');

        if (toggleAddCardBtn && addCardModal) {
            toggleAddCardBtn.addEventListener('click', () => {
                addCardModal.classList.add('active');
            });
        }

        const hideAddCardModal = () => {
            if (addCardModal) {
                addCardModal.classList.remove('active');
                
                // Clear any form validation errors on close
                const cardForm = document.getElementById('add-new-card-form');
                if (cardForm) {
                    const errorGroups = cardForm.querySelectorAll('.floating-label-group');
                    errorGroups.forEach(group => {
                        group.classList.remove('has-error');
                        const msg = group.querySelector('.form-error-msg');
                        if (msg) msg.remove();
                    });
                    cardForm.reset();
                }
                
                // Reset card preview values
                const pName = document.getElementById('preview-card-name');
                const pNumber = document.getElementById('preview-card-number');
                const pExpiry = document.getElementById('preview-card-expiry');
                const pCvv = document.getElementById('preview-card-cvv');
                const pLogo = document.getElementById('preview-card-logo');
                const pFace = document.querySelector('.preview-credit-card .card-front');
                if (pName) pName.textContent = 'Your Name';
                if (pNumber) pNumber.textContent = '•••• •••• •••• ••••';
                if (pExpiry) pExpiry.textContent = 'MM/YY';
                if (pCvv) pCvv.textContent = '•••';
                if (pLogo) pLogo.textContent = 'VISA';
                if (pFace) pFace.style.background = 'linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)';
            }
        };

        if (cancelAddCardBtn) {
            cancelAddCardBtn.addEventListener('click', hideAddCardModal);
        }

        if (closeAddCardModalBtn) {
            closeAddCardModalBtn.addEventListener('click', hideAddCardModal);
        }

        if (addCardModal) {
            addCardModal.addEventListener('click', (e) => {
                if (e.target === addCardModal) {
                    hideAddCardModal();
                }
            });
        }

        // Add Card Form Submission
        const cardForm = document.getElementById('add-new-card-form');
        if (cardForm) {
            cardForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Reset previous error classes and error messages
                const errorGroups = cardForm.querySelectorAll('.floating-label-group');
                errorGroups.forEach(group => {
                    group.classList.remove('has-error');
                    const msg = group.querySelector('.form-error-msg');
                    if (msg) msg.remove();
                });

                let hasErrors = false;

                function triggerError(inputId, message) {
                    const inputEl = document.getElementById(inputId);
                    if (inputEl) {
                        const group = inputEl.closest('.floating-label-group');
                        if (group) {
                            group.classList.add('has-error');
                            const errorSpan = document.createElement('span');
                            errorSpan.className = 'form-error-msg';
                            errorSpan.textContent = message;
                            group.appendChild(errorSpan);
                            
                            // Shake input group
                            group.classList.add('shake-animation');
                            setTimeout(() => {
                                group.classList.remove('shake-animation');
                            }, 400);
                        }
                    }
                    hasErrors = true;
                }

                const nameInput = document.getElementById('new-card-name');
                const numberInput = document.getElementById('new-card-number');
                const expiryInput = document.getElementById('new-card-expiry');
                const cvvInput = document.getElementById('new-card-cvv');
                const brandSelect = document.getElementById('new-card-brand');

                const nameVal = nameInput.value.trim();
                const numberVal = numberInput.value.replace(/\s+/g, '');
                const expiryVal = expiryInput.value.trim();
                const cvvVal = cvvInput.value.trim();
                const brandVal = brandSelect.value;

                // Validate Name
                if (nameVal.length < 3) {
                    triggerError('new-card-name', 'Name must be at least 3 characters.');
                } else if (!/^[a-zA-Z\s'\-]+$/.test(nameVal)) {
                    triggerError('new-card-name', 'Name contains invalid characters.');
                }

                // Validate Number
                if (numberVal.length !== 16 || !/^\d+$/.test(numberVal)) {
                    triggerError('new-card-number', 'Card number must be exactly 16 digits.');
                }

                // Validate Expiry MM/YY
                const parts = expiryVal.split('/');
                let isExpiryValid = true;
                if (parts.length !== 2) {
                    isExpiryValid = false;
                } else {
                    const mm = parseInt(parts[0], 10);
                    const yy = parseInt(parts[1], 10) + 2000;
                    if (isNaN(mm) || isNaN(yy) || mm < 1 || mm > 12) {
                        isExpiryValid = false;
                    } else {
                        const now = new Date();
                        const curYear = now.getFullYear();
                        const curMonth = now.getMonth() + 1;
                        if (yy < curYear || (yy === curYear && mm < curMonth)) {
                            triggerError('new-card-expiry', 'Card is expired.');
                            isExpiryValid = true; // prevent MM/YY format warning
                        }
                    }
                }
                if (!isExpiryValid && !hasErrors) {
                    triggerError('new-card-expiry', 'Use valid MM/YY format.');
                }

                // Validate CVV
                if (cvvVal.length !== 3 || !/^\d+$/.test(cvvVal)) {
                    triggerError('new-card-cvv', 'CVV must be exactly 3 digits.');
                }

                if (hasErrors) {
                    // Shake the form wrapper modal card
                    const modalCard = cardForm.closest('.auth-card');
                    if (modalCard) {
                        modalCard.classList.add('shake-animation');
                        setTimeout(() => modalCard.classList.remove('shake-animation'), 400);
                    }
                    return;
                }

                // Format masked card number
                const masked = `•••• •••• •••• ${numberVal.slice(-4)}`;
                const newCardId = 'card_' + Date.now();

                const newCard = {
                    id: newCardId,
                    brand: brandVal,
                    holder: nameVal,
                    number: masked,
                    rawNumber: numberVal,
                    expiry: expiryVal,
                    cvv: cvvVal
                };

                // Remember the ID to trigger highlight animation
                lastAddedCardId = newCardId;

                savedCards.push(newCard);
                saveWalletState();
                renderWalletDetails();

                // Hide modal and reset form
                if (addCardModal) {
                    addCardModal.classList.remove('active');
                }
                cardForm.reset();

                // Reset visual preview
                const pName = document.getElementById('preview-card-name');
                const pNumber = document.getElementById('preview-card-number');
                const pExpiry = document.getElementById('preview-card-expiry');
                const pCvv = document.getElementById('preview-card-cvv');
                const pLogo = document.getElementById('preview-card-logo');
                const pFace = document.querySelector('.preview-credit-card .card-front');
                if (pName) pName.textContent = 'Your Name';
                if (pNumber) pNumber.textContent = '•••• •••• •••• ••••';
                if (pExpiry) pExpiry.textContent = 'MM/YY';
                if (pCvv) pCvv.textContent = '•••';
                if (pLogo) pLogo.textContent = 'VISA';
                if (pFace) pFace.style.background = 'linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)';
            });
        }

        // Format Card inputs dynamically
        const cardNumInput = document.getElementById('new-card-number');
        if (cardNumInput) {
            cardNumInput.addEventListener('input', (e) => {
                // Add spacing every 4 digits
                let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                let formatted = '';
                for (let i = 0; i < val.length; i++) {
                    if (i > 0 && i % 4 === 0) formatted += ' ';
                    formatted += val[i];
                }
                e.target.value = formatted;
            });
        }

        const cardExpiryInput = document.getElementById('new-card-expiry');
        if (cardExpiryInput) {
            cardExpiryInput.addEventListener('input', (e) => {
                // Add slash between MM and YY
                let val = e.target.value.replace(/[^0-9]/gi, '');
                if (val.length >= 2) {
                    e.target.value = val.slice(0, 2) + '/' + val.slice(2, 4);
                } else {
                    e.target.value = val;
                }
            });
        }

        // Recharge Form Submit Handler
        const rechargeForm = document.getElementById('wallet-recharge-form');
        if (rechargeForm) {
            rechargeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                processRecharge();
            });
        }

        // Apple & Google Pay triggers
        const applePayBtn = document.getElementById('btn-apple-pay');
        const googlePayBtn = document.getElementById('btn-google-pay');

        if (applePayBtn) {
            applePayBtn.addEventListener('click', () => {
                processDigitalWalletRecharge('Apple Pay');
            });
        }
        if (googlePayBtn) {
            googlePayBtn.addEventListener('click', () => {
                processDigitalWalletRecharge('Google Pay');
            });
        }

        // Close Wallet Success Modal handler
        const closeWalletSuccessBtn = document.getElementById('btn-close-wallet-success');
        if (closeWalletSuccessBtn) {
            closeWalletSuccessBtn.addEventListener('click', () => {
                const successModal = document.getElementById('wallet-success-modal');
                if (successModal) successModal.classList.remove('active');
            });
        }

        // Interactive 3D Card Preview updates
        const previewCard = document.getElementById('preview-credit-card');
        const previewNumber = document.getElementById('preview-card-number');
        const previewName = document.getElementById('preview-card-name');
        const previewExpiry = document.getElementById('preview-card-expiry');
        const previewCvv = document.getElementById('preview-card-cvv');
        const previewLogo = document.getElementById('preview-card-logo');
        const previewFrontFace = document.querySelector('.preview-credit-card .card-front');

        const inputName = document.getElementById('new-card-name');
        const inputNumber = document.getElementById('new-card-number');
        const inputExpiry = document.getElementById('new-card-expiry');
        const inputCvv = document.getElementById('new-card-cvv');
        const inputBrand = document.getElementById('new-card-brand');

        if (inputName && previewName) {
            inputName.addEventListener('input', (e) => {
                previewName.textContent = e.target.value.trim() || 'Your Name';
            });
        }

        // Clear validation errors on typing
        const formInputs = [inputName, inputNumber, inputExpiry, inputCvv];
        formInputs.forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    const group = input.closest('.floating-label-group');
                    if (group && group.classList.contains('has-error')) {
                        group.classList.remove('has-error');
                        const errorMsg = group.querySelector('.form-error-msg');
                        if (errorMsg) errorMsg.remove();
                    }
                });
            }
        });

        if (inputNumber && previewNumber) {
            inputNumber.addEventListener('input', (e) => {
                let val = e.target.value.replace(/\s+/g, '');
                
                // Auto-detect brand
                if (val.startsWith('4')) {
                    if (inputBrand) inputBrand.value = 'visa';
                    if (previewLogo) previewLogo.textContent = 'VISA';
                    if (previewFrontFace) previewFrontFace.style.background = 'linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)';
                } else if (val.startsWith('5')) {
                    if (inputBrand) inputBrand.value = 'mastercard';
                    if (previewLogo) previewLogo.textContent = 'MasterCard';
                    if (previewFrontFace) previewFrontFace.style.background = 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)';
                } else {
                    const brandVal = inputBrand ? inputBrand.value : 'visa';
                    if (previewLogo) previewLogo.textContent = brandVal === 'visa' ? 'VISA' : 'MasterCard';
                    if (previewFrontFace) {
                        previewFrontFace.style.background = brandVal === 'visa' 
                            ? 'linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)' 
                            : 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)';
                    }
                }

                // Format text
                let padded = val.padEnd(16, '•');
                let formatted = '';
                for (let i = 0; i < 16; i++) {
                    if (i > 0 && i % 4 === 0) formatted += ' ';
                    formatted += padded[i];
                }
                previewNumber.textContent = formatted;
            });
        }

        if (inputExpiry && previewExpiry) {
            inputExpiry.addEventListener('input', (e) => {
                previewExpiry.textContent = e.target.value || 'MM/YY';
            });
        }

        if (inputCvv && previewCvv) {
            inputCvv.addEventListener('input', (e) => {
                let val = e.target.value;
                previewCvv.textContent = val.padEnd(3, '•');
            });
            inputCvv.addEventListener('focus', () => {
                if (previewCard) {
                    previewCard.style.transform = 'rotateY(180deg)';
                }
            });
            inputCvv.addEventListener('blur', () => {
                if (previewCard) {
                    previewCard.style.transform = 'rotateY(0deg)';
                }
            });
        }

        if (inputBrand && previewLogo && previewFrontFace) {
            inputBrand.addEventListener('change', (e) => {
                const brandVal = e.target.value;
                previewLogo.textContent = brandVal === 'visa' ? 'VISA' : 'MasterCard';
                previewFrontFace.style.background = brandVal === 'visa' 
                    ? 'linear-gradient(135deg, #1D4ED8 0%, #1E3A8A 100%)' 
                    : 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)';
            });
        }
    }

    function processRecharge() {
        const customInput = document.getElementById('recharge-custom-amount');
        const amount = parseFloat(customInput.value);
        const submitBtn = document.getElementById('btn-submit-recharge');

        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid deposit amount.");
            return;
        }

        const selectedPM = document.querySelector('input[name="payment-method"]:checked').value;
        let methodLabel = '';

        if (selectedPM === 'saved-card') {
            const selectCard = document.getElementById('recharge-select-card');
            const cardId = selectCard.value;
            const card = savedCards.find(c => c.id === cardId);
            if (!card) {
                alert("Please select a saved payment card, or add a new card first.");
                return;
            }
            methodLabel = `${card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} (${card.number.slice(-9)})`;
        } else if (selectedPM === 'upi') {
            const upiId = document.getElementById('recharge-upi-id').value;
            if (!upiId.includes('@')) {
                alert("Please enter a valid UPI address (e.g. user@upi).");
                return;
            }
            methodLabel = `UPI (${upiId})`;
        }

        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }

        setTimeout(() => {
            const oldBalance = walletBalance;
            walletBalance += amount;

            // Generate transaction
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);

            const newTxn = {
                id: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
                date: dateStr,
                time: timeStr,
                type: 'Wallet Top-up',
                method: methodLabel,
                amount: amount,
                status: 'Success',
                subtotal: amount
            };

            transactionHistory.unshift(newTxn);
            saveWalletState();
            renderWalletDetails();

            // Notify dashboard of changes and trigger counts
            triggerDashboardSync(oldBalance, walletBalance);

            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }

            // Populate and show success receipt modal
            const successModal = document.getElementById('wallet-success-modal');
            const receiptAmount = document.getElementById('wallet-receipt-amount');
            const receiptMethod = document.getElementById('wallet-receipt-method');
            const receiptBalance = document.getElementById('wallet-receipt-balance');

            if (receiptAmount) receiptAmount.textContent = `+$${amount.toFixed(2)}`;
            if (receiptMethod) receiptMethod.textContent = methodLabel;
            if (receiptBalance) receiptBalance.textContent = `$${walletBalance.toFixed(2)}`;
            if (successModal) successModal.classList.add('active');

            // Wallet card success glow pulse
            const balanceCard = document.querySelector('.wallet-balance-card');
            if (balanceCard) {
                balanceCard.classList.add('glow-pulse');
                setTimeout(() => balanceCard.classList.remove('glow-pulse'), 1000);
            }
        }, 1500);
    }

    function processDigitalWalletRecharge(walletName) {
        const customInput = document.getElementById('recharge-custom-amount');
        const amount = parseFloat(customInput.value);

        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid deposit amount.");
            return;
        }

        const confirmPay = confirm(`Proceed with ${walletName} deposit of $${amount.toFixed(2)}?`);
        if (!confirmPay) return;

        const btnId = walletName === 'Apple Pay' ? 'btn-apple-pay' : 'btn-google-pay';
        const clickedBtn = document.getElementById(btnId);
        const allDigitalBtns = document.querySelectorAll('.btn-digital-pay');

        if (clickedBtn) {
            clickedBtn.classList.add('loading');
        }
        allDigitalBtns.forEach(btn => btn.disabled = true);

        setTimeout(() => {
            const oldBalance = walletBalance;
            walletBalance += amount;

            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().split(' ')[0].slice(0, 5);

            const newTxn = {
                id: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
                date: dateStr,
                time: timeStr,
                type: 'Wallet Top-up',
                method: walletName,
                amount: amount,
                status: 'Success',
                subtotal: amount
            };

            transactionHistory.unshift(newTxn);
            saveWalletState();
            renderWalletDetails();

            triggerDashboardSync(oldBalance, walletBalance);

            if (clickedBtn) {
                clickedBtn.classList.remove('loading');
            }
            allDigitalBtns.forEach(btn => btn.disabled = false);

            // Populate and show success receipt modal
            const successModal = document.getElementById('wallet-success-modal');
            const receiptAmount = document.getElementById('wallet-receipt-amount');
            const receiptMethod = document.getElementById('wallet-receipt-method');
            const receiptBalance = document.getElementById('wallet-receipt-balance');

            if (receiptAmount) receiptAmount.textContent = `+$${amount.toFixed(2)}`;
            if (receiptMethod) receiptMethod.textContent = walletName;
            if (receiptBalance) receiptBalance.textContent = `$${walletBalance.toFixed(2)}`;
            if (successModal) successModal.classList.add('active');

            // Wallet card success glow pulse
            const balanceCard = document.querySelector('.wallet-balance-card');
            if (balanceCard) {
                balanceCard.classList.add('glow-pulse');
                setTimeout(() => balanceCard.classList.remove('glow-pulse'), 1000);
            }
        }, 1500);
    }

    function downloadMockInvoice(txn) {
        // Format invoice dates and address details
        const subtotal = Math.abs(txn.subtotal);
        const vat = 0.00;
        const total = subtotal;

        let billingName = "MASHFI RAHMAN";
        const savedUser = localStorage.getItem('chargemate_user');
        if (savedUser) {
            try { billingName = JSON.parse(savedUser).name.toUpperCase(); } catch(e){}
        }

        const invoiceTemplate = `
========================================================================
                          CHARGEMATE EV CHARGING                        
                      INVOICE & TRANSACTION STATEMENT                    
========================================================================
Invoice ID     : INV-${txn.id.replace('TXN-', '')}
Transaction Ref: ${txn.id}
Statement Date : ${txn.date}
Statement Time : ${txn.time}
Billing Status : PAID
------------------------------------------------------------------------
CUSTOMER DETAILS:
Billing To     : ${billingName}
Account ID     : CM-908124
EV Diagnostics : Healthy / Active Fleet Connection
------------------------------------------------------------------------
TRANSACTION BREAKDOWN:
Item Description:         Qty:          Unit Cost:         Line Total:
${txn.type.padEnd(25)} 1             $${subtotal.toFixed(2).padEnd(17)} $${subtotal.toFixed(2)}
(Method: ${txn.method})

------------------------------------------------------------------------
Subtotal       :                                           $${subtotal.toFixed(2)}
Taxes / VAT (0%):                                           $${vat.toFixed(2)}
------------------------------------------------------------------------
TOTAL PAID     :                                           $${total.toFixed(2)}
========================================================================
This statement acts as a tax invoice and proof of purchase payment.
Charged via ChargeMate Pay Network. All metrics are logged in real-time.

Thank you for choosing ChargeMate! Supporting global carbon offset offsets.
For inquiries, please contact support@chargemate.ev.
========================================================================
        `;

        // Generate download
        const blob = new Blob([invoiceTemplate], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ChargeMate_Invoice_${txn.id}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function triggerDashboardSync(oldBal, newBal) {
        // Force reboot the dashboard display counter
        if (typeof window.initDashboard === 'function') {
            const user = JSON.parse(localStorage.getItem('chargemate_user'));
            window.initDashboard(user);
        }
    }
})();
