// StudyShare - Note Sharing Platform with Supabase
class StudyShare {
    constructor() {
        this.currentUser = null;
        this.notes = [];
        this.sharedNotes = [];
        this.currentNoteId = null;
        this.isEditing = false;
        this.supabase = null;

        this.initSupabase();
        this.init();
    }

    initSupabase() {
        // Initialize Supabase client
        if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
            this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase initialized successfully');
            this.setupRealtimeSubscriptions();
        } else {
            console.warn('Supabase not configured. Using localStorage fallback.');
        }
    }

    setupRealtimeSubscriptions() {
        if (!this.supabase) return;

        // Subscribe to shared notes changes
        this.supabase
            .channel('shared_notes_changes')
            .on('postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'shared_notes',
                    filter: `shared_with=eq.${this.currentUser?.id || ''}`
                },
                (payload) => {
                    console.log('New shared note received:', payload);
                    this.loadSharedNotes();
                    this.showMessage('You received a new shared note!', 'success');
                }
            )
            .on('postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'shared_notes',
                    filter: `shared_with=eq.${this.currentUser?.id || ''}`
                },
                (payload) => {
                    console.log('Shared note removed:', payload);
                    this.loadSharedNotes();
                }
            )
            .subscribe();

        // Subscribe to notes changes (for real-time updates)
        this.supabase
            .channel('notes_changes')
            .on('postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notes',
                    filter: `author=eq.${this.currentUser?.id || ''}`
                },
                (payload) => {
                    console.log('Note changed:', payload);
                    this.loadNotes();
                }
            )
            .subscribe();
    }

    init() {
        this.setupEventListeners();
        this.setupPageRouting();
        this.checkAuthStatus();
        this.renderNotes();
        this.renderSharedNotes();
        this.setupMobileMenu();
        this.setupScrollEffects();
    }

    // Authentication Methods
    async checkAuthStatus() {
        if (this.supabase) {
            try {
                const { data: { user }, error } = await this.supabase.auth.getUser();
                if (user && !error) {
                    this.currentUser = {
                        id: user.id,
                        name: user.user_metadata?.full_name || user.email,
                        email: user.email,
                        created_at: user.created_at
                    };
                    this.updateAuthUI();
                    await this.loadNotes();
                    await this.loadSharedNotes();
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
            }
        } else {
            // Fallback to localStorage
            const user = localStorage.getItem('currentUser');
            if (user) {
                this.currentUser = JSON.parse(user);
                this.updateAuthUI();
            }
        }
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const navMenu = document.querySelector('.nav-menu');

        if (this.currentUser) {
            loginBtn.textContent = this.currentUser.name;
            registerBtn.textContent = 'Logout';
            registerBtn.onclick = () => this.logout();

            // Show user-specific navigation items
            document.querySelector('[data-page="dashboard"]').style.display = 'block';
            document.querySelector('[data-page="notes"]').style.display = 'block';
            document.querySelector('[data-page="shared"]').style.display = 'block';
            document.querySelector('[data-page="profile"]').style.display = 'block';

            // Update profile information
            this.updateProfileUI();
        } else {
            loginBtn.textContent = 'Login';
            registerBtn.textContent = 'Sign Up';
            registerBtn.onclick = () => this.showRegisterModal();

            // Hide user-specific navigation items
            document.querySelector('[data-page="dashboard"]').style.display = 'none';
            document.querySelector('[data-page="notes"]').style.display = 'none';
            document.querySelector('[data-page="shared"]').style.display = 'none';
            document.querySelector('[data-page="profile"]').style.display = 'none';
        }
    }

    updateProfileUI() {
        if (!this.currentUser) return;

        const profileAvatar = document.getElementById('profileAvatar');
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const profileNameInput = document.getElementById('profileNameInput');
        const profileEmailInput = document.getElementById('profileEmailInput');

        if (profileAvatar) {
            profileAvatar.textContent = this.currentUser.name.charAt(0).toUpperCase();
        }
        if (profileName) {
            profileName.textContent = this.currentUser.name;
        }
        if (profileEmail) {
            profileEmail.textContent = this.currentUser.email;
        }
        if (profileNameInput) {
            profileNameInput.value = this.currentUser.name;
        }
        if (profileEmailInput) {
            profileEmailInput.value = this.currentUser.email;
        }
    }

    async login(email, password) {
        this.showLoading();

        if (this.supabase) {
            try {
                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) {
                    this.hideLoading();
                    this.showMessage(error.message, 'error');
                    return false;
                }

                this.currentUser = {
                    id: data.user.id,
                    name: data.user.user_metadata?.full_name || data.user.email,
                    email: data.user.email,
                    created_at: data.user.created_at
                };

                this.updateAuthUI();
                await this.loadNotes();
                await this.loadSharedNotes();
                this.setupRealtimeSubscriptions();
                this.hideLoading();
                this.showMessage('Welcome back!', 'success');
                this.hideModal('loginModal');
                this.showPage('dashboard');
                return true;
            } catch (error) {
                this.hideLoading();
                this.showMessage('Login failed. Please try again.', 'error');
                return false;
            }
        } else {
            // Fallback to localStorage
            const users = this.loadUsers();
            const user = users.find(u => u.email === email && u.password === password);

            if (user) {
                this.currentUser = user;
                localStorage.setItem('currentUser', JSON.stringify(user));
                this.updateAuthUI();
                this.renderNotes();
                this.showMessage('Welcome back!', 'success');
                this.hideModal('loginModal');
                return true;
            } else {
                this.showMessage('Invalid email or password', 'error');
                return false;
            }
        }
    }

    async register(name, email, password, confirmPassword) {
        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match', 'error');
            return false;
        }

        if (this.supabase) {
            try {
                const { data, error } = await this.supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: name
                        }
                    }
                });

                if (error) {
                    this.showMessage(error.message, 'error');
                    return false;
                }

                if (data.user) {
                    this.currentUser = {
                        id: data.user.id,
                        name: name,
                        email: data.user.email,
                        created_at: data.user.created_at
                    };

                    this.updateAuthUI();
                    await this.loadNotes();
                    await this.loadSharedNotes();
                    this.setupRealtimeSubscriptions();
                    this.showMessage('Account created successfully! Please check your email to verify your account.', 'success');
                    this.hideModal('registerModal');
                    return true;
                }
            } catch (error) {
                this.showMessage('Registration failed. Please try again.', 'error');
                return false;
            }
        } else {
            // Fallback to localStorage
            const users = this.loadUsers();
            if (users.find(u => u.email === email)) {
                this.showMessage('Email already exists', 'error');
                return false;
            }

            const newUser = {
                id: Date.now().toString(),
                name,
                email,
                password,
                createdAt: new Date().toISOString()
            };

            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));

            this.currentUser = newUser;
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            this.updateAuthUI();
            this.renderNotes();
            this.showMessage('Account created successfully!', 'success');
            this.hideModal('registerModal');
            return true;
        }
    }

    async logout() {
        if (this.supabase) {
            try {
                await this.supabase.auth.signOut();
            } catch (error) {
                console.error('Error signing out:', error);
            }
        }

        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.notes = [];
        this.sharedNotes = [];
        this.updateAuthUI();
        this.renderNotes();
        this.renderSharedNotes();
        this.showMessage('Logged out successfully', 'success');
    }

    loadUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    }

    // Note Management Methods
    async loadNotes() {
        if (this.supabase && this.currentUser) {
            try {
                const { data, error } = await this.supabase
                    .from('notes')
                    .select('*')
                    .eq('author', this.currentUser.id)
                    .order('updated_at', { ascending: false });

                if (error) {
                    console.error('Error loading notes:', error);
                    this.notes = [];
                } else {
                    this.notes = data || [];
                }
            } catch (error) {
                console.error('Error loading notes:', error);
                this.notes = [];
            }
        } else {
            // Fallback to localStorage
            this.notes = JSON.parse(localStorage.getItem('notes') || '[]');
        }
    }

    async loadSharedNotes() {
        if (this.supabase && this.currentUser) {
            try {
                const { data, error } = await this.supabase
                    .from('shared_notes')
                    .select(`
                        *,
                        notes!inner(title, content, category, author, author_name, created_at, updated_at)
                    `)
                    .eq('shared_with', this.currentUser.id)
                    .order('shared_at', { ascending: false });

                if (error) {
                    console.error('Error loading shared notes:', error);
                    this.sharedNotes = [];
                } else {
                    this.sharedNotes = (data || []).map(item => ({
                        id: item.id,
                        originalId: item.note_id,
                        title: item.notes.title,
                        content: item.notes.content,
                        category: item.notes.category,
                        author: item.notes.author,
                        authorName: item.notes.author_name,
                        sharedAt: item.shared_at,
                        shareCode: item.share_code
                    }));
                }
            } catch (error) {
                console.error('Error loading shared notes:', error);
                this.sharedNotes = [];
            }
        } else {
            // Fallback to localStorage
            this.sharedNotes = JSON.parse(localStorage.getItem('sharedNotes') || '[]');
        }
    }

    async createNote(title, content, category = 'general') {
        if (!this.currentUser) {
            this.showMessage('Please login to create notes', 'error');
            return;
        }

        if (this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('notes')
                    .insert({
                        title: title || 'Untitled Note',
                        content: content || '',
                        category: category,
                        author: this.currentUser.id,
                        author_name: this.currentUser.name,
                        is_shared: false,
                        share_code: null
                    })
                    .select()
                    .single();

                if (error) {
                    this.showMessage('Error creating note: ' + error.message, 'error');
                    return;
                }

                this.notes.unshift(data);
                this.renderNotes();
                this.showMessage('Note created successfully!', 'success');
                return data;
            } catch (error) {
                this.showMessage('Error creating note. Please try again.', 'error');
                return;
            }
        } else {
            // Fallback to localStorage
            const note = {
                id: Date.now().toString(),
                title: title || 'Untitled Note',
                content: content || '',
                category,
                author: this.currentUser.id,
                authorName: this.currentUser.name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isShared: false,
                shareCode: null
            };

            this.notes.push(note);
            localStorage.setItem('notes', JSON.stringify(this.notes));
            this.renderNotes();
            this.showMessage('Note created successfully!', 'success');
            return note;
        }
    }

    async updateNote(id, title, content, category) {
        if (this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('notes')
                    .update({
                        title: title,
                        content: content,
                        category: category,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id)
                    .eq('author', this.currentUser.id)
                    .select()
                    .single();

                if (error) {
                    this.showMessage('Error updating note: ' + error.message, 'error');
                    return;
                }

                // Update local notes array
                const noteIndex = this.notes.findIndex(note => note.id === id);
                if (noteIndex !== -1) {
                    this.notes[noteIndex] = data;
                }

                this.renderNotes();
                this.showMessage('Note updated successfully!', 'success');
            } catch (error) {
                this.showMessage('Error updating note. Please try again.', 'error');
            }
        } else {
            // Fallback to localStorage
            const noteIndex = this.notes.findIndex(note => note.id === id);
            if (noteIndex !== -1) {
                this.notes[noteIndex].title = title;
                this.notes[noteIndex].content = content;
                this.notes[noteIndex].category = category;
                this.notes[noteIndex].updatedAt = new Date().toISOString();
                localStorage.setItem('notes', JSON.stringify(this.notes));
                this.renderNotes();
                this.showMessage('Note updated successfully!', 'success');
            }
        }
    }

    async deleteNote(id) {
        if (confirm('Are you sure you want to delete this note?')) {
            if (this.supabase) {
                try {
                    const { error } = await this.supabase
                        .from('notes')
                        .delete()
                        .eq('id', id)
                        .eq('author', this.currentUser.id);

                    if (error) {
                        this.showMessage('Error deleting note: ' + error.message, 'error');
                        return;
                    }

                    this.notes = this.notes.filter(note => note.id !== id);
                    this.renderNotes();
                    this.showMessage('Note deleted successfully!', 'success');
                } catch (error) {
                    this.showMessage('Error deleting note. Please try again.', 'error');
                }
            } else {
                // Fallback to localStorage
                this.notes = this.notes.filter(note => note.id !== id);
                localStorage.setItem('notes', JSON.stringify(this.notes));
                this.renderNotes();
                this.showMessage('Note deleted successfully!', 'success');
            }
        }
    }

    async shareNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (!note) return;

        if (this.supabase) {
            try {
                let shareCode = note.share_code;

                if (!note.is_shared) {
                    // Generate share code using Supabase function
                    const { data, error } = await this.supabase
                        .rpc('share_note', { note_uuid: id });

                    if (error) {
                        this.showMessage('Error sharing note: ' + error.message, 'error');
                        return;
                    }

                    shareCode = data;

                    // Update local note
                    const noteIndex = this.notes.findIndex(n => n.id === id);
                    if (noteIndex !== -1) {
                        this.notes[noteIndex].is_shared = true;
                        this.notes[noteIndex].share_code = shareCode;
                    }
                }

                const shareUrl = `${window.location.origin}${window.location.pathname}?shared=${shareCode}`;

                // Copy to clipboard
                navigator.clipboard.writeText(shareUrl).then(() => {
                    this.showMessage('Share link copied to clipboard!', 'success');
                }).catch(() => {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = shareUrl;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    this.showMessage('Share link copied to clipboard!', 'success');
                });

                this.renderNotes();
            } catch (error) {
                this.showMessage('Error sharing note. Please try again.', 'error');
            }
        } else {
            // Fallback to localStorage
            if (!note.isShared) {
                note.isShared = true;
                note.shareCode = this.generateShareCode();
                localStorage.setItem('notes', JSON.stringify(this.notes));
            }

            const shareUrl = `${window.location.origin}${window.location.pathname}?shared=${note.shareCode}`;

            // Copy to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showMessage('Share link copied to clipboard!', 'success');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = shareUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                this.showMessage('Share link copied to clipboard!', 'success');
            });

            this.renderNotes();
        }
    }

    generateShareCode() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    async accessSharedNote(shareCode) {
        if (this.supabase) {
            try {
                // First, get the note details using the share code
                const { data: noteData, error: noteError } = await this.supabase
                    .rpc('access_shared_note', { share_code_param: shareCode });

                if (noteError || !noteData || noteData.length === 0) {
                    this.showMessage('Invalid or expired share link', 'error');
                    return null;
                }

                const note = noteData[0];

                // Add to shared notes if not already there
                const { error: addError } = await this.supabase
                    .rpc('add_shared_note', { share_code_param: shareCode });

                if (addError && !addError.message.includes('already shared')) {
                    console.error('Error adding shared note:', addError);
                }

                // Refresh shared notes list
                await this.loadSharedNotes();

                return {
                    id: note.note_id,
                    title: note.title,
                    content: note.content,
                    category: note.category,
                    author: note.author_name,
                    authorName: note.author_name,
                    createdAt: note.created_at,
                    updatedAt: note.updated_at
                };
            } catch (error) {
                console.error('Error accessing shared note:', error);
                this.showMessage('Error accessing shared note. Please try again.', 'error');
                return null;
            }
        } else {
            // Fallback to localStorage
            const note = this.notes.find(n => n.shareCode === shareCode && n.isShared);
            if (note) {
                // Add to shared notes if not already there
                if (!this.sharedNotes.find(sn => sn.originalId === note.id)) {
                    const sharedNote = {
                        id: Date.now().toString(),
                        originalId: note.id,
                        title: note.title,
                        content: note.content,
                        category: note.category,
                        author: note.author,
                        authorName: note.authorName,
                        sharedAt: new Date().toISOString(),
                        shareCode: note.shareCode
                    };
                    this.sharedNotes.push(sharedNote);
                    localStorage.setItem('sharedNotes', JSON.stringify(this.sharedNotes));
                }
                return note;
            }
            return null;
        }
    }

    // Rendering Methods
    renderNotes() {
        if (!this.currentUser) return;

        const notesGrid = document.getElementById('notesGrid');
        const userNotes = this.notes.filter(note => note.author === this.currentUser.id);

        if (userNotes.length === 0) {
            notesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sticky-note"></i>
                    <h3>No notes yet</h3>
                    <p>Create your first note to get started!</p>
                    <button class="btn-primary" onclick="studyShare.showCreateNoteModal()">
                        <i class="fas fa-plus"></i>
                        Create Note
                    </button>
                </div>
            `;
            return;
        }

        notesGrid.innerHTML = userNotes.map(note => `
            <div class="note-card" onclick="studyShare.openNote('${note.id}')">
                <div class="note-card-header">
                    <div>
                        <div class="note-title">${this.escapeHtml(note.title)}</div>
                        <div class="note-category">${note.category}</div>
                    </div>
                    <div class="note-actions">
                        <button class="note-action" onclick="event.stopPropagation(); studyShare.shareNote('${note.id}')" title="Share">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="note-action" onclick="event.stopPropagation(); studyShare.deleteNote('${note.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-preview">${this.escapeHtml(note.content.substring(0, 150))}${note.content.length > 150 ? '...' : ''}</div>
                <div class="note-meta">
                    <span>Updated ${this.formatDate(note.updatedAt)}</span>
                    ${note.isShared ? '<span><i class="fas fa-share-alt"></i> Shared</span>' : ''}
                </div>
            </div>
        `).join('');
    }

    renderSharedNotes() {
        const sharedNotesGrid = document.getElementById('sharedNotesGrid');

        if (this.sharedNotes.length === 0) {
            sharedNotesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No shared notes</h3>
                    <p>Notes shared by your classmates will appear here</p>
                </div>
            `;
            return;
        }

        sharedNotesGrid.innerHTML = this.sharedNotes.map(note => `
            <div class="note-card" onclick="studyShare.openSharedNote('${note.id}')">
                <div class="note-card-header">
                    <div>
                        <div class="note-title">${this.escapeHtml(note.title)}</div>
                        <div class="note-category">${note.category}</div>
                    </div>
                </div>
                <div class="note-preview">${this.escapeHtml(note.content.substring(0, 150))}${note.content.length > 150 ? '...' : ''}</div>
                <div class="note-meta">
                    <span>By ${note.authorName}</span>
                    <span>Shared ${this.formatDate(note.sharedAt)}</span>
                </div>
            </div>
        `).join('');
    }

    // Modal Methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    showCreateNoteModal() {
        if (!this.currentUser) {
            this.showMessage('Please login to create notes', 'error');
            return;
        }
        this.currentNoteId = null;
        this.isEditing = false;
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        this.showModal('noteEditorModal');
    }

    showEditNoteModal(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        this.currentNoteId = noteId;
        this.isEditing = true;
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        this.showModal('noteEditorModal');
    }

    openNote(noteId) {
        this.showEditNoteModal(noteId);
    }

    openSharedNote(sharedNoteId) {
        const sharedNote = this.sharedNotes.find(n => n.id === sharedNoteId);
        if (!sharedNote) return;

        // Open in read-only mode
        this.currentNoteId = null;
        this.isEditing = false;
        document.getElementById('noteTitle').value = sharedNote.title;
        document.getElementById('noteContent').value = sharedNote.content;
        document.getElementById('noteTitle').readOnly = true;
        document.getElementById('noteContent').readOnly = true;
        this.showModal('noteEditorModal');
    }

    // Search and Filter Methods
    searchNotes(query) {
        const userNotes = this.notes.filter(note => note.author === this.currentUser.id);
        const filteredNotes = userNotes.filter(note =>
            note.title.toLowerCase().includes(query.toLowerCase()) ||
            note.content.toLowerCase().includes(query.toLowerCase())
        );
        this.renderFilteredNotes(filteredNotes);
    }

    filterNotesByCategory(category) {
        const userNotes = this.notes.filter(note => note.author === this.currentUser.id);
        const filteredNotes = category ?
            userNotes.filter(note => note.category === category) :
            userNotes;
        this.renderFilteredNotes(filteredNotes);
    }

    renderFilteredNotes(notes) {
        const notesGrid = document.getElementById('notesGrid');

        if (notes.length === 0) {
            notesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No notes found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                </div>
            `;
            return;
        }

        notesGrid.innerHTML = notes.map(note => `
            <div class="note-card" onclick="studyShare.openNote('${note.id}')">
                <div class="note-card-header">
                    <div>
                        <div class="note-title">${this.escapeHtml(note.title)}</div>
                        <div class="note-category">${note.category}</div>
                    </div>
                    <div class="note-actions">
                        <button class="note-action" onclick="event.stopPropagation(); studyShare.shareNote('${note.id}')" title="Share">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="note-action" onclick="event.stopPropagation(); studyShare.deleteNote('${note.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-preview">${this.escapeHtml(note.content.substring(0, 150))}${note.content.length > 150 ? '...' : ''}</div>
                <div class="note-meta">
                    <span>Updated ${this.formatDate(note.updatedAt)}</span>
                    ${note.isShared ? '<span><i class="fas fa-share-alt"></i> Shared</span>' : ''}
                </div>
            </div>
        `).join('');
    }

    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString();
    }

    showMessage(message, type = 'success') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        document.body.insertBefore(messageDiv, document.body.firstChild);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    setupPageRouting() {
        // Handle navigation clicks (only if link has data-page)
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const page = link.getAttribute('data-page');
                if (!page) return; // allow normal links without data-page
                e.preventDefault();
                this.showPage(page);
            });
        });

        // Handle hash changes (direct URL access or manual hash edits)
        window.addEventListener('hashchange', () => {
            const fromHash = window.location.hash.replace('#', '') || 'home';
            this.showPage(fromHash, false);
        });

        // Handle browser back/forward when using history API
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || (window.location.hash.replace('#', '') || 'home');
            this.showPage(page, false);
        });

        // Initialize with current page (fallback to home)
        const currentPage = window.location.hash.replace('#', '') || 'home';
        this.showPage(currentPage, false);
    }

    showPage(pageId, updateHistory = true) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Resolve to 'home' if target not found
        let targetPage = document.getElementById(pageId);
        if (!targetPage) {
            pageId = 'home';
            targetPage = document.getElementById('home');
        }

        // Show target page
        if (targetPage) {
            targetPage.classList.add('active');

            // Add stagger animation to cards
            requestAnimationFrame(() => {
                const cards = targetPage.querySelectorAll('.stagger-animation');
                cards.forEach((card, index) => {
                    card.style.animationDelay = `${index * 0.1}s`;
                });
            });
        }

        // Update navigation (ignore links without data-page)
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.querySelector(`[data-page="${pageId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Sync URL hash
        if (updateHistory) {
            if (window.location.hash !== `#${pageId}`) {
                history.pushState({ page: pageId }, '', `#${pageId}`);
            }
        }

        // Load page-specific data
        this.loadPageData(pageId);
    }

    loadPageData(pageId) {
        switch (pageId) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'notes':
                this.renderNotes();
                break;
            case 'shared':
                this.renderSharedNotes();
                break;
            case 'profile':
                this.updateProfileUI();
                break;
        }
    }

    loadDashboardData() {
        if (!this.currentUser) return;

        const totalNotes = this.notes.length;
        const sharedNotes = this.notes.filter(note => note.is_shared || note.isShared).length;
        const receivedNotes = this.sharedNotes.length;
        const thisWeek = this.notes.filter(note => {
            const noteDate = new Date(note.updated_at || note.updatedAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return noteDate > weekAgo;
        }).length;

        document.getElementById('totalNotes').textContent = totalNotes;
        document.getElementById('sharedNotes').textContent = sharedNotes;
        document.getElementById('receivedNotes').textContent = receivedNotes;
        document.getElementById('thisWeek').textContent = thisWeek;
    }

    setupMobileMenu() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');

        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });

        // Close menu when clicking on links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }

    setupScrollEffects() {
        let lastScrollY = window.scrollY;
        const navbar = document.querySelector('.navbar');

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > 100) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            lastScrollY = currentScrollY;
        });
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('show');
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('show');
        }
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('loginBtn').addEventListener('click', () => {
            if (this.currentUser) return;
            this.showModal('loginModal');
        });

        document.getElementById('registerBtn').addEventListener('click', () => {
            if (this.currentUser) return;
            this.showModal('registerModal');
        });

        // Modals
        document.getElementById('closeLogin').addEventListener('click', () => {
            this.hideModal('loginModal');
        });

        document.getElementById('closeRegister').addEventListener('click', () => {
            this.hideModal('registerModal');
        });

        document.getElementById('closeNoteEditor').addEventListener('click', () => {
            this.hideModal('noteEditorModal');
            document.getElementById('noteTitle').readOnly = false;
            document.getElementById('noteContent').readOnly = false;
        });

        // Forms
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            this.login(email, password);
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirm').value;
            this.register(name, email, password, confirmPassword);
        });

        // Auth switching
        document.getElementById('switchToRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('loginModal');
            this.showModal('registerModal');
        });

        document.getElementById('switchToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('registerModal');
            this.showModal('loginModal');
        });

        // Note actions
        document.getElementById('createNoteBtn').addEventListener('click', () => {
            this.showCreateNoteModal();
        });

        document.getElementById('saveNoteBtn').addEventListener('click', () => {
            this.saveCurrentNote();
        });

        document.getElementById('shareNoteBtn').addEventListener('click', () => {
            if (this.currentNoteId) {
                this.shareNote(this.currentNoteId);
            }
        });

        // Search and filter
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchNotes(e.target.value);
        });

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filterNotesByCategory(e.target.value);
        });

        // Hero buttons
        document.getElementById('getStartedBtn').addEventListener('click', () => {
            if (this.currentUser) {
                this.showPage('dashboard');
            } else {
                this.showModal('registerModal');
            }
        });

        // Contact form
        document.getElementById('contactForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleContactForm();
        });

        // Profile save
        document.getElementById('saveProfileBtn').addEventListener('click', () => {
            this.saveProfile();
        });

        document.getElementById('watchDemoBtn').addEventListener('click', () => {
            this.showMessage('Demo video coming soon!', 'success');
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                    document.getElementById('noteTitle').readOnly = false;
                    document.getElementById('noteContent').readOnly = false;
                }
            });
        });

        // Auto-save note content
        let saveTimeout;
        document.getElementById('noteContent').addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                if (this.isEditing && this.currentNoteId) {
                    this.autoSaveNote();
                }
            }, 2000);
        });

        // Handle shared note access from URL
        this.handleSharedNoteAccess();
    }

    saveCurrentNote() {
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;
        const category = 'general'; // You can add category selection later

        if (!title.trim() && !content.trim()) {
            this.showMessage('Please add a title or content', 'error');
            return;
        }

        if (this.isEditing && this.currentNoteId) {
            this.updateNote(this.currentNoteId, title, content, category);
        } else {
            this.createNote(title, content, category);
        }

        this.hideModal('noteEditorModal');
    }

    autoSaveNote() {
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;
        const category = 'general';

        if (this.isEditing && this.currentNoteId) {
            this.updateNote(this.currentNoteId, title, content, category);
        }
    }

    handleSharedNoteAccess() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareCode = urlParams.get('shared');

        if (shareCode) {
            const note = this.accessSharedNote(shareCode);
            if (note) {
                this.showMessage('Shared note loaded successfully!', 'success');
                this.renderSharedNotes();
                // Navigate to shared notes page
                setTimeout(() => {
                    this.showPage('shared');
                }, 1000);
            } else {
                this.showMessage('Invalid or expired share link', 'error');
            }
        }
    }

    handleContactForm() {
        const name = document.getElementById('contactName').value;
        const email = document.getElementById('contactEmail').value;
        const subject = document.getElementById('contactSubject').value;
        const message = document.getElementById('contactMessage').value;

        if (!name || !email || !subject || !message) {
            this.showMessage('Please fill in all fields', 'error');
            return;
        }

        // Simulate form submission
        this.showLoading();
        setTimeout(() => {
            this.hideLoading();
            this.showMessage('Thank you for your message! We\'ll get back to you soon.', 'success');
            document.getElementById('contactForm').reset();
        }, 2000);
    }

    saveProfile() {
        if (!this.currentUser) return;

        const name = document.getElementById('profileNameInput').value;
        const bio = document.getElementById('profileBio').value;

        if (!name.trim()) {
            this.showMessage('Name is required', 'error');
            return;
        }

        // Update user data
        this.currentUser.name = name;
        this.currentUser.bio = bio;

        // Update UI
        this.updateProfileUI();
        this.updateAuthUI();

        this.showMessage('Profile updated successfully!', 'success');
    }
}

// Initialize the application
const studyShare = new StudyShare();

// Add some demo data if no users exist
if (studyShare.loadUsers().length === 0) {
    const demoUsers = [
        {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123',
            createdAt: new Date().toISOString()
        },
        {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            password: 'password123',
            createdAt: new Date().toISOString()
        }
    ];
    localStorage.setItem('users', JSON.stringify(demoUsers));

    // Add some demo notes
    const demoNotes = [
        {
            id: '1',
            title: 'Calculus Integration Techniques',
            content: 'Here are the main integration techniques we covered in class:\n\n1. Integration by parts\n2. Trigonometric substitution\n3. Partial fractions\n4. Integration by substitution\n\nRemember to always check your answer by differentiating!',
            category: 'math',
            author: '1',
            authorName: 'John Doe',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
            isShared: true,
            shareCode: 'demo123'
        },
        {
            id: '2',
            title: 'Physics: Newton\'s Laws',
            content: 'Newton\'s three laws of motion:\n\n1. First Law (Law of Inertia): An object at rest stays at rest, and an object in motion stays in motion, unless acted upon by an external force.\n\n2. Second Law: F = ma (Force equals mass times acceleration)\n\n3. Third Law: For every action, there is an equal and opposite reaction.',
            category: 'science',
            author: '2',
            authorName: 'Jane Smith',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            updatedAt: new Date(Date.now() - 172800000).toISOString(),
            isShared: false,
            shareCode: null
        }
    ];
    localStorage.setItem('notes', JSON.stringify(demoNotes));
}
