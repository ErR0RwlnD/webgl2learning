"use strict";

const vec2 = glMatrix.vec2;

const G = vec2.fromValues(0, -10);
const REST_DENS = 300.0;  // rest density
const GAS_CONST = 2000.0; // const for equation of state
const H = 16.0;           // kernel radius
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

let particles = [];


const MAX_PARTICLES = 2500;
const DAM_PARTICLES = 500;
const BLOCK_PARTICLES = 250;

// rendering projection parameters
const WINDOW_WIDTH = 800;
const WINDOW_HEIGHT = 600;
const VIEW_WIDTH = 1.5 * 800;
const VIEW_HEIGHT = 1.5 * 600;


function InitSPH() {
    for (var y = EPS; y < VIEW_HEIGHT - EPS; y++) {
        for (var x = EPS; x < VIEW_WIDTH; x++) {
            if (particles.length < DAM_PARTICLES) {
                particles.push(Math.random());
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

function SPHLoop(particle_num) {
    glMatrix.setMatrixArrayType(Array)

    Update();
    Render();
    requestAnimationFrame(SPHLoop);
}