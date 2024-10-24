"use strict";

const mat4 = glMatrix.mat4;

window.SPH_config = {
    kernel_radius: 100,
    particle_distance: 40,
    container_size: 2000,
    pressure_solver: "EOS",
    pressure_stiffness: 1000,
    viscosity: "XSPH",
    MonaghanViscosity: 0.01,
    XSPHViscosity: 0.2,
};
window.particles = [];
window.boundary = [];

const zoom_sensitivity = 2.5;
const rotation_sensitivity = 0.01;
const movement_sensitivity = 2.0;
const deadzone = 3.0;

const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl2');

if (!gl) {
    console.error('WebGL2 not supported');
}

// Vertex shader program
const containerVsSource = `#version 300 es
    precision highp float;
    in vec4 aVertexPosition;
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    }
`;

// Fragment shader program
const containerFsSource = `#version 300 es
    precision highp float;
    out vec4 fragColor;
    void main(void) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0); // Black color
    }
`;

// Initialize a shader program using webgl-utils.js
// Load shader sources from external files
async function initShaders() {
    const particleVsSource = await fetch('particle.vert').then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load particle.vert: ${response.statusText}`);
        }
        return response.text();
    });
    const particleFsSource = await fetch('particle.frag').then(response => {
        if (!response.ok) {
            throw new Error(`Failed to load particle.frag: ${response.statusText}`);
        }
        return response.text();
    });

    // Initialize shader programs
    const particleShaderProgram = webglUtils.createProgramFromSources(gl, [particleVsSource, particleFsSource]);
    if (!particleShaderProgram) {
        console.error('Failed to initialize particle shader program');
    }

    const containerShaderProgram = webglUtils.createProgramFromSources(gl, [containerVsSource, containerFsSource]);
    if (!containerShaderProgram) {
        console.error('Failed to initialize container shader program');
    }


    return { particleShaderProgram, containerShaderProgram };
}

let containerProgramInfo;
let particleProgramInfo;
let containerBuffer;
let particleBuffer;

initShaders().then(({ particleShaderProgram, containerShaderProgram }) => {
    // Collect all the info needed to use the shader program.
    particleProgramInfo = {
        program: particleShaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(particleShaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(particleShaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(particleShaderProgram, 'uModelViewMatrix'),
        },
    };

    containerProgramInfo = {
        program: containerShaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(containerShaderProgram, 'aVertexPosition'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(containerShaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(containerShaderProgram, 'uModelViewMatrix'),
        },
    };
    // Build all the objects we'll be drawing.
    particleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    containerBuffer = initContainerBuffers(gl);

    // Initial resize to set up the canvas size and draw the initial scene
    window.dispatchEvent(new Event('resize'));
    window.initSPH();
});

// Draw the scene repeatedly
let then = 0;
let zoom = -4000;
let rotation = 0;
let isDragging = false;
let verticalPosition = 0;
let previousMousePosition = { x: 0, y: 0 };

function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.1;
    const zFar = 10000.0;
    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, verticalPosition, zoom]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotation, [0, 1, 0]);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to white, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    drawSPH(gl, deltaTime, projectionMatrix, modelViewMatrix);
    drawScene(gl, projectionMatrix, modelViewMatrix);

    requestAnimationFrame(render);
}

function drawSPH(gl, deltaTime, projectionMatrix, modelViewMatrix) {
    updateSPH(deltaTime);
    renderSPH(gl, projectionMatrix, modelViewMatrix);
}

function renderSPH(gl, projectionMatrix, modelViewMatrix) {
    const particlePositions = window.particles.flatMap(p => [p.position[0], p.position[1], p.position[2]]);

    gl.useProgram(particleProgramInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(particlePositions), gl.STATIC_DRAW);
    gl.vertexAttribPointer(particleProgramInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(particleProgramInfo.attribLocations.vertexPosition);

    gl.uniformMatrix4fv(particleProgramInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(particleProgramInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.drawArrays(gl.POINTS, 0, window.particles.length);
}

function initContainerBuffers(gl) {
    const positions = [
        -window.SPH_config.container_size / 2, -window.SPH_config.container_size / 2, window.SPH_config.container_size / 2,
        window.SPH_config.container_size / 2, -window.SPH_config.container_size / 2, window.SPH_config.container_size / 2,
        window.SPH_config.container_size / 2, window.SPH_config.container_size / 2, window.SPH_config.container_size / 2,
        -window.SPH_config.container_size / 2, window.SPH_config.container_size / 2, window.SPH_config.container_size / 2,
        -window.SPH_config.container_size / 2, -window.SPH_config.container_size / 2, -window.SPH_config.container_size / 2,
        window.SPH_config.container_size / 2, -window.SPH_config.container_size / 2, -window.SPH_config.container_size / 2,
        window.SPH_config.container_size / 2, window.SPH_config.container_size / 2, -window.SPH_config.container_size / 2,
        -window.SPH_config.container_size / 2, window.SPH_config.container_size / 2, -window.SPH_config.container_size / 2,
    ];

    const indices = [
        0, 1, 1, 2, 2, 3, 3, 0,
        4, 5, 5, 6, 6, 7, 7, 4,
        0, 4, 1, 5, 2, 6, 3, 7,
    ];

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        indices: indexBuffer,
    };
}

function drawScene(gl, projectionMatrix, modelViewMatrix) {
    gl.useProgram(containerProgramInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, containerBuffer.position);
    gl.vertexAttribPointer(containerProgramInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(containerProgramInfo.attribLocations.vertexPosition);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, containerBuffer.indices);
    gl.uniformMatrix4fv(containerProgramInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(containerProgramInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

    gl.drawElements(gl.LINES, 24, gl.UNSIGNED_SHORT, 0);

}

// Event listeners for camera interaction
canvas.addEventListener('mousedown', (event) => {
    isDragging = true;
    previousMousePosition = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener('mousemove', (event) => {
    if (isDragging) {
        const deltaX = event.clientX - previousMousePosition.x;
        const deltaY = event.clientY - previousMousePosition.y;

        if ((Math.abs(deltaY) + 1e-6) / (Math.abs(deltaX) + 1e-6) > deadzone) {
            verticalPosition -= deltaY * movement_sensitivity;
        } else if ((Math.abs(deltaX) + 1e-6) / (Math.abs(deltaY) + 1e-6) > deadzone) {
            rotation += deltaX * rotation_sensitivity;
        }

        previousMousePosition = { x: event.clientX, y: event.clientY };
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mouseout', () => {
    isDragging = false;
});

canvas.addEventListener('wheel', (event) => {
    zoom -= event.deltaY * zoom_sensitivity;
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
});