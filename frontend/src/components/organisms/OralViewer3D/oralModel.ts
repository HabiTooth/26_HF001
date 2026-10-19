import * as THREE from 'three';

export const ORAL_MODEL_PATH = '/models/oral-model.glb';
export const ORAL_GUM_COLOR = '#CF5A78';
export const GUM_BASE_HEIGHT = 0.7125;
export const GUM_RIM_INSET = 0.04;
export const ORAL_VIEW_LIMITS = {
  enablePan: false,
  minAzimuthAngle: (-40 * Math.PI) / 180,
  maxAzimuthAngle: (40 * Math.PI) / 180,
  minPolarAngle: Math.PI / 2 - 0.4,
  maxPolarAngle: Math.PI / 2 + 0.4,
};

// 월드 단위(최대 변 10). 라디안
// 정면은 어금니 뒤 경첩 기준
const FRONT_TILT_UPPER = 0.52;
const FRONT_TILT_LOWER = 0.3;
// 모델에 위아래 틈이 있어 음수
const FRONT_GAP = -0.4;
const INSIDE_TILT = 0.7;
const INSIDE_GAP = 1.6;

export function prepareOralModel(model: THREE.Object3D) {
  const jaws: Array<{
    pivot: THREE.Group;
    base: THREE.Vector3;
    direction: number;
    hinge: THREE.Vector3;
  }> = [];
  const meshes: Array<{ mesh: THREE.Mesh; upper: boolean }> = [];
  model.updateMatrixWorld(true);
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    if (/^part_\d+$/.test(object.name)) {
      object.visible = false;
      return;
    }
    if (/^(upper|lower)_gum$/.test(object.name)) {
      // 치경부 아래만 압축
      if (!object.userData.reportGumHeightAdjusted) {
        object.geometry = object.geometry.clone();
        object.geometry.computeBoundingBox();
        const baseY = object.geometry.boundingBox!.min.y;
        const center = object.geometry.boundingBox!.getCenter(new THREE.Vector3());
        const positions = object.geometry.getAttribute('position');
        for (let i = 0; i < positions.count; i += 1) {
          const y = positions.getY(i);
          if (y < 0) {
            positions.setY(i, y * GUM_BASE_HEIGHT);
            const rim = THREE.MathUtils.smoothstep(y / baseY, 0.65, 1);
            const inset = 1 - GUM_RIM_INSET * rim;
            positions.setX(i, center.x + (positions.getX(i) - center.x) * inset);
            positions.setZ(i, center.z + (positions.getZ(i) - center.z) * inset);
          }
        }
        positions.needsUpdate = true;
        object.geometry.computeVertexNormals();
        object.geometry.computeBoundingBox();
        object.geometry.computeBoundingSphere();
        object.userData.reportGumHeightAdjusted = true;
      }

      // 단색 잇몸 재질
      object.material = new THREE.MeshPhysicalMaterial({
        name: 'gum',
        color: ORAL_GUM_COLOR,
        vertexColors: false,
        roughness: 0.45,
        metalness: 0,
        clearcoat: 0.5,
        clearcoatRoughness: 0.35,
        envMapIntensity: 0.8,
        opacity: 1,
        transparent: false,
        side: THREE.DoubleSide,
      });
    }
    let parent: THREE.Object3D | null = object;
    let upper: boolean | undefined;
    while (parent && upper === undefined) {
      if (parent.name === 'upper' || parent.name === 'upper_pivot') upper = true;
      if (parent.name === 'lower' || parent.name === 'lower_pivot') upper = false;
      parent = parent.parent;
    }
    const fdi = object.name.match(/tooth[_\-\s]?(\d{2})/i)?.[1];
    upper ??= fdi ? Number(fdi) < 30 : /upper/i.test(object.name);
    meshes.push({ mesh: object, upper });
  });
  const box = new THREE.Box3();
  meshes.forEach(({ mesh }) => box.expandByObject(mesh));
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const scale = 10 / Math.max(size.x, size.y, size.z);
  model.scale.setScalar(scale);
  model.position.copy(center).multiplyScalar(-scale);
  model.updateMatrixWorld(true);
  for (const upper of [true, false]) {
    const selected = meshes.filter((item) => item.upper === upper);
    const jawBox = new THREE.Box3();
    selected.forEach(({ mesh }) => jawBox.expandByObject(mesh));
    const pivot = new THREE.Group();
    pivot.name = upper ? 'report_upper_pivot' : 'report_lower_pivot';
    const worldCenter = jawBox.getCenter(new THREE.Vector3());
    model.add(pivot);
    pivot.position.copy(model.worldToLocal(worldCenter));
    model.updateMatrixWorld(true);
    selected.forEach(({ mesh }) => pivot.attach(mesh));
    jaws.push({
      pivot,
      base: pivot.position.clone(),
      direction: upper ? 1 : -1,
      hinge: new THREE.Vector3(0, 0, (jawBox.min.z - worldCenter.z) / scale),
    });
  }
  // 정면(p=0)은 앞니만 벌어지게 회전 보정. 안쪽 보기(p=1)는 그대로
  const setPose = (progress: number) => {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const gap = THREE.MathUtils.lerp(FRONT_GAP, INSIDE_GAP, p);
    jaws.forEach(({ pivot, base, direction, hinge }) => {
      const frontTilt = direction > 0 ? FRONT_TILT_UPPER : FRONT_TILT_LOWER;
      const tilt = THREE.MathUtils.lerp(frontTilt, INSIDE_TILT, p);
      pivot.rotation.set(-direction * tilt, Math.PI * p, 0);
      const swing = hinge
        .clone()
        .sub(hinge.clone().applyEuler(pivot.rotation))
        .multiplyScalar(1 - p);
      pivot.position.copy(base).add(swing);
      pivot.position.y += direction * (gap / scale);
    });
    model.updateMatrixWorld(true);
  };
  setPose(0);
  const bounds = () => {
    const bounds = new THREE.Box3();
    meshes.forEach(({ mesh }) => {
      if (mesh.visible) bounds.expandByObject(mesh);
    });
    return bounds;
  };
  return { setPose, bounds };
}
