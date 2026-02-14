import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BloomEffect, EffectComposer, EffectPass, RenderPass, SMAAEffect, SMAAPreset } from 'postprocessing';

import './Hyperspeed.css';

// Types
type DistortionType = 'mountainDistortion' | 'xyDistortion' | 'LongRaceDistortion' | 'turbulentDistortion' | 'turbulentDistortionStill' | 'deepDistortionStill' | 'deepDistortion';

interface HyperspeedOptions {
    onSpeedUp?: (ev: any) => void;
    onSlowDown?: (ev: any) => void;
    distortion?: DistortionType;
    length?: number;
    roadWidth?: number;
    islandWidth?: number;
    lanesPerRoad?: number;
    fov?: number;
    fovSpeedUp?: number;
    speedUp?: number;
    carLightsFade?: number;
    totalSideLightSticks?: number;
    lightPairsPerRoadWay?: number;
    shoulderLinesWidthPercentage?: number;
    brokenLinesWidthPercentage?: number;
    brokenLinesLengthPercentage?: number;
    lightStickWidth?: [number, number];
    lightStickHeight?: [number, number];
    movingAwaySpeed?: [number, number];
    movingCloserSpeed?: [number, number];
    carLightsLength?: [number, number];
    carLightsRadius?: [number, number];
    carWidthPercentage?: [number, number];
    carShiftX?: [number, number];
    carFloorSeparation?: [number, number];
    colors?: {
        roadColor: number;
        islandColor: number;
        background: number;
        shoulderLines: number;
        brokenLines: number;
        leftCars: number[];
        rightCars: number[];
        sticks: number;
    };
}

const DEFAULT_OPTIONS: Required<HyperspeedOptions> = {
    onSpeedUp: () => { },
    onSlowDown: () => { },
    distortion: 'turbulentDistortion',
    length: 400,
    roadWidth: 10,
    islandWidth: 2,
    lanesPerRoad: 4,
    fov: 90,
    fovSpeedUp: 150,
    speedUp: 2,
    carLightsFade: 0.4,
    totalSideLightSticks: 20,
    lightPairsPerRoadWay: 40,
    shoulderLinesWidthPercentage: 0.05,
    brokenLinesWidthPercentage: 0.1,
    brokenLinesLengthPercentage: 0.5,
    lightStickWidth: [0.12, 0.5],
    lightStickHeight: [1.3, 1.7],
    movingAwaySpeed: [60, 80],
    movingCloserSpeed: [-120, -160],
    carLightsLength: [400 * 0.03, 400 * 0.2],
    carLightsRadius: [0.05, 0.14],
    carWidthPercentage: [0.3, 0.5],
    carShiftX: [-0.8, 0.8],
    carFloorSeparation: [0, 5],
    colors: {
        roadColor: 0x080808,
        islandColor: 0x0a0a0a,
        background: 0x000000,
        shoulderLines: 0xffffff,
        brokenLines: 0xffffff,
        leftCars: [0xd856bf, 0x6750a2, 0xc247ac],
        rightCars: [0x03b3c3, 0x0e5ea5, 0x324555],
        sticks: 0x03b3c3
    }
};

const Hyperspeed = ({ effectOptions = {} }: { effectOptions?: HyperspeedOptions }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<any>(null);

    const options = { ...DEFAULT_OPTIONS, ...effectOptions };

    useEffect(() => {
        if (!containerRef.current) return;

        const app = new App(containerRef.current, options);
        appRef.current = app;
        app.loadAssets().then(() => {
            if (!app.disposed) app.init();
        });

        return () => {
            if (appRef.current) {
                appRef.current.dispose();
            }
        };
    }, [JSON.stringify(effectOptions)]); // Re-init if options change significantly

    return <div ref={containerRef} id="lights" className="w-full h-full absolute inset-0 overflow-hidden" />;
};

// --- Helper Functions ---
const nsin = (val: number) => Math.sin(val) * 0.5 + 0.5;
const random = (base: any) => {
    if (Array.isArray(base)) return Math.random() * (base[1] - base[0]) + base[0];
    return Math.random() * base;
};
const pickRandom = (arr: any) => {
    if (Array.isArray(arr)) return arr[Math.floor(Math.random() * arr.length)];
    return arr;
};
function lerp(current: number, target: number, speed = 0.1, limit = 0.001) {
    let change = (target - current) * speed;
    if (Math.abs(change) < limit) {
        change = target - current;
    }
    return change;
}
function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer, setSize: any) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        setSize(width, height, false);
    }
    return needResize;
}

// --- Distortion Uniforms & Shaders ---
const mountainUniforms = {
    uFreq: { value: new THREE.Vector3(3, 6, 10) },
    uAmp: { value: new THREE.Vector3(30, 30, 20) }
};
const xyUniforms = {
    uFreq: { value: new THREE.Vector2(5, 2) },
    uAmp: { value: new THREE.Vector2(25, 15) }
};
const LongRaceUniforms = {
    uFreq: { value: new THREE.Vector2(2, 3) },
    uAmp: { value: new THREE.Vector2(35, 10) }
};
const turbulentUniforms = {
    uFreq: { value: new THREE.Vector4(4, 8, 8, 1) },
    uAmp: { value: new THREE.Vector4(25, 5, 10, 10) }
};
const deepUniforms = {
    uFreq: { value: new THREE.Vector2(4, 8) },
    uAmp: { value: new THREE.Vector2(10, 20) },
    uPowY: { value: new THREE.Vector2(20, 2) }
};

const DISTORTIONS: any = {
    mountainDistortion: {
        uniforms: mountainUniforms,
        getDistortion: `
      uniform vec3 uAmp;
      uniform vec3 uFreq;
      #define PI 3.14159265358979
      float nsin_dist(float val){
        return sin(val) * 0.5 + 0.5;
      }
      vec3 getDistortion(float progress){
        float movementProgressFix = 0.02;
        return vec3( 
          cos(progress * PI * uFreq.x + uTime) * uAmp.x - cos(movementProgressFix * PI * uFreq.x + uTime) * uAmp.x,
          nsin_dist(progress * PI * uFreq.y + uTime) * uAmp.y - nsin_dist(movementProgressFix * PI * uFreq.y + uTime) * uAmp.y,
          nsin_dist(progress * PI * uFreq.z + uTime) * uAmp.z - nsin_dist(movementProgressFix * PI * uFreq.z + uTime) * uAmp.z
        );
      }
    `,
        getJS: (progress: number, time: number) => {
            let movementProgressFix = 0.02;
            let uFreq = mountainUniforms.uFreq.value;
            let uAmp = mountainUniforms.uAmp.value;
            let distortion = new THREE.Vector3(
                Math.cos(progress * Math.PI * uFreq.x + time) * uAmp.x -
                Math.cos(movementProgressFix * Math.PI * uFreq.x + time) * uAmp.x,
                nsin(progress * Math.PI * uFreq.y + time) * uAmp.y -
                nsin(movementProgressFix * Math.PI * uFreq.y + time) * uAmp.y,
                nsin(progress * Math.PI * uFreq.z + time) * uAmp.z -
                nsin(movementProgressFix * Math.PI * uFreq.z + time) * uAmp.z
            );
            let lookAtAmp = new THREE.Vector3(2, 2, 2);
            let lookAtOffset = new THREE.Vector3(0, 0, -5);
            return distortion.multiply(lookAtAmp).add(lookAtOffset);
        }
    },
    xyDistortion: {
        uniforms: xyUniforms,
        getDistortion: `
      uniform vec2 uFreq;
      uniform vec2 uAmp;
      #define PI 3.14159265358979
      vec3 getDistortion(float progress){
        float movementProgressFix = 0.02;
        return vec3( 
          cos(progress * PI * uFreq.x + uTime) * uAmp.x - cos(movementProgressFix * PI * uFreq.x + uTime) * uAmp.x,
          sin(progress * PI * uFreq.y + PI/2. + uTime) * uAmp.y - sin(movementProgressFix * PI * uFreq.y + PI/2. + uTime) * uAmp.y,
          0.
        );
      }
    `,
        getJS: (progress: number, time: number) => {
            let movementProgressFix = 0.02;
            let uFreq = xyUniforms.uFreq.value;
            let uAmp = xyUniforms.uAmp.value;
            let distortion = new THREE.Vector3(
                Math.cos(progress * Math.PI * uFreq.x + time) * uAmp.x -
                Math.cos(movementProgressFix * Math.PI * uFreq.x + time) * uAmp.x,
                Math.sin(progress * Math.PI * uFreq.y + time + Math.PI / 2) * uAmp.y -
                Math.sin(movementProgressFix * Math.PI * uFreq.y + time + Math.PI / 2) * uAmp.y,
                0
            );
            let lookAtAmp = new THREE.Vector3(2, 0.4, 1);
            let lookAtOffset = new THREE.Vector3(0, 0, -3);
            return distortion.multiply(lookAtAmp).add(lookAtOffset);
        }
    },
    LongRaceDistortion: {
        uniforms: LongRaceUniforms,
        getDistortion: `
      uniform vec2 uFreq;
      uniform vec2 uAmp;
      #define PI 3.14159265358979
      vec3 getDistortion(float progress){
        float camProgress = 0.0125;
        return vec3( 
          sin(progress * PI * uFreq.x + uTime) * uAmp.x - sin(camProgress * PI * uFreq.x + uTime) * uAmp.x,
          sin(progress * PI * uFreq.y + uTime) * uAmp.y - sin(camProgress * PI * uFreq.y + uTime) * uAmp.y,
          0.
        );
      }
    `,
        getJS: (progress: number, time: number) => {
            let camProgress = 0.0125;
            let uFreq = LongRaceUniforms.uFreq.value;
            let uAmp = LongRaceUniforms.uAmp.value;
            let distortion = new THREE.Vector3(
                Math.sin(progress * Math.PI * uFreq.x + time) * uAmp.x -
                Math.sin(camProgress * Math.PI * uFreq.x + time) * uAmp.x,
                Math.sin(progress * Math.PI * uFreq.y + time) * uAmp.y -
                Math.sin(camProgress * Math.PI * uFreq.y + time) * uAmp.y,
                0
            );
            let lookAtAmp = new THREE.Vector3(1, 1, 0);
            let lookAtOffset = new THREE.Vector3(0, 0, -5);
            return distortion.multiply(lookAtAmp).add(lookAtOffset);
        }
    },
    turbulentDistortion: {
        uniforms: turbulentUniforms,
        getDistortion: `
      uniform vec4 uFreq;
      uniform vec4 uAmp;
      float nsin_turb(float val){
        return sin(val) * 0.5 + 0.5;
      }
      #define PI 3.14159265358979
      float getDistortionX(float progress){
        return (
          cos(PI * progress * uFreq.r + uTime) * uAmp.r +
          pow(cos(PI * progress * uFreq.g + uTime * (uFreq.g / uFreq.r)), 2. ) * uAmp.g
        );
      }
      float getDistortionY(float progress){
        return (
          -nsin_turb(PI * progress * uFreq.b + uTime) * uAmp.b +
          -pow(nsin_turb(PI * progress * uFreq.a + uTime / (uFreq.b / uFreq.a)), 5.) * uAmp.a
        );
      }
      vec3 getDistortion(float progress){
        return vec3(
          getDistortionX(progress) - getDistortionX(0.0125),
          getDistortionY(progress) - getDistortionY(0.0125),
          0.
        );
      }
    `,
        getJS: (progress: number, time: number) => {
            const uFreq = turbulentUniforms.uFreq.value;
            const uAmp = turbulentUniforms.uAmp.value;
            const getX = (p: number) =>
                Math.cos(Math.PI * p * uFreq.x + time) * uAmp.x +
                Math.pow(Math.cos(Math.PI * p * uFreq.y + time * (uFreq.y / uFreq.x)), 2) * uAmp.y;
            const getY = (p: number) =>
                -nsin(Math.PI * p * uFreq.z + time) * uAmp.z -
                Math.pow(nsin(Math.PI * p * uFreq.w + time / (uFreq.z / uFreq.w)), 5) * uAmp.w;
            let distortion = new THREE.Vector3(
                getX(progress) - getX(progress + 0.007),
                getY(progress) - getY(progress + 0.007),
                0
            );
            let lookAtAmp = new THREE.Vector3(-2, -5, 0);
            let lookAtOffset = new THREE.Vector3(0, 0, -10);
            return distortion.multiply(lookAtAmp).add(lookAtOffset);
        }
    },
    turbulentDistortionStill: {
        uniforms: turbulentUniforms,
        getDistortion: `
      uniform vec4 uFreq;
      uniform vec4 uAmp;
      float nsin_turb_still(float val){
        return sin(val) * 0.5 + 0.5;
      }
      #define PI 3.14159265358979
      float getDistortionX(float progress){
        return (
          cos(PI * progress * uFreq.r) * uAmp.r +
          pow(cos(PI * progress * uFreq.g * (uFreq.g / uFreq.r)), 2. ) * uAmp.g
        );
      }
      float getDistortionY(float progress){
        return (
          -nsin_turb_still(PI * progress * uFreq.b) * uAmp.b +
          -pow(nsin_turb_still(PI * progress * uFreq.a / (uFreq.b / uFreq.a)), 5.) * uAmp.a
        );
      }
      vec3 getDistortion(float progress){
        return vec3(
          getDistortionX(progress) - getDistortionX(0.02),
          getDistortionY(progress) - getDistortionY(0.02),
          0.
        );
      }
    `
    },
    deepDistortionStill: {
        uniforms: deepUniforms,
        getDistortion: `
      uniform vec4 uFreq;
      uniform vec4 uAmp;
      uniform vec2 uPowY;
      #define PI 3.14159265358979
      float getDistortionX(float progress){
        return (
          sin(progress * PI * uFreq.x) * uAmp.x * 2.
        );
      }
      float getDistortionY(float progress){
        return (
          pow(abs(progress * uPowY.x), uPowY.y) + sin(progress * PI * uFreq.y) * uAmp.y
        );
      }
      vec3 getDistortion(float progress){
        return vec3(
          getDistortionX(progress) - getDistortionX(0.02),
          getDistortionY(progress) - getDistortionY(0.05),
          0.
        );
      }
    `
    },
    deepDistortion: {
        uniforms: deepUniforms,
        getDistortion: `
      uniform vec4 uFreq;
      uniform vec4 uAmp;
      uniform vec2 uPowY;
      #define PI 3.14159265358979
      float getDistortionX(float progress){
        return (
          sin(progress * PI * uFreq.x + uTime) * uAmp.x
        );
      }
      float getDistortionY(float progress){
        return (
          pow(abs(progress * uPowY.x), uPowY.y) + sin(progress * PI * uFreq.y + uTime) * uAmp.y
        );
      }
      vec3 getDistortion(float progress){
        return vec3(
          getDistortionX(progress) - getDistortionX(0.02),
          getDistortionY(progress) - getDistortionY(0.02),
          0.
        );
      }
    `,
        getJS: (progress: number, time: number) => {
            const uFreq = deepUniforms.uFreq.value;
            const uAmp = deepUniforms.uAmp.value;
            const uPowY = deepUniforms.uPowY.value;
            const getX = (p: number) => Math.sin(p * Math.PI * uFreq.x + time) * uAmp.x;
            const getY = (p: number) => Math.pow(p * uPowY.x, uPowY.y) + Math.sin(p * Math.PI * uFreq.y + time) * uAmp.y;
            let distortion = new THREE.Vector3(
                getX(progress) - getX(progress + 0.01),
                getY(progress) - getY(progress + 0.01),
                0
            );
            let lookAtAmp = new THREE.Vector3(-2, -4, 0);
            let lookAtOffset = new THREE.Vector3(0, 0, -10);
            return distortion.multiply(lookAtAmp).add(lookAtOffset);
        }
    }
};

const distortion_uniforms = {
    uDistortionX: { value: new THREE.Vector2(80, 3) },
    uDistortionY: { value: new THREE.Vector2(-40, 2.5) }
};

const distortion_vertex = `
  #define PI 3.14159265358979
  uniform vec2 uDistortionX;
  uniform vec2 uDistortionY;
  float nsin_orig(float val){
    return sin(val) * 0.5 + 0.5;
  }
  vec3 getDistortion(float progress){
    progress = clamp(progress, 0., 1.);
    float xAmp = uDistortionX.r;
    float xFreq = uDistortionX.g;
    float yAmp = uDistortionY.r;
    float yFreq = uDistortionY.g;
    return vec3( 
      xAmp * nsin_orig(progress * PI * xFreq - PI / 2.),
      yAmp * nsin_orig(progress * PI * yFreq - PI / 2.),
      0.
    );
  }
`;

// --- Core App Class ---
class App {
    options: any;
    container: HTMLElement;
    renderer: THREE.WebGLRenderer;
    composer: EffectComposer;
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    fogUniforms: any;
    clock: THREE.Clock;
    assets: any;
    disposed: boolean = false;
    road!: Road;
    leftCarLights!: CarLights;
    rightCarLights!: CarLights;
    leftSticks!: LightsSticks;
    fovTarget: number;
    speedUpTarget: number = 0;
    speedUp: number = 0;
    timeOffset: number = 0;
    renderPass!: RenderPass;
    bloomPass!: EffectPass;
    smaaPass!: EffectPass;

    constructor(container: HTMLElement, options: any) {
        this.options = options;
        if (this.options.distortion && typeof this.options.distortion === 'string') {
            this.options.distortion = DISTORTIONS[this.options.distortion] || {
                uniforms: distortion_uniforms,
                getDistortion: distortion_vertex
            };
        }
        this.container = container;
        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.setSize(container.offsetWidth, container.offsetHeight, false);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.composer = new EffectComposer(this.renderer);
        container.append(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(options.fov, container.offsetWidth / container.offsetHeight, 0.1, 10000);
        this.camera.position.set(0, 8, -5);
        this.scene = new THREE.Scene();

        let fog = new THREE.Fog(options.colors.background, options.length * 0.2, options.length * 500);
        this.scene.fog = fog;
        this.fogUniforms = { fogColor: { value: fog.color }, fogNear: { value: fog.near }, fogFar: { value: fog.far } };
        this.clock = new THREE.Clock();
        this.assets = {};

        this.fovTarget = options.fov;
        this.onWindowResize = this.onWindowResize.bind(this);
        this.tick = this.tick.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
        this.onContextMenu = this.onContextMenu.bind(this);
        this.setSize = this.setSize.bind(this);

        window.addEventListener('resize', this.onWindowResize);
    }

    onWindowResize() {
        if (!this.container) return;
        const width = this.container.offsetWidth;
        const height = this.container.offsetHeight;
        this.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    setSize(width: number, height: number, updateStyles: boolean) {
        this.renderer.setSize(width, height, updateStyles);
        this.composer.setSize(width, height, updateStyles);
    }

    initPasses() {
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.bloomPass = new EffectPass(this.camera, new BloomEffect({ luminanceThreshold: 0.2, luminanceSmoothing: 0, resolutionScale: 1 }));
        this.smaaPass = new EffectPass(this.camera, new SMAAEffect({ preset: SMAAPreset.MEDIUM } as any));

        this.renderPass.renderToScreen = false;
        this.bloomPass.renderToScreen = false;
        this.smaaPass.renderToScreen = true;

        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.bloomPass);
        this.composer.addPass(this.smaaPass);
    }

    loadAssets() {
        return new Promise(resolve => {
            const manager = new THREE.LoadingManager(resolve as any);
            const searchImage = new Image();
            const areaImage = new Image();
            this.assets.smaa = {};
            searchImage.onload = () => { this.assets.smaa.search = searchImage; manager.itemEnd('smaa-search'); };
            areaImage.onload = () => { this.assets.smaa.area = areaImage; manager.itemEnd('smaa-area'); };
            manager.itemStart('smaa-search');
            manager.itemStart('smaa-area');
            searchImage.src = SMAAEffect.searchImageDataURL;
            areaImage.src = SMAAEffect.areaImageDataURL;
        });
    }

    init() {
        this.initPasses();
        const options = this.options;
        this.road = new Road(this, options);
        this.road.init();

        this.leftCarLights = new CarLights(this, options, options.colors.leftCars, options.movingAwaySpeed, new THREE.Vector2(0, 1 - options.carLightsFade));
        this.leftCarLights.init();
        this.leftCarLights.mesh.position.setX(-options.roadWidth / 2 - options.islandWidth / 2);

        this.rightCarLights = new CarLights(this, options, options.colors.rightCars, options.movingCloserSpeed, new THREE.Vector2(1, 0 + options.carLightsFade));
        this.rightCarLights.init();
        this.rightCarLights.mesh.position.setX(options.roadWidth / 2 + options.islandWidth / 2);

        this.leftSticks = new LightsSticks(this, options);
        this.leftSticks.init();
        this.leftSticks.mesh.position.setX(-(options.roadWidth + options.islandWidth / 2));

        this.container.addEventListener('mousedown', this.onMouseDown);
        this.container.addEventListener('mouseup', this.onMouseUp);
        this.container.addEventListener('mouseout', this.onMouseUp);
        this.container.addEventListener('touchstart', this.onTouchStart, { passive: true } as any);
        this.container.addEventListener('touchend', this.onTouchEnd, { passive: true } as any);
        this.container.addEventListener('touchcancel', this.onTouchEnd, { passive: true } as any);
        this.container.addEventListener('contextmenu', this.onContextMenu);

        this.tick();
    }

    onMouseDown(ev: MouseEvent) { this.options.onSpeedUp?.(ev); this.fovTarget = this.options.fovSpeedUp; this.speedUpTarget = this.options.speedUp; }
    onMouseUp(ev: MouseEvent) { this.options.onSlowDown?.(ev); this.fovTarget = this.options.fov; this.speedUpTarget = 0; }
    onTouchStart(ev: TouchEvent) { this.options.onSpeedUp?.(ev); this.fovTarget = this.options.fovSpeedUp; this.speedUpTarget = this.options.speedUp; }
    onTouchEnd(ev: TouchEvent) { this.options.onSlowDown?.(ev); this.fovTarget = this.options.fov; this.speedUpTarget = 0; }
    onContextMenu(ev: MouseEvent) { ev.preventDefault(); }

    update(delta: number) {
        let lerpPercentage = Math.exp(-(-60 * Math.log2(1 - 0.1)) * delta);
        this.speedUp += lerp(this.speedUp, this.speedUpTarget, lerpPercentage, 0.00001);
        this.timeOffset += this.speedUp * delta;
        let time = this.clock.elapsedTime + this.timeOffset;

        this.rightCarLights.update(time);
        this.leftCarLights.update(time);
        this.leftSticks.update(time);
        this.road.update(time);

        let updateCamera = false;
        let fovChange = lerp(this.camera.fov, this.fovTarget, lerpPercentage);
        if (Math.abs(fovChange) > 0.01) {
            this.camera.fov += fovChange;
            updateCamera = true;
        }

        if (this.options.distortion.getJS) {
            const distortion = this.options.distortion.getJS(0.025, time);
            this.camera.lookAt(new THREE.Vector3(this.camera.position.x + distortion.x, this.camera.position.y + distortion.y, this.camera.position.z + distortion.z));
            updateCamera = true;
        }
        if (updateCamera) this.camera.updateProjectionMatrix();
    }

    tick() {
        if (this.disposed) return;
        resizeRendererToDisplaySize(this.renderer, this.setSize);
        const delta = this.clock.getDelta();
        this.update(delta);
        this.composer.render(delta);
        requestAnimationFrame(this.tick);
    }

    dispose() {
        this.disposed = true;
        window.removeEventListener('resize', this.onWindowResize);
        this.renderer.dispose();
        this.composer.dispose();
        this.scene.clear();
        if (this.container) {
            this.container.innerHTML = '';
            this.container.removeEventListener('mousedown', this.onMouseDown);
            this.container.removeEventListener('mouseup', this.onMouseUp);
            this.container.removeEventListener('mouseout', this.onMouseUp);
            this.container.removeEventListener('touchstart', this.onTouchStart);
            this.container.removeEventListener('touchend', this.onTouchEnd);
            this.container.removeEventListener('touchcancel', this.onTouchEnd);
            this.container.removeEventListener('contextmenu', this.onContextMenu);
        }
    }
}

// --- Sub-components (Road, CarLights, LightsSticks) ---
class Road {
    webgl: App;
    options: any;
    mesh!: THREE.Mesh;
    constructor(webgl: App, options: any) { this.webgl = webgl; this.options = options; }
    init() {
        const options = this.options;
        const geometry = new THREE.PlaneGeometry(options.roadWidth + options.islandWidth, options.length, 20, 100);
        const material = new THREE.ShaderMaterial({
            fragmentShader: roadFragment,
            vertexShader: roadVertex,
            side: THREE.DoubleSide,
            uniforms: Object.assign({
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(options.colors.roadColor) },
                uIslandColor: { value: new THREE.Color(options.colors.islandColor) },
                uShoulderLinesWidthPercentage: { value: options.shoulderLinesWidthPercentage },
                uBrokenLinesWidthPercentage: { value: options.brokenLinesWidthPercentage },
                uBrokenLinesLengthPercentage: { value: options.brokenLinesLengthPercentage },
                uShoulderLinesColor: { value: new THREE.Color(options.colors.shoulderLines) },
                uBrokenLinesColor: { value: new THREE.Color(options.colors.brokenLines) },
                uRoadWidth: { value: options.roadWidth },
                uIslandWidth: { value: options.islandWidth },
                uLanesPerRoad: { value: options.lanesPerRoad },
                uTravelLength: { value: options.length }
            }, this.webgl.fogUniforms, options.distortion.uniforms)
        });
        material.onBeforeCompile = shader => {
            shader.vertexShader = shader.vertexShader.replace('#include <getDistortion_vertex>', options.distortion.getDistortion);
        };
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.z = -options.length / 2;
        this.webgl.scene.add(this.mesh);
    }
    update(time: number) { (this.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time; }
}

class CarLights {
    webgl: App;
    options: any;
    colors: any;
    speed: number[];
    fade: THREE.Vector2;
    mesh!: THREE.Mesh;
    constructor(webgl: App, options: any, colors: any, speed: number[], fade: THREE.Vector2) {
        this.webgl = webgl; this.options = options; this.colors = colors; this.speed = speed; this.fade = fade;
    }
    init() {
        const options = this.options;
        let curve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1));
        let baseGeo = new THREE.TubeGeometry(curve, 40, 1, 8, false);
        let instanced = new THREE.InstancedBufferGeometry().copy(baseGeo as any) as any;
        instanced.instanceCount = options.lightPairsPerRoadWay * 2;
        let laneWidth = options.roadWidth / options.lanesPerRoad;
        let aOffset: number[] = [], aMetrics: number[] = [], aColor: number[] = [];
        let colors = Array.isArray(this.colors) ? this.colors.map(c => new THREE.Color(c)) : new THREE.Color(this.colors);

        for (let i = 0; i < options.lightPairsPerRoadWay; i++) {
            let radius = random(options.carLightsRadius), length = random(options.carLightsLength), speed = random(this.speed);
            let laneX = (i % options.lanesPerRoad) * laneWidth - options.roadWidth / 2 + laneWidth / 2;
            laneX += random(options.carShiftX) * laneWidth;
            let offsetY = random(options.carFloorSeparation) + radius * 1.3, offsetZ = -random(options.length);
            let carWidth = random(options.carWidthPercentage) * laneWidth;

            const pushPoint = (x: number) => {
                aOffset.push(x, offsetY, offsetZ);
                aMetrics.push(radius, length, speed);
                let c = pickRandom(colors); aColor.push(c.r, c.g, c.b);
            };
            pushPoint(laneX - carWidth / 2);
            pushPoint(laneX + carWidth / 2);
        }
        instanced.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 3));
        instanced.setAttribute('aMetrics', new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3));
        instanced.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3));

        const material = new THREE.ShaderMaterial({
            fragmentShader: carLightsFragment,
            vertexShader: carLightsVertex,
            transparent: true,
            uniforms: Object.assign({
                uTime: { value: 0 },
                uTravelLength: { value: options.length },
                uFade: { value: this.fade }
            }, this.webgl.fogUniforms, options.distortion.uniforms)
        });
        material.onBeforeCompile = shader => {
            shader.vertexShader = shader.vertexShader.replace('#include <getDistortion_vertex>', options.distortion.getDistortion);
        };
        this.mesh = new THREE.Mesh(instanced, material);
        this.mesh.frustumCulled = false;
        this.webgl.scene.add(this.mesh);
    }
    update(time: number) { (this.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time; }
}

class LightsSticks {
    webgl: App;
    options: any;
    mesh!: THREE.Mesh;
    constructor(webgl: App, options: any) { this.webgl = webgl; this.options = options; }
    init() {
        const options = this.options;
        const baseGeo = new THREE.BoxGeometry(1, 1, 1);
        const instanced = new THREE.InstancedBufferGeometry().copy(baseGeo as any) as any;
        instanced.instanceCount = options.totalSideLightSticks;
        let aOffset: number[] = [], aMetrics: number[] = [], aColor: number[] = [];
        const color = new THREE.Color(options.colors.sticks);

        for (let i = 0; i < options.totalSideLightSticks; i++) {
            let width = random(options.lightStickWidth), height = random(options.lightStickHeight);
            aOffset.push((i % 2 === 0 ? -1 : 1) * (options.roadWidth + options.islandWidth / 2), height / 2, -random(options.length));
            aMetrics.push(width, height, 0);
            aColor.push(color.r, color.g, color.b);
        }
        instanced.setAttribute('aOffset', new THREE.InstancedBufferAttribute(new Float32Array(aOffset), 3));
        instanced.setAttribute('aMetrics', new THREE.InstancedBufferAttribute(new Float32Array(aMetrics), 3));
        instanced.setAttribute('aColor', new THREE.InstancedBufferAttribute(new Float32Array(aColor), 3));

        const material = new THREE.ShaderMaterial({
            fragmentShader: lightsSticksFragment,
            vertexShader: lightsSticksVertex,
            transparent: true,
            uniforms: Object.assign({ uTime: { value: 0 }, uTravelLength: { value: options.length } }, this.webgl.fogUniforms, options.distortion.uniforms)
        });
        material.onBeforeCompile = shader => {
            shader.vertexShader = shader.vertexShader.replace('#include <getDistortion_vertex>', options.distortion.getDistortion);
        };
        this.mesh = new THREE.Mesh(instanced, material);
        this.mesh.frustumCulled = false;
        this.webgl.scene.add(this.mesh);
    }
    update(time: number) { (this.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time; }
}

// --- Shaders ---
const roadVertex = `
  #include <getDistortion_vertex>
  uniform float uTime;
  uniform float uTravelLength;
  varying vec2 vUv;
  varying vec3 vViewPosition;
  void main() {
    vec3 transformed = position.xyz;
    float progress = (transformed.y + uTravelLength / 2.) / uTravelLength;
    vec3 distortion = getDistortion(progress);
    transformed.x += distortion.x;
    transformed.z += distortion.y;
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const roadFragment = `
  uniform vec3 uColor;
  uniform vec3 uIslandColor;
  uniform vec3 uShoulderLinesColor;
  uniform vec3 uBrokenLinesColor;
  uniform float uShoulderLinesWidthPercentage;
  uniform float uBrokenLinesWidthPercentage;
  uniform float uBrokenLinesLengthPercentage;
  uniform float uRoadWidth;
  uniform float uIslandWidth;
  uniform float uLanesPerRoad;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    float roadWidth = uRoadWidth;
    float islandWidth = uIslandWidth;
    float totalWidth = roadWidth + islandWidth;
    float laneWidth = roadWidth / uLanesPerRoad;
    
    vec3 color = uColor;
    float x = abs(uv.x - 0.5) * totalWidth;
    
    if (x < islandWidth / 2.) {
      color = uIslandColor;
    } else {
      float roadX = x - islandWidth / 2.;
      // Shoulder lines
      if (roadX < roadWidth * uShoulderLinesWidthPercentage || roadX > roadWidth * (1. - uShoulderLinesWidthPercentage)) {
        color = uShoulderLinesColor;
      }
      // Broken lines
      float laneIndex = floor(roadX / laneWidth);
      if (laneIndex > 0. && laneIndex < uLanesPerRoad) {
        float laneX = mod(roadX, laneWidth);
        if (abs(laneX) < roadWidth * uBrokenLinesWidthPercentage / 2.) {
          if (mod(uv.y * 10., 1.) < uBrokenLinesLengthPercentage) {
            color = uBrokenLinesColor;
          }
        }
      }
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

const carLightsVertex = `
  #include <getDistortion_vertex>
  attribute vec3 aOffset;
  attribute vec3 aMetrics;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uTravelLength;
  varying vec3 vColor;
  varying float vLife;
  void main() {
    vec3 transformed = position.xyz;
    float radius = aMetrics.x;
    float length = aMetrics.y;
    float speed = aMetrics.z;
    transformed.xy *= radius;
    transformed.z *= length;
    
    float zOffset = mod(aOffset.z - uTime * speed, uTravelLength);
    vec3 pos = vec3(aOffset.x, aOffset.y, -zOffset);
    
    float progress = zOffset / uTravelLength;
    vec3 distortion = getDistortion(progress);
    pos.x += distortion.x;
    pos.y += distortion.y;
    
    transformed += pos;
    vColor = aColor;
    vLife = 1. - progress;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const carLightsFragment = `
  varying vec3 vColor;
  varying float vLife;
  uniform vec2 uFade;
  void main() {
    float alpha = smoothstep(uFade.x, uFade.y, vLife);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const lightsSticksVertex = `
  #include <getDistortion_vertex>
  attribute vec3 aOffset;
  attribute vec3 aMetrics;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uTravelLength;
  varying vec3 vColor;
  void main() {
    vec3 transformed = position.xyz;
    transformed.x *= aMetrics.x;
    transformed.y *= aMetrics.y;
    
    float zOffset = mod(aOffset.z, uTravelLength);
    vec3 pos = vec3(aOffset.x, aOffset.y, -zOffset);
    float progress = zOffset / uTravelLength;
    vec3 distortion = getDistortion(progress);
    pos.x += distortion.x;
    pos.y += distortion.y;
    
    transformed += pos;
    vColor = aColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const lightsSticksFragment = `
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, 1.0);
  }
`;

export default Hyperspeed;
