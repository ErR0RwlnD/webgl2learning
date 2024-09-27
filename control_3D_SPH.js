"use strict";

document.addEventListener('DOMContentLoaded', function () {
    const backButton = document.querySelector('#backButton');
    const toggleButton = document.querySelector('#toggleButton');
    const restartButton = document.querySelector('#runButton');
    const controls = document.querySelector('.controls');

    // Ensure the backButton exists before adding an event listener
    if (backButton) {
        backButton.addEventListener('click', function () {
            window.location.href = 'index.html'; // Navigate back to the main page
        });
    }

    // Ensure the toggleButton exists before adding an event listener
    if (toggleButton) {
        toggleButton.addEventListener('click', function () {
            controls.classList.toggle('expanded');
            this.textContent = controls.classList.contains('expanded') ? 'Collapse' : 'Expand';
        });
    }

    // Ensure the restartButton exists before adding an event listener
    if (restartButton) {
        restartButton.addEventListener('click', function () {
            resetCanvas(); // Call the resetCanvas function to reinitialize the canvas
        });
    }
});