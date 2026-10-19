'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useDentitionStore } from '@/stores/dentitionStore';
import type { MarkerVisibility, ToothAnalysisResult } from './ThreeScene';
import type { SurfaceType, ToothLesion } from '@/lib/api/report';

const ThreeScene = dynamic(() => import('./ThreeScene'), { ssr: false });

interface OralViewer3DProps {
  analysisResults: ToothAnalysisResult[];
  lesions?: ToothLesion[];
  scannedTeeth?: number[];
  onToothSelect?: (fdi: string | null) => void;
  selectedTooth?: string | null;
  calibrationMode?: boolean;
  minimal?: boolean;
  zoom?: number;
  fitToViewport?: boolean;
  resolutionScale?: number;
  visibleMarkers?: MarkerVisibility;
  initialPose?: 'front' | 'inside';
  focusSurface?: SurfaceType | null;
  idleMarkers?: boolean;
  toothColors?: Record<string, string>;
}

export default function OralViewer3D({
  analysisResults,
  lesions,
  scannedTeeth,
  onToothSelect,
  selectedTooth,
  calibrationMode = false,
  minimal,
  zoom,
  fitToViewport,
  resolutionScale,
  visibleMarkers,
  initialPose,
  focusSurface,
  idleMarkers,
  toothColors,
}: OralViewer3DProps) {
  const { missing, hydrate } = useDentitionStore();

  useEffect(() => hydrate(), [hydrate]);

  return (
    <div className="w-full h-full">
      <ThreeScene
        analysisResults={analysisResults}
        lesions={lesions}
        missingTeeth={missing}
        scannedTeeth={scannedTeeth}
        onToothSelect={onToothSelect}
        selectedTooth={selectedTooth}
        calibrationMode={calibrationMode}
        minimal={minimal}
        zoom={zoom}
        fitToViewport={fitToViewport}
        resolutionScale={resolutionScale}
        visibleMarkers={visibleMarkers}
        initialPose={initialPose}
        focusSurface={focusSurface}
        idleMarkers={idleMarkers}
        toothColors={toothColors}
      />
    </div>
  );
}
