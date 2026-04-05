const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const WIDTH = 1080;
const HEIGHT = 1920;
const OUTPUT_DIR = path.join(__dirname, 'video_output');

// Brand colors
const BRAND = {
  dark: '#0D0D0D',
  accent: '#FF4500',
  gold: '#FFD700',
  white: '#FFFFFF',
  gray: '#1A1A1A',
};

function svgText(text, opts = {}) {
  const { x = 540, y = 960, size = 64, fill = '#FFFFFF', anchor = 'middle', weight = 'bold', family = 'Arial' } = opts;
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}" font-family="${family}">${text}</text>`;
}

// ==================== FRAME 1: START FRAME (Logo/Brand Intro) ====================
async function createStartFrame() {
  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a2e"/>
        <stop offset="50%" style="stop-color:#16213e"/>
        <stop offset="100%" style="stop-color:#0f3460"/>
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${BRAND.accent}"/>
        <stop offset="100%" style="stop-color:${BRAND.gold}"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>

    <!-- Decorative lines -->
    <line x1="100" y1="700" x2="980" y2="700" stroke="${BRAND.accent}" stroke-width="2" opacity="0.5"/>
    <line x1="100" y1="1220" x2="980" y2="1220" stroke="${BRAND.accent}" stroke-width="2" opacity="0.5"/>

    <!-- Corner accents -->
    <rect x="60" y="660" width="40" height="4" fill="${BRAND.gold}"/>
    <rect x="60" y="660" width="4" height="40" fill="${BRAND.gold}"/>
    <rect x="980" y="660" width="40" height="4" fill="${BRAND.gold}"/>
    <rect x="1016" y="660" width="4" height="40" fill="${BRAND.gold}"/>

    <rect x="60" y="1216" width="40" height="4" fill="${BRAND.gold}"/>
    <rect x="60" y="1180" width="4" height="40" fill="${BRAND.gold}"/>
    <rect x="980" y="1216" width="40" height="4" fill="${BRAND.gold}"/>
    <rect x="1016" y="1180" width="4" height="40" fill="${BRAND.gold}"/>

    <!-- Brand name -->
    <text x="540" y="880" font-size="120" fill="url(#accent)" text-anchor="middle" font-weight="900" font-family="Arial Black, Arial" filter="url(#glow)">ONE ZONE</text>

    <!-- Tagline -->
    <text x="540" y="960" font-size="36" fill="${BRAND.white}" text-anchor="middle" font-weight="300" font-family="Arial" opacity="0.9">⚽ FOOTBALL JERSEYS ⚽</text>

    <!-- Hebrew subtitle -->
    <text x="540" y="1040" font-size="42" fill="${BRAND.gold}" text-anchor="middle" font-weight="bold" font-family="Arial" direction="rtl">חולצות כדורגל מהליגות המובילות</text>

    <!-- Bottom accent bar -->
    <rect x="340" y="1100" width="400" height="4" fill="url(#accent)" rx="2"/>

    <!-- Subtitle -->
    <text x="540" y="1160" font-size="32" fill="${BRAND.white}" text-anchor="middle" font-weight="400" font-family="Arial" opacity="0.7">PREMIUM QUALITY</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'frame_01_start.png'));
  console.log('✅ Start frame created');
}

// ==================== FRAME 2-4: Product Frames ====================
async function createProductFrame(imagePath, teamName, frameNum) {
  // Load and resize product image
  const productImg = await sharp(imagePath)
    .resize(600, 750, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#0D0D0D"/>
        <stop offset="100%" style="stop-color:#1a1a2e"/>
      </linearGradient>
      <linearGradient id="accent2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${BRAND.accent}"/>
        <stop offset="100%" style="stop-color:${BRAND.gold}"/>
      </linearGradient>
    </defs>

    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg2)"/>

    <!-- Top brand bar -->
    <rect x="0" y="0" width="${WIDTH}" height="120" fill="#111" opacity="0.8"/>
    <text x="540" y="80" font-size="48" fill="${BRAND.gold}" text-anchor="middle" font-weight="900" font-family="Arial Black, Arial">ONE ZONE</text>

    <!-- Team name -->
    <text x="540" y="250" font-size="56" fill="${BRAND.white}" text-anchor="middle" font-weight="bold" font-family="Arial">${teamName}</text>

    <!-- Accent line under team name -->
    <rect x="340" y="280" width="400" height="3" fill="url(#accent2)" rx="2"/>

    <!-- Product image placeholder area -->
    <rect x="240" y="380" width="600" height="750" fill="none" stroke="${BRAND.accent}" stroke-width="2" rx="10" opacity="0.3"/>

    <!-- Price area -->
    <rect x="290" y="1250" width="500" height="100" fill="${BRAND.accent}" rx="50"/>
    <text x="540" y="1315" font-size="48" fill="${BRAND.white}" text-anchor="middle" font-weight="900" font-family="Arial">🔥 מבצע חם 🔥</text>

    <!-- Hebrew text -->
    <text x="540" y="1450" font-size="38" fill="${BRAND.white}" text-anchor="middle" font-weight="bold" font-family="Arial" direction="rtl">איכות פרימיום | משלוח מהיר</text>

    <!-- Bottom bar -->
    <rect x="0" y="1800" width="${WIDTH}" height="120" fill="#111" opacity="0.8"/>
    <text x="540" y="1870" font-size="32" fill="${BRAND.gold}" text-anchor="middle" font-family="Arial">www.onezone.co.il</text>
  </svg>`;

  // Create background with SVG overlay
  const bgBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

  // Composite product image on top
  await sharp(bgBuffer)
    .composite([
      { input: productImg, left: 240, top: 380 }
    ])
    .png()
    .toFile(path.join(OUTPUT_DIR, `frame_0${frameNum}_product.png`));

  console.log(`✅ Product frame ${frameNum} created (${teamName})`);
}

// ==================== FRAME 5: SALE / CTA Frame ====================
async function createSaleFrame() {
  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg3" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a2e"/>
        <stop offset="50%" style="stop-color:#0f3460"/>
        <stop offset="100%" style="stop-color:#1a1a2e"/>
      </linearGradient>
      <linearGradient id="fire" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#FF4500"/>
        <stop offset="50%" style="stop-color:#FF6B35"/>
        <stop offset="100%" style="stop-color:#FFD700"/>
      </linearGradient>
      <filter id="glow2">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg3)"/>

    <!-- Decorative diagonal lines -->
    <line x1="0" y1="0" x2="200" y2="1920" stroke="${BRAND.accent}" stroke-width="1" opacity="0.1"/>
    <line x1="200" y1="0" x2="400" y2="1920" stroke="${BRAND.accent}" stroke-width="1" opacity="0.1"/>
    <line x1="880" y1="0" x2="680" y2="1920" stroke="${BRAND.accent}" stroke-width="1" opacity="0.1"/>
    <line x1="1080" y1="0" x2="880" y2="1920" stroke="${BRAND.accent}" stroke-width="1" opacity="0.1"/>

    <!-- Top brand -->
    <text x="540" y="300" font-size="60" fill="${BRAND.gold}" text-anchor="middle" font-weight="900" font-family="Arial Black, Arial">ONE ZONE</text>
    <rect x="340" y="330" width="400" height="3" fill="${BRAND.gold}" rx="2"/>

    <!-- Main sale text -->
    <text x="540" y="550" font-size="90" fill="url(#fire)" text-anchor="middle" font-weight="900" font-family="Arial Black, Arial" filter="url(#glow2)">🔥 הנחה מיוחדת 🔥</text>

    <!-- Discount badge -->
    <circle cx="540" cy="800" r="160" fill="${BRAND.accent}" opacity="0.9"/>
    <circle cx="540" cy="800" r="145" fill="none" stroke="${BRAND.gold}" stroke-width="3"/>
    <text x="540" y="780" font-size="72" fill="${BRAND.white}" text-anchor="middle" font-weight="900" font-family="Arial">10%</text>
    <text x="540" y="840" font-size="36" fill="${BRAND.gold}" text-anchor="middle" font-weight="bold" font-family="Arial">OFF</text>

    <!-- Coupon code box -->
    <rect x="190" y="1050" width="700" height="120" fill="none" stroke="${BRAND.gold}" stroke-width="3" stroke-dasharray="15,8" rx="15"/>
    <rect x="200" y="1060" width="680" height="100" fill="#111" rx="12"/>
    <text x="540" y="1085" font-size="28" fill="${BRAND.gold}" text-anchor="middle" font-family="Arial">:קוד הנחה</text>
    <text x="540" y="1140" font-size="64" fill="${BRAND.white}" text-anchor="middle" font-weight="900" font-family="Courier New, monospace" letter-spacing="8">SALE10</text>

    <!-- CTA Button -->
    <rect x="240" y="1300" width="600" height="100" fill="url(#fire)" rx="50"/>
    <text x="540" y="1365" font-size="48" fill="${BRAND.white}" text-anchor="middle" font-weight="900" font-family="Arial">! הזמינו עכשיו</text>

    <!-- Bottom info -->
    <text x="540" y="1550" font-size="32" fill="${BRAND.white}" text-anchor="middle" font-family="Arial" opacity="0.8">⚡ משלוח מהיר לכל הארץ ⚡</text>
    <text x="540" y="1610" font-size="28" fill="${BRAND.gold}" text-anchor="middle" font-family="Arial" opacity="0.7">איכות פרימיום | מידות S-XXL</text>

    <!-- Footer -->
    <rect x="0" y="1780" width="${WIDTH}" height="140" fill="#111" opacity="0.8"/>
    <text x="540" y="1840" font-size="36" fill="${BRAND.gold}" text-anchor="middle" font-weight="bold" font-family="Arial">ONE ZONE ⚽</text>
    <text x="540" y="1885" font-size="24" fill="${BRAND.white}" text-anchor="middle" font-family="Arial" opacity="0.6">www.onezone.co.il</text>
  </svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(OUTPUT_DIR, 'frame_05_end.png'));
  console.log('✅ End/CTA frame created');
}

// ==================== MAIN ====================
async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Create all frames
  await createStartFrame();

  // Product frames with jersey images
  const products = [
    { image: 'argentina_nobg.png', name: '🇦🇷 Argentina' },
    { image: 'brazil_nobg.png', name: '🇧🇷 Brazil' },
    { image: 'spain_nobg.png', name: '🇪🇸 Spain' },
  ];

  for (let i = 0; i < products.length; i++) {
    const imgPath = path.join(__dirname, products[i].image);
    if (fs.existsSync(imgPath)) {
      await createProductFrame(imgPath, products[i].name, i + 2);
    } else {
      console.log(`⚠️ Image not found: ${products[i].image}`);
    }
  }

  await createSaleFrame();
  console.log('\n🎬 All frames created! Now building video with FFmpeg...');
}

main().catch(console.error);
