// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ALL_TEETH } from '@/lib/dentition';
import { ORAL_GUM_COLOR, ORAL_VIEW_LIMITS, prepareOralModel } from './oralModel';

describe('final report dental asset', () => {
  it('maps all FDI teeth and restores the exact neutral pose after inside view', async () => {
    const bytes = readFileSync('public/models/oral-model.glb');
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const meshes: THREE.Mesh[] = [];
    gltf.scene.traverse((o) => { if (o instanceof THREE.Mesh) meshes.push(o); });
    const numbers = meshes.map((m) => m.name.match(/^tooth_(\d{2})$/)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b);
    expect(numbers).toEqual([...ALL_TEETH].sort((a, b) => a - b));
    const model = prepareOralModel(gltf.scene);
    meshes.filter((m) => /^(upper|lower)_gum$/.test(m.name)).forEach((mesh) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      expect(material.color.getHexString()).toBe(ORAL_GUM_COLOR.slice(1).toLowerCase());
      expect(material.roughness).toBe(0.45);
    });
    expect(ORAL_VIEW_LIMITS.maxAzimuthAngle).toBeCloseTo(40 * Math.PI / 180);
    expect(ORAL_VIEW_LIMITS.minPolarAngle).toBeCloseTo(Math.PI / 2 - 0.4);
    expect(ORAL_VIEW_LIMITS.enablePan).toBe(false);
    expect(meshes.filter((m) => /^part_/.test(m.name)).every((m) => !m.visible)).toBe(true);
    const neutral = meshes.map((m) => m.matrixWorld.clone());
    model.setPose(1);
    expect(meshes.some((m, i) => !m.matrixWorld.equals(neutral[i]))).toBe(true);
    expect(Number.isFinite(model.bounds().getSize(new THREE.Vector3()).length())).toBe(true);
    model.setPose(0);
    meshes.forEach((m, i) => m.matrixWorld.elements.forEach((value, j) => expect(value).toBeCloseTo(neutral[i].elements[j], 8)));
  });
});
