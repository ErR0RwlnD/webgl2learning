"use strict";

window.pressure_solver = "EOS";
window.pressure_stiffness = 1000;
window.viscosity = "XSPH";
window.MonaghanViscosity = 0.01;
window.XSPHViscosity = 0.2;

const vec3 = glMatrix.vec3;
const G = vec3.fromValues(0, -100, 0);
const PI = Math.PI;
const boundary_distance = 10;

const rho0 = 1000;

let boundary = [];

class BaseEntity {
    constructor(x, y, z) {
        this.position = vec3.fromValues(x, y, z);
    }
}

class Particle extends BaseEntity {
    static mass = 1;

    constructor(x, y, z, radius) {
        super(x, y, z);
        this.velocity = vec3.create();
        this.density = 1;
        this.pressure = 1;
        this.viscosityForce = vec3.create();
    }
}

class Boundary extends BaseEntity {
    constructor(x, y, z, mass) {
        super(x, y, z);
        this.mass = mass;
    }
}

class Grid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    /**
     * Get the key for the grid cell based on the position.
     * @param {vec3} position - The position of the entity.
     * @returns {string} - The key for the grid cell.
     */
    getGridCell(position) {
        const x = Math.floor(position[0] / this.cellSize);
        const y = Math.floor(position[1] / this.cellSize);
        const z = Math.floor(position[2] / this.cellSize);
        return `${x},${y},${z}`;
    }

    /**
     * Add an entity to the grid.
     * @param {BaseEntity} entity - The entity to add.
     */
    addToGrid(entity) {
        const key = this.getGridCell(entity.position);
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        this.cells.get(key).push(entity);
    }

    /**
     * Remove an entity from the grid.
     * @param {BaseEntity} entity - The entity to remove.
     */
    removeFromGrid(entity) {
        const key = this.getGridCell(entity.position);
        if (this.cells.has(key)) {
            const cell = this.cells.get(key);
            const index = cell.indexOf(entity);
            if (index > -1) {
                cell.splice(index, 1);
                if (cell.length === 0) {
                    this.cells.delete(key);
                }
            }
        }
    }

    /**
     * Update the position of an entity in the grid.
     * @param {BaseEntity} entity - The entity to update.
     * @param {vec3} newPosition - The new position of the entity.
     */
    updateEntityPosition(entity, newPosition) {
        this.removeFromGrid(entity);
        vec3.copy(entity.position, newPosition);
        this.addToGrid(entity);
    }

    /**
     * Find neighbors of an entity within a certain radius.
     * @param {BaseEntity} entity - The entity to find neighbors for.
     * @param {number} radius - The search radius.
     * @returns {Array<BaseEntity>} - The list of neighboring entities.
     */
    findNeighbors(entity, radius) {
        const neighbors = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        const [x, y, z] = this.getGridCell(entity.position).split(',').map(Number);

        for (let i = -cellRadius; i <= cellRadius; i++) {
            for (let j = -cellRadius; j <= cellRadius; j++) {
                for (let k = -cellRadius; k <= cellRadius; k++) {
                    const key = `${x + i},${y + j},${z + k}`;
                    if (this.cells.has(key)) {
                        for (const neighbor of this.cells.get(key)) {
                            if (vec3.distance(entity.position, neighbor.position) <= radius) {
                                neighbors.push(neighbor);
                            }
                        }
                    }
                }
            }
        }

        return neighbors;
    }

    /**
     * Find neighbors of a particle within a certain radius.
     * @param {Particle} particle - The particle to find neighbors for.
     * @param {number} radius - The search radius.
     * @returns {Array<Particle>} - The list of neighboring particles.
     */
    findParticleNeighbors(particle, radius) {
        const neighbors = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        const [x, y, z] = this.getGridCell(particle.position).split(',').map(Number);

        for (let i = -cellRadius; i <= cellRadius; i++) {
            for (let j = -cellRadius; j <= cellRadius; j++) {
                for (let k = -cellRadius; k <= cellRadius; k++) {
                    const key = `${x + i},${y + j},${z + k}`;
                    if (this.cells.has(key)) {
                        for (const neighbor of this.cells.get(key)) {
                            if (neighbor instanceof Particle && vec3.distance(particle.position, neighbor.position) <= radius) {
                                neighbors.push(neighbor);
                            }
                        }
                    }
                }
            }
        }

        return neighbors;
    }

    /**
     * Find neighbors of a boundary within a certain radius.
     * @param {Boundary} boundary - The boundary to find neighbors for.
     * @param {number} radius - The search radius.
     * @returns {Array<Boundary>} - The list of neighboring boundaries.
     */
    findBoundaryNeighbors(boundary, radius) {
        const neighbors = [];
        const cellRadius = Math.ceil(radius / this.cellSize);
        const [x, y, z] = this.getGridCell(boundary.position).split(',').map(Number);

        for (let i = -cellRadius; i <= cellRadius; i++) {
            for (let j = -cellRadius; j <= cellRadius; j++) {
                for (let k = -cellRadius; k <= cellRadius; k++) {
                    const key = `${x + i},${y + j},${z + k}`;
                    if (this.cells.has(key)) {
                        for (const neighbor of this.cells.get(key)) {
                            if (neighbor instanceof Boundary && vec3.distance(boundary.position, neighbor.position) <= radius) {
                                neighbors.push(neighbor);
                            }
                        }
                    }
                }
            }
        }

        return neighbors;
    }
}

/**
 * Precompute boundary point masses and store them in a map.
 */
function initBoundaryMasses() {
    const h = window.kernel_radius;
    const N = Math.ceil(h / window.particle_distance);
    const center = vec3.fromValues(0, 0, 0);

    for (let x = -window.container_size / 2; x <= window.container_size / 2; x += window.particle_distance) {
        for (let y = -window.container_size / 2; y <= window.container_size / 2; y += window.particle_distance) {
            for (let z = -window.container_size / 2; z <= window.container_size / 2; z += window.particle_distance) {
                if (x === -window.container_size / 2 || x === window.container_size / 2 ||
                    y === -window.container_size / 2 || y === window.container_size / 2 ||
                    z === -window.container_size / 2 || z === window.container_size / 2) {

                    const boundaryParticle = new Boundary(x, y, z, 1);

                    let gamma1 = 0;
                    let kernelSum = 0;

                    for (let i = -N; i <= N; i++) {
                        for (let j = -N; j <= N; j++) {
                            for (let k = -N; k <= N; k++) {
                                const neighbor = vec3.fromValues(
                                    x + i * window.particle_distance,
                                    y + j * window.particle_distance,
                                    z + k * window.particle_distance
                                );
                                const kernelValue = cubicSplineKernel(center, neighbor, h);
                                gamma1 += kernelValue;
                                kernelSum += kernelValue;
                            }
                        }
                    }

                    gamma1 *= Math.pow(window.particle_distance, 3);
                    boundaryParticle.mass = rho0 * gamma1 / kernelSum;
                    boundary.push(boundaryParticle);
                }
            }
        }
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

let grid = new Grid(window.kernel_radius);


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
    initBoundaryMasses();

    const width = window.container_size / 2;
    const height = window.container_size / 4;
    const length = window.container_size;
    const startX = (window.container_size - width) / 2;
    const startY = window.container_size - height;
    const startZ = (window.container_size - length) / 2;

    window.particles = []; // Clear existing particles
    grid = new Grid(window.kernel_radius); // Clear the grid

    for (let x = startX; x < startX + width; x += window.particle_distance * 2) {
        for (let y = startY - window.kernel_radius; y < startY + height - window.kernel_radius; y += window.particle_distance * 2) {
            for (let z = startZ; z < startZ + length; z += window.particle_distance * 2) {
                const particle = new Particle(x, y, z, window.particle_distance);
                vec3.set(particle.position, x - window.container_size / 2 + getRandomOffset(),
                    y - window.container_size / 2 + getRandomOffset(),
                    z - window.container_size / 2 + getRandomOffset());
                window.particles.push(particle);
            }
        }
    }

    for (const particle of window.particles) {
        grid.addToGrid(particle);
    }

    for (const boundaryParticle of boundary) {
        grid.addToGrid(boundaryParticle);
    }
}

function getRandomOffset() {
    return Math.random() * 1e-6 - 5 * 1e-7;
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
        const neighbors = grid.findNeighbors(particle, window.kernel_radius);
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
    if (window.pressure_solver === "EOS") {
        for (const particle of window.particles) {
            particle.pressure = window.pressure_stiffness * (Math.pow(particle.density / rho0, 7) - 1);
        }
    } else if (window.pressure_solver === "IISPH") {
        // TODO
    }
}

/**
 * Compute viscosity forces using Monaghan's formulation.
 */
function computeViscosityForcesMONAGHAN() {
    for (const particle of window.particles) {
        const neighbors = grid.findNeighbors(particle, kernel_radius);
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

        const neighbors = grid.findNeighbors(particle, window.kernel_radius);

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
        const neighbors = grid.findNeighbors(particle, window.kernel_radius);

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
