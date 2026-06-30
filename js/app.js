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

    // Compute clearance dynamically: Player height + generous 60px gap
    document.body.classList.add('player-active');
    setTimeout(() => {
        const clearance = playerBar.offsetHeight + 40;
        document.body.style.setProperty('--player-clearance', clearance + 'px');
    }, 150); // Small delay ensures accurate measurement during CSS transition
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
        playIcon.innerHTML = '&#9654;&#xFE0E;';
    }

    if (playing) {
        visualizer.style.opacity = '1';
        visualizer.classList.add('playing');
    } else {
        visualizer.style.opacity = '0.5';
        visualizer.classList.remove('playing');
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

        // 3. Pause modal audio on switch
        const modalAudio = document.getElementById('modal-audio-player');
        if (modalAudio && !modalAudio.paused) modalAudio.pause();

        // 4. Force-reveal scroll items in the new container to prevent re-animation jitter
        const newContainer = document.getElementById(`${type}-works`);
        if (newContainer) {
            newContainer.querySelectorAll('.scroll-animate').forEach(el => {
                el.classList.add('scroll-in');
                el.classList.remove('scroll-hidden-bottom');
            });
        }

        // 5. Re-init scroll items & kick animation so positions recalculate immediately
        //    (fixes dim content when switching tabs — elements had stale positions)
        initScrollItems();
        requestAnimationFrame(() => {
            kickScrollAnim();
            // Update gallery arrows after tab switch
            if (window._updateGalleryArrows) window._updateGalleryArrows();
        });
    });
});

/* =========================================
   Gallery Lightbox Modal (Audio + Poster)
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


// Lightbox Modal Logic with Audio + Poster
const videoModal = document.getElementById('video-modal');
const modalAudioPlayer = document.getElementById('modal-audio-player');
const modalPoster = document.getElementById('modal-poster');
const modalCloseBtn = document.querySelector('.modal-close-btn');
const galleryItems = document.querySelectorAll('.gallery-item');

// Custom controls elements
const videoPlayBtn = document.querySelector('.video-play-btn');
const videoTimeDisplay = document.querySelector('.video-time');
const videoSeekContainer = document.querySelector('.video-seek-container');
const videoSeekBar = document.querySelector('.video-seek-bar');
const videoControlsBar = document.querySelector('.video-controls');
const videoTitleEl = document.querySelector('.video-title');

if (videoModal && modalAudioPlayer) {
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
        // Auto-hide after 3 seconds if audio is playing
        if (!modalAudioPlayer.paused) {
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

            const audioSrc = item.getAttribute('data-audio-src');
            const posterSrc = item.getAttribute('data-poster');
            if (audioSrc) {
                // Set title from gallery info
                const infoEl = item.querySelector('.gallery-info');
                if (infoEl && videoTitleEl) {
                    const h3 = infoEl.querySelector('h3');
                    const span = infoEl.querySelector('span');
                    const title = h3 ? h3.textContent : '';
                    const type = span ? span.textContent : '';
                    videoTitleEl.textContent = type ? `${title} — ${type}` : title;
                }

                // Set poster image
                if (modalPoster && posterSrc) {
                    modalPoster.src = posterSrc;
                }

                modalAudioPlayer.src = audioSrc;

                // Reset Seeker & Time immediately
                if (videoSeekBar) videoSeekBar.style.width = '0%';
                if (videoTimeDisplay) videoTimeDisplay.textContent = '0:00 / 0:00';

                videoModal.classList.add('active');
                videoModalActive = true; // Disable particle trail
                delay = DELAY_SNAP; // Cursor follows instantly in modal

                // Ensure custom cursor is visible
                cursorDot.style.opacity = '1';
                cursorOutline.style.opacity = '1';

                setTimeout(() => {
                    modalAudioPlayer.play().catch(e => console.log("Auto-play failed:", e));
                }, 100);

                document.body.style.overflow = 'hidden';
                showControls();
            }
        });
    });

    // Close Modal Function
    function closeModal() {
        modalAudioPlayer.pause();
        modalAudioPlayer.src = "";
        if (modalPoster) modalPoster.src = "";
        videoModal.classList.remove('active');
        videoModalActive = false; // Re-enable particle trail
        delay = DELAY_NORMAL; // Restore cursor trail

        document.body.style.overflow = '';
        clearTimeout(controlsTimeout);
        if (videoPlayBtn) {
            videoPlayBtn.innerHTML = '<span class="icon-play">&#9654;&#xFE0E;</span>';
        }
        // Reset Seeker & Time
        if (videoSeekBar) videoSeekBar.style.width = '0%';
        if (videoTimeDisplay) videoTimeDisplay.textContent = '0:00 / 0:00';
    }

    // Play/Pause Toggle
    function toggleVideoPlay() {
        if (modalAudioPlayer.paused) {
            modalAudioPlayer.play();
        } else {
            modalAudioPlayer.pause();
        }
    }

    // Click poster to play/pause
    if (modalPoster) {
        modalPoster.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleVideoPlay();
            showControls();
        });
    }

    // Play button
    if (videoPlayBtn) {
        videoPlayBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleVideoPlay();
        });
    }

    // Update play/pause icon
    modalAudioPlayer.addEventListener('play', () => {
        if (videoPlayBtn) {
            videoPlayBtn.innerHTML = '<span>&#10074;&#10074;</span>'; // Pause icon
        }
        showControls(); // Start auto-hide timer
    });

    modalAudioPlayer.addEventListener('pause', () => {
        if (videoPlayBtn) {
            videoPlayBtn.innerHTML = '<span class="icon-play">&#9654;&#xFE0E;</span>'; // Play icon
        }
        showControls(); // Keep controls visible when paused
        clearTimeout(controlsTimeout); // Don't auto-hide when paused
    });

    // Time update → seek bar + time display
    modalAudioPlayer.addEventListener('timeupdate', () => {
        if (!isDraggingVideoSeek && modalAudioPlayer.duration) {
            const percent = (modalAudioPlayer.currentTime / modalAudioPlayer.duration) * 100;
            videoSeekBar.style.width = `${percent}%`;
        }
        if (videoTimeDisplay) {
            videoTimeDisplay.textContent = `${formatTime(modalAudioPlayer.currentTime)} / ${formatTime(modalAudioPlayer.duration)}`;
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
            if (!modalAudioPlayer.duration) return;
            isDraggingVideoSeek = true;
            const percent = getVideoSeekPercent(e);
            videoSeekBar.style.width = `${percent * 100}%`;
            e.stopPropagation();
        });

        window.addEventListener('mousemove', (e) => {
            if (isDraggingVideoSeek && modalAudioPlayer.duration) {
                const percent = getVideoSeekPercent(e);
                videoSeekBar.style.width = `${percent * 100}%`;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (isDraggingVideoSeek) {
                isDraggingVideoSeek = false;
                if (modalAudioPlayer.duration) {
                    const percent = getVideoSeekPercent(e);
                    modalAudioPlayer.currentTime = percent * modalAudioPlayer.duration;
                }
            }
        });

        // Touch support for mobile
        videoSeekContainer.addEventListener('touchstart', (e) => {
            if (!modalAudioPlayer.duration) return;
            isDraggingVideoSeek = true;
            const percent = getVideoSeekPercent(e);
            videoSeekBar.style.width = `${percent * 100}%`;
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });

        videoSeekContainer.addEventListener('touchmove', (e) => {
            if (isDraggingVideoSeek && modalAudioPlayer.duration) {
                const percent = getVideoSeekPercent(e);
                videoSeekBar.style.width = `${percent * 100}%`;
                e.preventDefault();
            }
        }, { passive: false });

        videoSeekContainer.addEventListener('touchend', (e) => {
            if (isDraggingVideoSeek) {
                isDraggingVideoSeek = false;
                if (modalAudioPlayer.duration) {
                    // Use last touch position
                    const rect = videoSeekContainer.getBoundingClientRect();
                    const barWidth = videoSeekBar.getBoundingClientRect().width;
                    const percent = barWidth / rect.width;
                    modalAudioPlayer.currentTime = percent * modalAudioPlayer.duration;
                }
            }
        });
    }

    // Volume Control
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
            modalAudioPlayer.volume = val;
            updateVideoVolumeSliderVisual(val);
            updateVideoVolumeIcon(val);
        });

        videoVolumeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (modalAudioPlayer.volume > 0) {
                lastVideoVolume = modalAudioPlayer.volume;
                modalAudioPlayer.volume = 0;
                videoVolumeSlider.value = 0;
            } else {
                modalAudioPlayer.volume = lastVideoVolume;
                videoVolumeSlider.value = lastVideoVolume;
            }
            updateVideoVolumeSliderVisual(modalAudioPlayer.volume);
            updateVideoVolumeIcon(modalAudioPlayer.volume);
        });
    }

    // Hide custom cursor on volume slider
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

    // Audio ended
    modalAudioPlayer.addEventListener('ended', () => {
        if (videoPlayBtn) {
            videoPlayBtn.innerHTML = '<span class="icon-play">&#9654;&#xFE0E;</span>';
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

// Gallery Arrow Navigation
{
    const galleryContainer = document.querySelector('#visual-works .gallery-scroll-container');
    const leftArrow = document.querySelector('.gallery-arrow-left');
    const rightArrow = document.querySelector('.gallery-arrow-right');

    if (galleryContainer && leftArrow && rightArrow) {
        function updateGalleryArrows() {
            const { scrollLeft, scrollWidth, clientWidth } = galleryContainer;
            const maxScroll = scrollWidth - clientWidth;

            // Remove all fade classes first
            galleryContainer.classList.remove('fade-left', 'fade-right', 'fade-both');

            // No overflow — hide both arrows, no fade
            if (maxScroll <= 2) {
                leftArrow.classList.add('hidden');
                rightArrow.classList.add('hidden');
                return;
            }

            const atStart = scrollLeft <= 2;
            const atEnd = scrollLeft >= maxScroll - 2;

            // Show/hide left arrow
            if (atStart) {
                leftArrow.classList.add('hidden');
            } else {
                leftArrow.classList.remove('hidden');
            }

            // Show/hide right arrow
            if (atEnd) {
                rightArrow.classList.add('hidden');
            } else {
                rightArrow.classList.remove('hidden');
            }

            // Apply fade mask class
            if (!atStart && !atEnd) {
                galleryContainer.classList.add('fade-both');
            } else if (!atStart) {
                galleryContainer.classList.add('fade-left');
            } else if (!atEnd) {
                galleryContainer.classList.add('fade-right');
            }
        }

        // Snap to exact poster on click, regardless of partial scroll
        function scrollToItem(direction) {
            const firstItem = galleryContainer.querySelector('.gallery-item');
            if (!firstItem) return;

            const style = getComputedStyle(galleryContainer);
            const gap = parseFloat(style.gap) || 0;
            const itemWidth = firstItem.offsetWidth + gap;
            const currentScroll = galleryContainer.scrollLeft;

            // Current scroll ratio (e.g. 1.25 means we've scrolled past 1 full poster + 25% of the next)
            const scrollRatio = currentScroll / itemWidth;

            let targetIndex;
            if (direction === 'right') {
                // If scrollRatio is 0.9 (poster 1 is 90% visible), Math.floor(0.9 + 0.15) = 1.
                // targetIndex = 1 + 1 = 2 (Skip to poster 2 instead of 1)
                targetIndex = Math.floor(scrollRatio + 0.15) + 1;
            } else {
                // If scrollRatio is 1.1 (poster 1 is 90% visible), Math.ceil(1.1 - 0.15) = 1.
                // targetIndex = 1 - 1 = 0 (Skip back to poster 0 instead of 1)
                targetIndex = Math.ceil(scrollRatio - 0.15) - 1;
            }

            // Ensure we don't go negative
            targetIndex = Math.max(0, targetIndex);

            galleryContainer.scrollTo({
                left: targetIndex * itemWidth,
                behavior: 'smooth'
            });
        }

        leftArrow.addEventListener('click', () => scrollToItem('left'));
        rightArrow.addEventListener('click', () => scrollToItem('right'));

        // Update arrows on scroll
        galleryContainer.addEventListener('scroll', updateGalleryArrows, { passive: true });

        // Update arrows on resize
        window.addEventListener('resize', updateGalleryArrows);

        // Initial check
        updateGalleryArrows();

        // Expose for toggle logic (tab switch)
        window._updateGalleryArrows = updateGalleryArrows;
    }
}

// About section: Read More → opens full bio overlay (all screen sizes)
const bioOverlay = document.getElementById('bio-overlay');
const bioCloseBtn = document.getElementById('bioCloseBtn');
const bioBackdrop = bioOverlay ? bioOverlay.querySelector('.bio-overlay-backdrop') : null;
const readMoreBtn = document.getElementById('aboutReadMore');

function openBioOverlay() {
    if (!bioOverlay) return;
    bioOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Focus the close button for accessibility
    if (bioCloseBtn) bioCloseBtn.focus();
}

function closeBioOverlay() {
    if (!bioOverlay) return;
    bioOverlay.classList.remove('active');
    document.body.style.overflow = '';
    // Return focus to the button that opened it
    if (readMoreBtn) readMoreBtn.focus();
}

if (readMoreBtn) {
    readMoreBtn.addEventListener('click', openBioOverlay);
}

if (bioCloseBtn) {
    bioCloseBtn.addEventListener('click', closeBioOverlay);
}

if (bioBackdrop) {
    bioBackdrop.addEventListener('click', closeBioOverlay);
}

// Escape key closes bio overlay
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bioOverlay && bioOverlay.classList.contains('active')) {
        closeBioOverlay();
    }
});

/* =========================================
   Collaboration Modal Logic
   ========================================= */
(function () {
    var collabModal        = document.getElementById('collab-modal');
    if (!collabModal) return;

    var collabBackdrop     = collabModal.querySelector('.collab-modal-backdrop');
    var collabCloseBtn     = collabModal.querySelector('.collab-modal-close');
    var collabPoster       = document.getElementById('collab-modal-poster');
    var collabMediaCont    = document.getElementById('collab-media-container');
    var collabTitleEl      = document.getElementById('collab-modal-title');
    var collabRoleEl       = document.getElementById('collab-modal-role');
    var collabBriefEl      = document.getElementById('collab-modal-brief');
    var collabApproachEl   = document.getElementById('collab-modal-approach');
    var collabDirectorEl   = document.getElementById('collab-modal-director');

    // Custom control elements
    var collabCtrlBar      = document.getElementById('collab-video-controls');
    var collabCtrlPlay     = document.getElementById('collab-ctrl-play');
    var collabCtrlTime     = document.getElementById('collab-ctrl-time');
    var collabCtrlSeek     = document.getElementById('collab-ctrl-seek');
    var collabCtrlSeekBar  = document.getElementById('collab-ctrl-seek-bar');
    var collabCtrlVolBtn   = document.getElementById('collab-ctrl-vol-btn');
    var collabCtrlVolSlider= document.getElementById('collab-ctrl-vol-slider');
    var collabCtrlVolWrap  = document.querySelector('.collab-ctrl-vol-wrapper');

    var collabVid          = null; // active <video> element
    var collabControlsTimeout = null;
    var collabLastVol      = 1;
    var isDraggingCollabSeek = false;

    // --- Helpers ---
    function formatTime(s) {
        if (isNaN(s) || !isFinite(s)) return '0:00';
        var m = Math.floor(s / 60);
        var sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function isDirectVideo(url) {
        return /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url);
    }

    function toEmbedUrl(url) {
        if (!url || url.indexOf('YOUR_') !== -1) return null;
        var ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/);
        if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1] + '?autoplay=1&rel=0';
        var vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        if (vimeoMatch) return 'https://player.vimeo.com/video/' + vimeoMatch[1] + '?autoplay=1';
        return null;
    }

    function updateCollabVolumeSlider(val) {
        if (!collabCtrlVolSlider) return;
        var pct = val * 100;
        collabCtrlVolSlider.style.background =
            'linear-gradient(to right, var(--color-accent) ' + pct + '%, rgba(255,255,255,0.15) ' + pct + '%)';
    }

    function updateCollabVolumeIcon(vol) {
        if (!collabCtrlVolBtn) return;
        var svgBase = '<svg class="volume-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>';
        if (vol === 0) {
            collabCtrlVolBtn.innerHTML = svgBase + '<line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
            collabCtrlVolBtn.style.opacity = '0.5';
        } else if (vol < 0.5) {
            collabCtrlVolBtn.innerHTML = svgBase + '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            collabCtrlVolBtn.style.opacity = '1';
        } else {
            collabCtrlVolBtn.innerHTML = svgBase + '<path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
            collabCtrlVolBtn.style.opacity = '1';
        }
    }

    function showCollabControls() {
        if (!collabCtrlBar) return;
        collabCtrlBar.classList.remove('hidden');
        clearTimeout(collabControlsTimeout);
        if (collabVid && !collabVid.paused) {
            collabControlsTimeout = setTimeout(function () {
                collabCtrlBar.classList.add('hidden');
            }, 2500);
        }
    }

    function getSeekPct(e, el) {
        var rect = el.getBoundingClientRect();
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    // --- Setup custom controls for a <video> element ---
    function setupCollabControls(vid) {
        collabVid = vid;
        if (!collabCtrlBar) return;

        // Show controls bar
        if (collabCtrlBar) { collabCtrlBar.style.display = 'flex'; showCollabControls(); }

        // Initialise volume slider
        updateCollabVolumeSlider(1);
        updateCollabVolumeIcon(1);

        // Time / seek update (RAF-driven when playing)
        function updateSeek() {
            if (collabVid && !isDraggingCollabSeek && collabVid.duration) {
                var pct = (collabVid.currentTime / collabVid.duration) * 100;
                if (collabCtrlSeekBar) collabCtrlSeekBar.style.width = pct + '%';
            }
            if (collabVid && !collabVid.paused) requestAnimationFrame(updateSeek);
        }

        vid.addEventListener('play', function () {
            if (collabCtrlPlay) collabCtrlPlay.innerHTML = '<span>&#10074;&#10074;</span>';
            requestAnimationFrame(updateSeek);
            showCollabControls();
        });
        vid.addEventListener('pause', function () {
            if (collabCtrlPlay) collabCtrlPlay.innerHTML = '<span class="icon-play">&#9654;&#xFE0E;</span>';
            showCollabControls();
            clearTimeout(collabControlsTimeout);
        });
        vid.addEventListener('ended', function () {
            if (collabCtrlPlay) collabCtrlPlay.innerHTML = '<span class="icon-play">&#9654;&#xFE0E;</span>';
            if (collabCtrlSeekBar) collabCtrlSeekBar.style.width = '100%';
            showCollabControls();
            clearTimeout(collabControlsTimeout);
        });
        vid.addEventListener('timeupdate', function () {
            if (collabCtrlTime && collabVid.duration) {
                collabCtrlTime.textContent = formatTime(collabVid.currentTime) + ' / ' + formatTime(collabVid.duration);
            }
        });

        // Play / pause button
        if (collabCtrlPlay) {
            collabCtrlPlay.onclick = function (e) {
                e.stopPropagation();
                if (collabVid.paused) { collabVid.play(); } else { collabVid.pause(); }
            };
        }

        // Click video to toggle
        vid.addEventListener('click', function () {
            if (collabVid.paused) { collabVid.play(); } else { collabVid.pause(); }
            showCollabControls();
        });

        // Seek bar
        if (collabCtrlSeek) {
            collabCtrlSeek.addEventListener('mousedown', function (e) {
                if (!collabVid.duration) return;
                isDraggingCollabSeek = true;
                var pct = getSeekPct(e, collabCtrlSeek);
                if (collabCtrlSeekBar) collabCtrlSeekBar.style.width = (pct * 100) + '%';
                e.stopPropagation();
            });
        }
        window.addEventListener('mousemove', function (e) {
            if (isDraggingCollabSeek && collabVid && collabVid.duration) {
                var pct = getSeekPct(e, collabCtrlSeek);
                if (collabCtrlSeekBar) collabCtrlSeekBar.style.width = (pct * 100) + '%';
            }
        });
        window.addEventListener('mouseup', function (e) {
            if (isDraggingCollabSeek) {
                isDraggingCollabSeek = false;
                if (collabVid && collabVid.duration) {
                    collabVid.currentTime = getSeekPct(e, collabCtrlSeek) * collabVid.duration;
                }
            }
        });

        // Volume
        if (collabCtrlVolSlider) {
            collabCtrlVolSlider.addEventListener('input', function (e) {
                var val = parseFloat(e.target.value);
                if (collabVid) collabVid.volume = val;
                updateCollabVolumeSlider(val);
                updateCollabVolumeIcon(val);
            });
        }
        if (collabCtrlVolBtn) {
            collabCtrlVolBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (!collabVid) return;
                if (collabVid.volume > 0) {
                    collabLastVol = collabVid.volume;
                    collabVid.volume = 0;
                    if (collabCtrlVolSlider) collabCtrlVolSlider.value = 0;
                } else {
                    collabVid.volume = collabLastVol;
                    if (collabCtrlVolSlider) collabCtrlVolSlider.value = collabLastVol;
                }
                updateCollabVolumeSlider(collabVid.volume);
                updateCollabVolumeIcon(collabVid.volume);
            });
        }
        // Hide cursor over volume slider
        if (collabCtrlVolWrap) {
            collabCtrlVolWrap.addEventListener('mouseenter', function () {
                cursorDot.style.opacity = '0'; cursorOutline.style.opacity = '0';
            });
            collabCtrlVolWrap.addEventListener('mouseleave', function () {
                cursorDot.style.opacity = '1'; cursorOutline.style.opacity = '1';
            });
        }

        // Show controls on mouse move inside the left panel
        var leftPanel = collabModal.querySelector('.collab-modal-left');
        if (leftPanel) {
            leftPanel.addEventListener('mousemove', function () {
                if (collabModal.classList.contains('active')) showCollabControls();
            });
        }

        // Space bar to toggle
        document.addEventListener('keydown', function (e) {
            if (e.key === ' ' && collabModal.classList.contains('active') && collabVid) {
                e.preventDefault();
                if (collabVid.paused) { collabVid.play(); } else { collabVid.pause(); }
                showCollabControls();
            }
        });
    }

    // --- Open ---
    function openCollabModal(card) {
        var title    = card.getAttribute('data-title')     || '';
        var role     = card.getAttribute('data-role')      || '';
        var director = card.getAttribute('data-director')  || '';
        var brief    = card.getAttribute('data-brief')     || '';
        var approach = card.getAttribute('data-approach')  || '';
        var poster   = card.getAttribute('data-poster')    || '';
        var videoUrl = card.getAttribute('data-video-url') || '';

        // Liner notes
        if (collabTitleEl)    collabTitleEl.textContent    = title;
        if (collabRoleEl)     collabRoleEl.textContent     = role;
        if (collabBriefEl)    collabBriefEl.textContent    = brief;
        if (collabApproachEl) collabApproachEl.textContent = approach;
        if (collabDirectorEl) collabDirectorEl.textContent = director;

        // Poster (initial state)
        if (collabPoster) { collabPoster.src = poster; collabPoster.classList.remove('hidden'); }

        // Reset controls
        collabVid = null;
        if (collabCtrlBar) { collabCtrlBar.style.display = 'none'; collabCtrlBar.classList.remove('hidden'); }
        if (collabCtrlSeekBar) collabCtrlSeekBar.style.width = '0%';
        if (collabCtrlTime) collabCtrlTime.textContent = '0:00 / 0:00';
        if (collabCtrlVolSlider) { collabCtrlVolSlider.value = 1; updateCollabVolumeSlider(1); updateCollabVolumeIcon(1); }

        // Media
        if (collabMediaCont) {
            collabMediaCont.innerHTML = '';
            collabMediaCont.classList.remove('visible');

            if (videoUrl && videoUrl.indexOf('YOUR_') === -1) {
                if (isDirectVideo(videoUrl)) {
                    // Direct video file → <video> + custom controls
                    var vid = document.createElement('video');
                    vid.src = videoUrl;
                    vid.preload = 'metadata';
                    collabMediaCont.appendChild(vid);
                    collabMediaCont.classList.add('visible');
                    if (collabPoster) collabPoster.classList.add('hidden');
                    setupCollabControls(vid);
                    vid.play().catch(function () {});
                } else {
                    // Embed URL (YouTube / Vimeo) → iframe
                    var embedUrl = toEmbedUrl(videoUrl);
                    if (embedUrl) {
                        var iframe = document.createElement('iframe');
                        iframe.src = embedUrl;
                        iframe.title = title;
                        iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
                        iframe.allowFullscreen = true;
                        collabMediaCont.appendChild(iframe);
                        collabMediaCont.classList.add('visible');
                        if (collabPoster) collabPoster.classList.add('hidden');
                    }
                }
            }
        }

        // Pause background audio
        if (typeof audio !== 'undefined' && !audio.paused) {
            audio.pause(); isPlaying = false; updatePlayerUI(false);
        }
        if (typeof modalAudioPlayer !== 'undefined' && !modalAudioPlayer.paused) {
            modalAudioPlayer.pause();
        }

        collabModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    // --- Close ---
    function closeCollabModal() {
        collabModal.classList.remove('active');
        document.body.style.overflow = '';
        clearTimeout(collabControlsTimeout);

        if (collabVid) { collabVid.pause(); collabVid.src = ''; collabVid = null; }
        if (collabMediaCont) { collabMediaCont.innerHTML = ''; collabMediaCont.classList.remove('visible'); }
        if (collabPoster) { collabPoster.src = ''; collabPoster.classList.remove('hidden'); }
        if (collabCtrlBar) { collabCtrlBar.style.display = 'none'; collabCtrlBar.classList.remove('hidden'); }
    }

    // Card clicks
    document.querySelectorAll('.collab-card').forEach(function (card) {
        card.addEventListener('click', function () { openCollabModal(card); });
    });

    // Close triggers
    if (collabCloseBtn) collabCloseBtn.addEventListener('click', closeCollabModal);
    if (collabBackdrop) collabBackdrop.addEventListener('click', closeCollabModal);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && collabModal.classList.contains('active')) closeCollabModal();
    });
}());

