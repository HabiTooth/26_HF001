'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Crosshair,
  ExternalLink,
  LocateFixed,
  Loader2,
  MapPin,
  Phone,
} from 'lucide-react';
import NavBar from '@/components/organisms/NavBar';
import PageShell from '@/components/organisms/PageShell';
import { useCurrentPosition, useKakaoMaps } from '@/hooks/useKakaoMaps';
import { toothName } from '@/lib/dentition';
import { LESION_LABEL } from '@/lib/lesionRisk';
import type { LesionType } from '@/lib/api/common';
import PageHeader from '@/components/molecules/PageHeader';

const RADIUS_M = 3000;
const RESULT_SIZE = 15;

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: number;
  url: string;
  lat: number;
  lng: number;
}

const formatDistance = (m: number) => (m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`);

function markMe(map: kakao.maps.Map, position: kakao.maps.LatLng) {
  const dot = document.createElement('div');
  dot.className = 'map-me';
  dot.setAttribute('aria-label', '현재 위치');

  return new kakao.maps.CustomOverlay({
    position,
    content: dot,
    map,
    yAnchor: 0.5,
    zIndex: 10,
  });
}

export default function ClinicsPage() {
  const mapsStatus = useKakaoMaps();
  const { coords, exact, pending, refresh } = useCurrentPosition();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<kakao.maps.Map | null>(null);
  const markers = useRef<kakao.maps.Marker[]>([]);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const meMarker = useRef<kakao.maps.CustomOverlay | null>(null);
  const explorerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ y: number; height: number; moved: boolean } | null>(null);
  const [sheetHeight, setSheetHeight] = useState(42);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapsStatus !== 'ready') return;
    const observer = new ResizeObserver(() => {
      const map = mapInstance.current;
      if (!map) return;
      const center = map.getCenter();
      map.relayout();
      map.setCenter(center);
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [mapsStatus]);

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // 출발 치아 쿼리. useSearchParams는 Suspense 필요해서 직접 읽음
  const [from, setFrom] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tooth = Number(params.get('tooth'));
    const lesion = params.get('lesion') as LesionType | null;
    if (!Number.isInteger(tooth) || !tooth) return;
    const what = lesion && LESION_LABEL[lesion] ? LESION_LABEL[lesion] : '병변';
    setFrom(`${toothName(tooth)}(${tooth}번)의 ${what} 때문에 왔어요`);
  }, []);

  const focus = useCallback((clinic: Pick<Clinic, 'id' | 'lat' | 'lng'>, scroll: boolean) => {
    setSelected(clinic.id);
    mapInstance.current?.setCenter(new kakao.maps.LatLng(clinic.lat, clinic.lng));
    mapInstance.current?.setLevel(3);
    if (scroll) {
      setSheetHeight((height) => Math.max(height, 42));
      cardRefs.current.get(clinic.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useEffect(() => {
    if (mapsStatus !== 'ready' || pending || !mapRef.current || mapInstance.current) return;

    const center = new kakao.maps.LatLng(coords.lat, coords.lng);
    mapInstance.current = new kakao.maps.Map(mapRef.current, { center, level: 5 });

    meMarker.current = markMe(mapInstance.current, center);

    setSearching(true);
    new kakao.maps.services.Places().keywordSearch(
      '치과',
      (data, status) => {
        setSearching(false);

        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          setSearchError('주변에 검색된 치과가 없어요. 지도를 움직여 다시 찾아보세요.');
          return;
        }
        if (status !== kakao.maps.services.Status.OK) {
          setSearchError('검색에 실패했어요. 잠시 후 다시 시도해 주세요.');
          return;
        }

        const found = data
          .filter((place) => place.category_name.includes('치과'))
          .map((place) => ({
            id: place.id,
            name: place.place_name,
            address: place.road_address_name || place.address_name,
            phone: place.phone,
            distance: Number(place.distance) || 0,
            url: place.place_url,
            lat: Number(place.y),
            lng: Number(place.x),
          }));

        if (found.length === 0) {
          setSearchError('주변에 검색된 치과가 없어요. 지도를 움직여 다시 찾아보세요.');
          return;
        }

        setClinics(found);

        const bounds = new kakao.maps.LatLngBounds();
        bounds.extend(center);

        markers.current.forEach((m) => m.setMap(null));
        markers.current = found.map((clinic) => {
          const position = new kakao.maps.LatLng(clinic.lat, clinic.lng);
          bounds.extend(position);
          const marker = new kakao.maps.Marker({
            position,
            map: mapInstance.current!,
            title: clinic.name,
          });
          kakao.maps.event.addListener(marker, 'click', () => focus(clinic, true));
          return marker;
        });

        if (!bounds.isEmpty()) mapInstance.current!.setBounds(bounds);
      },
      { location: center, radius: RADIUS_M, sort: 'distance', size: RESULT_SIZE },
    );
  }, [mapsStatus, pending, coords, focus]);

  const [locating, setLocating] = useState(false);

  const goToMe = async () => {
    if (locating) return;
    setLocating(true);
    const next = await refresh();
    setLocating(false);

    const position = new kakao.maps.LatLng(next.lat, next.lng);
    meMarker.current?.setMap(null);
    if (mapInstance.current) {
      meMarker.current = markMe(mapInstance.current, position);
      mapInstance.current.setCenter(position);
      mapInstance.current.setLevel(4);
    }
    setSelected(null);
  };

  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const notice =
    mapsStatus === 'no-key'
      ? {
          title: '지도 키가 아직 없어요',
          lines: ['.env.local에 NEXT_PUBLIC_KAKAO_MAP_KEY를 넣고 개발 서버를 다시 켜 주세요.'],
        }
      : mapsStatus === 'failed'
        ? {
            title: '카카오가 이 주소를 거절했어요',
            lines: [
              `현재 주소: ${origin}`,
              '카카오 개발자센터 > 내 애플리케이션 > 플랫폼 > Web 에 이 주소를 그대로 등록해 주세요.',
              '앱 키는 REST 키 말고 JavaScript 키여야 해요.',
            ],
          }
        : mapsStatus === 'timeout'
          ? {
              title: '지도 응답이 없어요',
              lines: ['네트워크를 확인하고 새로고침해 주세요.'],
            }
          : null;

  return (
    <PageShell fill>
      <PageHeader title="근처 치과" className="flex-shrink-0" />

      {from && (
        <p className="m-0 flex-shrink-0 bg-primary-light px-5 py-2 text-[11.5px] text-primary">
          {from} · 스케일링 상담을 받아보세요
        </p>
      )}

      {notice !== null ? (
        <div className="px-5 pt-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-[20px] shadow-card p-6">
            <MapPin size={24} className="text-muted mx-auto mb-2 block" />
            <p className="m-0 mb-2 text-[13px] font-semibold text-content text-center">
              {notice.title}
            </p>
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
              {notice.lines.map((line) => (
                <li
                  key={line}
                  className="text-[11.5px] text-muted leading-relaxed break-all bg-hairline/40 rounded-lg px-3 py-2"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div ref={explorerRef} className="relative flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-0 overflow-hidden bg-[#EAF2FB]">
              <div ref={mapRef} className="w-full h-full" />
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-[#4A86D9] px-3 py-2 text-[11px] font-bold text-white shadow-[0_3px_10px_rgba(38,83,146,0.22)] pointer-events-none">
                <MapPin size={13} />{exact ? '내 주변 3km' : '서울시청 주변 3km'}
              </div>
              <button
                type="button"
                onClick={goToMe}
                aria-label="현 위치로"
                className="absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm shadow-card border border-hairline flex items-center justify-center transition-transform active:scale-95"
              >
                {locating ? (
                  <Loader2 size={17} className="animate-spin text-primary" />
                ) : (
                  <LocateFixed size={17} className="text-primary" />
                )}
              </button>
            </div>
          </div>

          <section className={`relative z-20 flex-shrink-0 flex flex-col min-h-[84px] rounded-t-[28px] bg-white shadow-[0_-8px_24px_rgba(43,76,119,0.12)] -mt-5 ${dragging ? '' : 'transition-[height] duration-200 ease-out'}`} style={{ height: `${sheetHeight}%` }} aria-label="주변 치과 목록">
            <div
              role="slider"
              tabIndex={0}
              aria-label="치과 목록 높이 조절"
              aria-valuemin={14}
              aria-valuemax={76}
              aria-valuenow={Math.round(sheetHeight)}
              aria-valuetext={sheetHeight < 25 ? '지도 크게 보기' : sheetHeight > 60 ? '목록 크게 보기' : '지도와 목록 함께 보기'}
              aria-orientation="vertical"
              className="group flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none px-5 pt-3 pb-3 outline-none rounded-t-[28px]"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                dragRef.current = { y: e.clientY, height: sheetHeight, moved: false };
                setDragging(true);
              }}
              onPointerMove={(e) => {
                const drag = dragRef.current;
                if (!drag || !explorerRef.current) return;
                const delta = drag.y - e.clientY;
                if (Math.abs(delta) > 4) drag.moved = true;
                const height = explorerRef.current.clientHeight;
                setSheetHeight(Math.max(14, Math.min(76, drag.height + delta / height * 100)));
              }}
              onPointerUp={(e) => {
                const drag = dragRef.current;
                if (!drag) return;
                dragRef.current = null;
                setDragging(false);
                e.currentTarget.releasePointerCapture(e.pointerId);
                setSheetHeight((height) => drag.moved
                  ? [14, 42, 76].reduce((nearest, value) => Math.abs(value - height) < Math.abs(nearest - height) ? value : nearest)
                  : height < 25 ? 42 : height < 60 ? 76 : 14);
              }}
              onPointerCancel={() => { dragRef.current = null; setDragging(false); }}
              onKeyDown={(e) => {
                if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
                e.preventDefault();
                setSheetHeight((height) => e.key === 'Home' ? 14 : e.key === 'End' ? 76 : Math.max(14, Math.min(76, height + (e.key === 'ArrowUp' ? 14 : -14))));
              }}
            >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#C9D6E7] group-focus-visible:bg-[#4A86D9] group-focus-visible:ring-4 group-focus-visible:ring-[#E4F0FF]" />
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-[16px] font-bold text-content">주변 치과</h2>
              <span className="rounded-full bg-[#E4F0FF] px-2.5 py-1 text-[11px] font-semibold text-[#4A86D9]">
                {searching || pending ? '검색 중' : `${clinics.length}곳 · 가까운 순`}
              </span>
            </div>
            </div>
            <div className="thin-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-5">
            {!exact && !pending && (
              <p className="m-0 mb-3 flex items-center gap-1.5 text-[11px] font-medium text-[#687B94]">
                <Crosshair size={13} className="flex-shrink-0" />
                위치 권한이 없어 서울시청 기준으로 찾았어요
              </p>
            )}
            {(searching || pending) && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span className="text-[12px] text-muted">
                  {pending ? '위치를 확인하고 있어요' : '주변 치과를 찾고 있어요'}
                </span>
              </div>
            )}

            {searchError && <p className="m-0 px-1 py-2 text-[12px] text-muted">{searchError}</p>}

            <div className="flex flex-col gap-3">
              {clinics.map((clinic) => (
                <div
                  key={clinic.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(clinic.id, el);
                    else cardRefs.current.delete(clinic.id);
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => focus(clinic, false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') focus(clinic, false);
                  }}
                  className={`rounded-[22px] border p-4 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                    selected === clinic.id
                      ? 'bg-[#F0F6FF] border-[#80AFE9] shadow-[0_4px_16px_rgba(74,134,217,0.10)]'
                      : 'bg-white border-[#EAF0F8] shadow-[0_4px_16px_rgba(71,105,154,0.04)]'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`m-0 text-[15px] font-bold truncate ${
                        selected === clinic.id ? 'text-primary' : 'text-content'
                      }`}
                    >
                      {clinic.name}
                    </p>
                    {clinic.distance > 0 && (
                      <span className="rounded-full bg-[#E4F0FF] px-2.5 py-1 text-[12px] text-[#4A86D9] font-bold flex-shrink-0 tabular-nums">
                        {formatDistance(clinic.distance)}
                      </span>
                    )}
                  </div>
                  <p className="m-0 mt-2 text-[12px] font-medium text-[#687B94] leading-relaxed">
                    {clinic.address}
                  </p>

                  <div className="flex items-center gap-2 mt-2.5">
                    {clinic.phone && (
                      <a
                        href={`tel:${clinic.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary-light text-[11px] font-semibold text-primary no-underline"
                      >
                        <Phone size={11} />
                        {clinic.phone}
                      </a>
                    )}
                    <a
                      href={clinic.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-hairline text-[11px] font-semibold text-[#687B94] no-underline"
                    >
                      <ExternalLink size={11} />
                      상세
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {clinics.length > 0 && (
              <p className="m-0 mt-3 px-1 text-[10px] text-muted leading-relaxed">
                카카오맵 장소 검색 결과예요. 진료 과목과 진료 시간은 각 병원에 확인해 주세요.
              </p>
            )}
            </div>
          </section>
        </div>
      )}

      <NavBar activeTab="home" />
    </PageShell>
  );
}
