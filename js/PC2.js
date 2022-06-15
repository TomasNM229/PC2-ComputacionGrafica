"using strict";

import * as cg from "./cg.js";
import * as v3 from "./glmjs/vec3.js";
import * as v4 from "./glmjs/vec4.js";
import * as m4 from "./glmjs/mat4.js";
import * as twgl from "./twgl-full.module.js";

async function main() {
  const ambientLight = document.querySelector("#ambient");
  const lightTheta = document.querySelector("#theta");
  const canvitas = document.querySelector("#canvitas");
  const gl = canvitas.getContext("webgl2");
  if (!gl) return undefined !== console.log("couldn't create webgl2 context");

  let autorotate = true;

  twgl.setDefaults({ attribPrefix: "a_" });

  // Loading monito
  let vertSrc = await cg.fetchText("glsl/12-02.vert");
  let fragSrc = await cg.fetchText("glsl/12-02.frag");
  const objPrgInf = twgl.createProgramInfo(gl, [vertSrc, fragSrc]);
  const obj = await cg.loadObj("models/crate/crate.obj", gl, objPrgInf);
  const objPrgInf1 = twgl.createProgramInfo(gl, [vertSrc, fragSrc]);
  const obj1 = await cg.loadObj("models/crate/crate1.obj", gl, objPrgInf1);

  // Light source (fake lightbulb)
  vertSrc = await cg.fetchText("glsl/ls.vert");
  fragSrc = await cg.fetchText("glsl/ls.frag");
  const lsPrgInf = twgl.createProgramInfo(gl, [vertSrc, fragSrc]);
  const lightbulb = await cg.loadObj("models/cubito/cubito.obj", gl, lsPrgInf);

  // General stuff setup
  const cam = new cg.Cam([0, 0, 6], 25);

  let aspect = 16.0 / 9.0;
  let deltaTime = 0;
  let lastTime = 0;
  let theta = 0;

  const world = m4.create();
  const projection = m4.create();

  // some preloaded arrays to optimize memory usage
  const rotationAxis = new Float32Array([0, 1, 0]);
  const temp = v3.create();
  const one = v3.fromValues(1, 1, 1);
  const initial_light_pos = v3.fromValues(3.0, 0, 0);
  const origin = v4.create();
  const light_position = v3.create();

  const coords = {
    u_world: world,
    u_projection: projection,
    u_view: cam.viewM4,
  };
  const light0 = {
    "u_light.ambient": v3.create(0),
    "u_light.cutOff": Math.cos(Math.PI / 15.0),
    "u_light.outerCutOff": Math.cos(Math.PI / 12.0),
    "u_light.direction": cam.lookAt,
    "u_light.position": cam.pos,
    "u_light.constant": 1.0,
    "u_light.linear": 0.09,
    "u_light.quadratic": 0.032,
    u_viewPosition: cam.pos,
  };
  const light1 = {
    u_light_color: v3.fromValues(1, 1, 1),
  };
  // multiple objects positions
	const numObjs = 50;
  const delta = new Array(numObjs);
  const deltaG = -9.81;
  const positions = new Array(numObjs);
	const rndb = (a, b) => Math.random() * (b - a) + a;
	for (let i = 0; i < numObjs; ++i) {
		positions[i] = [rndb(-13.0, 13.0), rndb(-12.0, 12.0), rndb(-14.0, 14.0)];
	}

  // Render awesome
  function render(elapsedTime) {
    // handling time in seconds maybe
    elapsedTime *= 1e-3;
    deltaTime = elapsedTime - lastTime;
    lastTime = elapsedTime;

    // resizing stuff and general preparation
    if (twgl.resizeCanvasToDisplaySize(gl.canvas)) {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      aspect = gl.canvas.width / gl.canvas.height;
    }
    gl.clearColor(0.1, 0.1, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // some logic to move the light around
    if (autorotate) theta += deltaTime;
    if (theta > Math.PI * 2) theta -= Math.PI * 2;
    m4.identity(world);
    m4.rotate(world, world, theta, rotationAxis);
    m4.translate(world, world, initial_light_pos);
    v3.transformMat4(light_position, origin, world);

    // coordinate system adjustments
    m4.identity(projection);
    m4.perspective(projection, cam.zoom, aspect, 0.1, 100);

    // drawing object 1
    gl.useProgram(objPrgInf.program);
    twgl.setUniforms(objPrgInf, light0);

    // drawing object 2
    gl.useProgram(objPrgInf1.program);
    twgl.setUniforms(objPrgInf1, light0); 

    for (const pos of positions) {
      m4.identity(world);
      m4.scale(world, world, v3.scale(temp, one, 1));
      m4.translate(world, world, pos);
      m4.rotate(world, world, theta, rotationAxis);
      twgl.setUniforms(objPrgInf, coords);
      for (const { bufferInfo, vao, material } of obj) {
        gl.bindVertexArray(vao);
        twgl.setUniforms(objPrgInf, {}, material);
        twgl.drawBufferInfo(gl, bufferInfo);
      }
		}
    for (const pos of positions) {
      m4.identity(world);
      m4.scale(world, world, v3.scale(temp, one, 1));
      m4.translate(world, world, pos);
      m4.rotate(world, world, theta, rotationAxis);
      twgl.setUniforms(objPrgInf1, coords);
      for (const { bufferInfo, vao, material } of obj1) {
        gl.bindVertexArray(vao);
        twgl.setUniforms(objPrgInf1, {}, material);
        twgl.drawBufferInfo(gl, bufferInfo);
      } 
		}

    // logic to move the visual representation of the light source
    m4.identity(world);
    m4.translate(world, world, light_position);
    m4.scale(world, world, v3.scale(temp, one, 0.025));

    // drawing the light source cube
    gl.useProgram(lsPrgInf.program);
    twgl.setUniforms(lsPrgInf, coords);
    twgl.setUniforms(lsPrgInf, light1);

    for (const { bufferInfo, vao } of lightbulb) {
      gl.bindVertexArray(vao);
      twgl.drawBufferInfo(gl, bufferInfo);
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  document.addEventListener("keydown", (e) => {
    /**/ if (e.key === "w") cam.processKeyboard(cg.FORWARD, deltaTime);
    else if (e.key === "a") cam.processKeyboard(cg.LEFT, deltaTime);
    else if (e.key === "s") cam.processKeyboard(cg.BACKWARD, deltaTime);
    else if (e.key === "d") cam.processKeyboard(cg.RIGHT, deltaTime);
    else if (e.key === "r") autorotate = !autorotate;
  });
  canvitas.addEventListener("mousemove", (e) => cam.movePov(e.x, e.y));
  canvitas.addEventListener("mousedown", (e) => cam.startMove(e.x, e.y));
  canvitas.addEventListener("mouseup", () => cam.stopMove());
  canvitas.addEventListener("wheel", (e) => cam.processScroll(e.deltaY));
  ambientLight.addEventListener("change", () => {
    const value = ambientLight.value;
    light0["u_light.ambient"][0] = value / 100.0;
    light0["u_light.ambient"][1] = value / 100.0;
    light0["u_light.ambient"][2] = value / 100.0;
  });
  lightTheta.addEventListener("change", () => {
    const value = lightTheta.value;
    theta = value * Math.PI / 180.0;
  });
}

main();
    