// PDF Viewer Component
// Secure PDF viewer with PDF.js integration, security features, zoom, navigation, and mobile gestures

class PDFViewer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            onClose: options.onClose || null,
            ...options,
        };
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.5;
        this.isNightMode = false;
        this.isThumbnailsOpen = true;
        this.searchQuery = '';
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.pinchStartDistance = 0;
        this.speechSynthesis = null;

        this.init();
    }

    async init() {
        // Check if PDF.js is loaded
        if (typeof pdfjsLib === 'undefined') {
            console.error('PDF.js library not loaded');
            return;
        }

        // Set PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        // Initialize speech synthesis
        if ('speechSynthesis' in window) {
            this.speechSynthesis = window.speechSynthesis;
        }

        // Build viewer HTML
        this.buildViewerHTML();

        // Attach event listeners
        this.attachEventListeners();

        // Security: Disable right-click and keyboard shortcuts
        this.setupSecurity();

        console.log('PDF Viewer initialized');
    }

    buildViewerHTML() {
        this.container.innerHTML = `
            <div class="pp-pdf-toolbar">
                <div class="pp-pdf-toolbar-group">
                    <button class="pp-pdf-toolbar-button" id="pdfCloseBtn" aria-label="Close PDF viewer" title="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="pp-pdf-toolbar-group">
                    <button class="pp-pdf-toolbar-button" id="pdfPrevBtn" aria-label="Previous page" title="Previous page">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <input 
                        type="number" 
                        id="pdfPageInput" 
                        class="pp-range-input" 
                        min="1" 
                        value="1"
                        aria-label="Current page">
                    <span class="pp-text-tertiary" id="pdfPageCount">/ 0</span>
                    <button class="pp-pdf-toolbar-button" id="pdfNextBtn" aria-label="Next page" title="Next page">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div class="pp-pdf-toolbar-group">
                    <button class="pp-pdf-toolbar-button" id="pdfZoomOutBtn" aria-label="Zoom out" title="Zoom out">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <select id="pdfZoomSelect" class="pp-range-input" aria-label="Zoom level">
                        <option value="0.25">25%</option>
                        <option value="0.5">50%</option>
                        <option value="0.75">75%</option>
                        <option value="1">100%</option>
                        <option value="1.25">125%</option>
                        <option value="1.5" selected>150%</option>
                        <option value="2">200%</option>
                        <option value="3">300%</option>
                        <option value="4">400%</option>
                        <option value="fit-width">Fit Width</option>
                        <option value="fit-page">Fit Page</option>
                    </select>
                    <button class="pp-pdf-toolbar-button" id="pdfZoomInBtn" aria-label="Zoom in" title="Zoom in">
                        <i class="fas fa-search-plus"></i>
                    </button>
                </div>
                <div class="pp-pdf-toolbar-group">
                    <button class="pp-pdf-toolbar-button" id="pdfThumbnailsBtn" aria-label="Toggle thumbnails" title="Toggle thumbnails">
                        <i class="fas fa-th"></i>
                    </button>
                    <button class="pp-pdf-toolbar-button" id="pdfNightModeBtn" aria-label="Toggle night mode" title="Toggle night mode">
                        <i class="fas fa-moon"></i>
                    </button>
                    <button class="pp-pdf-toolbar-button" id="pdfSearchBtn" aria-label="Search in PDF" title="Search">
                        <i class="fas fa-search"></i>
                    </button>
                    <button class="pp-pdf-toolbar-button" id="pdfTTSBtn" aria-label="Text to speech" title="Text to speech">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            </div>
            <div class="pp-pdf-search hidden" id="pdfSearchContainer">
                <input 
                    type="text" 
                    id="pdfSearchInput" 
                    class="pp-pdf-search-input" 
                    placeholder="Search in PDF..."
                    aria-label="Search in PDF">
                <div id="pdfSearchResults" class="pp-text-tertiary"></div>
            </div>
            <div style="display: flex; flex: 1; overflow: hidden;">
                <div class="pp-pdf-thumbnails" id="pdfThumbnails">
                    <!-- Thumbnails will be populated here -->
                </div>
                <div class="pp-pdf-container" id="pdfContainer">
                    <canvas id="pdfCanvas" class="pp-pdf-canvas"></canvas>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Close button
        const closeBtn = this.container.querySelector('#pdfCloseBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Navigation buttons
        const prevBtn = this.container.querySelector('#pdfPrevBtn');
        const nextBtn = this.container.querySelector('#pdfNextBtn');
        const pageInput = this.container.querySelector('#pdfPageInput');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.goToPreviousPage());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goToNextPage());
        }

        if (pageInput) {
            pageInput.addEventListener('change', (e) => {
                const page = parseInt(e.target.value, 10);
                if (page >= 1 && page <= this.totalPages) {
                    this.goToPage(page);
                }
            });
        }

        // Zoom controls
        const zoomInBtn = this.container.querySelector('#pdfZoomInBtn');
        const zoomOutBtn = this.container.querySelector('#pdfZoomOutBtn');
        const zoomSelect = this.container.querySelector('#pdfZoomSelect');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }

        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }

        if (zoomSelect) {
            zoomSelect.addEventListener('change', (e) => {
                const value = e.target.value;
                if (value === 'fit-width' || value === 'fit-page') {
                    this.fitToView(value);
                } else {
                    this.setZoom(parseFloat(value));
                }
            });
        }

        // Thumbnails toggle
        const thumbnailsBtn = this.container.querySelector('#pdfThumbnailsBtn');
        if (thumbnailsBtn) {
            thumbnailsBtn.addEventListener('click', () => this.toggleThumbnails());
        }

        // Night mode toggle
        const nightModeBtn = this.container.querySelector('#pdfNightModeBtn');
        if (nightModeBtn) {
            nightModeBtn.addEventListener('click', () => this.toggleNightMode());
        }

        // Search
        const searchBtn = this.container.querySelector('#pdfSearchBtn');
        const searchInput = this.container.querySelector('#pdfSearchInput');
        const searchContainer = this.container.querySelector('#pdfSearchContainer');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                searchContainer.classList.toggle('hidden');
                if (!searchContainer.classList.contains('hidden')) {
                    searchInput.focus();
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchInPDF(e.target.value);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.goToNextSearchResult();
                } else if (e.key === 'Escape') {
                    searchContainer.classList.add('hidden');
                }
            });
        }

        // Text to speech
        const ttsBtn = this.container.querySelector('#pdfTTSBtn');
        if (ttsBtn) {
            ttsBtn.addEventListener('click', () => this.toggleTextToSpeech());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.container.classList.contains('hidden')) return;

            // Prevent default shortcuts
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P')) {
                e.preventDefault();
                return;
            }

            // Navigation
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.goToPreviousPage();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.goToNextPage();
            } else if (e.key === 'Home') {
                e.preventDefault();
                this.goToPage(1);
            } else if (e.key === 'End') {
                e.preventDefault();
                this.goToPage(this.totalPages);
            }

            // Zoom
            if ((e.ctrlKey || e.metaKey) && e.key === '=') {
                e.preventDefault();
                this.zoomIn();
            } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault();
                this.zoomOut();
            } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault();
                this.setZoom(1);
            }
        });

        // Touch gestures
        const canvas = this.container.querySelector('#pdfCanvas');
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
            canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
        }
    }

    setupSecurity() {
        // Disable right-click
        this.container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        // Disable keyboard shortcuts
        this.container.addEventListener('keydown', (e) => {
            // Disable Ctrl+S (Save)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                return false;
            }

            // Disable Ctrl+P (Print)
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                return false;
            }

            // Disable PrintScreen (F12)
            if (e.key === 'F12') {
                e.preventDefault();
                return false;
            }
        });

        // Disable text selection (optional, can be removed if needed)
        this.container.addEventListener('selectstart', (e) => {
            // Allow selection for search functionality
            if (e.target.closest('#pdfSearchInput')) {
                return;
            }
            e.preventDefault();
        });
    }

    async open(paper) {
        if (!paper || !paper.file_url) {
            console.error('Invalid paper data');
            return;
        }

        this.container.classList.remove('hidden');
        this.currentPage = 1;
        this.scale = 1.5;

        try {
            // Validate URL
            const url = typeof paper.file_url === 'string' ? paper.file_url.trim() : '';
            if (!url) {
                throw new Error('Missing PDF URL');
            }

            // Mixed-content guard (http PDF on https site)
            if (window.location.protocol === 'https:' && url.startsWith('http:')) {
                throw new Error('Blocked mixed content (http PDF on https page)');
            }

            // Primary attempt: let PDF.js stream the URL directly
            let loadingTask = null;
            try {
                loadingTask = pdfjsLib.getDocument({
                    url,
                    withCredentials: false,
                });
                this.pdfDoc = await loadingTask.promise;
            } catch (directErr) {
                // Fallback: fetch the PDF (helps when some CDNs require specific headers)
                console.warn('Direct PDF load failed, trying fetch fallback:', directErr);

                const response = await fetch(url, { mode: 'cors' });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} while fetching PDF`);
                }

                const arrayBuffer = await response.arrayBuffer();
                loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                this.pdfDoc = await loadingTask.promise;
            }

            this.totalPages = this.pdfDoc.numPages;

            // Update UI
            this.updatePageCount();
            this.updateNavigationButtons();

            // Render first page
            await this.renderPage(this.currentPage);

            // Load thumbnails
            await this.loadThumbnails();

            // Focus container for keyboard navigation
            this.container.focus();
        } catch (error) {
            console.error('Failed to load PDF:', error);

            // Provide clearer feedback for common cases
            let message = 'Failed to load PDF. Please try again.';
            const msg = (error && error.message ? error.message : '').toLowerCase();

            if (msg.includes('missing pdf url') || msg.includes('missing') || msg.includes('invalid')) {
                message = 'PDF link is missing or invalid for this item.';
            } else if (msg.includes('mixed content')) {
                message = 'Blocked insecure PDF (http) on a secure page (https). Use an https link.';
            } else if (msg.includes('http 404')) {
                message = 'PDF not found (404). It may have been moved or deleted.';
            } else if (msg.includes('http 403')) {
                message = 'Access to this PDF is forbidden (403).';
            } else if (msg.includes('http 401')) {
                message = 'You are not authorized to access this PDF (401).';
            } else if (msg.includes('network') || msg.includes('failed to fetch')) {
                message = 'Network error while fetching the PDF. Check your internet connection.';
            }

            alert(message);
            this.close();
        }
    }

    close() {
        this.container.classList.add('hidden');
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.searchQuery = '';
        this.searchResults = [];
        this.currentSearchIndex = -1;

        // Stop text to speech if active
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }

        if (this.options.onClose) {
            this.options.onClose();
        }
    }

    async renderPage(pageNum) {
        if (!this.pdfDoc || pageNum < 1 || pageNum > this.totalPages) return;

        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const canvas = this.container.querySelector('#pdfCanvas');
            const context = canvas.getContext('2d');

            // Calculate scale based on zoom level
            let viewport = page.getViewport({ scale: this.scale });

            // Adjust for fit-width or fit-page
            if (this.scale === 'fit-width') {
                const containerWidth = canvas.parentElement.clientWidth;
                viewport = page.getViewport({ scale: containerWidth / page.view[2] });
            } else if (this.scale === 'fit-page') {
                const containerWidth = canvas.parentElement.clientWidth;
                const containerHeight = canvas.parentElement.clientHeight;
                const scaleX = containerWidth / page.view[2];
                const scaleY = containerHeight / page.view[3];
                viewport = page.getViewport({ scale: Math.min(scaleX, scaleY) });
            }

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };

            // Apply night mode
            if (this.isNightMode) {
                context.fillStyle = '#000';
                context.fillRect(0, 0, canvas.width, canvas.height);
                context.globalCompositeOperation = 'difference';
            }

            await page.render(renderContext).promise;

            // Reset composite operation
            if (this.isNightMode) {
                context.globalCompositeOperation = 'source-over';
            }

            this.currentPage = pageNum;
            this.updatePageInput();
            this.updateNavigationButtons();
            this.updateThumbnailSelection();
        } catch (error) {
            console.error('Failed to render page:', error);
        }
    }

    async loadThumbnails() {
        const thumbnailsContainer = this.container.querySelector('#pdfThumbnails');
        if (!thumbnailsContainer) return;

        thumbnailsContainer.innerHTML = '';

        for (let i = 1; i <= this.totalPages; i++) {
            try {
                const page = await this.pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 0.2 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                }).promise;

                const thumbnail = document.createElement('div');
                thumbnail.className = 'pp-pdf-thumbnail';
                thumbnail.setAttribute('data-page', i);
                thumbnail.appendChild(canvas);

                thumbnail.addEventListener('click', () => {
                    this.goToPage(i);
                });

                thumbnailsContainer.appendChild(thumbnail);
            } catch (error) {
                console.error(`Failed to load thumbnail for page ${i}:`, error);
            }
        }
    }

    goToPage(pageNum) {
        if (pageNum >= 1 && pageNum <= this.totalPages) {
            this.renderPage(pageNum);
        }
    }

    goToPreviousPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    goToNextPage() {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    zoomIn() {
        if (typeof this.scale === 'number') {
            this.setZoom(Math.min(this.scale + 0.25, 4));
        }
    }

    zoomOut() {
        if (typeof this.scale === 'number') {
            this.setZoom(Math.max(this.scale - 0.25, 0.25));
        }
    }

    setZoom(scale) {
        this.scale = scale;
        const zoomSelect = this.container.querySelector('#pdfZoomSelect');
        if (zoomSelect) {
            zoomSelect.value = scale.toString();
        }
        this.renderPage(this.currentPage);
    }

    fitToView(mode) {
        this.scale = mode;
        const zoomSelect = this.container.querySelector('#pdfZoomSelect');
        if (zoomSelect) {
            zoomSelect.value = mode;
        }
        this.renderPage(this.currentPage);
    }

    toggleThumbnails() {
        this.isThumbnailsOpen = !this.isThumbnailsOpen;
        const thumbnails = this.container.querySelector('#pdfThumbnails');
        if (thumbnails) {
            thumbnails.classList.toggle('collapsed', !this.isThumbnailsOpen);
        }
    }

    toggleNightMode() {
        this.isNightMode = !this.isNightMode;
        const container = this.container.querySelector('#pdfContainer');
        if (container) {
            container.style.filter = this.isNightMode ? 'invert(1) hue-rotate(180deg)' : 'none';
        }
        this.renderPage(this.currentPage);
    }

    async searchInPDF(query) {
        if (!this.pdfDoc || !query.trim()) {
            this.searchResults = [];
            this.currentSearchIndex = -1;
            this.updateSearchResults();
            return;
        }

        this.searchQuery = query;
        this.searchResults = [];
        this.currentSearchIndex = -1;

        try {
            for (let i = 1; i <= this.totalPages; i++) {
                const page = await this.pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const text = textContent.items.map(item => item.str).join(' ');

                if (text.toLowerCase().includes(query.toLowerCase())) {
                    this.searchResults.push({
                        page: i,
                        text: text,
                    });
                }
            }

            this.updateSearchResults();
        } catch (error) {
            console.error('Failed to search PDF:', error);
        }
    }

    updateSearchResults() {
        const resultsContainer = this.container.querySelector('#pdfSearchResults');
        if (!resultsContainer) return;

        if (this.searchResults.length === 0) {
            resultsContainer.textContent = 'No results found';
            return;
        }

        resultsContainer.textContent = `Found ${this.searchResults.length} result(s)`;
    }

    goToNextSearchResult() {
        if (this.searchResults.length === 0) return;

        this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
        const result = this.searchResults[this.currentSearchIndex];
        this.goToPage(result.page);
    }

    toggleTextToSpeech() {
        if (!this.speechSynthesis) {
            alert('Text to speech is not supported in your browser');
            return;
        }

        if (this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        } else {
            // Extract text from current page and read it
            this.speakCurrentPage();
        }
    }

    async speakCurrentPage() {
        if (!this.pdfDoc || !this.speechSynthesis) return;

        try {
            const page = await this.pdfDoc.getPage(this.currentPage);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 1;

            this.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Failed to read page:', error);
        }
    }

    handleTouchStart(e) {
        if (e.touches.length === 1) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            this.pinchStartDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    }

    handleTouchMove(e) {
        if (e.touches.length === 1 && this.touchStartX !== 0) {
            // Swipe detection
            const deltaX = e.touches[0].clientX - this.touchStartX;
            const deltaY = e.touches[0].clientY - this.touchStartY;

            // Horizontal swipe for page navigation
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
                e.preventDefault();
                if (deltaX > 0) {
                    this.goToPreviousPage();
                } else {
                    this.goToNextPage();
                }
                this.touchStartX = 0;
            }
        } else if (e.touches.length === 2 && this.pinchStartDistance > 0) {
            // Pinch to zoom
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            const scaleChange = currentDistance / this.pinchStartDistance;
            if (typeof this.scale === 'number') {
                this.setZoom(Math.max(0.25, Math.min(4, this.scale * scaleChange)));
            }
        }
    }

    handleTouchEnd(e) {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.pinchStartDistance = 0;
    }

    updatePageCount() {
        const pageCount = this.container.querySelector('#pdfPageCount');
        if (pageCount) {
            pageCount.textContent = `/ ${this.totalPages}`;
        }
    }

    updatePageInput() {
        const pageInput = this.container.querySelector('#pdfPageInput');
        if (pageInput) {
            pageInput.value = this.currentPage;
            pageInput.max = this.totalPages;
        }
    }

    updateNavigationButtons() {
        const prevBtn = this.container.querySelector('#pdfPrevBtn');
        const nextBtn = this.container.querySelector('#pdfNextBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= this.totalPages;
        }
    }

    updateThumbnailSelection() {
        const thumbnails = this.container.querySelectorAll('.pp-pdf-thumbnail');
        thumbnails.forEach((thumb, index) => {
            if (index + 1 === this.currentPage) {
                thumb.classList.add('active');
            } else {
                thumb.classList.remove('active');
            }
        });
    }
}

// Export for use in other scripts
window.PDFViewer = PDFViewer;

