// Elements from the DOM
const matrixElement = document.getElementById('matrix');
const sequencesList = document.getElementById('sequences-list');
const lineOverlay = document.getElementById('line-overlay'); // SVG element

const sequencesData = predefinedSequences.map(sequence => {
    const lettersInSequence = sequence.map(pos => letters[pos.row][pos.col]).join('');
    return {
        positions: sequence,
        letters: lettersInSequence,
        matched: false
    };
});


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
            listItem.textContent = sequence.letters.length + " letters";
            listItem.classList.add('unmatched');
        }

        sequencesList.appendChild(listItem);
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

// Keep track of selected cells and dragging state
let selectedCells = [];
let isDragging = false;


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
    console.log(cell)
    console.log(selectedCells)
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

            // Remove letters from the matrix if they are not used in other sequences
            removeUnusedLetters(selectedPositions);

            // Reset selection since a matching sequence was found
            resetSelection();

            // Re-render the sequences list
            renderSequencesList();

            // Check if all sequences are matched
            checkWinCondition();

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

    // Clear the game container
    gameContainer.innerHTML = `
        <div id="win-message">
            <h1>YAY, you won! <span class="emoji">🎉</span><span class="emoji">🎉</span><span class="emoji">🎉</span></h1>
        </div> `
    ;
    superConfetti(5)

}

function checkWinCondition() {
    const allMatched = sequencesData.every(sequence => sequence.matched);
    if (allMatched) {
        // Display 'Yay, you won!' message
        displayWinMessage();
    }
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
            cell.textContent = '';
        }
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