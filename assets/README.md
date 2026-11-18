# Brand assets

The mark is **made by the JSON Resume project for this app**: the JSON Resume mark, filled with
its yellow, in front of the document it becomes. It borrows nothing from Google's logo or colours.

- **Source:** [`jsonresume/jsonresume.org`, `apps/styleguide/public/brand/partners/jsonresume-connect/`][partner],
  copied byte for byte at commit `cf09f9b33b89cb13dd72df99be05a4e7a1923a17` (2026-11-06).
- **Permission**, from that folder's README: "JSON Resume Connect may use these files as its app
  icon, OAuth consent logo and listing images. Describe it as an independent app that works
  with JSON Resume; the plain JSON Resume logo stays the project's own." Offered by the
  maintainer in [jsonresume.org#638](https://github.com/jsonresume/jsonresume.org/issues/638).
- **Do not redraw or re-render the icons.** `logo.svg` and every `icon-*.png` are upstream's
  files. To update them, copy the new upstream files. Only the banner is built here.
- The first mark (a folded indigo page with braces, 2026-10-27) is in this folder's git history.

## Files

| File | Size | Used for | Rule (source) |
|---|---|---|---|
| `src/logo.svg` (= `logo.svg`) | vector, 128 viewBox | upstream's `icon.svg`; the banner embeds its paths | — |
| `icon-32.png` | 32×32 | Marketplace app icon (required) | [Create a listing][listing]: "at least two sizes: 32x32 and 128x128" |
| `icon-128.png` | 128×128 | Marketplace app icon (required); manifest `addOns.common.logoUrl` | same |
| `icon-48.png`, `icon-96.png` | 48×48, 96×96 | only if a web-app integration is added | [listing]: web apps also need 48 and 96 |
| `icon-120.png` | 120×120 | OAuth consent screen app logo (Google Auth platform › Branding) | [Branding help][brand]: square, "120px by 120px", ≤ 1 MB, PNG/JPG/BMP |
| `icon-512.png` | 512×512 | README header, GitHub social preview | — |
| `card-banner-220x140.png` | 220×140 | Marketplace application card banner (required) | [listing]: "Required size: 220x140 pixels" |
| `screenshots/1-flow.png` … `4-outputs.png` | 2560×1600 | Marketplace screenshots; README hero (shot 1) | [listing]: 1280×800 recommended, 2560×1600 accepted |

All icons are **square, colour (not grayscale), transparent background**: the
[app review][review] criteria.

## Screenshots

- Marketplace needs **at least 1, up to 10** screenshots "showing your app's integration with
  Google services", **1280×800** recommended (640×400 or 2560×1600 also accepted), square
  corners, no padding ([listing]).
- Review rejects screenshots that "don't accurately represent app capabilities" ([review]).
- Unaltered screenshots of Google services are allowed "for illustrative or informative
  purposes" ([Marketplace branding][mbrand]). So nothing is edited after capture: the account
  photo and the scrollbar are hidden with page CSS before the shot.
- **How they were taken:** a 1280×800 Chromium window at 2× (not device emulation, which clips
  Studio's side panel). The shot list and what is still missing:
  [`docs/marketplace-listing.md`](../docs/marketplace-listing.md#screenshots).
- **Licence:** the Studio interface in them is Google's. `REUSE.toml` marks them
  `LicenseRef-Google-Screenshot`, not MIT.

## Rebuild

```bash
RV=$(nix build --no-link --print-out-paths nixpkgs#resvg)/bin/resvg   # resvg 0.49.0
$RV assets/src/banner.svg assets/card-banner-220x140.png               # the banner only
```

The icons are not rebuilt (see the top of this file). `src/banner.svg` repeats the mark's paths
from `src/logo.svg`; if upstream changes the mark, copy the new paths into it.

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
| front page | `#FFF18F` | JSON Resume's brand yellow, set by upstream |
| back page | `#FFFFFF` | the document the résumé becomes, set by upstream |
| outline, braces | `#1A1A1A` | set by upstream |
| banner bg | `#FFFDF0` → `#FFF7C7` | ours: a pale tint of the same yellow, so the mark stays the darkest thing on the card |

[partner]: https://github.com/jsonresume/jsonresume.org/tree/master/apps/styleguide/public/brand/partners/jsonresume-connect
[listing]: https://developers.google.com/workspace/marketplace/create-listing
[review]: https://developers.google.com/workspace/marketplace/about-app-review
[brand]: https://support.google.com/cloud/answer/15549049
[mbrand]: https://developers.google.com/workspace/marketplace/terms/branding
[manifest]: https://developers.google.com/apps-script/manifest/addons
