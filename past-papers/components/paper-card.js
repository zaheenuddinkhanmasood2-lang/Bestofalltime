// Paper Card Component
// Reusable paper card component with cyberpunk design, accessibility, and performance optimizations

class PaperCard {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            onPreview: options.onPreview || null,
            onFavorite: options.onFavorite || null,
            onShare: options.onShare || null,
            ...options,
        };
        this.cards = new Map();
    }

    init() {
        // Component is initialized
        console.log('PaperCard component initialized');
    }

    createCard(paper, isFavorited = false) {
        const cardId = `paper-card-${paper.id}`;
        
        // Check if card already exists
        if (this.cards.has(cardId)) {
            return this.cards.get(cardId);
        }

        const card = document.createElement('div');
        card.className = 'pp-paper-card';
        card.id = cardId;
        card.setAttribute('role', 'article');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${paper.file_name} - ${paper.subject}`);
        card.setAttribute('data-paper-id', paper.id);

        // Build card HTML
        card.innerHTML = this.buildCardHTML(paper, isFavorited);

        // Add event listeners
        this.attachEventListeners(card, paper);

        // Lazy load thumbnail
        this.lazyLoadThumbnail(card, paper);

        // Store card reference
        this.cards.set(cardId, card);

        return card;
    }

    buildCardHTML(paper, isFavorited) {
        const thumbnailUrl = paper.thumbnail_url || '';
        const year = paper.year || 'N/A';
        const courseCode = this.getCourseCode(paper);
        const paperType = this.getPaperType(paper);
        const semester = this.getSemester(paper);
        const fileSize = this.formatFileSize(paper.file_size);
        const popularity = this.getPopularity(paper);

        return `
            ${thumbnailUrl ? `
                <img 
                    src="${this.escapeHtml(thumbnailUrl)}" 
                    alt="${this.escapeHtml(paper.file_name)}"
                    class="pp-card-thumbnail"
                    loading="lazy"
                    onerror="this.style.display='none'">
            ` : `
                <div class="pp-card-thumbnail" style="display: flex; align-items: center; justify-content: center; background: var(--pp-bg-tertiary);">
                    <i class="fas fa-file-pdf" style="font-size: 3rem; color: var(--pp-text-tertiary);"></i>
                </div>
            `}
            <div class="pp-card-header">
                <h3 class="pp-card-title">${this.escapeHtml(paper.file_name)}</h3>
                <span class="pp-card-subject">${this.escapeHtml(paper.subject)}</span>
            </div>
            <div class="pp-card-meta" role="list">
                <div class="pp-card-meta-item" role="listitem">
                    <i class="fas fa-calendar" aria-hidden="true"></i>
                    <span>${year}</span>
                </div>
                ${courseCode ? `
                    <div class="pp-card-meta-item" role="listitem">
                        <i class="fas fa-hashtag" aria-hidden="true"></i>
                        <span>${this.escapeHtml(courseCode)}</span>
                    </div>
                ` : ''}
                ${semester ? `
                    <div class="pp-card-meta-item" role="listitem">
                        <i class="fas fa-layer-group" aria-hidden="true"></i>
                        <span>${this.escapeHtml(`Semester ${semester}`)}</span>
                    </div>
                ` : ''}
                ${paperType ? `
                    <div class="pp-card-meta-item" role="listitem">
                        <i class="fas fa-certificate" aria-hidden="true"></i>
                        <span>${this.escapeHtml(paperType)}</span>
                    </div>
                ` : ''}
                ${paper.file_size ? `
                    <div class="pp-card-meta-item" role="listitem">
                        <i class="fas fa-file" aria-hidden="true"></i>
                        <span>${fileSize}</span>
                    </div>
                ` : ''}
                ${popularity ? `
                    <div class="pp-card-meta-item" role="listitem">
                        <i class="fas fa-chart-line" aria-hidden="true"></i>
                        <span>${this.escapeHtml(popularity)}</span>
                    </div>
                ` : ''}
            </div>
            <div class="pp-card-actions" role="group" aria-label="Paper actions">
                <button 
                    class="pp-card-action" 
                    data-action="preview"
                    aria-label="Preview ${this.escapeHtml(paper.file_name)}"
                    type="button">
                    <i class="fas fa-eye" aria-hidden="true"></i>
                    <span>Preview</span>
                </button>
                <button 
                    class="pp-card-action favorite ${isFavorited ? 'active' : ''}" 
                    data-action="favorite"
                    aria-label="${isFavorited ? 'Remove from' : 'Add to'} favorites"
                    aria-pressed="${isFavorited}"
                    type="button">
                    <i class="fas fa-heart" aria-hidden="true"></i>
                    <span class="pp-sr-only">${isFavorited ? 'Remove from' : 'Add to'} favorites</span>
                </button>
                <button 
                    class="pp-card-action" 
                    data-action="share"
                    aria-label="Share ${this.escapeHtml(paper.file_name)}"
                    type="button">
                    <i class="fas fa-share" aria-hidden="true"></i>
                    <span class="pp-sr-only">Share</span>
                </button>
            </div>
        `;
    }

    attachEventListeners(card, paper) {
        // Card click (opens preview)
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking on action buttons
            if (e.target.closest('.pp-card-action')) {
                return;
            }
            this.handlePreview(paper);
        });

        // Keyboard navigation
        card.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Enter':
                    e.preventDefault();
                    this.handlePreview(paper);
                    break;
                case ' ':
                    e.preventDefault();
                    this.handleFavorite(paper);
                    break;
                case 'Escape':
                    card.blur();
                    break;
            }
        });

        // Action buttons
        const previewBtn = card.querySelector('[data-action="preview"]');
        const favoriteBtn = card.querySelector('[data-action="favorite"]');
        const shareBtn = card.querySelector('[data-action="share"]');

        if (previewBtn) {
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handlePreview(paper);
            });
        }

        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleFavorite(paper);
            });
        }

        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleShare(paper);
            });
        }

        // Focus management
        card.addEventListener('focus', () => {
            card.classList.add('focused');
        });

        card.addEventListener('blur', () => {
            card.classList.remove('focused');
        });
    }

    lazyLoadThumbnail(card, paper) {
        const thumbnail = card.querySelector('.pp-card-thumbnail');
        if (!thumbnail || !thumbnail.src) return;

        // Use Intersection Observer for lazy loading
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.tagName === 'IMG') {
                            const imageLoader = new Image();
                            imageLoader.onload = () => {
                                img.classList.add('loaded');
                            };
                            imageLoader.onerror = () => {
                                img.style.display = 'none';
                            };
                            imageLoader.src = img.src;
                        }
                        observer.unobserve(img);
                    }
                });
            },
            {
                rootMargin: '50px',
            }
        );

        observer.observe(thumbnail);
    }

    handlePreview(paper) {
        if (this.options.onPreview) {
            this.options.onPreview(paper);
        }
    }

    handleFavorite(paper) {
        if (this.options.onFavorite) {
            this.options.onFavorite(paper);
        }
    }

    handleShare(paper) {
        if (this.options.onShare) {
            this.options.onShare(paper);
        }
    }

    updateFavoriteState(paperId, isFavorited) {
        const card = document.querySelector(`[data-paper-id="${paperId}"]`);
        if (!card) return;

        const favoriteBtn = card.querySelector('[data-action="favorite"]');
        if (!favoriteBtn) return;

        if (isFavorited) {
            favoriteBtn.classList.add('active');
            favoriteBtn.setAttribute('aria-pressed', 'true');
            favoriteBtn.setAttribute('aria-label', `Remove ${card.getAttribute('aria-label')} from favorites`);
        } else {
            favoriteBtn.classList.remove('active');
            favoriteBtn.setAttribute('aria-pressed', 'false');
            favoriteBtn.setAttribute('aria-label', `Add ${card.getAttribute('aria-label')} to favorites`);
        }
    }

    formatFileSize(bytes) {
        if (!bytes) return 'Unknown size';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getCourseCode(paper) {
        const candidates = [
            paper.course_code,
            paper.courseCode,
            paper.paper_code,
            paper.paperCode,
        ].filter(Boolean);
        if (candidates.length === 0) return '';
        const value = candidates[0].toString().toUpperCase();
        const match = /^([A-Z]+)(\d{2,3})$/.exec(value.replace(/[^A-Z0-9]/g, ''));
        if (match) {
            return `${match[1]}-${match[2]}`;
        }
        return value;
    }

    getPaperType(paper) {
        const candidates = [
            paper.paper_type,
            paper.paperType,
            paper.exam_type,
            paper.examType,
            paper.type,
        ].filter(Boolean);
        if (candidates.length === 0) return '';
        const map = {
            midterm: 'Midterm',
            'mid-term': 'Midterm',
            final: 'Final',
            finals: 'Final',
            quiz: 'Quiz',
            quizzes: 'Quiz',
            assignment: 'Assignment',
            assignments: 'Assignment',
            assgn: 'Assignment',
        };
        const normalized = candidates[0].toString().trim().toLowerCase();
        return map[normalized] || candidates[0];
    }

    getSemester(paper) {
        const value = paper.semester ?? paper.sem ?? null;
        const num = parseInt(value, 10);
        if (Number.isNaN(num) || num < 1) return '';
        return num;
    }

    getPopularity(paper) {
        const value =
            paper.popularity ??
            paper.downloads ??
            paper.view_count ??
            paper.download_count ??
            null;
        if (value === null || value === undefined) return '';
        const numeric = Number(value);
        if (Number.isNaN(numeric) || numeric <= 0) return '';
        return `${numeric.toLocaleString()} views`;
    }

    destroy() {
        // Cleanup
        this.cards.clear();
    }
}

// Export for use in other scripts
window.PaperCard = PaperCard;

