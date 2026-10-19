import { describe, expect, it } from 'vitest';
import {
  CAPTURE_ISSUE_TEXT,
  DARK_THRESHOLD,
  analyzePixels,
  meanLuma,
  type CaptureIssue,
} from './imageQuality';

const W = 40;
const H = 30;

function flat(value: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
    data[i + 3] = 255;
  }
  return data;
}

function checker(dark: number, light: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = (x + y) % 2 === 0 ? light : dark;
      const i = (y * W + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return data;
}

describe('밝기 계산', () => {
  it('단색의 밝기를 그대로 낸다', () => {
    expect(meanLuma(flat(0))).toBeCloseTo(0, 5);
    expect(meanLuma(flat(128))).toBeCloseTo(128, 0);
    expect(meanLuma(flat(255))).toBeCloseTo(255, 0);
  });

  it('녹색을 가장 밝게, 파랑을 가장 어둡게 본다', () => {
    const solid = (r: number, g: number, b: number) => {
      const data = new Uint8ClampedArray(4 * 100);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
      return meanLuma(data);
    };
    expect(solid(0, 255, 0)).toBeGreaterThan(solid(255, 0, 0));
    expect(solid(255, 0, 0)).toBeGreaterThan(solid(0, 0, 255));
  });

  it('실시간 판정과 촬영 후 판정이 같은 기준을 쓴다', () => {
    const justDark = flat(Math.round(DARK_THRESHOLD) - 5);
    expect(meanLuma(justDark)).toBeLessThan(DARK_THRESHOLD);
    expect(analyzePixels(justDark, W, H).issues).toContain('dark');
  });
});

describe('촬영 품질 판정', () => {
  it('선명하고 밝기가 적당하면 통과한다', () => {
    const q = analyzePixels(checker(90, 190), W, H);
    expect(q.ok).toBe(true);
    expect(q.issues).toEqual([]);
  });

  it('경계가 없는 밋밋한 화면은 흔들림으로 본다', () => {
    const q = analyzePixels(flat(128), W, H);
    expect(q.issues).toContain('blurry');
    expect(q.ok).toBe(false);
  });

  it('어두우면 dark를 낸다', () => {
    const q = analyzePixels(checker(0, 20), W, H);
    expect(q.issues).toContain('dark');
  });

  it('밝으면 bright를 낸다', () => {
    const q = analyzePixels(checker(240, 255), W, H);
    expect(q.issues).toContain('bright');
  });

  it('dark와 bright가 동시에 나오지 않는다', () => {
    for (const value of [0, 40, 128, 230, 255]) {
      const q = analyzePixels(flat(value), W, H);
      const both = q.issues.includes('dark') && q.issues.includes('bright');
      expect(both).toBe(false);
    }
  });

  it('밝기는 실제 픽셀값을 따라간다', () => {
    expect(analyzePixels(flat(0), W, H).brightness).toBeCloseTo(0, 5);
    expect(analyzePixels(flat(255), W, H).brightness).toBeCloseTo(255, 0);
    expect(analyzePixels(flat(128), W, H).brightness).toBeCloseTo(128, 0);
  });

  it('대비가 클수록 선명도가 높다', () => {
    const weak = analyzePixels(checker(120, 135), W, H).sharpness;
    const strong = analyzePixels(checker(40, 220), W, H).sharpness;
    expect(strong).toBeGreaterThan(weak);
  });

  it('ok는 issues가 비었을 때만 true다', () => {
    for (const data of [flat(0), flat(128), flat(255), checker(90, 190)]) {
      const q = analyzePixels(data, W, H);
      expect(q.ok).toBe(q.issues.length === 0);
    }
  });

  it('모든 문제 유형에 안내 문구가 있다', () => {
    const issues: CaptureIssue[] = ['dark', 'bright', 'blurry'];
    for (const issue of issues) {
      expect(CAPTURE_ISSUE_TEXT[issue].label).toBeTruthy();
      expect(CAPTURE_ISSUE_TEXT[issue].hint).toBeTruthy();
    }
  });
});
