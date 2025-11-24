/**
 * IndexNow API Integration
 * Automatically notifies search engines when URLs are created or updated
 * 
 * Documentation: https://www.indexnow.org/documentation
 */

class IndexNowAPI {
    constructor() {
        // IndexNow API key (32 character hex string)
        this.apiKey = '8a44be3040e8d0082bebb260a6721525';
        
        // Base URL of your website
        this.baseUrl = 'https://sharedstudy.vercel.app';
        
        // IndexNow API endpoint
        this.apiEndpoint = 'https://api.indexnow.org/IndexNow';
        
        // Key location URL (where the key file is hosted)
        this.keyLocation = `${this.baseUrl}/${this.apiKey}.txt`;
    }

    /**
     * Submit a single URL to IndexNow
     * @param {string} url - Full URL to submit (must include https://)
     * @returns {Promise<boolean>} - Returns true if successful
     */
    async submitUrl(url) {
        try {
            // Validate URL
            if (!url || !url.startsWith('http')) {
                console.warn('IndexNow: Invalid URL format', url);
                return false;
            }

            // Ensure URL belongs to our domain
            if (!url.startsWith(this.baseUrl)) {
                console.warn('IndexNow: URL does not belong to domain', url);
                return false;
            }

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    host: new URL(url).hostname,
                    key: this.apiKey,
                    keyLocation: this.keyLocation,
                    urlList: [url]
                })
            });

            // Handle response
            if (response.status === 200) {
                console.log('IndexNow: URL submitted successfully', url);
                return true;
            } else if (response.status === 202) {
                // 202 Accepted is also a success
                console.log('IndexNow: URL accepted', url);
                return true;
            } else {
                const errorText = await response.text();
                console.warn(`IndexNow: Submission failed (${response.status})`, {
                    url,
                    status: response.status,
                    error: errorText
                });
                return false;
            }
        } catch (error) {
            console.error('IndexNow: Error submitting URL', {
                url,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Submit multiple URLs in a single request
     * @param {string[]} urls - Array of full URLs to submit
     * @returns {Promise<boolean>} - Returns true if successful
     */
    async submitUrls(urls) {
        if (!urls || urls.length === 0) {
            console.warn('IndexNow: No URLs provided');
            return false;
        }

        try {
            // Filter and validate URLs
            const validUrls = urls.filter(url => {
                if (!url || !url.startsWith('http')) {
                    console.warn('IndexNow: Invalid URL format', url);
                    return false;
                }
                if (!url.startsWith(this.baseUrl)) {
                    console.warn('IndexNow: URL does not belong to domain', url);
                    return false;
                }
                return true;
            });

            if (validUrls.length === 0) {
                console.warn('IndexNow: No valid URLs to submit');
                return false;
            }

            // Get hostname from first URL
            const hostname = new URL(validUrls[0]).hostname;

            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify({
                    host: hostname,
                    key: this.apiKey,
                    keyLocation: this.keyLocation,
                    urlList: validUrls
                })
            });

            // Handle response
            if (response.status === 200 || response.status === 202) {
                console.log(`IndexNow: ${validUrls.length} URLs submitted successfully`);
                return true;
            } else {
                const errorText = await response.text();
                console.warn(`IndexNow: Bulk submission failed (${response.status})`, {
                    count: validUrls.length,
                    status: response.status,
                    error: errorText
                });
                return false;
            }
        } catch (error) {
            console.error('IndexNow: Error submitting URLs', {
                count: urls.length,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Submit a page URL (helper method for common pages)
     * @param {string} path - Path relative to base URL (e.g., '/browse.html')
     * @returns {Promise<boolean>}
     */
    async submitPage(path) {
        const url = path.startsWith('/') 
            ? `${this.baseUrl}${path}` 
            : `${this.baseUrl}/${path}`;
        return this.submitUrl(url);
    }

    /**
     * Submit all main pages from sitemap
     * Useful for initial setup or bulk updates
     * @returns {Promise<boolean>}
     */
    async submitSitemapPages() {
        const pages = [
            '/',
            '/browse.html',
            '/about.html',
            '/login.html',
            '/signup.html',
            '/profile.html',
            '/past-papers/past-papers.html',
            '/upload.html'
        ];

        const urls = pages.map(page => `${this.baseUrl}${page}`);
        return this.submitUrls(urls);
    }

    /**
     * Submit a note URL (for when notes are created/updated)
     * @param {string} noteId - Note ID (if you have note detail pages)
     * @returns {Promise<boolean>}
     */
    async submitNote(noteId) {
        // If you have individual note pages, submit them
        // Otherwise, just submit the browse page
        if (noteId) {
            return this.submitPage(`/browse.html#note-${noteId}`);
        }
        return this.submitPage('/browse.html');
    }

    /**
     * Submit a past paper URL (for when papers are uploaded)
     * @param {string} paperId - Paper ID (if you have paper detail pages)
     * @returns {Promise<boolean>}
     */
    async submitPastPaper(paperId) {
        // If you have individual paper pages, submit them
        // Otherwise, just submit the past papers page
        if (paperId) {
            return this.submitPage(`/past-papers/past-papers.html#paper-${paperId}`);
        }
        return this.submitPage('/past-papers/past-papers.html');
    }
}

// Create global instance
window.indexNow = new IndexNowAPI();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexNowAPI;
}

