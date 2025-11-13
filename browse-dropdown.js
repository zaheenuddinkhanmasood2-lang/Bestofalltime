// Browse Dropdown Component for StudyShare
// Click-based dropdown with mobile support, keyboard navigation, and ARIA labels

class BrowseDropdown {
    constructor(triggerSelector, options = {}) {
        this.trigger = document.querySelector(triggerSelector);
        this.isOpen = false;
        this.currentFocus = -1;
        this.options = {
            desktop: options.desktop !== false,
            mobile: options.mobile !== false,
            ...options
        };

        if (!this.trigger) {
            console.warn('BrowseDropdown: Trigger element not found');
            return;
        }

        this.init();
    }

    init() {
        this.createDropdown();
        this.attachEvents();
    }

    createDropdown() {
        // Create dropdown container
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'browse-dropdown';
        this.dropdown.setAttribute('role', 'menu');
        this.dropdown.setAttribute('aria-label', 'Browse options');

        // Create backdrop for mobile
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'browse-dropdown-backdrop';
        this.backdrop.setAttribute('aria-hidden', 'true');

        // Create menu items
        this.menuItems = [
            {
                text: 'Browse Notes',
                href: 'browse.html',
                icon: 'fa-file-alt',
                role: 'menuitem'
            },
            {
                text: 'Browse Past Papers',
                href: 'past-papers/past-papers.html',
                icon: 'fa-file-pdf',
                role: 'menuitem'
            }
        ];

        this.menuItems.forEach((item, index) => {
            const menuItem = document.createElement('a');
            menuItem.href = item.href;
            menuItem.className = 'browse-dropdown-item';
            menuItem.setAttribute('role', item.role);
            menuItem.setAttribute('tabindex', '-1');
            menuItem.setAttribute('data-index', index);

            menuItem.innerHTML = `
                <i class="fas ${item.icon} mr-2"></i>
                <span>${item.text}</span>
            `;

            menuItem.addEventListener('click', (e) => {
                this.handleItemClick(e, item);
            });

            this.dropdown.appendChild(menuItem);
        });

        // Insert dropdown to body to avoid overflow clipping from navbar
        document.body.appendChild(this.dropdown);
        document.body.appendChild(this.backdrop);

        // Position dropdown relative to trigger
        this.updateDropdownPosition();
    }

    attachEvents() {
        // Click event on trigger
        this.trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        // Also handle backdrop click
        this.backdrop.addEventListener('click', () => {
            this.close();
        });

        // Keyboard events on trigger
        this.trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.open();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.open();
                this.focusItem(0);
            }
        });

        // Click outside to close
        this.clickOutsideHandler = (e) => {
            if (this.isOpen &&
                !this.dropdown.contains(e.target) &&
                !this.trigger.contains(e.target)) {
                this.close();
            }
        };
        document.addEventListener('click', this.clickOutsideHandler);

        // Update position on scroll/resize
        this.positionUpdateHandler = () => {
            if (this.isOpen) {
                this.updateDropdownPosition();
            }
        };
        window.addEventListener('scroll', this.positionUpdateHandler, true);
        window.addEventListener('resize', this.positionUpdateHandler);

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
                this.trigger.focus();
            }
        });

        // Keyboard navigation within dropdown
        this.dropdown.addEventListener('keydown', (e) => {
            this.handleKeyboardNavigation(e);
        });
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.isOpen) return;

        this.isOpen = true;
        if (this.trigger) {
            this.trigger.setAttribute('aria-expanded', 'true');
            // Update chevron icon rotation
            const chevron = this.trigger.querySelector('.fa-chevron-down');
            if (chevron) {
                chevron.style.transform = 'rotate(180deg)';
            }
        }

        // Update dropdown position before showing
        this.updateDropdownPosition();

        this.dropdown.classList.add('open');

        // Only show backdrop on mobile devices
        if (window.innerWidth <= 768) {
            this.backdrop.classList.add('visible');
            document.body.style.overflow = 'hidden';
        }

        // Focus first item
        setTimeout(() => {
            this.focusItem(0);
        }, 100);
    }

    updateDropdownPosition() {
        if (!this.trigger || !this.dropdown) return;

        const triggerRect = this.trigger.getBoundingClientRect();
        const dropdown = this.dropdown;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Calculate dropdown dimensions
        const dropdownWidth = Math.max(triggerRect.width, 200);
        const dropdownHeight = 120; // Approximate height for two items
        const padding = 16; // Minimum padding from viewport edges

        // Calculate center position of trigger button
        const triggerCenterX = triggerRect.left + (triggerRect.width / 2);
        
        // Start with centered position (dropdown center aligns with trigger center)
        let left = triggerCenterX - (dropdownWidth / 2);
        let top = triggerRect.bottom + 4; // 4px gap below trigger

        // Check if dropdown would overflow right edge
        if (left + dropdownWidth > viewportWidth - padding) {
            // Align to right edge with padding
            left = viewportWidth - dropdownWidth - padding;
        }

        // Check if dropdown would overflow left edge
        if (left < padding) {
            // Align to left edge with padding
            left = padding;
        }

        // Check if dropdown would overflow bottom - position above if needed
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;

        if (spaceBelow < dropdownHeight + 20 && spaceAbove > spaceBelow) {
            // Position above trigger
            top = triggerRect.top - dropdownHeight - 4;
            dropdown.classList.add('dropdown-above');
        } else {
            dropdown.classList.remove('dropdown-above');
        }

        // Ensure dropdown doesn't go off-screen vertically
        if (top + dropdownHeight > viewportHeight - padding) {
            top = viewportHeight - dropdownHeight - padding;
        }
        if (top < padding) {
            top = padding;
        }

        // Apply positioning (fixed position is relative to viewport, no scroll offset needed)
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
        dropdown.style.minWidth = `${dropdownWidth}px`;
        dropdown.style.maxWidth = `${Math.min(viewportWidth - padding * 2, 300)}px`;
        dropdown.style.width = 'auto';
    }

    close() {
        if (!this.isOpen) return;

        this.isOpen = false;
        if (this.trigger) {
            this.trigger.setAttribute('aria-expanded', 'false');
            // Reset chevron icon rotation
            const chevron = this.trigger.querySelector('.fa-chevron-down');
            if (chevron) {
                chevron.style.transform = 'rotate(0deg)';
            }
        }
        this.dropdown.classList.remove('open');
        this.backdrop.classList.remove('visible');
        this.currentFocus = -1;

        // Restore body scroll
        document.body.style.overflow = '';
    }

    handleItemClick(e, item) {
        // Allow navigation but close dropdown
        this.close();
        // Navigation will happen naturally via href
    }

    handleKeyboardNavigation(e) {
        const items = this.dropdown.querySelectorAll('.browse-dropdown-item');
        const itemCount = items.length;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentFocus = (this.currentFocus + 1) % itemCount;
                this.focusItem(this.currentFocus);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.currentFocus = (this.currentFocus - 1 + itemCount) % itemCount;
                this.focusItem(this.currentFocus);
                break;
            case 'Home':
                e.preventDefault();
                this.focusItem(0);
                break;
            case 'End':
                e.preventDefault();
                this.focusItem(itemCount - 1);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (this.currentFocus >= 0 && items[this.currentFocus]) {
                    items[this.currentFocus].click();
                }
                break;
        }
    }

    focusItem(index) {
        const items = this.dropdown.querySelectorAll('.browse-dropdown-item');
        if (items[index]) {
            items.forEach(item => {
                item.setAttribute('tabindex', '-1');
                item.classList.remove('focused');
            });
            items[index].setAttribute('tabindex', '0');
            items[index].classList.add('focused');
            items[index].focus();
            this.currentFocus = index;
        }
    }

    destroy() {
        this.close();
        if (this.dropdown) this.dropdown.remove();
        if (this.backdrop) this.backdrop.remove();
        document.body.style.overflow = '';

        // Remove event listeners
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
        }
        if (this.positionUpdateHandler) {
            window.removeEventListener('scroll', this.positionUpdateHandler, true);
            window.removeEventListener('resize', this.positionUpdateHandler);
        }
    }
}

// Auto-initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize for desktop navigation - use the button inside the trigger
    const desktopTrigger = document.querySelector('#browseDropdownTrigger');
    if (desktopTrigger) {
        // Use the button as the actual trigger
        const button = desktopTrigger.querySelector('button');
        if (button) {
            button.id = 'browseDropdownButton';
            window.browseDropdown = new BrowseDropdown('#browseDropdownButton');
        }
    }

    // Initialize for mobile icon navigation
    const mobileTrigger = document.querySelector('#mobileBrowseDropdownTrigger');
    if (mobileTrigger) {
        window.mobileBrowseDropdown = new BrowseDropdown('#mobileBrowseDropdownTrigger');
    }
});

// Export for use in other scripts
window.BrowseDropdown = BrowseDropdown;

