// Navigation utility for StudyShare
// Handles navigation between pages and maintains auth state

// Check if user is authenticated and update navigation accordingly
function updateNavigation() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        // User is logged in - show authenticated navigation
        showAuthenticatedNav();
    } else {
        // User is not logged in - show public navigation
        showPublicNav();
    }
}

function showAuthenticatedNav() {
    // Hide auth buttons
    const authButtons = document.querySelector('.nav-auth');
    if (authButtons) {
        authButtons.style.display = 'none';
    }
    
    // Show authenticated navigation
    const authLinks = document.querySelectorAll('.nav-link[data-page="dashboard"], .nav-link[data-page="notes"], .nav-link[data-page="shared"], .nav-link[data-page="profile"]');
    authLinks.forEach(link => {
        link.style.display = 'block';
    });
    
    // Add logout button if it doesn't exist
    if (!document.getElementById('logoutBtn')) {
        const logoutBtn = document.createElement('a');
        logoutBtn.id = 'logoutBtn';
        logoutBtn.className = 'btn-login';
        logoutBtn.href = '#';
        logoutBtn.textContent = 'Logout';
        logoutBtn.addEventListener('click', handleLogout);
        document.querySelector('.nav-menu').appendChild(logoutBtn);
    }
}

function showPublicNav() {
    // Show auth buttons
    const authButtons = document.querySelector('.nav-auth');
    if (authButtons) {
        authButtons.style.display = 'flex';
    }
    
    // Hide authenticated navigation
    const authLinks = document.querySelectorAll('.nav-link[data-page="dashboard"], .nav-link[data-page="notes"], .nav-link[data-page="shared"], .nav-link[data-page="profile"]');
    authLinks.forEach(link => {
        link.style.display = 'none';
    });
    
    // Remove logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.remove();
    }
}

async function handleLogout(e) {
    e.preventDefault();
    
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        showNotification('Logged out successfully', 'success');
        
        // Redirect to home page
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed. Please try again.', 'error');
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Only run if we're on the main page and Supabase is available
    if (typeof supabase !== 'undefined' && window.location.pathname.includes('index.html')) {
        updateNavigation();
    }
});

// Export functions for use in other scripts
window.navigation = {
    updateNavigation,
    showAuthenticatedNav,
    showPublicNav,
    handleLogout
};
