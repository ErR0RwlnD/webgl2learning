"use strict";

const vec3 = glMatrix.vec3;
const G = vec3.fromValues(0, -10, 0);
const PI = Math.PI;
const boundary_distance = 20;

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
     * @returns {Array<BaseEntity>} - The list of neighboring entities.
     */
    findNeighbors(entity) {
        const neighbors = [];
        const [x, y, z] = this.getGridCell(entity.position).split(',').map(Number);

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                for (let k = -1; k <= 1; k++) {
                    const key = `${x + i},${y + j},${z + k}`;
                    if (this.cells.has(key)) {
                        for (const neighbor of this.cells.get(key)) {
                            if (vec3.distance(entity.position, neighbor.position) <= window.SPH_config.kernel_radius) {
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
     * @returns {Array<Particle>} - The list of neighboring particles.
     */
    findParticleNeighbors(particle) {
        const neighbors = [];
        const [x, y, z] = this.getGridCell(particle.position).split(',').map(Number);

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                for (let k = -1; k <= 1; k++) {
                    const key = `${x + i},${y + j},${z + k}`;
                    if (this.cells.has(key)) {
                        for (const neighbor of this.cells.get(key)) {
                            if (neighbor instanceof Particle && vec3.distance(particle.position, neighbor.position) <= window.SPH_config.kernel_radius) {
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
     * @returns {Array<Boundary>} - The list of neighboring boundaries.
     */
    findBoundaryNeighbors(boundary) {
        const neighbors = [];
        const [x, y, z] = this.getGridCell(boundary.position).split(',').map(Number);

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                for (let k = -1; i <= 1; k++) {
                    const key = `${x + i},${y + j},${z + k}`;
                    if (this.cells.has(key)) {
                        for (const neighbor of this.cells.get(key)) {
                            if (neighbor instanceof Boundary && vec3.distance(boundary.position, neighbor.position) <= window.SPH_config.kernel_radius) {
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
     * Clear the grid by removing all entities.
     */
    clearGrid() {
        this.cells.clear();
    }
}

/**
 * Precompute boundary point masses and store them in a map.
 */
function initBoundaryMasses() {
    const h = window.SPH_config.kernel_radius;
    const N = Math.ceil(h / boundary_distance);
    const center = vec3.fromValues(0, 0, 0);

    let gamma1 = 0;
    let kernelSum = 0;
    let baseMass = 0;

    for (let i = -N; i <= N; i++) {
        for (let j = -N; j <= N; j++) {
            for (let k = -N; k <= N; k++) {
                const neighbor = vec3.fromValues(
                    i * boundary_distance,
                    j * boundary_distance,
                    k * boundary_distance
                );
                const kernelValue = cubicSplineKernel(center, neighbor, h);
                gamma1 += kernelValue;
                kernelSum += kernelValue;
            }
        }
    }

    gamma1 *= Math.pow(boundary_distance, 3);
    baseMass = rho0 * gamma1 / kernelSum;

    const halfSize = window.SPH_config.container_size / 2;
    const boundaryParticles = [];

    const workerCode = `
        onmessage = function(e) {
            const { halfSize, boundary_distance, baseMass } = e.data;
            const particles = [];
            for (let x = -halfSize; x <= halfSize; x += boundary_distance) {
                for (let y = -halfSize; y <= halfSize; y += boundary_distance) {
                    for (let z = -halfSize; z <= halfSize; z += boundary_distance) {
                        if (x === -halfSize || x === halfSize ||
                            y === -halfSize || y === halfSize ||
                            z === -halfSize || z === halfSize) {

                            particles.push({ x, y, z, mass: baseMass });
                        }
                    }
                }
            }
            postMessage(particles);
        }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = function(e) {
        for (const { x, y, z, mass } of e.data) {
            const boundaryParticle = new Boundary(x, y, z, mass);
            boundaryParticles.push(boundaryParticle);
        }
        window.boundary = boundaryParticles;
    };

    worker.postMessage({ halfSize, boundary_distance, baseMass });
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

const grid = new Grid(window.SPH_config.kernel_radius);
let new_particles = [];

// when initialization, mass carried by each particle divided by the density is ONE.
function initMass() {
    const h = window.SPH_config.kernel_radius;
    let totalMass = 0;
    const center = vec3.fromValues(0, 0, 0);

    const N = Math.ceil(h / window.SPH_config.particle_distance);
    for (let x = -N; x <= N; x++) {
        for (let y = -N; y <= N; y++) {
            for (let z = -N; z <= N; z++) {
                const neighbor = vec3.fromValues(x * window.SPH_config.particle_distance, y * window.SPH_config.particle_distance, z * window.SPH_config.particle_distance);
                const kernelValue = cubicSplineKernel(center, neighbor, h);

                totalMass += kernelValue;
            }
        }
    }

    Particle.mass = rho0 / totalMass;
}

function initSPH() {
    window.particles = [];
    window.boundary = [];
    initMass();
    initBoundaryMasses();
    alert("SPH mass initialized, you can expand the control panel now.");
    

    const width = window.SPH_config.container_size / 2;
    const height = window.SPH_config.container_size / 4;
    const length = window.SPH_config.container_size / 1.5;
    const startX = (window.SPH_config.container_size - width) / 2;
    const startY = window.SPH_config.container_size - height - window.SPH_config.kernel_radius;
    const startZ = (window.SPH_config.container_size - length) / 2;

    for (let x = startX; x < startX + width; x += window.SPH_config.particle_distance) {
        for (let y = startY; y < startY + height; y += window.SPH_config.particle_distance) {
            for (let z = startZ; z < startZ + length; z += window.SPH_config.particle_distance) {
                const particle = new Particle(x, y, z, window.SPH_config.particle_distance);
                vec3.set(particle.position, x - window.SPH_config.container_size / 2 + getRandomOffset(),
                    y - window.SPH_config.container_size / 2 + getRandomOffset(),
                    z - window.SPH_config.container_size / 2 + getRandomOffset());
                window.particles.push(particle);
            }
        }
    }
}

function getRandomOffset() {
    return Math.random() * 1e-3 - 5 * 1e-4;
}

function updateSPH(deltaTime) {
    grid.clearGrid();
    for (const particle of window.particles) {
        grid.addToGrid(particle);
    }
    for (const boundaryParticle of window.boundary) {
        grid.addToGrid(boundaryParticle);
    }

    computeDensities();

    if (window.SPH_config.viscosity === "MONAGHAN") {
        computeViscosityForcesMONAGHAN();
    } else if (window.SPH_config.viscosity === "XSPH") {
        computeViscosityForcesXSPH(deltaTime);
    }

    computePressure();

    integrate(deltaTime);
}

function computeDensities() {
    for (const particle of window.particles) {
        particle.density = 0;
        const neighbors = grid.findNeighbors(particle);
        for (const neighbor of neighbors) {
            const kernelValue = cubicSplineKernel(particle.position, neighbor.position, window.SPH_config.kernel_radius);
            particle.density += Particle.mass * kernelValue;
        }
    }
}

function computePressure() {
    if (window.SPH_config.pressure_solver === "EOS") {
        for (const particle of window.particles) {
            particle.pressure = window.SPH_config.pressure_stiffness * (Math.pow(particle.density / rho0, 7) - 1);
        }
    } else if (window.SPH_config.pressure_solver === "IISPH") {
        // TODO
    }
}

function computeViscosityForcesMONAGHAN() {
    for (const particle of window.particles) {
        const neighbors = grid.findParticleNeighbors(particle);
        const viscosityForce = vec3.create();

        for (const neighbor of neighbors) {
            if (neighbor !== particle) {
                const r = vec3.distance(particle.position, neighbor.position);
                const q = r / window.SPH_config.kernel_radius;

                if (q < 1) {
                    const u = vec3.create();
                    vec3.subtract(u, neighbor.velocity, particle.velocity);
                    const kernelGradient = cubicSplineKernelGradient(particle.position, neighbor.position, window.SPH_config.kernel_radius);

                    const factor = window.SPH_config.MonaghanViscosity * (1 - q) * (Particle.mass / neighbor.density);
                    vec3.scaleAndAdd(viscosityForce, viscosityForce, kernelGradient, factor);
                }
            }
        }

        vec3.scale(viscosityForce, viscosityForce, Particle.mass);
        vec3.add(particle.viscosityForce, particle.viscosityForce, viscosityForce);
    }
}

function computeViscosityForcesXSPH(deltaTime) {
    for (const particle of window.particles) {
        vec3.scaleAndAdd(particle.velocity, particle.velocity, G, deltaTime);

        const neighbors = grid.findParticleNeighbors(particle);

        for (const neighbor of neighbors) {
            if (neighbor !== particle) {
                const r = vec3.distance(particle.position, neighbor.position);
                const q = r / window.SPH_config.kernel_radius;

                if (q < 1) {
                    const u = vec3.create();
                    vec3.subtract(u, neighbor.velocity, particle.velocity);
                    const kernelValue = cubicSplineKernel(particle.position, neighbor.position, window.SPH_config.kernel_radius);

                    const factor = window.SPH_config.XSPHViscosity * (Particle.mass / neighbor.density) * kernelValue;
                    vec3.scaleAndAdd(particle.velocity, particle.velocity, u, factor);
                }
            }
        }
    }
}

function integrate(deltaTime) {
    const updatedParticles = [];

    for (const particle of window.particles) {
        const pressureForce = vec3.create();
        const particleNeighbors = grid.findParticleNeighbors(particle);

        for (const neighbor of particleNeighbors) {
            if (neighbor !== particle) {
                const kernelGradient = cubicSplineKernelGradient(particle.position, neighbor.position, window.SPH_config.kernel_radius);
                const pressureTerm = (particle.pressure / Math.pow(particle.density, 2)) + (neighbor.pressure / Math.pow(neighbor.density, 2));
                const factor = Particle.mass * pressureTerm;
                vec3.scaleAndAdd(pressureForce, pressureForce, kernelGradient, factor);
            }
        }

        vec3.scale(pressureForce, pressureForce, -1 / particle.density);
        const newVelocity = vec3.create();
        vec3.scaleAndAdd(newVelocity, particle.velocity, pressureForce, deltaTime / Particle.mass);

        const newPosition = vec3.create();
        vec3.scaleAndAdd(newPosition, particle.position, newVelocity, deltaTime);

        const updatedParticle = new Particle(newPosition[0], newPosition[1], newPosition[2], window.SPH_config.particle_distance);
        vec3.copy(updatedParticle.velocity, newVelocity);
        updatedParticle.density = particle.density;
        updatedParticle.pressure = particle.pressure;
        updatedParticles.push(updatedParticle);
    }

    window.particles = updatedParticles;
}   
