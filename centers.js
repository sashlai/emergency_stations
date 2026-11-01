const tableBody = document.querySelector('#centers-table tbody');
const status = document.getElementById('table-status');
const retry = document.getElementById('retry-load');

async function loadCenters() {
    showStatus(status, 'Загружаем рейтинг…');
    retry.hidden = true;
    tableBody.replaceChildren();
    try {
        const centers = await requestJson('all_centers.php');
        if (!Array.isArray(centers)) throw new Error('Не удалось загрузить рейтинг.');
        for (const center of centers) {
            const row = document.createElement('tr');
            [center.ShortName, center.Category || 'Нет данных', formatRating(center.overall_rating), center.total_reviews ?? 0].forEach(value => {
                const cell = document.createElement('td');
                cell.textContent = value;
                row.append(cell);
            });
            tableBody.append(row);
        }
        showStatus(status, centers.length ? '' : 'В каталоге пока нет травмпунктов.');
    } catch (error) {
        showStatus(status, error.message, true);
        retry.hidden = false;
    }
}
retry.addEventListener('click', loadCenters);
loadCenters();
