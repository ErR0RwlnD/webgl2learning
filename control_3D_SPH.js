"use strict";

document.querySelector('#runButton').addEventListener('click', function () {
    alert('3D SPH Simulation Started');
});

document.querySelector('#toggleButton').addEventListener('click', function () {
    const controls = document.querySelector('.controls');
    controls.classList.toggle('expanded');
    this.textContent = controls.classList.contains('expanded') ? 'Collapse' : 'Expand';
});

function resizeCanvas() {
    const canvas = document.getElementById('c');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial resize