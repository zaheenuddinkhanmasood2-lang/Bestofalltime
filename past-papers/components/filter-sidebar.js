// Filter Sidebar Component
// Streamlined filters tailored for Gomal University past papers

class FilterSidebar {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            onFilterChange: options.onFilterChange || null,
            ...options,
        };
        this.filters = {
            subjects: [],
            courseCodes: [],
            semesters: [],
            paperTypes: [],
        };
        this.availableSubjects = [];
        this.paperTypes = ['Midterm', 'Final', 'Assignment', 'Quiz'];
        this.semesters = [1, 2, 3, 4, 5, 6, 7, 8];
        this.init();
    }

    async init() {
        this.buildSidebarHTML();
        this.attachEventListeners();
        await this.loadAvailableSubjects();
        this.populateSubjectOptions();
        this.renderCourseCodeTokens();
        this.renderSemesterChips();
        this.renderPaperTypeChips();
        console.log('Filter Sidebar initialized');
    }

    buildSidebarHTML() {
        this.container.innerHTML = `
            <div class="pp-filter-section">
                <h2 class="pp-filter-title">
                    <i class="fas fa-filter"></i>
                    Filter Papers
                </h2>
            </div>

            <!-- Subject Filter -->
            <div class="pp-filter-section">
                <h3 class="pp-filter-heading">Subject</h3>
                <div class="pp-multiselect" id="subjectMultiselect">
                    <button class="pp-multiselect-trigger" id="subjectTrigger" aria-haspopup="true" aria-expanded="false">
                        <span id="subjectTriggerText">All subjects</span>
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <div class="pp-multiselect-dropdown" id="subjectDropdown" role="listbox">
                        <div class="pp-multiselect-search">
                            <input type="text" id="subjectSearch" placeholder="Search subjects..." aria-label="Search subjects">
                        </div>
                        <div id="subjectOptions" role="group"></div>
                    </div>
                </div>
            </div>

            <!-- Course Code Filter -->
            <div class="pp-filter-section">
                <h3 class="pp-filter-heading">Course Code</h3>
                <div class="pp-token-input" id="courseCodeInputContainer">
                    <input 
                        type="text" 
                        id="courseCodeInput" 
                        class="pp-token-input-field"
                        placeholder="e.g. CS-101"
                        aria-label="Add course code">
                    <button class="pp-token-add" id="addCourseCodeBtn" type="button">
                        <i class="fas fa-plus"></i>
                        <span>Add</span>
                    </button>
                </div>
                <div class="pp-token-list" id="courseCodeTokens" aria-live="polite"></div>
            </div>

            <!-- Semester Filter -->
            <div class="pp-filter-section">
                <h3 class="pp-filter-heading">Semester</h3>
                <div class="pp-chip-group" id="semesterChips" role="group" aria-label="Semester filters"></div>
            </div>

            <!-- Paper Type Filter -->
            <div class="pp-filter-section">
                <h3 class="pp-filter-heading">Paper Type</h3>
                <div class="pp-chip-group" id="paperTypeChips" role="group" aria-label="Paper type filters"></div>
            </div>

            <!-- Filter Count -->
            <div class="pp-filter-count" id="filterCount">
                0 papers found
            </div>

            <!-- Clear Filters Button -->
            <button class="pp-clear-filters" id="clearFiltersBtn" aria-label="Clear all filters">
                <i class="fas fa-times"></i>
                Clear All Filters
            </button>
        `;
    }

    attachEventListeners() {
        const subjectTrigger = this.container.querySelector('#subjectTrigger');
        const subjectDropdown = this.container.querySelector('#subjectDropdown');
        const subjectSearch = this.container.querySelector('#subjectSearch');

        if (subjectTrigger) {
            subjectTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSubjectDropdown();
            });
        }

        if (subjectSearch) {
            subjectSearch.addEventListener('input', (e) => {
                this.filterSubjectOptions(e.target.value);
            });
        }

        document.addEventListener('click', (e) => {
            if (
                subjectDropdown &&
                subjectTrigger &&
                !subjectDropdown.contains(e.target) &&
                !subjectTrigger.contains(e.target)
            ) {
                this.closeSubjectDropdown();
            }
        });

        const courseCodeInput = this.container.querySelector('#courseCodeInput');
        const addCourseCodeBtn = this.container.querySelector('#addCourseCodeBtn');

        if (courseCodeInput) {
            courseCodeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addCourseCode(courseCodeInput.value);
                }
            });
        }

        if (addCourseCodeBtn) {
            addCourseCodeBtn.addEventListener('click', () => {
                this.addCourseCode(courseCodeInput.value);
            });
        }

        const clearFiltersBtn = this.container.querySelector('#clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    renderSemesterChips() {
        const container = this.container.querySelector('#semesterChips');
        if (!container) return;
        container.innerHTML = '';

        this.semesters.forEach((value) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `pp-chip ${this.filters.semesters.includes(value) ? 'active' : ''}`;
            button.textContent = `Sem ${value}`;
            button.setAttribute('data-semester', value);
            button.addEventListener('click', () => {
                this.toggleSemester(value);
            });
            container.appendChild(button);
        });
    }

    renderPaperTypeChips() {
        const container = this.container.querySelector('#paperTypeChips');
        if (!container) return;
        container.innerHTML = '';

        this.paperTypes.forEach((type) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `pp-chip ${this.filters.paperTypes.includes(type) ? 'active' : ''}`;
            button.textContent = type;
            button.setAttribute('data-paper-type', type);
            button.addEventListener('click', () => {
                this.togglePaperType(type);
            });
            container.appendChild(button);
        });
    }

    renderCourseCodeTokens() {
        const container = this.container.querySelector('#courseCodeTokens');
        if (!container) return;
        container.innerHTML = '';

        if (this.filters.courseCodes.length === 0) {
            container.innerHTML = `<span class="pp-token-placeholder">Add course codes to narrow results</span>`;
            return;
        }

        this.filters.courseCodes.forEach((code) => {
            const token = document.createElement('span');
            token.className = 'pp-token';
            token.textContent = this.formatCourseCode(code);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'pp-token-remove';
            removeBtn.setAttribute('aria-label', `Remove course code ${code}`);
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.addEventListener('click', () => this.removeCourseCode(code));

            token.appendChild(removeBtn);
            container.appendChild(token);
        });
    }

    toggleSemester(value) {
        if (this.filters.semesters.includes(value)) {
            this.filters.semesters = this.filters.semesters.filter((sem) => sem !== value);
        } else {
            this.filters.semesters = [...this.filters.semesters, value];
        }
        this.renderSemesterChips();
        this.notifyFilterChange();
    }

    togglePaperType(type) {
        if (this.filters.paperTypes.includes(type)) {
            this.filters.paperTypes = this.filters.paperTypes.filter((item) => item !== type);
        } else {
            this.filters.paperTypes = [...this.filters.paperTypes, type];
        }
        this.renderPaperTypeChips();
        this.notifyFilterChange();
    }

    addCourseCode(rawValue = '') {
        const normalized = this.normalizeCourseCode(rawValue);
        if (!normalized) return;
        if (!this.filters.courseCodes.includes(normalized)) {
            this.filters.courseCodes = [...this.filters.courseCodes, normalized];
            this.renderCourseCodeTokens();
            this.notifyFilterChange();
        }
        const courseCodeInput = this.container.querySelector('#courseCodeInput');
        if (courseCodeInput) {
            courseCodeInput.value = '';
        }
    }

    removeCourseCode(code) {
        this.filters.courseCodes = this.filters.courseCodes.filter((value) => value !== code);
        this.renderCourseCodeTokens();
        this.notifyFilterChange();
    }

    async loadAvailableSubjects() {
        try {
            if (typeof window.getSupabaseClient === 'function') {
                const supabase = window.getSupabaseClient();
                const { data, error } = await supabase
                    .from('past_papers')
                    .select('subject')
                    .eq('is_active', true);

                if (error) throw error;

                const subjects = [...new Set((data || []).map((item) => item.subject).filter(Boolean))].sort();
                this.availableSubjects = subjects;
            }
        } catch (error) {
            console.error('Failed to load available subjects:', error);
            this.availableSubjects = [];
        } finally {
            if (this.availableSubjects.length === 0) {
                this.availableSubjects = [
                    'Computer Science',
                    'Software Engineering',
                    'Mathematics',
                    'Physics',
                    'Statistics',
                    'English',
                ];
            }
        }
    }

    populateSubjectOptions() {
        const subjectOptions = this.container.querySelector('#subjectOptions');
        if (!subjectOptions) return;

        subjectOptions.innerHTML = this.availableSubjects
            .map(
                (subject) => `
                <div class="pp-multiselect-option" role="option" data-subject="${subject}">
                    <input 
                        type="checkbox" 
                        id="subject-${subject}" 
                        value="${subject}"
                        ${this.filters.subjects.includes(subject) ? 'checked' : ''}>
                    <label for="subject-${subject}">${this.escapeHtml(subject)}</label>
                </div>
            `
            )
            .join('');

        const checkboxes = subjectOptions.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                this.updateSubjectFilter();
            });
        });
    }

    toggleSubjectDropdown() {
        const dropdown = this.container.querySelector('#subjectDropdown');
        const trigger = this.container.querySelector('#subjectTrigger');

        if (dropdown && trigger) {
            const isOpen = dropdown.classList.contains('open');
            dropdown.classList.toggle('open', !isOpen);
            trigger.setAttribute('aria-expanded', (!isOpen).toString());
        }
    }

    closeSubjectDropdown() {
        const dropdown = this.container.querySelector('#subjectDropdown');
        const trigger = this.container.querySelector('#subjectTrigger');

        if (dropdown && trigger) {
            dropdown.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }
    }

    filterSubjectOptions(query) {
        const options = this.container.querySelectorAll('.pp-multiselect-option');
        const queryLower = (query || '').toLowerCase();

        options.forEach((option) => {
            const subject = option.getAttribute('data-subject');
            option.style.display = subject.toLowerCase().includes(queryLower) ? 'flex' : 'none';
        });
    }

    updateSubjectFilter() {
        const checkboxes = this.container.querySelectorAll('#subjectOptions input[type="checkbox"]:checked');
        this.filters.subjects = Array.from(checkboxes).map((cb) => cb.value);

        const triggerText = this.container.querySelector('#subjectTriggerText');
        if (triggerText) {
            if (this.filters.subjects.length === 0) {
                triggerText.textContent = 'All subjects';
            } else if (this.filters.subjects.length === 1) {
                triggerText.textContent = this.filters.subjects[0];
            } else {
                triggerText.textContent = `${this.filters.subjects.length} subjects`;
            }
        }

        this.notifyFilterChange();
    }

    clearAllFilters() {
        this.filters = {
            subjects: [],
            courseCodes: [],
            semesters: [],
            paperTypes: [],
        };

        const subjectCheckboxes = this.container.querySelectorAll('#subjectOptions input[type="checkbox"]');
        subjectCheckboxes.forEach((checkbox) => {
            checkbox.checked = false;
        });

        const triggerText = this.container.querySelector('#subjectTriggerText');
        if (triggerText) {
            triggerText.textContent = 'All subjects';
        }

        this.renderCourseCodeTokens();
        this.renderSemesterChips();
        this.renderPaperTypeChips();
        this.notifyFilterChange();
    }

    updateFilters(filters) {
        this.filters = {
            ...this.filters,
            ...filters,
        };
        this.syncUI();
    }

    syncUI() {
        const subjectCheckboxes = this.container.querySelectorAll('#subjectOptions input[type="checkbox"]');
        subjectCheckboxes.forEach((checkbox) => {
            checkbox.checked = this.filters.subjects.includes(checkbox.value);
        });

        const triggerText = this.container.querySelector('#subjectTriggerText');
        if (triggerText) {
            if (this.filters.subjects.length === 0) {
                triggerText.textContent = 'All subjects';
            } else if (this.filters.subjects.length === 1) {
                triggerText.textContent = this.filters.subjects[0];
            } else {
                triggerText.textContent = `${this.filters.subjects.length} subjects`;
            }
        }

        this.renderCourseCodeTokens();
        this.renderSemesterChips();
        this.renderPaperTypeChips();
    }

    updateCount(count) {
        const filterCount = this.container.querySelector('#filterCount');
        if (filterCount) {
            filterCount.textContent = `${count} paper${count !== 1 ? 's' : ''} found`;
        }
    }

    notifyFilterChange() {
        if (typeof this.options.onFilterChange === 'function') {
            this.options.onFilterChange({
                subjects: this.filters.subjects,
                courseCodes: this.filters.courseCodes,
                semesters: this.filters.semesters,
                paperTypes: this.filters.paperTypes,
            });
        }
    }

    normalizeCourseCode(value) {
        if (!value) return '';
        return value.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatCourseCode(code) {
        if (!code) return '';
        const match = /^([A-Z]+)(\d{2,3})$/.exec(code);
        if (match) {
            return `${match[1]}-${match[2]}`;
        }
        return code;
    }

    destroy() {
        // Cleanup hooks if needed
    }
}

window.FilterSidebar = FilterSidebar;

