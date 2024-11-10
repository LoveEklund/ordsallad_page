// Elements from the DOM
var matrixElement 
const sequencesList = document.getElementById('sequences-list');
var lineOverlay 
const matchedSequences = document.getElementById('matched-sequences')

const clearedLevelsListName = "clearedLevelsList"
// Keep track of selected cells and dragging state
let selectedCells = [];
let isDragging = false;

let letters, predefinedSequences, sequencesData, theme;

// StateManager for handling localStorage interactions
const StateManager = {
    storageKey: 'levelsState',

    getLevelsState: function() {
        let levelsState = localStorage.getItem(this.storageKey);
        if (levelsState) {
            return JSON.parse(levelsState);
        } else {
            return {};
        }
    },

    saveLevelsState: function(levelsState) {
        localStorage.setItem(this.storageKey, JSON.stringify(levelsState));
    },

    loadLevelState: function(levelName) {
        const levelsState = this.getLevelsState();
        return levelsState[levelName] || { matchedSequences: [] };
    },

    saveLevelState: function(levelName, state) {
        const levelsState = this.getLevelsState();
        levelsState[levelName] = state;
        this.saveLevelsState(levelsState);
    }
};

// Define an async function to load the JSON data
async function loadData(load_random) {
    try {
        // Check if this is the user's first visit
        const isFirstTime = localStorage.getItem('firstTime');
    
        if (!isFirstTime) {
            // Show the "How To" overlay if it's the first visit
            const howToOverlay = document.getElementById('how-to-overlay');
            howToOverlay.style.display = 'flex';

            // Set 'firstTime' in localStorage so it doesn't show next time
            localStorage.setItem('firstTime', 'no');
        }

        const gameContainer = document.getElementById('game-container');
        gameContainer.innerHTML = ''; // Clear out any old win message
        const winMessageContainer = document.getElementById('win-message');
        winMessageContainer.innerHTML = ''; // Clear out any old win message
    
        const metaDataResponse = await fetch('static/levels/metadata.json');
        const metadata = await metaDataResponse.json();
        const levels = metadata.avilable_levels;
        
        // Load the list of cleared levels from localStorage
        const clearedLevels = localStorage.getItem(clearedLevelsListName) 
            ? JSON.parse(localStorage.getItem(clearedLevelsListName))
            : [];


        const finishedAll = levels.every(value => clearedLevels.includes(value));     
        const totalLevels = levels.length;

        let filteredList;
        if (finishedAll) {
            filteredList = levels; // Allow replaying all levels if all are finished
        } else {
            // Create filteredList by removing any items from levels that are also in filterList
            filteredList = levels.filter(level => !clearedLevels.includes(level));
        }
        // Check for a currently played level
        let currentLevel = localStorage.getItem('currentLevel');    
        // If no current level, pick the next level from filteredList
        if (!currentLevel || !filteredList.includes(currentLevel)) {
            currentLevel = filteredList[filteredList.length - 1];
        } else {
            currentLevel = levels[levels.length - 1]
        }
        let currentLevelIndex = levels.indexOf(currentLevel) + 1 

        const levelIndicator = document.getElementById('level-indicator');

        if (finishedAll) {
            levelIndicator.textContent = `tema ${currentLevelIndex}/${totalLevels} ⭐️`;
        } else {
            levelIndicator.textContent = `tema ${currentLevelIndex}/${totalLevels}`;
        }

        localStorage.setItem('currentLevel', currentLevel); // Save it as the current level
        // Create the SVG element
        lineOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        lineOverlay.id = "line-overlay";

        // Create the inner matrix div
        matrixElement = document.createElement("div");
        matrixElement.id = "matrix";

        // Append SVG and matrix div to the game container
        gameContainer.appendChild(lineOverlay);
        gameContainer.appendChild(matrixElement);
        const response = await fetch(`static/levels/${currentLevel}.json`);
        const data = await response.json();
        
        // Assign data to variables
        letters = data.matrix;
        predefinedSequences = data.sequence_positions;
        theme = data.theme 

        matchedSequenceThemeHeading = document.getElementById("theme_header")
        matchedSequenceThemeHeading.textContent = `Tema : ${theme.replace("_", " ")}`

        // Load level state
        const levelState = StateManager.loadLevelState(theme);
        const matchedSequencesIndices = levelState.matchedSequences || [];

        sequencesData = predefinedSequences.map((sequence, index) => {
            const lettersInSequence = sequence.map(pos => letters[pos.row][pos.col]).join('');
            return {
                positions: sequence,
                letters: lettersInSequence,
                matched: matchedSequencesIndices.includes(index)
            };
        });

        renderSequencesList();

        // Create the matrix cells
        letters.forEach((row, rowIndex) => {
            row.forEach((letter, colIndex) => {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = rowIndex;
                cell.dataset.col = colIndex;
                cell.dataset.letter = letter;

                // Create the clickable area
                const clickableArea = document.createElement('div');
                clickableArea.classList.add('clickable-area');

                cell.appendChild(clickableArea);
                matrixElement.appendChild(cell);
            });
        });

        // Remove unused letters on load
        removeUnusedLettersOnLoad();

        // Event listener to detect clicks outside the matrix
        document.body.addEventListener('click', function(event) {
            const isClickInsideMatrix = matrixElement.contains(event.target);
            if (!isClickInsideMatrix) {
                // Reset selection if clicked outside the matrix
                resetSelection();
            }
        });

        // Event delegation to detect clicks on cells (including removed cells)
        matrixElement.addEventListener('click', function(event) {
            const cell = event.target.closest('.cell'); // Find the closest parent with the class 'cell'
            if (cell) {
                if (cell.classList.contains('removed')) {
                    // Reset selection if clicked on a removed cell
                    console.log("Resetting selection due to click on removed cell");
                    resetSelection();
                }
            }
        });

        // Prevent click events on the matrix from bubbling up to the body
        matrixElement.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    } catch (error) {
        console.error('Error loading JSON:', error);
    }
}


loadData()



function renderSequencesList() {
    sequencesList.innerHTML = ''; // Clear the list

    sequencesData.forEach(sequence => {
        const listItem = document.createElement('li');
        listItem.classList.add('sequence-item');
        if (sequence.matched) {
            // Display the sequence letters in a green bubble
            listItem.textContent = sequence.letters;
            listItem.classList.add('matched');
        } else {
            // Display the number of letters in a grey bubble
            listItem.textContent = sequence.letters.length + " bokstäver";
            listItem.classList.add('unmatched');
        }

        sequencesList.appendChild(listItem);
    });
}

function animateSequenceToItem(sequence, listItemIndex, options = {}) {
    const listItem = document.querySelectorAll("#sequences-list .sequence-item")[listItemIndex];
    const letters = [];

    // Set default options if not provided
    const {
        animationDuration = 1500,  // duration of the move animation in ms
        delayBetweenLetters = 100  // delay between each letter animation in ms
    } = options;

    sequence.forEach((step, index) => {
        // Get the cell in the matrix
        const cell = document.querySelector(
            `.cell[data-row="${step.row}"][data-col="${step.col}"]`
        );
        
        // Clone the letter element to animate
        const letter = document.createElement("div");
        letter.className = "animated-letter";
        letter.innerText = cell.getAttribute("data-letter");

        // Position the letter in the center of the cell's position
        const cellRect = cell.getBoundingClientRect();
        const listItemRect = listItem.getBoundingClientRect();

        // Adjust the letter's initial position to be centered within the cell
        letter.style.left = `${cellRect.left + cellRect.width / 2}px`;
        letter.style.top = `${cellRect.top + cellRect.height / 2}px`;
        letter.style.transform = "translate(-50%, -50%)"; // Center within its initial position
        letter.style.opacity = 1;  // Start fully visible
        document.body.appendChild(letter); 

        // Calculate the offset to center the letter in the target list item
        const translateX = listItemRect.left + listItemRect.width / 2 - (cellRect.left + cellRect.width / 2);
        const translateY = listItemRect.top + listItemRect.height / 2 - (cellRect.top + cellRect.height / 2);

        // Set animation duration dynamically
        letter.style.transition = `transform ${animationDuration / 1000}s ease, opacity ${animationDuration / 1000}s ease`;

        // Animate the letter to the centered position in the list item and fade it out
        setTimeout(() => {
            letter.style.transform = `translate(${translateX}px, ${translateY}px)`;
            letter.style.opacity = 0;  // Start fading during movement
        }, delayBetweenLetters * index);

        // Remove letter after animation completes
        setTimeout(() => {
            document.body.removeChild(letter);
        }, animationDuration + delayBetweenLetters * index);

        letters.push(cell.getAttribute("data-letter"));
    });
}

// Function to draw the line through selected cells
function drawLineThroughSelectedCells() {
    // Clear previous lines
    while (lineOverlay.firstChild) {
        lineOverlay.removeChild(lineOverlay.firstChild);
    }

    if (selectedCells.length === 0) return

    if (selectedCells.length === 1) {
        // Draw a line around the borders of the single selected cell
        const cell = selectedCells[0];
        const rect = cell.getBoundingClientRect();
        const parentRect = matrixElement.getBoundingClientRect();

        // Calculate the corner positions of the cell relative to the SVG coordinate system
        const x1 = rect.left - parentRect.left + rect.width / 2;
        const y1 = rect.top - parentRect.top + rect.height / 2;

        // Define the points for the rectangle around the cell
        var points = [
            `${x1},${y1}`, // Top-left corner
            `${x1},${y1}`, // Top-right corner
        ];
    } else if (selectedCells.length >= 2) {
        // Draw a line through multiple selected cells
        var points = selectedCells.map(cell => {
            const rect = cell.getBoundingClientRect();
            const parentRect = matrixElement.getBoundingClientRect();

            // Calculate the center position of each cell relative to the SVG coordinate system
            const x = rect.left - parentRect.left + rect.width / 2;
            const y = rect.top - parentRect.top + rect.height / 2;

            return `${x},${y}`;
        });
    }

    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', points.join(' '));
    polyline.setAttribute('stroke', 'blue');
    polyline.setAttribute('stroke-width', '30');
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke-linecap', 'round');
    polyline.setAttribute('stroke-linejoin', 'round');
    polyline.setAttribute('stroke-opacity', '0.5');

    lineOverlay.appendChild(polyline);
}

// Initialize Interact.js on the clickable areas
interact('.clickable-area')
    .draggable({
        inertia: false,
        autoScroll: false,
        listeners: {
            start(event) {
                const cell = event.target.parentElement;
                startSelection(event, cell);
            },
            move(event) {
                const interactPoint = {
                    x: event.pageX,
                    y: event.pageY
                };
                const elementUnderPointer = document.elementFromPoint(
                    interactPoint.x - window.scrollX,
                    interactPoint.y - window.scrollY
                );
                if (elementUnderPointer && elementUnderPointer.classList.contains('clickable-area')) {
                    const cell = elementUnderPointer.parentElement;
                    continueSelection(event, cell);
                }
            },
            end(event) {
                endSelection(event);
            }
        }
    }).styleCursor(false)
    .on('tap', function (event) {
        const cell = event.target.parentElement;
        // Since a tap is a click, we set isDragging to false
        isDragging = false;
        selectCell(cell);
    });

// Function to start selection
function startSelection(event, cell) {
    event.preventDefault(); // Prevent default behavior
    isDragging = true;

    selectCell(cell);
}

// Function to continue selection
function continueSelection(event, cell) {
    if (isDragging) {
        if (!cell.classList.contains('selected') && canSelectCell(cell)) {
            selectCell(cell);
        }
    }
}

// Function to end selection
function endSelection(event) {
    if (isDragging) {
        isDragging = false;
    }
}

// Function to select or unselect a cell
function selectCell(cell) {
    if (cell.classList.contains('removed')) {
        // If the cell is removed, reset the entire selection
        resetSelection();
    } else if (selectedCells.length > 0 && cell === selectedCells[0]) {
        // If the clicked cell is the start of the current sequence, unselect all cells
        resetSelection();
    } else if (cell.classList.contains('selected') && cell === selectedCells[selectedCells.length - 1]) {
        // Unselect the last selected cell
        cell.classList.remove('selected');
        selectedCells.pop();
    } else if (!cell.classList.contains('selected') && canSelectCell(cell)) {
        // Select the cell
        cell.classList.add('selected');
        selectedCells.push(cell);
    } else {
        // Non-adjacent cell clicked, reset selection but keep dragging
        resetSelection(false);
        selectCell(cell);
    }

    // Draw the line through selected cells
    drawLineThroughSelectedCells();

    // Check for matching sequences
    checkSequence();
}

// Function to reset selection
function resetSelection(resetDragging = true) {
    selectedCells.forEach(cell => cell.classList.remove('selected'));
    selectedCells = [];
    if (resetDragging) {
        isDragging = false;
    }

    // Clear the line overlay
    while (lineOverlay.firstChild) {
        lineOverlay.removeChild(lineOverlay.firstChild);
    }
}

// Function to check if a cell can be selected
function canSelectCell(cell) {
    if (selectedCells.length === 0) return true;

    const lastCell = selectedCells[selectedCells.length - 1];
    const lastRow = parseInt(lastCell.dataset.row);
    const lastCol = parseInt(lastCell.dataset.col);

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    // Check adjacency (including diagonals)
    return Math.abs(row - lastRow) <= 1 && Math.abs(col - lastCol) <= 1;
}

function checkSequence() {
    if (selectedCells.length === 0) return;

    const selectedPositions = selectedCells.map(cell => ({
        row: parseInt(cell.dataset.row),
        col: parseInt(cell.dataset.col)
    }));

    for (let i = 0; i < sequencesData.length; i++) {
        const sequence = sequencesData[i];
        if (!sequence.matched && arraysEqual(sequence.positions, selectedPositions)) {
            // Sequence matched
            sequence.matched = true;

            // Update the level state and save it
            const levelState = StateManager.loadLevelState(theme);
            levelState.matchedSequences.push(i);
            StateManager.saveLevelState(theme, levelState);

            // Remove letters from the matrix if they are not used in other sequences
            removeUnusedLetters(selectedPositions);

            // Reset selection since a matching sequence was found
            resetSelection();

            // Re-render the sequences list
            renderSequencesList();

            // Check if all sequences are matched
            isWon = checkWinCondition();
            if(!isWon){
                animateSequenceToItem(sequence.positions,i)
            }
            break; // Exit the loop since we've found a match
        }
    }
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function superConfetti(duration_sec){
const duration = duration_sec * 1000,
  animationEnd = Date.now() + duration,
  defaults = { startVelocity: 15, spread: 360, ticks: 60, zIndex: 0 };



const interval = setInterval(function() {
  const timeLeft = animationEnd - Date.now();

  if (timeLeft <= 0) {
    return clearInterval(interval);
  }

  const particleCount = 50 * (timeLeft / duration);

  // since particles fall down, start a bit higher than random
  confetti(
    Object.assign({}, defaults, {
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    })
  );
  confetti(
    Object.assign({}, defaults, {
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    })
  );
}, 250);

}

function displayWinMessage() {
    const gameContainer = document.getElementById('game-container');
    const winMessageContainer = document.getElementById('win-message');

    // Clear the game container
    gameContainer.innerHTML = ''
    
    winMessageContainer.innerHTML = `
        <div id="win-message">
            <h1> Du klarade temat!</h1>
            <button id="load-data-button" class="replay_button">Spela nästa</button>
        </div>
    `;

    // Check if the key exists in localStorage
    if (!localStorage.getItem(clearedLevelsListName)) {
        // If the key doesn't exist, initialize it as an empty list (array)
        localStorage.setItem(clearedLevelsListName, JSON.stringify([]));
    }

    let clearedLevelsList = JSON.parse(localStorage.getItem(clearedLevelsListName));
    // Check if the value is already in the list
    if (!clearedLevelsList.includes(theme)) {
        // If the value is not in the list, add it
        clearedLevelsList.push(theme);

        // Save the updated list back to localStorage
        localStorage.setItem(clearedLevelsListName, JSON.stringify(clearedLevelsList));
    }

    // Remove level state after completion
    const levelsState = StateManager.getLevelsState();
    delete levelsState[theme];
    StateManager.saveLevelsState(levelsState);
    
    // Add an event listener to the button to call loadData when clicked
    const loadDataButton = document.getElementById('load-data-button');
    loadDataButton.addEventListener('click', loadData);

    // Call superConfetti
    superConfetti(5);
}

function checkWinCondition() {
    const allMatched = sequencesData.every(sequence => sequence.matched);
    if (allMatched) {
        // Display 'Yay, you won!' message
        displayWinMessage();
    }
    return allMatched
}

function removeUnusedLetters(matchedPositions) {
    matchedPositions.forEach(pos => {
        const isUsedElsewhere = sequencesData.some(sequence => {
            if (!sequence.matched) {
                return sequence.positions.some(seqPos => seqPos.row === pos.row && seqPos.col === pos.col);
            } else {
                return false;
            }
        });
        if (!isUsedElsewhere) {
            const cell = document.querySelector(`.cell[data-row='${pos.row}'][data-col='${pos.col}']`);
            cell.classList.add('removed');
            cell.style.animation = 'shrink 1s forwards';
            cell.style.backgroundColor = '#f0f0f0';
            cell.addEventListener('animationend', () => {
                cell.textContent = '';
            }, { once: true });
        }
    });
}

function removeUnusedLettersOnLoad() {
    // Collect all positions used in unmatched sequences
    const positionsInUnmatchedSequences = new Set();
    sequencesData.forEach(sequence => {
        if (!sequence.matched) {
            sequence.positions.forEach(pos => {
                positionsInUnmatchedSequences.add(`${pos.row},${pos.col}`);
            });
        }
    });

    // Go through all cells in the matrix and remove those not in positionsInUnmatchedSequences
    letters.forEach((row, rowIndex) => {
        row.forEach((letter, colIndex) => {
            const posKey = `${rowIndex},${colIndex}`;
            if (!positionsInUnmatchedSequences.has(posKey)) {
                // Remove this cell
                const cell = document.querySelector(`.cell[data-row='${rowIndex}'][data-col='${colIndex}']`);
                if (cell) {
                    cell.textContent = '';
                    cell.style.opacity = 0
                    cell.classList.add('removed');
                }
            }
        });
    });
}

// Helper function to compare arrays of positions
function arraysEqual(a1, a2) {
    if (a1.length !== a2.length) return false;
    for (let i = 0; i < a1.length; i++) {
        if (a1[i].row !== a2[i].row || a1[i].col !== a2[i].col) {
            return false;
        }
    }
    return true;
}


// Get buttons and overlays
const aboutBtn = document.getElementById('about-btn');
const howToBtn = document.getElementById('how-to-btn');
const aboutOverlay = document.getElementById('about-overlay');
const howToOverlay = document.getElementById('how-to-overlay');
const closeButtons = document.querySelectorAll('.close-btn');

// Show About overlay
aboutBtn.addEventListener('click', () => {
    aboutOverlay.style.display = 'flex';
});

// Show How-To overlay
howToBtn.addEventListener('click', () => {
    howToOverlay.style.display = 'flex';
});

// Hide overlay when close button is clicked
closeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const targetOverlay = document.getElementById(e.target.dataset.target);
        if (targetOverlay) {
            targetOverlay.style.display = 'none';
        }
    });
});

// Hide overlay if user clicks outside of the content
document.querySelectorAll('.overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.style.display = 'none';
        }
    });
});