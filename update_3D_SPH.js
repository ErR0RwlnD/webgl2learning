"use strict";

window.pressure_solver = "EOS";
window.pressure_stiffness = 1000;
window.viscosity = "XSPH";
window.MonaghanViscosity = 0.01;
window.XSPHViscosity = 0.2;

const vec3 = glMatrix.vec3;
const G = vec3.fromValues(0, -9.81, 0);
const PI = Math.PI;

const rho0 = 1000;

let grid = new Map();

class Particle {
    static mass = 1;

    constructor(x, y, z, radius) {
        this.position = vec3.fromValues(x, y, z);
        this.velocity = vec3.create();
        this.density = 1;
        this.pressure = 1;
        this.viscosityForce = vec3.create();
    }
}


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

function getGridCell(pos) {
    return [
        Math.floor(pos[0] / window.kernel_radius),
        Math.floor(pos[1] / window.kernel_radius),
        Math.floor(pos[2] / window.kernel_radius)
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

    const N = Math.ceil(h / window.particle_distance);
    for (let x = -N; x <= N; x++) {
        for (let y = -N; y <= N; y++) {
            for (let z = -N; z <= N; z++) {
                const neighbor = vec3.fromValues(x * window.particle_distance, y * window.particle_distance, z * window.particle_distance);
                const kernelValue = cubicSplineKernel(center, neighbor, h);

                totalMass += kernelValue;
            }
        }
    }

    Particle.mass = rho0 / totalMass;
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
    grid = new Map();

    for (const particle of window.particles) {
        addToGrid(particle);
    }

    // Step 1: Compute densities
    computeDensities();

    // Step 2: Compute viscosity forces
    if (window.viscosity === "MONAGHAN") {
        computeViscosityForcesMONAGHAN();
    } else if (window.viscosity === "XSPH") {
        computeViscosityForcesXSPH(deltaTime);
    }

    // Step 3: Compute pressure
    computePressure();

    // Step 4: Integrate
    integrate(deltaTime);


}



/**
 * Compute densities for each particle.
 * 
 */
function computeDensities() {
    for (const particle of window.particles) {
        particle.density = 0;
        const neighbors = findNeighbors(particle);
        for (const neighbor of neighbors) {
            const kernelValue = cubicSplineKernel(particle.position, neighbor.position, window.kernel_radius);
            particle.density += Particle.mass * kernelValue;
        }
    }
}


/**
 * Compute pressure for each particle.
 * 
 */
function computePressure() {
    if(window.pressure_solver === "EOS") {
        for (const particle of window.particles) {
            particle.pressure = window.pressure_stiffness * (Math.pow(particle.density / rho0, 7) - 1);
        }
    }else if(window.pressure_solver === "IISPH") {
        // TODO
    }
}

/**
 * Compute viscosity forces using Monaghan's formulation.
 */
function computeViscosityForcesMONAGHAN() {
    for (const particle of window.particles) {
        const neighbors = findNeighbors(particle);
        const viscosityForce = vec3.create();

        for (const neighbor of neighbors) {
            if (neighbor !== particle) {
                const r = vec3.distance(particle.position, neighbor.position);
                const q = r / window.kernel_radius;

                if (q < 1) {
                    const u = vec3.create();
                    vec3.subtract(u, neighbor.velocity, particle.velocity);
                    const kernelGradient = cubicSplineKernelGradient(particle.position, neighbor.position, window.kernel_radius);

                    const factor = window.MonaghanViscosity * (1 - q) * (Particle.mass / neighbor.density);
                    vec3.scaleAndAdd(viscosityForce, viscosityForce, kernelGradient, factor);
                }
            }
        }

        vec3.scale(viscosityForce, viscosityForce, Particle.mass);
        vec3.add(particle.viscosityForce, particle.viscosityForce, viscosityForce);
    }
}

/**
 * Compute viscosity forces using XSPH formulation.
 */
function computeViscosityForcesXSPH(deltaTime) {
    for (const particle of window.particles) {
        vec3.scaleAndAdd(particle.velocity, particle.velocity, G, deltaTime);

        const neighbors = findNeighbors(particle);

        for (const neighbor of neighbors) {
            if (neighbor !== particle) {
                const r = vec3.distance(particle.position, neighbor.position);
                const q = r / window.kernel_radius;

                if (q < 1) {
                    const u = vec3.create();
                    vec3.subtract(u, neighbor.velocity, particle.velocity);
                    const kernelValue = cubicSplineKernel(particle.position, neighbor.position, window.kernel_radius);

                    const factor = window.XSPHViscosity * (Particle.mass / neighbor.density) * kernelValue;
                    vec3.scaleAndAdd(particle.velocity, particle.velocity, u, factor);
                }
            }
        }
    }
}


/**
 * Integrate the SPH simulation.
 * 
 * @param {number} deltaTime - Time step for the integration.
 */
function integrate(deltaTime) {
    for (const particle of window.particles) {
        const pressureForce = vec3.create();
        const neighbors = findNeighbors(particle);

        for (const neighbor of neighbors) {
            if (neighbor !== particle) {
                const kernelGradient = cubicSplineKernelGradient(particle.position, neighbor.position, window.kernel_radius);
                const pressureTerm = (particle.pressure / Math.pow(particle.density, 2)) + (neighbor.pressure / Math.pow(neighbor.density, 2));
                const factor = Particle.mass * pressureTerm;
                vec3.scaleAndAdd(pressureForce, pressureForce, kernelGradient, factor);
            }
        }

        vec3.scale(pressureForce, pressureForce, -1 / particle.density);
        vec3.scaleAndAdd(particle.velocity, particle.velocity, pressureForce, deltaTime / Particle.mass);
        vec3.scaleAndAdd(particle.position, particle.position, particle.velocity, deltaTime);
    }
}   
