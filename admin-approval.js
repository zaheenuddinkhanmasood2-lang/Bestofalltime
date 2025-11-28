// Admin Approval Interface
// Handles reviewing, approving, and rejecting notes

(function () {
    const supabase = window.getSupabaseClient();
    const DESIGNATED_ADMIN_EMAIL = 'nazimuddinkhanmasood@gmail.com'.toLowerCase();
    const BADGE_META = {
        bronze: { label: 'Bronze', color: 'text-amber-300', border: 'border-amber-400/40', icon: 'fa-medal' },
        silver: { label: 'Silver', color: 'text-gray-100', border: 'border-gray-200/60', icon: 'fa-medal' },
        gold: { label: 'Gold', color: 'text-yellow-300', border: 'border-yellow-400/60', icon: 'fa-trophy' },
        legendary: { label: 'Legendary', color: 'text-orange-300', border: 'border-orange-400/60', icon: 'fa-crown' }
    };
    let currentFilter = 'pending'; // 'pending', 'approved', 'rejected'
    let currentNotes = [];
    let hasAdminAccess = false;
    let auditEntries = [];
    let uploaderStats = new Map();
    const AUDIT_EVENT_META = {
        upload_award: { icon: 'fa-arrow-up', color: 'text-sky-300', label: 'Upload points' },
        download_award: { icon: 'fa-download', color: 'text-emerald-300', label: 'Download points' },
        tip_award: { icon: 'fa-gift', color: 'text-pink-300', label: 'Tip received' },
        tip_given: { icon: 'fa-hand-holding-heart', color: 'text-rose-300', label: 'Tip sent' },
        badge_upgrade: { icon: 'fa-medal', color: 'text-amber-300', label: 'Badge upgrade' },
        flag_uploader_daily_cap: { icon: 'fa-flag', color: 'text-yellow-300', label: 'Uploader cap reached' },
        tip_limit_blocked: { icon: 'fa-ban', color: 'text-red-300', label: 'Tip blocked' },
        tip_blocked_uploader_cap: { icon: 'fa-ban', color: 'text-red-300', label: 'Tip blocked' },
        suspicious_download_burst: { icon: 'fa-triangle-exclamation', color: 'text-orange-300', label: 'Suspicious downloads' }
    };

    // DOM Elements
    const notesContainer = document.getElementById('notesContainer');
    const emptyState = document.getElementById('emptyState');
    const pendingCount = document.getElementById('pendingCount');
    const refreshBtn = document.getElementById('refreshBtn');
    const tabPending = document.getElementById('tabPending');
    const tabApproved = document.getElementById('tabApproved');
    const tabRejected = document.getElementById('tabRejected');
    const noteModal = document.getElementById('noteModal');
    const modalContent = document.getElementById('modalContent');
    const logoutBtn = document.getElementById('logoutBtn');
    const auditLogContainer = document.getElementById('auditLogContainer');
    const auditRefreshBtn = document.getElementById('auditRefreshBtn');

    function getBadgeMeta(badgeId) {
        return BADGE_META[badgeId] || BADGE_META.bronze;
    }

    function formatPoints(points) {
        return new Intl.NumberFormat('en-US').format(points || 0);
    }

    function getStatsForUser(userId) {
        if (!userId) return { total_points: 0, badge: 'bronze' };
        return uploaderStats.get(userId) || { total_points: 0, badge: 'bronze' };
    }

    // Check admin status
    async function checkAdminStatus() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return false;
        }

        const normalizedEmail = (session.user.email || '').toLowerCase();
        const isDesignatedAdmin = normalizedEmail === DESIGNATED_ADMIN_EMAIL;
        if (!isDesignatedAdmin) {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return false;
        }

        const { data: authData } = await supabase
            .from('authorized_uploaders')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('is_active', true)
            .maybeSingle();

        if (!authData) {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return false;
        }

        hasAdminAccess = true;
        return true;
    }

    // Load notes based on filter
    async function loadNotes() {
        try {
            notesContainer.innerHTML = `
                <div class="glass-card p-8 rounded-2xl shadow-2xl text-center">
                    <i class="fas fa-spinner fa-spin text-4xl text-purple-400 mb-4"></i>
                    <p class="text-gray-300">Loading notes...</p>
                </div>
            `;

            let query = supabase
                .from('notes')
                .select('*')
                .order('created_at', { ascending: false });

            if (currentFilter === 'pending') {
                query = query.eq('is_approved', false);
            } else if (currentFilter === 'approved') {
                query = query.eq('is_approved', true);
            } else if (currentFilter === 'rejected') {
                // Show notes that have been explicitly rejected (have rejection_reason)
                // For now, we'll show all non-approved notes as "rejected" if they have a rejection_reason
                // You may want to add a separate 'status' column for better tracking
                query = query.eq('is_approved', false);
                // Note: This will show all pending notes until rejection_reason column is added
                // After adding the column, you can filter by: .not('rejection_reason', 'is', null)
            }

            const { data: notes, error } = await query;

            if (error) throw error;

            currentNotes = notes || [];
            await fetchUploaderStats(currentNotes);
            renderNotes(currentNotes);

            // Update pending count
            if (currentFilter === 'pending') {
                const { count } = await supabase
                    .from('notes')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_approved', false);
                pendingCount.textContent = count || 0;
            }
        } catch (error) {
            console.error('Error loading notes:', error);
            notesContainer.innerHTML = `
                <div class="glass-card p-8 rounded-2xl shadow-2xl text-center text-red-400">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p>Error loading notes: ${error.message}</p>
                </div>
            `;
        }
    }

    async function fetchUploaderStats(notes) {
        const ids = Array.from(new Set(
            (notes || []).map(note => note.user_id).filter(Boolean)
        ));
        if (!ids.length) {
            uploaderStats = new Map();
            return;
        }

        const { data, error } = await supabase
            .from('user_points')
            .select('user_id,total_points,badge')
            .in('user_id', ids);

        if (error) {
            console.warn('Unable to load uploader stats:', error);
            uploaderStats = new Map();
            return;
        }

        uploaderStats = new Map();
        (data || []).forEach(row => uploaderStats.set(row.user_id, row));
    }

    async function loadAuditLog() {
        if (!auditLogContainer || !hasAdminAccess) return;
        auditLogContainer.innerHTML = `
            <div class="text-gray-400 text-sm flex items-center gap-2">
                <i class="fas fa-spinner fa-spin"></i>
                Loading audit events…
            </div>
        `;

        try {
            const { data, error } = await supabase
                .from('points_audit_log')
                .select('event_type,user_id,actor_id,note_id,points,metadata,created_at')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            auditEntries = data || [];
            renderAuditLog();
        } catch (error) {
            console.error('Error loading audit log:', error);
            auditLogContainer.innerHTML = `
                <div class="text-red-300 text-sm">
                    Unable to load audit events: ${error.message}
                </div>
            `;
        }
    }

    function renderAuditLog() {
        if (!auditLogContainer) return;
        if (!auditEntries.length) {
            auditLogContainer.innerHTML = `
                <div class="text-gray-400 text-sm">
                    No audit events recorded yet.
                </div>
            `;
            return;
        }

        auditLogContainer.innerHTML = auditEntries.map(entry => {
            const meta = AUDIT_EVENT_META[entry.event_type] || { icon: 'fa-info-circle', color: 'text-gray-300', label: entry.event_type };
            return `
                <div class="p-4 rounded-2xl border border-white/10 bg-white/5 flex items-start justify-between gap-4">
                    <div class="flex items-start gap-3">
                        <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ${meta.color}">
                            <i class="fas ${meta.icon}"></i>
                        </div>
                        <div>
                            <p class="text-white font-semibold">${meta.label}</p>
                            <p class="text-gray-300 text-sm">${summarizeAudit(entry)}</p>
                            <div class="text-xs text-gray-400 mt-1">
                                User: ${shortenId(entry.user_id)} • Actor: ${shortenId(entry.actor_id)} • Note: ${shortenId(entry.note_id)}
                            </div>
                        </div>
                    </div>
                    <div class="text-right text-sm text-gray-400">
                        <div>${formatDate(entry.created_at)}</div>
                        ${entry.points ? `<div class="text-purple-300 font-semibold">Points: ${entry.points}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function summarizeAudit(entry) {
        const meta = (entry.metadata && typeof entry.metadata === 'object') ? entry.metadata : {};
        switch (entry.event_type) {
            case 'upload_award':
                return 'Uploader earned +10 points for a note upload.';
            case 'download_award':
                return 'Uploader earned +1 point for a download.';
            case 'tip_award':
                return 'Uploader received a tip.';
            case 'tip_given':
                return 'Downloader sent a tip.';
            case 'badge_upgrade':
                return `Badge upgraded to ${meta.badge || 'new tier'}.`;
            case 'flag_uploader_daily_cap':
                return 'Uploader hit the 200-point daily earnings limit.';
            case 'tip_limit_blocked':
                return 'Tip blocked: giver reached daily tipping cap.';
            case 'tip_blocked_uploader_cap':
                return 'Tip blocked: uploader already at daily earnings cap.';
            case 'suspicious_download_burst':
                return `Suspicious download burst detected (${meta.recent_attempts || 'multiple'} attempts).`;
            default:
                return Object.keys(meta).length ? JSON.stringify(meta) : 'No additional metadata.';
        }
    }

    function shortenId(id) {
        if (!id) return '—';
        return `${id.slice(0, 4)}…${id.slice(-4)}`;
    }

    // Render notes list
    function renderNotes(notes) {
        if (notes.length === 0) {
            notesContainer.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        notesContainer.classList.remove('hidden');
        emptyState.classList.add('hidden');

        notesContainer.innerHTML = notes.map(note => {
            const stats = getStatsForUser(note.user_id);
            const badgeMeta = getBadgeMeta(stats.badge);
            return `
            <div class="glass-card p-6 rounded-2xl shadow-2xl hover:shadow-purple-500/20 transition-all cursor-pointer" 
                 onclick="openNoteModal('${note.id}')">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-2">
                            <h3 class="text-xl font-bold text-white">${escapeHtml(note.title || note.filename)}</h3>
                            ${note.is_approved ?
                '<span class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium"><i class="fas fa-check-circle mr-1"></i>Approved</span>' :
                '<span class="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium"><i class="fas fa-clock mr-1"></i>Pending</span>'
            }
                        </div>
                        <p class="text-gray-300 mb-2">${escapeHtml(note.subject || 'No subject')}</p>
                        ${note.description ? `<p class="text-gray-400 text-sm mb-3 line-clamp-2">${escapeHtml(note.description)}</p>` : ''}
                        <div class="flex items-center space-x-4 text-sm text-gray-400">
                            <span><i class="fas fa-user mr-1"></i>${escapeHtml(note.uploader_email || 'Unknown')}</span>
                            <span><i class="fas fa-calendar mr-1"></i>${formatDate(note.created_at)}</span>
                            ${note.file_size ? `<span><i class="fas fa-file mr-1"></i>${formatFileSize(note.file_size)}</span>` : ''}
                        </div>
                        <div class="flex items-center gap-2 mt-3">
                            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${badgeMeta.border} ${badgeMeta.color}">
                                <i class="fas ${badgeMeta.icon}"></i>${badgeMeta.label} Uploader
                            </span>
                            <span class="text-xs text-purple-200 font-semibold" title="Lifetime uploader points">
                                ${formatPoints(stats.total_points)} pts
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 ml-4">
                        ${!note.is_approved ? `
                            <button onclick="event.stopPropagation(); approveNote('${note.id}')" 
                                    class="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all">
                                <i class="fas fa-check mr-1"></i>Approve
                            </button>
                            <button onclick="event.stopPropagation(); rejectNote('${note.id}')" 
                                    class="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all">
                                <i class="fas fa-times mr-1"></i>Reject
                            </button>
                        ` : ''}
                        <button onclick="event.stopPropagation(); openNoteModal('${note.id}')" 
                                class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all">
                            <i class="fas fa-eye mr-1"></i>View
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }

    // Open note detail modal
    window.openNoteModal = async function (noteId) {
        const note = currentNotes.find(n => n.id === noteId);
        if (!note) return;

        // Get signed URL for file
        let fileUrl = '#';
        if (note.file_url) {
            const { data: signedData } = await supabase
                .storage.from('notes')
                .createSignedUrl(note.file_url, 3600); // 1 hour
            if (signedData) fileUrl = signedData.signedUrl;
        }

        let thumbnailUrl = '';
        if (note.thumbnail_url) {
            const { data: thumbData } = await supabase
                .storage.from('thumbnails')
                .createSignedUrl(note.thumbnail_url, 3600);
            if (thumbData) thumbnailUrl = thumbData.signedUrl;
        }

        const stats = getStatsForUser(note.user_id);
        const badgeMeta = getBadgeMeta(stats.badge);

        modalContent.innerHTML = `
            <h2 class="text-2xl font-bold text-white mb-4">${escapeHtml(note.title || note.filename)}</h2>
            
            ${thumbnailUrl ? `
                <div class="mb-4">
                    <img src="${thumbnailUrl}" alt="Thumbnail" class="w-full max-w-md rounded-lg border border-white/20">
                </div>
            ` : ''}

            <div class="space-y-4 mb-6">
                <div>
                    <label class="text-gray-400 text-sm">Subject</label>
                    <p class="text-white">${escapeHtml(note.subject || 'N/A')}</p>
                </div>
                ${note.description ? `
                    <div>
                        <label class="text-gray-400 text-sm">Description</label>
                        <p class="text-white">${escapeHtml(note.description)}</p>
                    </div>
                ` : ''}
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-gray-400 text-sm">Uploader</label>
                        <p class="text-white">${escapeHtml(note.uploader_email || 'Unknown')}</p>
                    </div>
                    <div>
                        <label class="text-gray-400 text-sm">Upload Date</label>
                        <p class="text-white">${formatDate(note.created_at)}</p>
                    </div>
                    ${note.file_size ? `
                        <div>
                            <label class="text-gray-400 text-sm">File Size</label>
                            <p class="text-white">${formatFileSize(note.file_size)}</p>
                        </div>
                    ` : ''}
                    <div>
                        <label class="text-gray-400 text-sm">Status</label>
                        <p class="text-white">
                            ${note.is_approved ?
                '<span class="text-green-400"><i class="fas fa-check-circle mr-1"></i>Approved</span>' :
                '<span class="text-yellow-400"><i class="fas fa-clock mr-1"></i>Pending</span>'
            }
                        </p>
                    </div>
                </div>
                <div class="mt-4 p-3 rounded-xl border border-white/10 bg-white/5 flex items-center justify-between">
                    <div>
                        <p class="text-xs uppercase tracking-wide text-gray-400">Uploader Badge</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${badgeMeta.border} ${badgeMeta.color}">
                                <i class="fas ${badgeMeta.icon}"></i>${badgeMeta.label}
                            </span>
                            <span class="text-sm text-purple-200 font-semibold">${formatPoints(stats.total_points)} pts total</span>
                        </div>
                    </div>
                    <div class="text-right text-xs text-gray-400">
                        Points accrue from uploads, downloads, tips
                    </div>
                </div>
            </div>

            <div class="flex space-x-3">
                ${!note.is_approved ? `
                    <button onclick="approveNote('${note.id}')" 
                            class="flex-1 px-6 py-3 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all font-medium">
                        <i class="fas fa-check mr-2"></i>Approve
                    </button>
                    <button onclick="rejectNote('${note.id}')" 
                            class="flex-1 px-6 py-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-medium">
                        <i class="fas fa-times mr-2"></i>Reject
                    </button>
                ` : ''}
                <a href="${fileUrl}" target="_blank" 
                   class="px-6 py-3 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all font-medium text-center">
                    <i class="fas fa-download mr-2"></i>View File
                </a>
            </div>
        `;

        noteModal.classList.remove('hidden');
    };

    // Close modal
    window.closeModal = function () {
        noteModal.classList.add('hidden');
    };

    // Approve note
    window.approveNote = async function (noteId) {
        if (!hasAdminAccess) {
            showNotification('Access denied. Admin privileges required.', 'error');
            return;
        }
        if (!confirm('Are you sure you want to approve this note?')) return;

        try {
            const { error } = await supabase
                .from('notes')
                .update({
                    is_approved: true,
                    is_public: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', noteId);

            if (error) throw error;

            showNotification('Note approved successfully!', 'success');
            closeModal();
            loadNotes();
        } catch (error) {
            console.error('Error approving note:', error);
            showNotification('Error approving note: ' + error.message, 'error');
        }
    };

    // Reject note
    window.rejectNote = async function (noteId) {
        if (!hasAdminAccess) {
            showNotification('Access denied. Admin privileges required.', 'error');
            return;
        }
        const reason = prompt('Please provide a reason for rejection (optional):');

        try {
            const { error } = await supabase
                .from('notes')
                .update({
                    is_approved: false,
                    is_public: false,
                    rejection_reason: reason || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', noteId);

            if (error) throw error;

            showNotification('Note rejected.', 'info');
            closeModal();
            loadNotes();
        } catch (error) {
            console.error('Error rejecting note:', error);
            showNotification('Error rejecting note: ' + error.message, 'error');
        }
    };

    // Tab switching
    tabPending.addEventListener('click', () => {
        currentFilter = 'pending';
        updateTabs();
        loadNotes();
    });

    tabApproved.addEventListener('click', () => {
        currentFilter = 'approved';
        updateTabs();
        loadNotes();
    });

    tabRejected.addEventListener('click', () => {
        currentFilter = 'rejected';
        updateTabs();
        loadNotes();
    });

    function updateTabs() {
        [tabPending, tabApproved, tabRejected].forEach(tab => {
            tab.classList.remove('active', 'bg-purple-500/20', 'text-purple-400');
            tab.classList.add('text-gray-400', 'hover:text-white');
        });

        const activeTab = currentFilter === 'pending' ? tabPending :
            currentFilter === 'approved' ? tabApproved : tabRejected;
        activeTab.classList.add('active', 'bg-purple-500/20', 'text-purple-400');
        activeTab.classList.remove('text-gray-400');
    }

    // Refresh button
    refreshBtn.addEventListener('click', loadNotes);
    auditRefreshBtn?.addEventListener('click', loadAuditLog);

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    });

    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        let size = bytes;
        while (size >= 1024 && i < units.length - 1) {
            size /= 1024;
            i++;
        }
        return `${size.toFixed(1)} ${units[i]}`;
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-green-500/90 text-white' :
            type === 'error' ? 'bg-red-500/90 text-white' :
                'bg-blue-500/90 text-white'
            }`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Initialize
    (async () => {
        const isAdmin = await checkAdminStatus();
        if (isAdmin) {
            updateTabs();
            loadNotes();
            loadAuditLog();
        }
    })();
})();

