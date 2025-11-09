import { useEffect, useRef } from "react";
import { Renderer, Camera, Geometry, Program, Mesh } from "ogl";

const vertex = /* glsl */ `
attribute vec3 position;
attribute vec4 random;
attribute vec3 color;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uTime;
uniform float uSpread;
uniform float uBaseSize;

varying vec3 vColor;

void main() {
  vColor = color;
  vec3 pos = position * uSpread;
  vec4 mvPos = modelMatrix * vec4(pos,1.0);
  mvPos.x += sin(uTime + random.x * 6.28) * 0.5;
  mvPos.y += cos(uTime + random.y * 6.28) * 0.5;
  gl_PointSize = uBaseSize / length(mvPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * mvPos;
}
`;

const fragment = /* glsl */ `
precision highp float;
varying vec3 vColor;
void main() {
  gl_FragColor = vec4(vColor,1.0);
}
`;

const Particles = ({ particleCount = 150, particleSpread = 10, particleBaseSize = 20 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const renderer = new Renderer({ alpha: true });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);

    const camera = new Camera(gl, { fov: 15 });
    camera.position.set(0, 0, 20);

    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
    };
    window.addEventListener("resize", resize);
    resize();

    const positions = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount * 4);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions.set([(Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2], i * 3);
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      colors.set([Math.random(), Math.random(), Math.random()], i * 3);
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: colors },
    });

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: { uTime: { value: 0 }, uSpread: { value: particleSpread }, uBaseSize: { value: particleBaseSize } },
      transparent: true,
    });

    const mesh = new Mesh(gl, { geometry, program });

    let last = performance.now();
    const animate = (t) => {
      requestAnimationFrame(animate);
      program.uniforms.uTime.value += 0.001 * (t - last);
      last = t;
      renderer.render({ scene: mesh, camera });
    };
    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
    };
  }, [particleCount, particleSpread, particleBaseSize]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }} />;
};

export default Particles;
