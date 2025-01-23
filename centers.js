document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.querySelector('#centers-table tbody');

    fetch('/emergency_stations/all_centers.php')
        .then(response => response.json())
        .then(centers => {
            if (centers.error) {
                console.error('Ошибка загрузки данных:', centers.error);
                return;
            }

            centers.forEach(center => {
                const row = document.createElement('tr');

                const nameCell = document.createElement('td');
                nameCell.textContent = center.ShortName;
                row.appendChild(nameCell);

                const categoryCell = document.createElement('td');
                categoryCell.textContent = center.Category;
                row.appendChild(categoryCell);

                const ratingCell = document.createElement('td');
                ratingCell.textContent = center.overall_rating 
                    ? parseFloat(center.overall_rating).toFixed(2) 
                    : 'Нет данных';
                row.appendChild(ratingCell);

                const reviewsCell = document.createElement('td');
                reviewsCell.textContent = center.total_reviews 
                    ? center.total_reviews 
                    : '0';
                row.appendChild(reviewsCell);

                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке данных:', error);
        });
});
