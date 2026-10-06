import * as THREE from "three";

const RIPPLE_COUNT = 14;

const vertexShader = `
  uniform float uTime;
  uniform float uAspect;
  uniform vec4 uRipples[14];
  varying vec2 vUv;
  varying float vHeight;
  varying float vAmbient;

  float surface(vec2 point) {
    float height = 0.0;
    for (int i = 0; i < 14; i++) {
      vec4 ripple = uRipples[i];
      float age = uTime - ripple.z;
      if (ripple.w > 0.0 && age >= 0.0 && age < 1.8) {
        vec2 delta = (point - ripple.xy) * vec2(uAspect, 1.0);
        float distanceFromSource = length(delta);
        float waveFront = distanceFromSource - age * 0.29;
        float envelope = exp(-waveFront * waveFront * 115.0) * exp(-age * 0.78);
        height += sin(waveFront * 64.0) * envelope * ripple.w * 0.092;
      }
    }

    float driftA = sin(point.x * 7.5 + uTime * 0.105 + sin(point.y * 5.0)) *
      sin(point.y * 6.0 - uTime * 0.078);
    float driftB = sin(point.x * 17.0 - point.y * 12.0 + uTime * 0.072) *
      sin(point.y * 14.0 + point.x * 8.0 - uTime * 0.062);
    return height + driftA * 0.004 + driftB * 0.0015;
  }

  void main() {
    vUv = uv;
    float height = surface(uv);
    vec3 displaced = position;
    displaced.z += height;
    displaced.z += sin(position.x * 1.5 + uTime * 0.17) *
      cos(position.y * 1.8 - uTime * 0.14) * 0.016;
    vHeight = height;
    vAmbient = sin(uv.x * 9.0 + uTime * 0.1) * sin(uv.y * 7.0 - uTime * 0.07);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vHeight;
  varying float vAmbient;

  void main() {
    vec2 slope = vec2(dFdx(vHeight), dFdy(vHeight));
    vec3 normal = normalize(vec3(-slope.x * 165.0, -slope.y * 165.0, 1.0));
    vec3 lightDirection = normalize(vec3(-0.48, 0.53, 0.89));
    vec3 viewDirection = vec3(0.0, 0.0, 1.0);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 42.0);
    float curve = 0.73 + sin(vUv.x * 5.3 + uTime * 0.035) * 0.085 +
      sin(vUv.x * 11.0 - uTime * 0.022) * 0.018;
    float curveTwo = curve + 0.047 + sin(vUv.x * 3.2 - uTime * 0.018) * 0.025;
    float ribbon = exp(-abs(vUv.y - curve) * 175.0);
    float ribbonTwo = exp(-abs(vUv.y - curveTwo) * 190.0);
    float waveShimmer = pow(max(0.0, sin(vUv.x * 51.0 + uTime * 0.13 + vHeight * 75.0 + vAmbient)), 18.0);
    float ambientLight = clamp(diffuse * 0.34 + vAmbient * 0.05, 0.0, 0.35);
    vec3 base = mix(vec3(0.055, 0.074, 0.078), vec3(0.13, 0.16, 0.15), ambientLight);
    vec3 gold = vec3(0.78, 0.49, 0.19);
    vec3 champagne = vec3(1.0, 0.84, 0.52);
    vec3 color = base + gold * (ribbon * 0.45 + ribbonTwo * 0.17);
    color += champagne * (specular * 0.24 + ribbon * waveShimmer * 0.52);
    color += vec3(0.75, 0.88, 0.91) * specular * 0.14;
    gl_FragColor = vec4(color, 0.56);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createWaterEffect(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) return () => {};

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
  } catch (error) {
    console.warn("The interactive water effect is unavailable in this browser.", error);
    return () => {};
  }

  const stage = canvas.parentElement;
  if (!stage) {
    renderer.dispose();
    throw new Error("The water canvas must be placed inside its stage element.");
  }

  const interactionTarget = window;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 5.1;

  const ripples = Array.from({ length: RIPPLE_COUNT }, () => new THREE.Vector4(0, 0, -100, 0));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uRipples: { value: ripples },
    },
    vertexShader,
    fragmentShader,
  });
  const geometry = new THREE.PlaneGeometry(1, 1, 170, 110);
  const water = new THREE.Mesh(geometry, material);
  scene.add(water);

  const clock = new THREE.Clock();
  let rippleCursor = 0;
  let lastRippleAt = -Infinity;
  let animationFrame = 0;
  let isVisible = true;
  let isPageVisible = !document.hidden;
  let width = 0;
  let height = 0;

  function resize() {
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    width = bounds.width;
    height = bounds.height;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const viewHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    water.scale.set(viewHeight * camera.aspect, viewHeight, 1);
    material.uniforms.uAspect.value = width / height;
  }

  function addRipple(event) {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const now = clock.getElapsedTime();
    if (event.type === "pointermove" && now - lastRippleAt < 0.058) return;
    lastRippleAt = now;
    const x = THREE.MathUtils.clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const y = THREE.MathUtils.clamp(1 - (event.clientY - bounds.top) / bounds.height, 0, 1);

    ripples[rippleCursor].set(x, y, now, 0.9);
    rippleCursor = (rippleCursor + 1) % ripples.length;
  }

  function render() {
    animationFrame = 0;
    if (!isVisible || !isPageVisible || !width || !height) return;
    material.uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(render);
  }

  function start() {
    if (!animationFrame && isVisible && isPageVisible) {
      clock.start();
      animationFrame = window.requestAnimationFrame(render);
    }
  }

  function stop() {
    if (animationFrame) {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  function handleVisibility() {
    isPageVisible = !document.hidden;
    if (isPageVisible) start();
    else stop();
  }

  resize();
  start();
  window.addEventListener("resize", resize, { passive: true });
  interactionTarget.addEventListener("pointermove", addRipple, { passive: true });
  interactionTarget.addEventListener("pointerdown", addRipple, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);

  const observer = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible) start();
    else stop();
  });
  observer.observe(stage);

  return () => {
    stop();
    observer.disconnect();
    window.removeEventListener("resize", resize);
    interactionTarget.removeEventListener("pointermove", addRipple);
    interactionTarget.removeEventListener("pointerdown", addRipple);
    document.removeEventListener("visibilitychange", handleVisibility);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
