const map = L.map('map').setView([55.751244, 37.618423], 12); 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

const traumaCenters = [
    { name: "Травмпункт №1", lat: 55.7558, lng: 37.6173 },
    { name: "Травмпункт №2", lat: 55.7601, lng: 37.6202 },
    { name: "Травмпункт №3", lat: 55.7510, lng: 37.6050 }
];

const selectElement = document.getElementById('trauma-center-select');

traumaCenters.forEach((center, index) => {
    L.marker([center.lat, center.lng]).addTo(map).bindPopup(center.name);

    const option = document.createElement('option');
    option.value = index;
    option.textContent = center.name;
    selectElement.appendChild(option);
});

selectElement.addEventListener('change', (event) => {
    const selectedIndex = event.target.value;
    if (selectedIndex !== "") {
        const selectedCenter = traumaCenters[selectedIndex];
        map.setView([selectedCenter.lat, selectedCenter.lng], 15);
    }
});

document.getElementById('survey-form').addEventListener('submit', (event) => {
    event.preventDefault();

    const rating = document.getElementById('rating').value;
    const feedback = document.getElementById('feedback').value;
    const selectedCenterIndex = selectElement.value;

    if (selectedCenterIndex === "") {
        alert('Пожалуйста, выберите травмпункт.');
        return;
    }

    const selectedCenter = traumaCenters[selectedCenterIndex];

    alert(`Спасибо за ваш отзыв о ${selectedCenter.name}!\nРейтинг: ${rating}\nОтзыв: ${feedback}`);
});
