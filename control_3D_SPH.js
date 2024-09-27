"use strict";

document.addEventListener('DOMContentLoaded', function () {
    const runButton = document.querySelector('#runButton');
    const toggleButton = document.querySelector('#toggleButton');
    const backButton = document.querySelector('#backButton');
    const controls = document.querySelector('.controls');

    if (runButton) {
        runButton.addEventListener('click', function () {
            alert('3D SPH Simulation Started');
        });
    }

    if (toggleButton) {
        toggleButton.addEventListener('click', function () {
            controls.classList.toggle('expanded');
            this.textContent = controls.classList.contains('expanded') ? 'Collapse' : 'Expand';
        });
    }

    if (backButton) {
        backButton.addEventListener('click', function () {
            window.location.href = 'index.html'; // Navigate back to the main page
        });
    }

    function resizeCanvas() {
        const canvas = document.getElementById('c');
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Initial resize
});