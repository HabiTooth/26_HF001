'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LESION_LABEL, RISK_TAG } from '@/lib/lesionRisk';
import { RISK_MODEL_FILL } from '@/lib/riskColors';
import { isActiveLesion } from '@/lib/lesionState';
import { toothName } from '@/lib/dentition';
import type { LesionType } from '@/lib/api/common';
import type { SurfaceType } from '@/lib/api/report';
import { ORAL_MODEL_PATH, ORAL_VIEW_LIMITS, prepareOralModel } from './oralModel';
import {
  MARKER_COLOR,
  buildToothFrames,
  coverageMask,
  createMarkerMesh,
  lesionState,
  markerBasePositions,
  markerMaterial,
  updateMarker,
  type ToothLesion,
  type ToothLesionState,
} from './lesionMarkers';

export type RiskLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ToothAnalysisResult {
  toothNumber: string;
  lesionType: string;
  areaRatio: number;
  riskLevel: RiskLevel;
}

export type MarkerVisibility = Record<LesionType, boolean>;
export type PoseName = 'front' | 'inside';

interface ThreeSceneProps {
  analysisResults: ToothAnalysisResult[];
  lesions?: ToothLesion[];
  missingTeeth?: number[];
  scannedTeeth?: number[];
  onToothSelect?: (fdi: string | null) => void;
  selectedTooth?: string | null;
  calibrationMode?: boolean;
  minimal?: boolean;
  zoom?: number;
  fitToViewport?: boolean;
  resolutionScale?: number;
  visibleMarkers?: MarkerVisibility;
  initialPose?: PoseName;
  // 볼 면. 없으면 병변 위치로 결정
  focusSurface?: SurfaceType | null;
  // 치아 미선택 시 마커 표시 여부
  idleMarkers?: boolean;
  toothColors?: Record<string, string>;
}

type ToothState = 'lesion' | 'clean' | 'unscanned';

interface ToothInfo {
  fdi: string;
  state: ToothState;
  lesion: ToothLesionState;
  result?: ToothAnalysisResult;
  // 치석 먼저
  results?: ToothAnalysisResult[];
}

interface TooltipState extends ToothInfo {
  x: number;
  y: number;
}

const MODEL_PATH = ORAL_MODEL_PATH;
// 빼면 이펙트 무한 갱신
const NO_LESIONS: ToothLesion[] = [];
const NO_TEETH: number[] = [];
const LESION_TYPES: LesionType[] = ['CALCULUS', 'PLAQUE'];

function disposeModel(model: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) =>
      materials.add(material),
    );
  });
  materials.forEach((material) => {
    Object.values(material).forEach((value) => {
      if (value instanceof THREE.Texture) textures.add(value);
    });
    material.dispose();
  });
  textures.forEach((texture) => texture.dispose());
}

// Y 크면 교합면 뷰, 작으면 정면 뷰
const VIEW_DIR = new THREE.Vector3(0, Math.sin(0.08), Math.cos(0.08));

function radialShadowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const FIT_MARGIN = 1.06;
const FOCUS_DISTANCE = 0.34;
// 확대 시 시선 아래로 이동
const FOCUS_TARGET_DROP = 0.04;
// 전체 보기 모형 위치 보정. 그림자 자리용
const IDLE_LIFT = 0.07;
// 전체 보기 휠 확대 한계
const IDLE_MIN_DISTANCE = 0.64;
// 확대 시 좌우 회전 폭
const FOCUS_AZIMUTH = (80 * Math.PI) / 180;
const FOCUS_DURATION = 550;
const POSE_DURATION = 650;
// 이 거리 이상 이동은 드래그
const CLICK_SLOP = 6;

// 미촬영 치아 색. 깨끗(하늘색)과 구분
const UNSCANNED_COLOR = '#C7C7CC';
const UNSCANNED_OPACITY = 0.6;
const DIM_OPACITY = 0.3;
// 확대 시 선택 치아 색. 마커 색과 구분
const FOCUS_TOOTH_COLOR = '#F6F2EC';

const toothMaterial = (color: string) =>
  new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.08,
    roughness: 0.3,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    sheen: 0.3,
    sheenColor: 0xffffff,
    envMapIntensity: 0.9,
  });

const unscannedMaterial = () =>
  new THREE.MeshStandardMaterial({
    color: UNSCANNED_COLOR,
    emissive: UNSCANNED_COLOR,
    emissiveIntensity: 0,
    roughness: 0.9,
    metalness: 0,
    transparent: true,
    opacity: UNSCANNED_OPACITY,
  });

const labelOf = (fdi: string) => {
  const tooth = Number(fdi);
  return Number.isInteger(tooth) ? toothName(tooth) : `${fdi}번 치아`;
};

const lesionLabel = (lesionType: string) => LESION_LABEL[lesionType as LesionType] ?? lesionType;

const FDI_NAME_PATTERN = /tooth[_\-\s]?(\d{2})/i;

function extractFdi(name: string): string | null {
  const m = name.match(FDI_NAME_PATTERN);
  return m ? m[1] : null;
}

const RISK_ORDER: RiskLevel[] = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const beats = (next: ToothAnalysisResult, prev: ToothAnalysisResult) => {
  const gap = RISK_ORDER.indexOf(next.riskLevel) - RISK_ORDER.indexOf(prev.riskLevel);
  if (gap !== 0) return gap > 0;
  return next.lesionType === 'CALCULUS' && prev.lesionType !== 'CALCULUS';
};

const calculusFirst = (rows: ToothAnalysisResult[]) =>
  [...rows].sort(
    (a, b) => Number(b.lesionType === 'CALCULUS') - Number(a.lesionType === 'CALCULUS'),
  );

function groupByTooth(results: ToothAnalysisResult[]): Map<string, ToothAnalysisResult[]> {
  const byTooth = new Map<string, ToothAnalysisResult[]>();
  for (const result of results) {
    const list = byTooth.get(result.toothNumber) ?? [];
    list.push(result);
    byTooth.set(result.toothNumber, list);
  }
  return byTooth;
}

function groupLesions(lesions: ToothLesion[]): Map<string, ToothLesion[]> {
  const byTooth = new Map<string, ToothLesion[]>();
  for (const lesion of lesions) {
    const key = String(lesion.toothNumber);
    const list = byTooth.get(key) ?? [];
    list.push(lesion);
    byTooth.set(key, list);
  }
  return byTooth;
}

const worst = (rows: ToothAnalysisResult[]) =>
  rows.reduce<ToothAnalysisResult | undefined>(
    (kept, row) => (!kept || beats(row, kept) ? row : kept),
    undefined,
  );

const easeOut = (t: number) => 1 - (1 - t) ** 3;

export default function ThreeScene({
  analysisResults,
  lesions = NO_LESIONS,
  missingTeeth = NO_TEETH,
  scannedTeeth = NO_TEETH,
  onToothSelect,
  selectedTooth = null,
  calibrationMode = false,
  minimal = false,
  zoom = 1,
  fitToViewport = false,
  resolutionScale = 1,
  visibleMarkers,
  initialPose = 'front',
  focusSurface = null,
  idleMarkers = true,
  toothColors,
}: ThreeSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const analysisResultsRef = useRef(analysisResults);
  const lesionsRef = useRef(lesions);
  const missingRef = useRef(missingTeeth);
  const scannedRef = useRef(scannedTeeth);
  const onSelectRef = useRef(onToothSelect);
  const selectedRef = useRef<string | null>(selectedTooth);
  const focusSurfaceRef = useRef<SurfaceType | null>(focusSurface);
  const toothColorsRef = useRef(toothColors);
  const recolorRef = useRef<(() => void) | null>(null);
  const applyRef = useRef<(() => void) | null>(null);
  const visibilityRef = useRef<(() => void) | null>(null);
  const focusRef = useRef<(() => void) | null>(null);
  const poseRef = useRef<((inside: boolean) => void) | null>(null);
  const [inside, setInside] = useState(initialPose === 'inside');
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [show, setShow] = useState<MarkerVisibility>({ PLAQUE: true, CALCULUS: true });
  const showRef = useRef(visibleMarkers ?? show);
  const [counts, setCounts] = useState({ calculus: 0, plaque: 0, clean: 0, unscanned: 0 });

  useEffect(() => {
    analysisResultsRef.current = analysisResults;
    lesionsRef.current = lesions;
    missingRef.current = missingTeeth;
    scannedRef.current = scannedTeeth;
    onSelectRef.current = onToothSelect;
    if (!calibrationMode) applyRef.current?.();
  }, [analysisResults, lesions, missingTeeth, scannedTeeth, onToothSelect, calibrationMode]);

  const markerVisibility = visibleMarkers ?? show;
  useEffect(() => {
    showRef.current = markerVisibility;
    visibilityRef.current?.();
  }, [markerVisibility]);

  useEffect(() => {
    toothColorsRef.current = toothColors;
    recolorRef.current?.();
  }, [toothColors]);

  useEffect(() => {
    selectedRef.current = selectedTooth;
    focusSurfaceRef.current = focusSurface;
    // 툴팁 잔상 방지
    setTooltip(null);
    focusRef.current?.();
  }, [selectedTooth, focusSurface]);

  useEffect(() => {
    if (!mountRef.current) return;

    const mount = mountRef.current;
    let disposed = false;
    let oralModel: ReturnType<typeof prepareOralModel> | null = null;
    // 버튼으로 고른 포즈
    let userPose = initialPose === 'inside' ? 1 : 0;
    let pose = userPose;
    let poseAnimation: { from: number; to: number; start: number } | null = null;
    let cameraTransition: {
      start: number;
      fromPosition: THREE.Vector3;
      fromTarget: THREE.Vector3;
      toPosition: THREE.Vector3;
      toTarget: THREE.Vector3;
    } | null = null;
    // 포즈 전환 후 카메라 이동용
    let focusAfterPose = false;
    setLoaded(false);
    setLoadFailed(false);
    setInside(initialPose === 'inside');
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio * resolutionScale, 3));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // 1.05면 잇몸이 떠 보임
    renderer.toneMappingExposure = 0.84;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // 클리어코트 반사용 환경맵. background 미적용
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    pmrem.dispose();

    // 하악 교합면 과노출 방지
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe4dfd8, 1.2));

    // 모델 스케일(최대 변 10)에 맞춤
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(10, 16, 50);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.bias = -0.00005;
    keyLight.shadow.normalBias = 0.0004;
    // 기본 섀도 카메라(±5)는 모델보다 작음
    Object.assign(keyLight.shadow.camera, {
      left: -8,
      right: 8,
      top: 8,
      bottom: -8,
      near: 1,
      far: 200,
    });
    keyLight.shadow.camera.updateProjectionMatrix();
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf4f1ec, 0.7);
    fillLight.position.set(-12, -6, 30);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    Object.assign(controls, ORAL_VIEW_LIMITS);

    const modelSphere = new THREE.Sphere(new THREE.Vector3(), 1);
    // 바닥 그림자 스프라이트
    const dropShadow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: radialShadowTexture(),
        color: 0x17213f,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    dropShadow.visible = false;
    scene.add(dropShadow);
    dropShadow.center.set(0.5, 0.6);
    let modelBottom = 0;
    let modelFront = 0;
    function placeDropShadow() {
      const r = modelSphere.radius;
      // 더 뒤면 떠 보이고 바닥 높이면 턱에 가려짐
      dropShadow.position.set(modelSphere.center.x, modelBottom - r * 0.06, modelFront - r * 0.45);
      dropShadow.scale.set(r * 2.3, r * 0.26, 1);
    }

    const fdiToMeshes = new Map<string, THREE.Mesh[]>();
    const pickableMeshes: THREE.Mesh[] = [];
    const createdMaterials: THREE.Material[] = [];
    const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    const markerMaterials: Record<LesionType, THREE.Material> = {
      PLAQUE: markerMaterial('PLAQUE'),
      CALCULUS: markerMaterial('CALCULUS'),
    };
    const markers = new Map<string, Partial<Record<LesionType, THREE.Mesh>>>();
    let frames: ReturnType<typeof buildToothFrames> = new Map();

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let modelRoot: THREE.Object3D | null = null;
    let pressAt: { x: number; y: number } | null = null;
    // 모형을 직접 눌러 고른 치아. 각도 유지용
    let clickedTooth: string | null = null;

    // 모형 전체 거리. 펼친 포즈는 줌 축소
    function fitDistance() {
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
      if (fitToViewport && modelRoot) {
        const target = modelSphere.center.clone();
        target.y -= modelSphere.radius * IDLE_LIFT;
        const direction = VIEW_DIR.clone().normalize();
        const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
        const up = new THREE.Vector3().crossVectors(direction, right).normalize();
        let distance = 0;
        modelRoot.updateWorldMatrix(true, true);
        modelRoot.traverse((object) => {
          if (!(object instanceof THREE.Mesh) || !object.visible) return;
          const positions = object.geometry.getAttribute('position');
          if (!positions) return;
          const offset = new THREE.Vector3();
          for (let i = 0; i < positions.count; i++) {
            offset.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld).sub(target);
            distance = Math.max(
              distance,
              offset.dot(direction) +
                Math.max(
                  Math.abs(offset.dot(right)) / (Math.tan(hFov / 2) * 0.94),
                  Math.abs(offset.dot(up)) / (Math.tan(vFov / 2) * 0.94),
                ),
            );
          }
        });
        return distance;
      }
      return (
        (modelSphere.radius / Math.sin(Math.min(vFov, hFov) / 2)) *
        (FIT_MARGIN / THREE.MathUtils.lerp(zoom, Math.min(zoom, 1.12), pose))
      );
    }

    function cameraGoal(fdi: string | null) {
      const target = modelSphere.center.clone();
      let distance = fitDistance();
      const direction = camera.position.clone().sub(controls.target);
      if (direction.lengthSq() < 1e-6) direction.copy(VIEW_DIR);
      direction.normalize();
      const meshes = fdi ? fdiToMeshes.get(fdi) : undefined;
      const frame = fdi ? frames.get(fdi) : undefined;
      if (meshes?.length) {
        const bounds = new THREE.Box3();
        meshes.forEach((mesh) => bounds.expandByObject(mesh));
        bounds.getCenter(target);
        distance *= FOCUS_DISTANCE;
        if (fdi !== clickedTooth && frame) {
          if (pose > 0.5) {
            // 펼친 포즈는 정면에서
            direction.copy(VIEW_DIR);
          } else {
            // 치열궁 바깥 방향 + 앞쪽 약간
            const outward = frame.normal.clone().transformDirection(meshes[0].matrixWorld);
            outward.y = 0;
            if (outward.lengthSq() > 1e-6) {
              direction
                .copy(outward.normalize().multiplyScalar(0.7))
                .add(new THREE.Vector3(0, 0, 0.5));
              // 뒤로 가면 회전 제한에 걸림
              direction.z = Math.max(direction.z, 0.35);
              direction.y = 0.22;
              direction.normalize();
            }
          }
        }
      }
      if (!meshes?.length) target.y -= modelSphere.radius * IDLE_LIFT;
      const position = target.clone().addScaledVector(direction, distance);
      if (meshes?.length) target.y -= distance * FOCUS_TARGET_DROP;
      return { target, position };
    }

    function placeCamera(instant: boolean) {
      const distance = fitDistance();
      camera.near = distance / 100;
      camera.far = distance * 10;
      camera.updateProjectionMatrix();
      // 선택 시 확대 한계 완화
      controls.minDistance = distance * (selectedRef.current ? 0.12 : IDLE_MIN_DISTANCE);
      controls.maxDistance = distance * 2.2;

      const goal = cameraGoal(selectedRef.current);
      if (instant) {
        cameraTransition = null;
        camera.position.copy(goal.position);
        controls.target.copy(goal.target);
      } else {
        cameraTransition = {
          start: performance.now(),
          fromPosition: camera.position.clone(),
          fromTarget: controls.target.clone(),
          toPosition: goal.position,
          toTarget: goal.target,
        };
      }
      controls.update();
    }

    function resize() {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      const displayScale = mount.getBoundingClientRect().width / w;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio * displayScale * resolutionScale, 3));
      renderer.setSize(w, h);
      // 무대 높이 전환 중이면 이어서
      placeCamera(!cameraTransition);
    }

    function collectTeeth(model: THREE.Object3D) {
      model.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        if (calibrationMode) console.log(`mesh: "${obj.name}" | parent: "${obj.parent?.name}"`);
        const fdi = extractFdi(obj.name) ?? extractFdi(obj.parent?.name ?? '');
        if (!fdi) return;

        obj.userData.fdi = fdi;
        originalMaterials.set(obj, obj.material);

        const list = fdiToMeshes.get(fdi) ?? [];
        list.push(obj);
        fdiToMeshes.set(fdi, list);
      });

      const firstMesh = new Map<string, THREE.Mesh>();
      fdiToMeshes.forEach((meshes, fdi) => firstMesh.set(fdi, meshes[0]));
      frames = buildToothFrames(firstMesh);

      console.log(`[치아 매핑] ${fdiToMeshes.size}개 FDI 인식:`, [...fdiToMeshes.keys()].sort());
    }

    function applyMarkerVisibility() {
      const selected = selectedRef.current;
      markers.forEach((set, fdi) => {
        LESION_TYPES.forEach((type) => {
          const marker = set[type];
          if (!marker) return;
          const allowed = (selected ? fdi === selected : idleMarkers) && showRef.current[type];
          marker.visible = Boolean(marker.userData.active) && allowed;
        });
      });
    }

    function applyDimming() {
      const selected = selectedRef.current;
      pickableMeshes.forEach((mesh) => {
        const info = mesh.userData.toothInfo as ToothInfo | undefined;
        const material = mesh.material;
        if (!info || !(material instanceof THREE.MeshStandardMaterial)) return;
        const base = info.state === 'unscanned' ? UNSCANNED_OPACITY : 1;
        const dimmed = Boolean(selected) && info.fdi !== selected;
        const baseColor =
          toothColorsRef.current?.[info.fdi] ?? (mesh.userData.baseColor as string | undefined);
        if (baseColor) {
          material.color.set(info.fdi === selected ? FOCUS_TOOTH_COLOR : baseColor);
          material.emissive.copy(material.color);
        }
        material.opacity = dimmed ? base * DIM_OPACITY : base;
        const transparent = material.opacity < 1;
        // 빼면 transparent 변경이 반영 안 됨
        if (material.transparent !== transparent) material.needsUpdate = true;
        material.transparent = transparent;
        material.depthWrite = !dimmed;
        material.emissiveIntensity = dimmed ? 0 : selected ? 0.22 : 0.08;
      });
      const azimuth = selected ? FOCUS_AZIMUTH : ORAL_VIEW_LIMITS.maxAzimuthAngle;
      controls.minAzimuthAngle = -azimuth;
      controls.maxAzimuthAngle = azimuth;
    }

    // 병변이 전부 안쪽이면 펼친 포즈
    function desiredPose(fdi: string | null) {
      if (!fdi) return userPose;
      if (focusSurfaceRef.current) return focusSurfaceRef.current === 'INNER' ? 1 : 0;
      const own = lesionsRef.current.filter((l) => String(l.toothNumber) === fdi);
      if (own.length > 0 && own.every((l) => l.surfaceType === 'INNER')) return 1;
      return userPose;
    }

    function startPose(to: number) {
      setTooltip(null);
      setInside(to === 1);
      poseAnimation = { from: pose, to, start: performance.now() };
    }

    function applySelection(moveCamera: boolean) {
      applyDimming();
      applyMarkerVisibility();
      if (!moveCamera || !oralModel) return;
      const target = desiredPose(selectedRef.current);
      if (Math.abs(target - pose) > 0.001 && poseAnimation?.to !== target) startPose(target);
      if (poseAnimation) focusAfterPose = true;
      else placeCamera(false);
    }

    function refreshMarker(
      fdi: string,
      mesh: THREE.Mesh,
      type: LesionType,
      polygons: ToothLesion[],
      fallback: number | null,
    ) {
      const frame = frames.get(fdi);
      const set = markers.get(fdi) ?? {};
      let marker = set[type];
      const hasInput = polygons.length > 0 || (fallback ?? 0) > 0;
      if (!hasInput) {
        if (marker) marker.userData.active = false;
        return false;
      }
      if (!frame) return false;
      if (!marker) {
        marker = createMarkerMesh(mesh, type, markerMaterials[type]);
        set[type] = marker;
        markers.set(fdi, set);
      }
      const coverage = coverageMask(frame, markerBasePositions(marker), polygons, fallback);
      marker.userData.active = updateMarker(marker, coverage, type);
      return Boolean(marker.userData.active);
    }

    function applyAnalysis() {
      pickableMeshes.length = 0;
      originalMaterials.forEach((mat, mesh) => {
        mesh.material = mat;
        delete mesh.userData.toothInfo;
      });
      createdMaterials.forEach((m) => m.dispose());
      createdMaterials.length = 0;

      const byTooth = groupByTooth(analysisResultsRef.current);
      const lesionsByTooth = groupLesions(lesionsRef.current);
      const gone = new Set(missingRef.current.map(String));
      const shot = new Set(scannedRef.current.map(String));

      const next = { calculus: 0, plaque: 0, clean: 0, unscanned: 0 };
      fdiToMeshes.forEach((meshes, fdi) => {
        const absent = gone.has(fdi);
        meshes.forEach((mesh) => {
          mesh.visible = !absent;
        });
        if (absent) return;

        const rows = calculusFirst(byTooth.get(fdi) ?? []);
        const polygons = lesionsByTooth.get(fdi) ?? [];
        const lesion = lesionState(polygons, rows);
        const scanned = shot.has(fdi) || rows.length > 0 || polygons.length > 0;

        LESION_TYPES.forEach((type) => {
          const own = polygons.filter((l) => l.lesionType === type);
          const fallback =
            own.length > 0
              ? null
              : (rows.find((r) => r.lesionType === type && isActiveLesion(r))?.areaRatio ?? null);
          refreshMarker(fdi, meshes[0], type, own, fallback);
        });

        if (lesion === 'calculus') next.calculus++;
        else if (lesion === 'plaque') next.plaque++;
        else if (scanned) next.clean++;
        else next.unscanned++;

        const state: ToothState = lesion !== 'normal' ? 'lesion' : scanned ? 'clean' : 'unscanned';
        const lesionRows = rows.filter((r) => r.lesionType);
        const top = worst(lesionRows);
        const color = top ? RISK_MODEL_FILL[top.riskLevel] : RISK_MODEL_FILL.VERY_LOW;
        const mat = scanned ? toothMaterial(color) : unscannedMaterial();
        createdMaterials.push(mat);
        meshes.forEach((mesh) => {
          mesh.material = mat;
          mesh.userData.baseColor = scanned ? color : UNSCANNED_COLOR;
          mesh.userData.toothInfo = {
            fdi,
            state,
            lesion,
            result: top,
            results: lesionRows,
          } satisfies ToothInfo;
          pickableMeshes.push(mesh);
        });
      });

      // 병변 면이 바뀌면 포즈 재설정
      const selected = selectedRef.current;
      const needsPoseChange =
        Boolean(selected) && oralModel !== null && Math.abs(desiredPose(selected) - pose) > 0.001;
      applySelection(needsPoseChange);
      setCounts((prev) =>
        prev.calculus === next.calculus &&
        prev.plaque === next.plaque &&
        prev.clean === next.clean &&
        prev.unscanned === next.unscanned
          ? prev
          : next,
      );
    }

    const loader = new GLTFLoader();
    loader.load(
      MODEL_PATH,
      (gltf) => {
        const model = gltf.scene;
        if (disposed) {
          disposeModel(model);
          return;
        }
        modelRoot = model;

        oralModel = prepareOralModel(model);
        oralModel.setPose(pose);
        model.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });

        scene.add(model);

        const modelBox = new THREE.Box3().setFromObject(model);
        modelBox.getBoundingSphere(modelSphere);
        modelBottom = modelBox.min.y;
        modelFront = modelBox.max.z;
        dropShadow.visible = true;
        collectTeeth(model);
        resize();

        applyRef.current = applyAnalysis;
        visibilityRef.current = applyMarkerVisibility;
        focusRef.current = () => applySelection(true);
        recolorRef.current = applyDimming;
        if (!calibrationMode) applyAnalysis();
        if (selectedRef.current) applySelection(true);
        poseRef.current = (next) => {
          userPose = next ? 1 : 0;
          startPose(userPose);
        };
        setLoaded(true);
      },
      undefined,
      (error) => {
        console.error('GLB 로딩 실패:', error);
        if (!disposed) setLoadFailed(true);
      },
    );

    function updatePointer(event: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function getIntersectedTooth(): THREE.Mesh | null {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(
        pickableMeshes.filter((mesh) => mesh.visible),
        false,
      );
      return hits.length > 0 ? (hits[0].object as THREE.Mesh) : null;
    }

    function handlePointerMove(event: PointerEvent) {
      updatePointer(event);
      const hit = getIntersectedTooth();
      if (hit && !selectedRef.current) {
        const info = hit.userData.toothInfo as ToothInfo;
        const rect = renderer.domElement.getBoundingClientRect();
        const x = THREE.MathUtils.clamp(event.clientX - rect.left, 70, rect.width - 70);
        setTooltip({ ...info, x, y: event.clientY - rect.top });
        renderer.domElement.style.cursor = 'pointer';
      } else if (hit) {
        setTooltip(null);
        renderer.domElement.style.cursor = 'pointer';
      } else {
        setTooltip(null);
        renderer.domElement.style.cursor = calibrationMode ? 'crosshair' : 'auto';
      }
    }

    function handlePointerDown(event: PointerEvent) {
      pressAt = { x: event.clientX, y: event.clientY };
    }

    function handleClick(event: PointerEvent) {
      // 드래그는 클릭 아님
      if (
        pressAt &&
        Math.hypot(event.clientX - pressAt.x, event.clientY - pressAt.y) > CLICK_SLOP
      ) {
        return;
      }
      updatePointer(event);

      if (calibrationMode) {
        if (!modelRoot) return;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObject(modelRoot, true);
        if (hits.length === 0) return;
        const obj = hits[0].object;
        const fdi = obj.userData.fdi ?? extractFdi(obj.name) ?? '(없음)';
        console.log(`클릭한 mesh: "${obj.name}" | FDI: ${fdi}`);
        navigator.clipboard?.writeText(String(fdi)).catch(() => {});
        return;
      }

      const hit = getIntersectedTooth();
      if (!hit) {
        if (selectedRef.current) onSelectRef.current?.(null);
        return;
      }
      const info = hit.userData.toothInfo as ToothInfo;
      clickedTooth = info.fdi;
      onSelectRef.current?.(info.fdi);
    }

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('click', handleClick);

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const now = performance.now();
      if (poseAnimation && oralModel) {
        const t = Math.min((now - poseAnimation.start) / POSE_DURATION, 1);
        pose = THREE.MathUtils.lerp(poseAnimation.from, poseAnimation.to, easeOut(t));
        oralModel.setPose(pose);
        const poseBox = oralModel.bounds();
        poseBox.getBoundingSphere(modelSphere);
        modelBottom = poseBox.min.y;
        modelFront = poseBox.max.z;
        if (!selectedRef.current) placeCamera(true);
        if (t === 1) {
          poseAnimation = null;
          if (focusAfterPose) {
            focusAfterPose = false;
            placeCamera(false);
          }
        }
      }
      if (cameraTransition) {
        const t = Math.min((now - cameraTransition.start) / FOCUS_DURATION, 1);
        const e = easeOut(t);
        camera.position.lerpVectors(cameraTransition.fromPosition, cameraTransition.toPosition, e);
        controls.target.lerpVectors(cameraTransition.fromTarget, cameraTransition.toTarget, e);
        if (t === 1) cameraTransition = null;
      }
      controls.update();
      placeDropShadow();
      renderer.render(scene, camera);
    };
    animate();

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    return () => {
      disposed = true;
      poseRef.current = null;
      applyRef.current = null;
      visibilityRef.current = null;
      focusRef.current = null;
      recolorRef.current = null;
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('click', handleClick);
      observer.disconnect();
      createdMaterials.forEach((m) => m.dispose());
      Object.values(markerMaterials).forEach((m) => m.dispose());
      originalMaterials.forEach((material, mesh) => {
        mesh.material = material;
      });
      if (modelRoot) disposeModel(modelRoot);
      dropShadow.material.map?.dispose();
      dropShadow.material.dispose();
      envMap.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [calibrationMode, zoom, initialPose, idleMarkers, fitToViewport, resolutionScale]);

  const legend: Array<{ type: LesionType; label: string; count: number }> = [
    { type: 'CALCULUS', label: LESION_LABEL.CALCULUS, count: counts.calculus },
    { type: 'PLAQUE', label: LESION_LABEL.PLAQUE, count: counts.plaque },
  ];

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
      {loaded && !selectedTooth && (
        <button
          type="button"
          aria-pressed={inside}
          onClick={() => poseRef.current?.(!inside)}
          className={`absolute right-4 ${minimal ? 'top-3 bg-[#173A73]/35 text-white ring-1 ring-white/25 backdrop-blur-md hover:bg-[#173A73]/55' : 'top-14 bg-primary/15 text-primary hover:bg-primary/25'} z-10 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors`}
        >
          {inside ? '정면 보기' : '안쪽 보기'}
        </button>
      )}
      {!loaded && (
        <p
          role="status"
          className="absolute inset-0 flex items-center justify-center text-xs text-gray-500"
        >
          {loadFailed ? '치아 모형을 불러오지 못했어요.' : '치아 모형을 불러오는 중이에요.'}
        </p>
      )}
      {calibrationMode && (
        <div className="pointer-events-none absolute top-4 left-4 z-10 rounded-lg bg-black/70 px-3 py-2 text-xs text-white">
          캘리브레이션 모드: 치아를 클릭하면 mesh 이름과 FDI 번호가 콘솔에 출력됩니다.
        </div>
      )}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <p className="font-semibold text-gray-800">{labelOf(tooltip.fdi)}</p>
          {tooltip.state === 'lesion' && tooltip.results?.length ? (
            <>
              {tooltip.results.map((row) => (
                <p key={row.lesionType} className="text-gray-500">
                  <span className="font-semibold text-gray-700">{lesionLabel(row.lesionType)}</span>
                  {' · '}
                  {RISK_TAG[row.riskLevel]} · {Math.round(row.areaRatio)}%
                </p>
              ))}
            </>
          ) : tooltip.state === 'lesion' ? (
            <p className="text-gray-500">
              {tooltip.lesion === 'calculus' ? '치석이 보여요' : '치태가 보여요'}
            </p>
          ) : (
            <p className="text-gray-500">
              {tooltip.state === 'clean' ? '병변이 안 보여요' : '이번 스캔에 안 잡혔어요'}
            </p>
          )}
        </div>
      )}
      {!minimal && (
        <>
          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-x-2.5 gap-y-1 rounded-xl bg-white/85 px-3 py-2 backdrop-blur-sm">
            {legend.map(({ type, label, count }) => (
              <button
                key={type}
                type="button"
                aria-pressed={show[type]}
                onClick={() => setShow((prev) => ({ ...prev, [type]: !prev[type] }))}
                className={`flex items-center gap-1.5 text-[11px] text-gray-700 transition-opacity ${
                  show[type] ? '' : 'opacity-40'
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: MARKER_COLOR[type] }}
                />
                {label} {count}
              </button>
            ))}
            <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border border-gray-300"
                style={{ backgroundColor: RISK_MODEL_FILL.VERY_LOW }}
              />
              깨끗 {counts.clean}
            </div>
            {counts.unscanned > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full opacity-60"
                  style={{ backgroundColor: UNSCANNED_COLOR }}
                />
                미촬영 {counts.unscanned}
              </div>
            )}
          </div>

          {(counts.unscanned > 0 || counts.clean > 0) && (
            <div className="pointer-events-none absolute top-3 left-3 right-3 rounded-lg bg-white/85 px-2.5 py-1.5 backdrop-blur-sm">
              <p className="m-0 text-[11px] leading-snug text-gray-600">
                {counts.clean > 0 && `치아 ${counts.clean}개는 병변이 안 보여요.`}
                {counts.clean > 0 && counts.unscanned > 0 && ' '}
                {counts.unscanned > 0 &&
                  `흐린 회색 ${counts.unscanned}개는 이번 스캔에서 제외되었어요.`}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
