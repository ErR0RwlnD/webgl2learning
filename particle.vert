#version 300 es
precision highp float;

in vec3 aVertexPosition; // Vertex position attribute
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main(void) {
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);
    gl_PointSize = 10.0; // Set point size for particles
}