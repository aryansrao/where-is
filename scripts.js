// ============================================
// DIGIPIN Algorithm (Official India Post Standard)
// Source: https://github.com/INDIAPOST-gov/digipin
// ============================================

// Official 4x4 DIGIPIN Grid
const DIGIPIN_GRID = [
    ['F', 'C', '9', '8'],
    ['J', '3', '2', '7'],
    ['K', '4', '5', '6'],
    ['L', 'M', 'P', 'T']
];

const BOUNDS = {
    minLat: 2.5,
    maxLat: 38.5,
    minLon: 63.5,
    maxLon: 99.5
};

function getDigiPin(lat, lon) {
    if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat) {
        throw new Error('Latitude out of DIGIPIN range (India)');
    }
    if (lon < BOUNDS.minLon || lon > BOUNDS.maxLon) {
        throw new Error('Longitude out of DIGIPIN range (India)');
    }

    let minLat = BOUNDS.minLat;
    let maxLat = BOUNDS.maxLat;
    let minLon = BOUNDS.minLon;
    let maxLon = BOUNDS.maxLon;

    let digiPin = '';

    for (let level = 1; level <= 10; level++) {
        const latDiv = (maxLat - minLat) / 4;
        const lonDiv = (maxLon - minLon) / 4;

        // Row calculation (reversed - higher lat = lower row index)
        let row = 3 - Math.floor((lat - minLat) / latDiv);
        let col = Math.floor((lon - minLon) / lonDiv);

        // Clamp to valid range
        row = Math.max(0, Math.min(row, 3));
        col = Math.max(0, Math.min(col, 3));

        digiPin += DIGIPIN_GRID[row][col];

        // Add separator after 3rd and 6th character
        if (level === 3 || level === 6) digiPin += '-';

        // Update bounds for next level
        const newMaxLat = minLat + latDiv * (4 - row);
        const newMinLat = minLat + latDiv * (3 - row);

        const newMinLon = minLon + lonDiv * col;
        const newMaxLon = newMinLon + lonDiv;

        minLat = newMinLat;
        maxLat = newMaxLat;
        minLon = newMinLon;
        maxLon = newMaxLon;
    }

    return digiPin;
}

function getLatLngFromDigiPin(digiPin) {
    const pin = digiPin.replace(/-/g, '').toUpperCase();
    if (pin.length !== 10) {
        throw new Error('DIGIPIN must be exactly 10 characters');
    }

    let minLat = BOUNDS.minLat;
    let maxLat = BOUNDS.maxLat;
    let minLon = BOUNDS.minLon;
    let maxLon = BOUNDS.maxLon;

    for (let i = 0; i < 10; i++) {
        const char = pin[i];
        let found = false;
        let ri = -1, ci = -1;

        // Find character in the DIGIPIN grid
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (DIGIPIN_GRID[r][c] === char) {
                    ri = r;
                    ci = c;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (!found) {
            throw new Error(`Invalid character '${char}' in DIGIPIN`);
        }

        const latDiv = (maxLat - minLat) / 4;
        const lonDiv = (maxLon - minLon) / 4;

        const lat1 = maxLat - latDiv * (ri + 1);
        const lat2 = maxLat - latDiv * ri;
        const lon1 = minLon + lonDiv * ci;
        const lon2 = minLon + lonDiv * (ci + 1);

        // Update bounding box for next level
        minLat = lat1;
        maxLat = lat2;
        minLon = lon1;
        maxLon = lon2;
    }

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    return {
        latitude: centerLat.toFixed(6),
        longitude: centerLon.toFixed(6)
    };
}

function formatDigipin(pin) {
    const clean = pin.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (clean.length >= 10) {
        return `${clean.slice(0,3)}-${clean.slice(3,6)}-${clean.slice(6,10)}`;
    }
    return clean;
}

// ============================================
// State & DOM Elements
// ============================================

let currentDigipin = null;
let currentCoords = null;

const elements = {
    getLocationBtn: document.getElementById('getLocationBtn'),
    digipinDisplay: document.getElementById('digipinDisplay'),
    qrContainer: document.getElementById('qrContainer'),
    coordsDisplay: document.getElementById('coordsDisplay'),
    mapContainer: document.getElementById('mapContainer'),
    copyBtn: document.getElementById('copyBtn'),
    shareBtn: document.getElementById('shareBtn'),
    openMapBtn: document.getElementById('openMapBtn'),
    shareAppBtn: document.getElementById('shareAppBtn'),
    decodeInput: document.getElementById('decodeInput'),
    coordsInput: document.getElementById('coordsInput'),
    decodeBtn: document.getElementById('decodeBtn'),
    toast: document.getElementById('toast')
};

// ============================================
// Main Functions
// ============================================

function updateUI(digipin, coords) {
    currentDigipin = digipin;
    currentCoords = coords;

    // Update DIGIPIN display
    elements.digipinDisplay.textContent = digipin;
    elements.digipinDisplay.classList.remove('placeholder');

    // Update coordinates
    elements.coordsDisplay.innerHTML = `
        <div class="lat-lng">${coords.latitude}, ${coords.longitude}</div>
    `;

    // Generate QR Code
    generateQR(digipin, coords);

    // Update Map
    updateMap(coords.latitude, coords.longitude);

    // Enable buttons
    elements.copyBtn.disabled = false;
    elements.shareBtn.disabled = false;
    elements.openMapBtn.disabled = false;
}

function generateQR(digipin, coords) {
    elements.qrContainer.innerHTML = '';
    
    // Generate URL with DIGIPIN parameter (remove dashes for cleaner URL)
    const digipinClean = digipin.replace(/-/g, '');
    const qrData = `https://where-is-digipin.netlify.app/?digipin=${digipinClean}`;
    
    const qrCode = new QRCodeStyling({
        width: 160,
        height: 160,
        type: "svg",
        data: qrData,
        dotsOptions: {
            type: "rounded",
            gradient: {
                type: "linear",
                rotation: 45,
                colorStops: [
                    { offset: 0, color: "#0ea5e9" },
                    { offset: 1, color: "#1e3a8a" }
                ]
            }
        },
        cornersSquareOptions: {
            type: "square",
            gradient: {
                type: "linear",
                rotation: 45,
                colorStops: [
                    { offset: 0, color: "#38bdf8" },
                    { offset: 1, color: "#1e40af" }
                ]
            }
        },
        cornersDotOptions: {
            type: "square",
            gradient: {
                type: "linear",
                rotation: 45,
                colorStops: [
                    { offset: 0, color: "#0ea5e9" },
                    { offset: 1, color: "#1e3a8a" }
                ]
            }
        },
        backgroundOptions: {
            color: "transparent"
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 4
        }
    });
    
    qrCode.append(elements.qrContainer);
}

function updateMap(lat, lon) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    
    // Clear existing map
    elements.mapContainer.innerHTML = '<div id="map" style="width:100%;height:100%;"></div>';
    
    // Create Leaflet map with CartoDB Voyager tiles (beautiful, free)
    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([latNum, lonNum], 16);
    
    // CartoDB Voyager - clean, modern look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);
    
    // Add marker
    L.marker([latNum, lonNum]).addTo(map);
    
    // Store map reference for cleanup
    window.currentMap = map;
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => elements.toast.classList.remove('show'), 3000);
}

// ============================================
// Event Handlers
// ============================================

// Get Location
elements.getLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported by your browser');
        return;
    }

    elements.getLocationBtn.disabled = true;
    elements.getLocationBtn.classList.add('loading');
    elements.getLocationBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
        </svg>
        <span>Getting location...</span>
    `;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
                const digipin = getDigiPin(latitude, longitude);
                updateUI(digipin, { 
                    latitude: latitude.toFixed(6), 
                    longitude: longitude.toFixed(6) 
                });
                showToast('DIGIPIN generated successfully!');
            } catch (error) {
                showToast(error.message);
            }

            resetGetLocationBtn();
        },
        (error) => {
            let message = 'Unable to get location';
            if (error.code === error.PERMISSION_DENIED) {
                message = 'Location permission denied';
            } else if (error.code === error.TIMEOUT) {
                message = 'Location request timed out';
            }
            showToast(message);
            resetGetLocationBtn();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
});

function resetGetLocationBtn() {
    elements.getLocationBtn.disabled = false;
    elements.getLocationBtn.classList.remove('loading');
    elements.getLocationBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="22" y1="12" x2="18" y2="12"/>
            <line x1="6" y1="12" x2="2" y2="12"/>
            <line x1="12" y1="6" x2="12" y2="2"/>
            <line x1="12" y1="22" x2="12" y2="18"/>
        </svg>
        <span>Get My DIGIPIN</span>
    `;
}

// Copy
elements.copyBtn.addEventListener('click', () => {
    if (!currentDigipin) return;
    
    navigator.clipboard.writeText(currentDigipin).then(() => {
        showToast('DIGIPIN copied!');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = currentDigipin;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('DIGIPIN copied!');
    });
});

// Share DIGIPIN
elements.shareBtn.addEventListener('click', async () => {
    if (!currentDigipin) return;

    const digipinClean = currentDigipin.replace(/-/g, '');
    const shareUrl = `https://where-is-digipin.netlify.app/?digipin=${digipinClean}`;

    const shareData = {
        title: 'My DIGIPIN',
        text: currentDigipin,
        url: shareUrl
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast('Share failed');
            }
        }
    } else {
        // Fallback to copy
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast('Link copied!');
        });
    }
});

// Share App button
elements.shareAppBtn.addEventListener('click', async () => {
    const shareData = {
        title: 'Where is - Share Location with DIGIPIN',
        text: 'Check out Where is - an app to share your location using India Post DIGIPIN!',
        url: 'https://where-is-digipin.netlify.app/'
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast('Share failed');
            }
        }
    } else {
        navigator.clipboard.writeText('https://where-is-digipin.netlify.app/').then(() => {
            showToast('Link copied!');
        });
    }
});

// Open Maps
elements.openMapBtn.addEventListener('click', () => {
    if (!currentCoords) return;
    window.open(`https://www.google.com/maps?q=${currentCoords.latitude},${currentCoords.longitude}`, '_blank');
});

// Decode Input Formatting
elements.decodeInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (value.length > 10) value = value.slice(0, 10);
    
    if (value.length > 6) {
        value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6);
    } else if (value.length > 3) {
        value = value.slice(0, 3) + '-' + value.slice(3);
    }
    
    e.target.value = value;
});

// Decode Button - handles both DIGIPIN and coordinates
elements.decodeBtn.addEventListener('click', () => {
    const digipinInput = elements.decodeInput.value.trim();
    const coordsInputVal = elements.coordsInput.value.trim();
    
    // If DIGIPIN is entered, decode it
    if (digipinInput) {
        try {
            const coords = getLatLngFromDigiPin(digipinInput);
            const formatted = formatDigipin(digipinInput);
            updateUI(formatted, coords);
            elements.coordsInput.value = ''; // Clear coords input
            showToast('DIGIPIN decoded!');
        } catch (error) {
            showToast(error.message);
        }
        return;
    }
    
    // If coordinates are entered, encode them
    if (coordsInputVal) {
        try {
            // Parse coordinates (supports "lat, lng" or "lat,lng" or "lat lng")
            const parts = coordsInputVal.split(/[,\s]+/).filter(p => p);
            if (parts.length !== 2) {
                throw new Error('Enter lat, lng (e.g., 21.1861, 81.3071)');
            }
            
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            
            if (isNaN(lat) || isNaN(lng)) {
                throw new Error('Invalid coordinates');
            }
            
            const digipin = getDigiPin(lat, lng);
            updateUI(digipin, {
                latitude: lat.toFixed(6),
                longitude: lng.toFixed(6)
            });
            elements.decodeInput.value = ''; // Clear DIGIPIN input
            showToast('DIGIPIN generated!');
        } catch (error) {
            showToast(error.message);
        }
        return;
    }
    
    showToast('Enter a DIGIPIN or coordinates');
});

// Enter key to decode
elements.decodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.decodeBtn.click();
    }
});

// Enter key for coords input
elements.coordsInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.decodeBtn.click();
    }
});

// ============================================
// URL Parameter Handling
// ============================================

function handleURLParams() {
    const params = new URLSearchParams(window.location.search);
    const digipin = params.get('digipin') || params.get('d');
    
    if (digipin) {
        try {
            const coords = getLatLngFromDigiPin(digipin);
            updateUI(formatDigipin(digipin), coords);
            showToast('DIGIPIN loaded from URL');
        } catch (error) {
            console.error('Invalid DIGIPIN in URL:', error);
            initializeDefaults();
        }
    } else {
        initializeDefaults();
    }
}

// Initialize defaults with placeholder QR and map
function initializeDefaults() {
    // Generate default QR code with website URL
    elements.qrContainer.innerHTML = '';
    
    const qrCode = new QRCodeStyling({
        width: 160,
        height: 160,
        type: "svg",
        data: 'https://where-is-digipin.netlify.app/',
        dotsOptions: {
            type: "rounded",
            gradient: {
                type: "linear",
                rotation: 45,
                colorStops: [
                    { offset: 0, color: "#0ea5e9" },
                    { offset: 1, color: "#1e3a8a" }
                ]
            }
        },
        cornersSquareOptions: {
            type: "square",
            gradient: {
                type: "linear",
                rotation: 45,
                colorStops: [
                    { offset: 0, color: "#38bdf8" },
                    { offset: 1, color: "#1e40af" }
                ]
            }
        },
        cornersDotOptions: {
            type: "square",
            gradient: {
                type: "linear",
                rotation: 45,
                colorStops: [
                    { offset: 0, color: "#0ea5e9" },
                    { offset: 1, color: "#1e3a8a" }
                ]
            }
        },
        backgroundOptions: {
            color: "transparent"
        },
        imageOptions: {
            crossOrigin: "anonymous",
            margin: 4
        }
    });
    
    qrCode.append(elements.qrContainer);

    // Show default map (India center)
    const defaultLat = 20.5937;
    const defaultLon = 78.9629;
    
    elements.mapContainer.innerHTML = '<div id="map" style="width:100%;height:100%;"></div>';
    
    const map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([defaultLat, defaultLon], 4);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);
    
    window.currentMap = map;
}

// Initialize
handleURLParams();
