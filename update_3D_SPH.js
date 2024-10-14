"use strict";

window.pressure_solver = "EOS";
window.pressure_stiffness = 1000;
window.viscosity = "XSPH";

const G = 10;
const PI = Math.PI;
const vec3 = glMatrix.vec3;
const rho0 = 1000;

let grid = new Map();

/**
 * Compute the cubic spline kernel value with grids.
 * 
 * @param {vec3} center - The position of the center particle.
 * @param {vec3} neighbor - The position of the neighbor particle.
 * @param {number} h - The smoothing length/kernel radius.
 * @returns {number} - The kernel value.
 */
function cubicSplineKernel(center, neighbor, h) {
    const r = vec3.distance(center, neighbor);
    const q = r / h;
    const alpha = 8 / (Math.PI * Math.pow(h, 3));

    if (q <= 1) {
        return alpha * (1 - 1.5 * Math.pow(q, 2) + 0.75 * Math.pow(q, 3));
    } else {
        return alpha * 0.25 * Math.pow(2 - q, 3);
    }
    return 0;
}

/**
 * Compute the gradient of the cubic spline kernel with grids.
 * 
 * @param {vec3} center - The position of the center particle.
 * @param {vec3} neighbor - The position of the neighbor particle.
 * @param {number} h - The smoothing length/kernel radius.
 * @returns {vec3} - The gradient of the kernel.
 */
function cubicSplineKernelGradient(center, neighbor, h) {
    const r = vec3.distance(center, neighbor);
    const q = r / h;
    const alpha = 8 / (Math.PI * Math.pow(h, 3));
    const gradient = vec3.create();

    if (q <= 1) {
        const factor = alpha * (-3 * q + 2.25 * Math.pow(q, 2)) / h;
        vec3.subtract(gradient, neighbor, center);
        vec3.scale(gradient, gradient, factor / r);
    } else {
        const factor = -alpha * 0.75 * Math.pow(2 - q, 2) / h;
        vec3.subtract(gradient, neighbor, center);
        vec3.scale(gradient, gradient, factor / r);
    }

    return gradient;
}

class Particle {
    static mass = 1;

    constructor(x, y, z, radius) {
        this.position = vec3.fromValues(x, y, z);
        this.velocity = vec3.create();
        this.density = 1;
        this.pressure = 1;
        this.isBoundary = false;
    }
}

function getGridCell(pos) {
    return [
        Math.floor(pos[0] / window.radius),
        Math.floor(pos[1] / window.radius),
        Math.floor(pos[2] / window.radius)
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

function initMass() {
    const h = window.kernel_radius;
    let totalMass = 0;
    const center = vec3.fromValues(0, 0, 0);

    for (let x = -h; x <= h; x += window.particle_distance) {
        for (let y = -h; y <= h; y += window.particle_distance) {
            for (let z = -h; z <= h; z += window.particle_distance) {
                const neighbor = vec3.fromValues(x, y, z);
                const kernelValue = cubicSplineKernel(center, neighbor, h);

                totalMass += kernelValue;
            }
        }
    }

    Particle.mass = rho / totalMass;
}



// when initialization, mass carried by each particle divided by the density is ONE.
function initSPH() {
    initMass();

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
                vec3.set(particle.position, x - window.container_size / 2, y - window.container_size / 2, z - window.container_size / 2);
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
    window.particles.forEach(particle => {
        if (!particle.isBoundary) {
            particle.density = 0;
            const neighbors = findNeighbors(particle);
            neighbors.forEach(neighbor => {
                const kernelValue = cubicSplineKernel(particle.position, neighbor.position, window.radius);
                particle.density += neighbor.isBoundary ? 0 : neighbor.mass * kernelValue;
            });
        } else {
            particle.density = particle.mass;
        }
    });
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