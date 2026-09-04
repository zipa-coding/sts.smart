const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const logoB64 = fs.readFileSync("src/assets/images/smp_logo_exact_match_revised_1783840969621.jpg").toString("base64");

// Craft master 512x512 SVG with luxury Apple macOS / Fluent design
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Deep Royal Navy Gradient Background -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b1329"/>
      <stop offset="35%" stop-color="#0e1d3e"/>
      <stop offset="70%" stop-color="#09142b"/>
      <stop offset="100%" stop-color="#040814"/>
    </linearGradient>

    <!-- Top Specular Glass Reflection -->
    <linearGradient id="glassGloss" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="35%" stop-color="#60a5fa" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>

    <!-- Luxury Gold Gradient -->
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="25%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#fbbf24"/>
      <stop offset="75%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>

    <!-- Gold Metallic 2 -->
    <linearGradient id="goldGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb"/>
      <stop offset="30%" stop-color="#fbbf24"/>
      <stop offset="70%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#fef3c7"/>
    </linearGradient>

    <!-- Blue Royal Radial Glow -->
    <radialGradient id="royalGlow" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#1d4ed8" stop-opacity="0.2"/>
      <stop offset="85%" stop-color="#0a1226" stop-opacity="0"/>
    </radialGradient>

    <!-- Rim Light Gradient -->
    <linearGradient id="rimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0.2"/>
    </linearGradient>

    <!-- Drop Shadows -->
    <filter id="shadowBig" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#000000" flood-opacity="0.65"/>
    </filter>
    <filter id="glowGold" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#f59e0b" flood-opacity="0.5"/>
    </filter>
    <filter id="subtleShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Base Squircle with Outer Glow and Shadow -->
  <rect x="24" y="24" width="464" height="464" rx="108" fill="url(#bgGradient)" filter="url(#shadowBig)"/>
  
  <!-- Outer Bevel Gold Rim -->
  <rect x="24" y="24" width="464" height="464" rx="108" fill="none" stroke="url(#goldGradient)" stroke-width="4" stroke-opacity="0.9"/>
  <rect x="28" y="28" width="456" height="456" rx="104" fill="none" stroke="url(#rimGrad)" stroke-width="2"/>

  <!-- Radial Background Lighting in Center -->
  <circle cx="256" cy="220" r="190" fill="url(#royalGlow)"/>

  <!-- Islamic 8-Point Geometric Star Halo Behind Crest -->
  <g opacity="0.22" stroke="url(#goldGradient)" stroke-width="2" fill="none">
    <rect x="156" y="120" width="200" height="200" rx="12" transform="rotate(0 256 220)"/>
    <rect x="156" y="120" width="200" height="200" rx="12" transform="rotate(45 256 220)"/>
    <circle cx="256" cy="220" r="148"/>
  </g>

  <!-- Central Circular Medallion Outer Gold Bezel -->
  <circle cx="256" cy="212" r="136" fill="#091024" filter="url(#subtleShadow)"/>
  <circle cx="256" cy="212" r="133" fill="url(#bgGradient)"/>
  <circle cx="256" cy="212" r="130" fill="none" stroke="url(#goldGradient)" stroke-width="4.5" filter="url(#glowGold)"/>
  <circle cx="256" cy="212" r="123" fill="none" stroke="#60a5fa" stroke-width="2" stroke-opacity="0.6"/>

  <!-- Official School Logo Embedded Centered with Clean Aspect -->
  <g clip-path="url(#logoClip)">
    <clipPath id="logoClip">
      <circle cx="256" cy="212" r="118"/>
    </clipPath>
    <circle cx="256" cy="212" r="118" fill="#ffffff"/>
    <image href="data:image/png;base64,${logoB64}" x="136" y="92" width="240" height="240" preserveAspectRatio="xMidYMid meet"/>
  </g>

  <!-- Decorative Laurel Wreath / Golden Branches -->
  <g stroke="url(#goldGradient)" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.95">
    <!-- Left Wreath Curve -->
    <path d="M 116,215 C 110,285 150,345 212,360"/>
    <!-- Left Leaves -->
    <path d="M 115,235 Q 101,232 105,223 Q 115,226 115,235 Z" fill="url(#goldGradient)"/>
    <path d="M 123,268 Q 109,269 111,258 Q 121,259 123,268 Z" fill="url(#goldGradient)"/>
    <path d="M 140,300 Q 127,307 126,295 Q 136,292 140,300 Z" fill="url(#goldGradient)"/>
    <path d="M 169,330 Q 158,341 153,330 Q 163,323 169,330 Z" fill="url(#goldGradient)"/>

    <!-- Right Wreath Curve -->
    <path d="M 396,215 C 402,285 362,345 300,360"/>
    <!-- Right Leaves -->
    <path d="M 397,235 Q 411,232 407,223 Q 397,226 397,235 Z" fill="url(#goldGradient)"/>
    <path d="M 389,268 Q 403,269 401,258 Q 391,259 389,268 Z" fill="url(#goldGradient)"/>
    <path d="M 372,300 Q 385,307 386,295 Q 376,292 372,300 Z" fill="url(#goldGradient)"/>
    <path d="M 343,330 Q 354,341 359,330 Q 349,323 343,330 Z" fill="url(#goldGradient)"/>
  </g>

  <!-- Lower Banner Pedestal for RAPORT STS -->
  <g filter="url(#subtleShadow)">
    <!-- Banner Shadow Backing -->
    <path d="M 112,382 L 400,382 C 408,382 414,388 412,396 L 402,428 C 400,434 394,438 388,438 L 124,438 C 118,438 112,434 110,428 L 100,396 C 98,388 104,382 112,382 Z" fill="url(#goldGradient)"/>
    <!-- Inner Inset for Text -->
    <path d="M 116,386 L 396,386 C 401,386 405,390 404,395 L 395,425 C 394,429 390,432 386,432 L 126,432 C 122,432 118,429 117,425 L 108,395 C 107,390 111,386 116,386 Z" fill="#091224"/>
  </g>

  <!-- Banner Typography -->
  <text x="256" y="416" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="900" fill="url(#goldGrad2)" text-anchor="middle" letter-spacing="4">RAPORT STS</text>
  
  <!-- Tiny Subtitle & 3 Stars -->
  <g fill="url(#goldGradient)">
    <!-- Left Star -->
    <polygon points="144,409 146,413 151,413 147,416 149,420 144,417 140,420 142,416 138,413 143,413" />
    <!-- Right Star -->
    <polygon points="368,409 370,413 375,413 371,416 373,420 368,417 364,420 366,416 362,413 367,413" />
  </g>

  <!-- Top Glass Highlight Overlay (Smooth curved glossy sheen) -->
  <path d="M 28,30 C 130,30 382,30 484,30 C 484,30 484,160 484,160 C 370,200 142,200 28,160 Z" fill="url(#glassGloss)" rx="100" opacity="0.9"/>
</svg>`;

fs.writeFileSync("public/icon.svg", svgContent);
console.log("public/icon.svg written. Size:", svgContent.length);

async function generatePNGs() {
  const svgBuf = Buffer.from(svgContent);

  // 1. 512x512 standard PWA
  await sharp(svgBuf)
    .resize(512, 512)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile("public/pwa-512x512.png");
  console.log("pwa-512x512.png done");

  // 2. 192x192 PWA
  await sharp(svgBuf)
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile("public/pwa-192x192.png");
  console.log("pwa-192x192.png done");

  // 3. Apple Touch Icon (180x180)
  await sharp(svgBuf)
    .resize(180, 180)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile("public/apple-touch-icon.png");
  console.log("apple-touch-icon.png done");

  // 4. Maskable 512x512 (safe zone padding for Android adaptive icons)
  const innerIcon = await sharp(svgBuf).resize(410, 410).toBuffer();
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 11, g: 19, b: 41, alpha: 1 }
    }
  })
  .composite([{ input: innerIcon, top: 51, left: 51 }])
  .png()
  .toFile("public/pwa-maskable-512x512.png");
  console.log("pwa-maskable-512x512.png done");

  // 5. Favicon 32x32 and favicon.ico
  await sharp(svgBuf)
    .resize(32, 32)
    .png()
    .toFile("public/favicon.ico");
  await sharp(svgBuf)
    .resize(48, 48)
    .png()
    .toFile("public/favicon-48x48.png");
  console.log("favicons done");
}

generatePNGs().catch(err => {
  console.error(err);
  process.exit(1);
});
