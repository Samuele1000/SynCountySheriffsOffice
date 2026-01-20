// State management
let selectedItems = new Map();

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
                introScreen.classList.add('fade-out');
                setTimeout(() => {
                    introScreen.style.display = 'none';
                }, 800);
            });
        }

        if (enterOrdinancesBtn) {
            enterOrdinancesBtn.addEventListener('click', () => {
                window.location.href = 'ordinances.html';
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

    copyBtn.addEventListener('click', copyToClipboard);
    clearBtn.addEventListener('click', clearAllItems);

    updateUI();
}

// Toggle item selection
function toggleItem(btn) {
    const itemName = btn.dataset.item;
    const itemClass = btn.dataset.class;

    if (selectedItems.has(itemName)) {
        selectedItems.delete(itemName);
        btn.classList.remove('selected');
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

// Get fine amount based on class
function getFineAmount(itemClass) {
    const fines = {
        'A': 1000,
        'B': 100,
        'C': 50,
        'D': 25
    };
    return fines[itemClass] || 0;
}

// Update UI
function updateUI() {
    if (selectedItems.size === 0) {
        selectedItemsList.innerHTML = '<p class="empty-state">No items selected</p>';
        copyBtn.disabled = true;
    } else {
        selectedItemsList.innerHTML = '';

        // Group by class
        const grouped = {
            'A': [],
            'B': [],
            'C': [],
            'D': []
        };

        selectedItems.forEach(item => {
            grouped[item.class].push(item);
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
        'D': 'Class D Contraband'
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

    selectedItems.forEach(item => {
        const quantity = item.quantity || 1;
        items.push(`${item.name} - ${quantity}x - Class ${item.class}`);
    });

    const output = items.join(', ');

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

// Show toast notification
function showToast() {
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
