"use strict";

const PI = Math.PI;

let grid = new Map();


class Particle {
    constructor(x, y, z, radius) {
        this.position = { x, y, z };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.density = 0;
        this.pressure = 0;
    }
}

function getGridCell(pos) {
    return [
        Math.floor(pos.x / window.radius),
        Math.floor(pos.y / window.radius),
        Math.floor(pos.z / window.radius)
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

    for (let x = startX; x < startX + width; x += window.particle_distance * 2) {
        for (let y = startY; y < startY + height; y += window.particle_distance * 2) {
            for (let z = startZ; z < startZ + length; z += window.particle_distance * 2) {
                const particle = new Particle(x, y, z, window.particle_distance);
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
 * Cubic spline kernel function.
 * 
 * @param {number} r - Distance between particles.
 * @param {number} h - Smoothing length.
 * @returns {number} - Kernel value.
 */
function cubicSplineKernel(r, h) {
    const q = r / h;
    const alpha = 8 / (PI * Math.pow(h, 3));

    if (q >= 0 && q <= 0.5) {
        return alpha * 6 * (Math.pow(q, 3) - Math.pow(q, 2) + 1);
    } else {
        return alpha * 2 * Math.pow(1 - q, 3);
    }
}



/**
 * Function to update the SPH (Smoothed Particle Hydrodynamics) simulation.
 * This is a framework and does not perform any actual updates.
 * 
 * @param {number} deltaTime - Time step for the update.
 */
function updateSPH(deltaTime) {
    // Step 1: Compute densities
    computeDensities();

    // Step 2: Compute pressures
    computePressure();

    // Step 3: Compute forces
    computeForces();

    // Step 4: Integrate
    integrate(deltaTime);

}

/**
 * Compute densities for each particle.
 * 
 */
function computeDensities() {

}


/**
 * Compute pressure for each particle.
 * 
 */
function computePressure() {


}



/**
 * Compute forces for each particle.
 * 
 */
function computeForces() {

}

/**
 * Integrate the particles' positions and velocities.
 * 
 * @param {number} deltaTime - Time step for the update.
 */
function integrate(deltaTime) {

}