const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

// Cursor State
let mouseX = 0;
let mouseY = 0;
let outlineX = 0;
let outlineY = 0;
let cursorVisible = false;

// Cursor Settings
let delay = 0.25; // Smoothness factor (lower = smoother trail, higher = snappier)
const DELAY_NORMAL = 0.25;
const DELAY_SNAP = 0.9; // Near-instant for video modal

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Dot follows instantly via GPU-composited transform
    cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;

    // Show cursor on first move (avoids flash at 0,0)
    if (!cursorVisible) {
        cursorVisible = true;
        cursorDot.style.opacity = '1';
        cursorOutline.style.opacity = '1';
        outlineX = mouseX;
        outlineY = mouseY;
    }
});

function animateCursor() {
    // Lerp for smooth outline follow
    outlineX += (mouseX - outlineX) * delay;
    outlineY += (mouseY - outlineY) * delay;

    // GPU-composited transform (no layout reflow)
    cursorOutline.style.transform = `translate3d(${outlineX}px, ${outlineY}px, 0) translate(-50%, -50%)`;

    requestAnimationFrame(animateCursor);
}

// Start Loop
animateCursor();

// Click pulse animation for cursor
window.addEventListener('mousedown', () => {
    cursorOutline.classList.add('cursor-click');
});
window.addEventListener('mouseup', () => {
    // Remove class after animation completes to allow re-triggering
    setTimeout(() => cursorOutline.classList.remove('cursor-click'), 400);
});


/* Project Hover Effects */
const projects = document.querySelectorAll('.project-item');
const previewBg = document.querySelector('.project-preview-bg');

projects.forEach(project => {
    project.addEventListener('mouseenter', () => {
        const imageUrl = project.getAttribute('data-image');
        previewBg.style.opacity = '0.4';
    });

    project.addEventListener('mouseleave', () => {
        previewBg.style.opacity = '0';
    });

    // Click to play audio
    project.addEventListener('click', () => {
        const index = Array.from(projects).indexOf(project);
        playTrackByIndex(index);
    });
});

/* Audio Player Logic */
const audio = new Audio();
const playerBar = document.querySelector('.audio-player-bar');
const playPauseBtn = document.querySelector('.play-pause-btn');
const playIcon = playPauseBtn.querySelector('span');
const trackInfo = document.querySelector('.track-info');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
const seekContainer = document.querySelector('.seek-container');
const seekBar = document.querySelector('.seek-bar');
const visualizer = document.querySelector('.waveform-visualizer');

let currentTrackIndex = -1;
let isPlaying = false;

function playTrackByIndex(index) {
    if (index < 0 || index >= projects.length) return;

    // If same track, just toggle
    if (currentTrackIndex === index && audio.src) {
        togglePlay();
        return;
    }

    currentTrackIndex = index;
    const project = projects[index];
    const src = project.getAttribute('data-audio');
    const title = project.querySelector('.project-title').innerText;

    audio.src = src;
    audio.play().catch(e => console.log("Audio play failed (interaction needed):", e));
    isPlaying = true;

    updatePlayerUI(true, title);
    playerBar.classList.add('active'); // Slide up
}

function togglePlay() {
    if (!audio.src) return;

    if (audio.paused) {
        audio.play();
        isPlaying = true;
    } else {
        audio.pause();
        isPlaying = false;
    }
    updatePlayerUI(isPlaying);
}

function updatePlayerUI(playing, title = null) {
    if (title) trackInfo.innerText = title;

    // Update Icon
    if (playing) {
        playIcon.className = 'icon-pause';
        playIcon.innerHTML = '&#10074;&#10074;';
    } else {
        playIcon.className = 'icon-play';
        playIcon.innerHTML = '&#9654;';
    }

    if (playing) {
        visualizer.style.opacity = '1';
    } else {
        visualizer.style.opacity = '0.5';
    }
}

// Controls
playPauseBtn.addEventListener('click', togglePlay);

prevBtn.addEventListener('click', () => {
    let newIndex = currentTrackIndex - 1;
    if (newIndex < 0) newIndex = projects.length - 1; // Loop to end
    playTrackByIndex(newIndex);
});

nextBtn.addEventListener('click', () => {
    let newIndex = currentTrackIndex + 1;
    if (newIndex >= projects.length) newIndex = 0; // Loop to start
    playTrackByIndex(newIndex);
});

/* Seek Logic - Drag without Scrubbing */
let isDraggingSeek = false;

// Smooth seek bar via requestAnimationFrame (timeupdate only fires ~4x/sec)
function updateSeekBar() {
    if (!isDraggingSeek && audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100;
        seekBar.style.width = `${percent}%`;
    }
    if (!audio.paused) {
        requestAnimationFrame(updateSeekBar);
    }
}

// Start the smooth loop whenever audio plays
audio.addEventListener('play', () => {
    requestAnimationFrame(updateSeekBar);
});

// Final update when audio ends
audio.addEventListener('ended', () => {
    seekBar.style.width = '100%';
});

function getSeekPercent(e) {
    const rect = seekContainer.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let offsetX = clientX - rect.left;

    // Clamp
    if (offsetX < 0) offsetX = 0;
    if (offsetX > rect.width) offsetX = rect.width;

    return offsetX / rect.width;
}

seekContainer.addEventListener('mousedown', (e) => {
    if (!audio.duration) return;
    isDraggingSeek = true;

    // Update visual immediately on click
    const percent = getSeekPercent(e);
    seekBar.style.width = `${percent * 100}%`;
});

window.addEventListener('mousemove', (e) => {
    if (isDraggingSeek) {
        e.preventDefault();
        const percent = getSeekPercent(e);
        seekBar.style.width = `${percent * 100}%`;
    }
});

window.addEventListener('mouseup', (e) => {
    if (isDraggingSeek) {
        isDraggingSeek = false;

        // Commit change to audio ONLY on mouseup
        if (audio.duration) {
            const percent = getSeekPercent(e);
            audio.currentTime = percent * audio.duration;
        }
    }
});

// Touch support for audio seek bar (mobile)
seekContainer.addEventListener('touchstart', (e) => {
    if (!audio.duration) return;
    isDraggingSeek = true;
    const percent = getSeekPercent(e);
    seekBar.style.width = `${percent * 100}%`;
    e.preventDefault();
}, { passive: false });

seekContainer.addEventListener('touchmove', (e) => {
    if (isDraggingSeek) {
        const percent = getSeekPercent(e);
        seekBar.style.width = `${percent * 100}%`;
        e.preventDefault();
    }
}, { passive: false });

seekContainer.addEventListener('touchend', (e) => {
    if (isDraggingSeek) {
        isDraggingSeek = false;
        if (audio.duration) {
            const rect = seekContainer.getBoundingClientRect();
            const barWidth = seekBar.getBoundingClientRect().width;
            const percent = barWidth / rect.width;
            audio.currentTime = percent * audio.duration;
        }
    }
});

// Auto Next Track
audio.onended = () => {
    nextBtn.click();
};

/* Volume Control Logic */
const volumeBtn = document.querySelector('.volume-btn');
const volumeSlider = document.querySelector('.volume-slider');
let lastVolume = 1;

if (volumeSlider && volumeBtn) {
    // 1. Handle Slider Change
    volumeSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        audio.volume = value;

        // Visual Gradient
        const percent = value * 100;
        volumeSlider.style.background = `linear-gradient(to right, var(--color-accent) ${percent}%, rgba(255, 255, 255, 0.1) ${percent}%)`;

        // Update Mute Icon based on volume
        updateVolumeIcon(value);
    });

    // Initialize visual state
    volumeSlider.style.background = `linear-gradient(to right, var(--color-accent) ${audio.volume * 100}%, rgba(255, 255, 255, 0.1) ${audio.volume * 100}%)`;

    // 2. Handle Mute Click
    volumeBtn.addEventListener('click', () => {
        if (audio.volume > 0) {
            lastVolume = audio.volume;
            audio.volume = 0;
            volumeSlider.value = 0;
        } else {
            audio.volume = lastVolume;
            volumeSlider.value = lastVolume;
        }
        updateVolumeIcon(audio.volume);
    });

    function updateVolumeIcon(vol) {
        const svgBase = '<svg class="volume-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
        const speaker = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>';

        if (vol == 0) {
            // Muted: speaker + X
            volumeBtn.innerHTML = svgBase + speaker + '<line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
            volumeBtn.style.opacity = '0.5';
        } else if (vol < 0.5) {
            // Low: speaker + 1 wave
            volumeBtn.innerHTML = svgBase + speaker + '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            volumeBtn.style.opacity = '1';
        } else {
            // High: speaker + 2 waves
            volumeBtn.innerHTML = svgBase + speaker + '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            volumeBtn.style.opacity = '1';
        }
    }
}

// Hide custom cursor on volume slider (show native pointer instead)
const volumeSliderWrapper = document.querySelector('.volume-slider-wrapper');
if (volumeSliderWrapper) {
    volumeSliderWrapper.addEventListener('mouseenter', () => {
        cursorDot.style.opacity = '0';
        cursorOutline.style.opacity = '0';
    });
    volumeSliderWrapper.addEventListener('mouseleave', () => {
        cursorDot.style.opacity = '1';
        cursorOutline.style.opacity = '1';
    });
}


/* =========================================
   Cinematic Stardust Background (Canvas)
   ========================================= */

const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

const trailCanvas = document.getElementById('trail-canvas');
const ctxTrail = trailCanvas.getContext('2d');

let width, height;
let stars = [];
let trailStars = [];
const numStars = 120;

// Handle Resize (Debounced & Smart)
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
    if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        initCanvas();
    } else {
        height = window.innerHeight;
        canvas.height = height;
        trailCanvas.height = height;
    }
});

// Global flag for video modal state (disables particle trail)
let videoModalActive = false;

// Pattern for both mouse and touch
let pendingTrailX = 0, pendingTrailY = 0, trailQueued = false;
function spawnTrail(x, y) {
    if (videoModalActive) return; // No particles during video playback
    // Throttle to one spawn per animation frame to reduce GC pressure
    pendingTrailX = x;
    pendingTrailY = y;
    if (!trailQueued) {
        trailQueued = true;
        requestAnimationFrame(() => {
            trailQueued = false;
            for (let i = 0; i < 2; i++) {
                trailStars.push(new TrailParticle(pendingTrailX, pendingTrailY));
            }
        });
    }
}

// Track mouse for trail
window.addEventListener('mousemove', (e) => {
    spawnTrail(e.clientX, e.clientY);
}, { passive: true });

// Track touch for trail (Mobile Support)
window.addEventListener('touchmove', (e) => {
    // Check if touch exists
    if (e.touches.length > 0) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        spawnTrail(touchX, touchY);
    }
}, { passive: true });

// Scroll handler is defined once below (after nav/footer are declared) to avoid duplication

// Hide/Show Cursor when leaving window
document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget && !e.toElement) { // Checking if left the window
        cursorDot.style.opacity = '0';
        cursorOutline.style.opacity = '0';
    }
});

document.addEventListener('mouseover', (e) => {
    cursorDot.style.opacity = '1';
    cursorOutline.style.opacity = '1';
});

function initCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    trailCanvas.width = width;
    trailCanvas.height = height;

    // Re-populate stars on resize
    stars = [];
    for (let i = 0; i < numStars; i++) {
        stars.push(new Star());
    }
}

class Star {
    constructor() {
        this.reset(true);
    }

    reset(initial = false) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = Math.random() * 2;
        this.size = Math.random() * 1.5 + 0.5;

        this.isNote = Math.random() < 0.15;
        if (this.isNote) {
            const notes = ['♪', '♫', '♭', '♯', '𝄞'];
            this.symbol = notes[Math.floor(Math.random() * notes.length)];
            this.size = Math.random() * 10 + 8;
        }

        this.vx = (Math.random() - 0.5) * 0.2;
        this.vy = (Math.random() - 0.5) * 0.2;

        this.opacity = Math.random() * 0.5 + 0.1;
        this.fadeDir = Math.random() > 0.5 ? 0.005 : -0.005;

        // Pre-compute gold vs white color (avoids per-frame Math.random)
        this.isGold = !this.isNote && Math.random() > 0.9;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        this.opacity += this.fadeDir;
        if (this.opacity > 0.8 || this.opacity < 0.1) {
            this.fadeDir = -this.fadeDir;
        }

        if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
            this.reset();
        }
    }

    draw() {
        // Draw to BACKGROUND context (ctx)
        if (this.isNote) {
            ctx.font = `${this.size}px 'Cormorant Garamond', serif`;
            ctx.fillStyle = `rgba(212, 175, 55, ${this.opacity * 0.8})`;
            ctx.fillText(this.symbol, this.x, this.y);
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

            if (this.isGold) {
                ctx.fillStyle = `rgba(212, 175, 55, ${this.opacity})`;
            } else {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
            }
            ctx.fill();
        }
    }
}

class TrailParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 1.5 + 0.5;

        this.isNote = Math.random() < 0.2;
        if (this.isNote) {
            const notes = ['♪', '♫', '♭', '♯'];
            this.symbol = notes[Math.floor(Math.random() * notes.length)];
            this.size = Math.random() * 10 + 8;
        }

        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.5 + 0.2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.opacity = 1;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.opacity = this.life;
    }

    draw() {
        if (this.opacity <= 0) return;

        // Draw to TRAIL context (ctxTrail)
        if (this.isNote) {
            ctxTrail.font = `${this.size}px 'Cormorant Garamond', serif`;
            ctxTrail.fillStyle = `rgba(212, 175, 55, ${this.opacity * 0.6})`;
            ctxTrail.fillText(this.symbol, this.x, this.y);
        } else {
            ctxTrail.beginPath();
            ctxTrail.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctxTrail.fillStyle = `rgba(212, 175, 55, ${this.opacity})`;
            ctxTrail.fill();
        }
    }
}

function animateStars() {
    // Pause canvas rendering when video modal is active (frees GPU for video decoding)
    if (videoModalActive) {
        requestAnimationFrame(animateStars);
        return;
    }

    // Clear both
    ctx.clearRect(0, 0, width, height);
    ctxTrail.clearRect(0, 0, width, height);

    // Background Stars
    stars.forEach(star => {
        star.update();
        star.draw();
    });

    // Trail Particles — swap-and-pop removal (O(1) vs O(n) splice)
    for (let i = trailStars.length - 1; i >= 0; i--) {
        const p = trailStars[i];
        p.update();
        p.draw();
        if (p.life <= 0) {
            trailStars[i] = trailStars[trailStars.length - 1];
            trailStars.pop();
        }
    }

    requestAnimationFrame(animateStars);
}

// Start
initCanvas();
animateStars();

/* =========================================
   Scroll Linked Animations (Scrubbing + Lerp)
   ========================================= */

// Linear Interpolation Helper
const lerp = (start, end, factor) => start + (end - start) * factor;

class ScrollItem {
    constructor(el) {
        this.el = el;

        // Check current inline style to prevent reset/blinking
        const currentOpacity = parseFloat(el.style.opacity);
        const startOpacity = isNaN(currentOpacity) ? 0 : currentOpacity;

        this.current = {
            opacity: startOpacity,
            translateY: 0,
            scale: 0.95
        };
        this.target = { ...this.current };
    }

    // Measure phase (Read)
    updateTarget(windowHeight, centerLine) {
        const rect = this.el.getBoundingClientRect();
        // Calculate "natural" position by removing the current transform effect
        const naturalTop = rect.top - this.current.translateY;
        const elCenter = naturalTop + (this.el.offsetHeight / 2);

        const distance = elCenter - centerLine;
        const absDistance = Math.abs(distance);

        const isMobile = window.innerWidth <= 768;
        const safeZoneHalfHeight = windowHeight * (isMobile ? 0.55 : 0.40);
        const maxDistance = windowHeight * (isMobile ? 0.75 : 0.55);

        // 1. Calculate Target Progress
        let progress = 0;
        if (absDistance > safeZoneHalfHeight) {
            progress = (absDistance - safeZoneHalfHeight) / (maxDistance - safeZoneHalfHeight);
        }

        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;

        // 2. Set Target Values
        this.target.opacity = 1 - (progress * 0.8);
        // REMOVED blur for performance (cause of jitter)
        this.target.translateY = distance * 0.15;
        this.target.scale = 1 - (progress * 0.05);
    }

    // Lerp phase (Calc) — returns true if still animating
    updateCurrent() {
        const factor = 0.15;
        this.current.opacity = lerp(this.current.opacity, this.target.opacity, factor);
        this.current.translateY = lerp(this.current.translateY, this.target.translateY, factor);
        this.current.scale = lerp(this.current.scale, this.target.scale, factor);

        // Check if values have converged (settled)
        const settled =
            Math.abs(this.current.opacity - this.target.opacity) < 0.005 &&
            Math.abs(this.current.translateY - this.target.translateY) < 0.1 &&
            Math.abs(this.current.scale - this.target.scale) < 0.0005;
        return !settled;
    }

    // Render phase (Write)
    render() {
        // Use translate3d for GPU acceleration
        this.el.style.transform = `translate3d(0, ${this.current.translateY.toFixed(2)}px, 0) scale(${this.current.scale.toFixed(4)})`;
        this.el.style.opacity = this.current.opacity.toFixed(3);
    }
}

// Initialize Items
const scrollItemsMap = new Map();

function initScrollItems() {
    const elements = document.querySelectorAll('.scroll-animate');
    const newElementsSet = new Set(elements);

    // 1. Remove items that are no longer in DOM or valid
    for (const [el, item] of scrollItemsMap) {
        if (!newElementsSet.has(el)) {
            scrollItemsMap.delete(el);
        }
    }

    // 2. Add new items (Preserve existing ones!)
    elements.forEach(el => {
        if (!scrollItemsMap.has(el)) {
            scrollItemsMap.set(el, new ScrollItem(el));
        }
    });
}

initScrollItems();

// Scroll animation loop with idle detection — stops when all items have settled
let scrollAnimRunning = false;

function animateScroll() {
    const windowHeight = window.innerHeight;
    const centerLine = windowHeight / 2;

    let anyAnimating = false;

    // 1. READ Phase (Batch all reads)
    for (const item of scrollItemsMap.values()) {
        item.updateTarget(windowHeight, centerLine);
    }

    // 2. CALC & WRITE Phase
    for (const item of scrollItemsMap.values()) {
        const still = item.updateCurrent(); // Pure math — returns true if still animating
        item.render();        // DOM Write
        if (still) anyAnimating = true;
    }

    // Only continue loop if something is still moving
    if (anyAnimating) {
        requestAnimationFrame(animateScroll);
    } else {
        scrollAnimRunning = false;
    }
}

function kickScrollAnim() {
    if (!scrollAnimRunning) {
        scrollAnimRunning = true;
        requestAnimationFrame(animateScroll);
    }
}

// Start initial loop
kickScrollAnim();

/* =========================================
   Contact Form Logic
   ========================================= */
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');
    const submitBtn = document.querySelector('.submit-btn');
    const successMessage = document.getElementById('successMessage');

    const inputs = [nameInput, emailInput, messageInput];

    // Check Validation (Enables button)
    function checkValidation() {
        // Strict Email Regex: standardUser@domain.extension
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        const isNameValid = nameInput.value.trim().length > 0;
        const isMessageValid = messageInput.value.trim().length > 0;
        const isEmailValid = emailPattern.test(emailInput.value.trim());

        if (isNameValid && isMessageValid && isEmailValid) {
            submitBtn.removeAttribute('disabled');
            submitBtn.classList.add('active');
        } else {
            submitBtn.setAttribute('disabled', 'true');
            submitBtn.classList.remove('active');
        }
    }

    // Real-time Feedback Logic (Blur & Input)
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    function validateField(input, type) {
        let isValid = false;
        if (type === 'email') {
            isValid = emailPattern.test(input.value.trim());
        } else {
            isValid = input.value.trim().length > 0;
        }

        if (!isValid) {
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }
    }

    inputs.forEach(input => {
        // On Blur: Check if empty/invalid and show error
        input.addEventListener('blur', () => {
            if (input.id === 'link') return; // Skip optional link
            const type = input.id === 'email' ? 'email' : 'text';
            validateField(input, type);
        });

        // On Focus: Clear error immediately (Better UX than waiting for typing)
        input.addEventListener('focus', () => {
            input.classList.remove('error');
        });

        // On Input: Just check verification for the button state
        input.addEventListener('input', () => {
            // input.classList.remove('error'); // Handled by focus now
            checkValidation();
        });
    });

    // Handle Submit
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const contactHeader = document.querySelector('.contact-header');
        const originalBtnText = submitBtn.textContent;

        // 1. Show Instant Feedback ("Sending...")
        submitBtn.textContent = 'Sending...';
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'wait';

        // 2. Prepare Data
        const templateParams = {
            from_name: nameInput.value,
            from_email: emailInput.value,
            message: messageInput.value,
            portfolio_link: document.getElementById('link').value || 'Not provided'
        };

        // 3. Send Email (Async)
        emailjs.send('service_fmqukqn', 'template_3w9hg68', templateParams)
            .then(function (response) {
                console.log('SUCCESS!', response.status, response.text);

                // 4. On Success: Fade out Form & Header
                contactForm.style.opacity = '0';
                if (contactHeader) contactHeader.style.opacity = '0';

                setTimeout(() => {
                    contactForm.style.display = 'none';
                    if (contactHeader) contactHeader.style.display = 'none';
                    successMessage.classList.add('visible');
                    initScrollItems(); // Re-calc scroll
                }, 500);

            }, function (error) {
                console.log('FAILED...', error);

                // On Error: Reset Button & Alert (Minimal fallback)
                submitBtn.textContent = 'Failed. Try again.';
                setTimeout(() => {
                    submitBtn.textContent = originalBtnText;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                }, 2000);
            });
    });
}

/* =========================================
   Dynamic Navigation Logic
   ========================================= */
const nav = document.querySelector('.nav-overlay');
const footer = document.querySelector('.footer-section');

/* Mobile Menu Logic */
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu-overlay');
const mobileLinks = document.querySelectorAll('.mobile-nav-item');

const mobileMenuClose = document.querySelector('.mobile-menu-close');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : ''; // Prevent scroll
    });
}

// Close Button Logic
if (mobileMenuClose) {
    mobileMenuClose.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
    });
}

// Close menu when clicking a link
mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = '';
    });
});

// Single, merged, RAF-throttled scroll handler (passive for butter-smooth scrolling)
let scrollTicking = false;
window.addEventListener('scroll', () => {
    // Kick the scroll animation loop on any scroll
    kickScrollAnim();

    // RAF-throttle nav logic to max once per frame
    if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(() => {
            scrollTicking = false;

            // Stop all nav hiding/glass effects if Mobile Menu is OPEN
            if (document.body.style.overflow === 'hidden') return;

            const scrollY = window.scrollY;

            // 1. Glass Effect on Scroll
            if (scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }

            // 2. Hide near Footer (Only if footer is visible/exists)
            if (footer && getComputedStyle(footer).display !== 'none') {
                const footerRect = footer.getBoundingClientRect();
                const windowHeight = window.innerHeight;

                if (footerRect.top < windowHeight) {
                    nav.classList.add('hidden');
                } else {
                    nav.classList.remove('hidden');
                }
            }
        });
    }
}, { passive: true });

/* =========================================
   Scroll Animations w/ Intersection Observer
   ========================================= */
const scrollObserverOptions = {
    threshold: 0.15, // Trigger when 15% is visible
    rootMargin: "-50px 0px -50px 0px" // Shrink view box slightly
};

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const target = entry.target;

        if (entry.isIntersecting) {
            // ENTERING (Coming into view)
            target.classList.add('scroll-in');
            target.classList.remove('scroll-hidden-bottom');
            target.classList.remove('scroll-out-top');
        } else {
            // EXITING (Leaving view)
            const rect = target.getBoundingClientRect();

            // Check if it left via TOP or BOTTOM
            if (rect.top < 0) {
                // Left via TOP (Scrolled down past it)
                target.classList.add('scroll-out-top');
                target.classList.remove('scroll-in');
            } else {
                // Left via BOTTOM (Scrolled up past it)
                // Or it was initialized below fold
                target.classList.remove('scroll-in');
                target.classList.remove('scroll-out-top');
                target.classList.add('scroll-hidden-bottom');
            }
        }
    });
}, scrollObserverOptions);

document.querySelectorAll('.scroll-animate').forEach(el => {
    scrollObserver.observe(el);
});

/* =========================================
   Works Toggle Logic
   ========================================= */
const toggleBtns = document.querySelectorAll('.toggle-btn');
const worksContainers = document.querySelectorAll('.works-container');
const videos = document.querySelectorAll('video');

toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // 1. Update Buttons
        toggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 2. Update Containers
        const type = btn.getAttribute('data-type');
        worksContainers.forEach(container => {
            if (container.id === `${type}-works`) {
                container.classList.add('active');
            } else {
                container.classList.remove('active');
            }
        });

        // 3. Pause Videos on Switch (audio keeps playing)
        videos.forEach(video => video.pause());

        // 4. Force-reveal scroll items in the new container to prevent re-animation jitter
        const newContainer = document.getElementById(`${type}-works`);
        if (newContainer) {
            newContainer.querySelectorAll('.scroll-animate').forEach(el => {
                el.classList.add('scroll-in');
                el.classList.remove('scroll-hidden-bottom');
            });
        }
    });
});

/* =========================================
   Video Gallery & Lightbox Logic
   ========================================= */

// Gallery Horizontal Scroll (Optional: Add drag-to-scroll if needed, currently native scroll)
const galleryContainer = document.querySelector('.gallery-scroll-container');
let isDown = false;
let startX;
let scrollLeft;

if (galleryContainer) {
    galleryContainer.addEventListener('mousedown', (e) => {
        isDown = true;
        galleryContainer.classList.add('active');
        startX = e.pageX - galleryContainer.offsetLeft;
        scrollLeft = galleryContainer.scrollLeft;
    });

    galleryContainer.addEventListener('mouseleave', () => {
        isDown = false;
        galleryContainer.classList.remove('active');
    });

    galleryContainer.addEventListener('mouseup', () => {
        isDown = false;
        galleryContainer.classList.remove('active');
    });

    galleryContainer.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - galleryContainer.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast
        galleryContainer.scrollLeft = scrollLeft - walk;
    });
}


// Lightbox Modal Logic with Custom Video Controls
const videoModal = document.getElementById('video-modal');
const modalVideoPlayer = document.getElementById('modal-video-player');
const modalCloseBtn = document.querySelector('.modal-close-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

// Custom controls elements
const videoPlayBtn = document.querySelector('.video-play-btn');
const videoTimeDisplay = document.querySelector('.video-time');
const videoSeekContainer = document.querySelector('.video-seek-container');
const videoSeekBar = document.querySelector('.video-seek-bar');
const videoFullscreenBtn = document.querySelector('.video-fullscreen-btn');
const videoControlsBar = document.querySelector('.video-controls');
const videoTitleEl = document.querySelector('.video-title');

if (videoModal && modalVideoPlayer) {
    let isDraggingVideoSeek = false;
    let controlsTimeout = null;

    // Format time as M:SS
    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Show/hide controls + title with auto-hide
    function showControls() {
        if (videoControlsBar) videoControlsBar.classList.remove('hidden');
        if (videoTitleEl) videoTitleEl.classList.remove('hidden');
        clearTimeout(controlsTimeout);
        // Auto-hide after 3 seconds if video is playing
        if (!modalVideoPlayer.paused) {
            controlsTimeout = setTimeout(() => {
                if (videoControlsBar) videoControlsBar.classList.add('hidden');
                if (videoTitleEl) videoTitleEl.classList.add('hidden');
            }, 1500);
        }
    }

    // Open Modal
    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            // Stop background audio if playing
            if (typeof audio !== 'undefined' && !audio.paused) {
                audio.pause();
                isPlaying = false;
                updatePlayerUI(false);
            }

            const videoSrc = item.getAttribute('data-video-src');
            if (videoSrc) {
                // Set video title from gallery info
                const infoEl = item.querySelector('.gallery-info');
                if (infoEl && videoTitleEl) {
                    const h3 = infoEl.querySelector('h3');
                    const span = infoEl.querySelector('span');
                    const title = h3 ? h3.textContent : '';
                    const type = span ? span.textContent : '';
                    videoTitleEl.textContent = type ? `${title} — ${type}` : title;
                }

                modalVideoPlayer.src = videoSrc;

                // Reset Seeker & Time immediately
                if (videoSeekBar) videoSeekBar.style.width = '0%';
                if (videoTimeDisplay) videoTimeDisplay.textContent = '0:00 / 0:00';

                videoModal.classList.add('active');
                videoModalActive = true; // Disable particle trail
                delay = DELAY_SNAP; // Cursor follows instantly in modal

                // Hide canvases to free GPU for video decoding
                canvas.style.display = 'none';
                trailCanvas.style.display = 'none';

                // Ensure custom cursor is visible
                cursorDot.style.opacity = '1';
                cursorOutline.style.opacity = '1';

                setTimeout(() => {
                    modalVideoPlayer.play().catch(e => console.log("Auto-play failed:", e));
                }, 100);

                document.body.style.overflow = 'hidden';
                showControls();
            }
        });
    });

    // Close Modal Function
    function closeModal() {
        modalVideoPlayer.pause();
        modalVideoPlayer.src = "";
        videoModal.classList.remove('active');
        videoModalActive = false; // Re-enable particle trail
        delay = DELAY_NORMAL; // Restore cursor trail

        // Restore canvases
        canvas.style.display = '';
        trailCanvas.style.display = '';

        document.body.style.overflow = '';
        clearTimeout(controlsTimeout);
        if (videoPlayBtn) {
            videoPlayBtn.innerHTML = '<span class="icon-play">&#9654;</span>';
        }
        // Reset Seeker & Time
        if (videoSeekBar) videoSeekBar.style.width = '0%';
        if (videoTimeDisplay) videoTimeDisplay.textContent = '0:00 / 0:00';
    }

    // Play/Pause Toggle
    function toggleVideoPlay() {
        if (modalVideoPlayer.paused) {
            modalVideoPlayer.play();
        } else {
            modalVideoPlayer.pause();
        }
    }

    // Click video to play/pause
    modalVideoPlayer.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleVideoPlay();
        showControls();
    });

    // Play button
    if (videoPlayBtn) {
        videoPlayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleVideoPlay();
        });
    }

    // Update play/pause icon
    modalVideoPlayer.addEventListener('play', () => {
        if (videoPlayBtn) {
            videoPlayBtn.innerHTML = '<span>&#10074;&#10074;</span>'; // Pause icon
        }
        showControls(); // Start auto-hide timer
    });

    modalVideoPlayer.addEventListener('pause', () => {
        if (videoPlayBtn) {
            videoPlayBtn.innerHTML = '<span class="icon-play">&#9654;</span>'; // Play icon
        }
        showControls(); // Keep controls visible when paused
        clearTimeout(controlsTimeout); // Don't auto-hide when paused
    });

    // Time update → seek bar + time display
    modalVideoPlayer.addEventListener('timeupdate', () => {
        if (!isDraggingVideoSeek && modalVideoPlayer.duration) {
            const percent = (modalVideoPlayer.currentTime / modalVideoPlayer.duration) * 100;
            videoSeekBar.style.width = `${percent}%`;
        }
        if (videoTimeDisplay) {
            videoTimeDisplay.textContent = `${formatTime(modalVideoPlayer.currentTime)} / ${formatTime(modalVideoPlayer.duration)}`;
        }
    });

    // Seek bar interaction
    if (videoSeekContainer) {
        function getVideoSeekPercent(e) {
            const rect = videoSeekContainer.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            let x = (clientX - rect.left) / rect.width;
            return Math.max(0, Math.min(1, x));
        }

        videoSeekContainer.addEventListener('mousedown', (e) => {
            if (!modalVideoPlayer.duration) return;
            isDraggingVideoSeek = true;
            const percent = getVideoSeekPercent(e);
            videoSeekBar.style.width = `${percent * 100}%`;
            e.stopPropagation();
        });

        window.addEventListener('mousemove', (e) => {
            if (isDraggingVideoSeek && modalVideoPlayer.duration) {
                const percent = getVideoSeekPercent(e);
                videoSeekBar.style.width = `${percent * 100}%`;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (isDraggingVideoSeek) {
                isDraggingVideoSeek = false;
                if (modalVideoPlayer.duration) {
                    const percent = getVideoSeekPercent(e);
                    modalVideoPlayer.currentTime = percent * modalVideoPlayer.duration;
                }
            }
        });

        // Touch support for mobile
        videoSeekContainer.addEventListener('touchstart', (e) => {
            if (!modalVideoPlayer.duration) return;
            isDraggingVideoSeek = true;
            const percent = getVideoSeekPercent(e);
            videoSeekBar.style.width = `${percent * 100}%`;
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });

        videoSeekContainer.addEventListener('touchmove', (e) => {
            if (isDraggingVideoSeek && modalVideoPlayer.duration) {
                const percent = getVideoSeekPercent(e);
                videoSeekBar.style.width = `${percent * 100}%`;
                e.preventDefault();
            }
        }, { passive: false });

        videoSeekContainer.addEventListener('touchend', (e) => {
            if (isDraggingVideoSeek) {
                isDraggingVideoSeek = false;
                if (modalVideoPlayer.duration) {
                    // Use last touch position
                    const rect = videoSeekContainer.getBoundingClientRect();
                    const barWidth = videoSeekBar.getBoundingClientRect().width;
                    const percent = barWidth / rect.width;
                    modalVideoPlayer.currentTime = percent * modalVideoPlayer.duration;
                }
            }
        });
    }

    // Video Volume Control
    const videoVolumeBtn = document.querySelector('.video-volume-btn');
    const videoVolumeSlider = document.querySelector('.video-volume-slider');
    const videoVolumeSliderWrapper = document.querySelector('.video-volume-slider-wrapper');
    let lastVideoVolume = 1;

    function updateVideoVolumeSliderVisual(value) {
        if (!videoVolumeSlider) return;
        const percent = value * 100;
        videoVolumeSlider.style.background = `linear-gradient(to right, var(--color-accent) ${percent}%, rgba(255, 255, 255, 0.15) ${percent}%)`;
    }

    function updateVideoVolumeIcon(vol) {
        if (!videoVolumeBtn) return;
        if (vol == 0) {
            videoVolumeBtn.innerHTML = '<svg class="volume-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
            videoVolumeBtn.style.opacity = '0.5';
        } else if (vol < 0.5) {
            videoVolumeBtn.innerHTML = '<svg class="volume-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            videoVolumeBtn.style.opacity = '1';
        } else {
            videoVolumeBtn.innerHTML = '<svg class="volume-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            videoVolumeBtn.style.opacity = '1';
        }
    }

    if (videoVolumeSlider && videoVolumeBtn) {
        updateVideoVolumeSliderVisual(1);

        videoVolumeSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            modalVideoPlayer.volume = val;
            updateVideoVolumeSliderVisual(val);
            updateVideoVolumeIcon(val);
        });

        videoVolumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (modalVideoPlayer.volume > 0) {
                lastVideoVolume = modalVideoPlayer.volume;
                modalVideoPlayer.volume = 0;
                videoVolumeSlider.value = 0;
            } else {
                modalVideoPlayer.volume = lastVideoVolume;
                videoVolumeSlider.value = lastVideoVolume;
            }
            updateVideoVolumeSliderVisual(modalVideoPlayer.volume);
            updateVideoVolumeIcon(modalVideoPlayer.volume);
        });
    }

    // Hide custom cursor on video volume slider
    if (videoVolumeSliderWrapper) {
        videoVolumeSliderWrapper.addEventListener('mouseenter', () => {
            cursorDot.style.opacity = '0';
            cursorOutline.style.opacity = '0';
        });
        videoVolumeSliderWrapper.addEventListener('mouseleave', () => {
            cursorDot.style.opacity = '1';
            cursorOutline.style.opacity = '1';
        });
    }

    // Fullscreen toggle
    if (videoFullscreenBtn) {
        videoFullscreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const modalContent = document.querySelector('.modal-content');
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else if (modalContent) {
                modalContent.requestFullscreen().catch(err => console.log("Fullscreen failed:", err));
            }
        });
    }

    // Show native cursor in fullscreen (custom cursor divs are outside the fullscreen element)
    document.addEventListener('fullscreenchange', () => {
        const fs = document.fullscreenElement;
        if (fs && fs.classList.contains('modal-content')) {
            fs.style.cursor = 'default';
            fs.querySelectorAll('*').forEach(el => el.style.cursor = 'default');
            cursorDot.style.opacity = '0';
            cursorOutline.style.opacity = '0';
        } else {
            // Exiting fullscreen — restore custom cursor
            cursorDot.style.opacity = '1';
            cursorOutline.style.opacity = '1';
        }
    });

    // Show controls on mouse movement inside modal
    videoModal.addEventListener('mousemove', () => {
        if (videoModal.classList.contains('active')) {
            showControls();
        }
    });

    // Close Events
    modalCloseBtn.addEventListener('click', closeModal);

    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && videoModal.classList.contains('active')) {
            closeModal();
        }
        // Space to toggle play when modal is open
        if (e.key === ' ' && videoModal.classList.contains('active')) {
            e.preventDefault();
            toggleVideoPlay();
            showControls();
        }
    });

    // Video ended
    modalVideoPlayer.addEventListener('ended', () => {
        if (videoPlayBtn) {
            videoPlayBtn.innerHTML = '<span class="icon-play">&#9654;</span>';
        }
        showControls();
        clearTimeout(controlsTimeout);
    });
}

// Tools Logo Strip — scroll-driven color reveal
const toolsStrip = document.querySelector('.tools-strip');
if (toolsStrip) {
    const toolsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                toolsStrip.classList.add('in-view');
            } else {
                toolsStrip.classList.remove('in-view');
            }
        });
    }, { threshold: 0.3 });

    toolsObserver.observe(toolsStrip);
}

// Mobile: Continuous smooth auto-scroll for gallery
if (window.innerWidth <= 768) {
    const galleryContainer = document.querySelector('#visual-works .gallery-scroll-container');
    if (galleryContainer) {
        let userInteracted = false;
        let animationId;
        const speed = 0.5; // Pixels per frame (adjust for speed)

        const scrollLoop = () => {
            if (userInteracted) return;

            // Increment scroll
            galleryContainer.scrollLeft += speed;

            // Check if reached end
            if (galleryContainer.scrollLeft >= galleryContainer.scrollWidth - galleryContainer.clientWidth - 1) {
                galleryContainer.scrollLeft = 0; // Snap back to start (Loop)
            }

            animationId = requestAnimationFrame(scrollLoop);
        };

        const stopAutoScroll = () => {
            userInteracted = true;
            cancelAnimationFrame(animationId);
        };

        // Stop on any user touch/scroll interaction
        galleryContainer.addEventListener('touchstart', stopAutoScroll, { passive: true });
        galleryContainer.addEventListener('mousedown', stopAutoScroll);

        // Start only when visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !userInteracted) {
                    // Start loop
                    if (!animationId) scrollLoop();
                } else {
                    // Pause loop (but don't set userInteracted, so it resumes if they scroll away and back)
                    cancelAnimationFrame(animationId);
                    animationId = null;
                }
            });
        }, { threshold: 0.5 });

        observer.observe(galleryContainer);
    }
}

// About section: Read More toggle on mobile
const aboutContent = document.querySelector('.about-content');
const readMoreBtn = document.getElementById('aboutReadMore');
const readMoreWrapper = document.getElementById('aboutReadMoreWrapper');
if (readMoreBtn && aboutContent) {
    if (window.innerWidth <= 768) {
        aboutContent.classList.add('collapsed');
        readMoreBtn.addEventListener('click', () => {
            const isCollapsed = aboutContent.classList.toggle('collapsed');
            readMoreBtn.textContent = isCollapsed ? 'Read More' : 'Read Less';
            // Scroll back to top of about section when collapsing
            if (isCollapsed) {
                document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
            }
        });
    } else {
        if (readMoreWrapper) readMoreWrapper.style.display = 'none';
    }
}
