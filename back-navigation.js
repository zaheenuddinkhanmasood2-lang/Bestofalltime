(function () {
    function smartBack() {
        const hasHistory =
            window.history.length > 1 &&
            document.referrer &&
            document.referrer !== window.location.href;

        if (hasHistory) {
            window.history.back();
            return;
        }

        const origin = window.location.origin || '';
        const path = window.location.pathname || '';

        // Default fallback: home page
        let fallback = origin + '/index.html';

        // If we are on upload-past-papers, go back to past papers list instead of home
        if (path.includes('upload-past-papers.html')) {
            fallback = origin + '/past-papers/past-papers.html';
        }

        window.location.href = fallback;
    }

    document.addEventListener('DOMContentLoaded', function () {
        const backButtons = document.querySelectorAll('.back-arrow-btn');
        if (!backButtons.length) return;

        backButtons.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                smartBack();
            });
        });
    });
})();


