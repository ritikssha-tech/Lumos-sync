// Lumos-Sync App.js
// Coimbatore coordinates: 11.0168°N, 76.9558°E
const COIMBATORE_LAT = 11.0168;
const COIMBATORE_LON = 76.9558;

// Tolerance for alignment (degrees)
const ALIGNMENT_TOLERANCE = 2;

// DOM elements
const leveler = document.getElementById('leveler');
const bubble = document.getElementById('bubble');
const statusText = document.getElementById('status-text');
const solarInfo = document.getElementById('solar-info');
const requestPermissionBtn = document.getElementById('request-permission');

// Device orientation variables
let currentBeta = 0; // tilt
let currentGamma = 0; // roll

// Solar position variables
let solarAzimuth = 0;
let solarElevation = 0;

// Check for DeviceOrientation support
if (window.DeviceOrientationEvent) {
    // Request permission for iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        requestPermissionBtn.style.display = 'block';
        requestPermissionBtn.addEventListener('click', requestOrientationPermission);
    } else {
        // Android or older iOS
        window.addEventListener('deviceorientation', handleOrientation);
    }
} else {
    statusText.textContent = 'Device Orientation not supported';
}

// Request permission for iOS
function requestOrientationPermission() {
    DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
            if (permissionState === 'granted') {
                window.addEventListener('deviceorientation', handleOrientation);
                requestPermissionBtn.style.display = 'none';
                initializeApp();
            } else {
                statusText.textContent = 'Permission denied';
            }
        })
        .catch(console.error);
}

// Handle device orientation events
function handleOrientation(event) {
    currentBeta = event.beta || 0;
    currentGamma = event.gamma || 0;
    updateUI();
}

// Initialize app after permission
function initializeApp() {
    calculateSolarPosition();
    updateUI();
    // Recalculate solar position every minute
    setInterval(calculateSolarPosition, 60000);
}

// Calculate solar position using simplified SPA-like algorithm
// Note: This is a simplified version. For production, use full SPA implementation.
function calculateSolarPosition() {
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const hour = now.getUTCHours() + now.getUTCMinutes() / 60;

    // Simplified solar declination (degrees)
    const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);

    // Equation of time (simplified)
    const equationOfTime = 4 * (0.000075 + 0.001868 * Math.cos((360 / 365) * dayOfYear * Math.PI / 180) - 0.032077 * Math.sin((360 / 365) * dayOfYear * Math.PI / 180) - 0.014615 * Math.cos(2 * (360 / 365) * dayOfYear * Math.PI / 180) - 0.040849 * Math.sin(2 * (360 / 365) * dayOfYear * Math.PI / 180));

    // Solar time
    const solarTime = hour + equationOfTime / 60 + COIMBATORE_LON / 15;

    // Hour angle
    const hourAngle = 15 * (solarTime - 12);

    // Solar elevation
    const latRad = COIMBATORE_LAT * Math.PI / 180;
    const declRad = declination * Math.PI / 180;
    const hourRad = hourAngle * Math.PI / 180;
    solarElevation = Math.asin(Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(hourRad)) * 180 / Math.PI;

    // Solar azimuth
    const azimuthRad = Math.acos((Math.sin(declRad) * Math.cos(latRad) - Math.cos(declRad) * Math.sin(latRad) * Math.cos(hourRad)) / Math.cos(solarElevation * Math.PI / 180));
    solarAzimuth = hourAngle > 0 ? 360 - azimuthRad * 180 / Math.PI : azimuthRad * 180 / Math.PI;

    solarInfo.textContent = `Solar Azimuth: ${solarAzimuth.toFixed(1)}°, Elevation: ${solarElevation.toFixed(1)}°`;
}

// Update UI based on current orientation and solar position
function updateUI() {
    // Convert device orientation to azimuth/elevation (simplified for reflector)
    // Assuming beta is elevation, gamma is azimuth adjustment
    const deviceElevation = currentBeta;
    const deviceAzimuth = (currentGamma + 180) % 360; // Normalize to 0-360

    // Calculate deviation
    const azimuthDiff = Math.abs(deviceAzimuth - solarAzimuth);
    const elevationDiff = Math.abs(deviceElevation - solarElevation);
    const totalDeviation = Math.sqrt(azimuthDiff ** 2 + elevationDiff ** 2);

    // Update bubble position (simplified visualization)
    const maxRadius = 80;
    const deviationRatio = Math.min(totalDeviation / 45, 1); // Max deviation for full circle
    const angle = Math.atan2(elevationDiff, azimuthDiff);
    const bubbleX = 100 + Math.cos(angle) * deviationRatio * maxRadius;
    const bubbleY = 100 + Math.sin(angle) * deviationRatio * maxRadius;

    bubble.setAttribute('cx', bubbleX);
    bubble.setAttribute('cy', bubbleY);

    // Update status
    if (totalDeviation <= ALIGNMENT_TOLERANCE) {
        statusText.textContent = 'Target Achieved!';
        statusText.style.color = '#00ff00'; // Green for success
        provideHapticFeedback();
    } else {
        statusText.textContent = 'Aligning...';
        statusText.style.color = '#ffd700';
    }
}

// Provide haptic feedback
function provideHapticFeedback() {
    if (navigator.vibrate) {
        navigator.vibrate(200); // Vibrate for 200ms
    }
}

// Initialize if permission not needed
if (!requestPermissionBtn.style.display || requestPermissionBtn.style.display === 'none') {
    initializeApp();
}