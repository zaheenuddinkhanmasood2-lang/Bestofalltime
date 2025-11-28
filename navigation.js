// Modern Navigation System for SharedStudy
// Handles glassmorphism navigation, mobile menu, and smooth scrolling

class ModernNavigation {
    constructor() {
        this.navbar = document.getElementById('navbar');
        this.mobileMenuButton = document.getElementById('mobile-menu-button');
        this.mobileMenu = document.getElementById('mobile-menu');
        this.lastScrollY = window.scrollY;
        this.isMenuOpen = false;
        this.init();
    }

    init() {
        this.setupScrollEffects();
        this.setupMobileMenu();
        this.setupSmoothScroll();
        this.setupNavigationLinks();
        this.setupAuthState();
    }

    // Scroll effects for navbar
    setupScrollEffects() {
        let ticking = false;

        const updateNavbar = () => {
            const scrollY = window.scrollY;

            // Add scrolled class for styling
            if (scrollY > 50) {
                this.navbar.classList.add('scrolled');
            } else {
                this.navbar.classList.remove('scrolled');
            }

            // Hide/show navbar on scroll (mobile)
            if (window.innerWidth <= 768) {
                if (scrollY > this.lastScrollY && scrollY > 200) {
                    this.navbar.style.transform = 'translateY(-100%)';
                } else {
                    this.navbar.style.transform = 'translateY(0)';
                }
            }

            this.lastScrollY = scrollY;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateNavbar);
                ticking = true;
            }
        });
    }

    // Mobile hamburger menu functionality
    setupMobileMenu() {
        const menuButton = document.getElementById('mobile-menu-button');
        const menuOverlay = document.getElementById('mobile-menu-overlay');
        const menuPanel = document.getElementById('mobile-menu-panel');
        const menuClose = document.getElementById('mobile-menu-close');

        if (!menuButton || !menuOverlay || !menuPanel) return;

        // Toggle menu
        const toggleMenu = () => {
            const isOpen = menuPanel.classList.contains('active');
            if (isOpen) {
                this.closeMobileMenu();
            } else {
                this.openMobileMenu();
            }
        };

        // Open menu
        menuButton.addEventListener('click', toggleMenu);
        
        // Close menu handlers
        if (menuClose) {
            menuClose.addEventListener('click', () => this.closeMobileMenu());
        }
        
        menuOverlay.addEventListener('click', () => this.closeMobileMenu());

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && menuPanel.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });

        // Prevent body scroll when menu is open
        const observer = new MutationObserver(() => {
            if (menuPanel.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
        observer.observe(menuPanel, { attributes: true, attributeFilter: ['class'] });
    }

    toggleMobileMenu() {
        const menuPanel = document.getElementById('mobile-menu-panel');
        if (!menuPanel) return;
        
        if (this.isMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        const menuButton = document.getElementById('mobile-menu-button');
        const menuOverlay = document.getElementById('mobile-menu-overlay');
        const menuPanel = document.getElementById('mobile-menu-panel');
        
        if (!menuButton || !menuOverlay || !menuPanel) return;

        menuButton.classList.add('active');
        menuButton.setAttribute('aria-expanded', 'true');
        menuOverlay.classList.add('active');
        menuPanel.classList.add('active');
        this.isMenuOpen = true;

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    closeMobileMenu() {
        const menuButton = document.getElementById('mobile-menu-button');
        const menuOverlay = document.getElementById('mobile-menu-overlay');
        const menuPanel = document.getElementById('mobile-menu-panel');
        
        if (!menuButton || !menuOverlay || !menuPanel) return;

        menuButton.classList.remove('active');
        menuButton.setAttribute('aria-expanded', 'false');
        menuOverlay.classList.remove('active');
        menuPanel.classList.remove('active');
        this.isMenuOpen = false;

        // Restore body scroll
        document.body.style.overflow = '';
    }


    // Smooth scroll for anchor links
    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;

                e.preventDefault();
                const target = document.querySelector(href);

                if (target) {
                    const offsetTop = target.offsetTop - 80; // Account for fixed navbar

                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });

                    // Close mobile menu if open
                    if (this.isMenuOpen) {
                        this.closeMobileMenu();
                    }
                }
            });
        });
    }

    // Navigation links with active state
    setupNavigationLinks() {
        const navLinks = document.querySelectorAll('.nav-link');

        // Update active link on scroll
        window.addEventListener('scroll', () => {
            const sections = document.querySelectorAll('section[id]');
            const scrollPos = window.scrollY + 100;

            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');

                if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                    // Remove active class from all links
                    navLinks.forEach(link => link.classList.remove('active'));

                    // Add active class to current link
                    const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            });
        });

        // Add hover effects
        navLinks.forEach(link => {
            link.addEventListener('mouseenter', () => {
                this.addLinkHoverEffect(link);
            });

            link.addEventListener('mouseleave', () => {
                this.removeLinkHoverEffect(link);
            });
        });
    }

    addLinkHoverEffect(link) {
        const underline = link.querySelector('span');
        if (underline) {
            underline.style.width = '100%';
        }
    }

    removeLinkHoverEffect(link) {
        if (!link.classList.contains('active')) {
            const underline = link.querySelector('span');
            if (underline) {
                underline.style.width = '0%';
            }
        }
    }

    // Authentication state management
    setupAuthState() {
        if (typeof window.getSupabaseClient !== 'function') return;
        const client = window.getSupabaseClient();

        // Listen for auth state changes
        client.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                this.updateAuthState(true, session.user);
            } else if (event === 'SIGNED_OUT') {
                this.updateAuthState(false);
            }
        });
    }

    // Helper function to get display name from profile or fallback to email
    async getDisplayName(user) {
        try {
            const { data: profile } = await this.supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', user.id)
                .single();

            if (profile) {
                return profile.full_name || profile.email || user.email;
            }
        } catch (error) {
            console.error('Error loading profile for display name:', error);
        }

        // Fallback to user email
        return user.email;
    }

    async updateAuthState(isAuthenticated, user = null) {
        const authButtons = document.querySelector('.nav-auth, .flex.items-center.space-x-4');

        if (isAuthenticated && user) {
            // Show authenticated state
            if (authButtons) {
                // Get display name from profile or fallback to email
                getDisplayName(user).then(displayName => {
                    authButtons.innerHTML = `
                        <div class="flex items-center space-x-4">
                            <span class="text-gray-300">Welcome, ${displayName}</span>
                            <button onclick="handleLogout()" class="glass-button px-4 py-2 rounded-full border border-white/20 text-white font-medium hover:bg-white/10 transition-all duration-300">
                                Logout
                            </button>
                        </div>
                    `;
                });
            }
        } else {
            // Show public state
            if (authButtons) {
                authButtons.innerHTML = `
                    <div class="flex items-center space-x-4 ml-8">
                        <a href="login.html" class="text-gray-300 hover:text-white transition-colors duration-200 font-medium">
                            Login
                        </a>
                        <button class="glass-button px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                            Get Started
                        </button>
                    </div>
                `;
            }
        }
    }

    // Utility methods
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    // Cleanup method
    destroy() {
        this.closeMobileMenu();
        document.body.style.overflow = '';
    }
}

// Global function to close mobile menu
function closeMobileMenu() {
    if (window.modernNavigation) {
        window.modernNavigation.closeMobileMenu();
    }
}

// Global logout handler
async function handleLogout() {
    try {
        if (typeof window.getSupabaseClient === 'function') {
            const client = window.getSupabaseClient();
            const { error } = await client.auth.signOut();
            if (error) throw error;
        }

        // Close mobile menu if open
        closeMobileMenu();

        // Redirect to home page
        window.location.href = 'index.html';

    } catch (error) {
        console.error('Logout error:', error);
        if (window.modernNavigation) {
            window.modernNavigation.showNotification('Logout failed. Please try again.', 'error');
        }
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.modernNavigation = new ModernNavigation();
});

// Export for use in other scripts
window.ModernNavigation = ModernNavigation;
