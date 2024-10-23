"use strict";

let animationFrameId;

document.addEventListener('DOMContentLoaded', function () {
    const backButton = document.querySelector('#backButton');
    const toggleButton = document.querySelector('#toggleButton');
    const controls = document.querySelector('.controls');
    const resetButton = document.querySelector('#reset');
    const startButton = document.querySelector('#start');

    if (startButton) {
        startButton.addEventListener('click', function () {
            // Start rendering
            then = performance.now() * 0.001;
            animationFrameId = requestAnimationFrame(window.render);
        });
    }

    if (resetButton) {
        resetButton.addEventListener('click', function () {
            // Cancel any ongoing animation frames
            cancelAnimationFrame(animationFrameId);

            // Reset particles and boundary
            window.initSPH();
            updateKernelRadiusRange();
            updateParticleCount();

            // Reset camera
            zoom = -4000;
            rotation = 0;
        });
    }

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


    const kernelRadiusSlider = document.querySelector('#kernel_radius');
    const particleSizeSlider = document.querySelector('#particle_size');
    const kernelRadiusValue = document.querySelector('#kernel_radius_value');
    const particleSizeValue = document.querySelector('#particle_size_value');
    const particleCount = document.querySelector('#particle_count');

    function updateKernelRadiusRange() {
        if (kernelRadiusSlider) {
            kernelRadiusSlider.min = Math.ceil(1.5 * window.SPH_config.particle_distance).toString();
            kernelRadiusSlider.max = (5 * window.SPH_config.particle_distance).toString();
            kernelRadiusSlider.value = window.SPH_config.kernel_radius.toString();
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
            window.SPH_config.kernel_radius = parseFloat(this.value);
            kernelRadiusValue.textContent = this.value;
        });
    }

    if (particleSizeSlider) {
        particleSizeSlider.addEventListener('input', function () {
            window.SPH_config.particle_distance = parseFloat(this.value);
            particleSizeValue.textContent = this.value;
            updateKernelRadiusRange();
            updateParticleCount();
        });
    }
});