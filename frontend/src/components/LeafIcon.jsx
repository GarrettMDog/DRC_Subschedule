/**
 * CrOps' own emblem — a tobacco leaf outline, drawn as an inline SVG
 * rather than reusing the raster PNGs built for the Teams app manifest.
 * Those are fixed white-on-transparent, built for Teams' own dark
 * sidebar specifically; this instead uses currentColor for both stroke
 * and fill, so it automatically matches whatever text color surrounds it
 * — correct in both light and dark theme, with no separate dark-mode
 * version needed.
 *
 * Same leaf geometry (lanceolate outline, central vein, branching side
 * veins) as the manifest icons, just recomputed at a size meant for
 * sitting inline next to small UI text rather than as a standalone app icon.
 */
export default function LeafIcon({ size = 14, style, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      {...rest}
    >
      <polygon points="12.00,3.00 13.50,3.90 14.31,4.80 14.98,5.70 15.57,6.60 16.10,7.50 16.59,8.40 17.06,9.30 17.50,10.20 17.08,11.10 16.66,12.00 16.23,12.90 15.80,13.80 15.37,14.70 14.93,15.60 14.48,16.50 14.03,17.40 13.56,18.30 13.08,19.20 12.57,20.10 12.00,21.00 11.43,20.10 10.92,19.20 10.44,18.30 9.97,17.40 9.52,16.50 9.07,15.60 8.63,14.70 8.20,13.80 7.77,12.90 7.34,12.00 6.92,11.10 6.50,10.20 6.94,9.30 7.41,8.40 7.90,7.50 8.43,6.60 9.02,5.70 9.69,4.80 10.50,3.90" />
      <line x1="12" y1="3.9" x2="12" y2="20.1" />
      <line x1="12" y1="8.63" x2="15.2" y2="10.23" />
      <line x1="12" y1="8.63" x2="8.8" y2="10.23" />
      <line x1="12" y1="11.55" x2="15.84" y2="13.47" />
      <line x1="12" y1="11.55" x2="8.16" y2="13.47" />
      <line x1="12" y1="14.48" x2="15.5" y2="16.22" />
      <line x1="12" y1="14.48" x2="8.5" y2="16.22" />
    </svg>
  );
}
