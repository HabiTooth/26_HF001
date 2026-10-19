import * as THREE from 'three';
import type { LesionType } from '@/lib/api/common';
import type { LesionPolygonPoint, ToothLesion } from '@/lib/api/report';
import { MARKER_FILL } from '@/lib/riskColors';
import { lesionState, type ToothLesionState } from '@/lib/lesionState';

export type { ToothLesion, ToothLesionState };
export { lesionState };

export const MARKER_COLOR = MARKER_FILL;

// GLB 단위 m
const MM = 0.001;
// 최소 크기 보장용. 작으면 확대해도 안 보임
const MIN_W = 0.25;
const MIN_H = 0.22;
const PAD = 0.06;
const SHOW_THRESHOLD = 0.08;
// 이 값 미만 덮임은 안 그림
const DRAW_EPSILON = 0.001;
const NOISE_GRID = 2 * MM;
const HIDE_OFFSET = -0.6 * MM;
const RAISE: Record<LesionType, number> = { PLAQUE: 0.12 * MM, CALCULUS: 0.18 * MM };
const CALCULUS_BUMP = 0.35 * MM;
const GUM_FADE = 0.03;
const HALF_WIDTH_SCALE = 0.9;

// 사용자 오른쪽(18/48)→왼쪽(28/38) 순
const ARCH_ORDER = {
  upper: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  lower: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function smoothstep(e0: number, e1: number, x: number) {
  if (e1 <= e0) return x < e0 ? 0 : 1;
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

export function hashNoise(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

const fade = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// 2mm 격자 삼선형 보간 노이즈
function smoothNoise(x: number, y: number, z: number) {
  const gx = x / NOISE_GRID;
  const gy = y / NOISE_GRID;
  const gz = z / NOISE_GRID;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const iz = Math.floor(gz);
  const fx = fade(gx - ix);
  const fy = fade(gy - iy);
  const fz = fade(gz - iz);
  const corner = (dx: number, dy: number, dz: number) => hashNoise(ix + dx, iy + dy, iz + dz);
  const near = lerp(
    lerp(corner(0, 0, 0), corner(1, 0, 0), fx),
    lerp(corner(0, 1, 0), corner(1, 1, 0), fx),
    fy,
  );
  const far = lerp(
    lerp(corner(0, 0, 1), corner(1, 0, 1), fx),
    lerp(corner(0, 1, 1), corner(1, 1, 1), fx),
    fy,
  );
  return lerp(near, far, fz);
}

const vertexNoise = smoothNoise;

export interface ToothFrame {
  upper: boolean;
  center: THREE.Vector3;
  normal: THREE.Vector3;
  tangent: THREE.Vector3;
  ru: number;
  rv: number;
  y0: number;
  y1: number;
}

// 치아별 로컬 좌표계. 턱 그룹 로컬 기준(치관 +y)
// 접선은 치열궁 오른쪽→왼쪽 방향. 어금니에서 부호 유지
export function buildToothFrames(teeth: Map<string, THREE.Mesh>): Map<string, ToothFrame> {
  const frames = new Map<string, ToothFrame>();
  for (const jaw of ['upper', 'lower'] as const) {
    const present = ARCH_ORDER[jaw].flatMap((n) => {
      const mesh = teeth.get(String(n));
      return mesh ? [{ fdi: String(n), mesh }] : [];
    });
    if (present.length === 0) continue;

    const boxes = present.map(({ mesh }) => {
      mesh.geometry.computeBoundingBox();
      return mesh.geometry.boundingBox!;
    });
    const centers = boxes.map((box) => box.getCenter(new THREE.Vector3()));
    const archCenter = centers
      .reduce((sum, c) => sum.add(c), new THREE.Vector3())
      .divideScalar(centers.length);

    present.forEach(({ fdi, mesh }, i) => {
      const prev = centers[Math.max(0, i - 1)];
      const next = centers[Math.min(centers.length - 1, i + 1)];
      const tangent = new THREE.Vector3(next.x - prev.x, 0, next.z - prev.z);
      if (tangent.lengthSq() === 0) tangent.set(1, 0, 0);
      tangent.normalize();
      const normal = new THREE.Vector3(tangent.z, 0, -tangent.x);
      const center = centers[i];
      if ((center.x - archCenter.x) * normal.x + (center.z - archCenter.z) * normal.z < 0) {
        normal.negate();
      }

      const position = mesh.geometry.getAttribute('position');
      let ru = 0;
      let rv = 0;
      for (let k = 0; k < position.count; k++) {
        const dx = position.getX(k) - center.x;
        const dz = position.getZ(k) - center.z;
        ru = Math.max(ru, Math.abs(dx * tangent.x + dz * tangent.z));
        rv = Math.max(rv, Math.abs(dx * normal.x + dz * normal.z));
      }
      frames.set(fdi, {
        upper: jaw === 'upper',
        center,
        normal,
        tangent,
        ru: ru * HALF_WIDTH_SCALE,
        rv: rv * HALF_WIDTH_SCALE,
        y0: boxes[i].min.y,
        y1: boxes[i].max.y,
      });
    });
  }
  return frames;
}

interface Box {
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
}

interface Mask {
  outer: boolean;
  points: LesionPolygonPoint[];
  box: Box;
}

// 0~1 밖이면 반대쪽으로 이동
function grow(min: number, max: number, size: number): [number, number] {
  if (max - min >= size) return [min, max];
  const mid = (min + max) / 2;
  let lo = mid - size / 2;
  let hi = mid + size / 2;
  if (lo < 0) {
    hi -= lo;
    lo = 0;
  }
  if (hi > 1) {
    lo -= hi - 1;
    hi = 1;
  }
  return [clamp01(lo), clamp01(hi)];
}

function buildMask(lesion: ToothLesion): Mask {
  const us = lesion.polygon.map((p) => p.u);
  const vs = lesion.polygon.map((p) => p.v);
  const [minU, maxU] = grow(Math.min(...us), Math.max(...us), MIN_W);
  const [minV, maxV] = grow(Math.min(...vs), Math.max(...vs), MIN_H);
  return {
    outer: lesion.surfaceType === 'OUTER',
    points: lesion.polygon,
    box: { minU, maxU, minV, maxV },
  };
}

function insidePolygon(x: number, y: number, points: LesionPolygonPoint[]) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    const crosses = a.v > y !== b.v > y;
    if (crosses && x < ((b.u - a.u) * (y - a.v)) / (b.v - a.v) + a.u) inside = !inside;
  }
  return inside;
}

function distToSegment(x: number, y: number, a: LesionPolygonPoint, b: LesionPolygonPoint) {
  const dx = b.u - a.u;
  const dy = b.v - a.v;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : clamp01(((x - a.u) * dx + (y - a.v) * dy) / len);
  return Math.hypot(x - (a.u + t * dx), y - (a.v + t * dy));
}

function distToOutline(x: number, y: number, points: LesionPolygonPoint[]) {
  let d = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    d = Math.min(d, distToSegment(x, y, points[j], points[i]));
  }
  return d;
}

function distToBox(x: number, y: number, box: Box) {
  const dx = Math.max(box.minU - x, 0, x - box.maxU);
  const dy = Math.max(box.minV - y, 0, y - box.maxV);
  return Math.hypot(dx, dy);
}

function maskValue(mask: Mask, x: number, y: number) {
  if (insidePolygon(x, y, mask.points)) return 1;
  const { box } = mask;
  if (x >= box.minU && x <= box.maxU && y >= box.minV && y <= box.maxV) return 1;
  const d = Math.min(distToOutline(x, y, mask.points), distToBox(x, y, box));
  return d < PAD ? 1 - (d / PAD) ** 2 : 0;
}

// 정점별 덮임값 0~1. 폴리곤 없으면 areaRatio 높이의 띠
export function coverageMask(
  frame: ToothFrame,
  positions: Float32Array,
  lesions: ToothLesion[],
  fallbackRatio: number | null,
): Float32Array {
  const count = positions.length / 3;
  const a = new Float32Array(count);
  const masks = lesions.filter((l) => l.polygon.length >= 3).map(buildMask);
  const reach = fallbackRatio === null ? 0 : clamp01(fallbackRatio / 100);
  if (masks.length === 0 && reach <= 0) return a;

  const { center, normal, tangent, ru, rv, upper } = frame;
  const height = Math.max(frame.y1 - frame.y0, 1e-9);
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const h = (y - frame.y0) / height;
    const dx = x - center.x;
    const dz = z - center.z;
    const u = (dx * tangent.x + dz * tangent.z) / ru;
    const v = (dx * normal.x + dz * normal.z) / rv;

    let value = 0;
    if (masks.length > 0) {
      // u=1 사용자 오른쪽. 잇몸선은 상악 v=0, 하악 v=1
      const px = 1 - (u + 1) / 2;
      const py = upper ? h : 1 - h;
      for (const mask of masks) {
        if (mask.outer !== v > 0) continue;
        value = Math.max(value, maskValue(mask, px, py));
      }
    } else {
      const noise = vertexNoise(x, y, z);
      value = 1 - smoothstep(reach * (0.75 + 0.5 * noise), reach * (1.05 + 0.5 * noise), h);
    }
    a[i] = value * smoothstep(0, GUM_FADE, h);
  }
  return a;
}

export function markerMaterial(type: LesionType) {
  return new THREE.MeshPhysicalMaterial({
    color: MARKER_COLOR[type],
    roughness: 0.6,
    metalness: 0,
    clearcoat: 0.3,
    vertexColors: true,
    // 정점 알파로 경계 처리. 면 단위면 톱니 생김
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: type === 'CALCULUS' ? -2 : -1,
    polygonOffsetUnits: -1,
  });
}

// 비인덱스 메시는 같은 자리 정점이 면마다 따로 있음
// 법선 평균 안 내면 면 사이 틈 생김
function smoothNormals(position: Float32Array, normal: Float32Array) {
  const sums = new Map<string, [number, number, number]>();
  const keyOf = (i: number) =>
    [position[i * 3], position[i * 3 + 1], position[i * 3 + 2]]
      .map((v) => Math.round(v * 1e6))
      .join(',');
  const count = position.length / 3;
  for (let i = 0; i < count; i++) {
    const key = keyOf(i);
    const sum = sums.get(key) ?? [0, 0, 0];
    sum[0] += normal[i * 3];
    sum[1] += normal[i * 3 + 1];
    sum[2] += normal[i * 3 + 2];
    sums.set(key, sum);
  }
  const out = new Float32Array(normal.length);
  for (let i = 0; i < count; i++) {
    const [x, y, z] = sums.get(keyOf(i))!;
    const len = Math.hypot(x, y, z) || 1;
    out[i * 3] = x / len;
    out[i * 3 + 1] = y / len;
    out[i * 3 + 2] = z / len;
  }
  return out;
}

interface MarkerBase {
  position: Float32Array;
  normal: Float32Array;
}

// 치아 자식으로 붙여 포즈·가시성 공유
export function createMarkerMesh(tooth: THREE.Mesh, type: LesionType, material: THREE.Material) {
  const source = tooth.geometry.index ? tooth.geometry.toNonIndexed() : tooth.geometry;
  if (!source.getAttribute('normal')) source.computeVertexNormals();
  const position = new Float32Array(source.getAttribute('position').array);
  const normal = smoothNormals(position, new Float32Array(source.getAttribute('normal').array));
  if (source !== tooth.geometry) source.dispose();

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position.slice(), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal.slice(), 3));
  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(new Float32Array((position.length / 3) * 4), 4),
  );

  const marker = new THREE.Mesh(geometry, material);
  marker.name = `${tooth.name}_${type.toLowerCase()}_marker`;
  marker.castShadow = false;
  marker.receiveShadow = false;
  // 치석이 치태 위
  marker.renderOrder = type === 'CALCULUS' ? 3 : 2;
  marker.visible = false;
  marker.raycast = () => {};
  marker.userData.base = { position, normal } satisfies MarkerBase;
  tooth.add(marker);
  return marker;
}

export const markerBasePositions = (marker: THREE.Mesh) =>
  (marker.userData.base as MarkerBase).position;

// 덮인 면은 밀어 올리고 덮임값을 알파로
// 안 덮인 면은 한 점으로 접어 넓이 0
export function updateMarker(marker: THREE.Mesh, coverage: Float32Array, type: LesionType) {
  const { position: base, normal } = marker.userData.base as MarkerBase;
  const position = marker.geometry.getAttribute('position') as THREE.BufferAttribute;
  const color = marker.geometry.getAttribute('color') as THREE.BufferAttribute;
  let shown = 0;
  for (let f = 0; f + 2 < coverage.length; f += 3) {
    const peak = Math.max(coverage[f], coverage[f + 1], coverage[f + 2]);
    const draw = peak > DRAW_EPSILON;
    if (peak > SHOW_THRESHOLD) shown++;

    let cx = 0;
    let cy = 0;
    let cz = 0;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let k = 0; k < 3; k++) {
      const i = f + k;
      cx += base[i * 3] / 3;
      cy += base[i * 3 + 1] / 3;
      cz += base[i * 3 + 2] / 3;
      nx += normal[i * 3] / 3;
      ny += normal[i * 3 + 1] / 3;
      nz += normal[i * 3 + 2] / 3;
    }

    for (let k = 0; k < 3; k++) {
      const i = f + k;
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const z = base[i * 3 + 2];
      const noise = vertexNoise(x, y, z);
      if (draw) {
        let offset = RAISE[type];
        if (type === 'CALCULUS') offset += CALCULUS_BUMP * noise * coverage[i];
        position.setXYZ(
          i,
          x + normal[i * 3] * offset,
          y + normal[i * 3 + 1] * offset,
          z + normal[i * 3 + 2] * offset,
        );
      } else {
        position.setXYZ(i, cx + nx * HIDE_OFFSET, cy + ny * HIDE_OFFSET, cz + nz * HIDE_OFFSET);
      }
      const shade = 0.96 + 0.04 * noise;
      color.setXYZW(i, shade, shade, shade, Math.min(1, coverage[i]));
    }
  }
  position.needsUpdate = true;
  color.needsUpdate = true;
  marker.geometry.computeBoundingSphere();
  return shown > 0;
}
