// StudyShare - Supabase Integration
// This file handles all database operations and user authentication

// Supabase client initialization
let supabase;

// Initialize Supabase when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Check if Supabase credentials are configured
    if (!checkSupabaseConfig()) {
        showNotification('Please configure your Supabase credentials first!', 'error');
        showSetupInstructions();
        return;
    }

    try {
        // Initialize Supabase client
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized successfully');

        // Initialize the application
        initializeApp();
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        showNotification('Failed to connect to database. Please check your credentials.', 'error');
    }
});

// Application initialization
async function initializeApp() {
    // Check if user is already logged in
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // User is logged in
        handleUserLogin(user);
    } else {
        // User is not logged in
        handleUserLogout();
    }

    // Set up event listeners
    setupEventListeners();

    // Load initial data
    await loadInitialData();
}

// Set up all event listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('nav-toggle')?.addEventListener('click', toggleMobileMenu);

    // Auth modals
    document.getElementById('loginBtn')?.addEventListener('click', () => openModal('loginModal'));
    document.getElementById('registerBtn')?.addEventListener('click', () => openModal('registerModal'));
    document.getElementById('closeLogin')?.addEventListener('click', () => closeModal('loginModal'));
    document.getElementById('closeRegister')?.addEventListener('click', () => closeModal('registerModal'));
    document.getElementById('switchToRegister')?.addEventListener('click', () => switchAuthModal('register'));
    document.getElementById('switchToLogin')?.addEventListener('click', () => switchAuthModal('login'));

    // Auth forms
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);

    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page) {
                showPage(page);
            }
        });
    });

    // Dashboard buttons
    document.getElementById('getStartedBtn')?.addEventListener('click', () => openModal('registerModal'));
    document.getElementById('watchDemoBtn')?.addEventListener('click', () => showNotification('Demo coming soon!', 'info'));

    // Notes functionality
    document.getElementById('createNoteBtn')?.addEventListener('click', () => openNoteEditor());
    document.getElementById('saveNoteBtn')?.addEventListener('click', saveNote);
    document.getElementById('shareNoteBtn')?.addEventListener('click', shareNote);
    document.getElementById('closeNoteEditor')?.addEventListener('click', () => closeModal('noteEditorModal'));

    // Search and filters
    document.getElementById('searchInput')?.addEventListener('input', filterNotes);
    document.getElementById('categoryFilter')?.addEventListener('change', filterNotes);

    // Profile
    document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);

    // Contact form
    document.getElementById('contactForm')?.addEventListener('submit', handleContactForm);

    // Listen for auth state changes
    supabase?.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            handleUserLogin(session.user);
        } else if (event === 'SIGNED_OUT') {
            handleUserLogout();
        }
    });
}

// Setup instructions function
function showSetupInstructions() {
    const instructions = `
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                    background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                    max-width: 500px; z-index: 10000; text-align: center;">
            <h2 style="color: #ef4444; margin-bottom: 20px;">🔧 Setup Required</h2>
            <p style="margin-bottom: 20px;">To use StudyShare, you need to configure your Supabase credentials:</p>
            <ol style="text-align: left; margin-bottom: 20px;">
                <li>Go to <a href="https://supabase.com/dashboard" target="_blank">Supabase Dashboard</a></li>
                <li>Create a new project or select existing one</li>
                <li>Go to Settings → API</li>
                <li>Copy your Project URL and anon key</li>
                <li>Update the credentials in your HTML file</li>
            </ol>
            <button onclick="this.parentElement.remove()" style="background: #6366f1; color: white; 
                        border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                Got it!
            </button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', instructions);
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    showLoading(true);

    try {
        console.log('🔐 Attempting login for:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error('❌ Login error:', error);
            throw error;
        }

        console.log('✅ Login successful:', data.user);
        showNotification('Login successful!', 'success');
        closeModal('loginModal');
        handleUserLogin(data.user);

    } catch (error) {
        console.error('❌ Login failed:', error);
        let errorMessage = 'Login failed. Please try again.';

        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and confirm your account';
        } else if (error.message.includes('Too many requests')) {
            errorMessage = 'Too many login attempts. Please try again later';
        }

        showNotification(errorMessage, 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirm').value;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    showLoading(true);

    try {
        console.log('📝 Attempting registration for:', email);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) {
            console.error('❌ Registration error:', error);
            throw error;
        }

        console.log('✅ Registration successful:', data.user);
        showNotification('Registration successful! Please check your email to verify your account.', 'success');
        closeModal('registerModal');

        // Clear form
        document.getElementById('registerForm').reset();

    } catch (error) {
        console.error('❌ Registration failed:', error);
        let errorMessage = 'Registration failed. Please try again.';

        if (error.message.includes('User already registered')) {
            errorMessage = 'An account with this email already exists. Please try logging in.';
        } else if (error.message.includes('Password should be at least')) {
            errorMessage = 'Password must be at least 6 characters long';
        } else if (error.message.includes('Invalid email')) {
            errorMessage = 'Please enter a valid email address';
        } else if (error.message.includes('Signup is disabled')) {
            errorMessage = 'Registration is currently disabled. Please contact support.';
        }

        showNotification(errorMessage, 'error');
    } finally {
        showLoading(false);
    }
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        showNotification('Logged out successfully', 'success');
        handleUserLogout();

    } catch (error) {
        console.error('Logout error:', error);
        showNotification(error.message, 'error');
    }
}

// User state management
function handleUserLogin(user) {
    // Show authenticated navigation
    document.querySelectorAll('.nav-link[style*="display: none"]').forEach(link => {
        link.style.display = 'block';
    });

    // Hide auth buttons
    document.querySelector('.nav-auth').style.display = 'none';

    // Add logout button
    if (!document.getElementById('logoutBtn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.className = 'btn-secondary';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', handleLogout);
        document.querySelector('.nav-menu').appendChild(logoutBtn);
    }

    // Update profile information
    updateProfileDisplay(user);

    // Load user data
    loadUserData();
}

function handleUserLogout() {
    // Hide authenticated navigation
    document.querySelectorAll('.nav-link[data-page="dashboard"], .nav-link[data-page="notes"], .nav-link[data-page="shared"], .nav-link[data-page="profile"]').forEach(link => {
        link.style.display = 'none';
    });

    // Show auth buttons
    document.querySelector('.nav-auth').style.display = 'flex';

    // Remove logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.remove();
    }

    // Clear user data
    clearUserData();

    // Show home page
    showPage('home');
}

// Profile management
async function updateProfileDisplay(user) {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            document.getElementById('profileName').textContent = profile.full_name || user.email;
            document.getElementById('profileEmail').textContent = user.email;
            document.getElementById('profileNameInput').value = profile.full_name || '';
            document.getElementById('profileEmailInput').value = user.email;
            document.getElementById('profileBio').value = profile.bio || '';
            document.getElementById('profileAvatar').textContent = (profile.full_name || user.email).charAt(0).toUpperCase();
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function saveProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fullName = document.getElementById('profileNameInput').value;
    const bio = document.getElementById('profileBio').value;

    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                full_name: fullName,
                bio: bio
            });

        if (error) throw error;

        showNotification('Profile updated successfully!', 'success');
        updateProfileDisplay(user);

    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification(error.message, 'error');
    }
}

// Notes management
let currentNote = null;

async function loadUserData() {
    await loadNotes();
    await loadSharedNotes();
    await loadDashboardStats();
}

async function loadNotes() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        const { data: notes, error } = await supabase
            .from('notes')
            .select(`
                *,
                categories(name, color),
                note_tags(tags(name, color))
            `)
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        displayNotes(notes || []);

    } catch (error) {
        console.error('Error loading notes:', error);
        showNotification('Error loading notes', 'error');
    }
}

async function loadSharedNotes() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        const { data: sharedNotes, error } = await supabase
            .from('note_shares')
            .select(`
                notes(*, profiles(full_name), categories(name, color))
            `)
            .eq('shared_with', user.id);

        if (error) throw error;

        displaySharedNotes(sharedNotes?.map(share => share.notes) || []);

    } catch (error) {
        console.error('Error loading shared notes:', error);
    }
}

async function loadDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        // Get total notes
        const { count: totalNotes } = await supabase
            .from('notes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        // Get shared notes count
        const { count: sharedNotes } = await supabase
            .from('notes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_shared', true);

        // Get received notes count
        const { count: receivedNotes } = await supabase
            .from('note_shares')
            .select('*', { count: 'exact', head: true })
            .eq('shared_with', user.id);

        // Get this week's notes
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { count: thisWeek } = await supabase
            .from('notes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', weekAgo.toISOString());

        // Update dashboard
        document.getElementById('totalNotes').textContent = totalNotes || 0;
        document.getElementById('sharedNotes').textContent = sharedNotes || 0;
        document.getElementById('receivedNotes').textContent = receivedNotes || 0;
        document.getElementById('thisWeek').textContent = thisWeek || 0;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

function displayNotes(notes) {
    const notesGrid = document.getElementById('notesGrid');
    if (!notesGrid) return;

    notesGrid.innerHTML = '';

    if (notes.length === 0) {
        notesGrid.innerHTML = '<div class="no-notes">No notes found. Create your first note!</div>';
        return;
    }

    notes.forEach(note => {
        const noteCard = createNoteCard(note);
        notesGrid.appendChild(noteCard);
    });
}

function displaySharedNotes(notes) {
    const sharedNotesGrid = document.getElementById('sharedNotesGrid');
    if (!sharedNotesGrid) return;

    sharedNotesGrid.innerHTML = '';

    if (notes.length === 0) {
        sharedNotesGrid.innerHTML = '<div class="no-notes">No shared notes yet.</div>';
        return;
    }

    notes.forEach(note => {
        const noteCard = createNoteCard(note, true);
        sharedNotesGrid.appendChild(noteCard);
    });
}

function createNoteCard(note, isShared = false) {
    const card = document.createElement('div');
    card.className = 'note-card';

    const category = note.categories?.[0];
    const tags = note.note_tags?.map(nt => nt.tags).filter(Boolean) || [];

    card.innerHTML = `
        <div class="note-card-header">
            <h3 class="note-title">${note.title}</h3>
            <div class="note-actions">
                <button class="btn-icon" onclick="editNote('${note.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" onclick="deleteNote('${note.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="note-content">${note.content?.substring(0, 100)}${note.content?.length > 100 ? '...' : ''}</div>
        <div class="note-meta">
            ${category ? `<span class="note-category" style="background-color: ${category.color}20; color: ${category.color}">${category.name}</span>` : ''}
            ${tags.map(tag => `<span class="note-tag" style="background-color: ${tag.color}20; color: ${tag.color}">${tag.name}</span>`).join('')}
        </div>
        <div class="note-footer">
            <span class="note-date">${formatDate(note.updated_at)}</span>
            ${isShared ? `<span class="shared-by">by ${note.profiles?.full_name || 'Unknown'}</span>` : ''}
        </div>
    `;

    return card;
}

async function openNoteEditor(noteId = null) {
    currentNote = noteId;

    if (noteId) {
        // Load existing note
        try {
            const { data: note, error } = await supabase
                .from('notes')
                .select('*')
                .eq('id', noteId)
                .single();

            if (error) throw error;

            document.getElementById('noteTitle').value = note.title;
            document.getElementById('noteContent').value = note.content || '';
        } catch (error) {
            console.error('Error loading note:', error);
            showNotification('Error loading note', 'error');
            return;
        }
    } else {
        // New note
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
    }

    openModal('noteEditorModal');
}

async function saveNote() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteContent').value;

    if (!title.trim()) {
        showNotification('Please enter a title for your note', 'error');
        return;
    }

    try {
        if (currentNote) {
            // Update existing note
            const { error } = await supabase
                .from('notes')
                .update({
                    title,
                    content,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentNote);

            if (error) throw error;
            showNotification('Note updated successfully!', 'success');
        } else {
            // Create new note
            const { error } = await supabase
                .from('notes')
                .insert({
                    user_id: user.id,
                    title,
                    content
                });

            if (error) throw error;
            showNotification('Note created successfully!', 'success');
        }

        closeModal('noteEditorModal');
        await loadNotes();

    } catch (error) {
        console.error('Error saving note:', error);
        showNotification(error.message, 'error');
    }
}

async function editNote(noteId) {
    await openNoteEditor(noteId);
}

async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', noteId);

        if (error) throw error;

        showNotification('Note deleted successfully!', 'success');
        await loadNotes();

    } catch (error) {
        console.error('Error deleting note:', error);
        showNotification(error.message, 'error');
    }
}

async function shareNote() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!currentNote) {
        showNotification('Please save the note first', 'error');
        return;
    }

    try {
        // Generate share code
        const shareCode = generateShareCode();

        // Update note with share code
        const { error: noteError } = await supabase
            .from('notes')
            .update({
                is_shared: true,
                share_code: shareCode
            })
            .eq('id', currentNote);

        if (noteError) throw noteError;

        // Copy share link to clipboard
        const shareLink = `${window.location.origin}${window.location.pathname}#shared/${shareCode}`;
        await navigator.clipboard.writeText(shareLink);

        showNotification('Share link copied to clipboard!', 'success');

    } catch (error) {
        console.error('Error sharing note:', error);
        showNotification(error.message, 'error');
    }
}

// Utility functions
function generateShareCode() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function filterNotes() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';

    const noteCards = document.querySelectorAll('.note-card');

    noteCards.forEach(card => {
        const title = card.querySelector('.note-title').textContent.toLowerCase();
        const content = card.querySelector('.note-content').textContent.toLowerCase();
        const category = card.querySelector('.note-category')?.textContent.toLowerCase() || '';

        const matchesSearch = title.includes(searchTerm) || content.includes(searchTerm);
        const matchesCategory = !categoryFilter || category.includes(categoryFilter);

        card.style.display = (matchesSearch && matchesCategory) ? 'block' : 'none';
    });
}

function clearUserData() {
    document.getElementById('notesGrid').innerHTML = '';
    document.getElementById('sharedNotesGrid').innerHTML = '';
    document.getElementById('totalNotes').textContent = '0';
    document.getElementById('sharedNotes').textContent = '0';
    document.getElementById('receivedNotes').textContent = '0';
    document.getElementById('thisWeek').textContent = '0';
}

async function loadInitialData() {
    // Load categories for filter dropdown
    try {
        const { data: categories } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (categories) {
            const categoryFilter = document.getElementById('categoryFilter');
            if (categoryFilter) {
                categoryFilter.innerHTML = '<option value="">All Categories</option>' +
                    categories.map(cat => `<option value="${cat.name.toLowerCase()}">${cat.name}</option>`).join('');
            }
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Contact form
async function handleContactForm(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        subject: document.getElementById('contactSubject').value,
        message: document.getElementById('contactMessage').value
    };

    // Here you would typically send the form data to your backend
    // For now, we'll just show a success message
    showNotification('Thank you for your message! We\'ll get back to you soon.', 'success');
    document.getElementById('contactForm').reset();
}

// UI Helper functions
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`[data-page="${pageId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function switchAuthModal(type) {
    closeModal('loginModal');
    closeModal('registerModal');

    if (type === 'login') {
        openModal('loginModal');
    } else {
        openModal('registerModal');
    }
}

function toggleMobileMenu() {
    const navMenu = document.getElementById('nav-menu');
    const navToggle = document.getElementById('nav-toggle');

    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// Handle share links
window.addEventListener('hashchange', () => {
    const hash = window.location.hash;
    if (hash.startsWith('#shared/')) {
        const shareCode = hash.split('/')[1];
        // Handle shared note access
        console.log('Accessing shared note:', shareCode);
    }
});