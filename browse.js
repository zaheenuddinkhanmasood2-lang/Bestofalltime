(function () {
    const supabase = window.getSupabaseClient();
    const STORAGE_BUCKET = 'STORAGE_BUCKET';
    const BADGE_META = {
        bronze: { label: 'Bronze', color: '#cd7f32', icon: 'fa-medal' },
        silver: { label: 'Silver', color: '#c0c0c0', icon: 'fa-medal' },
        gold: { label: 'Gold', color: '#facc15', icon: 'fa-trophy' },
        legendary: { label: 'Legendary', color: '#f97316', icon: 'fa-crown' }
    };
    let currentSession = null;

    const grid = document.getElementById('grid');
    const empty = document.getElementById('empty');
    const q = document.getElementById('q');
    const subjectFilter = document.getElementById('subjectFilter');

    // High-contrast toast message utility with variants
    function showToast(message, options) {
        const opts = Object.assign({ duration: 2200, variant: 'info' }, options || {});
        const variantToClasses = {
            info:    'bg-indigo-600',
            success: 'bg-emerald-600',
            warning: 'bg-amber-600',
            error:   'bg-rose-600'
        };

        // Reuse existing toast if present
        let toast = document.getElementById('ss-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'ss-toast';
            toast.className = 'fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4 pointer-events-none';

            const inner = document.createElement('div');
            inner.id = 'ss-toast-inner';
            inner.setAttribute('role', 'status');
            inner.setAttribute('aria-live', 'polite');
            inner.className = [
                'pointer-events-auto text-white shadow-2xl ring-1 ring-white/20',
                'rounded-2xl px-4 py-2 text-sm font-medium',
                'transform transition duration-200 ease-out translate-y-2 opacity-0'
            ].join(' ');

            const content = document.createElement('div');
            content.id = 'ss-toast-content';
            content.className = 'flex items-center gap-2';

            const icon = document.createElement('span');
            icon.id = 'ss-toast-icon';
            icon.className = 'inline-flex items-center justify-center w-4 h-4';
            icon.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';

            const text = document.createElement('span');
            text.id = 'ss-toast-text';

            content.appendChild(icon);
            content.appendChild(text);
            inner.appendChild(content);
            toast.appendChild(inner);
            document.body.appendChild(toast);
        }

        const inner = document.getElementById('ss-toast-inner');
        const text = document.getElementById('ss-toast-text');
        const icon = document.getElementById('ss-toast-icon');

        // Apply variant color
        const base = 'bg-indigo-600 bg-emerald-600 bg-amber-600 bg-rose-600';
        base.split(' ').forEach(c => inner.classList.remove(c));
        inner.classList.add(variantToClasses[opts.variant] || variantToClasses.info);

        // Set icon based on variant
        const variantToIcon = {
            info:    '<i class="fas fa-info-circle"></i>',
            success: '<i class="fas fa-check-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            error:   '<i class="fas fa-times-circle"></i>'
        };
        icon.innerHTML = variantToIcon[opts.variant] || variantToIcon.info;

        // Set message
        text.textContent = message;

        // Animate in
        requestAnimationFrame(() => {
            inner.classList.remove('translate-y-2', 'opacity-0');
            inner.classList.add('translate-y-0', 'opacity-100');
        });

        // Hide function
        const hide = () => {
            inner.classList.add('translate-y-2');
            inner.classList.remove('opacity-100');
            inner.classList.add('opacity-0');
            setTimeout(() => {
                if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
            }, 220);
        };

        if (opts.duration > 0) {
            setTimeout(hide, opts.duration);
        }
        return { hide };
    }

    function getBadgeMeta(badgeId) {
        return BADGE_META[badgeId] || BADGE_META.bronze;
    }

    function formatPoints(points) {
        return new Intl.NumberFormat('en-US').format(points || 0);
    }

    async function refreshSession() {
        const { data: { session } } = await supabase.auth.getSession();
        currentSession = session || null;
        return currentSession;
    }

    async function ensureAuthenticated(actionLabel) {
        const session = currentSession || await refreshSession();
        if (session?.user) return session;
        const label = actionLabel || 'perform this action';
        if (confirm(`You need to sign in to ${label}. Would you like to go to the login page?`)) {
            window.location.href = 'login.html';
        }
        return null;
    }

    function renderCard(row, stats) {
        const kb = (row.file_size || 0) / 1024;
        const points = stats?.total_points ?? 0;
        const badgeMeta = getBadgeMeta(stats?.badge);
        return `
			<div class="glass-panel rounded-xl p-4 flex flex-col gap-3">
				<div class="flex items-start justify-between">
					<div class="flex items-center space-x-3">
						<div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
							<i class="fas fa-file-alt text-white text-sm"></i>
						</div>
						<div>
							<h3 class="text-white font-semibold line-clamp-2">${row.title || 'Untitled'}</h3>
							<span class="text-xs text-gray-300">${new Date(row.created_at).toLocaleDateString()}</span>
						</div>
					</div>
                    <div class="text-right">
                        <p class="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Uploader Badge</p>
                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-semibold"
                              style="border-color:${badgeMeta.color};color:${badgeMeta.color}"
                              title="Badge earned by the uploader">
                            <i class="fas ${badgeMeta.icon}"></i>${badgeMeta.label}
                        </span>
                        <div class="text-xs text-gray-200 mt-1 font-semibold"
                             title="Total lifetime points earned by the uploader">
                            Uploader Points: ${formatPoints(points)}
                        </div>
                    </div>
				</div>
				<div class="text-sm text-purple-200">${row.subject || 'General'}</div>
				<p class="text-gray-300 text-sm line-clamp-3">${row.description || ''}</p>
				<div class="text-xs text-gray-400">
                    <span class="font-semibold text-gray-200">Uploader:</span>
                    ${row.uploader_email || 'anonymous'}
                    <span class="text-gray-500">• ${badgeMeta.label} • ${formatPoints(points)} pts total</span>
                    <span class="text-gray-500 block sm:inline">• File size: ${kb.toFixed(0)} KB</span>
                </div>
				<div class="flex gap-2">
					<button class="view glass-button px-3 py-2 rounded-lg border border-white/20 text-white">View</button>
					<button class="download glass-button px-3 py-2 rounded-lg border border-white/20 text-white">Download</button>
                    <button class="tip glass-button px-3 py-2 rounded-lg border border-white/20 text-white" title="Send an encouragement tip">
                        <i class="fas fa-gift text-sm mr-1"></i>Tip +5/+10
                    </button>
					<button class="share glass-button px-3 py-2 rounded-lg border border-white/20 text-white" title="Share this note">
						<i class="fas fa-share-alt text-sm"></i>
					</button>
				</div>
			</div>
		`;
    }

    function getOwnerId(row) {
        return row.uploader_id || row.user_id || null;
    }

    async function fetchPointsForNotes(notes) {
        const ids = Array.from(new Set(
            (notes || []).map(getOwnerId).filter(Boolean)
        ));
        if (ids.length === 0) {
            return new Map();
        }
        
        try {
            const { data, error } = await supabase
                .from('user_points')
                .select('user_id,total_points,badge')
                .in('user_id', ids);
            
            if (error) {
                console.warn('Failed to load user points:', error);
                return new Map();
            }
            
            const map = new Map();
            (data || []).forEach(row => {
                map.set(row.user_id, row);
            });
            return map;
        } catch (error) {
            console.warn('Exception loading user points:', error);
            return new Map();
        }
    }

    function getStatsForUser(pointsMap, userId) {
        if (!userId) return { total_points: 0, badge: 'bronze' };
        return pointsMap.get(userId) || { total_points: 0, badge: 'bronze' };
    }

    // Update already-rendered notes with points data when it arrives
    function updateRenderedNotesWithPoints(pointsMap) {
        if (!pointsMap || pointsMap.size === 0) return;
        
        const cards = grid.querySelectorAll('[data-note-id]');
        cards.forEach(card => {
            const noteId = card.getAttribute('data-note-id');
            if (!noteId) return;
            
            // Find the note data from the card
            const uploaderInfo = card.querySelector('.text-xs.text-gray-400');
            const badgeElement = card.querySelector('[title*="Badge"]');
            const pointsElement = card.querySelector('[title*="points"]');
            
            if (!uploaderInfo) return;
            
            // Extract user_id from the card (we need to store it)
            // For now, we'll update what we can see
            const text = uploaderInfo.textContent || '';
            // Try to find user_id from data attribute if we stored it
            const userId = card.getAttribute('data-user-id');
            
            if (userId) {
                const stats = getStatsForUser(pointsMap, userId);
                const badgeMeta = getBadgeMeta(stats.badge);
                
                // Update badge display
                if (badgeElement) {
                    badgeElement.innerHTML = `<i class="fas ${badgeMeta.icon}"></i>${badgeMeta.label}`;
                    badgeElement.style.borderColor = badgeMeta.color;
                    badgeElement.style.color = badgeMeta.color;
                }
                
                // Update points display
                if (pointsElement) {
                    pointsElement.textContent = `Uploader Points: ${formatPoints(stats.total_points)}`;
                }
            }
        });
    }

    async function recordDownloadEvent(noteRow) {
        const session = currentSession || await refreshSession();
        if (!session?.user?.id) return;
        const ownerId = getOwnerId(noteRow);
        try {
            await supabase
                .from('note_download_events')
                .insert({
                    note_id: noteRow.id,
                    downloader_id: session.user.id,
                    uploader_id: ownerId
                });
        } catch (error) {
            console.warn('Download event logging failed:', error);
        }
    }

    function promptTipAmount(note) {
        return new Promise(resolve => {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4';
            modal.innerHTML = `
                <div class="glass-panel rounded-2xl p-6 max-w-sm w-full border border-white/20">
                    <h3 class="text-white text-lg font-semibold mb-2">Tip ${note.title || 'this note'}?</h3>
                    <p class="text-gray-300 text-sm mb-4">Choose a tip amount to thank the uploader.</p>
                    <div class="flex gap-3 mb-4">
                        <button data-tip-value="5" class="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-[1.01] transition">
                            +5 points
                        </button>
                        <button data-tip-value="10" class="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-semibold hover:scale-[1.01] transition">
                            +10 points
                        </button>
                    </div>
                    <button class="cancel w-full px-4 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition">Cancel</button>
                </div>
            `;
            document.body.appendChild(modal);

            const cleanup = (value = null) => {
                if (modal.parentNode) modal.parentNode.removeChild(modal);
                resolve(value);
            };

            modal.addEventListener('click', (event) => {
                if (event.target === modal) cleanup();
            });

            modal.querySelector('.cancel').addEventListener('click', () => cleanup());
            modal.querySelectorAll('[data-tip-value]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const val = parseInt(btn.dataset.tipValue, 10);
                    cleanup(Number.isNaN(val) ? null : val);
                });
            });
        });
    }

    async function handleTip(noteRow) {
        const session = await ensureAuthenticated('send a tip');
        if (!session?.user) return;

        const ownerId = getOwnerId(noteRow);
        if (session.user.id === ownerId) {
            showToast('You cannot tip your own note.', { variant: 'warning' });
            return;
        }

        const amount = await promptTipAmount(noteRow);
        if (!amount) return;

        const pendingToast = showToast('Sending tip…', { variant: 'info', duration: 0 });

        const { error } = await supabase
            .from('tip_transactions')
            .insert({
                note_id: noteRow.id,
                uploader_id: ownerId,
                tipper_id: session.user.id,
                points: amount
            });

        pendingToast.hide && pendingToast.hide();

        if (error) {
            console.error('Tip failed:', error);
            showToast(error.message || 'Unable to send tip.', { variant: 'error' });
            return;
        }

        showToast(`Tip sent! (+${amount} points)`, { variant: 'success' });
        fetchNotes();
    }

    // Normalize a stored object path and detect embedded bucket name
    function normalizeObjectPath(rawPath) {
        if (!rawPath) return { bucket: null, path: null };
        let bucket = null;
        let path = String(rawPath)
            .replace(/[?#].*$/, '')
            .replace(/^https?:\/\/[^\s]+\/storage\/v1\/object\//, '');
        // If path now looks like "public/<bucket>/<key>" or "<bucket>/<key>"
        const parts = path.split('/');
        if (parts.length > 1) {
            // Handle optional visibility prefix like 'public'
            if (parts[0] === 'public' || parts[0] === 'authenticated' || parts[0] === 'private') {
                parts.shift();
            }
            bucket = parts.shift();
            path = parts.join('/');
        } else {
            path = rawPath; // fallback to original
        }
        try { path = decodeURIComponent(path); } catch { }
        return { bucket, path };
    }

    function buildPathCandidates(objectPath, filename, uploaderId, userId) {
        const candidates = new Set();
        if (objectPath) {
            candidates.add(String(objectPath));
            candidates.add(String(objectPath).replace(/[?#].*$/, ''));
            candidates.add(String(objectPath).replace(/^\/+/, ''));
            const fromUrl = String(objectPath)
                .replace(/[?#].*$/, '')
                .replace(/^https?:\/\/[^\s]+\/storage\/v1\/object\//, '');
            candidates.add(fromUrl);
            const parts = fromUrl.split('/');
            if (parts.length > 1) {
                const maybeBucket = parts[0];
                candidates.add(parts.slice(1).join('/'));
                if (['public', 'authenticated', 'private'].includes(maybeBucket) && parts.length > 2) {
                    candidates.add(parts.slice(2).join('/'));
                }
            }
        }
        if (filename) candidates.add(String(filename));
        const ownerId = uploaderId || userId;
        if (ownerId && filename) {
            candidates.add(`${ownerId}/${filename}`);
            candidates.add(`${ownerId}/${encodeURIComponent(filename)}`);
        }
        // Also try decoded versions
        const more = Array.from(candidates).map(k => { try { return decodeURIComponent(k); } catch { return k; } });
        more.forEach(k => candidates.add(k));
        return Array.from(candidates).filter(Boolean);
    }

    async function createSignedUrlWithFallback(supabase, primaryBucket, objectPath, seconds, downloadName, filename, uploaderId, userId) {
        const candidates = [primaryBucket, 'STORAGE_BUCKET', 'files', 'documents'];
        // If objectPath embeds a bucket, prefer that one first
        const embedded = normalizeObjectPath(objectPath);
        if (embedded.bucket && embedded.path) {
            candidates.unshift(embedded.bucket);
            objectPath = embedded.path;
        }
        const tried = new Set();
        const keyCandidates = buildPathCandidates(objectPath, filename, uploaderId, userId);
        for (const b of candidates) {
            if (!b || tried.has(b)) continue; tried.add(b);
            for (const key of keyCandidates) {
                const { data, error } = await supabase
                    .storage.from(b)
                    .createSignedUrl(key, seconds, { download: downloadName });
                if (!error && data?.signedUrl) return { signedUrl: data.signedUrl, bucket: b };
            }
        }
        return { signedUrl: null, bucket: null };
    }

    // Simple search functionality - no complex semantic search needed

    async function fetchNotes() {
        const term = (q.value || '').trim();
        const subject = (subjectFilter.value || '').trim();

        console.log('Searching for:', term, 'Subject:', subject);

        // Show loading indicator
        grid.innerHTML = `
            <div class="col-span-full flex justify-center items-center py-12">
                <div class="text-center">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                    <p class="text-gray-300">Loading notes...</p>
                </div>
            </div>
        `;

        // Show search status indicator
        const searchStatus = document.getElementById('searchStatus');
        if (searchStatus && term) {
            searchStatus.classList.remove('hidden');
        }

        try {
            // Build the query with timeout protection
            let query = supabase
                .from('notes')
                .select('id,title,subject,description,file_url,filename,file_size,uploader_email,uploader_id,user_id,created_at,is_approved,thumbnail_url')
                .eq('is_approved', true)
                .order('created_at', { ascending: false })
                .limit(60);

            // Apply subject filter if specified
            if (subject) {
                query = query.eq('subject', subject);
            }

            // Apply search term if specified
            if (term) {
                // Search in title, subject, and uploader_email using OR conditions
                query = query.or(`title.ilike.%${term}%,subject.ilike.%${term}%,uploader_email.ilike.%${term}%`);
            }

            // Add timeout to prevent hanging
            const queryPromise = query;
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Query timeout after 10 seconds')), 10000)
            );
            
            const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

            if (error) {
                console.error('Database query error:', error);
                grid.innerHTML = `
                    <div class="text-center py-8">
                        <div class="text-red-400 mb-4">
                            <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                            <h3 class="text-xl font-semibold mb-2">Search Error</h3>
                            <p class="text-sm">Failed to search notes.</p>
                            <p class="text-xs mt-2">Error: ${error.message}</p>
                        </div>
                        <button onclick="location.reload()" class="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors text-sm">
                            <i class="fas fa-refresh mr-2"></i>Reload Page
                        </button>
                    </div>
                `;
                if (searchStatus) searchStatus.classList.add('hidden');
                return;
            }

            // Deduplicate notes by ID to prevent duplicates
            const uniqueNotes = data ? data.filter((note, index, self) =>
                index === self.findIndex(n => n.id === note.id)
            ) : [];


            if (!data || data.length === 0) {
                if (term) {
                    grid.innerHTML = `
                        <div class="text-center py-8">
                            <div class="text-gray-300 mb-4">
                                <i class="fas fa-search text-4xl mb-4"></i>
                                <h3 class="text-xl font-semibold mb-2">No results found for "${term}"</h3>
                                <p class="text-sm">Try different keywords or check your spelling.</p>
                            </div>
                            <div class="text-xs text-gray-400">
                                <p>Search suggestions:</p>
                                <ul class="mt-2 space-y-1">
                                    <li>• Check spelling of your search term</li>
                                    <li>• Try searching by title, subject, or uploader email</li>
                                    <li>• Use broader terms</li>
                                </ul>
                            </div>
                        </div>
                    `;
                } else {
                    grid.innerHTML = '<div class="text-gray-300">No notes found.</div>';
                }
                if (searchStatus) searchStatus.classList.add('hidden');
                return;
            }

            await renderNotes(uniqueNotes);

        } catch (error) {
            console.error('Search failed:', error);
            const isTimeout = error.message && error.message.includes('timeout');
            grid.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-red-400 mb-4">
                        <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                        <h3 class="text-xl font-semibold mb-2">${isTimeout ? 'Request Timeout' : 'Search System Error'}</h3>
                        <p class="text-sm">${isTimeout ? 'The request took too long. This might be a database connection issue.' : 'Unable to perform search. Please try again later.'}</p>
                        ${error.message ? `<p class="text-xs mt-2 text-gray-400">${error.message}</p>` : ''}
                    </div>
                    <div class="flex gap-3 justify-center">
                        <button onclick="fetchNotes()" class="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors text-sm">
                            <i class="fas fa-redo mr-2"></i>Retry
                        </button>
                        <button onclick="location.reload()" class="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-sm">
                            <i class="fas fa-refresh mr-2"></i>Reload Page
                        </button>
                    </div>
                </div>
            `;
        }

        // Hide search status indicator
        if (searchStatus) searchStatus.classList.add('hidden');
    }

    async function renderNotes(notes) {
        // Clear grid completely and reset state
        grid.innerHTML = '';
        empty.classList.add('hidden');

        if (!notes || notes.length === 0) {
            empty.classList.remove('hidden');
            return;
        }


        // Check if user is authenticated once
        const session = await refreshSession();
        const isAuthenticated = !!session?.user;
        
        // Start points fetch in background - don't block rendering
        let pointsMap = new Map();
        const pointsPromise = fetchPointsForNotes(notes).then(map => {
            pointsMap = map;
            // Update points for already rendered notes
            updateRenderedNotesWithPoints(pointsMap);
        }).catch(err => {
            console.warn('Points fetch failed (non-blocking):', err);
        });

        // Render all notes immediately without waiting for points
        notes.forEach((row) => {
            const wrap = document.createElement('div');
            const stats = getStatsForUser(pointsMap, getOwnerId(row)); // Will use default values initially
            wrap.innerHTML = renderCard(row, stats).trim();
            const el = wrap.firstElementChild;
            
            // Store note ID and user ID for later points update
            if (el) {
                el.setAttribute('data-note-id', row.id);
                const ownerId = getOwnerId(row);
                if (ownerId) {
                    el.setAttribute('data-user-id', ownerId);
                }
            }
            
            grid.appendChild(el);

            const viewBtn = el.querySelector('.view');
            const downloadBtn = el.querySelector('.download');
            const shareBtn = el.querySelector('.share');
            const tipBtn = el.querySelector('.tip');

            // Set up authentication-based button states
            if (!isAuthenticated) {
                // For anonymous users, show sign-in prompts for both view and download
                viewBtn.textContent = 'Sign in to View';
                downloadBtn.textContent = 'Sign in to Download';
                viewBtn.classList.add('opacity-60', 'cursor-not-allowed');
                downloadBtn.classList.add('opacity-60', 'cursor-not-allowed');
            }

            const openSigned = async (download) => {
                // Check authentication for both view and download
                if (!isAuthenticated) {
                    const action = download ? 'download' : 'view';
                    if (confirm(`You need to sign in to ${action} notes. Would you like to go to the login page?`)) {
                        window.location.href = 'login.html';
                    }
                    return;
                }

                // Validate file availability only when user actually tries to access it
                let objectAvailable = true;
                try {
                    const probe = await createSignedUrlWithFallback(
                        supabase,
                        STORAGE_BUCKET,
                        row.file_url,
                        60, // short-lived probe
                        undefined,
                        row.filename,
                        row.uploader_id,
                        row.user_id
                    );
                    if (!probe.signedUrl) objectAvailable = false;
                } catch { objectAvailable = false; }

                if (!objectAvailable) {
                    alert('This file is currently unavailable.');
                    return;
                }

                // Inform user that download/view is starting
                const toast = showToast(download ? 'Your download is starting…' : 'Opening note…', { duration: 2200, variant: 'success' });

                const path = row.file_url;
                const downloadName = download ? (row.filename || row.title || 'file') : undefined;
                const result = await createSignedUrlWithFallback(supabase, STORAGE_BUCKET, path, 60 * 60, downloadName, row.filename, row.uploader_id, row.user_id);
                if (!result.signedUrl) {
                    toast.hide && toast.hide();
                    alert('This file is currently unavailable.');
                    return;
                }
                if (download) {
                    await recordDownloadEvent(row);
                }
                window.open(result.signedUrl, '_blank', 'noopener');
                // Ensure toast is removed shortly after
                setTimeout(() => { toast.hide && toast.hide(); }, 800);
            };

            viewBtn.addEventListener('click', () => openSigned(false));
            downloadBtn.addEventListener('click', () => openSigned(true));
            shareBtn.addEventListener('click', () => shareNote(row));
            if (tipBtn) {
                tipBtn.addEventListener('click', () => handleTip(row));

                if (session?.user?.id && session.user.id === getOwnerId(row)) {
                    tipBtn.disabled = true;
                    tipBtn.title = 'You cannot tip your own note';
                    tipBtn.classList.add('opacity-60', 'cursor-not-allowed');
                }
            }
        });
    }

    // Share functionality
    function shareNote(note) {
        const shareUrl = `${window.location.origin}/browse.html?noteId=${note.id}`;
        const shareText = `Check out this amazing note: "${note.title || note.subject}" on sharedstudy.vercel.app!`;

        // Create share modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gradient-to-br from-white/10 to-purple-900/20 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-md w-full mx-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-white font-bold text-lg">Share This Note</h3>
                    <button class="close-share text-gray-400 hover:text-white text-xl">&times;</button>
                </div>
                <div class="mb-4">
                    <p class="text-gray-300 text-sm mb-3">Share "${note.title || note.subject}" with others:</p>
                    <div class="flex gap-2 mb-4">
                        <button class="share-btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors" data-platform="twitter">
                            <i class="fab fa-twitter"></i> Twitter
                        </button>
                        <button class="share-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors" data-platform="facebook">
                            <i class="fab fa-facebook"></i> Facebook
                        </button>
                        <button class="share-btn bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors" data-platform="linkedin">
                            <i class="fab fa-linkedin"></i> LinkedIn
                        </button>
                    </div>
                    <div class="flex gap-2">
                        <button class="share-btn bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors" data-platform="whatsapp">
                            <i class="fab fa-whatsapp"></i> WhatsApp
                        </button>
                        <button class="share-btn bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors" data-platform="telegram">
                            <i class="fab fa-telegram"></i> Telegram
                        </button>
                        <button class="copy-link bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                            <i class="fas fa-copy"></i> Copy Link
                        </button>
                    </div>
                </div>
                <div class="text-xs text-gray-400">
                    <p>Help others discover amazing study materials!</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle share buttons
        modal.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const platform = btn.dataset.platform;
                shareToPlatform(platform, shareUrl, shareText);
            });
        });

        // Handle copy link
        const copyBtn = modal.querySelector('.copy-link');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(shareUrl).then(() => {
                copyBtn.textContent = 'Copied!';
                copyBtn.classList.add('bg-green-600');
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Link';
                    copyBtn.classList.remove('bg-green-600');
                }, 2000);
            });
        });

        // Handle close
        modal.querySelector('.close-share').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    function shareToPlatform(platform, url, text) {
        const encodedUrl = encodeURIComponent(url);
        const encodedText = encodeURIComponent(text);

        let shareUrl = '';
        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
                break;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    }

    // Auth check and profile link setup
    async function checkAuth() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            // Show profile link for authenticated users
            const profileLink = document.getElementById('profileLink');
            if (profileLink) {
                profileLink.classList.remove('hidden');
            }
        }
    }

    q.addEventListener('input', fetchNotes);
    subjectFilter.addEventListener('change', fetchNotes);

    // Test function for debugging
    window.testSearch = async function () {
        console.log('Testing search functionality...');
        try {
            // Test 1: Basic connection
            console.log('Test 1: Basic connection...');
            const { data: basicData, error: basicError } = await supabase
                .from('notes')
                .select('id')
                .limit(1);

            if (basicError) {
                console.error('Basic connection failed:', basicError);
                alert('Basic connection failed: ' + basicError.message);
                return;
            }

            // Test 2: Approved notes
            console.log('Test 2: Approved notes...');
            const { data: approvedData, error: approvedError } = await supabase
                .from('notes')
                .select('id,title,subject')
                .eq('is_approved', true)
                .limit(5);

            if (approvedError) {
                console.error('Approved notes query failed:', approvedError);
                alert('Approved notes query failed: ' + approvedError.message);
                return;
            }

            // Test 3: Full query
            console.log('Test 3: Full query...');
            const { data: fullData, error: fullError } = await supabase
                .from('notes')
                .select('id,title,subject,description,file_url,filename,file_size,uploader_email,created_at,is_approved')
                .eq('is_approved', true)
                .limit(3);

            if (fullError) {
                console.error('Full query failed:', fullError);
                alert('Full query failed: ' + fullError.message);
                return;
            }

            console.log('All tests passed!');
            console.log('Basic data:', basicData);
            console.log('Approved notes:', approvedData);
            console.log('Full data:', fullData);
            alert(`Database connection working!\n\nBasic: ${basicData?.length || 0} records\nApproved: ${approvedData?.length || 0} notes\nFull query: ${fullData?.length || 0} notes`);

        } catch (err) {
            console.error('Test failed:', err);
            alert('Test failed: ' + err.message);
        }
    };

    checkAuth();
    fetchNotes();
})();


