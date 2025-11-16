    <script>
        const vinyl = document.getElementById("vinyl");
        const napis = document.querySelector("h1");
        const selector = document.getElementById("speed-selector");

        let isDragging = false;
        let startAngle = 0;
        let currentRotation = 0;
        let lastRotation = 0;
        let center = { x: 0, y: 0 };
        let rotationSpeed = 0;
        let decelerationInterval;

        // --- AUDIO VARIABLES & CONSTANTS ---
        let audioContext;
        let audioBuffer;
        let audioSource;

        const SCRATCH_SENSITIVITY = 0.05;
        const BASE_RATE_33 = 0.9;
        const BASE_RATE_45 = 1.2;
        let currentBaseRate = BASE_RATE_33;

        // --- Utility Functions ---
        function getAngle(x, y) {
            return Math.atan2(y - center.y, x - center.x) * (180 / Math.PI);
        }

        // La fonction updateCenter doit maintenant utiliser #turntable-container
        function updateCenter() {
            const container = document.getElementById('turntable-container');
            const rect = container.getBoundingClientRect();
            center.x = rect.left + rect.width / 2;
            center.y = rect.top + rect.height / 2;
        }

        function applyRotation(angle) {
            vinyl.style.transform = `rotate(${angle}deg)`;
            currentRotation = angle;
        }

        // --- AUDIO FUNCTIONS ---

        async function loadAudio(url) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            napis.textContent = "Fetching sound file...";

            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                napis.textContent = "Audio ready. Spinning up...";
                startAudioSource(currentBaseRate);
            } catch (error) {
                console.error('Error loading audio:', error);
                napis.textContent = "Error loading sound file. Please check the audio URL.";
            }
        }

        function startAudioSource(rate) {
            if (audioSource) {
                audioSource.stop();
            }

            audioSource = audioContext.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.loop = true;
            audioSource.connect(audioContext.destination);
            audioSource.playbackRate.value = rate;

            audioSource.start(0);
        }

        function updateAudioRate(rate) {
            if (audioSource) {
                audioSource.playbackRate.setTargetAtTime(rate, audioContext.currentTime, 0.01);
            }
        }

        // --- RPM Management Functions ---

        function stopAllRotation() {
            vinyl.classList.remove('spin-33', 'spin-45');
            if (decelerationInterval) {
                clearInterval(decelerationInterval);
                rotationSpeed = 0;
            }
            vinyl.style.transform = '';

            if (audioSource) {
                updateAudioRate(0);
            }
        }

        function startAutomaticRotation(rpm) {
            stopAllRotation();
            currentBaseRate = (rpm === "33") ? BASE_RATE_33 : BASE_RATE_45;

            if (rpm === "off") {
                napis.textContent = "DJ Scratch Turntable (OFF)";
                return;
            }

            vinyl.classList.add(`spin-${rpm}`);
            napis.textContent = `Spinning at ${rpm} RPM. Drag to Scratch!`;

            if (audioBuffer) {
                updateAudioRate(currentBaseRate);
            }
        }

        // --- Drag/Scratch Event Handlers ---

        function startTurn(e) {
            if (selector.value === "off") return;
            e.preventDefault();

            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }

            vinyl.classList.remove('spin-33', 'spin-45');
            if (decelerationInterval) clearInterval(decelerationInterval);

            const style = window.getComputedStyle(vinyl);
            const transformMatrix = style.getPropertyValue('transform');
            let rotationDeg = 0;
            if (transformMatrix && transformMatrix !== 'none') {
                const values = transformMatrix.split('(')[1].split(')')[0].split(',');
                const a = values[0];
                const b = values[1];
                rotationDeg = Math.round(Math.atan2(b, a) * (180/Math.PI));
            }
            currentRotation = rotationDeg;

            isDragging = true;
            updateCenter();

            const eventX = e.clientX || e.touches[0].clientX;
            const eventY = e.clientY || e.touches[0].clientY;

            const pointAngle = getAngle(eventX, eventY);

            startAngle = currentRotation - pointAngle;
            lastRotation = currentRotation;

            window.addEventListener('mousemove', rotate);
            window.addEventListener('mouseup', endTurn);
            window.addEventListener('touchmove', rotate);
            window.addEventListener('touchend', endTurn);

            napis.textContent = "Scratching...";
        }

        function rotate(e) {
            if (!isDragging) return;

            const eventX = e.clientX || e.touches[0].clientX;
            const eventY = e.clientY || e.touches[0].clientY;

            const newAngle = getAngle(eventX, eventY);
            let newRotation = startAngle + newAngle;

            rotationSpeed = newRotation - lastRotation;
            lastRotation = newRotation;

            applyRotation(newRotation);

            if (audioSource) {
                const scratchRate = currentBaseRate + (rotationSpeed * SCRATCH_SENSITIVITY);
                updateAudioRate(Math.max(0.1, Math.min(3.0, scratchRate)));
            }
        }

        function endTurn() {
            if (!isDragging) return;

            isDragging = false;

            window.removeEventListener('mousemove', rotate);
            window.removeEventListener('mouseup', endTurn);
            window.removeEventListener('touchmove', rotate);
            window.removeEventListener('touchend', endTurn);

            if (Math.abs(rotationSpeed) > 0.1) {
                startDeceleration();
            } else {
                startAutomaticRotation(selector.value);
            }
        }

        function startDeceleration() {
            const decelerationRate = 0.995;
            vinyl.style.transition = '0s';

            decelerationInterval = setInterval(() => {
                currentRotation += rotationSpeed;
                applyRotation(currentRotation);

                rotationSpeed *= decelerationRate;

                if (audioSource) {
                    const scratchRate = currentBaseRate + (rotationSpeed * SCRATCH_SENSITIVITY);
                    updateAudioRate(Math.max(0.1, Math.min(3.0, scratchRate)));
                }

                if (Math.abs(rotationSpeed) < 0.01) {
                    clearInterval(decelerationInterval);
                    startAutomaticRotation(selector.value);
                }
            }, 5);
        }

        // --- Initial Event Listeners ---

        selector.addEventListener('change', () => {
            startAutomaticRotation(selector.value);
        });

        vinyl.addEventListener('mousedown', startTurn);
        vinyl.addEventListener('touchstart', startTurn);

        const stopResumeHandler = (e) => {
            e.preventDefault();
            stopAllRotation();
            startAutomaticRotation(selector.value);
        };

        vinyl.addEventListener('dblclick', stopResumeHandler);
        vinyl.addEventListener('touchend', (e) => {
            const now = new Date().getTime();
            const lastTouchTime = vinyl.lastTouchTime || 0;
            const delta = now - lastTouchTime;
            const doubleTapThreshold = 300;

            if (delta > 0 && delta < doubleTapThreshold) {
                stopResumeHandler(e);
            }
            vinyl.lastTouchTime = now;
        });

        window.addEventListener('resize', updateCenter);
        window.addEventListener('load', () => {
            updateCenter();
            loadAudio('vinyl.mp3');
        });
    </script>
