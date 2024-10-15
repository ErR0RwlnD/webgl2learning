"use strict";

window.kernel_radius = 40;
window.particle_distance = 20;

document.addEventListener('DOMContentLoaded', function () {
    const backButton = document.querySelector('#backButton');
    const toggleButton = document.querySelector('#toggleButton');
    const restartButton = document.querySelector('#runButton');
    const controls = document.querySelector('.controls');
    const resetButton = document.querySelector('#reset');

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
            //pass
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', function () {
            // Reset particles
            window.particles = [];
            window.initSPH();
            updateKernelRadiusRange();
            updateParticleCount();

            // Reset camera
            zoom = -4000;
            rotation = 0;

            // Cancel any ongoing animation frames
            if (window.animationFrameId) {
            cancelAnimationFrame(window.animationFrameId);
            }

            // Redraw the scene
            window.animationFrameId = requestAnimationFrame(render);
        });
    }

    const kernelRadiusSlider = document.querySelector('#kernel_radius');
    const particleSizeSlider = document.querySelector('#particle_size');
    const kernelRadiusValue = document.querySelector('#kernel_radius_value');
    const particleSizeValue = document.querySelector('#particle_size_value');
    const particleCount = document.querySelector('#particle_count');

    function updateKernelRadiusRange() {
        if (kernelRadiusSlider) {
            kernelRadiusSlider.min = Math.ceil(1.5 * window.particle_distance).toString();
            kernelRadiusSlider.max = (10 * window.particle_distance).toString();
            kernelRadiusSlider.value = window.kernel_radius.toString();
            kernelRadiusValue.textContent = kernelRadiusSlider.value;
        }
    }

    function updateParticleCount() {
        if (particleCount) {
            particleCount.textContent = `Current Particles: ${window.particles.length}`;
        }
    }

    if (kernelRadiusSlider) {
        kernelRadiusSlider.addEventListener('input', function () {
            window.kernel_radius = parseFloat(this.value);
            kernelRadiusValue.textContent = this.value;
        });
    }

    if (particleSizeSlider) {
        particleSizeSlider.addEventListener('input', function () {
            window.particle_distance = parseFloat(this.value);
            particleSizeValue.textContent = this.value;
            updateKernelRadiusRange();
            updateParticleCount();
        });
    }
});