# Brand assets

An **original** mark: a folded page holding a pair of JSON braces `{ }`.
It borrows neither Google's logo or colours nor the JSON Resume logo.

## Files

| File | Size | Used for | Rule (source) |
|---|---|---|---|
| `src/logo.svg` (= `logo.svg`) | vector, 128 viewBox | source of every PNG | — |
| `icon-32.png` | 32×32 | Marketplace app icon (required) | [Create a listing][listing]: "at least two sizes: 32x32 and 128x128" |
| `icon-128.png` | 128×128 | Marketplace app icon (required); manifest `addOns.common.logoUrl` | same |
| `icon-48.png`, `icon-96.png` | 48×48, 96×96 | only if a web-app integration is added | [listing]: web apps also need 48 and 96 |
| `icon-120.png` | 120×120 | OAuth consent screen app logo (Google Auth platform › Branding) | [Branding help][brand]: square, "120px by 120px", ≤ 1 MB, PNG/JPG/BMP |
| `icon-512.png` | 512×512 | README header, GitHub social preview | — |
| `card-banner-220x140.png` | 220×140 | Marketplace application card banner (required) | [listing]: "Required size: 220x140 pixels" |
| `screenshot-placeholder-1280x800.png` | 1280×800 | **layout placeholder only** | see below |

All icons are **square, colour (not grayscale), transparent background**: the
[app review][review] criteria.

## Screenshots: placeholders are not submittable

- Marketplace needs **at least 1, up to 10** screenshots "showing your app's integration with
  Google services", **1280×800** recommended (640×400 or 2560×1600 also accepted), square
  corners, no padding ([listing]).
- Review rejects screenshots that "don't accurately represent app capabilities" ([review]).
- So `screenshot-placeholder-1280x800.png` only fixes the frame. Replace it with real captures —
  the list to take is in [`docs/marketplace-listing.md`](../docs/marketplace-listing.md#screenshots).
- Unaltered screenshots of Google services are allowed "for illustrative or informative
  purposes" ([Marketplace branding][mbrand]).

## Rebuild

```bash
RV=$(nix build --no-link --print-out-paths nixpkgs#resvg)/bin/resvg   # resvg 0.48.1
for s in 32 48 96 120 128 512; do $RV -w $s -h $s assets/src/logo.svg assets/icon-$s.png; done
$RV assets/src/banner.svg assets/card-banner-220x140.png
$RV assets/src/screenshot-placeholder.svg assets/screenshot-placeholder-1280x800.png
```

## Manifest `logoUrl`

- **Now:** `addOns.common.logoUrl` points at the jsonresume GitHub org avatar — **another
  project's logo**. Replace it.
- **Target** (once the repo is public):
  `https://raw.githubusercontent.com/ismailkattakath/jsonresume-connect/main/assets/icon-128.png`
  (or the GitHub Pages copy). The [manifest reference][manifest] only says "**Required.** The
  public URL of the toolbar image" — it names no size; 128×128 PNG over HTTPS matches the
  Marketplace icon. **The URL changes if the repo is renamed or transferred** — update both.
- **Now pinned to a commit SHA** (`/<40-hex sha>/assets/icon-128.png`). Studio and GitHub's raw CDN
  cache the image by URL, so after the icon was resized on 2026-10-27 the `main` URL kept showing the
  old one. A new SHA is a new URL, which no cache has seen. **When the icon changes:** commit the
  new PNGs, then set `logoUrl` to that commit's SHA (a test requires the 40-hex form).

## Colours

| Token | Hex | Why |
|---|---|---|
| page | `#3D2C8D` | deep indigo: not Google blue `#4285F4`, not Docs blue |
| fold | `#9D8DF1` | lighter tint of the same hue |
| braces | `#FFFFFF` | contrast on indigo |
| banner bg | `#EEEAFE` → `#D9D2FB` | soft tint; JSON Resume's `#FFF18F` avoided on purpose |

[listing]: https://developers.google.com/workspace/marketplace/create-listing
[review]: https://developers.google.com/workspace/marketplace/about-app-review
[brand]: https://support.google.com/cloud/answer/15549049
[mbrand]: https://developers.google.com/workspace/marketplace/terms/branding
[manifest]: https://developers.google.com/apps-script/manifest/addons
