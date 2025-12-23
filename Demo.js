// --- DATA ---
// =================================================================================
const QUESTION_LIMIT = 90; // Set the maximum number of questions to load.

let questions = []; // This will hold the processed and shuffled questions.
let currentQuestionIndex = 0;
let isExamFinished = false; // State to track if the exam is complete.

// --- DOM ELEMENTS ---
const questionList = document.getElementById('question-list');
const questionPromptText = document.getElementById('question-prompt-text');
const answerOptionsList = document.getElementById('answer-options-list');
const itemsAttemptedSpan = document.getElementById('items-attempted');
const timerSpan = document.getElementById('timer');
const explanationBox = document.getElementById('explanation-box');


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // THIS IS THE CRUCIAL CHANGE:
    // It gets the filename saved by the home page. Defaults to 'questions.json' if none is found.
    const selectedExamFile = localStorage.getItem('selectedExamFile') || 'questions.json';

    fetch(selectedExamFile) // Fetch the dynamically selected file
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok for file: ${selectedExamFile}`);
            }
            return response.json();
        })
        .then(data => {
            loadAndPrepareQuestions(data, selectedExamFile); // Pass filename for unique localStorage keys
            if (questions.length > 0) {
                renderQuestionSidebar();
                loadQuestion(currentQuestionIndex);
                startTimer(3 * 3600 + 44 * 60 + 39);
            } else {
                questionPromptText.textContent = "You've seen all available questions for this exam! The pool has been reset. Please refresh to start again.";
            }
        })
        .catch(error => {
            console.error('Error loading or processing questions:', error);
            questionPromptText.textContent = `Error: Could not load questions from ${selectedExamFile}. Make sure the file exists and is correctly formatted.`;
        });
});


// --- JSON and Data Preparation ---

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// MODIFIED: Added 'examId' to create unique localStorage keys for each exam file.
function loadAndPrepareQuestions(rawQuestions, examId) {
    try {
        const storageKey = `seenQuestionIndices_${examId}`;
        let seenIndices = JSON.parse(localStorage.getItem(storageKey)) || [];
        const allQuestionsWithId = rawQuestions.map((q, index) => ({ ...q, originalIndex: index }));
        let availableQuestions = allQuestionsWithId.filter(q => !seenIndices.includes(q.originalIndex));

        if (availableQuestions.length < QUESTION_LIMIT && availableQuestions.length > 0) {
             console.log("Not enough new questions. Resetting pool for this exam.");
             seenIndices = [];
             localStorage.removeItem(storageKey);
             availableQuestions = allQuestionsWithId;
        } else if (availableQuestions.length === 0) {
             console.log("All questions seen. Resetting pool for this exam.");
             localStorage.removeItem(storageKey);
             // Return an empty array to show the completion message.
             questions = [];
             return;
        }

        shuffleArray(availableQuestions);
        const currentExamSet = availableQuestions.slice(0, QUESTION_LIMIT);
        const newSeenIndices = currentExamSet.map(q => q.originalIndex);
        const updatedSeenIndices = [...new Set([...seenIndices, ...newSeenIndices])];
        localStorage.setItem(storageKey, JSON.stringify(updatedSeenIndices));

        questions = currentExamSet.map((q, index) => ({
            id: index + 1,
            text: q.Question,
            options: [q['Option A'], q['Option B'], q['Option C'], q['Option D']],
            correctAnswer: q.Answer,
            explanation: q.Explanation,
            userAnswer: null,
            isFlagged: false,
            comment: ''
        }));

    } catch (error) {
        console.error("Failed to process questions data:", error);
        questions = [];
    }
}


// --- CORE FUNCTIONS ---

function getCorrectAnswerIndex(question) {
    if (!question.correctAnswer) {
        console.error("Question has no correct answer:", question);
        return -1;
    }
    const answerString = question.correctAnswer.trim();
    const letter = answerString.slice(-1).toUpperCase();
    if (letter >= 'A' && letter <= 'D') {
        return letter.charCodeAt(0) - 65;
    } else {
        console.error("Invalid answer format:", question.correctAnswer);
        return -1;
    }
}

function loadQuestion(index) {
    currentQuestionIndex = index;
    const question = questions[index];
    questionPromptText.innerHTML = question.text;
    answerOptionsList.innerHTML = '';
    explanationBox.style.display = 'none';
    const correctAnswerIndex = getCorrectAnswerIndex(question);

    question.options.forEach((option, i) => {
        const letter = String.fromCharCode(65 + i);
        const li = document.createElement('li');
        li.className = 'answer-option';
        li.dataset.index = i;
        li.innerHTML = `<span class="option-letter">${letter}</span><span>${option || ''}</span>`;

        if (isExamFinished) {
            if (i === correctAnswerIndex) li.classList.add('correct');
            if (question.userAnswer === i && i !== correctAnswerIndex) li.classList.add('incorrect');
        } else {
            if (question.userAnswer === i) li.classList.add('selected');
            li.addEventListener('click', () => selectAnswer(i));
            li.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                li.classList.toggle('strikeout');
            });
        }
        answerOptionsList.appendChild(li);
    });

    if (isExamFinished) {
        explanationBox.innerHTML = `<strong>Explanation:</strong> ${question.explanation || 'No explanation available.'}`;
        explanationBox.style.display = 'block';
    }
    updateUI();
}

function renderQuestionSidebar() {
    questionList.innerHTML = '';
    questions.forEach((q, index) => {
        const btn = document.createElement('button');
        btn.className = 'question-btn';
        btn.textContent = q.id;
        btn.addEventListener('click', () => loadQuestion(index));
        questionList.appendChild(btn);
    });
}

function updateUI() {
    document.querySelectorAll('.question-btn').forEach((btn, index) => {
        const q = questions[index];
        const isActive = index === currentQuestionIndex;
        btn.classList.toggle('active', isActive);
        btn.classList.toggle('attempted', q.userAnswer !== null);
        if (isActive) {
            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const flagIcon = btn.querySelector('.flag-icon');
        if (q.isFlagged && !flagIcon) {
             btn.innerHTML += '<i class="fa-solid fa-flag flag-icon"></i>';
        } else if (!q.isFlagged && flagIcon) {
            flagIcon.remove();
        }
    });
    document.getElementById('flag-btn').style.backgroundColor = questions[currentQuestionIndex].isFlagged ? 'rgb(223, 91, 91)' : '';
    const attemptedCount = questions.filter(q => q.userAnswer !== null).length;
    itemsAttemptedSpan.textContent = `${attemptedCount}/${questions.length} Items Attempted`;
}

function selectAnswer(optionIndex) {
    // Return if the exam is finished to prevent changes.
    if (isExamFinished) return;

    const question = questions[currentQuestionIndex];
    // Check if the user is clicking the same answer again to deselect it.
    const isDeselecting = question.userAnswer === optionIndex;

    // --- STATE UPDATE ---
    // Update the answer in our data. If deselecting, set to null.
    question.userAnswer = isDeselecting ? null : optionIndex;

    // --- DOM UPDATE ---
    // Get all the answer option elements currently on the page.
    const optionElements = answerOptionsList.querySelectorAll('.answer-option');
    
    // Loop through them to update their appearance.
    optionElements.forEach((li, i) => {
        // The 'toggle' method is a clean way to add/remove a class.
        // It adds 'selected' if the condition is true, and removes it if false.
        li.classList.toggle('selected', i === question.userAnswer);
    });

    // Update the sidebar to reflect the "attempted" status.
    updateUI();
}

// --- Functions for finishing the exam and calculating score ---

function calculateScore() {
    return questions.filter(q => q.userAnswer === getCorrectAnswerIndex(q)).length;
}

function finishExam() {
    isExamFinished = true;
    clearInterval(timerInterval);
    const score = calculateScore();
    const total = questions.length;
    const percentage = total > 0 ? ((score / total) * 100).toFixed(2) : 0;

    // --- ADD THIS SECTION ---
    // Update the header to permanently display the final score and status.
    itemsAttemptedSpan.innerHTML = `<strong>Score: ${score} / ${total} (${percentage}%)</strong>`;
    timerSpan.textContent = "Finished";
    // --- END OF ADDED SECTION ---

    const finishModal = document.getElementById('finish-modal');
    finishModal.querySelector('h3').textContent = "Exam Results";
    finishModal.querySelector('p').innerHTML = `You scored <strong>${score} out of ${total} (${percentage}%)</strong>.<br>You can now review your answers.`;
    document.getElementById('confirm-finish-btn').textContent = "Close";
    document.getElementById('cancel-finish-btn').style.display = 'none';
    document.getElementById('confirm-finish-btn').onclick = () => {
        finishModal.style.display = 'none';
        loadQuestion(currentQuestionIndex); // Reload question to enter review mode
    };

    // Disable buttons that are not needed in review mode
    document.getElementById('flag-btn').disabled = true;
    document.getElementById('comment-btn').disabled = true;
    document.getElementById('finish-section-btn').disabled = true;
}

// --- EVENT LISTENERS & MODALS (No changes below this line) ---
document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'home.html'; // Change 'index.html' if your home page has a different name
});

document.getElementById('next-btn').addEventListener('click', () => {
    if (currentQuestionIndex < questions.length - 1) loadQuestion(currentQuestionIndex + 1);
});
document.getElementById('back-btn').addEventListener('click', () => {
    if (currentQuestionIndex > 0) loadQuestion(currentQuestionIndex - 1);
});
document.getElementById('flag-btn').addEventListener('click', () => {
    if (isExamFinished) return;
    questions[currentQuestionIndex].isFlagged = !questions[currentQuestionIndex].isFlagged;
    updateUI();
});
document.getElementById('sidebar-up').addEventListener('click', () => questionList.scrollTop -= 100);
document.getElementById('sidebar-down').addEventListener('click', () => questionList.scrollTop += 100);

questionPromptText.addEventListener('mouseup', () => {
    if (isExamFinished) return;
    const selection = window.getSelection();
    if (selection.toString().length > 0) {
        const range = selection.getRangeAt(0);
        const mark = document.createElement('mark');
        try {
            range.surroundContents(mark);
        } catch (e) {
            console.warn("Highlighting failed, likely across different elements.", e);
        }
        selection.removeAllRanges();
    }
});

function setupModal(modalId, openBtnId, contentSetupFn) {
    const modal = document.getElementById(modalId);
    const openBtn = document.getElementById(openBtnId);
    const closeBtn = modal.querySelector('.close-btn');
    openBtn.addEventListener('click', () => {
        if (contentSetupFn) contentSetupFn();
        modal.style.display = 'flex';
    });
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target == modal) modal.style.display = 'none';
    });
}
setupModal('calculator-modal', 'calculator-btn');
const calcDisplay = document.getElementById('calculator-display');
document.querySelectorAll('.calc-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.id === 'calc-clear') calcDisplay.value = '';
        else if (btn.classList.contains('equals')) {
            try {
                calcDisplay.value = eval(calcDisplay.value.replace(/[^-()\d/*+.]/g, ''));
            } catch {
                calcDisplay.value = 'Error';
            }
        } else {
            calcDisplay.value += btn.textContent;
        }
    });
});
const resourceModal = document.getElementById('resource-modal');
const resourceTitle = document.getElementById('resource-title');
const resourceContent = document.getElementById('resource-content');
document.getElementById('reference-btn').addEventListener('click', () => {
    resourceTitle.textContent = 'Reference Document';
    resourceContent.textContent = 'This is the content of the reference PDF.';
    resourceModal.style.display = 'flex';
});
document.getElementById('exhibit-btn').addEventListener('click', () => {
    resourceTitle.textContent = 'Exhibit';
    resourceContent.innerHTML = 'This is an exhibit.<br><img src="https://placehold.co/400x300/e9e9e9/333?text=Sample+Diagram" alt="Sample Diagram" style="max-width: 100%; margin-top: 10px;">';
    resourceModal.style.display = 'flex';
});
resourceModal.querySelector('.close-btn').addEventListener('click', () => resourceModal.style.display = 'none');
const commentTextarea = document.getElementById('comment-textarea');
setupModal('comment-modal', 'comment-btn', () => {
    commentTextarea.value = questions[currentQuestionIndex]?.comment || '';
});
document.getElementById('save-comment-btn').addEventListener('click', () => {
    if (questions[currentQuestionIndex]) {
        questions[currentQuestionIndex].comment = commentTextarea.value;
    }
    document.getElementById('comment-modal').style.display = 'none';
});
const reviewGrid = document.getElementById('review-grid');
setupModal('review-modal', 'review-icon', () => {
    reviewGrid.innerHTML = '';
    questions.forEach((q, index) => {
        const btn = document.createElement('button');
        btn.className = 'question-btn';
        btn.textContent = q.id;
        if (q.userAnswer !== null) btn.classList.add('attempted');
        if (q.isFlagged) btn.innerHTML += '<i class="fa-solid fa-flag flag-icon"></i>';
        btn.addEventListener('click', () => {
            loadQuestion(index);
            document.getElementById('review-modal').style.display = 'none';
        });
        reviewGrid.appendChild(btn);
    });
    filterReviewGrid();
});
const reviewFilters = document.querySelectorAll('#review-filters input');
reviewFilters.forEach(input => input.addEventListener('change', filterReviewGrid));
function filterReviewGrid() {
    const activeFilters = Array.from(reviewFilters).filter(i => i.checked).map(i => i.value);
    document.querySelectorAll('#review-grid .question-btn').forEach((btn, index) => {
        const q = questions[index];
        const isAttempted = q.userAnswer !== null;
        const isFlagged = q.isFlagged;
        let show = activeFilters.length === 0 ||
                   (activeFilters.includes('unattempted') && !isAttempted) ||
                   (activeFilters.includes('attempted') && isAttempted) ||
                   (activeFilters.includes('flagged') && isFlagged);
        btn.style.display = show ? 'flex' : 'none';
    });
}
setupModal('finish-modal', 'finish-section-btn', () => {
    const attemptedCount = questions.filter(q => q.userAnswer !== null).length;
    const flaggedCount = questions.filter(q => q.isFlagged).length;
    
    // This is the corrected line:
    const modal = document.getElementById('finish-modal');
    modal.querySelector('p').innerHTML =
        `You have attempted ${attemptedCount} out of ${questions.length} questions.<br>` +
        `You have ${flaggedCount} question(s) flagged for review.<br><br>` +
        `Are you sure you want to finish this section?`;

    document.getElementById('cancel-finish-btn').style.display = 'inline-block';
    document.getElementById('confirm-finish-btn').textContent = "Yes, finish section";
    document.getElementById('confirm-finish-btn').onclick = finishExam;
});
let timerInterval;
function startTimer(duration) {
    let timer = duration;
    timerInterval = setInterval(() => {
        if (isExamFinished) {
            clearInterval(timerInterval);
            return;
        }
        let hours = Math.floor(timer / 3600);
        let minutes = Math.floor((timer % 3600) / 60);
        let seconds = timer % 60;
        hours = hours < 10 ? "0" + hours : hours;
        minutes = minutes < 10 ? "0" + minutes : minutes;
        seconds = seconds < 10 ? "0" + seconds : seconds;
        timerSpan.textContent = `${hours}:${minutes}:${seconds}`;
        if (--timer < 0) {
            clearInterval(timerInterval);
            finishExam();
        }
    }, 1000);
}
