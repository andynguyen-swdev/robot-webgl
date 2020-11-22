"use strict";

var canvas, gl, program;

var NumVertices = 36; //(6 faces)(2 triangles/face)(3 vertices/triangle)

var points = [];
var colors = [];

var vertices = [
    vec4(-0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, 0.5, 0.5, 1.0),
    vec4(0.5, 0.5, 0.5, 1.0),
    vec4(0.5, -0.5, 0.5, 1.0),
    vec4(-0.5, -0.5, -0.5, 1.0),
    vec4(-0.5, 0.5, -0.5, 1.0),
    vec4(0.5, 0.5, -0.5, 1.0),
    vec4(0.5, -0.5, -0.5, 1.0)
];

// RGBA colors
var vertexColors = [
    vec4(0.0, 0.0, 0.0, 1.0),  // black
    vec4(1.0, 0.0, 0.0, 1.0),  // red
    vec4(1.0, 1.0, 0.0, 1.0),  // yellow
    vec4(0.0, 1.0, 0.0, 1.0),  // green
    vec4(0.0, 0.0, 1.0, 1.0),  // blue
    vec4(1.0, 0.0, 1.0, 1.0),  // magenta
    vec4(1.0, 1.0, 1.0, 1.0),  // white
    vec4(0.0, 1.0, 1.0, 1.0)   // cyan
];


// Parameters controlling the size of the Robot's arm

var BASE_HEIGHT = 0.5;
var BASE_RADII = 0.5;
var LOWER_ARM_HEIGHT = 2;
var LOWER_ARM_WIDTH = 0.3;
var UPPER_ARM_HEIGHT = 2;
var UPPER_ARM_WIDTH = 0.3;

// Shader transformation matrices

var baseModelViewMatrix, modelViewMatrix, projectionMatrix;

// Array of rotation angles (in degrees) for each rotation axis

var Base = 0;
var LowerArm = 1;
var UpperArm = 2;


var theta = [0, 0, 0];

var angle = 0;

var modelViewMatrixLoc, normalMatrixLoc, shininessLoc, ambientCoefLoc, diffuseCoefLoc, specularCoefLoc, lightPositionLoc;

var vBuffer, nBuffer;
var vPosition, vNormal;

//----------------------------------------------------------------------------

function quad(a, b, c, d) {
    colors.push(vertexColors[a]);
    points.push(vertices[a]);
    colors.push(vertexColors[a]);
    points.push(vertices[b]);
    colors.push(vertexColors[a]);
    points.push(vertices[c]);
    colors.push(vertexColors[a]);
    points.push(vertices[a]);
    colors.push(vertexColors[a]);
    points.push(vertices[c]);
    colors.push(vertexColors[a]);
    points.push(vertices[d]);
}


function colorCube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
}

//____________________________________________

// Remmove when scale in MV.js supports scale matrices

function scale4(a, b, c) {
    var result = mat4();
    result[0][0] = a;
    result[1][1] = b;
    result[2][2] = c;
    return result;
}


//--------------------------------------------------


window.onload = function init() {

    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    gl.useProgram(program);

    colorCube();

    // Load shaders and use the resulting shader program

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Create and initialize  buffer objects

    vBuffer = gl.createBuffer();
    vPosition = gl.getAttribLocation(program, "vPosition");
    gl.enableVertexAttribArray(vPosition);

    nBuffer = gl.createBuffer();
    vNormal = gl.getAttribLocation(program, "vNormal");
    gl.enableVertexAttribArray(vNormal);

    document.getElementById("slider1").oninput = function (event) {
        theta[0] = event.target.value;
    };
    document.getElementById("slider2").oninput = function (event) {
        theta[1] = event.target.value;
    };
    document.getElementById("slider3").oninput = function (event) {
        theta[2] = event.target.value;
    };
    document.getElementById("topview").onchange = function (event) {
        setTopView(event.target.checked);
    }

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
    shininessLoc = gl.getUniformLocation(program, "shininess");
    ambientCoefLoc = gl.getUniformLocation(program, "Ka");
    diffuseCoefLoc = gl.getUniformLocation(program, "Kd");
    specularCoefLoc = gl.getUniformLocation(program, "Ks");
    lightPositionLoc = gl.getUniformLocation(program, "lightPosition");

    projectionMatrix = ortho(-5, 5, -5, 5, -10, 10);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));

    gl.uniform3f(gl.getUniformLocation(program, "La"), 1, 1, 1);
    gl.uniform3f(gl.getUniformLocation(program, "Ld"), 1, 1, 1);
    gl.uniform3f(gl.getUniformLocation(program, "Ls"), 1, 1, 1);

    setTopView(document.getElementById("topview").checked);

    render();
}

function setVertexPositionsData(vertexPositions) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexPositions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
}

function setVertexNormalData(normals) {
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
}

function setAmbientCoefficients(r, g, b) {
    gl.uniform3f(ambientCoefLoc, r, g, b);
}

function setDiffuseCoefficients(r, g, b) {
    gl.uniform3f(diffuseCoefLoc, r, g, b);
}

function setSpecularCoefficients(r, g, b) {
    gl.uniform3f(specularCoefLoc, r, g, b);
}

function setShininess(shininess) {
    gl.uniform1f(shininessLoc, shininess);
}

function setLightPosition(pos) {
    gl.uniform3f(lightPositionLoc, pos[0], pos[1], pos[2]);
}

function setTopView(isTopView) {
    if (isTopView) {
        baseModelViewMatrix = inverse(mult(translate(0, 5, 0), rotateX(-90)));
    } else {
        baseModelViewMatrix = translate(0, 0, -5);
    }
}

//----------------------------------------------------------------------------


function base() {
    var s = scale4(BASE_RADII / 0.5, BASE_HEIGHT, BASE_RADII / 0.5);
    var instanceMatrix = mult(translate(0.0, 0.5 * BASE_HEIGHT, 0.0), s);
    var t = mult(modelViewMatrix, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(transpose(inverse(t))));

    setVertexPositionsData(Cylinder.verts);
    setVertexNormalData(Cylinder.normals);

    setAmbientCoefficients(0.332549019607843, 0.274509803921569, 0.0862745098039216);
    setDiffuseCoefficients(0.332549019607843, 0.274509803921569, 0.0862745098039216);
    setSpecularCoefficients(0.831372549019608, 0.686274509803922, 0.215686274509804);
    setShininess(80);

    gl.drawArrays(gl.TRIANGLES, 0, Cylinder.vertexCount);
}

//----------------------------------------------------------------------------


function upperArm() {
    var s = scale4(UPPER_ARM_WIDTH, UPPER_ARM_HEIGHT, UPPER_ARM_WIDTH);
    var instanceMatrix = mult(translate(0.0, 0.5 * UPPER_ARM_HEIGHT, 0.0), s);
    var t = mult(modelViewMatrix, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(transpose(inverse(t))));

    setVertexPositionsData(Cube.verts);
    setVertexNormalData(Cube.normals);

    setAmbientCoefficients(0.252549, 0.252549, 0.255686);
    setDiffuseCoefficients(0.252549, 0.252549, 0.255686);
    setSpecularCoefficients(0.631373, 0.631373, 0.639126);
    setShininess(80);

    gl.drawArrays(gl.TRIANGLES, 0, Cube.vertexCount);
}

//----------------------------------------------------------------------------


function lowerArm() {
    var s = scale4(LOWER_ARM_WIDTH, LOWER_ARM_HEIGHT, LOWER_ARM_WIDTH);
    var instanceMatrix = mult(translate(0.0, 0.5 * LOWER_ARM_HEIGHT, 0.0), s);
    var t = mult(modelViewMatrix, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(transpose(inverse(t))));

    setVertexPositionsData(Cube.verts);
    setVertexNormalData(Cube.normals);

    setAmbientCoefficients(0.089411765, 0.156862745, 0.221176471);
    setDiffuseCoefficients(0.089411765, 0.156862745, 0.221176471);
    setSpecularCoefficients(0.223529412, 0.392156863, 0.552941176);
    setShininess(80);

    gl.drawArrays(gl.TRIANGLES, 0, Cube.vertexCount);
}

//----------------------------------------------------------------------------


var render = function () {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    setLightPosition(mult(baseModelViewMatrix, vec4(150, 100, 100, 1)));

    modelViewMatrix = mult(baseModelViewMatrix, rotate(theta[Base], 0, 1, 0));
    base();

    modelViewMatrix = mult(modelViewMatrix, translate(0.0, BASE_HEIGHT, 0.0));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[LowerArm], 0, 0, 1));
    lowerArm();

    modelViewMatrix = mult(modelViewMatrix, translate(0.0, LOWER_ARM_HEIGHT, 0.0));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[UpperArm], 0, 0, 1));
    upperArm();

    requestAnimFrame(render);
}

