(function () {
    const supabase = window.getSupabaseClient();
    const STORAGE_BUCKET = 'past-papers';

    const uploadForm = document.getElementById('uploadForm');
    const subjectEl = document.getElementById('subject');
    const courseCodeEl = document.getElementById('courseCode');
    const semesterEl = document.getElementById('semester');
    const paperTypeEl = document.getElementById('paperType');
    const yearEl = document.getElementById('year');
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

    let selectedFile = null;
    let isAuthorizedUploader = false;

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
            uploadBtn.innerHTML = '<i class="fas fa-upload mr-2"></i> Upload Past Paper';
        }
    }

    function humanSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0, n = bytes;
        while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
        return `${n.toFixed(1)} ${units[i]}`;
    }

    /**
     * Normalize course code: remove spaces, unify hyphens, uppercase
     * Examples: "CS-101" -> "CS101", "cs 101" -> "CS101", "MTH102" -> "MTH102"
     */
    function normalizeCourseCode(value) {
        if (!value) return '';
        return value.toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    /**
     * Validate and normalize course code format
     * Should be 2-5 letters followed by 2-3 digits
     */
    function validateCourseCode(value) {
        const normalized = normalizeCourseCode(value);
        const pattern = /^[A-Z]{2,5}\d{2,3}$/;
        return pattern.test(normalized);
    }

    /**
     * Normalize paper type to match database values
     */
    function normalizePaperType(value) {
        if (!value) return '';
        const map = {
            'midterm': 'Midterm',
            'mid-term': 'Midterm',
            'mid': 'Midterm',
            'final': 'Final',
            'finals': 'Final',
            'quiz': 'Quiz',
            'quizzes': 'Quiz',
            'assignment': 'Assignment',
            'assignments': 'Assignment',
            'assgn': 'Assignment',
        };
        const normalized = value.toString().trim().toLowerCase();
        return map[normalized] || value;
    }

    /**
     * Get file format from MIME type
     */
    function getFileFormat(mimeType) {
        const map = {
            'application/pdf': 'PDF',
            'image/png': 'PNG',
            'image/jpeg': 'JPG',
            'image/jpg': 'JPG',
        };
        return map[mimeType] || 'PDF';
    }

    function validateFile(file) {
        if (!file) return { ok: false, msg: 'Please choose a file.' };
        const allowed = new Set(['application/pdf','image/png','image/jpeg']);
        if (!allowed.has(file.type)) return { ok: false, msg: 'Only PDF, PNG, JPG are allowed.' };
        const max = 50 * 1024 * 1024; // 50MB
        if (file.size > max) return { ok: false, msg: 'File exceeds 50MB limit.' };
        return { ok: true };
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

    // Drag & drop events
    ['dragenter', 'dragover'].forEach(evt => dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('border-purple-500');
    }));
    ['dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('border-purple-500');
    }));
    dropZone.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const valid = validateFile(file);
            if (valid.ok) {
                selectedFile = file;
                setFileInfo(file);
            } else {
                notify(valid.msg, 'error');
            }
        }
    });
    dropZone.addEventListener('click', () => fileInput.click());
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0] || null;
        const valid = validateFile(file);
        if (valid.ok) {
            selectedFile = file;
            setFileInfo(file);
        } else {
            notify(valid.msg, 'error');
            selectedFile = null;
            setFileInfo(null);
        }
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
    requestAccessLink?.addEventListener('click', (e) => {
        e.preventDefault();
        requestAccess.classList.toggle('hidden');
    });
    reqSubmit?.addEventListener('click', async () => {
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

    // Generate unique object path
    function generateObjectPath(userId, originalName) {
        const ext = (originalName.split('.').pop() || 'pdf').toLowerCase();
        const uuid = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        return `${userId}/${ts}-${uuid}.${ext}`;
    }

    // Upload with progress using Storage REST
    async function uploadWithProgress(bucket, objectPath, file, onProgress) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated');
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

    // Handle submit
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

        const subject = subjectEl.value.trim();
        const courseCodeRaw = courseCodeEl.value.trim();
        const semester = parseInt(semesterEl.value, 10);
        const paperTypeRaw = paperTypeEl.value.trim();
        const year = parseInt(yearEl.value, 10);
        const file = selectedFile;

        // Validation
        if (!subject) return notify('Please enter a subject.', 'error');
        
        if (!courseCodeRaw) return notify('Please enter a course code.', 'error');
        if (!validateCourseCode(courseCodeRaw)) {
            return notify('Invalid course code format. Use format like CS-101 or MTH102.', 'error');
        }
        const courseCode = normalizeCourseCode(courseCodeRaw);

        if (!semester || semester < 1 || semester > 8) {
            return notify('Please select a valid semester (1-8).', 'error');
        }

        if (!paperTypeRaw) return notify('Please select a paper type.', 'error');
        const paperType = normalizePaperType(paperTypeRaw);

        if (!year || year < 2000 || year > 2099) return notify('Please enter a valid year.', 'error');
        
        const valid = validateFile(file);
        if (!valid.ok) return notify(valid.msg, 'error');

        const objectPath = generateObjectPath(session.user.id, file.name);
        setUploadingState(true);
        const start = Date.now();
        try {
            await uploadWithProgress(STORAGE_BUCKET, objectPath, file, (loaded, total) => {
                const pct = Math.round((loaded / total) * 100);
                const elapsed = (Date.now() - start) / 1000;
                const speed = loaded / Math.max(elapsed, 0.1);
                const remaining = Math.max((total - loaded) / Math.max(speed, 1), 0);
                progressBar.style.width = `${pct}%`;
                progressText.textContent = `Uploading file... ${pct}%`;
                progressEta.textContent = `${Math.ceil(remaining)}s`;
            });

            // Use a public URL (if bucket public) or the object path
            const { data: urlData } = await supabase.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
            const fileUrl = urlData?.publicUrl || objectPath;

            // Prepare database record with new schema
            const record = {
                subject: subject,
                course_code: courseCode,
                paper_code: courseCode, // Keep for backward compatibility
                semester: semester,
                paper_type: paperType,
                exam_type: paperType, // Keep for backward compatibility
                year: year,
                file_url: fileUrl,
                file_name: file.name,
                file_size: file.size,
                file_format: getFileFormat(file.type),
                popularity: 0, // Initialize popularity counter
                uploader_id: session.user.id,
                uploader_email: session.user.email,
                is_active: true
            };

            const { error: dbErr } = await supabase.from('past_papers').insert(record);
            if (dbErr) {
                console.error('Database insert error:', dbErr);
                throw new Error(dbErr.message || 'Failed to save paper record.');
            }

            notify('Past paper uploaded successfully!', 'success');
            uploadForm.reset();
            selectedFile = null;
            setFileInfo(null);
            progressText.textContent = 'Upload complete';

            setTimeout(() => {
                window.location.href = 'past-papers/past-papers.html';
            }, 1500);
        } catch (err) {
            console.error(err);
            notify(err.message || 'Upload failed.', 'error');
        } finally {
            setUploadingState(false);
        }
    });

    // Real-time course code validation
    courseCodeEl?.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        if (!value) {
            e.target.classList.remove('border-red-500', 'border-green-500');
            return;
        }
        const isValid = validateCourseCode(value);
        e.target.classList.remove('border-red-500', 'border-green-500');
        if (isValid) {
            e.target.classList.add('border-green-500');
        } else {
            e.target.classList.add('border-red-500');
        }
    });

    // Format course code on blur (normalize display)
    courseCodeEl?.addEventListener('blur', (e) => {
        const value = e.target.value.trim();
        if (value && validateCourseCode(value)) {
            const normalized = normalizeCourseCode(value);
            // Display with hyphen for readability: CS101 -> CS-101
            const formatted = normalized.replace(/([A-Z]+)(\d{2,3})/, '$1-$2');
            e.target.value = formatted;
        }
    });

    (async function init() {
        await checkAuthAndRole();
    })();
})();


