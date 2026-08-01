import { useState, useEffect } from "react";
import { MapPin, ExternalLink, Loader2 } from "lucide-react";

// In-memory cache so identical GPS coordinates are not reverse-geocoded repeatedly
const locationCache = new Map<string, string>();

interface GpsLocationDisplayProps {
  lat?: number | string | null;
  lng?: number | string | null;
  notes?: string | null;
  className?: string;
  showMapLink?: boolean;
}

export function GpsLocationDisplay({
  lat,
  lng,
  notes,
  className = "",
  showMapLink = true,
}: GpsLocationDisplayProps) {
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const numLat = lat != null ? Number(lat) : null;
  const numLng = lng != null ? Number(lng) : null;
  const hasCoords =
    numLat !== null &&
    !isNaN(numLat) &&
    numLng !== null &&
    !isNaN(numLng) &&
    (numLat !== 0 || numLng !== 0);

  useEffect(() => {
    if (!hasCoords) return;

    const cacheKey = `${numLat.toFixed(4)},${numLng.toFixed(4)}`;
    if (locationCache.has(cacheKey)) {
      setResolvedAddress(locationCache.get(cacheKey)!);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${numLat}&lon=${numLng}&format=json`, {
      headers: { "User-Agent": "IAMS-App/1.0" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.display_name) {
          const parts = data.display_name.split(",").map((s: string) => s.trim());
          // Shorten address format for clean display: e.g. "Ho Technical University, Ho, Ghana"
          const shortAddress =
            parts.length > 3
              ? `${parts[0]}, ${parts[1]}, ${parts[parts.length - 2] || parts[parts.length - 1]}`
              : data.display_name;

          locationCache.set(cacheKey, shortAddress);
          setResolvedAddress(shortAddress);
        } else {
          const fallback = `${numLat.toFixed(5)}, ${numLng.toFixed(5)}`;
          locationCache.set(cacheKey, fallback);
          setResolvedAddress(fallback);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const fallback = `${numLat.toFixed(5)}, ${numLng.toFixed(5)}`;
        setResolvedAddress(fallback);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [numLat, numLng, hasCoords]);

  if (!hasCoords && !notes) {
    return <span className="text-muted-foreground">—</span>;
  }

  const googleMapsUrl = hasCoords ? `https://www.google.com/maps?q=${numLat},${numLng}` : null;

  return (
    <div className={`space-y-1 ${className}`}>
      {notes && (
        <p className="text-xs font-medium text-foreground flex items-start gap-1">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <span>{notes}</span>
        </p>
      )}

      {hasCoords && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 font-medium">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            {loading ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Resolving location...
              </span>
            ) : (
              <span className="text-foreground font-semibold">
                {resolvedAddress ?? `${numLat!.toFixed(5)}, ${numLng!.toFixed(5)}`}
              </span>
            )}
          </span>

          {showMapLink && googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-semibold transition-colors text-[0.75rem]"
              title="Open location in Google Maps"
            >
              Google Maps <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {hasCoords && (
        <p className="text-[0.7rem] text-muted-foreground/70 font-mono">
          GPS: {numLat!.toFixed(6)}, {numLng!.toFixed(6)}
        </p>
      )}
    </div>
  );
}
