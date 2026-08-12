"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/// Procedurally draws a stylized RUSD "banknote" texture — Relivio-branded,
/// grayscale, no real currency imagery — used as the material for the 3D
/// fanned-bill stack below.
function createBanknoteTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 432;
  const ctx = canvas.getContext("2d")!;

  // Bill base — light gray so the CRT shader's grayscale/tint pass has
  // something to work with (matches the reference's light-base approach).
  ctx.fillStyle = "#d9d9d9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#141414";
  ctx.lineWidth = 14;
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  ctx.lineWidth = 4;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

  ctx.fillStyle = "#141414";
  ctx.font = "bold 58px Courier New";
  ctx.fillText("RU$D", 45, 85);
  ctx.fillText("RU$D", canvas.width - 190, 85);
  ctx.fillText("RU$D", 45, canvas.height - 45);
  ctx.fillText("RU$D", canvas.width - 190, canvas.height - 45);

  // Center emblem — heart-in-shield, matching Relivio's mark, instead of a
  // portrait.
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 140, 170, 0, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.fillStyle = "#202020";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 85, 115, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(20, 20, 20, 0.25)";
  ctx.lineWidth = 2;
  for (let i = 0; i < canvas.height; i += 5) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  ctx.fillStyle = "#141414";
  ctx.font = "bold 24px Courier New";
  ctx.textAlign = "center";
  ctx.fillText("RELIVIO COMMUNITY TREASURY", cx, 60);
  ctx.fillText("TESTNET STABLECOIN — NOT REAL FUNDS", cx, canvas.height - 45);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform vec3 uTint;
  uniform float uTintOpacity;
  uniform float uContrast;
  uniform float uScanlineIntensity;
  uniform float uDitherIntensity;
  uniform float uVignetteIntensity;
  uniform float uFlickerIntensity;

  varying vec2 vUv;

  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;

    vec2 centeredUv = uv - 0.5;
    uv = centeredUv * (1.0 + 0.04 * dot(centeredUv, centeredUv)) + 0.5;

    vec4 color = texture2D(tDiffuse, uv);

    color.rgb = (color.rgb - 0.5) * uContrast + 0.5;

    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    vec3 tintedColor = mix(vec3(lum), uTint * lum * 1.15, uTintOpacity);

    float dither = (rand(gl_FragCoord.xy + uTime) - 0.5) * uDitherIntensity;
    tintedColor += dither;

    float scanline = sin(uv.y * 600.0 + uTime * 2.0) * 0.5 + 0.5;
    tintedColor -= scanline * uScanlineIntensity * 0.3;

    float flicker = sin(uTime * 35.0) * 0.02 + sin(uTime * 90.0) * 0.01;
    tintedColor += flicker * uFlickerIntensity;

    float dist = distance(uv, vec2(0.5));
    float vignette = smoothstep(0.9, 0.2, dist * uVignetteIntensity);
    tintedColor *= vignette;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      tintedColor = vec3(0.0);
    }

    gl_FragColor = vec4(tintedColor, 1.0);
  }
`;

export function HeroMoneyBackground({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function isWebGLAvailable() {
      try {
        const canvas = document.createElement("canvas");
        return !!(
          window.WebGLRenderingContext &&
          (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
      } catch {
        return false;
      }
    }
    if (!isWebGLAvailable()) return;

    let raf = 0;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000"); // black, matches the site theme

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const billTexture = createBanknoteTexture(renderer);

    const fanGroup = new THREE.Group();
    const numBills = 11;
    const billWidth = 6.2;
    const billHeight = 2.6;
    const geometry = new THREE.PlaneGeometry(billWidth, billHeight, 16, 16);

    const posAttr = geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      posAttr.setZ(i, -Math.pow(x / billWidth, 2) * 0.15);
    }
    geometry.computeVertexNormals();

    const billMaterial = new THREE.MeshBasicMaterial({
      map: billTexture,
      side: THREE.DoubleSide,
    });

    const startAngle = -Math.PI * 0.35;
    const endAngle = Math.PI * 0.12;
    const pivotOffsetY = -2.5;

    for (let i = 0; i < numBills; i++) {
      const t = i / (numBills - 1);
      const angle = startAngle + t * (endAngle - startAngle);

      const bill = new THREE.Mesh(geometry, billMaterial);
      const pivotGroup = new THREE.Group();
      pivotGroup.position.set(0, pivotOffsetY, 0);

      bill.position.set(0, -pivotOffsetY, t * 0.08);
      pivotGroup.add(bill);

      pivotGroup.rotation.z = angle;
      pivotGroup.position.x = (t - 0.5) * 1.2;

      fanGroup.add(pivotGroup);
    }

    fanGroup.position.set(1.1, 0.1, 0);
    fanGroup.rotation.x = -0.15;
    fanGroup.rotation.y = 0.2;
    scene.add(fanGroup);

    const uniforms = {
      tDiffuse: { value: null as THREE.Texture | null },
      uTime: { value: 0 },
      uTint: { value: new THREE.Color("#ffffff") }, // white tint — matches site palette (was green CRT phosphor)
      uTintOpacity: { value: 0.35 }, // subtler than the reference so it reads monochrome, not colorized
      uContrast: { value: 1.25 },
      uScanlineIntensity: { value: 0.35 },
      uDitherIntensity: { value: 0.15 },
      uVignetteIntensity: { value: 0.6 },
      uFlickerIntensity: { value: 0.08 },
    };

    const renderTarget = new THREE.WebGLRenderTarget(width, height);
    const postMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    });

    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
    postScene.add(quad);

    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    function handleMouseMove(e: MouseEvent) {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    window.addEventListener("mousemove", handleMouseMove);

    const clock = new THREE.Clock();

    function animate() {
      raf = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      fanGroup.rotation.y = 0.2 + targetX * 0.25 + Math.sin(elapsed * 0.8) * 0.05;
      fanGroup.rotation.x = -0.15 + targetY * 0.15 + Math.cos(elapsed * 0.6) * 0.03;
      fanGroup.position.y = 0.1 + Math.sin(elapsed * 1.2) * 0.08;

      uniforms.uTime.value = elapsed;

      renderer.setRenderTarget(renderTarget);
      renderer.render(scene, camera);

      uniforms.tDiffuse.value = renderTarget.texture;
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCamera);
    }
    animate();

    function handleResize() {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderTarget.setSize(w, h);
    }
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      geometry.dispose();
      billMaterial.dispose();
      billTexture.dispose();
      postMaterial.dispose();
      renderTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className={className} />;
}