// Semantic Search Engine - Stub Implementation
// This file provides a minimal implementation to prevent 404 errors
// Full implementation can be added later if needed

class SemanticSearchEngine {
    constructor() {
        this.index = [];
        this.initialized = false;
    }

    async initialize() {
        try {
            this.initialized = true;
            return true;
        } catch (error) {
            console.warn('Semantic search initialization failed:', error);
            this.initialized = false;
            return false;
        }
    }

    async addToIndex(note) {
        try {
            if (!this.index.find(n => n.id === note.id)) {
                this.index.push(note);
            }
        } catch (error) {
            console.warn('Failed to add note to search index:', error);
        }
    }

    async semanticSearch(query, options = {}) {
        try {
            const { limit = 50, threshold = 0.2, searchFields = [] } = options;
            const queryLower = query.toLowerCase();
            const results = [];

            // Simple text matching fallback
            for (const note of this.index) {
                let score = 0;
                let matches = false;

                for (const field of searchFields) {
                    const fieldValue = (note[field] || '').toLowerCase();
                    if (fieldValue.includes(queryLower)) {
                        matches = true;
                        score += 0.5;
                    }
                }

                if (matches && score >= threshold) {
                    results.push({
                        id: note.id,
                        score: score,
                        ...note
                    });
                }
            }

            // Sort by score and limit results
            return results
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
        } catch (error) {
            console.warn('Semantic search error:', error);
            return [];
        }
    }
}

// Make it available globally
if (typeof window !== 'undefined') {
    window.SemanticSearchEngine = SemanticSearchEngine;
}

