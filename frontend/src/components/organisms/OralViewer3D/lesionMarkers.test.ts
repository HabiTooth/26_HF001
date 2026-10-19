// @vitest-environment node
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  buildToothFrames,
  coverageMask,
  createMarkerMesh,
  lesionState,
  markerBasePositions,
  markerMaterial,
  updateMarker,
  type ToothFrame,
  type ToothLesion,
} from './lesionMarkers';

const teeth = new Map<string, THREE.Mesh>();
let frames: Map<string, ToothFrame>;

const rect = (u0: number, u1: number, v0: number, v1: number) => [
  { u: u0, v: v0 },
  { u: u1, v: v0 },
  { u: u1, v: v1 },
  { u: u0, v: v1 },
];

const lesion = (
  toothNumber: number,
  surfaceType: ToothLesion['surfaceType'],
  polygon: ToothLesion['polygon'],
  lesionType: ToothLesion['lesionType'] = 'PLAQUE',
): ToothLesion => ({ toothNumber, surfaceType, lesionType, polygon });

function covered(fdi: string, a: Float32Array) {
  const positions = teeth.get(fdi)!.geometry.getAttribute('position');
  const frame = frames.get(fdi)!;
  const picked: Array<{ x: number; h: number; v: number }> = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] < 0.5) continue;
    const dx = positions.getX(i) - frame.center.x;
    const dz = positions.getZ(i) - frame.center.z;
    picked.push({
      x: positions.getX(i) - frame.center.x,
      h: (positions.getY(i) - frame.y0) / (frame.y1 - frame.y0),
      v: dx * frame.normal.x + dz * frame.normal.z,
    });
  }
  const mean = (key: 'x' | 'h' | 'v') => picked.reduce((s, p) => s + p[key], 0) / picked.length;
  return {
    count: picked.length,
    meanX: mean('x'),
    meanH: mean('h'),
    minV: Math.min(...picked.map((p) => p.v)),
  };
}

beforeAll(async () => {
  const bytes = readFileSync('public/models/oral-model.glb');
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  );
  gltf.scene.traverse((o) => {
    const fdi = o.name.match(/^tooth_(\d{2})$/)?.[1];
    if (fdi && o instanceof THREE.Mesh) teeth.set(fdi, o);
  });
  frames = buildToothFrames(teeth);
});

describe('tooth frames', () => {
  it('builds a frame for every tooth with outward normals', () => {
    expect(frames.size).toBe(32);
    // 앞니 바깥 = +z
    expect(frames.get('11')!.normal.z).toBeGreaterThan(0.9);
    expect(frames.get('41')!.normal.z).toBeGreaterThan(0.9);
    // 사랑니 바깥 = 치열궁 바깥쪽 x
    expect(frames.get('18')!.normal.x).toBeGreaterThan(0.5);
    expect(frames.get('48')!.normal.x).toBeLessThan(-0.5);
  });

  it('points the tangent toward the patient left in each jaw local space', () => {
    // 상악은 Z축 180° 회전. 로컬 -x = 사용자 왼쪽
    expect(frames.get('11')!.tangent.x).toBeLessThan(0);
    expect(frames.get('41')!.tangent.x).toBeGreaterThan(0);
  });
});

describe('coverage mask', () => {
  it('maps u=1 to the patient right on both jaws', () => {
    const polygon = rect(0.7, 1, 0.3, 0.7);
    const upper = covered(
      '11',
      coverageMask(frames.get('11')!, positionsOf('11'), [lesion(11, 'OUTER', polygon)], null),
    );
    const lower = covered(
      '41',
      coverageMask(frames.get('41')!, positionsOf('41'), [lesion(41, 'OUTER', polygon)], null),
    );
    expect(upper.count).toBeGreaterThan(0);
    expect(lower.count).toBeGreaterThan(0);
    // 사용자 오른쪽 = 월드 -x. 상악 로컬은 +x
    expect(upper.meanX).toBeGreaterThan(0);
    expect(lower.meanX).toBeLessThan(0);
  });

  it('puts v=0 at the gum line on the upper jaw and at the edge on the lower jaw', () => {
    const polygon = rect(0.2, 0.8, 0, 0.3);
    const upper = covered(
      '11',
      coverageMask(frames.get('11')!, positionsOf('11'), [lesion(11, 'OUTER', polygon)], null),
    );
    const lower = covered(
      '41',
      coverageMask(frames.get('41')!, positionsOf('41'), [lesion(41, 'OUTER', polygon)], null),
    );
    expect(upper.meanH).toBeLessThan(0.45);
    expect(lower.meanH).toBeGreaterThan(0.55);
  });

  it('keeps OUTER polygons on the buccal side and INNER on the lingual side', () => {
    const polygon = rect(0.2, 0.8, 0.2, 0.8);
    const outer = covered(
      '16',
      coverageMask(frames.get('16')!, positionsOf('16'), [lesion(16, 'OUTER', polygon)], null),
    );
    const inner = coverageMask(
      frames.get('16')!,
      positionsOf('16'),
      [lesion(16, 'INNER', polygon)],
      null,
    );
    expect(outer.minV).toBeGreaterThan(0);
    const positions = positionsOf('16');
    const frame = frames.get('16')!;
    for (let i = 0; i < inner.length; i++) {
      if (inner[i] < 0.5) continue;
      const v =
        (positions[i * 3] - frame.center.x) * frame.normal.x +
        (positions[i * 3 + 2] - frame.center.z) * frame.normal.z;
      expect(v).toBeLessThan(0);
    }
  });

  it('falls back to a band from the gum line sized by areaRatio', () => {
    const half = covered('31', coverageMask(frames.get('31')!, positionsOf('31'), [], 50));
    const none = coverageMask(frames.get('31')!, positionsOf('31'), [], 0);
    expect(half.count).toBeGreaterThan(0);
    expect(half.meanH).toBeLessThan(0.5);
    expect(Math.max(...none)).toBe(0);
  });

  it('never paints below the gum line', () => {
    const a = coverageMask(
      frames.get('26')!,
      positionsOf('26'),
      [lesion(26, 'OUTER', rect(0, 1, 0, 1))],
      null,
    );
    const positions = positionsOf('26');
    const frame = frames.get('26')!;
    for (let i = 0; i < a.length; i++) {
      const h = (positions[i * 3 + 1] - frame.y0) / (frame.y1 - frame.y0);
      if (h < 0.005) expect(a[i]).toBeLessThan(0.1);
    }
  });
});

describe('marker mesh', () => {
  it('raises touched faces with coverage as alpha and collapses untouched ones', () => {
    const tooth = teeth.get('36')!;
    const marker = createMarkerMesh(tooth, 'CALCULUS', markerMaterial('CALCULUS'));
    expect(marker.parent).toBe(tooth);
    expect(marker.visible).toBe(false);
    expect(marker.renderOrder).toBe(3);
    const base = markerBasePositions(marker);
    const a = coverageMask(
      frames.get('36')!,
      base,
      [lesion(36, 'OUTER', rect(0.2, 0.8, 0.1, 0.6), 'CALCULUS')],
      null,
    );
    expect(updateMarker(marker, a, 'CALCULUS')).toBe(true);
    const position = marker.geometry.getAttribute('position');
    const normal = marker.geometry.getAttribute('normal');
    const color = marker.geometry.getAttribute('color');
    expect(color.itemSize).toBe(4);
    let raised = 0;
    let collapsed = 0;
    for (let f = 0; f + 2 < a.length; f += 3) {
      if (Math.max(a[f], a[f + 1], a[f + 2]) > 0.001) {
        for (let k = 0; k < 3; k++) {
          const i = f + k;
          const along =
            (position.getX(i) - base[i * 3]) * normal.getX(i) +
            (position.getY(i) - base[i * 3 + 1]) * normal.getY(i) +
            (position.getZ(i) - base[i * 3 + 2]) * normal.getZ(i);
          expect(along).toBeGreaterThan(0.00017);
          expect(color.getW(i)).toBeCloseTo(Math.min(1, a[i]), 6);
        }
        raised++;
      } else {
        for (let k = 1; k < 3; k++) {
          expect(position.getX(f + k)).toBeCloseTo(position.getX(f), 9);
          expect(position.getY(f + k)).toBeCloseTo(position.getY(f), 9);
          expect(position.getZ(f + k)).toBeCloseTo(position.getZ(f), 9);
        }
        collapsed++;
      }
    }
    expect(raised).toBeGreaterThan(0);
    expect(collapsed).toBeGreaterThan(0);
    expect(updateMarker(marker, new Float32Array(a.length), 'CALCULUS')).toBe(false);
  });

  it('averages normals across faces that share a position', () => {
    const marker = createMarkerMesh(teeth.get('21')!, 'PLAQUE', markerMaterial('PLAQUE'));
    expect(marker.renderOrder).toBe(2);
    const position = markerBasePositions(marker);
    const normal = marker.geometry.getAttribute('normal');
    const seen = new Map<string, [number, number, number]>();
    for (let i = 0; i < normal.count; i++) {
      const key = `${position[i * 3]},${position[i * 3 + 1]},${position[i * 3 + 2]}`;
      const n: [number, number, number] = [normal.getX(i), normal.getY(i), normal.getZ(i)];
      const prev = seen.get(key);
      if (prev) prev.forEach((v, k) => expect(n[k]).toBeCloseTo(v, 6));
      else seen.set(key, n);
    }
    expect(seen.size).toBeLessThan(normal.count);
  });
});

describe('lesion state', () => {
  it('prefers calculus, then plaque, then normal', () => {
    const plaque = lesion(11, 'OUTER', rect(0, 1, 0, 1), 'PLAQUE');
    const calculus = lesion(11, 'OUTER', rect(0, 1, 0, 1), 'CALCULUS');
    expect(lesionState([plaque, calculus], [])).toBe('calculus');
    expect(lesionState([plaque], [])).toBe('plaque');
    expect(lesionState([], [{ lesionType: 'CALCULUS', areaRatio: 12 }])).toBe('calculus');
    expect(lesionState([], [{ lesionType: 'PLAQUE', areaRatio: 0 }])).toBe('normal');
    expect(lesionState([], [])).toBe('normal');
  });
});

function positionsOf(fdi: string) {
  return new Float32Array(teeth.get(fdi)!.geometry.getAttribute('position').array);
}
