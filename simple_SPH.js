"use strict";

const vec2 = glMatrix.vec2;

const G = vec2.fromValues(0, -10);
const REST_DENS = 300.0;  // rest density
const GAS_CONST = 2000.0; // const for equation of state
const H = 8.0;           // kernel radius
const HSQ = H * H;        // radius^2 for optimization
const MASS = 2.5;         // assume all particles have the same mass
const VISC = 200.0;       // viscosity constant
const DT = 0.0007;        // integration timestep

// smoothing kernels defined in Müller and their gradients
// adapted to 2D per "SPH Based Shallow Water Simulation" by Solenthaler et al.
const POLY6 = 4.0 / (Math.PI * Math.pow(H, 8.0));
const SPIKY_GRAD = -10.0 / (Math.PI * Math.pow(H, 5.0));
const VISC_LAP = 40.0 / (Math.PI * Math.pow(H, 5.0));

const EPS = H; // boundary epsilon
const BOUND_DAMPING = -0.5;

class Particle {
    constructor(x, y) {
        this.x = vec2.fromValues(x, y);
        this.v = vec2.fromValues(0, 0);
        this.f = vec2.fromValues(0, 0);
        this.rho = 0;
        this.p = 0;
    }
};

const MAX_PARTICLES = 2500;
const DAM_PARTICLES = 500;
const BLOCK_PARTICLES = 250;

// rendering projection parameters
const DAM_WIDTH = 800;
const DAM_HEIGHT = 600;

let particles = [];
let gl;
let program;
let positionLocation;
let resolutionUniformLocation;

function InitSPH() {
    for (var y = EPS; y < DAM_HEIGHT - EPS; y += H) {
        for (var x = EPS; x <= DAM_WIDTH; x += H) {
            if (particles.length < DAM_PARTICLES) {
                particles.push(new Particle(x + Math.random() / 10e3, y + Math.random() / 10e3));
            }
            else {
                return;
            }
        }
    }
}

function ComputeDensityPressure() {

}

function ComputeForces() {

}

function Integrate() {

}

function Update() {
    ComputeDensityPressure();
    ComputeForces();
    Integrate();
}

function Render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    // Update particle positions

    let positions = [];
    particles.forEach(p => {
        positions.push(p.x[0], p.x[1]);
    });

    // Load positions into the buffer
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);

    // Enable position attribute and specify how to pull data from buffer
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Draw the particles as points
    gl.drawArrays(gl.POINTS, 0, particles.length);
}

function SPHLoop() {
    Update();
    Render();
    requestAnimationFrame(SPHLoop);
}

function simple_SPH(particle_num) {
    // WebGL setup
    const canvas = document.getElementById("c");
    gl = canvas.getContext("webgl2");
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Set background color

    // Initialize shaders
    const vertexShaderSource = `#version 300 es
    precision highp float;

    in vec2 a_position;  // Particle position passed from JavaScript
    uniform vec2 u_resolution;  // Canvas resolution for normalization

    void main() {
        // Convert particle position to clip space (-1 to 1)
        vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        gl_PointSize = 1.0;  // Size of each particle point
    }`;

    const fragmentShaderSource = `#version 300 es
    precision highp float;

    out vec4 outColor;

    void main() {
        outColor = vec4(0.0, 0.0, 0.6, 1.0);
    }`;

    program = webglUtils.createProgramFromSources(gl,
        [vertexShaderSource, fragmentShaderSource]);

    // Get attribute/uniform locations
    positionLocation = gl.getAttribLocation(program, "a_position");
    resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

    // Create buffer for particle positions
    const positionBuffer = gl.createBuffer();

    // Bind buffer and set it as ARRAY_BUFFER
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);


    InitSPH();
    requestAnimationFrame(SPHLoop);
}