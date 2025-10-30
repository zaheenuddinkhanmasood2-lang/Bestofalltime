// Modern Animations & Interactions System
// Handles scroll animations, micro-interactions, and ambient effects

class AnimationController {
    constructor() {
        this.observers = new Map();
        this.particles = [];
        this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.cursorFollower = null;
        this.init();
    }

    init() {
        if (this.isReducedMotion) return;

        this.setupScrollAnimations();
        this.setupParticles();
        this.setupMicroInteractions();
        this.setupParallaxEffects();
        this.setupTypewriterEffect();
        this.setupRippleEffects();
        this.setupLoadingAnimations();
        this.setupCursorFollower();
        this.setupMagneticLinks();
        this.setupContactForm();
    }

    // Scroll-triggered animations using Intersection Observer
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all elements with animation classes
        const animatedElements = document.querySelectorAll(`
            .scroll-reveal,
            .stagger-item,
            .glass-card,
            .feature-card,
            .team-member,
            .contact-item
        `);

        animatedElements.forEach((el, index) => {
            // Add stagger delay
            if (el.classList.contains('stagger-item')) {
                el.style.animationDelay = `${index * 0.1}s`;
            }
            observer.observe(el);
        });

        this.observers.set('scroll', observer);
    }

    animateElement(element) {
        element.classList.add('animate-fadeInUp');

        // Add specific animations based on element type
        if (element.classList.contains('glass-card')) {
            this.animateCard(element);
        }

        if (element.classList.contains('feature-card')) {
            this.animateFeatureCard(element);
        }
    }

    animateCard(card) {
        const icon = card.querySelector('.w-16, .w-12');
        if (icon) {
            setTimeout(() => {
                icon.style.transform = 'scale(1.1) rotate(5deg)';
                setTimeout(() => {
                    icon.style.transform = 'scale(1) rotate(0deg)';
                }, 200);
            }, 100);
        }
    }

    animateFeatureCard(card) {
        const icon = card.querySelector('div[class*="w-16"]');
        if (icon) {
            // Animate icon with bounce effect
            icon.style.animation = 'bounce 0.6s ease-out 0.3s';
        }
    }

    // Floating particles system
    setupParticles() {
        const container = document.querySelector('.particles-container');
        if (!container) return;

        const particleCount = 50;

        for (let i = 0; i < particleCount; i++) {
            this.createParticle(container);
        }

        // Animate particles
        this.animateParticles();
    }

    createParticle(container) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        // Random position and properties
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (Math.random() * 4 + 6) + 's';

        // Random size
        const size = Math.random() * 3 + 1;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';

        // Random opacity
        particle.style.opacity = Math.random() * 0.5 + 0.1;

        container.appendChild(particle);
        this.particles.push(particle);
    }

    animateParticles() {
        this.particles.forEach(particle => {
            // Add subtle movement
            setInterval(() => {
                const x = (Math.random() - 0.5) * 2;
                const y = (Math.random() - 0.5) * 2;
                particle.style.transform = `translate(${x}px, ${y}px)`;
            }, 3000 + Math.random() * 2000);
        });
    }

    // Cursor follower
    setupCursorFollower() {
        const follower = document.createElement('div');
        follower.className = 'cursor-follower hidden';
        document.body.appendChild(follower);
        this.cursorFollower = follower;

        const show = () => follower.classList.remove('hidden');
        const hide = () => follower.classList.add('hidden');

        window.addEventListener('mousemove', (e) => {
            follower.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
        });

        // Show follower when focused within document
        window.addEventListener('mouseenter', show);
        window.addEventListener('mouseleave', hide);

        // Enlarge on interactive elements
        const enlargers = document.querySelectorAll('a, button, .glass-button');
        enlargers.forEach(el => {
            el.addEventListener('mouseenter', () => follower.classList.add('enlarge'));
            el.addEventListener('mouseleave', () => follower.classList.remove('enlarge'));
        });
    }

    // Magnetic nav links (smooth, stable, single listener)
    setupMagneticLinks() {
        const container = document.getElementById('navbar');
        const links = Array.from(document.querySelectorAll('.nav-link'));
        if (!container || links.length === 0) return;

        const strength = 12;      // max translation in px
        const radius = 140;        // activation radius in px
        const damp = 0.18;         // smoothing factor

        const state = new Map();   // link -> {tx, ty, targetX, targetY}
        links.forEach(link => state.set(link, { tx: 0, ty: 0, targetX: 0, targetY: 0 }));

        let rafId = null;

        const animate = () => {
            links.forEach(link => {
                const s = state.get(link);
                s.tx += (s.targetX - s.tx) * damp;
                s.ty += (s.targetY - s.ty) * damp;
                link.style.transform = `translate3d(${s.tx}px, ${s.ty}px, 0)`;
            });
            rafId = requestAnimationFrame(animate);
        };

        const computeTargets = (clientX, clientY) => {
            links.forEach(link => {
                const rect = link.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                const dx = clientX - cx;
                const dy = clientY - cy;
                const dist = Math.hypot(dx, dy);

                const s = state.get(link);
                if (dist < radius) {
                    s.targetX = (dx / rect.width) * strength;
                    s.targetY = (dy / rect.height) * strength;
                } else {
                    s.targetX = 0;
                    s.targetY = 0;
                }
            });
        };

        container.addEventListener('mousemove', (e) => {
            computeTargets(e.clientX, e.clientY);
            if (rafId == null) rafId = requestAnimationFrame(animate);
        });

        container.addEventListener('mouseleave', () => {
            links.forEach(link => {
                const s = state.get(link);
                s.targetX = 0;
                s.targetY = 0;
            });
        });
    }

    // Micro-interactions for buttons and interactive elements
    setupMicroInteractions() {
        // Button hover effects
        document.querySelectorAll('.glass-button, .btn').forEach(button => {
            button.addEventListener('mouseenter', (e) => {
                this.addButtonHoverEffect(e.target);
            });

            button.addEventListener('mouseleave', (e) => {
                this.removeButtonHoverEffect(e.target);
            });
        });

        // Card hover effects
        document.querySelectorAll('.glass-card').forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                this.addCardHoverEffect(e.target);
            });

            card.addEventListener('mouseleave', (e) => {
                this.removeCardHoverEffect(e.target);
            });
        });

        // Input focus effects
        document.querySelectorAll('input, textarea').forEach(input => {
            input.addEventListener('focus', (e) => {
                this.addInputFocusEffect(e.target);
            });

            input.addEventListener('blur', (e) => {
                this.removeInputFocusEffect(e.target);
            });
        });
    }

    addButtonHoverEffect(button) {
        button.style.transform = 'translateY(-2px) scale(1.02)';
        button.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.3)';
    }

    removeButtonHoverEffect(button) {
        button.style.transform = 'translateY(0) scale(1)';
        button.style.boxShadow = '';
    }

    addCardHoverEffect(card) {
        card.style.transform = 'translateY(-8px) scale(1.02)';
        card.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.2)';

        // Animate icon if present
        const icon = card.querySelector('div[class*="w-16"], div[class*="w-12"]');
        if (icon) {
            icon.style.transform = 'scale(1.1) rotate(5deg)';
        }
    }

    removeCardHoverEffect(card) {
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = '';

        // Reset icon
        const icon = card.querySelector('div[class*="w-16"], div[class*="w-12"]');
        if (icon) {
            icon.style.transform = 'scale(1) rotate(0deg)';
        }
    }

    addInputFocusEffect(input) {
        input.parentElement.style.transform = 'scale(1.02)';
    }

    removeInputFocusEffect(input) {
        input.parentElement.style.transform = 'scale(1)';
    }

    // Parallax scrolling effects
    setupParallaxEffects() {
        const parallaxElements = document.querySelectorAll('.parallax');

        if (parallaxElements.length === 0) return;

        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;

            parallaxElements.forEach(element => {
                element.style.transform = `translateY(${rate}px)`;
            });
        });
    }

    // Typewriter effect for headings
    setupTypewriterEffect() {
        const typewriterElements = document.querySelectorAll('.typewriter');

        typewriterElements.forEach(element => {
            const text = element.textContent;
            element.textContent = '';
            element.style.borderRight = '2px solid #a78bfa';

            let i = 0;
            const typeInterval = setInterval(() => {
                element.textContent += text.charAt(i);
                i++;

                if (i > text.length) {
                    clearInterval(typeInterval);
                    setTimeout(() => {
                        element.style.borderRight = 'none';
                    }, 1000);
                }
            }, 100);
        });
    }

    // Ripple effects for buttons
    setupRippleEffects() {
        document.querySelectorAll('.ripple, .glass-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.createRipple(e);
            });
        });
    }

    createRipple(event) {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;

        button.style.position = 'relative';
        button.style.overflow = 'hidden';
        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // Loading animations
    setupLoadingAnimations() {
        // Skeleton loading for cards
        this.createSkeletonLoader();

        // Page loading animation
        window.addEventListener('load', () => {
            this.animatePageLoad();
        });
    }

    createSkeletonLoader() {
        const skeletonElements = document.querySelectorAll('.skeleton');

        skeletonElements.forEach(element => {
            element.style.background = 'linear-gradient(90deg, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.1) 75%)';
            element.style.backgroundSize = '200% 100%';
            element.style.animation = 'loading 1.5s infinite';
        });
    }

    animatePageLoad() {
        // Animate hero section
        const hero = document.querySelector('#home');
        if (hero) {
            hero.style.opacity = '0';
            hero.style.transform = 'translateY(50px)';

            setTimeout(() => {
                hero.style.transition = 'all 1s ease-out';
                hero.style.opacity = '1';
                hero.style.transform = 'translateY(0)';
            }, 100);
        }

        // Stagger animate feature cards
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px)';

            setTimeout(() => {
                card.style.transition = 'all 0.6s ease-out';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 500 + (index * 100));
        });

        // Navbar lens flare sweep
        const lens = document.querySelector('#navbar .lensflare');
        if (lens) {
            let x = 0;
            const sweep = () => {
                x = (x + 0.6) % 100;
                lens.style.setProperty('--x', `${x}%`);
                requestAnimationFrame(sweep);
            };
            requestAnimationFrame(sweep);
        }
    }

    // Navigation scroll effects
    setupNavigationEffects() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        let lastScrollY = window.scrollY;
        let ticking = false;

        const updateNavbar = () => {
            const scrollY = window.scrollY;

            if (scrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            // Hide/show navbar on scroll
            if (scrollY > lastScrollY && scrollY > 200) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }

            lastScrollY = scrollY;
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateNavbar);
                ticking = true;
            }
        });
    }

    // Mobile menu animations - DISABLED (handled by UnifiedMobileMenu in index.html)
    setupMobileMenu() {
        // Mobile menu is now handled by UnifiedMobileMenu class in index.html
        // This prevents conflicts with multiple event listeners
        console.log('Mobile menu animations handled by UnifiedMobileMenu');
        return;
    }

    // Smooth scroll for anchor links
    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));

                if (target) {
                    const offsetTop = target.offsetTop - 80; // Account for fixed navbar

                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // Contact form functionality
    setupContactForm() {
        const form = document.getElementById('contactForm');
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitLoader = document.getElementById('submitLoader');

        if (!form || !submitBtn) return;

        // Check authentication status and update form
        this.updateContactFormAuthState();

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Check if user is authenticated
            if (!await this.isUserAuthenticated()) {
                this.showNotification('Please login to send messages', 'warning');
                return;
            }

            // Get form data
            const formData = new FormData(form);
            const data = {
                name: formData.get('name'),
                email: formData.get('email'),
                subject: formData.get('subject'),
                message: formData.get('message')
            };

            // Validate form
            if (!this.validateContactForm(data)) return;

            // Show loading state
            this.setFormLoading(true);

            try {
                // Send message with user authentication
                await this.sendContactMessage(data);

                // Show success
                this.showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
                form.reset();

                // Add success animation to button
                submitBtn.classList.add('success-anim');
                setTimeout(() => submitBtn.classList.remove('success-anim'), 900);

            } catch (error) {
                console.error('Contact form error:', error);
                this.showNotification('Failed to send message. Please try again.', 'error');
            } finally {
                this.setFormLoading(false);
            }
        });
    }

    validateContactForm(data) {
        const { name, email, subject, message } = data;

        if (!name.trim()) {
            this.showNotification('Please enter your name', 'warning');
            return false;
        }

        if (!email.trim() || !this.isValidEmail(email)) {
            this.showNotification('Please enter a valid email address', 'warning');
            return false;
        }

        if (!subject.trim()) {
            this.showNotification('Please enter a subject', 'warning');
            return false;
        }

        if (!message.trim()) {
            this.showNotification('Please enter a message', 'warning');
            return false;
        }

        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    setFormLoading(loading) {
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitLoader = document.getElementById('submitLoader');

        if (!submitBtn || !submitText || !submitLoader) return;

        if (loading) {
            submitBtn.disabled = true;
            submitText.classList.add('hidden');
            submitLoader.classList.remove('hidden');
            submitBtn.classList.add('btn-loading');
        } else {
            submitBtn.disabled = false;
            submitText.classList.remove('hidden');
            submitLoader.classList.add('hidden');
            submitBtn.classList.remove('btn-loading');
        }
    }

    async sendContactMessage(data) {
        try {
            // Get authenticated user info
            const supabase = window.getSupabaseClient();
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session) {
                throw new Error('User not authenticated');
            }

            // Option 1: Save to Supabase database with user ID
            if (typeof window.getSupabaseClient === 'function') {
                const { error } = await supabase
                    .from('contact_messages')
                    .insert([
                        {
                            user_id: session.user.id,
                            user_email: session.user.email,
                            name: data.name,
                            email: data.email,
                            subject: data.subject,
                            message: data.message,
                            created_at: new Date().toISOString()
                        }
                    ]);

                if (error) throw error;

                console.log('Message saved to database by authenticated user:', {
                    userId: session.user.id,
                    userEmail: session.user.email,
                    messageData: data
                });
                return true;
            }

            // Option 2: Send to external API with auth token
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    ...data,
                    userId: session.user.id,
                    userEmail: session.user.email
                })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            console.log('Message sent via API by authenticated user:', data);
            return true;

        } catch (error) {
            console.error('Failed to save message:', error);
            throw error; // Re-throw to show error notification
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="flex-shrink-0">
                    ${this.getNotificationIcon(type)}
                </div>
                <div class="text-sm font-medium">${message}</div>
            </div>
        `;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle text-green-400"></i>',
            error: '<i class="fas fa-exclamation-circle text-red-400"></i>',
            warning: '<i class="fas fa-exclamation-triangle text-yellow-400"></i>',
            info: '<i class="fas fa-info-circle text-blue-400"></i>'
        };
        return icons[type] || icons.info;
    }

    // Authentication helpers for contact form
    async isUserAuthenticated() {
        if (typeof window.getSupabaseClient !== 'function') return false;

        try {
            const supabase = window.getSupabaseClient();
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('Auth check error:', error);
                return false;
            }

            return !!session && !!session.user;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    }

    async updateContactFormAuthState() {
        const form = document.getElementById('contactForm');
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');

        if (!form || !submitBtn) return;

        const isAuthenticated = await this.isUserAuthenticated();

        if (!isAuthenticated) {
            // Show login prompt
            const loginPrompt = document.createElement('div');
            loginPrompt.className = 'glass-panel p-4 rounded-xl mb-6 border border-yellow-500/30 bg-yellow-500/10';
            loginPrompt.innerHTML = `
                <div class="flex items-center space-x-3">
                    <i class="fas fa-lock text-yellow-400 text-lg"></i>
                    <div>
                        <p class="text-yellow-200 font-medium">Login Required</p>
                        <p class="text-yellow-300 text-sm">Please login to send messages</p>
                    </div>
                </div>
                <div class="mt-3">
                    <a href="login.html" class="glass-button px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:scale-105 transition-transform duration-300">
                        Login Now
                    </a>
                </div>
            `;

            form.insertBefore(loginPrompt, form.firstChild);

            // Disable form
            form.querySelectorAll('input, textarea, button').forEach(el => {
                el.disabled = true;
                el.style.opacity = '0.6';
            });

            submitText.textContent = 'Login Required';
            submitBtn.style.cursor = 'not-allowed';
        } else {
            // User is authenticated, enable form
            const loginPrompt = form.querySelector('.glass-panel');
            if (loginPrompt) {
                loginPrompt.remove();
            }

            form.querySelectorAll('input, textarea, button').forEach(el => {
                el.disabled = false;
                el.style.opacity = '1';
            });

            submitText.textContent = 'Send Message';
            submitBtn.style.cursor = 'pointer';
        }
    }

    // Helper function to view saved messages (for admin use)
    viewSavedMessages() {
        // Check localStorage messages
        const localMessages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
        console.log('Messages in localStorage:', localMessages);

        // Check Supabase messages (if available)
        if (typeof window.getSupabaseClient === 'function') {
            const supabase = window.getSupabaseClient();
            supabase
                .from('contact_messages')
                .select('*')
                .order('created_at', { ascending: false })
                .then(({ data, error }) => {
                    if (error) {
                        console.error('Error fetching messages:', error);
                    } else {
                        console.log('Messages in database:', data);
                    }
                });
        }
    }

    // Cleanup method
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        this.particles = [];
    }
}

// CSS for ripple animation
const rippleCSS = `
@keyframes ripple {
    to {
        transform: scale(4);
        opacity: 0;
    }
}
`;

// Add ripple CSS to head
const style = document.createElement('style');
style.textContent = rippleCSS;
document.head.appendChild(style);

// Initialize animation controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.animationController = new AnimationController();
});

// Export for use in other scripts
window.AnimationController = AnimationController;
