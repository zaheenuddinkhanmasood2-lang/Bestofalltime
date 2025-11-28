// Upload logic with auth gate, role validation, file validation and progress indicator
(function () {
    const supabase = window.getSupabaseClient();
    const STORAGE_BUCKET = 'STORAGE_BUCKET';

    const uploadForm = document.getElementById('uploadForm');
    const subjectEl = document.getElementById('subject');
    const customSubjectEl = document.getElementById('customSubject');
    const customSubjectContainer = document.getElementById('customSubjectContainer');
    const titleEl = document.getElementById('title');
    const descriptionEl = document.getElementById('description');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const progressWrap = document.getElementById('progressWrap');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressEta = document.getElementById('progressEta');
    const uploadBtn = document.getElementById('uploadBtn');
    const messageArea = document.getElementById('messageArea');
    const fileInfo = document.getElementById('fileInfo');
    const authStatus = document.getElementById('authStatus');
    const requestAccessLink = document.getElementById('requestAccessLink');
    const requestAccess = document.getElementById('requestAccess');
    const reqSubmit = document.getElementById('reqSubmit');
    const reqName = document.getElementById('reqName');
    const reqEmail = document.getElementById('reqEmail');
    const reqReason = document.getElementById('reqReason');

    // Thumbnail elements
    const thumbnailDropZone = document.getElementById('thumbnailDropZone');
    const thumbnailInput = document.getElementById('thumbnailInput');
    const thumbnailBrowseBtn = document.getElementById('thumbnailBrowseBtn');
    const thumbnailInfo = document.getElementById('thumbnailInfo');
    const thumbnailPreview = document.getElementById('thumbnailPreview');
    const thumbnailPreviewImg = document.getElementById('thumbnailPreviewImg');
    const removeThumbnail = document.getElementById('removeThumbnail');

    let selectedFile = null;
    let selectedThumbnail = null;
    let isAuthorizedUploader = false;

    // Helpers
    function notify(message, type = 'info') {
        messageArea.innerHTML = '';
        const color = type === 'success' ? 'text-green-400' : (type === 'error' ? 'text-red-400' : 'text-blue-400');
        const panel = document.createElement('div');
        panel.className = `glass-panel p-3 rounded-xl mt-2 ${color}`;
        panel.textContent = message;
        messageArea.appendChild(panel);
    }

    function setUploadingState(isUploading) {
        uploadBtn.disabled = isUploading || !isAuthorizedUploader;
        if (isUploading) {
            progressWrap.classList.remove('hidden');
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Uploading...';
        } else {
            uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i> Upload';
        }
    }

    function validateFile(file) {
        if (!file) return { ok: false, msg: 'Please choose a file.' };
        const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
        if (!allowed.includes(file.type)) return { ok: false, msg: 'Only PDF, PNG, JPG, JPEG are allowed.' };
        const max = 28 * 1024 * 1024; // 28MB
        if (file.size > max) return { ok: false, msg: 'File exceeds 28MB limit.' };
        return { ok: true };
    }

    function validateThumbnail(file) {
        if (!file) return { ok: true }; // Thumbnail is optional
        const allowed = ['image/png', 'image/jpeg'];
        if (!allowed.includes(file.type)) return { ok: false, msg: 'Only PNG, JPG, JPEG thumbnails are allowed.' };
        const max = 2 * 1024 * 1024; // 2MB
        if (file.size > max) return { ok: false, msg: 'Thumbnail exceeds 2MB limit.' };
        return { ok: true };
    }

    function humanSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0, n = bytes;
        while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
        return `${n.toFixed(1)} ${units[i]}`;
    }

    function setFileInfo(file) {
        if (!file) {
            fileInfo.classList.add('hidden');
            fileInfo.textContent = '';
            return;
        }
        fileInfo.classList.remove('hidden');
        fileInfo.textContent = `${file.name} • ${humanSize(file.size)} • ${file.type}`;
    }

    function setThumbnailInfo(file) {
        if (!file) {
            thumbnailInfo.classList.add('hidden');
            thumbnailInfo.textContent = '';
            return;
        }
        thumbnailInfo.classList.remove('hidden');
        thumbnailInfo.textContent = `${file.name} • ${humanSize(file.size)} • ${file.type}`;
    }

    function showThumbnailPreview(file) {
        if (!file) {
            thumbnailPreview.classList.add('hidden');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            thumbnailPreviewImg.src = e.target.result;
            thumbnailPreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    // Drag & drop
    ;['dragenter', 'dragover'].forEach(evt => dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('border-purple-500');
    }));
    ;['dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-purple-500');
    }));
    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files?.[0];
        if (file) {
            selectedFile = file;
            setFileInfo(file);
        }
    });
    dropZone.addEventListener('click', () => fileInput.click());
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        selectedFile = fileInput.files?.[0] || null;
        setFileInfo(selectedFile);
    });

    // Thumbnail drag & drop
    ;['dragenter', 'dragover'].forEach(evt => thumbnailDropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        thumbnailDropZone.classList.add('border-purple-500');
    }));
    ;['dragleave', 'drop'].forEach(evt => thumbnailDropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        thumbnailDropZone.classList.remove('border-purple-500');
    }));
    thumbnailDropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const valid = validateThumbnail(file);
            if (valid.ok) {
                selectedThumbnail = file;
                setThumbnailInfo(file);
                showThumbnailPreview(file);
            } else {
                notify(valid.msg, 'error');
            }
        }
    });
    thumbnailDropZone.addEventListener('click', () => thumbnailInput.click());
    thumbnailBrowseBtn.addEventListener('click', () => thumbnailInput.click());
    thumbnailInput.addEventListener('change', () => {
        const file = thumbnailInput.files?.[0] || null;
        const valid = validateThumbnail(file);
        if (valid.ok) {
            selectedThumbnail = file;
            setThumbnailInfo(file);
            showThumbnailPreview(file);
        } else {
            notify(valid.msg, 'error');
        }
    });
    removeThumbnail.addEventListener('click', () => {
        selectedThumbnail = null;
        setThumbnailInfo(null);
        showThumbnailPreview(null);
        thumbnailInput.value = '';
    });

    // Track description length
    const descCount = document.getElementById('descCount');
    descriptionEl.addEventListener('input', () => {
        descCount.textContent = String(descriptionEl.value.length);
    });

    // Handle custom subject selection
    subjectEl.addEventListener('change', () => {
        if (subjectEl.value === 'custom') {
            customSubjectContainer.classList.remove('hidden');
            customSubjectEl.focus();
            customSubjectEl.required = true;
        } else {
            customSubjectContainer.classList.add('hidden');
            customSubjectEl.required = false;
            customSubjectEl.value = '';
        }
    });

    // Handle custom subject input
    customSubjectEl.addEventListener('input', () => {
        // Auto-capitalize first letter of each word
        const words = customSubjectEl.value.split(' ');
        const capitalizedWords = words.map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
        customSubjectEl.value = capitalizedWords.join(' ');
    });

    // Auth + role detection
    async function checkAuthAndRole() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            authStatus.innerHTML = '<span class="text-red-400">You must be signed in to upload.</span> <a class="text-purple-400 underline" href="login.html">Login</a>';
            uploadBtn.disabled = true;
            return;
        }
        const userId = session.user.id;
        const userEmail = session.user.email;
        authStatus.innerHTML = `<span class="text-green-400">Signed in as ${userEmail}</span>`;

        const { data: authRows, error: authErr } = await supabase
            .from('authorized_uploaders')
            .select('is_active, permissions')
            .eq('user_id', userId)
            .limit(1)
            .maybeSingle();
        if (authErr) {
            console.error(authErr);
            notify('Could not verify upload permission. Please try again later.', 'error');
            uploadBtn.disabled = true;
            return;
        }
        isAuthorizedUploader = !!(authRows && authRows.is_active);
        if (!isAuthorizedUploader) {
            uploadBtn.disabled = true;
            requestAccess.classList.remove('hidden');
            requestAccessLink.classList.add('hidden');
            notify('You do not have upload access. You can request access below.', 'error');
        } else {
            uploadBtn.disabled = false;
            requestAccess.classList.add('hidden');
            requestAccessLink.classList.add('hidden');
        }
    }

    // Submit request for access
    requestAccessLink.addEventListener('click', (e) => {
        e.preventDefault();
        requestAccess.classList.toggle('hidden');
    });
    reqSubmit.addEventListener('click', async () => {
        if (!reqEmail.value || !reqName.value || !reqReason.value) {
            notify('Please fill name, email and reason.', 'error');
            return;
        }
        const { error } = await supabase.from('upload_requests').insert({
            user_email: reqEmail.value.trim(),
            user_name: reqName.value.trim(),
            reason: reqReason.value.trim()
        });
        if (error) {
            console.error(error);
            notify('Failed to submit request. Try again later.', 'error');
            return;
        }
        notify('Request submitted. We will review it shortly.', 'success');
        reqSubmit.disabled = true;
    });

    // Unique filename
    function generateObjectPath(userId, originalName) {
        const ext = (originalName.split('.').pop() || 'bin').toLowerCase();
        const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        return `${userId}/${ts}-${uuid}.${ext}`;
    }

    // Progressed upload via XHR to take advantage of onprogress
    async function uploadWithProgress(bucket, objectPath, file, onProgress) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated');
        // Correct Storage upload endpoint: /storage/v1/object/{bucket}/{objectPath}
        const url = `${window.SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeURIComponent(objectPath)}`;

        return await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
            xhr.setRequestHeader('x-upsert', 'true');
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable && onProgress) onProgress(e.loaded, e.total);
            };
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 300) resolve({});
                    else reject(new Error(`Upload failed (${xhr.status})${xhr.responseText ? `: ${xhr.responseText}` : ''}`));
                }
            };
            const form = new FormData();
            form.append('file', file, objectPath);
            xhr.send(form);
        });
    }

    // Handle form submit
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        notify('', 'info');
        if (!isAuthorizedUploader) {
            notify('You are not authorized to upload.', 'error');
            return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            notify('You must be signed in.', 'error');
            return;
        }
        let subject = subjectEl.value.trim();
        const title = (titleEl.value || '').trim();

        // Handle custom subject
        if (subject === 'custom') {
            const customSubject = customSubjectEl.value.trim();
            if (!customSubject) {
                return notify('Please enter a custom subject name.', 'error');
            }
            subject = customSubject;
        } else if (!subject) {
            return notify('Please select a subject.', 'error');
        }
        const description = descriptionEl.value.trim();
        const file = selectedFile;
        const valid = validateFile(file);
        if (!valid.ok) return notify(valid.msg, 'error');

        const thumbnailValid = validateThumbnail(selectedThumbnail);
        if (!thumbnailValid.ok) return notify(thumbnailValid.msg, 'error');

        const objectPath = generateObjectPath(session.user.id, file.name);
        const thumbnailPath = selectedThumbnail ? generateObjectPath(session.user.id, selectedThumbnail.name) : null;
        const derivedTitle = title || file.name.replace(/\.[^.]+$/, '');

        setUploadingState(true);
        const start = Date.now();
        try {
            // Upload main file
            await uploadWithProgress(STORAGE_BUCKET, objectPath, file, (loaded, total) => {
                const pct = Math.round((loaded / total) * 100);
                const elapsed = (Date.now() - start) / 1000;
                const speed = loaded / Math.max(elapsed, 0.1); // bytes/sec
                const remaining = Math.max((total - loaded) / Math.max(speed, 1), 0);
                progressBar.style.width = `${pct}%`;
                progressText.textContent = `Uploading file... ${pct}%`;
                progressEta.textContent = `${Math.ceil(remaining)}s`;
            });

            // Upload thumbnail if provided
            let thumbnailUrl = null;
            if (selectedThumbnail && thumbnailPath) {
                progressText.textContent = 'Uploading thumbnail...';
                await uploadWithProgress('thumbnails', thumbnailPath, selectedThumbnail, (loaded, total) => {
                    const pct = Math.round((loaded / total) * 100);
                    progressText.textContent = `Uploading thumbnail... ${pct}%`;
                });
                thumbnailUrl = thumbnailPath;
            }

            // Create a signed URL for limited-time access
            const { data: signedData, error: signedErr } = await supabase
                .storage.from(STORAGE_BUCKET)
                .createSignedUrl(objectPath, 60 * 60); // 1 hour
            if (signedErr) throw signedErr;

            // Insert metadata row - All uploads require manual approval
            const { error: dbErr } = await supabase.from('notes').insert({
                user_id: session.user.id, // for schemas that require user_id
                title: derivedTitle,
                filename: objectPath.split('/').pop(),
                file_url: objectPath, // stored object path; signed URL generated when needed
                subject,
                description,
                uploader_id: session.user.id,
                uploader_email: session.user.email,
                file_size: file.size,
                thumbnail_url: thumbnailUrl,
                is_approved: false,  // All uploads require manual approval
                is_public: false     // Keep private until approved
            });
            if (dbErr) throw dbErr;

            // Submit to IndexNow API for search engine indexing
            if (window.indexNow) {
                window.indexNow.submitPage('/browse.html').catch(err => {
                    console.warn('IndexNow submission failed (non-critical):', err);
                });
            }

            // Success message - note pending approval
            notify('Upload submitted successfully! Your note is pending approval and will be visible once reviewed by an admin.', 'success');
            const linkWrap = document.createElement('div');
            linkWrap.className = 'mt-2';
            const a = document.createElement('a');
            a.href = signedData.signedUrl;
            a.target = '_blank';
            a.rel = 'noopener';
            a.className = 'text-purple-300 underline';
            a.textContent = 'Open file (temporary link)';
            linkWrap.appendChild(a);
            messageArea.appendChild(linkWrap);
            // Auto-clear after 10 seconds
            setTimeout(() => { if (messageArea) messageArea.innerHTML = ''; }, 10000);
            uploadForm.reset();
            selectedFile = null;
            selectedThumbnail = null;
            setFileInfo(null);
            setThumbnailInfo(null);
            showThumbnailPreview(null);
            customSubjectContainer.classList.add('hidden');
            customSubjectEl.required = false;
            progressText.textContent = 'Upload complete';
        } catch (err) {
            console.error(err);
            notify(err.message || 'Upload failed.', 'error');
        } finally {
            setUploadingState(false);
        }
    });

    // Initialize
    (async function init() {
        await checkAuthAndRole();
    })();
})();


