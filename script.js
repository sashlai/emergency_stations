const selectElement = document.getElementById('trauma-center-select');
const searchInput = document.getElementById('search-input');
const suggestions = document.getElementById('suggestions');
const loadStatus = document.getElementById('load-status');
const surveyStatus = document.getElementById('survey-status');
const statsStatus = document.getElementById('statistics-status');
const form = document.getElementById('survey-form');
const submitButton = form.querySelector('button');
const infoBox = document.getElementById('trauma-center-info');
const statisticsBox = document.getElementById('statistics');
const markers = new Map();
const fields = ['waiting_time', 'professionalism', 'politeness', 'clarity', 'cleanliness', 'visit_time'];
let traumaCenters = [];
let statisticsVersion = 0;
let activeSuggestion = -1;
let isSubmitting = false;
let map;

try {
    map = L.map('map').setView([55.751244, 37.618423], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
} catch {
    document.getElementById('map').textContent = 'Карта недоступна. Воспользуйтесь поиском или списком травмпунктов.';
}

function coordinates(center) {
    try {
        const geo = typeof center.geoData === 'string' ? JSON.parse(center.geoData) : center.geoData;
        const point = geo?.type === 'Point' ? geo.coordinates : geo?.coordinates?.[0];
        if (!Array.isArray(point) || point.length < 2 ||
            !point.slice(0, 2).every(value => typeof value === 'number' && Number.isFinite(value)) ||
            Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) return null;
        return [point[1], point[0]];
    } catch { return null; }
}

function clearSuggestions() {
    suggestions.replaceChildren();
    suggestions.hidden = true;
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.removeAttribute('aria-activedescendant');
    activeSuggestion = -1;
}

function selectCenter(center) {
    clearSuggestions();
    ++statisticsVersion;
    showStatus(surveyStatus);
    submitButton.disabled = !center || isSubmitting;
    if (!center) {
        infoBox.hidden = true;
        statisticsBox.hidden = true;
        return;
    }
    selectElement.value = center.id;
    searchInput.value = center.ShortName;
    const infoFields = {
        category: 'Category', chief: 'ChiefName', position: 'ChiefPosition',
        status: 'CloseFlag', extra: 'Extrainfo', hours: 'ClarificationWorkingHours', age: 'AgeRestriction'
    };
    for (const [target, source] of Object.entries(infoFields)) {
        document.getElementById('info-' + target).textContent = center[source] || 'Нет данных';
    }
    document.getElementById('info-name').textContent = center.ShortName;
    infoBox.hidden = false;
    const point = coordinates(center);
    if (map && point) {
        map.setView(point, 15);
        markers.get(String(center.id))?.openPopup();
    }
    loadStatistics(center.id);
}

async function loadStatistics(id) {
    const version = ++statisticsVersion;
    statisticsBox.hidden = false;
    document.getElementById('statistics-values').hidden = true;
    showStatus(statsStatus, 'Загружаем оценки…');
    try {
        const stats = await requestJson('get_statistics.php?id=' + encodeURIComponent(id));
        if (version !== statisticsVersion) return;
        for (const field of fields) {
            document.getElementById('stat-' + field.replaceAll('_', '-')).textContent = formatRating(stats[field]);
        }
        document.getElementById('stat-total-reviews').textContent = stats.total_reviews ?? 0;
        document.getElementById('stat-overall-rating').textContent = formatRating(stats.overall_rating);
        document.getElementById('statistics-values').hidden = false;
        showStatus(statsStatus, Number(stats.total_reviews) === 0 ? 'Здесь ещё нет отзывов. Вы можете оставить первый.' : '');
    } catch (error) {
        if (version === statisticsVersion) showStatus(statsStatus, error.message, true);
    }
}

async function loadCenters() {
    showStatus(loadStatus, 'Загружаем травмпункты…');
    document.getElementById('retry-load').hidden = true;
    try {
        const data = await requestJson('db_connection.php');
        if (!Array.isArray(data)) throw new Error('Не удалось загрузить список травмпунктов.');
        traumaCenters = data;
        for (const center of data) {
            const option = document.createElement('option');
            option.value = center.id;
            option.textContent = center.ShortName;
            selectElement.append(option);
            const point = coordinates(center);
            if (map && point) {
                const label = document.createElement('span');
                label.textContent = center.ShortName;
                const marker = L.marker(point).addTo(map).bindPopup(label);
                marker.on('click', () => selectCenter(center));
                markers.set(String(center.id), marker);
            }
        }
        searchInput.disabled = data.length === 0;
        selectElement.disabled = data.length === 0;
        showStatus(loadStatus, data.length ? 'В каталоге: ' + data.length + ' травмпунктов.' : 'В каталоге пока нет травмпунктов.');
    } catch (error) {
        showStatus(loadStatus, error.message, true);
        document.getElementById('retry-load').hidden = false;
    }
}

document.getElementById('retry-load').addEventListener('click', loadCenters);
selectElement.addEventListener('change', () => {
    selectCenter(traumaCenters.find(center => String(center.id) === selectElement.value));
});

searchInput.addEventListener('input', () => {
    clearSuggestions();
    const query = searchInput.value.trim().toLocaleLowerCase('ru');
    if (!query) return;
    const matches = traumaCenters.filter(center => center.ShortName.toLocaleLowerCase('ru').includes(query)).slice(0, 10);
    suggestions.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
    if (!matches.length) {
        const empty = document.createElement('div');
        empty.className = 'suggestion-empty';
        empty.textContent = 'Ничего не найдено';
        suggestions.append(empty);
    }
    matches.forEach((center, index) => {
        const item = document.createElement('div');
        item.id = 'suggestion-' + index;
        item.className = 'suggestion-item';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        item.textContent = center.ShortName;
        item.addEventListener('click', () => selectCenter(center));
        suggestions.append(item);
    });
});

searchInput.addEventListener('keydown', event => {
    if (event.key === 'Escape') { clearSuggestions(); return; }
    const items = [...suggestions.querySelectorAll('[role="option"]')];
    if (suggestions.hidden || !items.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        activeSuggestion = (activeSuggestion + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((item, index) => item.setAttribute('aria-selected', String(index === activeSuggestion)));
        searchInput.setAttribute('aria-activedescendant', items[activeSuggestion].id);
        items[activeSuggestion].scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && activeSuggestion >= 0) {
        event.preventDefault();
        items[activeSuggestion].click();
    } else if (event.key === 'Tab') clearSuggestions();
});
document.addEventListener('click', event => {
    if (!event.target.closest('.search-group')) clearSuggestions();
});

form.addEventListener('submit', async event => {
    event.preventDefault();
    if (isSubmitting) return;
    const id = selectElement.value;
    if (!id) { showStatus(surveyStatus, 'Сначала выберите травмпункт.', true); return; }
    const data = { id: Number(id) };
    fields.forEach(field => { data[field] = Number(document.getElementById(field.replaceAll('_', '-')).value); });
    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Отправляем…';
    showStatus(surveyStatus, 'Сохраняем вашу оценку…');
    try {
        await requestJson('save_rating.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        if (selectElement.value === id) {
            showStatus(surveyStatus, 'Спасибо! Ваша оценка сохранена.');
            form.reset();
            await loadStatistics(id);
        }
    } catch (error) {
        showStatus(surveyStatus, error.message, true);
    } finally {
        isSubmitting = false;
        submitButton.disabled = !selectElement.value;
        submitButton.textContent = 'Отправить оценку';
    }
});
loadCenters();
