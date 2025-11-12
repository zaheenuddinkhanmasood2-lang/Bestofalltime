// Past Papers Main Application
// Handles data fetching, state management, and UI coordination

class PastPapersApp {
    constructor() {
        this.config = {
            api: {
                table: 'past_papers',
                pageSize: 20,
                cacheTTL: 5 * 60 * 1000, // 5 minutes
            },
            pagination: {
                page: 1,
                limit: 20,
            },
            filters: {
                subjects: [],
                courseCodes: [],
                semesters: [],
                paperTypes: [],
            },
            search: {
                query: '',
                debounceDelay: 250,
            },
            ranking: {
                popularityHalfLifeDays: 180,
            },
            favorites: {
                storageKey: 'pp_favorites',
            },
            recentViews: {
                storageKey: 'pp_recent_views',
                maxItems: 10,
            },
            searchHistory: {
                storageKey: 'pp_search_history',
                maxItems: 10,
            },
        };

        this.state = {
            papers: [],
            loading: false,
            hasMore: false,
            currentPage: 1,
            totalCount: 0,
            error: null,
            tookMs: 0,
            lastFetchedAt: null,
            searchContext: this.parseSearchQuery(''),
        };

        this.components = {
            filterSidebar: null,
            mobileFilterSidebar: null,
            paperCard: null,
            pdfViewer: null,
        };

        this.supabase = null;
        this.debounceTimer = null;
        this.intersectionObserver = null;
        this.STOP_WORDS = new Set([
            'and',
            'or',
            'for',
            'the',
            'a',
            'an',
            'in',
            'of',
            'to',
            'by',
            'with',
            'paper',
            'exam',
            'past',
            'latest',
            'quiz',
            'assignment',
            'midterm',
            'final',
        ]);

        this.init();
    }

    async init() {
        try {
            // Initialize Supabase client
            if (typeof window.getSupabaseClient === 'function') {
                this.supabase = window.getSupabaseClient();
            } else {
                throw new Error('Supabase client not available');
            }

            // Initialize components
            await this.initComponents();

            // Load initial data
            await this.loadInitialData();

            // Setup event listeners
            this.setupEventListeners();

            // Setup infinite scroll
            this.setupInfiniteScroll();

            // Setup URL state sync
            this.syncURLState();

            // Load favorites and recent views
            this.loadUserData();

            console.log('Past Papers App initialized');
        } catch (error) {
            console.error('Failed to initialize Past Papers App:', error);
            this.showError('Failed to load past papers. Please refresh the page.');
        }
    }

    async initComponents() {
        // Initialize filter sidebar for desktop
        const desktopSidebar = document.getElementById('filterSidebar');
        const mobileFilters = document.getElementById('mobileFiltersTop');
        
        if (window.FilterSidebar) {
            // Initialize desktop sidebar (hidden on mobile via CSS)
            if (desktopSidebar) {
                this.components.filterSidebar = new window.FilterSidebar(
                    desktopSidebar,
                    {
                        onFilterChange: (filters) => this.handleFilterChange(filters),
                    }
                );
            }

            // Initialize mobile filters at top (shown on mobile via CSS)
            if (mobileFilters) {
                this.components.mobileFilterSidebar = new window.FilterSidebar(
                    mobileFilters,
                    {
                        onFilterChange: (filters) => this.handleFilterChange(filters),
                    }
                );
            }
        }

        // Initialize PDF viewer
        if (window.PDFViewer) {
            this.components.pdfViewer = new window.PDFViewer(
                document.getElementById('pdfViewer'),
                {
                    onClose: () => this.handlePDFViewerClose(),
                }
            );
        }
    }

    async loadInitialData() {
        this.setLoading(true);
        try {
            // Parse URL params for initial filters
            const urlParams = new URLSearchParams(window.location.search);
            const filters = this.parseURLFilters(urlParams);
            this.config.filters = { ...this.config.filters, ...filters };

            // Load papers
            await this.fetchPapers();
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showError('Failed to load past papers. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });

            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.performSearch(e.target.value);
                } else if (e.key === 'Escape') {
                    e.target.value = '';
                    this.config.search.query = '';
                    this.performSearch('');
                }
            });

            searchInput.addEventListener('focus', () => {
                this.showSearchSuggestions();
            });
        }

        // Scroll to top button
        const scrollToTopBtn = document.getElementById('scrollToTopBtn');
        if (scrollToTopBtn) {
            scrollToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Show/hide button on scroll
            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    scrollToTopBtn.style.display = 'flex';
                } else {
                    scrollToTopBtn.style.display = 'none';
                }
            });
        }

        // Filter toggle button (mobile)
        const filterToggleBtn = document.getElementById('filterToggleBtn');
        if (filterToggleBtn) {
            filterToggleBtn.addEventListener('click', () => {
                this.toggleMobileSidebar();
            });
        }

        // Mobile backdrop
        const mobileBackdrop = document.getElementById('mobileBackdrop');
        if (mobileBackdrop) {
            mobileBackdrop.addEventListener('click', () => {
                this.closeMobileSidebar();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (searchInput) {
                    searchInput.focus();
                }
            }
        });
    }

    setupInfiniteScroll() {
        const sentinel = document.getElementById('infiniteScrollSentinel');
        if (!sentinel) return;

        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (
                        entry.isIntersecting &&
                        !this.state.loading &&
                        this.state.hasMore &&
                        this.state.papers.length > 0
                    ) {
                        this.loadMorePapers();
                    }
                });
            },
            {
                rootMargin: '100px',
            }
        );

        this.intersectionObserver.observe(sentinel);
    }

    /**
     * Parse a user query into structured search context.
     * Detects course codes, semester references, paper types, and residual subject tokens.
     * @param {string} query
     * @returns {{
     *   raw: string,
     *   cleaned: string,
     *   courseCodes: string[],
     *   courseCodePrefixes: string[],
     *   semesters: number[],
     *   paperTypes: string[],
     *   subjectTokens: string[],
     *   subjectPhrase: string
     * }}
     */
    parseSearchQuery(query) {
        if (!query) {
            return {
                raw: '',
                cleaned: '',
                courseCodes: [],
                courseCodePrefixes: [],
                semesters: [],
                paperTypes: [],
                subjectTokens: [],
                subjectPhrase: '',
            };
        }

        const text = query.trim();
        const lower = text.toLowerCase();
        const courseCodeRegex = /\b([a-z]{2,5})[\s-]?(\d{2,3})\b/gi;
        const semesters = new Set();
        const courseCodes = new Set();
        const paperTypes = new Set();

        let cleaned = lower;
        let match;
        while ((match = courseCodeRegex.exec(lower)) !== null) {
            const normalized = this.normalizeCourseCode(`${match[1]}${match[2]}`);
            if (normalized) {
                courseCodes.add(normalized);
                cleaned = cleaned.replace(match[0], ' ');
            }
        }

        const semesterRegex = /\b(?:(?:sem(?:ester)?)\s*-?\s*(\d)|(\d)(?:st|nd|rd|th)?\s*(?:sem(?:ester)?))\b/gi;
        while ((match = semesterRegex.exec(lower)) !== null) {
            const value = parseInt(match[1] || match[2], 10);
            if (!Number.isNaN(value) && value >= 1 && value <= 12) {
                semesters.add(value);
                cleaned = cleaned.replace(match[0], ' ');
            }
        }

        const paperTypeMap = {
            mid: 'Midterm',
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

        const paperTypeRegex = /\b(mid[-\s]?term|midterm|mid|finals?|quiz(?:zes)?|assignment(?:s)?|assgn)\b/gi;
        while ((match = paperTypeRegex.exec(lower)) !== null) {
            const normalized = paperTypeMap[match[0].toLowerCase()];
            if (normalized) {
                paperTypes.add(normalized);
                cleaned = cleaned.replace(match[0], ' ');
            }
        }

        const cleanedPhrase = cleaned
            .replace(/[^a-z0-9\s]/gi, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();

        const subjectTokens = cleanedPhrase
            ? cleanedPhrase
                .split(/\s+/)
                .filter((token) => token.length > 1 && !this.STOP_WORDS.has(token))
            : [];

        const subjectPhrase = subjectTokens.join(' ');

        return {
            raw: text,
            cleaned: cleanedPhrase,
            courseCodes: Array.from(courseCodes),
            courseCodePrefixes: Array.from(courseCodes).map((code) => `${code}%`),
            semesters: Array.from(semesters),
            paperTypes: Array.from(paperTypes),
            subjectTokens,
            subjectPhrase,
        };
    }

    normalizeCourseCode(value) {
        if (!value) return '';
        return value.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    normalizePaperType(value) {
        if (!value) return '';
        const map = {
            midterm: 'Midterm',
            'mid-term': 'Midterm',
            mid: 'Midterm',
            final: 'Final',
            finals: 'Final',
            quiz: 'Quiz',
            quizzes: 'Quiz',
            assignment: 'Assignment',
            assignments: 'Assignment',
            assgn: 'Assignment',
        };
        const normalized = value.toString().trim().toLowerCase();
        return map[normalized] || value;
    }

    normalizeSemesterValue(value) {
        if (value === null || value === undefined) return null;
        const num = parseInt(value, 10);
        if (Number.isNaN(num) || num < 1 || num > 12) return null;
        return num;
    }

    buildSearchPayload(customContext) {
        const baseFilters = this.config.filters;
        const context =
            customContext ||
            this.state.searchContext ||
            this.parseSearchQuery(this.config.search.query);

        const combineUnique = (existing = [], inferred = [], transform = (v) => v) => {
            const set = new Set();
            existing.forEach((item) => {
                const normalized = transform(item);
                if (normalized) set.add(normalized);
            });
            inferred.forEach((item) => {
                const normalized = transform(item);
                if (normalized) set.add(normalized);
            });
            return Array.from(set);
        };

        const courseCodes = combineUnique(
            baseFilters.courseCodes,
            context.courseCodes,
            (value) => this.normalizeCourseCode(value)
        );

        const semesters = combineUnique(
            baseFilters.semesters,
            context.semesters,
            (value) => this.normalizeSemesterValue(value)
        ).filter((value) => value !== null);

        const paperTypes = combineUnique(
            baseFilters.paperTypes,
            context.paperTypes,
            (value) => this.normalizePaperType(value)?.toString()
        );

        const subjectTokens = combineUnique(
            baseFilters.subjects,
            context.subjectTokens,
            (value) => (value ? value.toString().toLowerCase() : '')
        ).filter(Boolean);

        return {
            query: context.subjectPhrase || context.cleaned || this.config.search.query || '',
            filters: {
                subjects: subjectTokens,
                course_codes: courseCodes,
                course_code_prefixes: courseCodes.map((code) => `${code}%`),
                semesters,
                paper_types: paperTypes,
            },
            page: this.state.currentPage,
            pageSize: this.config.pagination.limit,
        };
    }

    shouldFallbackToLegacySearch(error) {
        if (!error) return false;
        const message = (error.message || '').toLowerCase();
        return (
            message.includes('function search_past_papers') ||
            message.includes('rpc search_past_papers') ||
            message.includes('search_past_papers does not exist')
        );
    }

    async fetchPapersFallback(payload, startTime) {
        try {
            let query = this.supabase
                .from(this.config.api.table)
                .select('*', { count: 'exact' })
                .eq('is_active', true);

            const filters = payload.filters || {};

            if (filters.course_codes?.length) {
                const expressions = [];
                filters.course_codes.forEach((code) => {
                    const normalized = this.normalizeCourseCode(code);
                    if (!normalized) return;
                    const withHyphen = normalized.replace(/([A-Z]+)(\d{2,3})/, (_, letters, numbers) => {
                        return `${letters}-${numbers}`;
                    });
                    expressions.push(`course_code.ilike.%${normalized}%`);
                    expressions.push(`paper_code.ilike.%${normalized}%`);
                    if (withHyphen !== normalized) {
                        expressions.push(`course_code.ilike.%${withHyphen}%`);
                        expressions.push(`paper_code.ilike.%${withHyphen}%`);
                    }
                });
                if (expressions.length > 0) {
                    query = query.or(expressions.join(','));
                }
            }

            if (filters.semesters?.length) {
                query = query.in('semester', filters.semesters);
            }

            if (filters.paper_types?.length) {
                const typeExpressions = filters.paper_types.map((type) => {
                    const normalized = this.normalizePaperType(type);
                    return `paper_type.ilike.${normalized}`;
                });
                const legacyExpressions = filters.paper_types.map((type) => {
                    const normalized = this.normalizePaperType(type);
                    return `exam_type.ilike.${normalized}`;
                });
                query = query.or([...typeExpressions, ...legacyExpressions].join(','));
            }

            const subjectTokens = filters.subjects || [];
            if (subjectTokens.length > 0) {
                const subjectExpressions = subjectTokens.map((token) => `subject.ilike.%${token}%`);
                query = query.or(subjectExpressions.join(','));
            }

            if (payload.query && payload.query.trim()) {
                const q = payload.query.trim();
                query = query.or(
                    [
                        `subject.ilike.%${q}%`,
                        `file_name.ilike.%${q}%`,
                        `course_code.ilike.%${q}%`,
                        `paper_code.ilike.%${q}%`,
                        `paper_type.ilike.%${q}%`,
                        `exam_type.ilike.%${q}%`,
                    ].join(',')
                );
            }

            const windowMultiplier = 3;
            const windowSize = payload.pageSize * windowMultiplier;
            const from = Math.max(0, (payload.page - 1) * payload.pageSize);
            const to = from + windowSize - 1;

            const { data, error, count } = await query.range(from, to);

            if (error) {
                throw error;
            }

            const normalizedRows = (data || []).map((row) => this.normalizePaperRecord(row));
            const rankedRows = this.rankPaperRecords(normalizedRows, payload);
            const sliceStart = 0;
            const sliceEnd = Math.min(payload.pageSize, rankedRows.length);
            const pageRows = rankedRows.slice(sliceStart, sliceEnd);

            if (payload.page === 1) {
                this.state.papers = pageRows;
            } else {
                this.state.papers = [...this.state.papers, ...pageRows];
            }

            this.state.totalCount = typeof count === 'number' ? count : this.state.totalCount || rankedRows.length;
            const totalCount = this.state.totalCount;
            const took =
                typeof performance !== 'undefined' && typeof performance.now === 'function'
                    ? Math.round(performance.now() - startTime)
                    : Math.round(Date.now() - startTime);
            this.state.hasMore = payload.page * payload.pageSize < totalCount;
            this.state.tookMs = took;
            this.state.lastFetchedAt = new Date().toISOString();

            this.renderPapers();
            this.updateFilterCount();
        } catch (fallbackError) {
            console.error('Fallback search failed:', fallbackError);
            this.state.error = fallbackError.message;
            this.state.hasMore = false;
            this.renderPapers();
            this.updateFilterCount();
        }
    }

    createRankingContext(payload) {
        const filters = payload.filters || {};
        const courseCodes = new Set(filters.course_codes || []);
        const coursePrefixes = new Set(filters.course_code_prefixes || []);
        const semesters = new Set((filters.semesters || []).map(Number));
        const paperTypes = new Set((filters.paper_types || []).map((type) => type.toLowerCase()));
        const subjectTokens = filters.subjects || [];

        const halfLifeMs = this.config.ranking.popularityHalfLifeDays * 24 * 60 * 60 * 1000;

        return {
            courseCodes,
            coursePrefixes,
            semesters,
            paperTypes,
            subjectTokens,
            halfLifeMs,
            now: Date.now(),
        };
    }

    rankPaperRecords(papers, payload) {
        if (!Array.isArray(papers) || papers.length === 0) return [];
        const context = this.createRankingContext(payload);

        return papers
            .map((paper) => this.computeRankingMetadata(paper, context))
            .sort((a, b) => this.compareRankedPapers(a, b));
    }

    computeRankingMetadata(paper, context) {
        const courseCode = this.normalizeCourseCode(this.resolveCourseCode(paper));
        const semester = this.normalizeSemesterValue(paper.semester);
        const paperType = this.normalizePaperType(this.resolvePaperType(paper)).toLowerCase();
        const subject = (paper.subject || '').toLowerCase();

        const courseExact = courseCode ? context.courseCodes.has(courseCode) : false;
        const coursePrefix =
            courseExact ||
            (courseCode
                ? Array.from(context.coursePrefixes).some((prefix) =>
                    prefix.endsWith('%') ? courseCode.startsWith(prefix.slice(0, -1)) : courseCode.startsWith(prefix)
                )
                : false);

        const semesterMatch = semester ? context.semesters.has(semester) : false;
        const paperTypeMatch = paperType ? context.paperTypes.has(paperType) : false;

        const subjectScore = context.subjectTokens.reduce((score, token) => {
            return subject.includes(token) ? score + 1 : score;
        }, 0);

        const popularityScore = this.computePopularityScore(paper.popularity);
        const recencyScore = this.computeRecencyScore(paper.created_at || paper.updated_at, context);

        return {
            ...paper,
            __ranking: {
                courseExact,
                coursePrefix,
                semesterMatch,
                paperTypeMatch,
                subjectScore,
                popularityScore,
                recencyScore,
            },
        };
    }

    compareRankedPapers(a, b) {
        const ar = a.__ranking;
        const br = b.__ranking;

        if (ar.courseExact !== br.courseExact) {
            return ar.courseExact ? -1 : 1;
        }
        if (ar.coursePrefix !== br.coursePrefix) {
            return ar.coursePrefix ? -1 : 1;
        }
        if (ar.semesterMatch !== br.semesterMatch) {
            return ar.semesterMatch ? -1 : 1;
        }
        if (ar.paperTypeMatch !== br.paperTypeMatch) {
            return ar.paperTypeMatch ? -1 : 1;
        }
        if (ar.subjectScore !== br.subjectScore) {
            return br.subjectScore - ar.subjectScore;
        }
        if (ar.popularityScore !== br.popularityScore) {
            return br.popularityScore - ar.popularityScore;
        }
        if (ar.recencyScore !== br.recencyScore) {
            return br.recencyScore - ar.recencyScore;
        }

        const aTitleLength = a.file_name ? a.file_name.length : Number.MAX_SAFE_INTEGER;
        const bTitleLength = b.file_name ? b.file_name.length : Number.MAX_SAFE_INTEGER;
        if (aTitleLength !== bTitleLength) {
            return aTitleLength - bTitleLength;
        }

        const aYear = a.year || 0;
        const bYear = b.year || 0;
        if (aYear !== bYear) {
            return bYear - aYear;
        }

        const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (aCreated !== bCreated) {
            return bCreated - aCreated;
        }

        const aId = a.id || '';
        const bId = b.id || '';
        return aId.localeCompare(bId);
    }

    computePopularityScore(popularity) {
        if (popularity === null || popularity === undefined) return 0;
        const value = Number(popularity);
        if (Number.isNaN(value) || value <= 0) return 0;
        return Math.log10(value + 1);
    }

    computeRecencyScore(timestamp, context) {
        if (!timestamp) return 0;
        const created = new Date(timestamp).getTime();
        if (Number.isNaN(created)) return 0;
        const ageMs = Math.max(0, context.now - created);
        const halfLifeMs = context.halfLifeMs || 1;
        return Math.exp(-Math.log(2) * (ageMs / halfLifeMs));
    }

    normalizePaperRecord(paper) {
        if (!paper || typeof paper !== 'object') return {};

        const normalized = { ...paper };
        normalized.course_code = this.resolveCourseCode(paper);
        normalized.paper_type = this.resolvePaperType(paper);
        normalized.semester = this.normalizeSemesterValue(
            paper.semester !== undefined ? paper.semester : paper.sem
        );
        normalized.popularity = this.resolvePopularity(paper);
        normalized.file_format = paper.file_format || paper.format || this.detectFileFormat(paper);
        normalized.file_size = paper.file_size || paper.size || null;
        normalized.total_count = paper.total_count !== undefined ? Number(paper.total_count) : undefined;
        return normalized;
    }

    resolveCourseCode(paper) {
        const candidates = [
            paper.course_code,
            paper.courseCode,
            paper.paper_code,
            paper.paperCode,
            paper.code,
        ];
        const value = candidates.find((candidate) => candidate && candidate.trim && candidate.trim() !== '');
        return value ? value.toString().toUpperCase() : '';
    }

    resolvePaperType(paper) {
        const candidates = [
            paper.paper_type,
            paper.paperType,
            paper.exam_type,
            paper.examType,
            paper.type,
        ];
        const value = candidates.find((candidate) => candidate && candidate.trim && candidate.trim() !== '');
        return value || '';
    }

    resolvePopularity(paper) {
        const candidates = [paper.popularity, paper.downloads, paper.view_count, paper.download_count];
        const value = candidates.find((candidate) => candidate !== undefined && candidate !== null);
        return value !== undefined ? Number(value) : 0;
    }

    detectFileFormat(paper) {
        const fileName = paper.file_name || paper.title || '';
        if (!fileName) return '';
        const match = /\.([0-9a-z]+)$/i.exec(fileName);
        if (!match) return '';
        return match[1].toUpperCase();
    }

    handleSearchInput(query) {
        this.config.search.query = query;

        // Debounce search
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.performSearch(query);
        }, this.config.search.debounceDelay);

        // Show suggestions
        this.showSearchSuggestions();
    }

    async performSearch(query) {
        this.config.search.query = query;
        this.state.currentPage = 1;
        this.state.papers = [];
        this.state.searchContext = this.parseSearchQuery(query);

        // Save to search history
        if (query.trim()) {
            this.addToSearchHistory(query);
        }

        // Update URL
        this.updateURLState();

        // Fetch papers
        await this.fetchPapers();
    }

    async handleFilterChange(filters) {
        this.config.filters = filters;
        this.state.currentPage = 1;
        this.state.papers = [];
        // Reset derived context but keep query-derived modifiers
        this.state.searchContext = this.parseSearchQuery(this.config.search.query);

        // Update URL
        this.updateURLState();

        // Update filter chips
        this.updateFilterChips();

        // Fetch papers
        await this.fetchPapers();
    }

    async fetchPapers() {
        if (this.state.loading) return;

        this.setLoading(true);
        this.state.error = null;

        const payload = this.buildSearchPayload();
        const startTime =
            typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? performance.now()
                : Date.now();

        try {
            const { data, error } = await this.supabase.rpc('search_past_papers', {
                p_query: payload.query,
                p_filters: payload.filters,
                p_page: payload.page,
                p_page_size: payload.pageSize,
            });

            if (error) {
                if (this.shouldFallbackToLegacySearch(error)) {
                    await this.fetchPapersFallback(payload, startTime);
                    return;
                }
                throw error;
            }

            const normalizedRows = Array.isArray(data)
                ? data.map((row) => this.normalizePaperRecord(row))
                : [];

            const totalCount =
                normalizedRows.length > 0 && normalizedRows[0].total_count !== undefined
                    ? Number(normalizedRows[0].total_count)
                    : this.state.currentPage === 1
                        ? normalizedRows.length
                        : this.state.totalCount;

            const took =
                typeof performance !== 'undefined' && typeof performance.now === 'function'
                    ? Math.round(performance.now() - startTime)
                    : Math.round(Date.now() - startTime);

            if (this.state.currentPage === 1) {
                this.state.papers = normalizedRows;
            } else {
                this.state.papers = [...this.state.papers, ...normalizedRows];
            }

            this.state.totalCount = totalCount;
            this.state.hasMore = payload.page * payload.pageSize < totalCount;
            this.state.tookMs = took;
            this.state.lastFetchedAt = new Date().toISOString();

            this.renderPapers();
            this.updateFilterCount();
        } catch (error) {
            console.error('Failed to fetch papers:', error);
            this.state.error = error.message;
            this.state.hasMore = false;
            console.warn('Failed to load papers. Trying fallback search logic.');
            await this.fetchPapersFallback(payload, startTime);
        } finally {
            this.setLoading(false);
        }
    }

    async loadMorePapers() {
        if (this.state.loading || !this.state.hasMore) return;

        this.state.currentPage += 1;
        await this.fetchPapers();
    }

    renderPapers() {
        const grid = document.getElementById('papersGrid');
        if (!grid) return;

        // Clear existing papers if starting fresh
        if (this.state.currentPage === 1) {
            grid.innerHTML = '';
        }

        // Render new papers
        this.state.papers.forEach((paper) => {
            const card = this.createPaperCard(paper);
            grid.appendChild(card);
        });

        // Show/hide empty state
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            if (this.state.papers.length === 0 && !this.state.loading) {
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.add('hidden');
            }
        }
    }

    createPaperCard(paper) {
        const card = document.createElement('div');
        card.className = 'pp-paper-card';
        card.setAttribute('role', 'gridcell');
        card.setAttribute('tabindex', '0');
        card.setAttribute('data-paper-id', paper.id);

        // Check if favorited
        const isFavorited = this.isFavorited(paper.id);
        const courseCode = this.resolveCourseCode(paper);
        const paperType = this.normalizePaperType(this.resolvePaperType(paper));
        const semester = this.normalizeSemesterValue(paper.semester);
        const semesterLabel = semester ? `Semester ${semester}` : null;
        const fileSizeLabel = paper.file_size ? this.formatFileSize(paper.file_size) : null;
        const popularity = paper.popularity ? `${paper.popularity.toLocaleString()} views` : null;

        card.innerHTML = `
            <img 
                src="${paper.thumbnail_url || ''}" 
                alt="${paper.file_name}"
                class="pp-card-thumbnail"
                loading="lazy"
                onerror="this.style.display='none'">
            <div class="pp-card-header">
                <h3 class="pp-card-title">${this.escapeHtml(paper.file_name)}</h3>
                <span class="pp-card-subject">${this.escapeHtml(paper.subject)}</span>
            </div>
            <div class="pp-card-meta">
                <div class="pp-card-meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>${paper.year || 'N/A'}</span>
                </div>
                ${courseCode ? `
                    <div class="pp-card-meta-item">
                        <i class="fas fa-hashtag"></i>
                        <span>${this.escapeHtml(courseCode)}</span>
                    </div>
                ` : ''}
                ${semesterLabel ? `
                    <div class="pp-card-meta-item">
                        <i class="fas fa-layer-group"></i>
                        <span>${this.escapeHtml(semesterLabel)}</span>
                    </div>
                ` : ''}
                ${paperType ? `
                    <div class="pp-card-meta-item">
                        <i class="fas fa-certificate"></i>
                        <span>${this.escapeHtml(paperType)}</span>
                    </div>
                ` : ''}
                ${fileSizeLabel ? `
                    <div class="pp-card-meta-item">
                        <i class="fas fa-file"></i>
                        <span>${this.escapeHtml(fileSizeLabel)}</span>
                    </div>
                ` : ''}
                ${popularity ? `
                    <div class="pp-card-meta-item">
                        <i class="fas fa-chart-line"></i>
                        <span>${this.escapeHtml(popularity)}</span>
                    </div>
                ` : ''}
            </div>
            <div class="pp-card-actions">
                <button 
                    class="pp-card-action" 
                    data-action="preview"
                    aria-label="Preview ${this.escapeHtml(paper.file_name)}">
                    <i class="fas fa-eye"></i>
                    <span>Preview</span>
                </button>
                <button 
                    class="pp-card-action favorite ${isFavorited ? 'active' : ''}" 
                    data-action="favorite"
                    aria-label="${isFavorited ? 'Remove from' : 'Add to'} favorites">
                    <i class="fas fa-heart"></i>
                </button>
                <button 
                    class="pp-card-action" 
                    data-action="share"
                    aria-label="Share ${this.escapeHtml(paper.file_name)}">
                    <i class="fas fa-share"></i>
                </button>
            </div>
        `;

        // Add event listeners
        card.addEventListener('click', (e) => {
            if (e.target.closest('.pp-card-action')) {
                const action = e.target.closest('.pp-card-action').dataset.action;
                this.handleCardAction(paper, action);
            } else {
                // Click on card opens preview
                this.handleCardAction(paper, 'preview');
            }
        });

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleCardAction(paper, 'preview');
            } else if (e.key === ' ') {
                e.preventDefault();
                this.handleCardAction(paper, 'favorite');
            }
        });

        // Lazy load thumbnail
        const thumbnail = card.querySelector('.pp-card-thumbnail');
        if (thumbnail && thumbnail.src) {
            const img = new Image();
            img.onload = () => {
                thumbnail.classList.add('loaded');
            };
            img.src = thumbnail.src;
        }

        return card;
    }

    handleCardAction(paper, action) {
        switch (action) {
            case 'preview':
                this.openPDFViewer(paper);
                this.addToRecentViews(paper);
                break;
            case 'favorite':
                this.toggleFavorite(paper.id);
                // Update card UI
                const card = document.querySelector(`[data-paper-id="${paper.id}"]`);
                if (card) {
                    const favoriteBtn = card.querySelector('.favorite');
                    if (favoriteBtn) {
                        const isFavorited = this.isFavorited(paper.id);
                        favoriteBtn.classList.toggle('active', isFavorited);
                    }
                }
                break;
            case 'share':
                this.sharePaper(paper);
                break;
        }
    }

    async openPDFViewer(paper) {
        if (!this.components.pdfViewer) return;

        const resolvedUrl = await this.resolvePdfUrl(paper);
        const payload = { ...paper, file_url: resolvedUrl };
        this.components.pdfViewer.open(payload);
    }

    handlePDFViewerClose() {
        // Any cleanup needed
    }

    /**
     * Resolve a usable PDF URL from multiple possible fields and contexts.
     * - Supports absolute URLs
     * - Resolves relative paths against current page
     * - Builds public Supabase Storage URL if bucket/path available
     * - Encodes spaces and unsafe characters
     */
    buildPdfUrl(paper) {
        if (!paper || typeof paper !== 'object') return '';

        const rawCandidate =
            paper.file_url ||
            paper.fileUrl ||
            paper.public_url ||
            paper.signed_url ||
            paper.url ||
            '';

        // Supabase storage object -> build a public URL
        if (!rawCandidate && paper.storage_bucket && paper.storage_path && window.SUPABASE_URL) {
            const bucket = String(paper.storage_bucket).replace(/^\/+|\/+$/g, '');
            const path = String(paper.storage_path).replace(/^\/+/, '');
            const encodedPath = path.split('/').map(encodeURIComponent).join('/');
            return `${window.SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodedPath}`;
        }

        if (!rawCandidate || typeof rawCandidate !== 'string') return '';

        try {
            // Encode unsafe characters but keep valid URL structure
            const trimmed = rawCandidate.trim();
            // If it's already a valid absolute URL, keep it
            const absolute = new URL(trimmed, window.location.href).toString();
            // Ensure spaces etc. are encoded (new URL will encode)
            return absolute;
        } catch {
            return '';
        }
    }

    /**
     * Resolve a final URL, creating a signed URL from Supabase when needed.
     */
    async resolvePdfUrl(paper) {
        // 1) If we already have a usable URL (absolute), return it
        const direct = this.buildPdfUrl(paper);
        if (direct) return direct;

        // 2) If we have storage coordinates, create a signed URL (private buckets)
        try {
            const bucket = paper.storage_bucket;
            const path = paper.storage_path;
            if (this.supabase && bucket && path) {
                const storage = this.supabase.storage.from(String(bucket));
                // default 1 hour expiry
                const { data, error } = await storage.createSignedUrl(String(path), 60 * 60);
                if (!error && data?.signedUrl) {
                    return new URL(data.signedUrl, window.location.href).toString();
                }
            }
        } catch (e) {
            console.warn('Failed to create signed URL:', e);
        }

        return '';
    }

    toggleFavorite(paperId) {
        const favorites = this.getFavorites();
        const index = favorites.indexOf(paperId);

        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(paperId);
        }

        localStorage.setItem(this.config.favorites.storageKey, JSON.stringify(favorites));
    }

    isFavorited(paperId) {
        const favorites = this.getFavorites();
        return favorites.includes(paperId);
    }

    getFavorites() {
        try {
            const stored = localStorage.getItem(this.config.favorites.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    addToRecentViews(paper) {
        try {
            const recent = this.getRecentViews();
            // Remove if already exists
            const index = recent.findIndex((p) => p.id === paper.id);
            if (index > -1) {
                recent.splice(index, 1);
            }
            // Add to beginning
            recent.unshift({
                id: paper.id,
                file_name: paper.file_name,
                subject: paper.subject,
                viewed_at: new Date().toISOString(),
            });
            // Keep only max items
            recent.splice(this.config.recentViews.maxItems);
            localStorage.setItem(this.config.recentViews.storageKey, JSON.stringify(recent));
        } catch (error) {
            console.error('Failed to save recent view:', error);
        }
    }

    getRecentViews() {
        try {
            const stored = localStorage.getItem(this.config.recentViews.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    addToSearchHistory(query) {
        try {
            const history = this.getSearchHistory();
            // Remove if already exists
            const index = history.indexOf(query);
            if (index > -1) {
                history.splice(index, 1);
            }
            // Add to beginning
            history.unshift(query);
            // Keep only max items
            history.splice(this.config.searchHistory.maxItems);
            localStorage.setItem(this.config.searchHistory.storageKey, JSON.stringify(history));
        } catch (error) {
            console.error('Failed to save search history:', error);
        }
    }

    getSearchHistory() {
        try {
            const stored = localStorage.getItem(this.config.searchHistory.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    showSearchSuggestions() {
        const suggestions = document.getElementById('searchSuggestions');
        const searchInput = document.getElementById('searchInput');
        if (!suggestions || !searchInput) return;

        const query = searchInput.value.trim().toLowerCase();
        const history = this.getSearchHistory();

        if (query.length === 0 && history.length === 0) {
            suggestions.classList.remove('open');
            return;
        }

        // Filter history by query
        const filteredHistory = history.filter((item) =>
            item.toLowerCase().includes(query)
        );

        if (filteredHistory.length === 0 && query.length === 0) {
            suggestions.classList.remove('open');
            return;
        }

        suggestions.innerHTML = '';
        filteredHistory.slice(0, 5).forEach((item) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'pp-search-suggestion-item history';
            suggestionItem.setAttribute('role', 'option');
            suggestionItem.textContent = item;
            suggestionItem.addEventListener('click', () => {
                searchInput.value = item;
                this.performSearch(item);
                suggestions.classList.remove('open');
            });
            suggestions.appendChild(suggestionItem);
        });

        suggestions.classList.add('open');
    }

    sharePaper(paper) {
        if (navigator.share) {
            navigator.share({
                title: paper.file_name,
                text: `Check out this past paper: ${paper.file_name}`,
                url: window.location.href,
            }).catch((error) => {
                console.error('Error sharing:', error);
            });
        } else {
            // Fallback: copy to clipboard
            const url = `${window.location.origin}${window.location.pathname}?paper=${paper.id}`;
            navigator.clipboard.writeText(url).then(() => {
                this.showNotification('Link copied to clipboard');
            });
        }
    }

    updateFilterChips() {
        const chipsContainer = document.getElementById('filterChips');
        if (!chipsContainer) return;

        chipsContainer.innerHTML = '';

        // Subject chips
        this.config.filters.subjects.forEach((subject) => {
            const chip = this.createFilterChip('subject', subject, subject);
            chipsContainer.appendChild(chip);
        });

        // Course code chips
        this.config.filters.courseCodes.forEach((courseCode) => {
            const label = `Course ${courseCode}`;
            const chip = this.createFilterChip('courseCode', courseCode, label);
            chipsContainer.appendChild(chip);
        });

        // Semester chips
        this.config.filters.semesters.forEach((semester) => {
            const label = `Semester ${semester}`;
            const chip = this.createFilterChip('semester', semester, label);
            chipsContainer.appendChild(chip);
        });

        // Paper type chips
        this.config.filters.paperTypes.forEach((paperType) => {
            const label = this.normalizePaperType(paperType);
            const chip = this.createFilterChip('paperType', label, label);
            chipsContainer.appendChild(chip);
        });
    }

    createFilterChip(type, value, label) {
        const chip = document.createElement('div');
        chip.className = 'pp-filter-chip';
        chip.innerHTML = `
            <span>${this.escapeHtml(label)}</span>
            <button 
                class="pp-filter-chip-remove" 
                aria-label="Remove ${this.escapeHtml(label)} filter"
                data-filter-type="${type}"
                data-filter-value="${value}">
                <i class="fas fa-times"></i>
            </button>
        `;

        chip.querySelector('.pp-filter-chip-remove').addEventListener('click', () => {
            this.removeFilter(type, value);
        });

        return chip;
    }

    removeFilter(type, value) {
        switch (type) {
            case 'subject':
                this.config.filters.subjects = this.config.filters.subjects.filter((s) => s !== value);
                break;
            case 'courseCode':
                this.config.filters.courseCodes = this.config.filters.courseCodes.filter((code) => code !== value);
                break;
            case 'semester':
                {
                    const target = this.normalizeSemesterValue(value);
                    this.config.filters.semesters = this.config.filters.semesters.filter(
                        (sem) => this.normalizeSemesterValue(sem) !== target
                    );
                }
                break;
            case 'paperType':
                this.config.filters.paperTypes = this.config.filters.paperTypes.filter(
                    (typeValue) => typeValue !== value
                );
                break;
        }

        if (this.components.filterSidebar) {
            this.components.filterSidebar.updateFilters(this.config.filters);
        }
        if (this.components.mobileFilterSidebar) {
            this.components.mobileFilterSidebar.updateFilters(this.config.filters);
        }

        this.handleFilterChange(this.config.filters);
    }

    updateFilterCount() {
        const count = this.state.totalCount;
        // Update filter count display if component exists
        if (this.components.filterSidebar) {
            this.components.filterSidebar.updateCount(count);
        }
        if (this.components.mobileFilterSidebar) {
            this.components.mobileFilterSidebar.updateCount(count);
        }
    }

    updateURLState() {
        const params = new URLSearchParams();

        if (this.config.search.query) {
            params.set('q', this.config.search.query);
        }

        if (this.config.filters.subjects.length > 0) {
            params.set('subjects', this.config.filters.subjects.join(','));
        }

        if (this.config.filters.courseCodes.length > 0) {
            params.set('courses', this.config.filters.courseCodes.join(','));
        }

        if (this.config.filters.semesters.length > 0) {
            params.set('semesters', this.config.filters.semesters.join(','));
        }

        if (this.config.filters.paperTypes.length > 0) {
            params.set('types', this.config.filters.paperTypes.join(','));
        }

        const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.pushState({}, '', newURL);
    }

    parseURLFilters(urlParams) {
        const filters = {
            subjects: [],
            courseCodes: [],
            semesters: [],
            paperTypes: [],
        };

        if (urlParams.has('subjects')) {
            filters.subjects = urlParams.get('subjects').split(',').filter(Boolean);
        }

        if (urlParams.has('courses')) {
            filters.courseCodes = urlParams
                .get('courses')
                .split(',')
                .map((code) => this.normalizeCourseCode(code))
                .filter(Boolean);
        }

        if (urlParams.has('semesters')) {
            filters.semesters = urlParams
                .get('semesters')
                .split(',')
                .map((value) => this.normalizeSemesterValue(value))
                .filter((value) => value !== null);
        }

        if (urlParams.has('types')) {
            filters.paperTypes = urlParams
                .get('types')
                .split(',')
                .map((type) => this.normalizePaperType(type))
                .filter(Boolean);
        }

        return filters;
    }

    syncURLState() {
        // Listen for browser back/forward
        window.addEventListener('popstate', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const filters = this.parseURLFilters(urlParams);
            const query = urlParams.get('q') || '';

            this.config.filters = { ...this.config.filters, ...filters };
            this.config.search.query = query;

            if (this.components.filterSidebar) {
                this.components.filterSidebar.updateFilters(this.config.filters);
            }
            if (this.components.mobileFilterSidebar) {
                this.components.mobileFilterSidebar.updateFilters(this.config.filters);
            }

            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = query;
            }

            this.state.currentPage = 1;
            this.state.papers = [];
            this.fetchPapers();
        });
    }

    toggleMobileSidebar() {
        const sidebar = document.getElementById('filterSidebar');
        const backdrop = document.getElementById('mobileBackdrop');
        const bottomSheet = document.getElementById('mobileBottomSheet');

        if (sidebar) {
            sidebar.classList.toggle('open');
        }

        if (backdrop) {
            backdrop.classList.toggle('visible');
        }

        if (bottomSheet) {
            bottomSheet.classList.toggle('open');
        }
    }

    closeMobileSidebar() {
        const sidebar = document.getElementById('filterSidebar');
        const backdrop = document.getElementById('mobileBackdrop');
        const bottomSheet = document.getElementById('mobileBottomSheet');

        if (sidebar) {
            sidebar.classList.remove('open');
        }

        if (backdrop) {
            backdrop.classList.remove('visible');
        }

        if (bottomSheet) {
            bottomSheet.classList.remove('open');
        }
    }

    setLoading(loading) {
        this.state.loading = loading;
        const loadingContainer = document.getElementById('loadingContainer');
        if (loadingContainer) {
            if (loading) {
                loadingContainer.classList.remove('hidden');
            } else {
                loadingContainer.classList.add('hidden');
            }
        }
    }

    showError(message) {
        console.error(message);
        // You can implement a toast notification here
        alert(message); // Temporary fallback
    }

    showNotification(message) {
        // You can implement a toast notification here
        console.log(message);
    }

    loadUserData() {
        // Load favorites and recent views for display in sidebar if needed
        const favorites = this.getFavorites();
        const recentViews = this.getRecentViews();

        // Update sidebar if component supports it
        if (this.components.filterSidebar) {
            // Pass favorites and recent views to sidebar if needed
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Utility functions
    formatFileSize(bytes) {
        if (!bytes) return 'Unknown size';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDate(timestamp) {
        if (!timestamp) return 'Unknown date';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }

    getExamBoardColor(board) {
        const colors = {
            AQA: '#3b82f6',
            Edexcel: '#8b5cf6',
            OCR: '#10b981',
            Cambridge: '#f59e0b',
        };
        return colors[board] || '#6b7280';
    }

    // Backend Functions (Phase 9)
    async getAllPastPapers(filters = {}, page = 1, limit = 20) {
        try {
            // Check cache first
            const cacheKey = `papers_${JSON.stringify(filters)}_${page}_${limit}`;
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                return cached;
            }

            let query = this.supabase
                .from(this.config.api.table)
                .select('*', { count: 'exact' })
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            // Apply filters
            if (filters.subjects && filters.subjects.length > 0) {
                query = query.in('subject', filters.subjects);
            }
            if (filters.examBoards && filters.examBoards.length > 0) {
                query = query.in('exam_type', filters.examBoards);
            }
            if (filters.yearRange) {
                if (filters.yearRange.min !== null) {
                    query = query.gte('year', filters.yearRange.min);
                }
                if (filters.yearRange.max !== null) {
                    query = query.lte('year', filters.yearRange.max);
                }
            }
            if (filters.paperType) {
                query = query.eq('exam_type', filters.paperType);
            }

            // Apply pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) throw error;

            const result = {
                data: data || [],
                count: count || 0,
                page,
                limit,
            };

            // Cache result
            this.setCachedData(cacheKey, result);

            return result;
        } catch (error) {
            console.error('Failed to get all past papers:', error);
            throw error;
        }
    }

    async searchPapers(query, filters = {}) {
        try {
            // Debounce search
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
            }

            return new Promise((resolve, reject) => {
                this.searchDebounceTimer = setTimeout(async () => {
                    try {
                        // Check cache
                        const cacheKey = `search_${query}_${JSON.stringify(filters)}`;
                        const cached = this.getCachedData(cacheKey);
                        if (cached) {
                            resolve(cached);
                            return;
                        }

                        let supabaseQuery = this.supabase
                            .from(this.config.api.table)
                            .select('*', { count: 'exact' })
                            .eq('is_active', true);

                        // Apply search
                        if (query.trim()) {
                            supabaseQuery = supabaseQuery.or(
                                `subject.ilike.%${query}%,paper_code.ilike.%${query}%,file_name.ilike.%${query}%`
                            );
                        }

                        // Apply filters
                        if (filters.subjects && filters.subjects.length > 0) {
                            supabaseQuery = supabaseQuery.in('subject', filters.subjects);
                        }
                        if (filters.examBoards && filters.examBoards.length > 0) {
                            supabaseQuery = supabaseQuery.in('exam_type', filters.examBoards);
                        }

                        const { data, error, count } = await supabaseQuery;

                        if (error) throw error;

                        const result = {
                            data: data || [],
                            count: count || 0,
                            query,
                        };

                        // Cache result
                        this.setCachedData(cacheKey, result);

                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                }, this.config.search.debounceDelay);
            });
        } catch (error) {
            console.error('Failed to search papers:', error);
            throw error;
        }
    }

    async getPapersBySubject(subject) {
        try {
            // Check cache
            const cacheKey = `papers_subject_${subject}`;
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                return cached;
            }

            const { data, error } = await this.supabase
                .from(this.config.api.table)
                .select('*')
                .eq('is_active', true)
                .eq('subject', subject)
                .order('year', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Cache result
            this.setCachedData(cacheKey, data || []);

            return data || [];
        } catch (error) {
            console.error('Failed to get papers by subject:', error);
            throw error;
        }
    }

    async getPaperById(id) {
        try {
            // Check cache
            const cacheKey = `paper_${id}`;
            const cached = this.getCachedData(cacheKey);
            if (cached) {
                return cached;
            }

            const { data, error } = await this.supabase
                .from(this.config.api.table)
                .select('*')
                .eq('id', id)
                .eq('is_active', true)
                .single();

            if (error) throw error;

            // Cache result
            this.setCachedData(cacheKey, data);

            return data;
        } catch (error) {
            console.error('Failed to get paper by ID:', error);
            throw error;
        }
    }

    // Cache management
    getCachedData(key) {
        try {
            const cached = localStorage.getItem(`pp_cache_${key}`);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();

            // Check if cache is expired
            if (now - timestamp > this.config.api.cacheTTL) {
                localStorage.removeItem(`pp_cache_${key}`);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Failed to get cached data:', error);
            return null;
        }
    }

    setCachedData(key, data) {
        try {
            const cache = {
                data,
                timestamp: Date.now(),
            };
            localStorage.setItem(`pp_cache_${key}`, JSON.stringify(cache));
        } catch (error) {
            console.error('Failed to cache data:', error);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.pastPapersApp = new PastPapersApp();
});

// Export for use in other scripts
window.PastPapersApp = PastPapersApp;

