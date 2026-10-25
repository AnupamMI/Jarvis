import { useEffect, useRef } from "react";
import * as THREE from "three";

const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){ return snoise(p)*0.6 + snoise(p*2.03)*0.28 + snoise(p*4.11)*0.12; }
`;

const vertexShader = /* glsl */ `
uniform float uTime; uniform float uAmp; uniform float uFreq; uniform float uVoice;
varying float vDisp; varying vec3 vNormalW; varying vec3 vPosW;
${noiseGLSL}
void main(){
  vec3 p = position;
  float d = fbm(p*uFreq + vec3(0.0, uTime*0.25, uTime*0.15));
  float tendril = fbm(p*2.15 + vec3(uTime*0.18, -uTime*0.12, uTime*0.08));
  float pulse = sin(uTime*2.2 + d*3.0)*0.06;
  float voicePulse = sin(uTime*8.0 + p.y*4.0 + tendril*3.0) * uVoice * 0.045;
  vDisp = d;
  vec3 displaced = p + normal * (d*uAmp + tendril*0.035 + pulse*uAmp*0.8 + voicePulse);
  vec4 world = modelMatrix * vec4(displaced,1.0);
  vPosW = world.xyz;
  vNormalW = normalize(mat3(modelMatrix)*normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorC; uniform float uTime; uniform float uOpacity; uniform float uVoice;
varying float vDisp; varying vec3 vNormalW; varying vec3 vPosW;
${noiseGLSL}
void main(){
  vec3 viewDir = normalize(cameraPosition - vPosW);
  float fres = pow(1.0 - clamp(dot(viewDir, normalize(vNormalW)),0.0,1.0), 2.1);
  float band = smoothstep(-0.5, 0.65, vDisp);
  vec3 col = mix(uColorA, uColorB, band);
  col = mix(col, uColorC, fres);
  float flow = fbm(vPosW*3.0 + vec3(-uTime*0.22, uTime*0.16, uTime*0.12));
  float veins = smoothstep(0.62, 0.78, abs(sin(flow*12.0 + uTime*1.7)));
  float scan = 0.045*sin(vPosW.y*60.0 - uTime*6.0);
  float breath = 0.5 + 0.5*sin(uTime*2.0);
  col += scan + uVoice * 0.05;
  col = mix(col, uColorC, veins * (0.22 + fres*0.45 + uVoice*0.2));
  col += uColorB * (veins * 0.12 + breath * 0.025);
  float alpha = clamp(0.3 + fres*1.18 + veins*0.18 + uVoice*0.1, 0.0, 1.0) * uOpacity;
  gl_FragColor = vec4(col, alpha);
}
`;

/**
 * Wireframe noise-displaced blob core, rendered with three.js.
 * colorA/B/C are plain hex strings so the caller (ArcReactor) can
 * drive them from the app's active theme — no CSS-var read needed.
 */
export default function JarvisBlob({
  intensity = 1,
  colorA = "#0b6b8f",
  colorB = "#31e0ff",
  colorC = "#bff9ff",
  className,
}) {
  const hostRef = useRef(null);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;
  const uniformsRef = useRef(null);
  const shellUniformsRef = useRef(null);

  // Build the scene once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0.32 },
      uFreq: { value: 1.35 },
      uVoice: { value: 0 },
      uOpacity: { value: 1 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uColorC: { value: new THREE.Color(colorC) },
    };
    uniformsRef.current = uniforms;

    const geo = new THREE.IcosahedronGeometry(1, 96);
    const core = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      })
    );
    scene.add(core);

    const shellUniforms = {
      ...uniforms,
      uAmp: { value: 0.2 },
      uFreq: { value: 1.1 },
      uVoice: { value: 0 },
      uOpacity: { value: 0.22 },
    };
    shellUniformsRef.current = shellUniforms;
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.16, 24),
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: shellUniforms,
        transparent: true,
        wireframe: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    scene.add(shell);

    const particleGeo = new THREE.IcosahedronGeometry(1.45, 20);
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({
        color: new THREE.Color(colorC),
        size: 0.012,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scene.add(particles);

    const pointer = { x: 0, y: 0 };
    const onPointer = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const clock = new THREE.Clock();
    let raf = 0;
    let amp = 0.32;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      const energy = Math.min(1.6, intensityRef.current);
      const target = 0.12 + energy * 0.22;
      amp += (target - amp) * 0.07;
      uniforms.uTime.value = t;
      uniforms.uAmp.value = amp;
      uniforms.uVoice.value += (energy - uniforms.uVoice.value) * 0.08;
      shellUniforms.uTime.value = t;
      shellUniforms.uAmp.value = amp * 1.35;
      shellUniforms.uVoice.value = uniforms.uVoice.value;
      core.rotation.y = t * 0.18;
      core.rotation.x = Math.sin(t * 0.12) * 0.2;
      shell.rotation.y = -t * 0.12;
      shell.rotation.z = t * 0.05;
      particles.rotation.y = t * 0.06;
      particles.rotation.x = -t * 0.04;
      camera.position.x += (pointer.x * 0.5 - camera.position.x) * 0.04;
      camera.position.y += (-pointer.y * 0.4 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      renderer.dispose();
      geo.dispose();
      particleGeo.dispose();
      host.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-color in place when the theme changes — no remount needed.
  useEffect(() => {
    if (!uniformsRef.current) return;
    uniformsRef.current.uColorA.value.set(colorA);
    uniformsRef.current.uColorB.value.set(colorB);
    uniformsRef.current.uColorC.value.set(colorC);
    if (shellUniformsRef.current) {
      shellUniformsRef.current.uColorA.value.set(colorA);
      shellUniformsRef.current.uColorB.value.set(colorB);
      shellUniformsRef.current.uColorC.value.set(colorC);
    }
  }, [colorA, colorB, colorC]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
