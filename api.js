// Relative URLs work both at the domain root and in a subdirectory.
async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
    let data;
    try {
        data = await response.json();
    } catch {
        throw new Error('Сервер вернул некорректный ответ. Попробуйте позже.');
    }
    if (!response.ok || data.error) {
        throw new Error(data.error || 'Не удалось выполнить запрос.');
    }
    return data;
}

function showStatus(element, message = '', isError = false) {
    element.textContent = message;
    element.classList.toggle('error', isError);
    element.setAttribute('role', isError ? 'alert' : 'status');
}

function formatRating(value) {
    if (value === null || value === undefined || value === '') return 'Пока нет оценок';
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) + ' / 5' : 'Пока нет оценок';
}
