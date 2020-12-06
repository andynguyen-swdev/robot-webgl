"use strict";

var canvas, gl, program;

// Parameters controlling the size of the Robot's arm

var BASE_HEIGHT = 0.5;
var BASE_RADII = 0.5;
var LOWER_ARM_HEIGHT = 2;
var LOWER_ARM_WIDTH = 0.3;
var UPPER_ARM_HEIGHT = 2;
var UPPER_ARM_WIDTH = 0.3;
var SPHERE_RADIUS = 0.15;

// Shader transformation matrices

var baseModelViewMatrix, modelViewMatrix, projectionMatrix;

// Array of rotation angles (in degrees) for each rotation axis
var Base = 0;
var LowerArm = 1;
var UpperArm = 2;

var theta = [0, 0, 0];

var lightPosition = [3, 1.5, 4.5, 1];

var sphereX, sphereY, sphereZ;
var sphereAttached = false;
var startAngles, endAngles;

var lastTime;
var animationDuration;
var animationEndedCallback;
var animationStartTime;

var modelViewMatrixLoc, normalMatrixLoc, shininessLoc, ambientCoefLoc, diffuseCoefLoc, specularCoefLoc, lightPositionLoc;

var vBuffer, nBuffer;
var vPosition, vNormal;

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

    gl.clearColor(.1, .1, .1, 1.0);
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    gl.useProgram(program);


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

    // document.getElementById("slider1").oninput = function (event) {
    //     theta[0] = event.target.value / 180 * Math.PI;
    // };
    // document.getElementById("slider2").oninput = function (event) {
    //     theta[1] = event.target.value / 180 * Math.PI;
    // };
    // document.getElementById("slider3").oninput = function (event) {
    //     theta[2] = event.target.value / 180 * Math.PI;
    // };

    document.getElementById("topview").onchange = function (event) { setTopView(event.target.checked); }
    document.getElementById("fetch").onclick = function () {
        let coords = [
            document.getElementById("old_x").value,
            document.getElementById("old_y").value,
            document.getElementById("old_z").value,
            document.getElementById("new_x").value,
            document.getElementById("new_y").value,
            document.getElementById("new_z").value];
        coords = coords.map(value => parseFloat(value));
        fetchSphere(...coords);
    }

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
    shininessLoc = gl.getUniformLocation(program, "shininess");
    ambientCoefLoc = gl.getUniformLocation(program, "Ka");
    diffuseCoefLoc = gl.getUniformLocation(program, "Kd");
    specularCoefLoc = gl.getUniformLocation(program, "Ks");
    lightPositionLoc = gl.getUniformLocation(program, "lightPosition");

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    gl.uniform3f(gl.getUniformLocation(program, "La"), 1, 1, 1);
    gl.uniform3f(gl.getUniformLocation(program, "Ld"), 1, 1, 1);
    gl.uniform3f(gl.getUniformLocation(program, "Ls"), 1, 1, 1);

    setTopView(document.getElementById("topview").checked);

    render();
}

function resizeCanvas() {
    const container = document.getElementById("canvas-container");
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    const aspectRatio = canvas.width / canvas.height;
    if (aspectRatio >= 1) {
        projectionMatrix = ortho(-5 * aspectRatio, 5 * aspectRatio, -5, 5, -10, 10);
    }
    else {
        projectionMatrix = ortho(-5, 5, -5 / aspectRatio, 5 / aspectRatio, -10, 10);
    }
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "projectionMatrix"), false, flatten(projectionMatrix));
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

function fetchSphere(oldX, oldY, oldZ, newX, newY, newZ) {
    const oldAngles = calculateAngles(oldX, oldY, oldZ);
    for (let angle of oldAngles) {
        if (isNaN(angle)) {
            alert(`The position (${oldX}, ${oldY}, ${oldZ}) is unreachable.`);
            return;
        }
    }

    const newAngles = calculateAngles(newX, newY, newZ);
    for (let angle of newAngles) {
        if (isNaN(angle)) {
            alert(`The position (${newX}, ${newY}, ${newZ}) is unreachable.`);
            return;
        }
    }

    startAngles = [0, 0, 0];
    endAngles = oldAngles;
    sphereX = oldX;
    sphereY = oldY;
    sphereZ = oldZ;
    sphereAttached = false;

    startRotationAnimation(1000, 200, () => {
        sphereAttached = true;
        startAngles = oldAngles;
        endAngles = newAngles;

        startRotationAnimation(1000, 200, () => {
            sphereAttached = false;
            sphereX = newX;
            sphereY = newY;
            sphereZ = newZ;
            startAngles = newAngles;
            endAngles = [0, 0, 0];

            startRotationAnimation(1000, 200);
        })
    })
}

function startRotationAnimation(duration, delay, callback) {
    animationStartTime = lastTime + delay;
    animationDuration = duration;
    animationEndedCallback = callback;
}

function calculateAngles(x, y, z) {
    const angles = new Array(3);

    y = y - BASE_HEIGHT;
    angles[Base] = -Math.atan2(z, x);

    const horizontalDistanceSquared = z * z + x * x;
    const distance = Math.sqrt(y * y + horizontalDistanceSquared);

    const groundToSphere = Math.atan2(y, Math.sqrt(horizontalDistanceSquared));

    const lowerArmToSphereCos = (LOWER_ARM_HEIGHT * LOWER_ARM_HEIGHT + distance * distance - (UPPER_ARM_HEIGHT + SPHERE_RADIUS) * (UPPER_ARM_HEIGHT + SPHERE_RADIUS)) / (2 * LOWER_ARM_HEIGHT * distance);
    const lowerArmToSphere = Math.acos(parseFloat(lowerArmToSphereCos.toFixed(6)));
    angles[LowerArm] = -(Math.PI / 2 - groundToSphere - lowerArmToSphere);

    const upperArmToLowerArmCos = (LOWER_ARM_HEIGHT * LOWER_ARM_HEIGHT + (UPPER_ARM_HEIGHT + SPHERE_RADIUS) * (UPPER_ARM_HEIGHT + SPHERE_RADIUS) - distance * distance) / (2 * LOWER_ARM_HEIGHT * (UPPER_ARM_HEIGHT + SPHERE_RADIUS));
    const upperArmToLowerArm = Math.acos(parseFloat(upperArmToLowerArmCos.toFixed(6)));
    angles[UpperArm] = -(Math.PI - upperArmToLowerArm);

    return angles;
}

//----------------------------------------------------------------------------


function base() {
    var s = scale4(BASE_RADII, BASE_HEIGHT, BASE_RADII);
    var instanceMatrix = mult(translate(0.0, 0.5 * BASE_HEIGHT, 0.0), s);
    var t = mult(modelViewMatrix, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(transpose(inverse(t))));

    setVertexPositionsData(Cylinder.verts);
    setVertexNormalData(Cylinder.normals);

    setAmbientCoefficients(0.332549019607843, 0.274509803921569, 0.0862745098039216);
    setDiffuseCoefficients(0.332549019607843, 0.274509803921569, 0.0862745098039216);
    setSpecularCoefficients(0.831372549019608 * 1 / 2, 0.686274509803922 * 1 / 2, 0.215686274509804 * 1 / 2);
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

function sphereAt(x, y, z) {
    var s = scale4(SPHERE_RADIUS, SPHERE_RADIUS, SPHERE_RADIUS);
    var instanceMatrix = mult(translate(x, y, z), s);
    var t = mult(modelViewMatrix, instanceMatrix);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(t));
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(transpose(inverse(t))));

    setVertexPositionsData(Sphere.verts);
    setVertexNormalData(Sphere.normals);

    setAmbientCoefficients(0.172549019607843, 0.23843137254902, 0.163137254901961);
    setDiffuseCoefficients(0.172549019607843, 0.23843137254902, 0.163137254901961);
    setSpecularCoefficients(0.2, 0.2, 0.2);
    setShininess(2);

    gl.drawArrays(gl.TRIANGLES, 0, Sphere.vertexCount);
}

//----------------------------------------------------------------------------


var render = function (time) {
    lastTime = time;
    if (animationStartTime != null && animationStartTime <= time) {
        const elapsed = (time - animationStartTime) / animationDuration;
        if (elapsed > 1) {
            animationStartTime = null;
            theta = [...endAngles];
            if (animationEndedCallback) animationEndedCallback();
        } else {
            for (let i = 0; i < theta.length; i++) {
                theta[i] = startAngles[i] + (endAngles[i] - startAngles[i]) * elapsed;
            }
        }
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    modelViewMatrix = baseModelViewMatrix;
    setLightPosition(mult(modelViewMatrix, lightPosition));

    if (!sphereAttached && sphereX != null && sphereY != null && sphereZ != null)
        sphereAt(sphereX, sphereY, sphereZ);

    modelViewMatrix = mult(baseModelViewMatrix, rotateYRad(theta[Base]));
    base();

    modelViewMatrix = mult(modelViewMatrix, translate(0.0, BASE_HEIGHT, 0.0));
    modelViewMatrix = mult(modelViewMatrix, rotateZRad(theta[LowerArm]));
    lowerArm();

    modelViewMatrix = mult(modelViewMatrix, translate(0.0, LOWER_ARM_HEIGHT, 0.0));
    modelViewMatrix = mult(modelViewMatrix, rotateZRad(theta[UpperArm]));
    upperArm();

    if (sphereAttached) {
        sphereAt(0, UPPER_ARM_HEIGHT + SPHERE_RADIUS, 0);
    }

    requestAnimFrame(render);
}

