document.addEventListener('DOMContentLoaded', () => {
    const examButtons = document.querySelectorAll('.exam-btn');

    examButtons.forEach(button => {
        button.addEventListener('click', () => {
            const jsonFile = button.dataset.json;
            if (jsonFile) {
                // Store the selected JSON file name in localStorage
                localStorage.setItem('selectedExamFile', jsonFile);
                // Redirect to the main exam page
                window.location.href = 'home.html';
            }
        });
    });
});