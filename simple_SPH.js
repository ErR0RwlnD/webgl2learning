"use strict";

const vec2 = glMatrix.vec2;

const G = vec2.fromValues(0, -10);
const REST_DENS = 300.0;  // rest density
const GAS_CONST = 2000.0; // const for equation of state
const H = 16.0;           // kernel radius
const GRID_SIZE = H;    // grid cell size
const HSQ = H * H;        // radius^2 for optimization
const MASS = 2.5;         // assume all particles have the same mass
const VISC = 200.0;       // viscosity constant
const DT = 0.0007;        // integration timestep

const POLY6 = 4.0 / (Math.PI * Math.pow(H, 8.0));
const SPIKY_GRAD = -10.0 / (Math.PI * Math.pow(H, 5.0));
const VISC_LAP = 40.0 / (Math.PI * Math.pow(H, 5.0));

const EPS = H; // boundary epsilon
const BOUND_DAMPING = -0.5;

const MAX_PARTICLES = 5000;

// Container parameters
const CONTAINER_WIDTH = 1000;
const CONTAINER_HEIGHT = 1200;

class Particle {
    constructor(x, y) {
        this.x = vec2.fromValues(x, y);
        this.v = vec2.fromValues(0, 0);
        this.f = vec2.fromValues(0, 0);
        this.rho = 0;
        this.p = 0;
    }
}

let grid = new Map();
let particles = [];
let gl;
let program;
let positionLocation;
let resolutionUniformLocation;
let colorUniformLocation;

// Define the container boundaries
const containerVertices = [
    0, 0,                          // Bottom-left corner
    CONTAINER_WIDTH, 0,            // Bottom-right corner
    CONTAINER_WIDTH, CONTAINER_HEIGHT,  // Top-right corner
    0, CONTAINER_HEIGHT            // Top-left corner
];

function initSPH(numParticles) {
    particles = []; // Clear existing particles
    grid = new Map(); // Clear the grid
    for (let y = EPS; y < CONTAINER_HEIGHT - EPS; y += H) {
        for (let x = EPS; x <= CONTAINER_WIDTH / 4 * 3; x += H) {
            if (particles.length < numParticles) {
                let particle = new Particle(x + Math.random() / 10e3, y + Math.random() / 10e3);
                particles.push(particle);
                addToGrid(particle);
            } else {
                return;
            }
        }
    }
}

function getGridCell(pos) {
    return [
        Math.floor(pos[0] / GRID_SIZE),
        Math.floor(pos[1] / GRID_SIZE)
    ];
}

function addToGrid(particle) {
    const cell = getGridCell(particle.x);
    const key = `${cell[0]},${cell[1]}`;
    if (!grid.has(key)) {
        grid.set(key, []);
    }
    grid.get(key).push(particle);
}

function findNeighbors(particle) {
    const neighbors = [];
    const cell = getGridCell(particle.x);
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const key = `${cell[0] + i},${cell[1] + j}`;
            if (grid.has(key)) {
                neighbors.push(...grid.get(key));
            }
        }
    }
    return neighbors;
}

function computeDensityPressure() {
    grid.clear();
    particles.forEach(addToGrid);

    particles.forEach(pi => {
        pi.rho = 0;
        const neighbors = findNeighbors(pi);
        neighbors.forEach(pj => {
            const rij = vec2.create();
            vec2.sub(rij, pj.x, pi.x);
            const r2 = vec2.squaredLength(rij);

            if (r2 < HSQ) {
                pi.rho += MASS * POLY6 * Math.pow(HSQ - r2, 3);
            }
        });
        pi.p = GAS_CONST * (pi.rho - REST_DENS);
    });
}

function computeForces() {
    particles.forEach(pi => {
        const fpress = vec2.create();
        const fvisc = vec2.create();
        const neighbors = findNeighbors(pi);

        neighbors.forEach(pj => {
            if (pi === pj) return;

            const rij = vec2.create();
            vec2.sub(rij, pj.x, pi.x);
            const r = vec2.length(rij);

            if (r < H) {
                const pressureTerm = MASS * (pi.p + pj.p) / (2 * pj.rho) * SPIKY_GRAD * Math.pow(H - r, 3);
                const normalizedRij = vec2.create();
                vec2.normalize(normalizedRij, rij);
                vec2.scaleAndAdd(fpress, fpress, normalizedRij, -pressureTerm);

                const velocityDiff = vec2.create();
                vec2.sub(velocityDiff, pj.v, pi.v);
                vec2.scaleAndAdd(fvisc, fvisc, velocityDiff, VISC * MASS / pj.rho * VISC_LAP * (H - r));
            }
        });

        const fgrav = vec2.create();
        vec2.scale(fgrav, G, MASS / pi.rho);
        vec2.add(pi.f, fpress, fvisc);
        vec2.add(pi.f, pi.f, fgrav);
    });
}

function integrate() {
    particles.forEach(p => {
        // Forward Euler integration
        vec2.scaleAndAdd(p.v, p.v, p.f, DT / p.rho); // p.v += DT * p.f / p.rho;
        vec2.scaleAndAdd(p.x, p.x, p.v, DT);         // p.x += DT * p.v;

        // Enforce boundary conditions
        if (p.x[0] - EPS < 0) {
            p.v[0] *= BOUND_DAMPING;
            p.x[0] = EPS;
        }
        if (p.x[0] + EPS > CONTAINER_WIDTH) {
            p.v[0] *= BOUND_DAMPING;
            p.x[0] = CONTAINER_WIDTH - EPS;
        }
        if (p.x[1] - EPS < 0) {
            p.v[1] *= BOUND_DAMPING;
            p.x[1] = EPS;
        }
        if (p.x[1] + EPS > CONTAINER_HEIGHT) {
            p.v[1] *= BOUND_DAMPING;
            p.x[1] = CONTAINER_HEIGHT - EPS;
        }

        // Update grid
        addToGrid(p);
    });
}

function update() {
    computeDensityPressure();
    computeForces();
    integrate();
}

function renderParticles() {
    let positions = [];
    particles.forEach(p => {
        positions.push(p.x[0], p.x[1]);
    });

    // Load particle positions into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);

    // Enable and set up the position attribute for particles
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set color to blue for the particles
    gl.uniform4f(colorUniformLocation, 0.0, 0.0, 0.8, 1.0);  // Blue

    // Draw the particles as points
    gl.drawArrays(gl.POINTS, 0, particles.length);
}

function renderContainer() {
    // Create a buffer for the container (rectangle)
    const containerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, containerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(containerVertices), gl.STATIC_DRAW);

    // Enable and set up the position attribute for the container
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Set color to black for the container
    gl.uniform4f(colorUniformLocation, 0.0, 0.0, 0.0, 1.0);  // Black

    // Draw the container as a line loop
    gl.drawArrays(gl.LINE_LOOP, 0, 4);  // Draw rectangle as line loop
}


function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    // Set canvas resolution
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

    // Draw container
    renderContainer();

    // Draw particles inside the container
    renderParticles();
}

function SPHLoop() {
    update();
    render();
    requestAnimationFrame(SPHLoop);
}

function resizeCanvasToDisplaySize(canvas) {
    // Get the real size of the canvas as displayed on the screen
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas size does not match its drawing buffer size
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        // Set the drawing buffer size to match the display size
        const dpr = window.devicePixelRatio || 1;
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;

        // Adjust the WebGL viewport size accordingly
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
}

function simpleSPH(numParticles) {
    // WebGL setup
    const canvas = document.getElementById("c");
    gl = canvas.getContext("webgl2");

    // Resize the canvas to match its display size
    resizeCanvasToDisplaySize(canvas);

    // Set background color
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // Initialize shaders
    const vertexShaderSource = `#version 300 es
    precision highp float;

    in vec2 a_position;  // Particle position passed from JavaScript
    uniform vec2 u_resolution;  // Canvas resolution for normalization

    void main() {
        // Convert particle position to clip space (-1 to 1)
        vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clipSpace, 0, 1);
        gl_PointSize = 2.0;  // Size of each particle point
    }`;

    const fragmentShaderSource = `#version 300 es
    precision highp float;

    uniform vec4 u_color;  // Color for rendering

    out vec4 outColor;

    void main() {
        outColor = u_color;  // Use uniform color
    }`;

    program = webglUtils.createProgramFromSources(gl, [vertexShaderSource, fragmentShaderSource]);
    gl.useProgram(program);

    // Get attribute/uniform locations
    positionLocation = gl.getAttribLocation(program, "a_position");
    resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
    colorUniformLocation = gl.getUniformLocation(program, "u_color");

    // Create buffer for particle positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Pass the canvas resolution to the shader (in device pixels)
    gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

    // Initialize particles and start loop
    initSPH(numParticles);
    requestAnimationFrame(SPHLoop);
}

var slider = document.querySelector("#slider_square_number");
var label = document.querySelector("#label_square_number");

// Update the label to show the current slider value
slider.oninput = function () {
    label.textContent = "num: " + this.value;  // Update label text dynamically
}

document.querySelector('#runButton').addEventListener('click', function () {
    var sliderValue = slider.value;
    if (typeof simpleSPH === "function") {
        simpleSPH(sliderValue);
    } else {
        console.log('The main function is not defined.');
    }
});

// Set the slider's max value to MAX_PARTICLES
slider.max = MAX_PARTICLES;
slider.min = MAX_PARTICLES / 10;
slider.value = MAX_PARTICLES / 10;
label.textContent = "num: " + slider.value;