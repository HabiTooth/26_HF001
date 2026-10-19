declare namespace kakao.maps {
  class LatLng {
    constructor(lat: number, lng: number);
    getLat(): number;
    getLng(): number;
  }

  class LatLngBounds {
    extend(latlng: LatLng): void;
    isEmpty(): boolean;
  }

  class Map {
    constructor(container: HTMLElement, options: { center: LatLng; level?: number });
    setCenter(latlng: LatLng): void;
    getCenter(): LatLng;
    setLevel(level: number): void;
    setBounds(bounds: LatLngBounds): void;
    relayout(): void;
  }

  class Marker {
    constructor(options: { position: LatLng; map?: Map; title?: string; zIndex?: number });
    setMap(map: Map | null): void;
    getPosition(): LatLng;
  }

  class CustomOverlay {
    constructor(options: {
      position: LatLng;
      content: string | HTMLElement;
      map?: Map;
      yAnchor?: number;
      zIndex?: number;
    });
    setMap(map: Map | null): void;
  }

  namespace event {
    function addListener(target: object, type: string, handler: () => void): void;
  }

  function load(callback: () => void): void;

  namespace services {
    type Status = 'OK' | 'ZERO_RESULT' | 'ERROR';

    const Status: {
      OK: 'OK';
      ZERO_RESULT: 'ZERO_RESULT';
      ERROR: 'ERROR';
    };

    interface PlaceResult {
      id: string;
      place_name: string;
      category_name: string;
      phone: string;
      address_name: string;
      road_address_name: string;
      x: string;
      y: string;
      place_url: string;
      distance: string;
    }

    class Places {
      keywordSearch(
        keyword: string,
        callback: (data: PlaceResult[], status: Status) => void,
        options?: {
          location?: LatLng;
          radius?: number;
          sort?: string;
          size?: number;
        },
      ): void;
    }
  }
}

interface Window {
  kakao?: typeof kakao;
}
