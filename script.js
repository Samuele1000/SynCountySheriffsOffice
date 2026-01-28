// State management
let selectedItems = new Map();
let hasSeenWeaponWarning = false;

// DOM Elements
const itemButtons = document.querySelectorAll('.item-btn');
const selectedItemsList = document.getElementById('selectedItemsList');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const toast = document.getElementById('toast');

// Initialize
function init() {
    // Intro Screen Logic
    const introScreen = document.getElementById('intro-screen');
    const enterLedgerBtn = document.getElementById('enter-ledger-btn');
    const enterOrdinancesBtn = document.getElementById('enter-ordinances-btn');

    if (introScreen) {
        if (enterLedgerBtn) {
            enterLedgerBtn.addEventListener('click', () => {
                window.location.href = 'registry.html';
            });
        }

        if (enterOrdinancesBtn) {
            enterOrdinancesBtn.addEventListener('click', () => {
                window.location.href = 'ordinances.html';
            });
        }

        const enterBriefingBtn = document.getElementById('enter-briefing-btn');
        if (enterBriefingBtn) {
            enterBriefingBtn.addEventListener('click', () => {
                window.location.href = 'briefing.html';
            });
        }
    }

    // Privacy Modal Logic
    const modal = document.getElementById('privacy-modal');
    const link = document.getElementById('privacy-link');
    const closeSpan = document.querySelector('.close-modal');

    if (link && modal && closeSpan) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            modal.style.display = 'block';
        });

        closeSpan.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Code Protection
    document.addEventListener('contextmenu', event => event.preventDefault());

    document.addEventListener('keydown', event => {
        // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (event.key === 'F12' ||
            (event.ctrlKey && event.shiftKey && (event.key === 'I' || event.key === 'J')) ||
            (event.ctrlKey && event.key === 'u')) {
            event.preventDefault();
        }
    });

    itemButtons.forEach(btn => {
        btn.addEventListener('click', () => toggleItem(btn));
    });

    if (copyBtn) {
        copyBtn.addEventListener('click', copyToClipboard);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllItems);
    }

    // Briefing Page Logic
    const copyBriefingBtn = document.getElementById('copyBriefingBtn');
    if (copyBriefingBtn) {
        copyBriefingBtn.addEventListener('click', copyBriefingNotes);
    }

    // Mutual exclusivity for Notes N/A and Standard Notes
    const naNotes = document.getElementById('na_notes');
    const includeStandardNotes = document.getElementById('includeStandardNotes');

    if (naNotes && includeStandardNotes) {
        naNotes.addEventListener('change', () => {
            if (naNotes.checked) {
                includeStandardNotes.checked = false;
                includeStandardNotes.disabled = true;
            } else {
                includeStandardNotes.disabled = false;
            }
        });

        includeStandardNotes.addEventListener('change', () => {
            if (includeStandardNotes.checked && naNotes.checked) {
                naNotes.checked = false;
                toggleNA('notes');
            }
        });

        // Initial check state
        if (naNotes.checked) {
            includeStandardNotes.checked = false;
            includeStandardNotes.disabled = true;
        }
    }

    updateUI();
}



// Helper to show weapon modal
function showWeaponModal() {
    const weaponModal = document.getElementById('weapon-modal');
    const closeWeaponBtn = document.getElementById('close-weapon-modal');
    const acknowledgeBtn = document.getElementById('acknowledge-weapon-btn');

    if (weaponModal) {
        weaponModal.style.display = 'block';

        // Close handlers
        const closeModal = () => {
            weaponModal.style.display = 'none';
        };

        if (closeWeaponBtn) closeWeaponBtn.onclick = closeModal;
        if (acknowledgeBtn) acknowledgeBtn.onclick = closeModal;

        // Click outside
        window.onclick = (event) => {
            if (event.target == weaponModal) {
                closeModal();
            }
        };
    }
}

// Toggle item selection
function toggleItem(btn) {
    const itemName = btn.dataset.item;
    const itemClass = btn.dataset.class;

    // Check for weapon warning
    const weaponClasses = ['WH', 'WL', 'WM', 'W'];
    if (weaponClasses.includes(itemClass) && !hasSeenWeaponWarning) {
        showWeaponModal();
        hasSeenWeaponWarning = true;
    }

    if (selectedItems.has(itemName)) {
        // Stacking behavior: Increment quantity instead of removing
        const item = selectedItems.get(itemName);
        item.quantity = (item.quantity || 1) + 1;
        selectedItems.set(itemName, item);

        // Add visual feedback that item was added (optional, but good for UX)
        btn.classList.add('selected');
    } else {
        selectedItems.set(itemName, {
            name: itemName,
            class: itemClass,
            fine: getFineAmount(itemClass),
            quantity: 1
        });
        btn.classList.add('selected');
    }

    updateUI();
}

// Toggle N/A state for fields
function toggleNA(fieldId) {
    const checkbox = document.getElementById('na_' + fieldId);
    const textarea = document.getElementById(fieldId);

    if (checkbox && textarea) {
        textarea.disabled = checkbox.checked;
        if (checkbox.checked) {
            textarea.value = ''; // Optional: clear value when disabled
            textarea.placeholder = "N/A";
        } else {
            textarea.placeholder = textarea.dataset.originalPlaceholder || "Updates...";
        }
    }
}

// Get fine amount based on class
function getFineAmount(itemClass) {
    const fines = {
        'A': 1000,
        'B': 100,
        'C': 50,
        'D': 25,
        'WH': 0,
        'WL': 0,
        'WM': 0,
        'W': 0,
        'NC': 0
    };
    return fines[itemClass] || 0;
}

// Update UI
function updateUI() {
    const totalsContainer = document.getElementById('fine-totals');

    if (selectedItems.size === 0) {
        selectedItemsList.innerHTML = '<p class="empty-state">No items selected</p>';
        copyBtn.disabled = true;
        if (totalsContainer) totalsContainer.style.display = 'none';
    } else {
        selectedItemsList.innerHTML = '';

        // Group by class and calculate totals
        const grouped = {
            'A': [],
            'B': [],
            'C': [],
            'D': [],
            'WH': [],
            'WL': [],
            'WM': [],
            'W': [],
            'NC': []
        };

        const classTotals = {
            'A': 0,
            'B': 0,
            'C': 0,
            'D': 0,
            'WH': 0,
            'WL': 0,
            'WM': 0,
            'W': 0,
            'NC': 0
        };

        selectedItems.forEach(item => {
            grouped[item.class].push(item);
            classTotals[item.class] += item.fine * item.quantity;
        });

        // Display grouped items
        Object.entries(grouped).forEach(([itemClass, items]) => {
            if (items.length > 0) {
                items.forEach(item => {
                    const itemEl = createSelectedItemElement(item);
                    selectedItemsList.appendChild(itemEl);
                });
            }
        });

        // Update Totals Display
        if (totalsContainer) {
            totalsContainer.style.display = 'block';
            let totalsHtml = '<h4 style="margin: 0 0 0.5rem 0; font-family: var(--font-display); color: var(--ink-primary);">PROJECTED FINES</h4>';
            let grandTotal = 0;

            Object.entries(classTotals).forEach(([cls, total]) => {
                if (total > 0) {
                    totalsHtml += `
                        <div style="display: flex; justify-content: space-between; font-family: 'Courier Prime', monospace; font-size: 0.9rem; margin-bottom: 0.25rem;">
                            <span>Class ${cls}:</span>
                            <span>$${total.toLocaleString()}</span>
                        </div>
                    `;
                    grandTotal += total;
                }
            });

            totalsHtml += `
                <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 0.5rem; border-top: 1px dashed var(--ink-border); padding-top: 0.5rem;">
                    <span>TOTAL:</span>
                    <span>$${grandTotal.toLocaleString()}</span>
                </div>
            `;

            totalsContainer.innerHTML = totalsHtml;
        }

        copyBtn.disabled = false;
    }
}

// Create selected item element
function createSelectedItemElement(item) {
    const div = document.createElement('div');
    div.className = 'selected-item';

    const classNames = {
        'A': 'Class A Contraband',
        'B': 'Class B Contraband',
        'C': 'Class C Contraband',
        'D': 'Class D Contraband',
        'WH': 'Hand Weapon',
        'WL': 'Long Weapon',
        'WM': 'Melee Weapon',
        'W': 'Weapon',
        'NC': 'Non-Contraband / Valuable'
    };

    div.innerHTML = `
        <div class="selected-item-info">
            <span class="selected-item-name">${item.name}</span>
            <span class="selected-item-class">${classNames[item.class]}</span>
        </div>
        <div class="quantity-controls">
            <input type="number" class="quantity-input" value="${item.quantity || 1}" min="1" max="999" 
                   onchange="updateQuantity('${item.name}', this.value)" 
                   onclick="event.stopPropagation()">
            <span class="quantity-label">x</span>
        </div>
        <button class="remove-btn" onclick="removeItem('${item.name}')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>
    `;

    return div;
}

// Update quantity
function updateQuantity(itemName, quantity) {
    const item = selectedItems.get(itemName);
    if (item) {
        item.quantity = Math.max(1, Math.min(999, parseInt(quantity) || 1));
        selectedItems.set(itemName, item);
        updateUI(); // Need to update UI to refresh totals
    }
}

// Remove item
function removeItem(itemName) {
    selectedItems.delete(itemName);

    // Update button state
    itemButtons.forEach(btn => {
        if (btn.dataset.item === itemName) {
            btn.classList.remove('selected');
        }
    });

    updateUI();
}

// Clear all items
function clearAllItems() {
    selectedItems.clear();

    itemButtons.forEach(btn => {
        btn.classList.remove('selected');
    });

    updateUI();
}

// Copy to clipboard
async function copyToClipboard() {
    if (selectedItems.size === 0) return;

    // Build text output - only selected items with quantity and class
    let items = [];

    // Convert map to array and sort by fine amount (highest to lowest)
    // Non-Contraband (NC) has fine 0, so it will be last
    const sortedItems = Array.from(selectedItems.values()).sort((a, b) => {
        return b.fine - a.fine;
    });

    sortedItems.forEach(item => {
        const quantity = item.quantity || 1;
        let classLabel = 'Class ' + item.class;
        if (item.class === 'NC') classLabel = 'Non-Contraband';
        if (item.class === 'W') classLabel = 'Weapon';
        if (item.class === 'WH') classLabel = 'Hand Weapon';
        if (item.class === 'WL') classLabel = 'Long Weapon';
        if (item.class === 'WM') classLabel = 'Melee Weapon';
        items.push(`${item.name} - ${quantity}x - ${classLabel}`);
    });

    const separatorSelect = document.getElementById('separatorSelect');
    const separator = separatorSelect ? separatorSelect.value : ', ';

    const output = items.join(separator);

    try {
        await navigator.clipboard.writeText(output.trim());
        showToast();
    } catch (err) {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        fallbackCopyToClipboard(output.trim());
    }
}

// Fallback copy method
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand('copy');
        showToast();
    } catch (err) {
        console.error('Fallback copy failed:', err);
    }

    document.body.removeChild(textArea);
}

// Helper to get field value or N/A
function getFieldValue(fieldId) {
    const checkbox = document.getElementById('na_' + fieldId);
    const textarea = document.getElementById(fieldId);

    if (checkbox && checkbox.checked) {
        return "N/A";
    }
    return textarea ? textarea.value : "";
}

// Copy Briefing Notes
async function copyBriefingNotes() {
    const date = document.getElementById('briefingDate').value;
    const time = document.getElementById('briefingTime').value;
    const newAustin = getFieldValue('newAustin');
    const westElizabeth = getFieldValue('westElizabeth');
    const newHanover = getFieldValue('newHanover');
    const lemoyne = getFieldValue('lemoyne');
    const secretaries = getFieldValue('secretaries');
    const specialForces = getFieldValue('specialForces');
    const sisika = getFieldValue('sisika');
    const bocBol = getFieldValue('bocBol');
    const notes = getFieldValue('notes');
    const includeStandardNotes = document.getElementById('includeStandardNotes');

    let finalNotes = notes;
    if (includeStandardNotes && includeStandardNotes.checked) {
        const standardNotes = `Briefings start 15 minutes before storm show up on time, This is very important!

Check out (It's got region ordinances organized and lots of other good tools) https://samuele1000.github.io/SynCountySheriffsOffice/

Senior Deputy+ Keep taking shadow.`;

        if (finalNotes) {
            finalNotes += '\n\n' + standardNotes;
        } else {
            finalNotes = standardNotes;
        }
    }

    // Convert date and time to Discord timestamp
    const dateTimeString = `${date}T${time}:00`;
    const dateTimeObj = new Date(dateTimeString);
    const unixTimestamp = Math.floor(dateTimeObj.getTime() / 1000);
    const discordTimestamp = `<t:${unixTimestamp}:F>`;

    const formattedText = `${discordTimestamp}

New Austin: 
${newAustin}

West Elizabeth: 
${westElizabeth}

New Hanover: 
${newHanover}

Lemoyne: 
${lemoyne}

Secretaries: 
${secretaries}

Special Forces:
${specialForces}

Sisika Sheriff's Office:
${sisika}

BOC / BOL: 
${bocBol}

Notes:
${finalNotes}`;

    try {
        await navigator.clipboard.writeText(formattedText);
        showToast();
    } catch (err) {
        console.error('Failed to copy briefing:', err);
        fallbackCopyToClipboard(formattedText);
    }
}

// Show toast notification
function showToast() {
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
