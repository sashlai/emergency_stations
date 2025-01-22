const map = L.map('map').setView([55.751244, 37.618423], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

const selectElement = document.getElementById('trauma-center-select');
const searchInput = document.getElementById('search-input');
const suggestionsContainer = document.getElementById('suggestions');

let traumaCenters = []; 


fetch('/emergency_stations/db_connection.php')
    .then(response => response.json())
    .then(data => {
        traumaCenters = data; 
        populateCenters(traumaCenters);
    })
    .catch(error => {
        console.error('Ошибка при загрузке данных:', error);
    });

function populateCenters(centers) {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    selectElement.innerHTML = '<option value="">-- Выберите травмпункт --</option>';

    centers.forEach(center => {
        const geoData = typeof center.geoData === 'string' ? JSON.parse(center.geoData) : center.geoData;
        const coordinates = geoData.coordinates[0];
        const lat = coordinates[1];
        const lng = coordinates[0];

        const marker = L.marker([lat, lng]).addTo(map).bindPopup(center.FullName);

        marker.on('click', () => {
            map.setView([lat, lng], 15); 
            selectElement.value = center.id; 
        });

        const option = document.createElement('option');
        option.value = center.id;
        option.textContent = center.FullName;
        selectElement.appendChild(option);
    });
}

function showSuggestions(query) {
    suggestionsContainer.innerHTML = '';
    
    if (!query.trim()) {
        return; 
    }

    const filteredCenters = traumaCenters.filter(center =>
        center.FullName.toLowerCase().includes(query.toLowerCase())
    );

    if (filteredCenters.length === 0) {
        suggestionsContainer.innerHTML = '<div class="suggestion-item">Ничего не найдено</div>';
        return;
    }

    filteredCenters.forEach(center => {
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = center.FullName;
        suggestionItem.classList.add('suggestion-item');

        suggestionItem.addEventListener('click', () => {
            const geoData = typeof center.geoData === 'string' ? JSON.parse(center.geoData) : center.geoData;
            const coordinates = geoData.coordinates[0];

            map.setView([coordinates[1], coordinates[0]], 15); 
            selectElement.value = center.id; 
            searchInput.value = center.FullName; 
            suggestionsContainer.innerHTML = '';
        });

        suggestionsContainer.appendChild(suggestionItem);
    });
}

searchInput.addEventListener('input', (event) => {
    const query = event.target.value;
    showSuggestions(query);
});

selectElement.addEventListener('change', event => {
    const selectedIndex = event.target.value;

    if (selectedIndex !== '') {
        const selectedCenter = traumaCenters.find(center => center.id == selectedIndex);

        if (selectedCenter && selectedCenter.geoData) {
            const geoData = typeof selectedCenter.geoData === 'string'
                ? JSON.parse(selectedCenter.geoData)
                : selectedCenter.geoData;

            if (geoData.coordinates && geoData.coordinates[0]) {
                const coordinates = geoData.coordinates[0];
                map.setView([coordinates[1], coordinates[0]], 15); 
            }
        }
    }
});
