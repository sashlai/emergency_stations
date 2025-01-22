const map = L.map('map').setView([55.751244, 37.618423], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

const selectElement = document.getElementById('trauma-center-select');
const searchInput = document.getElementById('search-input');
const suggestionsContainer = document.getElementById('suggestions');

const infoBox = document.getElementById('trauma-center-info');
const infoCategory = document.getElementById('info-category');
const infoChief = document.getElementById('info-chief');
const infoPosition = document.getElementById('info-position');
const infoGender = document.getElementById('info-gender');
const infoStatus = document.getElementById('info-status');
const infoExtra = document.getElementById('info-extra');

let traumaCenters = []; 
const markers = {}; 

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
    centers.forEach(center => {
        const geoData = typeof center.geoData === 'string' ? JSON.parse(center.geoData) : center.geoData;
        const coordinates = geoData.coordinates[0];
        const lat = coordinates[1];
        const lng = coordinates[0];

        const marker = L.marker([lat, lng]).addTo(map).bindPopup(center.ShortName);
        markers[center.id] = marker;

        marker.on('click', () => {
            map.setView([lat, lng], 15);
            selectElement.value = center.id;
            displayInfo(center);
            loadStatistics(center.id);
        });

        const option = document.createElement('option');
        option.value = center.id;
        option.textContent = center.ShortName;
        selectElement.appendChild(option);
    });
}

function displayInfo(center) {
    infoCategory.textContent = center.Category || 'Нет данных';
    infoChief.textContent = center.ChiefName || 'Нет данных';
    infoPosition.textContent = center.ChiefPosition || 'Нет данных';
    infoGender.textContent = center.ChiefGender || 'Нет данных';
    infoStatus.textContent = center.CloseFlag || 'Нет данных';
    infoExtra.textContent = center.Extrainfo || 'Нет данных';
    infoBox.style.display = 'block';
}

function loadStatistics(traumaCenterId) {
    fetch(`/emergency_stations/get_statistics.php?id=${traumaCenterId}`)
        .then(response => response.json())
        .then(stats => {
            document.getElementById('statistics').style.display = 'block';

            document.getElementById('stat-waiting-time').textContent =
                stats.waiting_time ? parseFloat(stats.waiting_time).toFixed(2) : 'Нет данных';

            document.getElementById('stat-professionalism').textContent =
                stats.professionalism ? parseFloat(stats.professionalism).toFixed(2) : 'Нет данных';

            document.getElementById('stat-politeness').textContent =
                stats.politeness ? parseFloat(stats.politeness).toFixed(2) : 'Нет данных';

            document.getElementById('stat-clarity').textContent =
                stats.clarity ? parseFloat(stats.clarity).toFixed(2) : 'Нет данных';

            document.getElementById('stat-cleanliness').textContent =
                stats.cleanliness ? parseFloat(stats.cleanliness).toFixed(2) : 'Нет данных';

            document.getElementById('stat-visit-time').textContent =
                stats.visit_time ? parseFloat(stats.visit_time).toFixed(2) : 'Нет данных';
        })
        .catch(error => {
            console.error('Ошибка при загрузке статистики:', error);
        });
}

selectElement.addEventListener('change', event => {
    const selectedId = event.target.value;

    if (selectedId !== "") {
        const selectedCenter = traumaCenters.find(center => center.id == selectedId);

        if (selectedCenter && selectedCenter.geoData) {
            const geoData = typeof selectedCenter.geoData === 'string'
                ? JSON.parse(selectedCenter.geoData)
                : selectedCenter.geoData;

            if (geoData.coordinates && geoData.coordinates[0]) {
                const coordinates = geoData.coordinates[0];
                const lat = coordinates[1];
                const lng = coordinates[0];

                map.setView([lat, lng], 15);

                const marker = markers[selectedCenter.id];
                if (marker) {
                    marker.openPopup();
                }
                displayInfo(selectedCenter); 
                loadStatistics(selectedCenter.id); 
            }
        }
    } else {
        infoBox.style.display = 'none';
        document.getElementById('statistics').style.display = 'none';
    }
});

function showSuggestions(query) {
    suggestionsContainer.innerHTML = '';

    if (!query.trim()) {
        return;
    }

    const filteredCenters = traumaCenters.filter(center =>
        center.ShortName.toLowerCase().includes(query.toLowerCase())
    );

    if (filteredCenters.length === 0) {
        suggestionsContainer.innerHTML = '<div class="suggestion-item">Ничего не найдено</div>';
        return;
    }

    filteredCenters.forEach(center => {
        const suggestionItem = document.createElement('div');
        suggestionItem.textContent = center.ShortName;
        suggestionItem.classList.add('suggestion-item');

        suggestionItem.addEventListener('click', () => {
            const geoData = typeof center.geoData === 'string' ? JSON.parse(center.geoData) : center.geoData;
            const coordinates = geoData.coordinates[0];

            map.setView([coordinates[1], coordinates[0]], 15);
            selectElement.value = center.id;
            searchInput.value = center.ShortName;
            suggestionsContainer.innerHTML = '';
            displayInfo(center); 
            loadStatistics(center.id); 
        });

        suggestionsContainer.appendChild(suggestionItem);
    });
}

searchInput.addEventListener('input', event => {
    const query = event.target.value;
    showSuggestions(query);
});

document.getElementById('survey-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const traumaCenterId = selectElement.value;
    if (!traumaCenterId) {
        alert('Пожалуйста, выберите травмпункт.');
        return;
    }

    const data = {
        id: traumaCenterId,
        waiting_time: document.getElementById('waiting-time').value,
        professionalism: document.getElementById('professionalism').value,
        politeness: document.getElementById('politeness').value,
        clarity: document.getElementById('clarity').value,
        cleanliness: document.getElementById('cleanliness').value,
        visit_time: document.getElementById('visit-time').value
    };

    fetch('/emergency_stations/save_rating.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                alert('Спасибо за ваш отзыв!');
                loadStatistics(traumaCenterId); 
            } else {
                alert('Ошибка при сохранении оценки: ' + result.error);
            }
        })
        .catch(error => {
            console.error('Ошибка при отправке данных:', error);
        });
});
