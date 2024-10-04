"use strict";

class Particle {
    constructor(x, y, z, radius) {
        this.position = { x, y, z };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.density = 0;
        this.pressure = 0;
    }
}

let grid = new Map();

function getGridCell(pos) {
    return [
        Math.floor(pos.x / window.grid_size),
        Math.floor(pos.y / window.grid_size),
        Math.floor(pos.z / window.grid_size)
    ];
}

function addToGrid(particle) {
    const cell = getGridCell(particle.position);
    const key = `${cell[0]},${cell[1]},${cell[2]}`;
    if (!grid.has(key)) {
        grid.set(key, []);
    }
    grid.get(key).push(particle);
}

function findNeighbors(particle) {
    const neighbors = [];
    const cell = getGridCell(particle.position);
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            for (let k = -1; k <= 1; k++) {
                const key = `${cell[0] + i},${cell[1] + j},${cell[2] + k}`;
                if (grid.has(key)) {
                    neighbors.push(...grid.get(key));
                }
            }
        }
    }
    return neighbors;
}

function initSPH() {
    const width = window.container_size / 2;
    const height = window.container_size / 4;
    const length = window.container_size;
    const startX = (window.container_size - width) / 2;
    const startY = window.container_size - height;
    const startZ = (window.container_size - length) / 2;

    window.particles = []; // Clear existing particles
    grid = new Map(); // Clear the grid

    for (let x = startX; x < startX + width; x += window.radius * 2) {
        for (let y = startY; y < startY + height; y += window.radius * 2) {
            for (let z = startZ; z < startZ + length; z += window.radius * 2) {
                const particle = new Particle(x, y, z, window.radius);
                particle.position.x = x - window.container_size / 2;
                particle.position.y = y - window.container_size / 2;
                particle.position.z = z - window.container_size / 2;
                window.particles.push(particle);
                addToGrid(particle);
            }
        }
    }
}


/**
 * Function to update the SPH (Smoothed Particle Hydrodynamics) simulation.
 * This is a framework and does not perform any actual updates.
 * 
 * @param {number} deltaTime - Time step for the update.
 */
function updateSPH(deltaTime) {
    // Step 1: Compute densities and pressures
    computeDensitiesAndPressures(particles);

    // Step 2: Compute forces
    computeForces(particles);

    // Step 3: Integrate
    integrate(particles, deltaTime);

}

/**
 * Compute densities and pressures for each particle.
 * 
 * @param {Array} particles - Array of particle objects.
 */
function computeDensitiesAndPressures(particles) {
    // Placeholder for density and pressure computation
    particles.forEach(particle => {
        // Compute density and pressure for each particle
    });
}

/**
 * Compute forces for each particle.
 * 
 * @param {Array} particles - Array of particle objects.
 */
function computeForces(particles) {
    // Placeholder for force computation
    particles.forEach(particle => {
        // Compute forces for each particle
    });
}

/**
 * Integrate the particles' positions and velocities.
 * 
 * @param {Array} particles - Array of particle objects.
 * @param {number} deltaTime - Time step for the update.
 */
function integrate(particles, deltaTime) {
    // Placeholder for integration step
    particles.forEach(particle => {
        // Update position and velocity for each particle
    });
}