const { createCanvas } = require('../../graphics/canvas2d');
      'use strict';

      /* ---------------------------------------------------------
         1. DETERMINISTIC PRNG & PROCEDURAL NOISE UTILITIES
         --------------------------------------------------------- */
      function mulberry32(seed) {
        let a = seed >>> 0;
        return function () {
          a |= 0;
          a = (a + 0x6d2b79f5) | 0;
          let t = Math.imul(a ^ (a >>> 15), 1 | a);
          t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }

      // Smooth 1D value noise for realistic mountain profiles & cloud ridges
      function createNoise1D(seed, tableSize = 256) {
        const rand = mulberry32(seed);
        const table = new Float32Array(tableSize);
        for (let i = 0; i < tableSize; i++) table[i] = rand();

        function sample(x) {
          const xi = Math.floor(x);
          const xf = x - xi;
          const u = xf * xf * (3 - 2 * xf);
          const i0 = ((xi % tableSize) + tableSize) % tableSize;
          const i1 = (i0 + 1) % tableSize;
          return table[i0] * (1 - u) + table[i1] * u;
        }

        // Ridged multifractal noise produces authentic angular alpine peaks & craggy valleys
        function ridged(x, octaves = 5, lacunarity = 2.15, gain = 0.5) {
          let sum = 0;
          let amp = 0.55;
          let freq = 1;
          let weight = 1;
          let norm = 0;
          for (let i = 0; i < octaves; i++) {
            let n = sample(x * freq);
            n = 1.0 - Math.abs(n * 2.0 - 1.0); // sharp ridge crest
            n = n * n * weight;
            weight = Math.min(1, Math.max(0.25, n * 1.8));
            sum += n * amp;
            norm += amp;
            freq *= lacunarity;
            amp *= gain;
          }
          return sum / norm;
        }

        function fbm(x, octaves = 4) {
          let sum = 0;
          let amp = 0.5;
          let freq = 1;
          let norm = 0;
          for (let i = 0; i < octaves; i++) {
            sum += sample(x * freq) * amp;
            norm += amp;
            freq *= 2.05;
            amp *= 0.5;
          }
          return sum / norm;
        }

        return { sample, ridged, fbm };
      }

      /* ---------------------------------------------------------
         2. THEME ENGINE 1: OBSIDIAN (DEFAULT STUDIO DARK)
         --------------------------------------------------------- */
      class ObsidianRenderer {
        constructor() {
          this.staticCanvas = createCanvas();
          this.w = 0;
          this.h = 0;
        }

        build(w, h) {
          this.w = w;
          this.h = h;
          this.staticCanvas.width = w;
          this.staticCanvas.height = h;
          const ctx = this.staticCanvas.getContext('2d');

          // Deep matte obsidian base gradient
          const bg = ctx.createRadialGradient(w * 0.5, h * 0.44, 10, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
          bg.addColorStop(0, '#161922');
          bg.addColorStop(0.45, '#101219');
          bg.addColorStop(1, '#090a0e');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);

          // Signature precision micro-dot matrix matching the screenshot
          const spacing = Math.max(12, Math.round(Math.min(w, h) * 0.032));
          ctx.fillStyle = 'rgba(255, 255, 255, 0.038)';
          for (let y = spacing * 0.5; y < h; y += spacing) {
            for (let x = spacing * 0.5; x < w; x += spacing) {
              ctx.fillRect(x, y, 1.2, 1.2);
            }
          }
        }

        render(ctx, w, h, time) {
          if (this.w !== w || this.h !== h) this.build(w, h);
          ctx.drawImage(this.staticCanvas, 0, 0);

          // Subtle breathing ambient studio glow behind the timer ring
          const pulse = 0.5 + 0.5 * Math.sin(time * 0.7);
          const glow = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.min(w, h) * 0.55);
          glow.addColorStop(0, `rgba(62, 85, 118, ${0.065 + pulse * 0.035})`);
          glow.addColorStop(0.6, 'rgba(30, 38, 54, 0.02)');
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, w, h);
        }
      }

      /* ---------------------------------------------------------
         3. THEME ENGINE 2: ENCHANTED GARDEN
            Extraordinarily detailed bioluminescent midnight lotus garden
         --------------------------------------------------------- */
      class EnchantedGardenRenderer {
        constructor(seed = 4077) {
          this.seed = seed;
          this.staticCanvas = createCanvas();
          this.w = 0;
          this.h = 0;
          this.flowerLightPoints = [];
          this.fireflies = [];
          this.bokeh = [];
          this.pollen = [];
        }

        // Rich exotic color palettes (electric blue, violet, magenta, cyan, luminous pink)
        getPalettes() {
          return [
            {
              // Electric Blue & Cyan Lotus
              outerDark: '#0b1548',
              outerMid: '#1842b8',
              outerTip: '#36c9ff',
              innerDark: '#122978',
              innerMid: '#2494f8',
              innerTip: '#92f8ff',
              rim: '#8bf7ff',
              centerCore: '#fff7c2',
              centerMid: '#ffcf54',
              centerGlow: 'rgba(65, 220, 255, 0.45)',
              auraColor: 'rgba(40, 175, 255, 0.28)',
              stamenTip: '#ffe885',
            },
            {
              // Luminous Magenta & Violet Lotus
              outerDark: '#20083c',
              outerMid: '#72189c',
              outerTip: '#ff42b0',
              innerDark: '#3f0e63',
              innerMid: '#cf24a8',
              innerTip: '#ff9ae0',
              rim: '#ffb8ec',
              centerCore: '#fff5c8',
              centerMid: '#ff70c8',
              centerGlow: 'rgba(255, 78, 195, 0.48)',
              auraColor: 'rgba(218, 52, 185, 0.28)',
              stamenTip: '#ffd86b',
            },
            {
              // Royal Violet & Electric Cyan-Pink Fusion
              outerDark: '#120b3a',
              outerMid: '#4c22a8',
              outerTip: '#9a6bff',
              innerDark: '#26146b',
              innerMid: '#7848f0',
              innerTip: '#7ff4ff',
              rim: '#b6efff',
              centerCore: '#ffffff',
              centerMid: '#52f5e8',
              centerGlow: 'rgba(115, 190, 255, 0.46)',
              auraColor: 'rgba(128, 86, 255, 0.26)',
              stamenTip: '#8efcff',
            },
            {
              // Luminous Sakura Pink & Molten Gold Center
              outerDark: '#290b36',
              outerMid: '#9c2478',
              outerTip: '#ff76b8',
              innerDark: '#52144d',
              innerMid: '#e8489c',
              innerTip: '#ffc2e2',
              rim: '#ffd9ed',
              centerCore: '#fffbe0',
              centerMid: '#ffb84d',
              centerGlow: 'rgba(255, 145, 198, 0.48)',
              auraColor: 'rgba(255, 102, 178, 0.26)',
              stamenTip: '#ffdf75',
            },
          ];
        }

        // Draws a single individually shaped, translucent, curved botanical lotus petal with veins & neon rim
        drawLotusPetal(ctx, length, width, pal, isInner, rand, alphaScale = 1) {
          const asym = (rand() - 0.5) * 0.16; // natural organic imperfection
          const tipPinch = 0.14 + rand() * 0.12;
          const bellyPos = 0.46 + rand() * 0.14;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          // Left curved edge
          ctx.bezierCurveTo(
            -width * (0.62 + asym), -length * (bellyPos * 0.55),
            -width * (0.58 - asym * 0.5), -length * (bellyPos + 0.34),
            0, -length
          );
          // Right curved edge back to base
          ctx.bezierCurveTo(
            width * (0.58 + asym * 0.5), -length * (bellyPos + 0.34),
            width * (0.62 - asym), -length * (bellyPos * 0.55),
            0, 0
          );
          ctx.closePath();

          // Translucent botanical petal gradient
          const grad = ctx.createLinearGradient(0, 0, 0, -length);
          if (isInner) {
            grad.addColorStop(0, pal.innerDark);
            grad.addColorStop(0.42, pal.innerMid);
            grad.addColorStop(0.86, pal.innerTip);
            grad.addColorStop(1, '#ffffff');
          } else {
            grad.addColorStop(0, pal.outerDark);
            grad.addColorStop(0.48, pal.outerMid);
            grad.addColorStop(0.9, pal.outerTip);
            grad.addColorStop(1, pal.rim);
          }

          ctx.globalAlpha = (isInner ? 0.86 : 0.78) * alphaScale;
          ctx.fillStyle = grad;
          ctx.fill();

          // Subtle glowing inner sheen along the upper half of the petal
          const sheen = ctx.createRadialGradient(0, -length * 0.68, 0, 0, -length * 0.62, length * 0.52);
          sheen.addColorStop(0, 'rgba(255, 255, 255, 0.24)');
          sheen.addColorStop(0.55, 'rgba(255, 255, 255, 0.05)');
          sheen.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = sheen;
          ctx.fill();

          // Delicate translucent petal veins radiating along curve
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = pal.rim;
          ctx.globalAlpha = 0.22 * alphaScale;
          ctx.lineWidth = Math.max(0.55, length * 0.011);

          // Central midrib vein
          ctx.beginPath();
          ctx.moveTo(0, -length * 0.05);
          ctx.quadraticCurveTo(width * asym * 0.3, -length * 0.5, 0, -length * 0.94);
          ctx.stroke();

          // Fine curved side veins
          for (let v = -2; v <= 2; v++) {
            if (v === 0) continue;
            ctx.beginPath();
            ctx.moveTo(0, -length * 0.1);
            ctx.quadraticCurveTo(
              width * v * 0.16, -length * 0.48,
              width * v * tipPinch, -length * (0.82 - Math.abs(v) * 0.06)
            );
            ctx.stroke();
          }
          ctx.restore();

          // Delicate Neon Rim Illumination along outer contour
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = pal.rim;
          ctx.globalAlpha = (isInner ? 0.68 : 0.46) * alphaScale;
          ctx.lineWidth = Math.max(0.8, length * 0.02);
          ctx.shadowColor = pal.outerTip;
          ctx.shadowBlur = Math.max(4, length * 0.16);
          ctx.stroke();

          ctx.restore();
        }

        // Draws an intricate multi-layered exotic lotus flower (3-5 overlapping layers)
        drawExoticFlower(ctx, x, y, radius, paletteIdx, depth, rand) {
          const palettes = this.getPalettes();
          const pal = palettes[paletteIdx % palettes.length];
          const tiltY = 0.72 + rand() * 0.28; // organic perspective tilt
          const baseRot = rand() * Math.PI * 2;
          const depthAlpha = depth === 0 ? 0.52 : depth === 1 ? 0.84 : 1.0;

          ctx.save();
          ctx.translate(x, y);

          // 1. Soft colored ambient illumination cast onto surrounding darkness & leaves
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const auraR = radius * (depth === 2 ? 2.35 : 1.9);
          const aura = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, auraR);
          aura.addColorStop(0, pal.centerGlow);
          aura.addColorStop(0.35, pal.auraColor);
          aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.globalAlpha = depthAlpha * 0.85;
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(0, 0, auraR, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Apply organic perspective squash
          ctx.scale(1, tiltY);

          // 2. Build 4 to 5 overlapping layers of individually shaped petals
          const layerCount = depth === 0 ? 3 : depth === 1 ? 4 : 5;
          for (let layer = 0; layer < layerCount; layer++) {
            const t = layer / (layerCount - 1); // 0 = outermost sepals, 1 = innermost cup
            const petalCount = Math.round((depth === 0 ? 7 : 9) - t * 2 + (rand() > 0.5 ? 1 : 0));
            const petalLen = radius * (1.06 - t * 0.44);
            const petalWid = radius * (0.42 - t * 0.13);
            const layerOffset = baseRot + layer * (Math.PI / petalCount) + (rand() - 0.5) * 0.2;
            const isInner = layer >= layerCount - 2;

            for (let p = 0; p < petalCount; p++) {
              const angle = layerOffset + (p / petalCount) * Math.PI * 2 + (rand() - 0.5) * 0.12;
              const lenVar = petalLen * (0.9 + rand() * 0.22);
              const widVar = petalWid * (0.88 + rand() * 0.24);
              ctx.save();
              ctx.rotate(angle);
              ctx.translate(0, -radius * (0.04 + (1 - t) * 0.06));
              this.drawLotusPetal(ctx, lenVar, widVar, pal, isInner, rand, depthAlpha);
              ctx.restore();
            }
          }

          // 3. Glowing botanical center & delicate luminous stamens
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';

          // Multi-layered glowing heart
          const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.48);
          coreGlow.addColorStop(0, pal.centerCore);
          coreGlow.addColorStop(0.28, pal.centerMid);
          coreGlow.addColorStop(0.65, pal.centerGlow);
          coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = depthAlpha;
          ctx.fillStyle = coreGlow;
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.48, 0, Math.PI * 2);
          ctx.fill();

          // Delicate radiating stamens with glowing pollen anthers
          const stamenCount = depth === 0 ? 8 : 16;
          for (let s = 0; s < stamenCount; s++) {
            const sa = (s / stamenCount) * Math.PI * 2 + rand() * 0.25;
            const sl = radius * (0.18 + rand() * 0.22);
            const ctrlA = sa + (rand() - 0.5) * 0.35;
            const ex = Math.cos(sa) * sl;
            const ey = Math.sin(sa) * sl;

            ctx.strokeStyle = pal.centerMid;
            ctx.globalAlpha = 0.65 * depthAlpha;
            ctx.lineWidth = Math.max(0.6, radius * 0.015);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(Math.cos(ctrlA) * sl * 0.55, Math.sin(ctrlA) * sl * 0.55, ex, ey);
            ctx.stroke();

            // Luminous anther dot
            ctx.fillStyle = pal.stamenTip;
            ctx.globalAlpha = 0.95 * depthAlpha;
            ctx.beginPath();
            ctx.arc(ex, ey, Math.max(1.1, radius * 0.03), 0, Math.PI * 2);
            ctx.fill();
          }

          // Crisp incandescent central jewel
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = 0.9 * depthAlpha;
          ctx.beginPath();
          ctx.arc(0, 0, radius * 0.1, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
          ctx.restore();

          // Register light point for live pulsing animation
          this.flowerLightPoints.push({
            x,
            y,
            radius,
            color: pal.centerGlow,
            aura: pal.auraColor,
            phase: rand() * Math.PI * 2,
            speed: 0.7 + rand() * 0.9,
            depth,
          });
        }

        // Draws intricate dark-blue and violet botanical leaves with fine veins & rim glow
        drawBotanicalLeaf(ctx, x, y, length, width, angle, tintType, rand, depthAlpha = 1) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);

          const curve = (rand() - 0.5) * length * 0.36;

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(
            -width * 0.95, -length * 0.32,
            -width * 0.75 + curve * 0.6, -length * 0.76,
            curve, -length
          );
          ctx.bezierCurveTo(
            width * 0.75 + curve * 0.6, -length * 0.76,
            width * 0.95, -length * 0.32,
            0, 0
          );
          ctx.closePath();

          // Deep midnight navy / indigo / twilight violet gradient
          const grad = ctx.createLinearGradient(0, 0, curve, -length);
          if (tintType === 0) {
            grad.addColorStop(0, '#040a1d');
            grad.addColorStop(0.55, '#0b1e48');
            grad.addColorStop(1, '#194578');
          } else {
            grad.addColorStop(0, '#09061c');
            grad.addColorStop(0.55, '#1d134a');
            grad.addColorStop(1, '#41217a');
          }

          ctx.globalAlpha = 0.92 * depthAlpha;
          ctx.fillStyle = grad;
          ctx.fill();

          // Fine central vein & branching lateral veins
          ctx.save();
          ctx.clip();
          const veinColor = tintType === 0 ? 'rgba(92, 210, 255, 0.34)' : 'rgba(196, 128, 255, 0.32)';
          ctx.strokeStyle = veinColor;
          ctx.lineWidth = Math.max(0.65, length * 0.011);

          // Main curved midrib
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(curve * 0.35, -length * 0.5, curve, -length * 0.96);
          ctx.stroke();

          // Lateral veins
          const pairs = 6;
          ctx.lineWidth = Math.max(0.45, length * 0.007);
          for (let i = 1; i <= pairs; i++) {
            const t = i / (pairs + 1);
            const mx = curve * t * t * 0.65;
            const my = -length * t;
            const span = width * Math.sin(t * Math.PI) * 0.85;

            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.quadraticCurveTo(mx - span * 0.55, my - length * 0.05, mx - span, my - length * 0.11);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.quadraticCurveTo(mx + span * 0.55, my - length * 0.05, mx + span, my - length * 0.11);
            ctx.stroke();
          }
          ctx.restore();

          // Delicate moonlight / bioluminescent rim highlight along leaf edge
          ctx.strokeStyle = tintType === 0 ? 'rgba(110, 226, 255, 0.28)' : 'rgba(210, 145, 255, 0.26)';
          ctx.lineWidth = Math.max(0.7, length * 0.01);
          ctx.stroke();

          // Tiny glowing pollen motes settled on the leaf surface
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const motes = 2 + Math.floor(rand() * 4);
          for (let m = 0; m < motes; m++) {
            const mt = 0.2 + rand() * 0.68;
            const px = curve * mt + (rand() - 0.5) * width * 0.65;
            const py = -length * mt;
            ctx.fillStyle = rand() > 0.45 ? 'rgba(120, 245, 255, 0.78)' : 'rgba(255, 224, 130, 0.82)';
            ctx.beginPath();
            ctx.arc(px, py, 0.8 + rand() * 1.1, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          ctx.restore();
        }

        // Draws graceful curving dark botanical stem
        drawStem(ctx, x1, y1, x2, y2, thickness, rand) {
          const cx = (x1 + x2) * 0.5 + (rand() - 0.5) * Math.abs(y2 - y1) * 0.42;
          const cy = (y1 + y2) * 0.5;
          ctx.save();
          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, '#040818');
          grad.addColorStop(0.6, '#10214a');
          grad.addColorStop(1, '#26467a');
          ctx.strokeStyle = grad;
          ctx.lineWidth = thickness;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(cx, cy, x2, y2);
          ctx.stroke();

          // Fine luminous highlight edge along stem
          ctx.strokeStyle = 'rgba(105, 215, 255, 0.22)';
          ctx.lineWidth = Math.max(0.6, thickness * 0.25);
          ctx.beginPath();
          ctx.moveTo(x1 + 1, y1);
          ctx.quadraticCurveTo(cx + 1, cy, x2 + 1, y2);
          ctx.stroke();
          ctx.restore();
        }

        build(w, h) {
          this.w = w;
          this.h = h;
          this.staticCanvas.width = w;
          this.staticCanvas.height = h;
          const ctx = this.staticCanvas.getContext('2d');
          const rand = mulberry32(this.seed);
          const minDim = Math.min(w, h);

          this.flowerLightPoints = [];
          this.fireflies = [];
          this.bokeh = [];
          this.pollen = [];

          // -------------------------------------------------------
          // 1. DEEP MIDNIGHT NAVY & BLUE-PURPLE ATMOSPHERIC DEPTH
          // -------------------------------------------------------
          const sky = ctx.createLinearGradient(0, 0, 0, h);
          sky.addColorStop(0, '#02040c');
          sky.addColorStop(0.28, '#05081a');
          sky.addColorStop(0.62, '#0a0e29');
          sky.addColorStop(0.85, '#100c2b');
          sky.addColorStop(1, '#040614');
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, w, h);

          // Layered midnight blue-purple atmospheric nebulae washes
          const washes = [
            { x: w * 0.18, y: h * 0.26, r: minDim * 0.72, c: 'rgba(34, 24, 96, 0.34)' },
            { x: w * 0.84, y: h * 0.32, r: minDim * 0.65, c: 'rgba(16, 48, 112, 0.32)' },
            { x: w * 0.5, y: h * 0.78, r: minDim * 0.88, c: 'rgba(54, 18, 92, 0.38)' },
            { x: w * 0.2, y: h * 0.86, r: minDim * 0.62, c: 'rgba(12, 62, 120, 0.34)' },
            { x: w * 0.82, y: h * 0.82, r: minDim * 0.62, c: 'rgba(84, 22, 108, 0.32)' },
          ];
          for (const ws of washes) {
            const g = ctx.createRadialGradient(ws.x, ws.y, 0, ws.x, ws.y, ws.r);
            g.addColorStop(0, ws.c);
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
          }

          // Distant soft bokeh particles (static base + animated ones initialized)
          for (let i = 0; i < 36; i++) {
            const bx = rand() * w;
            const by = rand() * h;
            const br = minDim * (0.008 + rand() * 0.032);
            const colors = ['rgba(85, 200, 255, 0.13)', 'rgba(180, 110, 255, 0.12)', 'rgba(255, 115, 200, 0.11)', 'rgba(255, 215, 115, 0.12)'];
            const col = colors[Math.floor(rand() * colors.length)];
            this.bokeh.push({
              x: bx, y: by, r: br, color: col,
              dx: (rand() - 0.5) * 4,
              dy: -2 - rand() * 4,
              phase: rand() * Math.PI * 2,
            });
          }

          // -------------------------------------------------------
          // 2. DISTANT BACKGROUND LAYER (Softly illuminated far garden)
          // -------------------------------------------------------
          for (let i = 0; i < 16; i++) {
            const lx = rand() * w;
            const ly = h * (0.24 + rand() * 0.62);
            const len = minDim * (0.1 + rand() * 0.12);
            const ang = (rand() - 0.5) * 1.4;
            this.drawBotanicalLeaf(ctx, lx, ly, len, len * 0.36, ang, i % 2, rand, 0.34);
          }

          const farFlowers = [
            { x: 0.12, y: 0.22, s: 0.052, p: 0 },
            { x: 0.88, y: 0.20, s: 0.048, p: 2 },
            { x: 0.32, y: 0.16, s: 0.042, p: 1 },
            { x: 0.72, y: 0.15, s: 0.045, p: 0 },
            { x: 0.08, y: 0.44, s: 0.055, p: 3 },
            { x: 0.92, y: 0.42, s: 0.054, p: 1 },
            { x: 0.24, y: 0.54, s: 0.046, p: 2 },
            { x: 0.77, y: 0.52, s: 0.048, p: 0 },
            { x: 0.50, y: 0.28, s: 0.038, p: 2 },
            { x: 0.42, y: 0.64, s: 0.045, p: 1 },
            { x: 0.60, y: 0.66, s: 0.046, p: 3 },
          ];
          for (const f of farFlowers) {
            this.drawExoticFlower(ctx, f.x * w, f.y * h, f.s * minDim, f.p, 0, rand);
          }

          // Atmospheric midnight haze layer between far & midground for cinematic depth
          const midVeil = ctx.createLinearGradient(0, 0, 0, h);
          midVeil.addColorStop(0, 'rgba(4, 7, 22, 0.35)');
          midVeil.addColorStop(0.5, 'rgba(7, 10, 30, 0.26)');
          midVeil.addColorStop(1, 'rgba(6, 8, 22, 0.12)');
          ctx.fillStyle = midVeil;
          ctx.fillRect(0, 0, w, h);

          // -------------------------------------------------------
          // 3. MIDGROUND LAYER (Curved stems, layered leaves & medium lotus blooms)
          // -------------------------------------------------------
          const midFlowers = [
            { x: 0.14, y: 0.66, s: 0.095, p: 0 },
            { x: 0.86, y: 0.64, s: 0.098, p: 1 },
            { x: 0.06, y: 0.31, s: 0.075, p: 2 },
            { x: 0.94, y: 0.29, s: 0.078, p: 0 },
            { x: 0.32, y: 0.76, s: 0.088, p: 3 },
            { x: 0.68, y: 0.75, s: 0.090, p: 2 },
            { x: 0.50, y: 0.82, s: 0.084, p: 0 },
          ];

          // Stems & foliage clusters supporting midground flowers
          for (const f of midFlowers) {
            const fx = f.x * w;
            const fy = f.y * h;
            this.drawStem(ctx, fx + (rand() - 0.5) * 45, h + 20, fx, fy, Math.max(2.2, minDim * 0.008), rand);
            const leafCount = 3 + Math.floor(rand() * 2);
            for (let l = 0; l < leafCount; l++) {
              const ang = -Math.PI * 0.65 + (l / Math.max(1, leafCount - 1)) * Math.PI * 1.3 + (rand() - 0.5) * 0.3;
              const llen = f.s * minDim * (1.35 + rand() * 0.5);
              this.drawBotanicalLeaf(ctx, fx, fy + f.s * minDim * 0.25, llen, llen * 0.38, ang, l % 2, rand, 0.82);
            }
          }

          for (const f of midFlowers) {
            this.drawExoticFlower(ctx, f.x * w, f.y * h, f.s * minDim, f.p, 1, rand);
          }

          // -------------------------------------------------------
          // 4. FOREGROUND LAYER (Lush dark leaves & hero large bioluminescent lotus)
          // -------------------------------------------------------
          // Framing lush dark leaves along bottom & side corners
          const fgLeaves = [
            { x: 0.02, y: 0.98, len: 0.34, ang: 0.38, t: 0 },
            { x: 0.16, y: 1.02, len: 0.30, ang: -0.22, t: 1 },
            { x: 0.28, y: 1.01, len: 0.26, ang: 0.42, t: 0 },
            { x: 0.44, y: 1.03, len: 0.24, ang: -0.35, t: 1 },
            { x: 0.58, y: 1.02, len: 0.25, ang: 0.28, t: 0 },
            { x: 0.74, y: 1.02, len: 0.29, ang: -0.42, t: 1 },
            { x: 0.88, y: 1.00, len: 0.33, ang: 0.22, t: 0 },
            { x: 0.99, y: 0.96, len: 0.35, ang: -0.46, t: 1 },
            { x: -0.02, y: 0.74, len: 0.26, ang: 0.95, t: 1 },
            { x: 1.02, y: 0.72, len: 0.26, ang: -0.95, t: 0 },
            { x: -0.02, y: 0.14, len: 0.24, ang: 2.15, t: 0 },
            { x: 1.02, y: 0.12, len: 0.23, ang: -2.18, t: 1 },
          ];
          for (const lf of fgLeaves) {
            this.drawBotanicalLeaf(ctx, lf.x * w, lf.y * h, lf.len * minDim, lf.len * minDim * 0.38, lf.ang, lf.t, rand, 1.0);
          }

          // Hero Large Foreground Flowers
          const heroFlowers = [
            { x: 0.12, y: 0.89, s: 0.165, p: 1 }, // Large magenta-violet hero (bottom-left)
            { x: 0.88, y: 0.88, s: 0.172, p: 0 }, // Large electric-blue-cyan hero (bottom-right)
            { x: 0.48, y: 0.96, s: 0.148, p: 3 }, // Luminous pink-gold hero (bottom-center)
            { x: 0.03, y: 0.56, s: 0.118, p: 0 }, // Electric blue side accent
            { x: 0.97, y: 0.53, s: 0.122, p: 3 }, // Luminous pink side accent
            { x: 0.27, y: 0.93, s: 0.120, p: 2 }, // Royal violet-cyan accent
            { x: 0.72, y: 0.93, s: 0.124, p: 1 }, // Magenta-violet accent
            { x: 0.07, y: 0.08, s: 0.105, p: 2 }, // Subtle top-left corner canopy bloom
            { x: 0.93, y: 0.07, s: 0.100, p: 1 }, // Subtle top-right corner canopy bloom
          ];

          for (const hf of heroFlowers) {
            const fx = hf.x * w;
            const fy = hf.y * h;
            if (hf.y > 0.4) {
              this.drawStem(ctx, fx + (rand() - 0.5) * 35, h + 30, fx, fy, Math.max(3, minDim * 0.011), rand);
            }
            this.drawExoticFlower(ctx, fx, fy, hf.s * minDim, hf.p, 2, rand);
          }

          // Subtle cinematic center vignette to enhance depth & keep UI ultra-crisp
          const vig = ctx.createRadialGradient(w * 0.5, h * 0.44, minDim * 0.18, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
          vig.addColorStop(0, 'rgba(3, 5, 18, 0.24)');
          vig.addColorStop(0.55, 'rgba(3, 5, 18, 0.06)');
          vig.addColorStop(1, 'rgba(2, 3, 10, 0.36)');
          ctx.fillStyle = vig;
          ctx.fillRect(0, 0, w, h);

          // -------------------------------------------------------
          // 5. INITIALIZE ANIMATED GOLDEN FIREFLIES & FLOATING POLLEN
          // -------------------------------------------------------
          const fireflyCount = Math.max(28, Math.min(54, Math.floor((w * h) / 11000)));
          for (let i = 0; i < fireflyCount; i++) {
            const depth = rand(); // 0 = far, 1 = close bokeh
            this.fireflies.push({
              x: rand() * w,
              y: rand() * h,
              baseX: rand() * w,
              baseY: rand() * h,
              r: (1.1 + depth * 2.8) * (minDim / 420),
              ampX: 14 + rand() * 38,
              ampY: 12 + rand() * 34,
              freqX: 0.25 + rand() * 0.55,
              freqY: 0.22 + rand() * 0.5,
              phase: rand() * Math.PI * 2,
              pulseSpeed: 1.2 + rand() * 2.4,
              depth,
              hue: rand() > 0.2 ? 'gold' : 'cyan',
            });
          }

          for (let i = 0; i < 42; i++) {
            this.pollen.push({
              x: rand() * w,
              y: rand() * h,
              vy: 4 + rand() * 10,
              vx: (rand() - 0.5) * 6,
              r: 0.7 + rand() * 1.4,
              phase: rand() * Math.PI * 2,
              color: rand() > 0.5 ? 'rgba(130, 245, 255, 0.7)' : 'rgba(255, 190, 235, 0.65)',
            });
          }
        }

        render(ctx, w, h, time, animate = true) {
          if (this.w !== w || this.h !== h) this.build(w, h);
          const t = animate ? time : 1.8;

          // Draw intricately detailed static botanical layer
          ctx.drawImage(this.staticCanvas, 0, 0);

          ctx.save();
          ctx.globalCompositeOperation = 'lighter';

          // 1. Subtle drifting distant glowing bokeh
          for (const b of this.bokeh) {
            const bx = ((b.x + Math.sin(t * 0.25 + b.phase) * 14 + t * b.dx) % (w + 60) + (w + 60)) % (w + 60) - 30;
            const by = ((b.y + t * b.dy) % (h + 60) + (h + 60)) % (h + 60) - 30;
            const g = ctx.createRadialGradient(bx, by, 0, bx, by, b.r);
            g.addColorStop(0, b.color);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(bx, by, b.r, 0, Math.PI * 2);
            ctx.fill();
          }

          // 2. Soft breathing bioluminescent glow emitted from flower centers
          for (const fl of this.flowerLightPoints) {
            const breath = 0.5 + 0.5 * Math.sin(t * fl.speed + fl.phase);
            const glowR = fl.radius * (1.15 + breath * 0.35);
            const g = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, glowR);
            g.addColorStop(0, fl.color);
            g.addColorStop(0.45, fl.aura);
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.globalAlpha = (fl.depth === 2 ? 0.36 : 0.22) * (0.55 + breath * 0.65);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(fl.x, fl.y, glowR, 0, Math.PI * 2);
            ctx.fill();
          }

          // 3. Rising micro-pollen sparkles across vegetation
          for (const p of this.pollen) {
            const px = ((p.x + Math.sin(t * 0.6 + p.phase) * 12 + t * p.vx) % w + w) % w;
            const py = ((p.y - t * p.vy) % h + h) % h;
            const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 2.5 + p.phase));
            ctx.globalAlpha = twinkle * 0.75;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(px, py, p.r, 0, Math.PI * 2);
            ctx.fill();
          }

          // 4. Floating Golden Fireflies distributed at multiple depths
          for (const f of this.fireflies) {
            const fx = f.baseX + Math.sin(t * f.freqX + f.phase) * f.ampX + Math.cos(t * 0.18 + f.phase) * 16;
            const fy = f.baseY + Math.cos(t * f.freqY + f.phase * 1.3) * f.ampY - Math.sin(t * 0.14 + f.phase) * 14;
            const pulse = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * f.pulseSpeed + f.phase), 1.6);

            const haloR = f.r * (4.2 + f.depth * 3.8);
            const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, haloR);
            if (f.hue === 'gold') {
              g.addColorStop(0, `rgba(255, 250, 210, ${0.95 * pulse})`);
              g.addColorStop(0.24, `rgba(255, 212, 92, ${0.72 * pulse})`);
              g.addColorStop(0.58, `rgba(255, 160, 38, ${0.24 * pulse})`);
              g.addColorStop(1, 'rgba(255, 140, 20, 0)');
            } else {
              g.addColorStop(0, `rgba(225, 255, 255, ${0.9 * pulse})`);
              g.addColorStop(0.28, `rgba(110, 240, 255, ${0.58 * pulse})`);
              g.addColorStop(1, 'rgba(60, 200, 255, 0)');
            }

            ctx.globalAlpha = 0.45 + f.depth * 0.55;
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(fx, fy, haloR, 0, Math.PI * 2);
            ctx.fill();

            // Incandescent pinpoint core for crisp realism
            ctx.fillStyle = '#fffef0';
            ctx.globalAlpha = pulse * 0.92;
            ctx.beginPath();
            ctx.arc(fx, fy, Math.max(0.7, f.r * 0.65), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }
      }

      /* ---------------------------------------------------------
         4. THEME ENGINE 3: MISTY MOUNTAIN
            Breathtaking pastel sunrise over 6 layered alpine ranges,
            flowing pink/lavender valley mist & dark pine forest silhouettes
         --------------------------------------------------------- */
      class MistyMountainRenderer {
        constructor(seed = 8821) {
          this.seed = seed;
          this.w = 0;
          this.h = 0;
          this.skyCanvas = createCanvas();
          this.rangeLayers = []; // Offscreen canvases per range so live mist flows BETWEEN ranges!
          this.mistBands = [];
          this.clouds = [];
        }

        // Generates a jagged, authentic alpine ridge height array
        buildRidgeProfile(w, baseY, amplitude, freq, seed, dipCenter = 0) {
          const noise = createNoise1D(seed, 512);
          const pts = new Float32Array(w + 2);
          for (let x = 0; x <= w + 1; x++) {
            const nx = x / Math.max(w, 320);
            const ridge = noise.ridged(nx * freq + seed * 0.013, 6, 2.15, 0.5);
            const macro = noise.fbm(nx * (freq * 0.45) + 7.3, 3);
            // Optional gentle valley dip in the center for scenic alpine composition
            const valleyFactor = dipCenter > 0
              ? Math.exp(-Math.pow((x / w - 0.52) / 0.34, 2)) * dipCenter
              : 0;
            const elevation = (ridge * 0.72 + macro * 0.28) * amplitude - valleyFactor;
            pts[x] = baseY - elevation;
          }
          return pts;
        }

        // Draws one realistic alpine range with 3D sunlit vs shadowed geological facets & optional snow highlights
        drawMountainRange(ctx, w, h, pts, opts) {
          ctx.save();

          // 1. Main silhouette fill
          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let x = 0; x <= w; x += 2) {
            ctx.lineTo(x, pts[x]);
          }
          ctx.lineTo(w, pts[w]);
          ctx.lineTo(w, h);
          ctx.closePath();

          const grad = ctx.createLinearGradient(0, opts.topY, 0, opts.bottomY);
          grad.addColorStop(0, opts.peakColor);
          grad.addColorStop(0.55, opts.midColor);
          grad.addColorStop(1, opts.baseColor);
          ctx.fillStyle = grad;
          ctx.fill();

          // 2. Sculpted ridge shading & sunlit/shadowed mountain slopes (creates photorealistic depth!)
          ctx.save();
          ctx.clip();

          // Find local peaks and cast angular sunlit & shadowed rock faces down the slopes
          const step = Math.max(6, Math.floor(w / 70));
          for (let x = step; x < w - step; x += step) {
            const y = pts[x];
            const slope = (pts[x + step] - pts[x - step]) / (step * 2);

            // Sun comes softly from upper center-right
            if (slope < -0.06) {
              // Sun-facing eastern/right-facing slope catches warm peach-pink sunrise diffusion
              const faceH = opts.amplitude * (0.55 + Math.min(0.6, Math.abs(slope)));
              const sg = ctx.createLinearGradient(x, y, x - step * 3.5, y + faceH);
              sg.addColorStop(0, opts.sunlitColor);
              sg.addColorStop(1, 'rgba(255, 225, 220, 0)');
              ctx.fillStyle = sg;
              ctx.beginPath();
              ctx.moveTo(x - step, pts[x - step]);
              ctx.lineTo(x + step, pts[x + step]);
              ctx.lineTo(x - step * 2.2, y + faceH);
              ctx.closePath();
              ctx.fill();
            } else if (slope > 0.08) {
              // Shadowed western slope gets cool atmospheric shadow facet
              const faceH = opts.amplitude * (0.65 + Math.min(0.5, slope));
              const sh = ctx.createLinearGradient(x, y, x + step * 3.5, y + faceH);
              sh.addColorStop(0, opts.shadowColor);
              sh.addColorStop(1, 'rgba(20, 28, 52, 0)');
              ctx.fillStyle = sh;
              ctx.beginPath();
              ctx.moveTo(x - step, pts[x - step]);
              ctx.lineTo(x + step, pts[x + step]);
              ctx.lineTo(x + step * 2.8, y + faceH);
              ctx.closePath();
              ctx.fill();
            }

            // Subtle snow-like highlights on high distant peaks
            if (opts.snow && y < opts.snowLine && pts[x] <= pts[x - step] && pts[x] <= pts[x + step]) {
              const snowDepth = (opts.snowLine - y) * 1.45 + 14;
              const snowGrad = ctx.createLinearGradient(x, y, x, y + snowDepth);
              snowGrad.addColorStop(0, 'rgba(255, 244, 242, 0.72)');
              snowGrad.addColorStop(0.5, 'rgba(255, 228, 232, 0.34)');
              snowGrad.addColorStop(1, 'rgba(255, 228, 232, 0)');
              ctx.fillStyle = snowGrad;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x + step * 2.2, pts[Math.min(w, x + step * 2)] + snowDepth * 0.45);
              ctx.lineTo(x + step * 0.4, y + snowDepth * 0.72);
              ctx.lineTo(x - step * 1.8, pts[Math.max(0, x - step * 2)] + snowDepth * 0.38);
              ctx.closePath();
              ctx.fill();
            }
          }

          // Subtle atmospheric ridge rim light catching sunrise glow
          ctx.restore();
          if (opts.ridgeHighlight) {
            ctx.beginPath();
            for (let x = 0; x <= w; x += 2) {
              if (x === 0) ctx.moveTo(x, pts[x]);
              else ctx.lineTo(x, pts[x]);
            }
            ctx.strokeStyle = opts.ridgeHighlight;
            ctx.lineWidth = opts.ridgeWidth || 1.2;
            ctx.stroke();
          }

          ctx.restore();
        }

        // Draws a detailed organic alpine pine/spruce silhouette with irregular layered boughs
        drawPineTree(ctx, x, baseY, height, color, rand) {
          const width = height * (0.26 + rand() * 0.14);
          const tiers = Math.max(4, Math.floor(height / 7));
          const lean = (rand() - 0.5) * width * 0.22;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x + lean, baseY - height); // top spire

          // Right jagged tiered boughs
          for (let i = 1; i <= tiers; i++) {
            const t = i / tiers;
            const ty = baseY - height * (1 - t);
            const spread = width * (0.2 + Math.pow(t, 0.88) * 0.88) * (0.86 + rand() * 0.28);
            const inset = spread * (0.45 + rand() * 0.18);
            ctx.lineTo(x + lean * (1 - t) + spread, ty + height * 0.025);
            if (i < tiers) {
              ctx.lineTo(x + lean * (1 - t) + inset, ty + height * 0.01);
            }
          }

          ctx.lineTo(x + width * 0.18, baseY + 6);
          ctx.lineTo(x - width * 0.18, baseY + 6);

          // Left jagged tiered boughs going back up
          for (let i = tiers; i >= 1; i--) {
            const t = i / tiers;
            const ty = baseY - height * (1 - t);
            const spread = width * (0.2 + Math.pow(t, 0.88) * 0.88) * (0.86 + rand() * 0.28);
            const inset = spread * (0.45 + rand() * 0.18);
            ctx.lineTo(x + lean * (1 - t) - spread, ty + height * 0.025);
            if (i > 1) {
              ctx.lineTo(x + lean * (1 - t) - inset, ty - height * 0.015);
            }
          }

          ctx.closePath();
          ctx.fill();
        }

        // Draws a dense alpine pine forest along a foreground slope profile
        drawForestSlope(ctx, w, pts, minH, maxH, densityStep, color, seed) {
          const rand = mulberry32(seed);
          for (let x = -10; x <= w + 10; x += densityStep) {
            const jitterX = x + (rand() - 0.5) * densityStep * 0.85;
            const idx = Math.max(0, Math.min(w, Math.round(jitterX)));
            const groundY = pts[idx];
            // Natural organic height clusters (taller near flanks, slightly varied clearings)
            const edgeBoost = 1 + Math.abs(jitterX / w - 0.5) * 0.55;
            const treeH = (minH + Math.pow(rand(), 1.35) * (maxH - minH)) * edgeBoost;
            this.drawPineTree(ctx, jitterX, groundY + treeH * 0.18, treeH, color, rand);
          }
        }

        // Draws soft elongated delicate pink sunrise clouds onto the sky
        drawWispyCloud(ctx, x, y, width, height, alpha, tint) {
          ctx.save();
          // Multiple overlapping horizontally stretched translucent puffs
          const puffs = 7;
          for (let i = 0; i < puffs; i++) {
            const frac = (i / (puffs - 1)) - 0.5;
            const px = x + frac * width * 0.72;
            const py = y + Math.sin(frac * Math.PI) * height * 0.16;
            const rx = width * (0.26 + (1 - Math.abs(frac) * 1.4) * 0.18);
            const ry = height * (0.36 + (1 - Math.abs(frac) * 1.3) * 0.28);

            ctx.save();
            ctx.translate(px, py);
            ctx.scale(1, Math.max(0.12, ry / Math.max(1, rx)));
            const g = ctx.createRadialGradient(0, -rx * 0.12, 0, 0, 0, rx);
            if (tint === 'peach') {
              g.addColorStop(0, `rgba(255, 224, 214, ${alpha})`);
              g.addColorStop(0.45, `rgba(248, 194, 206, ${alpha * 0.62})`);
              g.addColorStop(1, 'rgba(224, 180, 210, 0)');
            } else {
              g.addColorStop(0, `rgba(252, 212, 226, ${alpha})`);
              g.addColorStop(0.5, `rgba(222, 188, 222, ${alpha * 0.52})`);
              g.addColorStop(1, 'rgba(186, 172, 214, 0)');
            }
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }

        // Helper to draw wide, soft horizontal flowing valley fog bands
        drawMistBand(ctx, w, yCenter, bandHeight, colorStops, driftOffset, opacityScale = 1) {
          ctx.save();
          // Wide vertical softness envelope
          const baseGrad = ctx.createLinearGradient(0, yCenter - bandHeight * 0.6, 0, yCenter + bandHeight * 0.75);
          baseGrad.addColorStop(0, 'rgba(255, 236, 240, 0)');
          baseGrad.addColorStop(0.35, colorStops[0]);
          baseGrad.addColorStop(0.65, colorStops[1]);
          baseGrad.addColorStop(1, 'rgba(255, 236, 240, 0)');
          ctx.globalAlpha = 0.55 * opacityScale;
          ctx.fillStyle = baseGrad;
          ctx.fillRect(0, yCenter - bandHeight * 0.6, w, bandHeight * 1.35);

          // Layered billowing horizontal fog plumes drifting across the valley
          const plumeCount = 5;
          const span = w + bandHeight * 2.5;
          for (let i = 0; i < plumeCount; i++) {
            const rawX = (i / plumeCount) * span + driftOffset;
            const px = ((rawX % span) + span) % span - bandHeight * 1.2;
            const py = yCenter + Math.sin(i * 2.1) * bandHeight * 0.14;
            const rx = w * (0.34 + (i % 3) * 0.12);
            const ry = bandHeight * (0.42 + (i % 2) * 0.18);

            ctx.save();
            ctx.translate(px, py);
            ctx.scale(1, Math.max(0.08, ry / Math.max(1, rx)));
            const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
            pg.addColorStop(0, colorStops[0]);
            pg.addColorStop(0.5, colorStops[1]);
            pg.addColorStop(1, 'rgba(255, 236, 244, 0)');
            ctx.globalAlpha = 0.62 * opacityScale;
            ctx.fillStyle = pg;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }

        build(w, h) {
          this.w = w;
          this.h = h;
          const rand = mulberry32(this.seed);

          // -------------------------------------------------------
          // 1. LARGE PASTEL SUNRISE SKY CANVAS
          // -------------------------------------------------------
          this.skyCanvas.width = w;
          this.skyCanvas.height = h;
          const sctx = this.skyCanvas.getContext('2d');

          const skyGrad = sctx.createLinearGradient(0, 0, 0, h * 0.66);
          skyGrad.addColorStop(0.00, '#8ba2c7'); // Pale serene zenith blue
          skyGrad.addColorStop(0.22, '#aab2d6'); // Pastel periwinkle lavender
          skyGrad.addColorStop(0.46, '#d6b6d4'); // Soft dusty lavender-pink
          skyGrad.addColorStop(0.68, '#f0bec8'); // Dusty rose pink
          skyGrad.addColorStop(0.86, '#fbd3c2'); // Soft warm peach
          skyGrad.addColorStop(1.00, '#ffe8d8'); // Luminous diffused sunrise horizon
          sctx.fillStyle = skyGrad;
          sctx.fillRect(0, 0, w, h);

          // Soft diffused sunrise illumination near the horizon (no harsh disc)
          const sunX = w * 0.62;
          const sunY = h * 0.49;
          const sunGlow = sctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(w, h) * 0.56);
          sunGlow.addColorStop(0, 'rgba(255, 242, 224, 0.72)');
          sunGlow.addColorStop(0.28, 'rgba(255, 214, 198, 0.44)');
          sunGlow.addColorStop(0.6, 'rgba(244, 186, 206, 0.16)');
          sunGlow.addColorStop(1, 'rgba(244, 186, 206, 0)');
          sctx.fillStyle = sunGlow;
          sctx.fillRect(0, 0, w, h);

          // Initialize gently drifting elongated pink clouds
          this.clouds = [
            { x: w * 0.22, y: h * 0.14, w: w * 0.58, h: h * 0.045, a: 0.34, tint: 'lavender', speed: 2.2 },
            { x: w * 0.74, y: h * 0.19, w: w * 0.52, h: h * 0.038, a: 0.36, tint: 'peach', speed: 1.7 },
            { x: w * 0.46, y: h * 0.27, w: w * 0.68, h: h * 0.042, a: 0.40, tint: 'peach', speed: 2.8 },
            { x: w * 0.14, y: h * 0.33, w: w * 0.48, h: h * 0.032, a: 0.32, tint: 'lavender', speed: 1.9 },
            { x: w * 0.82, y: h * 0.36, w: w * 0.54, h: h * 0.036, a: 0.42, tint: 'peach', speed: 2.4 },
          ];

          // -------------------------------------------------------
          // 2. SIX OVERLAPPING ALPINE MOUNTAIN RANGES + INTERLEAVED MIST
          // -------------------------------------------------------
          this.rangeLayers = [];
          this.mistBands = [];

          const rangeConfigs = [
            // Range 1: Farthest high alpine peaks (pale blue-lavender + subtle snow highlights)
            {
              baseY: h * 0.54,
              amp: h * 0.21,
              freq: 3.1,
              seed: 1103,
              dip: h * 0.02,
              peakColor: '#99a8cb',
              midColor: '#b0b5d4',
              baseColor: '#d9c2d6',
              sunlitColor: 'rgba(255, 232, 224, 0.38)',
              shadowColor: 'rgba(104, 118, 162, 0.24)',
              snow: true,
              snowLine: h * 0.44,
              ridgeHighlight: 'rgba(255, 238, 234, 0.55)',
              ridgeWidth: 1.2,
              mistAfter: {
                y: h * 0.56,
                height: h * 0.14,
                colors: ['rgba(255, 234, 234, 0.72)', 'rgba(242, 214, 230, 0.52)'],
                speed: 5.5,
                opacity: 0.85,
              },
            },
            // Range 2: Distant alpine ridge (lavender-periwinkle with snow crests)
            {
              baseY: h * 0.60,
              amp: h * 0.19,
              freq: 2.8,
              seed: 2207,
              dip: h * 0.035,
              peakColor: '#7f8eb5',
              midColor: '#96a0c4',
              baseColor: '#c3b5cf',
              sunlitColor: 'rgba(255, 220, 216, 0.32)',
              shadowColor: 'rgba(78, 92, 134, 0.30)',
              snow: true,
              snowLine: h * 0.50,
              ridgeHighlight: 'rgba(255, 226, 224, 0.42)',
              ridgeWidth: 1.1,
              mistAfter: {
                y: h * 0.62,
                height: h * 0.16,
                colors: ['rgba(255, 228, 236, 0.78)', 'rgba(226, 206, 238, 0.55)'],
                speed: -7.5,
                opacity: 0.9,
              },
            },
            // Range 3: Middle range (muted slate blue)
            {
              baseY: h * 0.67,
              amp: h * 0.18,
              freq: 2.5,
              seed: 3319,
              dip: h * 0.048,
              peakColor: '#5b6c90',
              midColor: '#6d7fa3',
              baseColor: '#9aa4c2',
              sunlitColor: 'rgba(248, 206, 212, 0.24)',
              shadowColor: 'rgba(46, 60, 92, 0.36)',
              snow: false,
              ridgeHighlight: 'rgba(255, 216, 218, 0.32)',
              ridgeWidth: 1.0,
              mistAfter: {
                y: h * 0.70,
                height: h * 0.18,
                colors: ['rgba(255, 236, 240, 0.82)', 'rgba(232, 212, 238, 0.62)'],
                speed: 10.5,
                opacity: 0.95,
              },
            },
            // Range 4: Closer mid-valley mountain range (deep muted slate blue)
            {
              baseY: h * 0.75,
              amp: h * 0.17,
              freq: 2.2,
              seed: 4423,
              dip: h * 0.065,
              peakColor: '#3a4c6b',
              midColor: '#485b7a',
              baseColor: '#6e7c9b',
              sunlitColor: 'rgba(236, 190, 204, 0.18)',
              shadowColor: 'rgba(24, 34, 56, 0.42)',
              snow: false,
              ridgeHighlight: 'rgba(235, 205, 220, 0.24)',
              ridgeWidth: 0.9,
              mistAfter: {
                y: h * 0.77,
                height: h * 0.19,
                colors: ['rgba(255, 242, 245, 0.84)', 'rgba(242, 216, 232, 0.60)'],
                speed: -13.0,
                opacity: 0.92,
              },
            },
            // Range 5: Near forested ridge (dark navy-slate with distant pine line)
            {
              baseY: h * 0.84,
              amp: h * 0.15,
              freq: 1.9,
              seed: 5531,
              dip: h * 0.075,
              peakColor: '#1d2d42',
              midColor: '#223548',
              baseColor: '#2d4054',
              sunlitColor: 'rgba(180, 170, 200, 0.12)',
              shadowColor: 'rgba(10, 18, 30, 0.45)',
              snow: false,
              ridgeHighlight: 'rgba(215, 198, 220, 0.15)',
              ridgeWidth: 0.8,
              forest: {
                minH: h * 0.022,
                maxH: h * 0.052,
                step: Math.max(5, Math.round(w / 95)),
                color: '#1b2b3d',
                seed: 7101,
              },
              mistAfter: {
                y: h * 0.85,
                height: h * 0.16,
                colors: ['rgba(250, 232, 240, 0.65)', 'rgba(218, 204, 232, 0.45)'],
                speed: 16.5,
                opacity: 0.75,
              },
            },
            // Range 6: Immediate foreground slopes (dark navy & deep alpine forest green + dense pine silhouettes)
            {
              baseY: h * 0.94,
              amp: h * 0.13,
              freq: 1.55,
              seed: 6649,
              dip: h * 0.08,
              peakColor: '#0f1f26',
              midColor: '#0c1922',
              baseColor: '#081118',
              sunlitColor: 'rgba(80, 110, 120, 0.08)',
              shadowColor: 'rgba(4, 10, 15, 0.5)',
              snow: false,
              ridgeHighlight: null,
              forest: {
                minH: h * 0.045,
                maxH: h * 0.115,
                step: Math.max(7, Math.round(w / 62)),
                color: '#0c1a20',
                seed: 9203,
              },
              mistAfter: null,
            },
          ];

          for (const cfg of rangeConfigs) {
            const layerCanvas = createCanvas();
            layerCanvas.width = w;
            layerCanvas.height = h;
            const lctx = layerCanvas.getContext('2d');

            const pts = this.buildRidgeProfile(w, cfg.baseY, cfg.amp, cfg.freq, cfg.seed, cfg.dip);
            this.drawMountainRange(lctx, w, h, pts, {
              topY: cfg.baseY - cfg.amp,
              bottomY: Math.min(h, cfg.baseY + h * 0.22),
              amplitude: cfg.amp,
              peakColor: cfg.peakColor,
              midColor: cfg.midColor,
              baseColor: cfg.baseColor,
              sunlitColor: cfg.sunlitColor,
              shadowColor: cfg.shadowColor,
              snow: cfg.snow,
              snowLine: cfg.snowLine,
              ridgeHighlight: cfg.ridgeHighlight,
              ridgeWidth: cfg.ridgeWidth,
            });

            if (cfg.forest) {
              this.drawForestSlope(
                lctx,
                w,
                pts,
                cfg.forest.minH,
                cfg.forest.maxH,
                cfg.forest.step,
                cfg.forest.color,
                cfg.forest.seed
              );
            }

            this.rangeLayers.push({
              canvas: layerCanvas,
              mistAfter: cfg.mistAfter,
            });
          }
        }

        render(ctx, w, h, time, animate = true) {
          if (this.w !== w || this.h !== h) this.build(w, h);
          const t = animate ? time : 4.2;

          // 1. Pastel Sunrise Sky
          ctx.drawImage(this.skyCanvas, 0, 0);

          // 2. Drifting Elongated Delicate Pink & Peach Clouds
          for (const c of this.clouds) {
            const span = w + c.w * 1.4;
            const cx = ((c.x + t * c.speed) % span + span) % span - c.w * 0.7;
            this.drawWispyCloud(ctx, cx, c.y, c.w, c.h, c.a, c.tint);
          }

          // 3. Composite Each Mountain Range with Flowing Horizontal Valley Mist Between Ranges
          for (const layer of this.rangeLayers) {
            ctx.drawImage(layer.canvas, 0, 0);
            if (layer.mistAfter) {
              const m = layer.mistAfter;
              this.drawMistBand(ctx, w, m.y, m.height, m.colors, t * m.speed, m.opacity);
            }
          }

          // 4. Soft Atmospheric Light Diffusion Veil over Upper Horizon
          const diff = ctx.createRadialGradient(w * 0.62, h * 0.48, 0, w * 0.62, h * 0.48, Math.max(w, h) * 0.52);
          const shimmer = 0.08 + 0.03 * Math.sin(t * 0.45);
          diff.addColorStop(0, `rgba(255, 232, 218, ${shimmer})`);
          diff.addColorStop(1, 'rgba(255, 232, 218, 0)');
          ctx.fillStyle = diff;
          ctx.fillRect(0, 0, w, h);
        }
      }

      /* ---------------------------------------------------------
         4B. THEME ENGINE 4: COSMIC ROAD TRIP
             Cinematic animated road-trip sunset, Milky Way sky,
             distant valley city, rocky cliff, vintage VW camper van
             & two friends sitting on the rooftop
         --------------------------------------------------------- */
      class CosmicRoadTripRenderer {
        constructor(seed = 7331) {
          this.seed = seed;
          this.w = 0;
          this.h = 0;
          this.skyCanvas = createCanvas();
          this.landscapeCanvas = createCanvas();
          this.stars = [];
          this.clouds = [];
          this.cityTwinkles = [];
          this.grassBlades = [];
          this.vanWindowGlowRect = null;
          this.sunCoords = { x: 0, y: 0, r: 20 };
          this.horizonY = 0;
        }

        // Helper: Organic jagged mountain silhouette profile
        buildRangePoints(w, baseY, amp, freq, seed, dipX = 0.36, dipAmount = 0) {
          const noise = createNoise1D(seed, 512);
          const pts = new Float32Array(w + 2);
          for (let x = 0; x <= w + 1; x++) {
            const nx = x / Math.max(w, 320);
            const r = noise.ridged(nx * freq + seed * 0.017, 5, 2.1, 0.52);
            const m = noise.fbm(nx * (freq * 0.42) + 4.1, 3);
            const dip = dipAmount > 0 ? Math.exp(-Math.pow((x / w - dipX) / 0.30, 2)) * dipAmount : 0;
            pts[x] = baseY - (r * 0.70 + m * 0.30) * amp + dip;
          }
          return pts;
        }

        // Helper: Painterly volumetric twilight cloud with indigo shadow & vivid pink-magenta rim
        drawCinematicCloud(ctx, x, y, cw, ch, sunX, sunY, alpha = 0.92) {
          ctx.save();
          ctx.globalAlpha = alpha;
          const lobes = [
            { ox: -0.38, oy: 0.14, rx: 0.24, ry: 0.38 },
            { ox: -0.18, oy: -0.08, rx: 0.28, ry: 0.50 },
            { ox: 0.04, oy: -0.16, rx: 0.32, ry: 0.54 },
            { ox: 0.24, oy: -0.02, rx: 0.26, ry: 0.44 },
            { ox: 0.40, oy: 0.16, rx: 0.22, ry: 0.34 },
            { ox: 0.0, oy: 0.18, rx: 0.48, ry: 0.32 },
          ];

          // Direction toward sunset for rim-light offset
          const dx = sunX - x;
          const dy = sunY - y;
          const dist = Math.hypot(dx, dy) || 1;
          const lx = (dx / dist) * ch * 0.24;
          const ly = (dy / dist) * ch * 0.22;

          // 1. Warm coral-pink/magenta backlit under-rim glow
          for (const lb of lobes) {
            const px = x + lb.ox * cw + lx * 0.55;
            const py = y + lb.oy * ch + Math.abs(ly) * 0.55 + ch * 0.08;
            const rx = lb.rx * cw;
            const ry = lb.ry * ch;
            ctx.save();
            ctx.translate(px, py);
            ctx.scale(1, Math.max(0.15, ry / Math.max(1, rx)));
            const g = ctx.createRadialGradient(0, 0, rx * 0.15, 0, 0, rx);
            g.addColorStop(0, 'rgba(255, 132, 198, 0.88)');
            g.addColorStop(0.55, 'rgba(240, 68, 166, 0.52)');
            g.addColorStop(1, 'rgba(167, 123, 213, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          // 2. Deep cosmic blue-indigo volumetric cloud body
          for (const lb of lobes) {
            const px = x + lb.ox * cw;
            const py = y + lb.oy * ch;
            const rx = lb.rx * cw * 0.96;
            const ry = lb.ry * ch * 0.92;
            ctx.save();
            ctx.translate(px, py);
            ctx.scale(1, Math.max(0.15, ry / Math.max(1, rx)));
            const g = ctx.createRadialGradient(-lx * 0.3, -rx * 0.24, rx * 0.05, 0, 0, rx);
            g.addColorStop(0, '#0c275e');
            g.addColorStop(0.58, '#172e6b');
            g.addColorStop(0.86, 'rgba(92, 56, 134, 0.82)');
            g.addColorStop(1, 'rgba(240, 68, 166, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }

        // Helper: Detailed framing pine tree silhouette with organic branching
        drawPine(ctx, x, baseY, height, color, rimColor, rand) {
          const width = height * (0.28 + rand() * 0.14);
          const tiers = Math.max(5, Math.floor(height / 8));
          const lean = (rand() - 0.5) * width * 0.18;

          ctx.save();
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x + lean, baseY - height);

          for (let i = 1; i <= tiers; i++) {
            const t = i / tiers;
            const ty = baseY - height * (1 - t);
            const spread = width * (0.18 + Math.pow(t, 0.85) * 0.92) * (0.82 + rand() * 0.36);
            const inset = spread * (0.42 + rand() * 0.2);
            ctx.lineTo(x + lean * (1 - t) + spread, ty + height * 0.032);
            if (i < tiers) ctx.lineTo(x + lean * (1 - t) + inset, ty + height * 0.008);
          }
          ctx.lineTo(x + width * 0.14, baseY + 10);
          ctx.lineTo(x - width * 0.14, baseY + 10);

          for (let i = tiers; i >= 1; i--) {
            const t = i / tiers;
            const ty = baseY - height * (1 - t);
            const spread = width * (0.18 + Math.pow(t, 0.85) * 0.92) * (0.82 + rand() * 0.36);
            const inset = spread * (0.42 + rand() * 0.2);
            ctx.lineTo(x + lean * (1 - t) - spread, ty + height * 0.032);
            if (i > 1) ctx.lineTo(x + lean * (1 - t) - inset, ty - height * 0.01);
          }
          ctx.closePath();
          ctx.fill();

          // Subtle sunset / cosmic rim accent on sunward edge
          if (rimColor) {
            ctx.strokeStyle = rimColor;
            ctx.lineWidth = Math.max(0.6, height * 0.008);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Helper: Rounded rectangle path
        roundRectPath(ctx, x, y, w, h, r) {
          const rad = Math.min(r, w * 0.5, h * 0.5);
          ctx.beginPath();
          ctx.moveTo(x + rad, y);
          ctx.lineTo(x + w - rad, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
          ctx.lineTo(x + w, y + h - rad);
          ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
          ctx.lineTo(x + rad, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
          ctx.lineTo(x, y + rad);
          ctx.quadraticCurveTo(x, y, x + rad, y);
          ctx.closePath();
        }

        // ---------------------------------------------------------
        // HERO OBJECT: VINTAGE 1960s BLUE VW-STYLE CAMPER VAN
        // Facing LEFT, side profile, glowing pink-purple windows,
        // rooftop luggage rack, detailed wheels & sunset rim light
        // ---------------------------------------------------------
        drawCamperVan(ctx, leftX, groundY, vw) {
          const vh = vw * 0.46; // authentic classic VW bus aspect ratio
          const topY = groundY - vh;
          const wheelR = vw * 0.086;
          const frontWheelX = leftX + vw * 0.215;
          const rearWheelX = leftX + vw * 0.785;
          const wheelCY = groundY - wheelR * 0.94;
          const bodyBottomY = groundY - wheelR * 0.76;

          ctx.save();

          // 1. Deep Ground Contact Shadow beneath camper van on rocky cliff
          const shadowGrad = ctx.createRadialGradient(
            leftX + vw * 0.50, groundY + vh * 0.02, vw * 0.08,
            leftX + vw * 0.50, groundY + vh * 0.02, vw * 0.56
          );
          shadowGrad.addColorStop(0, 'rgba(2, 7, 20, 0.92)');
          shadowGrad.addColorStop(0.68, 'rgba(3, 10, 28, 0.72)');
          shadowGrad.addColorStop(1, 'rgba(3, 10, 28, 0)');
          ctx.fillStyle = shadowGrad;
          ctx.beginPath();
          ctx.ellipse(leftX + vw * 0.50, groundY + vh * 0.02, vw * 0.55, vh * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Black Metallic Rooftop Luggage Rack (rear 58% of roof, behind where the friends sit)
          const rackX = leftX + vw * 0.44;
          const rackW = vw * 0.48;
          const rackBaseY = topY + vh * 0.025;
          const rackH = vh * 0.115;

          ctx.save();
          ctx.strokeStyle = '#091124';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          // Vertical mounting stanchions
          ctx.lineWidth = Math.max(1.5, vw * 0.011);
          const posts = [0.06, 0.34, 0.66, 0.94];
          for (const p of posts) {
            const px = rackX + rackW * p;
            ctx.beginPath();
            ctx.moveTo(px, rackBaseY + vh * 0.02);
            ctx.lineTo(px, rackBaseY - rackH);
            ctx.stroke();
          }
          // Outer rounded tubular rack rails
          ctx.lineWidth = Math.max(1.8, vw * 0.013);
          this.roundRectPath(ctx, rackX, rackBaseY - rackH, rackW, rackH * 0.72, rackH * 0.35);
          ctx.stroke();
          // Middle horizontal rail
          ctx.lineWidth = Math.max(1.1, vw * 0.008);
          ctx.beginPath();
          ctx.moveTo(rackX + rackW * 0.03, rackBaseY - rackH * 0.42);
          ctx.lineTo(rackX + rackW * 0.97, rackBaseY - rackH * 0.42);
          ctx.stroke();
          // Metallic cyan/sunset top highlight along upper rack rail
          ctx.strokeStyle = 'rgba(130, 210, 255, 0.42)';
          ctx.lineWidth = Math.max(0.8, vw * 0.005);
          ctx.beginPath();
          ctx.moveTo(rackX + rackW * 0.05, rackBaseY - rackH);
          ctx.lineTo(rackX + rackW * 0.95, rackBaseY - rackH);
          ctx.stroke();
          ctx.restore();

          // 3. Main Vintage Camper Van Body Silhouette (facing left)
          ctx.save();
          ctx.beginPath();
          // Start at top-front curved roof brow
          ctx.moveTo(leftX + vw * 0.14, topY + vh * 0.02);
          // Roofline running gently toward rear
          ctx.bezierCurveTo(leftX + vw * 0.38, topY - vh * 0.015, leftX + vw * 0.76, topY - vh * 0.01, leftX + vw * 0.91, topY + vh * 0.03);
          // Rounded rear upper corner & back panel
          ctx.bezierCurveTo(leftX + vw * 0.975, topY + vh * 0.06, leftX + vw * 0.985, topY + vh * 0.24, leftX + vw * 0.985, topY + vh * 0.46);
          ctx.lineTo(leftX + vw * 0.982, bodyBottomY - vh * 0.06);
          ctx.quadraticCurveTo(leftX + vw * 0.98, bodyBottomY, leftX + vw * 0.94, bodyBottomY);
          // Undercarriage running forward to front nose
          ctx.lineTo(leftX + vw * 0.055, bodyBottomY);
          // Iconic curved VW front lower apron & rounded nose
          ctx.quadraticCurveTo(leftX + vw * 0.015, bodyBottomY, leftX + vw * 0.012, bodyBottomY - vh * 0.12);
          ctx.bezierCurveTo(leftX + vw * 0.004, topY + vh * 0.56, leftX + vw * 0.018, topY + vh * 0.42, leftX + vw * 0.048, topY + vh * 0.34);
          // Slightly sloped vintage front windshield curve up to roof brow
          ctx.bezierCurveTo(leftX + vw * 0.072, topY + vh * 0.18, leftX + vw * 0.095, topY + vh * 0.045, leftX + vw * 0.14, topY + vh * 0.02);
          ctx.closePath();

          // Rich Deep Ocean / Cobalt Blue Multi-Stop Body Gradient
          const bodyGrad = ctx.createLinearGradient(leftX, topY, leftX + vw * 0.15, bodyBottomY);
          bodyGrad.addColorStop(0.00, '#1e78c8'); // Upper roof cyan-cobalt catchlight
          bodyGrad.addColorStop(0.16, '#145da8'); // Classic cobalt blue upper cabin
          bodyGrad.addColorStop(0.49, '#0f498c'); // Deep ocean blue beltline
          bodyGrad.addColorStop(0.53, '#0a3369'); // Lower body crease shift
          bodyGrad.addColorStop(0.84, '#07224b'); // Dark navy lower chassis
          bodyGrad.addColorStop(1.00, '#04142e'); // Underside deep shadow
          ctx.fillStyle = bodyGrad;
          ctx.fill();

          // Clip interior lighting, two-tone beltline & metallic reflections to van body
          ctx.save();
          ctx.clip();

          // Subtle cyan ambient sheen on upper roof shoulder
          const roofSheen = ctx.createLinearGradient(leftX, topY, leftX, topY + vh * 0.18);
          roofSheen.addColorStop(0, 'rgba(92, 212, 255, 0.42)');
          roofSheen.addColorStop(0.5, 'rgba(40, 185, 240, 0.12)');
          roofSheen.addColorStop(1, 'rgba(40, 185, 240, 0)');
          ctx.fillStyle = roofSheen;
          ctx.fillRect(leftX, topY, vw, vh * 0.22);

          // Sunset coral-pink / peach illumination wrapping around the left-facing front nose
          const noseGlow = ctx.createRadialGradient(
            leftX + vw * 0.02, topY + vh * 0.48, vw * 0.01,
            leftX + vw * 0.04, topY + vh * 0.50, vw * 0.24
          );
          noseGlow.addColorStop(0, 'rgba(255, 173, 174, 0.58)');
          noseGlow.addColorStop(0.45, 'rgba(240, 68, 166, 0.28)');
          noseGlow.addColorStop(1, 'rgba(240, 68, 166, 0)');
          ctx.fillStyle = noseGlow;
          ctx.fillRect(leftX, topY, vw * 0.35, vh);

          // Classic VW horizontal body trim chrome-cyan molding strip
          const trimY = topY + vh * 0.495;
          ctx.fillStyle = 'rgba(130, 218, 255, 0.36)';
          ctx.fillRect(leftX, trimY, vw, Math.max(1.2, vh * 0.018));
          ctx.fillStyle = 'rgba(4, 15, 36, 0.55)';
          ctx.fillRect(leftX, trimY + Math.max(1.2, vh * 0.018), vw, Math.max(1.2, vh * 0.016));

          // Subtle lower rocker panel metallic reflection
          ctx.fillStyle = 'rgba(40, 185, 240, 0.10)';
          ctx.fillRect(leftX + vw * 0.28, bodyBottomY - vh * 0.11, vw * 0.44, vh * 0.04);

          ctx.restore(); // end body clip

          // Crisp outer silhouette edge highlight (sunset pink on front nose, cool cyan on roof)
          ctx.strokeStyle = 'rgba(120, 205, 255, 0.26)';
          ctx.lineWidth = Math.max(1, vw * 0.005);
          ctx.stroke();

          // Warm pink sunset rim along the front nose & windshield edge
          ctx.beginPath();
          ctx.moveTo(leftX + vw * 0.14, topY + vh * 0.02);
          ctx.bezierCurveTo(leftX + vw * 0.095, topY + vh * 0.045, leftX + vw * 0.072, topY + vh * 0.18, leftX + vw * 0.048, topY + vh * 0.34);
          ctx.bezierCurveTo(leftX + vw * 0.018, topY + vh * 0.42, leftX + vw * 0.004, topY + vh * 0.56, leftX + vw * 0.014, bodyBottomY - vh * 0.12);
          ctx.strokeStyle = 'rgba(255, 162, 196, 0.78)';
          ctx.lineWidth = Math.max(1.2, vw * 0.008);
          ctx.stroke();

          ctx.restore();

          // 4. Side Windows & Curved Front Windshield with Glowing Pink-Purple Interior Illumination
          const winTopY = topY + vh * 0.145;
          const winH = vh * 0.285;
          const winR = Math.max(2.5, vh * 0.055);

          // Store bounding area for gentle live window shimmer
          this.vanWindowGlowRect = { x: leftX + vw * 0.08, y: winTopY, w: vw * 0.84, h: winH };

          // Front Curved Windshield (slanted profile on left nose)
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(leftX + vw * 0.072, winTopY + winH * 0.94);
          ctx.lineTo(leftX + vw * 0.105, winTopY + winH * 0.08);
          ctx.quadraticCurveTo(leftX + vw * 0.118, winTopY, leftX + vw * 0.142, winTopY);
          ctx.lineTo(leftX + vw * 0.142, winTopY + winH);
          ctx.lineTo(leftX + vw * 0.082, winTopY + winH);
          ctx.closePath();
          const wsGrad = ctx.createLinearGradient(leftX + vw * 0.07, winTopY, leftX + vw * 0.14, winTopY + winH);
          wsGrad.addColorStop(0, '#ff9cd6');
          wsGrad.addColorStop(0.45, '#f044a6');
          wsGrad.addColorStop(1, '#5d267a');
          ctx.fillStyle = wsGrad;
          ctx.fill();
          ctx.strokeStyle = '#071b3d';
          ctx.lineWidth = Math.max(1.2, vw * 0.009);
          ctx.stroke();
          ctx.restore();

          // Four Rectangular Rounded Side Windows (Cab door + 3 rear camper windows)
          const windows = [
            { x: 0.175, w: 0.155, hasVent: true },
            { x: 0.358, w: 0.170, hasSeat: true },
            { x: 0.552, w: 0.170, hasCurtain: true },
            { x: 0.746, w: 0.165, hasRearShelf: true },
          ];

          for (const win of windows) {
            const wx = leftX + vw * win.x;
            const ww = vw * win.w;

            // Soft outer magenta glow spilled around window frame
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const glowG = ctx.createRadialGradient(wx + ww * 0.5, winTopY + winH * 0.5, ww * 0.1, wx + ww * 0.5, winTopY + winH * 0.5, ww * 0.95);
            glowG.addColorStop(0, 'rgba(255, 107, 189, 0.24)');
            glowG.addColorStop(1, 'rgba(240, 68, 166, 0)');
            ctx.fillStyle = glowG;
            ctx.fillRect(wx - ww * 0.4, winTopY - winH * 0.4, ww * 1.8, winH * 1.8);
            ctx.restore();

            // Window glass base with luminous pink-purple interior glow
            ctx.save();
            this.roundRectPath(ctx, wx, winTopY, ww, winH, winR);
            const ig = ctx.createLinearGradient(wx, winTopY, wx, winTopY + winH);
            ig.addColorStop(0.0, '#ff98cf');
            ig.addColorStop(0.35, '#ee4fa8');
            ig.addColorStop(0.75, '#7f2f8c');
            ig.addColorStop(1.0, '#341654');
            ctx.fillStyle = ig;
            ctx.fill();

            ctx.save();
            ctx.clip();

            // Subtle warm interior silhouettes (seats, cozy camper curtains, steering wheel)
            ctx.fillStyle = 'rgba(28, 11, 52, 0.48)';
            if (win.hasVent) {
              // Cab steering wheel & front seat headrest silhouette
              ctx.beginPath();
              ctx.ellipse(wx + ww * 0.24, winTopY + winH * 0.85, ww * 0.16, winH * 0.26, -0.35, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillRect(wx + ww * 0.62, winTopY + winH * 0.58, ww * 0.26, winH * 0.48);
              // Vintage quarter-vent glass divider bar
              ctx.strokeStyle = '#0a214a';
              ctx.lineWidth = Math.max(1, vw * 0.006);
              ctx.beginPath();
              ctx.moveTo(wx + ww * 0.34, winTopY);
              ctx.lineTo(wx + ww * 0.34, winTopY + winH);
              ctx.stroke();
            } else if (win.hasSeat) {
              // Bench seat back silhouette
              this.roundRectPath(ctx, wx + ww * 0.16, winTopY + winH * 0.64, ww * 0.42, winH * 0.44, 4);
              ctx.fill();
            } else if (win.hasCurtain) {
              // Cozy camper curtain draped neatly on right edge of window
              ctx.beginPath();
              ctx.moveTo(wx + ww * 0.72, winTopY);
              ctx.quadraticCurveTo(wx + ww * 0.76, winTopY + winH * 0.5, wx + ww * 0.90, winTopY + winH);
              ctx.lineTo(wx + ww, winTopY + winH);
              ctx.lineTo(wx + ww, winTopY);
              ctx.closePath();
              ctx.fill();
            } else if (win.hasRearShelf) {
              ctx.fillRect(wx + ww * 0.1, winTopY + winH * 0.72, ww * 0.85, winH * 0.34);
            }

            // Diagonal glossy magenta-white sunset reflection streak across glass
            ctx.fillStyle = 'rgba(255, 224, 242, 0.24)';
            ctx.beginPath();
            ctx.moveTo(wx + ww * 0.12, winTopY);
            ctx.lineTo(wx + ww * 0.34, winTopY);
            ctx.lineTo(wx + ww * 0.08, winTopY + winH);
            ctx.lineTo(wx - ww * 0.08, winTopY + winH);
            ctx.closePath();
            ctx.fill();

            ctx.restore(); // end window clip

            // Crisp dark navy rubber & metallic window frame
            ctx.strokeStyle = '#071a3b';
            ctx.lineWidth = Math.max(1.5, vw * 0.009);
            ctx.stroke();
            ctx.restore();
          }

          // 5. Vehicle Panel Lines, Door Outlines, Handles, Side Mirror, Vents, Lights & Bumpers
          ctx.save();
          // Cab door outline & rear side-door panel separation lines
          ctx.strokeStyle = 'rgba(4, 15, 36, 0.62)';
          ctx.lineWidth = Math.max(0.9, vw * 0.005);
          // Front door seam
          ctx.beginPath();
          ctx.moveTo(leftX + vw * 0.342, topY + vh * 0.13);
          ctx.lineTo(leftX + vw * 0.342, bodyBottomY - vh * 0.02);
          // Cargo side door seam
          ctx.moveTo(leftX + vw * 0.538, topY + vh * 0.45);
          ctx.lineTo(leftX + vw * 0.538, bodyBottomY - vh * 0.02);
          ctx.moveTo(leftX + vw * 0.732, topY + vh * 0.45);
          ctx.lineTo(leftX + vw * 0.732, bodyBottomY - vh * 0.02);
          ctx.stroke();

          // Metallic Door Handles
          ctx.fillStyle = '#92d8ff';
          this.roundRectPath(ctx, leftX + vw * 0.295, topY + vh * 0.545, vw * 0.032, vh * 0.024, 2);
          ctx.fill();
          this.roundRectPath(ctx, leftX + vw * 0.556, topY + vh * 0.545, vw * 0.032, vh * 0.024, 2);
          ctx.fill();

          // Classic Rear Engine Air-Intake Louvers
          ctx.strokeStyle = 'rgba(3, 12, 28, 0.75)';
          ctx.lineWidth = Math.max(1, vw * 0.005);
          for (let v = 0; v < 5; v++) {
            const vx = leftX + vw * (0.865 + v * 0.016);
            ctx.beginPath();
            ctx.moveTo(vx, topY + vh * 0.55);
            ctx.lineTo(vx, topY + vh * 0.67);
            ctx.stroke();
          }

          // Small Vintage Side Mirror on Stalk (left cab door)
          ctx.strokeStyle = '#081b3a';
          ctx.lineWidth = Math.max(1.2, vw * 0.007);
          ctx.beginPath();
          ctx.moveTo(leftX + vw * 0.165, topY + vh * 0.43);
          ctx.lineTo(leftX + vw * 0.145, topY + vh * 0.36);
          ctx.stroke();
          ctx.fillStyle = '#185496';
          this.roundRectPath(ctx, leftX + vw * 0.132, topY + vh * 0.325, vw * 0.024, vh * 0.068, 3);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 175, 205, 0.65)';
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Front Circular Headlight (left nose) with warm glowing lens
          const hlX = leftX + vw * 0.022;
          const hlY = topY + vh * 0.61;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const hlGlow = ctx.createRadialGradient(hlX, hlY, 1, hlX - vw * 0.03, hlY, vw * 0.12);
          hlGlow.addColorStop(0, 'rgba(255, 236, 178, 0.78)');
          hlGlow.addColorStop(0.4, 'rgba(255, 198, 138, 0.22)');
          hlGlow.addColorStop(1, 'rgba(255, 180, 120, 0)');
          ctx.fillStyle = hlGlow;
          ctx.beginPath();
          ctx.arc(hlX - vw * 0.01, hlY, vw * 0.11, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = '#fff5cc';
          ctx.beginPath();
          ctx.ellipse(hlX, hlY, vw * 0.016, vh * 0.056, -0.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#7db9e8';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Rear Red-Magenta Taillight
          ctx.fillStyle = '#ff4b84';
          this.roundRectPath(ctx, leftX + vw * 0.968, topY + vh * 0.62, vw * 0.020, vh * 0.09, 2);
          ctx.fill();

          // Front & Rear Rounded Bumpers (metallic slate-cyan with pink sunset glint)
          const drawBumper = (bx, by, bw, bh, isFront) => {
            const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
            bg.addColorStop(0, isFront ? '#ffd0dc' : '#7ebde8');
            bg.addColorStop(0.45, '#3b73a8');
            bg.addColorStop(1, '#0c2345');
            ctx.fillStyle = bg;
            this.roundRectPath(ctx, bx, by, bw, bh, bh * 0.45);
            ctx.fill();
            ctx.strokeStyle = '#061530';
            ctx.lineWidth = 0.9;
            ctx.stroke();
          };
          drawBumper(leftX - vw * 0.018, bodyBottomY - vh * 0.095, vw * 0.088, vh * 0.075, true);
          drawBumper(leftX + vw * 0.935, bodyBottomY - vh * 0.095, vw * 0.078, vh * 0.075, false);
          ctx.restore();

          // 6. Wheel Arches & Detailed Tires with Metallic Blue & Silver Hubcaps
          const drawWheel = (cx) => {
            ctx.save();
            // Dark recessed wheel arch well
            ctx.fillStyle = '#030a18';
            ctx.beginPath();
            ctx.arc(cx, wheelCY, wheelR * 1.24, Math.PI, 0, false);
            ctx.lineTo(cx + wheelR * 1.24, bodyBottomY + 1);
            ctx.lineTo(cx - wheelR * 1.24, bodyBottomY + 1);
            ctx.closePath();
            ctx.fill();

            // Subtle flared fender lip highlight
            ctx.strokeStyle = 'rgba(110, 198, 255, 0.35)';
            ctx.lineWidth = Math.max(1.2, vw * 0.008);
            ctx.beginPath();
            ctx.arc(cx, wheelCY, wheelR * 1.25, Math.PI * 1.06, Math.PI * 1.94, false);
            ctx.stroke();

            // Outer Black Rubber Tire
            const tireGrad = ctx.createRadialGradient(cx - wheelR * 0.2, wheelCY - wheelR * 0.2, wheelR * 0.3, cx, wheelCY, wheelR);
            tireGrad.addColorStop(0, '#1e2738');
            tireGrad.addColorStop(0.65, '#0b101b');
            tireGrad.addColorStop(1, '#05080f');
            ctx.fillStyle = tireGrad;
            ctx.beginPath();
            ctx.arc(cx, wheelCY, wheelR, 0, Math.PI * 2);
            ctx.fill();

            // Subtle metallic blue inner wheel rim ring
            ctx.fillStyle = '#185496';
            ctx.beginPath();
            ctx.arc(cx, wheelCY, wheelR * 0.62, 0, Math.PI * 2);
            ctx.fill();

            // Classic Silver-Chrome VW Moon Hubcap with reflective dome gradient
            const capGrad = ctx.createRadialGradient(
              cx - wheelR * 0.16, wheelCY - wheelR * 0.18, wheelR * 0.04,
              cx, wheelCY, wheelR * 0.46
            );
            capGrad.addColorStop(0, '#ffffff');
            capGrad.addColorStop(0.35, '#c7e2f8');
            capGrad.addColorStop(0.75, '#5482b0');
            capGrad.addColorStop(1, '#1a365c');
            ctx.fillStyle = capGrad;
            ctx.beginPath();
            ctx.arc(cx, wheelCY, wheelR * 0.44, 0, Math.PI * 2);
            ctx.fill();

            // Subtle pink sunset specular glint on tire sidewall
            ctx.strokeStyle = 'rgba(255, 165, 205, 0.35)';
            ctx.lineWidth = Math.max(0.9, vw * 0.005);
            ctx.beginPath();
            ctx.arc(cx, wheelCY, wheelR * 0.88, Math.PI * 0.85, Math.PI * 1.35);
            ctx.stroke();

            ctx.restore();
          };

          drawWheel(frontWheelX);
          drawWheel(rearWheelX);

          ctx.restore();
          return { roofY: topY + vh * 0.015, leftX, vw, vh };
        }

        // ---------------------------------------------------------
        // TWO FRIENDS SITTING ON TOP OF THE CAMPER VAN ROOFTOP
        // Anatomically proportionate young adult silhouettes facing
        // LEFT toward the glowing sunset & starry cosmic sky
        // ---------------------------------------------------------
        drawTwoFriends(ctx, roofY, vanLeftX, vw) {
          // Scale human figures realistically relative to the vintage VW camper van (~1.95m tall van)
          const u = vw * 0.056; // unit scale (~head height)

          // ===== CHARACTER A: LEFT FRIEND =====
          // Seated near front-left roof edge, leaning slightly back, facing sunset horizon
          {
            const ax = vanLeftX + vw * 0.255;
            const ay = roofY + u * 0.12;
            ctx.save();
            ctx.translate(ax, ay);

            // 1. Dark Trousers & Naturally Bent Legs (one leg slightly forward, one knee bent up)
            ctx.fillStyle = '#071530';
            // Far/extended leg resting forward toward roof brow
            ctx.beginPath();
            ctx.moveTo(-u * 0.15, -u * 0.25);
            ctx.quadraticCurveTo(-u * 1.05, -u * 0.55, -u * 1.48, -u * 0.18);
            ctx.lineTo(-u * 1.82, u * 0.12);
            ctx.lineTo(-u * 1.56, u * 0.24);
            ctx.lineTo(-u * 1.15, -u * 0.02);
            ctx.lineTo(-u * 0.10, u * 0.10);
            ctx.closePath();
            ctx.fill();

            // Near bent leg (knee raised naturally)
            ctx.beginPath();
            ctx.moveTo(u * 0.18, -u * 0.22);
            ctx.quadraticCurveTo(-u * 0.58, -u * 1.18, -u * 1.02, -u * 0.85);
            ctx.lineTo(-u * 1.24, u * 0.08);
            ctx.lineTo(-u * 0.88, u * 0.14);
            ctx.lineTo(-u * 0.74, -u * 0.52);
            ctx.lineTo(-u * 0.12, u * 0.08);
            ctx.closePath();
            ctx.fill();

            // Casual Sneaker Shoes
            ctx.fillStyle = '#0a1c3d';
            ctx.beginPath();
            ctx.ellipse(-u * 1.72, u * 0.16, u * 0.26, u * 0.11, -0.25, 0, Math.PI * 2);
            ctx.ellipse(-u * 1.14, u * 0.12, u * 0.25, u * 0.10, -0.1, 0, Math.PI * 2);
            ctx.fill();

            // 2. Relaxed Leaning-Back Arm supporting on rooftop behind torso
            ctx.strokeStyle = '#091b3d';
            ctx.lineWidth = u * 0.34;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(u * 0.42, -u * 1.45);
            ctx.lineTo(u * 0.72, -u * 0.78);
            ctx.lineTo(u * 0.86, -u * 0.06);
            ctx.stroke();

            // 3. Torso wearing Dark Midnight-Blue Casual Hoodie/Jacket (slightly leaning back)
            const jacketA = ctx.createLinearGradient(-u * 0.4, -u * 1.9, u * 0.8, 0);
            jacketA.addColorStop(0, '#192b5e');
            jacketA.addColorStop(0.45, '#0c1f4a');
            jacketA.addColorStop(1, '#071330');
            ctx.fillStyle = jacketA;
            ctx.beginPath();
            ctx.moveTo(u * 0.18, u * 0.04); // seat base
            ctx.bezierCurveTo(u * 0.62, -u * 0.42, u * 0.78, -u * 1.18, u * 0.46, -u * 1.66); // relaxed back slope
            // Subtle relaxed hood collar bunched behind neck
            ctx.quadraticCurveTo(u * 0.55, -u * 1.78, u * 0.26, -u * 1.82);
            ctx.lineTo(-u * 0.02, -u * 1.72); // front neck/chest
            ctx.bezierCurveTo(-u * 0.26, -u * 1.32, -u * 0.32, -u * 0.65, -u * 0.15, -u * 0.06);
            ctx.closePath();
            ctx.fill();

            // Front relaxed arm resting loosely toward the bent knee
            ctx.strokeStyle = '#102658';
            ctx.lineWidth = u * 0.32;
            ctx.beginPath();
            ctx.moveTo(u * 0.06, -u * 1.46);
            ctx.quadraticCurveTo(-u * 0.26, -u * 1.05, -u * 0.76, -u * 0.86);
            ctx.stroke();

            // 4. Neck & Young Adult Head (turned slightly toward distant horizon)
            ctx.fillStyle = '#0b1838';
            // Neck
            ctx.beginPath();
            ctx.moveTo(u * 0.02, -u * 1.72);
            ctx.lineTo(u * 0.28, -u * 1.74);
            ctx.lineTo(u * 0.22, -u * 1.96);
            ctx.lineTo(u * 0.0, -u * 1.94);
            ctx.closePath();
            ctx.fill();

            // Head & subtle three-quarter facial profile facing left
            ctx.beginPath();
            ctx.ellipse(u * 0.08, -u * 2.26, u * 0.36, u * 0.42, 0.08, 0, Math.PI * 2);
            ctx.fill();

            // Textured Short Dark Navy Hair (natural organic crown & slight wind-swept tufts)
            ctx.fillStyle = '#06112b';
            ctx.beginPath();
            ctx.moveTo(-u * 0.24, -u * 2.34);
            ctx.quadraticCurveTo(-u * 0.32, -u * 2.66, -u * 0.02, -u * 2.74);
            ctx.quadraticCurveTo(u * 0.24, -u * 2.80, u * 0.44, -u * 2.58);
            ctx.quadraticCurveTo(u * 0.54, -u * 2.32, u * 0.42, -u * 2.04);
            ctx.quadraticCurveTo(u * 0.26, -u * 1.94, u * 0.16, -u * 2.08);
            ctx.quadraticCurveTo(u * 0.02, -u * 2.36, -u * 0.24, -u * 2.34);
            ctx.closePath();
            ctx.fill();

            // 5. Cinematic Rim Lighting on Character A:
            // Vivid Pink-Purple Sunset Rim Light along front head, shoulder, chest & raised knee
            ctx.strokeStyle = 'rgba(255, 134, 206, 0.88)';
            ctx.lineWidth = Math.max(1.1, u * 0.09);
            ctx.lineCap = 'round';
            // Forehead/face sunset edge
            ctx.beginPath();
            ctx.arc(u * 0.06, -u * 2.26, u * 0.36, Math.PI * 0.85, Math.PI * 1.42);
            ctx.stroke();
            // Front chest & knee sunset rim
            ctx.beginPath();
            ctx.moveTo(-u * 0.04, -u * 1.66);
            ctx.quadraticCurveTo(-u * 0.24, -u * 1.32, -u * 0.24, -u * 0.98);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-u * 0.62, -u * 0.98);
            ctx.quadraticCurveTo(-u * 0.95, -u * 0.94, -u * 1.06, -u * 0.62);
            ctx.stroke();

            // Faint Blue Cosmic Illumination along outer back clothing
            ctx.strokeStyle = 'rgba(72, 185, 250, 0.46)';
            ctx.lineWidth = Math.max(0.9, u * 0.075);
            ctx.beginPath();
            ctx.moveTo(u * 0.45, -u * 1.62);
            ctx.quadraticCurveTo(u * 0.72, -u * 1.12, u * 0.56, -u * 0.48);
            ctx.stroke();

            ctx.restore();
          }

          // ===== CHARACTER B: RIGHT FRIEND =====
          // Sitting immediately right of Character A (small natural gap), slightly taller
          // & broader upper body, upright contemplative posture gazing slightly up at stars,
          // wearing a muted cyan-blue casual jacket
          {
            const bx = vanLeftX + vw * 0.362;
            const by = roofY + u * 0.12;
            ctx.save();
            ctx.translate(bx, by);

            // 1. Dark Trousers & Bent Legs resting naturally on the rooftop
            ctx.fillStyle = '#06142d';
            // Far bent leg
            ctx.beginPath();
            ctx.moveTo(-u * 0.05, -u * 0.26);
            ctx.quadraticCurveTo(-u * 0.68, -u * 1.02, -u * 1.12, -u * 0.68);
            ctx.lineTo(-u * 1.24, u * 0.10);
            ctx.lineTo(-u * 0.90, u * 0.14);
            ctx.lineTo(-u * 0.80, -u * 0.42);
            ctx.lineTo(-u * 0.12, u * 0.08);
            ctx.closePath();
            ctx.fill();

            // Near relaxed bent leg
            ctx.beginPath();
            ctx.moveTo(u * 0.28, -u * 0.22);
            ctx.quadraticCurveTo(-u * 0.36, -u * 0.96, -u * 0.78, -u * 0.76);
            ctx.lineTo(-u * 0.94, u * 0.12);
            ctx.lineTo(-u * 0.56, u * 0.16);
            ctx.lineTo(-u * 0.50, -u * 0.46);
            ctx.lineTo(u * 0.14, u * 0.10);
            ctx.closePath();
            ctx.fill();

            // Shoes
            ctx.fillStyle = '#081a38';
            ctx.beginPath();
            ctx.ellipse(-u * 1.10, u * 0.13, u * 0.24, u * 0.10, -0.15, 0, Math.PI * 2);
            ctx.ellipse(-u * 0.78, u * 0.15, u * 0.26, u * 0.10, -0.08, 0, Math.PI * 2);
            ctx.fill();

            // 2. Upright Slightly Broader Torso in Muted Cyan-Blue Casual Jacket
            const jacketB = ctx.createLinearGradient(-u * 0.35, -u * 2.1, u * 0.85, 0);
            jacketB.addColorStop(0.0, '#1b496e'); // Muted cyan-blue top shoulder
            jacketB.addColorStop(0.45, '#195478'); // Muted cyan-blue casual jacket
            jacketB.addColorStop(0.85, '#0d2b4c'); // Deep shadowed fold
            jacketB.addColorStop(1.0, '#071732');
            ctx.fillStyle = jacketB;
            ctx.beginPath();
            ctx.moveTo(u * 0.34, u * 0.06); // seat base
            ctx.bezierCurveTo(u * 0.68, -u * 0.45, u * 0.74, -u * 1.38, u * 0.44, -u * 1.92); // broader upright back & shoulder
            ctx.quadraticCurveTo(u * 0.18, -u * 2.04, -u * 0.14, -u * 1.88); // collar & front shoulder
            ctx.bezierCurveTo(-u * 0.36, -u * 1.42, -u * 0.34, -u * 0.72, -u * 0.12, -u * 0.02);
            ctx.closePath();
            ctx.fill();

            // One arm resting casually forward on the bent knee
            ctx.strokeStyle = '#1d5d82';
            ctx.lineWidth = u * 0.36;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(u * 0.22, -u * 1.66);
            ctx.lineTo(u * 0.08, -u * 1.05);
            ctx.lineTo(-u * 0.56, -u * 0.82);
            ctx.stroke();

            // 3. Neck & Head (slightly higher than Character A, tilted gently upward toward the cosmic sky)
            ctx.fillStyle = '#0c1c3b';
            ctx.beginPath();
            ctx.moveTo(-u * 0.06, -u * 1.92);
            ctx.lineTo(u * 0.24, -u * 1.92);
            ctx.lineTo(u * 0.22, -u * 2.18);
            ctx.lineTo(-u * 0.02, -u * 2.18);
            ctx.closePath();
            ctx.fill();

            // Head tilted slightly upward (negative rotation facing left-up)
            ctx.save();
            ctx.translate(u * 0.08, -u * 2.50);
            ctx.rotate(0.18);
            ctx.fillStyle = '#0b1836';
            ctx.beginPath();
            ctx.ellipse(0, 0, u * 0.38, u * 0.44, 0, 0, Math.PI * 2);
            ctx.fill();

            // Short Dark Distinct Hairstyle
            ctx.fillStyle = '#050f26';
            ctx.beginPath();
            ctx.moveTo(-u * 0.28, -u * 0.12);
            ctx.quadraticCurveTo(-u * 0.34, -u * 0.48, u * 0.02, -u * 0.50);
            ctx.quadraticCurveTo(u * 0.38, -u * 0.52, u * 0.44, -u * 0.14);
            ctx.quadraticCurveTo(u * 0.46, u * 0.16, u * 0.24, u * 0.28);
            ctx.quadraticCurveTo(u * 0.10, u * 0.04, -u * 0.28, -u * 0.12);
            ctx.closePath();
            ctx.fill();

            // Subtle pink sunset catchlight on left upward-tilted brow
            ctx.strokeStyle = 'rgba(255, 138, 202, 0.78)';
            ctx.lineWidth = Math.max(1.0, u * 0.085);
            ctx.beginPath();
            ctx.arc(-u * 0.02, 0, u * 0.37, Math.PI * 0.85, Math.PI * 1.38);
            ctx.stroke();

            // Cool cyan cosmic moonlight on right back of head
            ctx.strokeStyle = 'rgba(65, 205, 255, 0.55)';
            ctx.lineWidth = Math.max(0.9, u * 0.075);
            ctx.beginPath();
            ctx.arc(u * 0.02, -u * 0.02, u * 0.41, -Math.PI * 0.35, Math.PI * 0.25);
            ctx.stroke();
            ctx.restore();

            // 4. Jacket Rim Lights:
            // Blue-cyan cosmic rim illumination on outer right back & shoulder
            ctx.strokeStyle = 'rgba(72, 212, 255, 0.78)';
            ctx.lineWidth = Math.max(1.1, u * 0.095);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(u * 0.42, -u * 1.90);
            ctx.bezierCurveTo(u * 0.72, -u * 1.38, u * 0.66, -u * 0.55, u * 0.40, -u * 0.06);
            ctx.stroke();

            // Subtle sunset pink rim light on left-facing jacket edge & knee
            ctx.strokeStyle = 'rgba(255, 128, 198, 0.72)';
            ctx.lineWidth = Math.max(1.0, u * 0.085);
            ctx.beginPath();
            ctx.moveTo(-u * 0.14, -u * 1.84);
            ctx.quadraticCurveTo(-u * 0.33, -u * 1.40, -u * 0.28, -u * 0.96);
            ctx.stroke();

            ctx.restore();
          }
        }

        build(w, h) {
          this.w = w;
          this.h = h;
          const rand = mulberry32(this.seed);
          const isPortrait = h > w * 1.05;
          const horizonY = Math.round(h * (isPortrait ? 0.615 : 0.575));
          this.horizonY = horizonY;

          // Sun slightly left of center, diameter ~8-9% of scene width (clamped smoothly for portrait)
          const sunX = w * 0.34;
          const sunR = Math.max(w * 0.044, Math.min(w * 0.056, h * 0.058));
          const sunY = horizonY + sunR * 0.06; // ~half below the distant mountain ridge!
          this.sunCoords = { x: sunX, y: sunY, r: sunR };

          this.stars = [];
          this.clouds = [];
          this.cityTwinkles = [];
          this.grassBlades = [];

          // =========================================================
          // CANVAS 1: VAST COSMIC NIGHT SKY, MILKY WAY & SUNSET GLOW
          // =========================================================
          this.skyCanvas.width = w;
          this.skyCanvas.height = h;
          const sctx = this.skyCanvas.getContext('2d');

          // 1. Deep Cosmic Blue -> Violet -> Vivid Magenta -> Coral-Pink -> Peach Sky Gradient
          const skyGrad = sctx.createLinearGradient(0, 0, 0, horizonY + h * 0.06);
          skyGrad.addColorStop(0.00, '#062653'); // Deep midnight blue
          skyGrad.addColorStop(0.24, '#073B78'); // Rich royal blue
          skyGrad.addColorStop(0.46, '#123e7d'); // Deep cosmic royal transition
          skyGrad.addColorStop(0.64, '#3d3678'); // Twilight indigo-violet
          skyGrad.addColorStop(0.77, '#874c9e'); // Lavender-purple
          skyGrad.addColorStop(0.87, '#d945a0'); // Sunset magenta
          skyGrad.addColorStop(0.94, '#ff6bbd'); // Neon coral pink
          skyGrad.addColorStop(1.00, '#ffadae'); // Warm peach horizon
          sctx.fillStyle = skyGrad;
          sctx.fillRect(0, 0, w, h);

          // Subtle upper-right deep midnight navy space vignette for cinematic contrast
          const spaceDepth = sctx.createRadialGradient(w * 0.88, h * 0.06, 0, w * 0.85, h * 0.12, Math.max(w, h) * 0.65);
          spaceDepth.addColorStop(0, 'rgba(3, 14, 38, 0.62)');
          spaceDepth.addColorStop(1, 'rgba(3, 14, 38, 0)');
          sctx.fillStyle = spaceDepth;
          sctx.fillRect(0, 0, w, horizonY);

          // 2. Magnificent Diagonal Milky Way (Upper-Left -> Central-Left)
          // Organic irregular cosmic dust clouds, cyan/turquoise illumination & dark dust rift
          sctx.save();
          const mwStartX = -w * 0.04;
          const mwStartY = -h * 0.02;
          const mwEndX = w * 0.46;
          const mwEndY = horizonY * 0.80;
          const mwPuffs = 34;

          sctx.globalCompositeOperation = 'lighter';
          for (let i = 0; i < mwPuffs; i++) {
            const t = i / (mwPuffs - 1);
            // Gentle organic S-curve meander so it never looks like a straight artificial bar
            const sway = Math.sin(t * Math.PI * 2.2) * w * 0.045 + (rand() - 0.5) * w * 0.055;
            const px = mwStartX + (mwEndX - mwStartX) * t + sway;
            const py = mwStartY + (mwEndY - mwStartY) * t + (rand() - 0.5) * h * 0.04;
            const pr = Math.min(w, h) * (0.075 + rand() * 0.115) * (1.15 - Math.abs(t - 0.45));
            const alpha = (0.075 + rand() * 0.075) * (1 - t * 0.45);

            const g = sctx.createRadialGradient(px, py, 0, px, py, pr);
            if (i % 3 === 0) {
              g.addColorStop(0, `rgba(68, 224, 245, ${alpha * 1.15})`); // Luminous turquoise-cyan core
              g.addColorStop(0.45, `rgba(40, 185, 240, ${alpha * 0.6})`);
              g.addColorStop(1, 'rgba(18, 86, 160, 0)');
            } else if (i % 3 === 1) {
              g.addColorStop(0, `rgba(175, 245, 255, ${alpha * 0.9})`); // Star-dust white-cyan
              g.addColorStop(0.5, `rgba(115, 168, 240, ${alpha * 0.45})`);
              g.addColorStop(1, 'rgba(18, 86, 160, 0)');
            } else {
              g.addColorStop(0, `rgba(167, 123, 213, ${alpha * 0.85})`); // Subtle cosmic lavender nebula
              g.addColorStop(0.55, `rgba(40, 185, 240, ${alpha * 0.35})`);
              g.addColorStop(1, 'rgba(6, 38, 83, 0)');
            }
            sctx.fillStyle = g;
            sctx.beginPath();
            sctx.arc(px, py, pr, 0, Math.PI * 2);
            sctx.fill();
          }

          // Subtle organic dark cosmic dust rift threading through the Milky Way core
          sctx.globalCompositeOperation = 'source-over';
          for (let i = 0; i < 14; i++) {
            const t = 0.08 + (i / 14) * 0.72;
            const px = mwStartX + (mwEndX - mwStartX) * t + Math.sin(t * 7) * w * 0.02;
            const py = mwStartY + (mwEndY - mwStartY) * t + (rand() - 0.5) * h * 0.025;
            const pr = Math.min(w, h) * (0.03 + rand() * 0.045);
            const dg = sctx.createRadialGradient(px, py, 0, px, py, pr);
            dg.addColorStop(0, 'rgba(4, 22, 56, 0.32)');
            dg.addColorStop(1, 'rgba(4, 22, 56, 0)');
            sctx.fillStyle = dg;
            sctx.beginPath();
            sctx.arc(px, py, pr, 0, Math.PI * 2);
            sctx.fill();
          }
          sctx.restore();

          // 3. Hundreds of Naturally Scattered Sky Stars + Milky Way Star Clusters
          // Bake faint distant stars statically and keep brighter stars for live twinkling
          const starCount = Math.max(240, Math.min(460, Math.floor((w * horizonY) / 900)));
          for (let i = 0; i < starCount; i++) {
            let sx, sy;
            const inMilkyWay = rand() < 0.46;
            if (inMilkyWay) {
              const t = rand() * 0.92;
              const spread = (rand() + rand() - 1) * w * 0.14;
              sx = mwStartX + (mwEndX - mwStartX) * t + Math.sin(t * Math.PI * 2.2) * w * 0.045 + spread;
              sy = mwStartY + (mwEndY - mwStartY) * t + (rand() + rand() - 1) * h * 0.075;
            } else {
              sx = rand() * w;
              sy = Math.pow(rand(), 1.35) * horizonY * 0.88;
            }

            if (sx < 0 || sx > w || sy < 0 || sy > horizonY * 0.9) continue;

            // Fade stars naturally as they near the bright pink horizon
            const heightFade = Math.max(0.08, Math.min(1, 1 - (sy / (horizonY * 0.92)) * 0.92));
            const isClusterBright = rand() < 0.075;
            const r = isClusterBright ? (1.1 + rand() * 1.3) : (0.38 + rand() * 0.85);
            const tintRoll = rand();
            const color = tintRoll < 0.35 ? '#c6f4ff' : tintRoll < 0.72 ? '#ffffff' : tintRoll < 0.9 ? '#ffe8d4' : '#d7c8ff';

            if (isClusterBright || rand() < 0.25) {
              this.stars.push({
                x: sx,
                y: sy,
                r,
                alpha: heightFade * (isClusterBright ? 0.95 : 0.7),
                color,
                phase: rand() * Math.PI * 2,
                speed: 1.2 + rand() * 2.6,
                glint: isClusterBright && r > 1.55,
              });
            } else {
              sctx.fillStyle = color;
              sctx.globalAlpha = heightFade * (0.28 + rand() * 0.55);
              sctx.beginPath();
              sctx.arc(sx, sy, r, 0, Math.PI * 2);
              sctx.fill();
            }
          }
          sctx.globalAlpha = 1;

          // 4. Horizon Sunset Lighting Band & Large Glowing Sun
          // Bright horizontal pink-magenta atmospheric glow band
          const bandGrad = sctx.createLinearGradient(0, horizonY - h * 0.16, 0, horizonY + h * 0.08);
          bandGrad.addColorStop(0, 'rgba(240, 68, 166, 0)');
          bandGrad.addColorStop(0.55, 'rgba(255, 107, 189, 0.42)');
          bandGrad.addColorStop(0.85, 'rgba(255, 173, 174, 0.62)');
          bandGrad.addColorStop(1, 'rgba(255, 173, 174, 0)');
          sctx.fillStyle = bandGrad;
          sctx.fillRect(0, horizonY - h * 0.16, w, h * 0.24);

          // Primary sunset radial light aura radiating across the sky
          const sunAura = sctx.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, Math.max(w, h) * 0.52);
          sunAura.addColorStop(0.00, 'rgba(255, 244, 205, 0.92)');
          sunAura.addColorStop(0.14, 'rgba(255, 228, 161, 0.70)');
          sunAura.addColorStop(0.32, 'rgba(255, 173, 174, 0.42)');
          sunAura.addColorStop(0.58, 'rgba(240, 68, 166, 0.18)');
          sunAura.addColorStop(1.00, 'rgba(167, 123, 213, 0)');
          sctx.fillStyle = sunAura;
          sctx.fillRect(0, 0, w, h);

          // The Circular Sun (pale warm yellow-white core + soft golden-peach outer glow)
          sctx.save();
          const discHalo = sctx.createRadialGradient(sunX, sunY, sunR * 0.65, sunX, sunY, sunR * 2.1);
          discHalo.addColorStop(0, 'rgba(255, 240, 190, 0.95)');
          discHalo.addColorStop(0.5, 'rgba(255, 173, 174, 0.48)');
          discHalo.addColorStop(1, 'rgba(255, 107, 189, 0)');
          sctx.fillStyle = discHalo;
          sctx.beginPath();
          sctx.arc(sunX, sunY, sunR * 2.1, 0, Math.PI * 2);
          sctx.fill();

          const sunDisc = sctx.createRadialGradient(sunX, sunY - sunR * 0.15, 0, sunX, sunY, sunR);
          sunDisc.addColorStop(0.0, '#fffef2');
          sunDisc.addColorStop(0.55, '#fff0be');
          sunDisc.addColorStop(0.88, '#ffd49c');
          sunDisc.addColorStop(1.0, '#ffad9e');
          sctx.fillStyle = sunDisc;
          sctx.beginPath();
          sctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
          sctx.fill();
          sctx.restore();

          // Initialize Organic Painterly Clouds (upper-left, upper-right & scattered horizon wisps)
          this.clouds = [
            { x: w * 0.10, y: horizonY * 0.72, cw: w * 0.46, ch: h * 0.085, alpha: 0.92, speed: 1.6 },
            { x: w * 0.88, y: horizonY * 0.68, cw: w * 0.50, ch: h * 0.095, alpha: 0.90, speed: 1.2 },
            { x: w * 0.66, y: horizonY * 0.83, cw: w * 0.34, ch: h * 0.052, alpha: 0.82, speed: 2.1 },
            { x: w * 0.24, y: horizonY * 0.88, cw: w * 0.28, ch: h * 0.040, alpha: 0.72, speed: 2.4 },
            { x: w * 0.50, y: horizonY * 0.92, cw: w * 0.24, ch: h * 0.032, alpha: 0.65, speed: 1.9 },
          ];

          // =========================================================
          // CANVAS 2: MOUNTAINS, ILLUMINATED CITY VALLEY, TREES,
          //           ROCKY CLIFF, CAMPER VAN & TWO FRIENDS
          // =========================================================
          this.landscapeCanvas.width = w;
          this.landscapeCanvas.height = h;
          const lctx = this.landscapeCanvas.getContext('2d');

          // 1. Four Layered Distant Mountain Ranges (clipping lower half of the sun naturally!)
          const mountainRanges = [
            {
              // First distant range: muted violet with pink sunset glow
              baseY: horizonY + h * 0.028,
              amp: h * 0.085,
              freq: 3.4,
              seed: 1201,
              dipX: 0.34,
              dip: h * 0.025,
              topC: '#6b4d96',
              botC: '#9c5a9c',
              rim: 'rgba(255, 176, 198, 0.52)',
            },
            {
              // Second range: dark lavender-blue
              baseY: horizonY + h * 0.068,
              amp: h * 0.092,
              freq: 2.9,
              seed: 2309,
              dipX: 0.36,
              dip: h * 0.042,
              topC: '#3a3b75',
              botC: '#584a8e',
              rim: 'rgba(240, 130, 196, 0.34)',
            },
            {
              // Third range: royal blue
              baseY: horizonY + h * 0.115,
              amp: h * 0.095,
              freq: 2.4,
              seed: 3413,
              dipX: 0.34,
              dip: h * 0.058,
              topC: '#153a7a',
              botC: '#1f4f94',
              rim: 'rgba(130, 176, 240, 0.24)',
            },
            {
              // Foreground valley hills: deep navy framing the illuminated city basin
              baseY: horizonY + h * 0.175,
              amp: h * 0.088,
              freq: 2.0,
              seed: 4517,
              dipX: 0.30,
              dip: h * 0.072,
              topC: '#091f4a',
              botC: '#061533',
              rim: 'rgba(65, 145, 225, 0.18)',
            },
          ];

          let valleyTopPts = null;
          for (let rIdx = 0; rIdx < mountainRanges.length; rIdx++) {
            const mr = mountainRanges[rIdx];
            const pts = this.buildRangePoints(w, mr.baseY, mr.amp, mr.freq, mr.seed, mr.dipX, mr.dip);
            if (rIdx === mountainRanges.length - 1) valleyTopPts = pts;

            lctx.save();
            lctx.beginPath();
            lctx.moveTo(0, h);
            for (let x = 0; x <= w; x += 2) lctx.lineTo(x, pts[x]);
            lctx.lineTo(w, pts[w]);
            lctx.lineTo(w, h);
            lctx.closePath();

            const mg = lctx.createLinearGradient(0, mr.baseY - mr.amp, 0, mr.baseY + h * 0.08);
            mg.addColorStop(0, mr.topC);
            mg.addColorStop(1, mr.botC);
            lctx.fillStyle = mg;
            lctx.fill();

            // Subtle pink horizon haze washing across the distant valley troughs
            if (rIdx < 2) {
              const haze = lctx.createLinearGradient(0, mr.baseY - mr.amp * 0.3, 0, mr.baseY + h * 0.05);
              haze.addColorStop(0, 'rgba(255, 148, 196, 0)');
              haze.addColorStop(1, rIdx === 0 ? 'rgba(255, 138, 198, 0.32)' : 'rgba(180, 112, 210, 0.22)');
              lctx.fillStyle = haze;
              lctx.fill();
            }

            // Delicate sunset catchlight on ridges near the sun
            lctx.beginPath();
            for (let x = 0; x <= w; x += 2) {
              if (x === 0) lctx.moveTo(x, pts[x]);
              else lctx.lineTo(x, pts[x]);
            }
            lctx.strokeStyle = mr.rim;
            lctx.lineWidth = rIdx === 0 ? 1.4 : 1.0;
            lctx.stroke();
            lctx.restore();
          }

          // 2. Distant Illuminated City Valley (below mountains, left-to-center basin)
          const valleyTopY = horizonY + h * 0.145;
          const valleyBotY = h;

          // Deep midnight valley floor gradient
          const vFloor = lctx.createLinearGradient(0, valleyTopY, 0, valleyBotY);
          vFloor.addColorStop(0, '#071a3f');
          vFloor.addColorStop(0.5, '#05132e');
          vFloor.addColorStop(1, '#030c1f');
          lctx.fillStyle = vFloor;
          lctx.fillRect(0, valleyTopY + h * 0.03, w, h - valleyTopY);

          // Soft warm golden-pink atmospheric city glow hovering over central valley
          lctx.save();
          lctx.globalCompositeOperation = 'lighter';
          const cityCenterX = w * 0.29;
          const cityCenterY = horizonY + h * 0.23;
          const cityHaze = lctx.createRadialGradient(cityCenterX, cityCenterY, 4, cityCenterX, cityCenterY, w * 0.42);
          cityHaze.addColorStop(0, 'rgba(255, 214, 142, 0.30)');
          cityHaze.addColorStop(0.45, 'rgba(240, 108, 178, 0.16)');
          cityHaze.addColorStop(1, 'rgba(10, 28, 68, 0)');
          lctx.fillStyle = cityHaze;
          lctx.fillRect(0, horizonY, w * 0.8, h - horizonY);

          // Winding illuminated valley highways / delicate golden light trails
          const roads = [
            { yOff: 0.18, amp: 0.018, alpha: 0.42 },
            { yOff: 0.225, amp: 0.024, alpha: 0.55 },
            { yOff: 0.27, amp: 0.028, alpha: 0.48 },
            { yOff: 0.32, amp: 0.022, alpha: 0.35 },
          ];
          for (let ri = 0; ri < roads.length; ri++) {
            const rd = roads[ri];
            const ry = horizonY + h * rd.yOff;
            lctx.strokeStyle = `rgba(255, 224, 155, ${rd.alpha})`;
            lctx.lineWidth = Math.max(0.8, h * 0.0018);
            lctx.beginPath();
            for (let x = 0; x <= w * 0.72; x += 6) {
              const t = x / (w * 0.72);
              const wy = ry + Math.sin(t * Math.PI * 2.4 + ri * 1.4) * h * rd.amp + t * h * 0.022;
              if (x === 0) lctx.moveTo(x, wy);
              else lctx.lineTo(x, wy);
            }
            lctx.stroke();
          }

          // Hundreds of tiny warm glowing city lights clustered organically in the distant valley
          const cityLightCount = Math.max(260, Math.min(480, Math.floor((w * h) / 750)));
          for (let i = 0; i < cityLightCount; i++) {
            // Denser clusters around central-left valley
            const depthT = Math.pow(rand(), 1.25); // 0 = far horizon edge, 1 = closer valley floor
            const cx = (rand() < 0.72)
              ? w * (0.04 + rand() * 0.56)
              : w * (0.01 + rand() * 0.72);
            const cy = horizonY + h * (0.165 + depthT * 0.21);

            // Keep lights below the mountain ridge contour
            const ridgeIdx = Math.max(0, Math.min(w, Math.round(cx)));
            if (valleyTopPts && cy < valleyTopPts[ridgeIdx] + 4) continue;

            const lr = (0.45 + depthT * 1.15) * (rand() < 0.14 ? 1.55 : 1.0);
            const isPink = rand() < 0.18;
            const col = isPink ? '#ff9fd0' : rand() < 0.65 ? '#ffe4a1' : '#ffbf69';
            const la = (0.35 + rand() * 0.65) * (0.6 + depthT * 0.4);

            lctx.fillStyle = col;
            lctx.globalAlpha = la;
            lctx.beginPath();
            lctx.arc(cx, cy, lr, 0, Math.PI * 2);
            lctx.fill();

            // Register subset for live subtle valley shimmer
            if (rand() < 0.18) {
              this.cityTwinkles.push({
                x: cx, y: cy, r: lr * 1.35, color: col, phase: rand() * Math.PI * 2, speed: 1.5 + rand() * 3.0,
              });
            }
          }
          lctx.restore();

          // 3. Framing Pine Trees Behind Camper Van (Right Side) & Dense Left Pine Silhouettes
          // Right side tall uneven pines behind the cliff & camper van
          const cliffTopY = Math.round(h * (isPortrait ? 0.835 : 0.825));
          const rightPines = [
            { x: 0.74, h: 0.21, c: '#071734' },
            { x: 0.81, h: 0.27, c: '#05122b' },
            { x: 0.88, h: 0.31, c: '#040f24' },
            { x: 0.94, h: 0.36, c: '#040d20' },
            { x: 0.99, h: 0.33, c: '#030b1c' },
          ];
          for (const rp of rightPines) {
            this.drawPine(lctx, rp.x * w, cliffTopY + h * 0.04, rp.h * h, rp.c, 'rgba(40, 185, 240, 0.12)', rand);
          }

          // Left side framing dense pine silhouettes along bottom-left edge (never blocking sun)
          const leftPines = [
            { x: -0.01, h: 0.34, c: '#040d20' },
            { x: 0.045, h: 0.28, c: '#05122b' },
            { x: 0.095, h: 0.21, c: '#061634' },
            { x: 0.145, h: 0.14, c: '#081b3d' },
          ];
          for (const lp of leftPines) {
            this.drawPine(lctx, lp.x * w, h + h * 0.02, lp.h * h, lp.c, 'rgba(255, 115, 190, 0.14)', rand);
          }

          // 4. Foreground Elevated Rocky Mountain Cliff (Lower-Right Platform for the Camper Van)
          const cliffLeftX = w * (isPortrait ? 0.30 : 0.36);
          lctx.save();
          // Main cliff silhouette with jagged overhanging rocky prow on the left
          lctx.beginPath();
          lctx.moveTo(w + 6, h + 6);
          lctx.lineTo(cliffLeftX - w * 0.08, h + 6);
          // Irregular craggy vertical-diagonal cliff face stepping upward
          lctx.lineTo(cliffLeftX - w * 0.03, cliffTopY + h * 0.12);
          lctx.lineTo(cliffLeftX - w * 0.06, cliffTopY + h * 0.065);
          lctx.lineTo(cliffLeftX - w * 0.015, cliffTopY + h * 0.025);
          // Irregular natural stone platform top running across right side
          lctx.lineTo(cliffLeftX + w * 0.04, cliffTopY + h * 0.005);
          lctx.lineTo(cliffLeftX + w * 0.18, cliffTopY - h * 0.004);
          lctx.lineTo(w * 0.68, cliffTopY - h * 0.002);
          lctx.lineTo(w * 0.88, cliffTopY + h * 0.004);
          lctx.lineTo(w + 6, cliffTopY - h * 0.008);
          lctx.closePath();

          const cliffGrad = lctx.createLinearGradient(cliffLeftX, cliffTopY, w * 0.85, h);
          cliffGrad.addColorStop(0.00, '#1c3563'); // Illuminated slate-blue stone top
          cliffGrad.addColorStop(0.28, '#172C52'); // Cliff slate
          cliffGrad.addColorStop(0.65, '#0b1d3e'); // Dark indigo rock face
          cliffGrad.addColorStop(1.00, '#051026'); // Deep midnight cliff base
          lctx.fillStyle = cliffGrad;
          lctx.fill();

          // Clip geological strata, angular rock projections, sunset-lit facets & cracks inside cliff
          lctx.save();
          lctx.clip();

          // Angular layered geological rock facets catching muted violet/pink sunset rim on left edges
          const facets = [
            {
              pts: [[cliffLeftX - w * 0.02, cliffTopY + h * 0.02], [cliffLeftX + w * 0.10, cliffTopY + h * 0.01], [cliffLeftX + w * 0.06, cliffTopY + h * 0.09], [cliffLeftX - w * 0.06, cliffTopY + h * 0.07]],
              c: 'rgba(138, 92, 178, 0.34)',
            },
            {
              pts: [[cliffLeftX + w * 0.10, cliffTopY + h * 0.01], [cliffLeftX + w * 0.28, cliffTopY + h * 0.03], [cliffLeftX + w * 0.22, cliffTopY + h * 0.14], [cliffLeftX + w * 0.06, cliffTopY + h * 0.09]],
              c: 'rgba(14, 34, 72, 0.72)',
            },
            {
              pts: [[cliffLeftX + w * 0.28, cliffTopY + h * 0.03], [w * 0.82, cliffTopY + h * 0.02], [w * 0.76, h], [cliffLeftX + w * 0.22, cliffTopY + h * 0.14]],
              c: 'rgba(9, 24, 54, 0.82)',
            },
            {
              pts: [[cliffLeftX - w * 0.06, cliffTopY + h * 0.07], [cliffLeftX + w * 0.06, cliffTopY + h * 0.09], [cliffLeftX + w * 0.02, h], [cliffLeftX - w * 0.08, h]],
              c: 'rgba(6, 17, 40, 0.88)',
            },
            {
              pts: [[w * 0.78, cliffTopY + h * 0.02], [w + 6, cliffTopY], [w + 6, h], [w * 0.70, h]],
              c: 'rgba(5, 14, 34, 0.84)',
            },
          ];
          for (const f of facets) {
            lctx.fillStyle = f.c;
            lctx.beginPath();
            f.pts.forEach((p, idx) => (idx === 0 ? lctx.moveTo(p[0], p[1]) : lctx.lineTo(p[0], p[1])));
            lctx.closePath();
            lctx.fill();
          }

          // Deep geological fracture lines & stone cracks
          lctx.strokeStyle = 'rgba(3, 9, 24, 0.78)';
          lctx.lineWidth = Math.max(1.2, w * 0.003);
          for (let c = 0; c < 8; c++) {
            const sx = cliffLeftX + rand() * (w - cliffLeftX);
            const sy = cliffTopY + h * (0.015 + rand() * 0.05);
            lctx.beginPath();
            lctx.moveTo(sx, sy);
            lctx.lineTo(sx + (rand() - 0.5) * w * 0.07, sy + h * 0.05);
            lctx.lineTo(sx + (rand() - 0.5) * w * 0.11, sy + h * 0.11);
            lctx.stroke();
          }

          // Subtle muted pink-lavender sunset rim highlighting top cliff stone edge
          lctx.strokeStyle = 'rgba(220, 145, 205, 0.44)';
          lctx.lineWidth = Math.max(1.5, h * 0.003);
          lctx.beginPath();
          lctx.moveTo(cliffLeftX - w * 0.015, cliffTopY + h * 0.025);
          lctx.lineTo(cliffLeftX + w * 0.04, cliffTopY + h * 0.005);
          lctx.lineTo(cliffLeftX + w * 0.18, cliffTopY - h * 0.004);
          lctx.lineTo(w * 0.68, cliffTopY - h * 0.002);
          lctx.stroke();

          lctx.restore(); // end cliff clip

          // Scattered small cliff stones & wild rocky tufts along the platform surface
          for (let s = 0; s < 14; s++) {
            const rx = cliffLeftX + w * 0.02 + rand() * (w - cliffLeftX - w * 0.04);
            const ry = cliffTopY + (rand() - 0.3) * h * 0.016;
            const rw = 2 + rand() * (w * 0.014);
            const rh = rw * (0.45 + rand() * 0.35);
            lctx.fillStyle = rand() > 0.5 ? '#0e2248' : '#1b3563';
            lctx.beginPath();
            lctx.ellipse(rx, ry, rw, rh, (rand() - 0.5) * 0.4, 0, Math.PI * 2);
            lctx.fill();
          }

          // Low cliff-edge dark shrubs & foreground wild grass blades (animated gently in render)
          const shrubSpots = [cliffLeftX + w * 0.02, cliffLeftX + w * 0.06, w * 0.94, w * 0.98];
          for (const sx of shrubSpots) {
            lctx.fillStyle = '#051229';
            for (let b = 0; b < 5; b++) {
              lctx.beginPath();
              lctx.arc(sx + (b - 2) * (w * 0.012), cliffTopY + h * 0.006 - rand() * h * 0.01, w * (0.012 + rand() * 0.01), 0, Math.PI * 2);
              lctx.fill();
            }
          }

          for (let g = 0; g < 24; g++) {
            const gx = cliffLeftX + w * (0.01 + rand() * 0.14);
            this.grassBlades.push({
              x: gx,
              y: cliffTopY + h * 0.008,
              h: h * (0.018 + rand() * 0.024),
              lean: (rand() - 0.5) * 0.5,
              phase: rand() * Math.PI * 2,
            });
          }
          lctx.restore();

          // 5. HERO VINTAGE BLUE CAMPER VAN + TWO FRIENDS ON ROOFTOP
          const vanWidth = isPortrait
            ? Math.min(w * 0.46, h * 0.34)
            : Math.min(w * 0.33, h * 0.54);
          const vanLeftX = isPortrait
            ? w * 0.48
            : w * 0.57;
          const vanGroundY = cliffTopY + h * 0.004;

          const vanMetrics = this.drawCamperVan(lctx, vanLeftX, vanGroundY, vanWidth);
          this.drawTwoFriends(lctx, vanMetrics.roofY, vanMetrics.leftX, vanMetrics.vw);
        }

        render(ctx, w, h, time, animate = true) {
          if (this.w !== w || this.h !== h) this.build(w, h);
          const t = animate ? time : 3.2;

          // 1. Vast Cosmic Sky, Milky Way & Glowing Sunset
          ctx.drawImage(this.skyCanvas, 0, 0);

          // 2. Twinkling Brighter Cosmic Stars & Star Clusters
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (const st of this.stars) {
            const tw = 0.45 + 0.55 * Math.sin(t * st.speed + st.phase);
            ctx.globalAlpha = st.alpha * tw;
            ctx.fillStyle = st.color;
            ctx.beginPath();
            ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
            ctx.fill();

            // Delicate 4-point cinematic star cluster glint
            if (st.glint && tw > 0.72) {
              const arm = st.r * (2.6 + tw * 1.4);
              ctx.strokeStyle = st.color;
              ctx.globalAlpha = st.alpha * tw * 0.55;
              ctx.lineWidth = 0.7;
              ctx.beginPath();
              ctx.moveTo(st.x - arm, st.y);
              ctx.lineTo(st.x + arm, st.y);
              ctx.moveTo(st.x, st.y - arm);
              ctx.lineTo(st.x, st.y + arm);
              ctx.stroke();
            }
          }

          // Occasional dreamy shooting star gliding across the upper cosmic sky
          if (animate) {
            const cycle = t % 9.5;
            if (cycle < 1.15) {
              const p = cycle / 1.15;
              const fade = Math.sin(p * Math.PI);
              const sx = w * (0.78 - p * 0.34);
              const sy = h * (0.09 + p * 0.14);
              const tx = sx + w * 0.085;
              const ty = sy - h * 0.036;
              const sg = ctx.createLinearGradient(sx, sy, tx, ty);
              sg.addColorStop(0, `rgba(255, 255, 255, ${fade * 0.92})`);
              sg.addColorStop(0.35, `rgba(110, 230, 255, ${fade * 0.55})`);
              sg.addColorStop(1, 'rgba(40, 185, 240, 0)');
              ctx.strokeStyle = sg;
              ctx.lineWidth = 1.6;
              ctx.lineCap = 'round';
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(tx, ty);
              ctx.stroke();
            }
          }
          ctx.restore();

          // 3. Soft Drifting Painterly Clouds (Behind distant mountains)
          const { x: sunX, y: sunY, r: sunR } = this.sunCoords;
          for (const cl of this.clouds) {
            const span = w + cl.cw * 1.3;
            const cx = ((cl.x + t * cl.speed) % span + span) % span - cl.cw * 0.65;
            this.drawCinematicCloud(ctx, cx, cl.y, cl.cw, cl.ch, sunX, sunY, cl.alpha);
          }

          // 4. Subtle Breathing Sunset Atmospheric Diffusion
          const sunBreath = 0.08 + 0.035 * Math.sin(t * 0.65);
          const sGlow = ctx.createRadialGradient(sunX, sunY, sunR * 0.3, sunX, sunY, Math.max(w, h) * 0.44);
          sGlow.addColorStop(0, `rgba(255, 228, 161, ${sunBreath * 1.4})`);
          sGlow.addColorStop(0.45, `rgba(255, 107, 189, ${sunBreath})`);
          sGlow.addColorStop(1, 'rgba(240, 68, 166, 0)');
          ctx.fillStyle = sGlow;
          ctx.fillRect(0, 0, w, this.horizonY + h * 0.14);

          // 5. Mountains, Illuminated Valley City, Pines, Rocky Cliff, Camper Van & Two Friends
          ctx.drawImage(this.landscapeCanvas, 0, 0);

          // 6. Live Shimmering Distant Valley City Lights
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (const ct of this.cityTwinkles) {
            const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * ct.speed + ct.phase));
            ctx.globalAlpha = pulse * 0.82;
            ctx.fillStyle = ct.color;
            ctx.beginPath();
            ctx.arc(ct.x, ct.y, ct.r, 0, Math.PI * 2);
            ctx.fill();
          }

          // Subtle cozy breathing glow from the camper van's pink-purple cabin windows
          if (this.vanWindowGlowRect) {
            const vr = this.vanWindowGlowRect;
            const vPulse = 0.09 + 0.04 * Math.sin(t * 1.1);
            const vg = ctx.createRadialGradient(
              vr.x + vr.w * 0.5, vr.y + vr.h * 0.5, vr.h * 0.1,
              vr.x + vr.w * 0.5, vr.y + vr.h * 0.5, vr.w * 0.62
            );
            vg.addColorStop(0, `rgba(255, 128, 206, ${vPulse})`);
            vg.addColorStop(1, 'rgba(240, 68, 166, 0)');
            ctx.fillStyle = vg;
            ctx.fillRect(vr.x - vr.w * 0.25, vr.y - vr.h * 1.2, vr.w * 1.5, vr.h * 3.4);
          }
          ctx.restore();

          // 7. Gentle Mountain Breeze Sway on Foreground Cliff Grass Blades
          ctx.save();
          ctx.strokeStyle = '#071530';
          ctx.lineWidth = Math.max(1.0, w * 0.0024);
          ctx.lineCap = 'round';
          for (const gb of this.grassBlades) {
            const sway = Math.sin(t * 1.35 + gb.phase) * 0.16;
            const tipX = gb.x + Math.sin(gb.lean + sway) * gb.h;
            const tipY = gb.y - Math.cos(gb.lean + sway) * gb.h;
            ctx.beginPath();
            ctx.moveTo(gb.x, gb.y);
            ctx.quadraticCurveTo(gb.x + sway * gb.h * 0.4, gb.y - gb.h * 0.55, tipX, tipY);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

      /* ---------------------------------------------------------
         4C. THEME ENGINE 5: ALPINE SERENITY (THE STILLWATER SANCTUARY)
             100% STATIC procedural alpine landscape:
             pale turquoise sky, towering jagged snow-capped peaks,
             dense evergreen forests, mirror-like turquoise lake with
             exact inverted reflections, rocky shoreline & fallen logs.
         --------------------------------------------------------- */
      class AlpineSerenityRenderer {
        constructor(seed = 5197) {
          this.seed = seed;
          this.w = 0;
          this.h = 0;
          this.staticCanvas = createCanvas();
        }

        // Generates a jagged, organic irregular ridge curve between two points
        buildJaggedPath(x0, y0, x1, y1, segments, roughness, rand, curveBias = 0) {
          const pts = [{ x: x0, y: y0 }];
          const dx = x1 - x0;
          const dy = y1 - y0;
          for (let i = 1; i < segments; i++) {
            const t = i / segments;
            // Subtle concave alpine slope curve + natural geological rock jagging
            const bow = Math.sin(t * Math.PI) * curveBias;
            const jag = (rand() - 0.5) * roughness * Math.sin(t * Math.PI);
            const jagX = (rand() - 0.5) * roughness * 0.45 * Math.sin(t * Math.PI);
            pts.push({
              x: x0 + dx * t + jagX,
              y: y0 + dy * t + bow + jag,
            });
          }
          pts.push({ x: x1, y: y1 });
          return pts;
        }

        // Draws soft static distant alpine clouds with irregular natural silhouettes
        drawStillCloud(ctx, x, y, cw, ch, alpha, warmTint, rand) {
          ctx.save();
          ctx.globalAlpha = alpha;
          const puffs = 8;
          for (let i = 0; i < puffs; i++) {
            const frac = i / (puffs - 1) - 0.5;
            const px = x + frac * cw * 0.78 + (rand() - 0.5) * cw * 0.08;
            const py = y - Math.cos(frac * Math.PI) * ch * (0.28 + rand() * 0.16) + ch * 0.12;
            const rx = cw * (0.18 + (1 - Math.abs(frac) * 1.45) * 0.16 + rand() * 0.05);
            const ry = ch * (0.34 + (1 - Math.abs(frac) * 1.35) * 0.34 + rand() * 0.08);

            // Subtle cool misty underside shadow
            ctx.save();
            ctx.translate(px - cw * 0.012, py + ry * 0.18);
            ctx.scale(1, Math.max(0.18, ry / Math.max(1, rx)));
            const sh = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
            sh.addColorStop(0, 'rgba(131, 185, 182, 0.34)');
            sh.addColorStop(1, 'rgba(131, 185, 182, 0)');
            ctx.fillStyle = sh;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Soft sunlit ivory-white upper cloud body
            ctx.save();
            ctx.translate(px, py);
            ctx.scale(1, Math.max(0.18, ry / Math.max(1, rx)));
            const cg = ctx.createRadialGradient(rx * 0.18, -rx * 0.2, rx * 0.06, 0, 0, rx);
            if (warmTint) {
              cg.addColorStop(0, 'rgba(245, 241, 226, 0.92)');
              cg.addColorStop(0.55, 'rgba(231, 232, 220, 0.58)');
              cg.addColorStop(1, 'rgba(220, 232, 228, 0)');
            } else {
              cg.addColorStop(0, 'rgba(238, 242, 236, 0.85)');
              cg.addColorStop(0.55, 'rgba(205, 225, 222, 0.45)');
              cg.addColorStop(1, 'rgba(165, 204, 202, 0)');
            }
            ctx.fillStyle = cg;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }

        // Draws an intricate, sculpted snow-capped alpine mountain massif with sunlit/shadowed
        // arête ridges, geological rock ribs, snow couloirs, and crisp summit geometry
        drawAlpineMassif(ctx, peakX, peakY, leftX, rightX, baseY, opts, rand) {
          const hSpan = baseY - peakY;
          const wSpan = rightX - leftX;
          const rough = opts.roughness || hSpan * 0.095;

          // Build asymmetrical irregular left & right skylines and a meandering central spine (arête)
          const leftRidge = this.buildJaggedPath(peakX, peakY, leftX, baseY, 10, rough, rand, hSpan * 0.055);
          const rightRidge = this.buildJaggedPath(peakX, peakY, rightX, baseY, 10, rough, rand, hSpan * 0.065);
          const spineShift = (opts.spineOffset || -0.05) * wSpan;
          const spineRidge = this.buildJaggedPath(peakX, peakY, peakX + spineShift, baseY, 12, rough * 0.72, rand, 0);

          ctx.save();

          // 1. Full Mountain Silhouette Path (clipped container for crisp rock & snow strata)
          ctx.beginPath();
          ctx.moveTo(leftRidge[leftRidge.length - 1].x, baseY + 6);
          for (let i = leftRidge.length - 1; i >= 0; i--) ctx.lineTo(leftRidge[i].x, leftRidge[i].y);
          for (let i = 1; i < rightRidge.length; i++) ctx.lineTo(rightRidge[i].x, rightRidge[i].y);
          ctx.lineTo(rightRidge[rightRidge.length - 1].x, baseY + 6);
          ctx.closePath();

          // Base shadowed slate rock fill
          const baseRockGrad = ctx.createLinearGradient(peakX, peakY, peakX, baseY);
          baseRockGrad.addColorStop(0.0, opts.shadowTop || '#526D70');
          baseRockGrad.addColorStop(0.45, opts.shadowMid || '#375357');
          baseRockGrad.addColorStop(1.0, opts.shadowBot || '#243c3e');
          ctx.fillStyle = baseRockGrad;
          ctx.fill();

          ctx.save();
          ctx.clip();

          // 2. Right Sun-Facing Slope (warm pale sunlight #F1E8CD & snow ivory #E7E8DC)
          ctx.beginPath();
          ctx.moveTo(peakX, peakY);
          for (let i = 1; i < rightRidge.length; i++) ctx.lineTo(rightRidge[i].x, rightRidge[i].y);
          ctx.lineTo(rightX, baseY + 6);
          ctx.lineTo(spineRidge[spineRidge.length - 1].x, baseY + 6);
          for (let i = spineRidge.length - 1; i >= 0; i--) ctx.lineTo(spineRidge[i].x, spineRidge[i].y);
          ctx.closePath();

          const sunFaceGrad = ctx.createLinearGradient(peakX, peakY, rightX, baseY);
          sunFaceGrad.addColorStop(0.00, opts.sunTop || '#F1E8CD'); // Warm sunlight summit snow
          sunFaceGrad.addColorStop(0.38, opts.sunMid || '#E7E8DC'); // Crisp alpine snow ivory
          sunFaceGrad.addColorStop(0.74, opts.sunLow || '#9ab5b4'); // Lower weathered rock-snow transition
          sunFaceGrad.addColorStop(1.00, opts.sunBase || '#4c696b'); // Lower mountain slate
          ctx.fillStyle = sunFaceGrad;
          ctx.fill();

          // 3. Secondary Angular Geological Spurs & Exposed Dark Slate Rock Ribs on Sunlit Face
          const spurCount = opts.spurs || 5;
          for (let s = 0; s < spurCount; s++) {
            const idx = 2 + Math.floor((s / spurCount) * (spineRidge.length - 4));
            const anchor = spineRidge[Math.min(spineRidge.length - 1, idx)];
            const tY = (anchor.y - peakY) / Math.max(1, hSpan);
            const spurW = wSpan * (0.09 + rand() * 0.14) * (0.45 + tY * 0.75);
            const spurH = hSpan * (0.18 + rand() * 0.28);

            // Exposed jagged rocky crag face (Mountain Slate #526D70 & deep grey-green)
            ctx.fillStyle = s % 2 === 0 ? 'rgba(65, 92, 95, 0.78)' : 'rgba(42, 66, 68, 0.74)';
            ctx.beginPath();
            ctx.moveTo(anchor.x + spurW * 0.12, anchor.y);
            ctx.lineTo(anchor.x + spurW * (0.7 + rand() * 0.45), anchor.y + spurH * 0.36);
            ctx.lineTo(anchor.x + spurW * (1.15 + rand() * 0.5), anchor.y + spurH);
            ctx.lineTo(anchor.x + spurW * 0.32, anchor.y + spurH * 0.88);
            ctx.lineTo(anchor.x + spurW * 0.04, anchor.y + spurH * 0.42);
            ctx.closePath();
            ctx.fill();

            // Crisp sunlit snow ribbon catching light along top ridge of the rock spur
            ctx.fillStyle = 'rgba(241, 232, 205, 0.65)';
            ctx.beginPath();
            ctx.moveTo(anchor.x + spurW * 0.12, anchor.y);
            ctx.lineTo(anchor.x + spurW * 0.72, anchor.y + spurH * 0.34);
            ctx.lineTo(anchor.x + spurW * 0.54, anchor.y + spurH * 0.42);
            ctx.lineTo(anchor.x + spurW * 0.06, anchor.y + spurH * 0.10);
            ctx.closePath();
            ctx.fill();
          }

          // 4. Shadowed Left Face Snowfields, Glacial Couloirs & Blue-White Crevasses
          const leftSnowPatches = opts.leftSnow || 5;
          for (let p = 0; p < leftSnowPatches; p++) {
            const idx = 1 + Math.floor((p / leftSnowPatches) * (spineRidge.length - 4));
            const sp = spineRidge[Math.min(spineRidge.length - 1, idx)];
            const lr = leftRidge[Math.min(leftRidge.length - 1, idx + 1)];
            const patchH = hSpan * (0.14 + rand() * 0.24);
            const midX = (sp.x + lr.x) * 0.5 + (rand() - 0.5) * wSpan * 0.06;

            const snowShade = ctx.createLinearGradient(sp.x, sp.y, lr.x, sp.y + patchH);
            snowShade.addColorStop(0, 'rgba(218, 232, 231, 0.82)'); // Cool shadowed snow
            snowShade.addColorStop(0.55, 'rgba(155, 194, 194, 0.58)'); // Muted icy cyan
            snowShade.addColorStop(1, 'rgba(82, 109, 112, 0)');
            ctx.fillStyle = snowShade;

            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y);
            ctx.lineTo(midX, sp.y + patchH * 0.32);
            ctx.lineTo(lr.x * 0.7 + sp.x * 0.3, sp.y + patchH * 0.85);
            ctx.lineTo(sp.x - wSpan * 0.04, sp.y + patchH * 0.65);
            ctx.closePath();
            ctx.fill();
          }

          // Deep jagged geological shadow crevices descending the left face
          ctx.strokeStyle = 'rgba(20, 42, 43, 0.48)';
          ctx.lineWidth = Math.max(1.0, wSpan * 0.005);
          for (let c = 1; c < spineRidge.length - 2; c += 2) {
            const sp = spineRidge[c];
            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y);
            ctx.lineTo(sp.x - wSpan * (0.08 + rand() * 0.09), sp.y + hSpan * 0.16);
            ctx.lineTo(sp.x - wSpan * (0.14 + rand() * 0.12), sp.y + hSpan * 0.34);
            ctx.stroke();
          }

          // 5. Crisp Sunlit Snow Cap & Delicate Warm Rim Along Upper Right Skyline
          const capH = hSpan * (opts.snowCapRatio || 0.34);
          const capGrad = ctx.createLinearGradient(peakX, peakY, peakX, peakY + capH);
          capGrad.addColorStop(0, 'rgba(241, 232, 205, 0.92)');
          capGrad.addColorStop(0.65, 'rgba(231, 232, 220, 0.55)');
          capGrad.addColorStop(1, 'rgba(231, 232, 220, 0)');
          ctx.fillStyle = capGrad;
          ctx.beginPath();
          ctx.moveTo(peakX, peakY);
          for (let i = 1; i <= 4 && i < rightRidge.length; i++) ctx.lineTo(rightRidge[i].x, rightRidge[i].y);
          ctx.lineTo(spineRidge[Math.min(4, spineRidge.length - 1)].x, spineRidge[Math.min(4, spineRidge.length - 1)].y);
          ctx.closePath();
          ctx.fill();

          // Soft atmospheric mist blending the mountain base into distance
          if (opts.hazeAlpha > 0) {
            const hazeG = ctx.createLinearGradient(0, baseY - hSpan * 0.42, 0, baseY);
            hazeG.addColorStop(0, 'rgba(175, 208, 204, 0)');
            hazeG.addColorStop(1, `rgba(175, 208, 204, ${opts.hazeAlpha})`);
            ctx.fillStyle = hazeG;
            ctx.fillRect(leftX - 20, baseY - hSpan * 0.42, wSpan + 40, hSpan * 0.48);
          }

          ctx.restore(); // end mountain clip

          // Subtle crisp warm daylight highlight tracing the sun-facing right ridge
          ctx.strokeStyle = opts.ridgeLight || 'rgba(241, 232, 205, 0.62)';
          ctx.lineWidth = Math.max(0.9, wSpan * 0.004);
          ctx.beginPath();
          ctx.moveTo(peakX, peakY);
          for (let i = 1; i < Math.min(7, rightRidge.length); i++) {
            ctx.lineTo(rightRidge[i].x, rightRidge[i].y);
          }
          ctx.stroke();

          ctx.restore();
        }

        // Draws a tall slender alpine conifer/spruce with irregular drooping branch tiers
        drawAlpineConifer(ctx, x, baseY, height, color, sunlitTipColor, rand) {
          const width = height * (0.21 + rand() * 0.09); // slender alpine spruce silhouette
          const tiers = Math.max(5, Math.floor(height / 5.5));
          const lean = (rand() - 0.5) * width * 0.14;

          ctx.save();
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(x + lean, baseY - height); // crisp slender leader spire

          // Right side irregular drooping boughs
          for (let i = 1; i <= tiers; i++) {
            const t = i / tiers;
            const ty = baseY - height * (1 - t);
            const spread = width * (0.14 + Math.pow(t, 0.92) * 0.94) * (0.76 + rand() * 0.44);
            const inset = spread * (0.34 + rand() * 0.24);
            ctx.lineTo(x + lean * (1 - t) + spread, ty + height * 0.032);
            if (i < tiers) ctx.lineTo(x + lean * (1 - t) + inset, ty + height * 0.008);
          }

          ctx.lineTo(x + width * 0.14, baseY + 6);
          ctx.lineTo(x - width * 0.14, baseY + 6);

          // Left side irregular drooping boughs
          for (let i = tiers; i >= 1; i--) {
            const t = i / tiers;
            const ty = baseY - height * (1 - t);
            const spread = width * (0.14 + Math.pow(t, 0.92) * 0.94) * (0.76 + rand() * 0.44);
            const inset = spread * (0.34 + rand() * 0.24);
            ctx.lineTo(x + lean * (1 - t) - spread, ty + height * 0.032);
            if (i > 1) ctx.lineTo(x + lean * (1 - t) - inset, ty - height * 0.012);
          }

          ctx.closePath();
          ctx.fill();

          // Optional delicate warm daylight grazing the right-facing upper boughs
          if (sunlitTipColor && height > 24) {
            ctx.strokeStyle = sunlitTipColor;
            ctx.lineWidth = Math.max(0.6, height * 0.011);
            ctx.beginPath();
            ctx.moveTo(x + lean, baseY - height);
            ctx.lineTo(x + width * 0.46, baseY - height * 0.45);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Draws a faceted dark slate boulder with weathered top planes & subtle wet base
        drawSlateRock(ctx, cx, cy, rx, ry, submerged, rand) {
          const verts = 7 + Math.floor(rand() * 3);
          const pts = [];
          for (let i = 0; i < verts; i++) {
            const ang = (i / verts) * Math.PI * 2;
            const rScale = 0.78 + rand() * 0.36;
            const yMod = Math.sin(ang) > 0 ? 0.65 : 1.05; // flatter natural resting base
            pts.push({
              x: cx + Math.cos(ang) * rx * rScale,
              y: cy + Math.sin(ang) * ry * rScale * yMod,
            });
          }

          ctx.save();
          // Subtle underwater turquoise shadow for submerged shore stones
          if (submerged) {
            ctx.fillStyle = 'rgba(10, 32, 33, 0.42)';
            ctx.beginPath();
            ctx.ellipse(cx, cy + ry * 0.35, rx * 1.15, ry * 0.52, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Main dark slate stone body
          ctx.beginPath();
          pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
          ctx.closePath();

          const rg = ctx.createLinearGradient(cx + rx * 0.4, cy - ry, cx - rx * 0.5, cy + ry);
          rg.addColorStop(0.0, '#4d6161'); // Soft daylight-lit top slate facet
          rg.addColorStop(0.45, '#2b3d3e'); // Mid charcoal slate
          rg.addColorStop(1.0, '#121f21'); // Deep shadowed stone underside
          ctx.fillStyle = rg;
          ctx.fill();

          // Angular upper-right sunlit geological facet
          ctx.save();
          ctx.clip();
          ctx.fillStyle = 'rgba(195, 206, 198, 0.22)';
          ctx.beginPath();
          ctx.moveTo(cx - rx * 0.2, cy - ry * 1.1);
          ctx.lineTo(cx + rx * 1.1, cy - ry * 0.8);
          ctx.lineTo(cx + rx * 0.8, cy - ry * 0.05);
          ctx.lineTo(cx - rx * 0.15, cy - ry * 0.22);
          ctx.closePath();
          ctx.fill();

          // Wet darkened band near lower water contact
          if (submerged) {
            ctx.fillStyle = 'rgba(12, 38, 40, 0.55)';
            ctx.fillRect(cx - rx * 1.3, cy + ry * 0.08, rx * 2.6, ry * 1.2);
          }
          ctx.restore();

          // Delicate static water contact meniscus line for partially submerged stones
          if (submerged) {
            ctx.strokeStyle = 'rgba(175, 218, 214, 0.34)';
            ctx.lineWidth = Math.max(0.8, rx * 0.045);
            ctx.beginPath();
            ctx.ellipse(cx, cy + ry * 0.22, rx * 1.06, ry * 0.26, 0, 0.12 * Math.PI, 0.88 * Math.PI);
            ctx.stroke();
          }

          ctx.restore();
        }

        // Draws a weathered fallen alpine timber log with bark grain, broken stub & calm water reflection
        drawFallenLog(ctx, x1, y1, x2, y2, thickness1, thickness2, inWater, rand) {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;

          ctx.save();

          // Soft darkened static reflection beneath log if resting over shallow water
          if (inWater) {
            ctx.fillStyle = 'rgba(10, 28, 28, 0.42)';
            ctx.beginPath();
            ctx.moveTo(x1 + nx * thickness1 * 0.2, y1 + thickness1 * 0.75);
            ctx.lineTo(x2 + nx * thickness2 * 0.2, y2 + thickness2 * 0.85);
            ctx.lineTo(x2 - nx * thickness2 * 0.9, y2 + thickness2 * 1.85);
            ctx.lineTo(x1 - nx * thickness1 * 0.9, y1 + thickness1 * 1.75);
            ctx.closePath();
            ctx.fill();
          }

          // Main gently bowed weathered log silhouette
          const midX = (x1 + x2) * 0.5 + nx * (len * 0.018);
          const midY = (y1 + y2) * 0.5 + ny * (len * 0.018);
          const midT = (thickness1 + thickness2) * 0.5;

          ctx.beginPath();
          ctx.moveTo(x1 + nx * thickness1 * 0.5, y1 + ny * thickness1 * 0.5);
          ctx.quadraticCurveTo(midX + nx * midT * 0.5, midY + ny * midT * 0.5, x2 + nx * thickness2 * 0.5, y2 + ny * thickness2 * 0.5);
          ctx.lineTo(x2 - nx * thickness2 * 0.5, y2 - ny * thickness2 * 0.5);
          ctx.quadraticCurveTo(midX - nx * midT * 0.5, midY - ny * midT * 0.5, x1 - nx * thickness1 * 0.5, y1 - ny * thickness1 * 0.5);
          ctx.closePath();

          // Dark desaturated driftwood brown / charcoal timber shading
          const lg = ctx.createLinearGradient(
            midX + nx * midT, midY + ny * midT,
            midX - nx * midT, midY - ny * midT
          );
          lg.addColorStop(0.0, '#625a50'); // Sun-bleached upper weathered wood highlight
          lg.addColorStop(0.32, '#3d362f'); // Desaturated natural timber brown
          lg.addColorStop(0.72, '#24221f'); // Dark bark charcoal
          lg.addColorStop(1.0, '#131817'); // Deep shadowed underside
          ctx.fillStyle = lg;
          ctx.fill();

          // Subtle bark fissures & pale weathered wood grain lines
          ctx.save();
          ctx.clip();
          ctx.strokeStyle = 'rgba(18, 17, 15, 0.55)';
          ctx.lineWidth = Math.max(0.7, midT * 0.08);
          for (let g = -2; g <= 2; g++) {
            const off = g * midT * 0.16;
            ctx.beginPath();
            ctx.moveTo(x1 + nx * off, y1 + ny * off);
            ctx.quadraticCurveTo(midX + nx * (off + (rand() - 0.5) * 2), midY + ny * (off + (rand() - 0.5) * 2), x2 + nx * off * 0.7, y2 + ny * off * 0.7);
            ctx.stroke();
          }
          // Subtle pale sunlit top edge
          ctx.strokeStyle = 'rgba(231, 232, 220, 0.28)';
          ctx.lineWidth = Math.max(0.8, midT * 0.09);
          ctx.beginPath();
          ctx.moveTo(x1 + nx * thickness1 * 0.42, y1 + ny * thickness1 * 0.42);
          ctx.quadraticCurveTo(midX + nx * midT * 0.42, midY + ny * midT * 0.42, x2 + nx * thickness2 * 0.42, y2 + ny * thickness2 * 0.42);
          ctx.stroke();
          ctx.restore();

          // Natural gnarled broken branch stub jutting slightly upward
          const stubT = 0.58;
          const sx = x1 + dx * stubT;
          const sy = y1 + dy * stubT;
          ctx.strokeStyle = '#332d27';
          ctx.lineWidth = Math.max(1.5, midT * 0.26);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + dx * 0.09 + nx * midT * 1.45, sy + dy * 0.09 + ny * midT * 1.45);
          ctx.stroke();

          // Subtle static shoreline meniscus where tip dips into water
          if (inWater) {
            ctx.strokeStyle = 'rgba(175, 220, 215, 0.30)';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(x2 - thickness2 * 1.4, y2 + thickness2 * 0.35);
            ctx.lineTo(x2 + thickness2 * 1.8, y2 + thickness2 * 0.35);
            ctx.stroke();
          }

          ctx.restore();
        }

        build(w, h) {
          this.w = w;
          this.h = h;
          this.staticCanvas.width = w;
          this.staticCanvas.height = h;
          const ctx = this.staticCanvas.getContext('2d');
          const rand = mulberry32(this.seed);
          const isPortrait = h > w * 1.05;

          // Waterline sits at ~52.5% height -> upper sky & mountains above, calm mirror lake (~47.5%) below
          const waterlineY = Math.round(h * 0.525);

          // =========================================================
          // PART A: RENDER COMPLETE UPPER LANDSCAPE TO OFFSCREEN CANVAS
          //         (Enables an exact, unmistakable mirror reflection!)
          // =========================================================
          const upperCanvas = createCanvas();
          upperCanvas.width = w;
          upperCanvas.height = waterlineY;
          const uctx = upperCanvas.getContext('2d');

          // 1. SPACIOUS ALPINE SKY (Soft pale turquoise, muted teal & warm ivory upper-right light)
          const skyGrad = uctx.createLinearGradient(0, 0, 0, waterlineY);
          skyGrad.addColorStop(0.00, '#6c9c9d'); // Calm muted alpine teal zenith
          skyGrad.addColorStop(0.30, '#83B9B6'); // Muted cyan / soft pale turquoise
          skyGrad.addColorStop(0.64, '#b8d4cf'); // Desaturated pale blue-green
          skyGrad.addColorStop(0.88, '#dce4db'); // Soft atmospheric mountain mist
          skyGrad.addColorStop(1.00, '#eae7d8'); // Warm luminous horizon diffusion
          uctx.fillStyle = skyGrad;
          uctx.fillRect(0, 0, w, waterlineY);

          // Gentle warm ivory-white sunlight illumination in the upper-right sky (#F1E8CD)
          const sunGlow = uctx.createRadialGradient(
            w * 0.80, waterlineY * 0.24, 0,
            w * 0.78, waterlineY * 0.26, Math.max(w, waterlineY) * 0.85
          );
          sunGlow.addColorStop(0.00, 'rgba(248, 241, 218, 0.82)');
          sunGlow.addColorStop(0.28, 'rgba(241, 232, 205, 0.52)');
          sunGlow.addColorStop(0.62, 'rgba(231, 232, 220, 0.18)');
          sunGlow.addColorStop(1.00, 'rgba(231, 232, 220, 0)');
          uctx.fillStyle = sunGlow;
          uctx.fillRect(0, 0, w, waterlineY);

          // Distant Soft Static Alpine Clouds with Irregular Natural Silhouettes
          this.drawStillCloud(uctx, w * 0.22, waterlineY * 0.22, w * 0.36, waterlineY * 0.13, 0.62, false, rand);
          this.drawStillCloud(uctx, w * 0.74, waterlineY * 0.18, w * 0.40, waterlineY * 0.14, 0.72, true, rand);
          this.drawStillCloud(uctx, w * 0.52, waterlineY * 0.32, w * 0.30, waterlineY * 0.09, 0.45, true, rand);
          this.drawStillCloud(uctx, w * 0.12, waterlineY * 0.42, w * 0.26, waterlineY * 0.08, 0.42, false, rand);
          this.drawStillCloud(uctx, w * 0.89, waterlineY * 0.38, w * 0.28, waterlineY * 0.09, 0.54, true, rand);

          // 2. MULTI-LAYERED SNOW-CAPPED ALPINE MOUNTAINS
          // Layer 2A: Distant hazy alpine range establishing atmospheric scale
          const farSpan = isPortrait ? 0.44 : 0.36;
          this.drawAlpineMassif(
            uctx,
            w * 0.18, waterlineY * 0.50,
            -w * 0.12, w * (0.18 + farSpan), waterlineY,
            {
              shadowTop: '#76989b', shadowMid: '#638589', shadowBot: '#527377',
              sunTop: '#e7e8dc', sunMid: '#cfe0dc', sunLow: '#9ab7b6', sunBase: '#6f9294',
              hazeAlpha: 0.48, spurs: 3, leftSnow: 3, snowCapRatio: 0.38,
              ridgeLight: 'rgba(241, 232, 205, 0.42)',
            },
            rand
          );
          this.drawAlpineMassif(
            uctx,
            w * 0.84, waterlineY * 0.46,
            w * (0.84 - farSpan), w * 1.15, waterlineY,
            {
              shadowTop: '#6e9093', shadowMid: '#5c7e82', shadowBot: '#4c6d71',
              sunTop: '#f1e8cd', sunMid: '#dde6df', sunLow: '#a2bfbe', sunBase: '#729495',
              hazeAlpha: 0.44, spurs: 3, leftSnow: 3, snowCapRatio: 0.40,
              ridgeLight: 'rgba(241, 232, 205, 0.50)',
            },
            rand
          );

          // Soft atmospheric mist veil between distant mountains & central massif
          const farMist = uctx.createLinearGradient(0, waterlineY * 0.55, 0, waterlineY);
          farMist.addColorStop(0, 'rgba(195, 220, 216, 0)');
          farMist.addColorStop(1, 'rgba(195, 220, 216, 0.38)');
          uctx.fillStyle = farMist;
          uctx.fillRect(0, waterlineY * 0.55, w, waterlineY * 0.45);

          // Layer 2B: Flanking Secondary Jagged Snow-Capped Alpine Peaks (Left & Right)
          this.drawAlpineMassif(
            uctx,
            w * 0.27, waterlineY * 0.40,
            -w * 0.06, w * 0.54, waterlineY,
            {
              shadowTop: '#526D70', shadowMid: '#3a575b', shadowBot: '#274245',
              sunTop: '#E7E8DC', sunMid: '#d4e1dc', sunLow: '#88a8a8', sunBase: '#456467',
              hazeAlpha: 0.26, spurs: 4, leftSnow: 4, snowCapRatio: 0.35, spineOffset: -0.06,
            },
            rand
          );
          this.drawAlpineMassif(
            uctx,
            w * 0.72, waterlineY * 0.38,
            w * 0.46, w * 1.06, waterlineY,
            {
              shadowTop: '#4c686b', shadowMid: '#355256', shadowBot: '#233c3f',
              sunTop: '#F1E8CD', sunMid: '#E7E8DC', sunLow: '#93b2b0', sunBase: '#48686a',
              hazeAlpha: 0.24, spurs: 4, leftSnow: 4, snowCapRatio: 0.38, spineOffset: -0.04,
            },
            rand
          );

          // Layer 2C: DOMINANT CENTRAL JAGGED ALPINE FORMATION (The Hero Massif!)
          // Main asymmetrical towering central peak + dramatic flanking sub-summits
          const mainPeakY = waterlineY * (isPortrait ? 0.27 : 0.22);
          // Left sub-spire of central formation
          this.drawAlpineMassif(
            uctx,
            w * 0.39, waterlineY * 0.44,
            w * 0.16, w * 0.56, waterlineY,
            {
              shadowTop: '#4b6669', shadowMid: '#324d51', shadowBot: '#20373a',
              sunTop: '#E7E8DC', sunMid: '#d5e2dd', sunLow: '#7d9e9f', sunBase: '#3d5a5d',
              hazeAlpha: 0.18, spurs: 4, leftSnow: 4, snowCapRatio: 0.34, spineOffset: -0.05,
            },
            rand
          );
          // Right craggy shoulder peak of central formation
          this.drawAlpineMassif(
            uctx,
            w * 0.61, waterlineY * 0.42,
            w * 0.44, w * 0.84, waterlineY,
            {
              shadowTop: '#486366', shadowMid: '#2e494d', shadowBot: '#1d3437',
              sunTop: '#F1E8CD', sunMid: '#E7E8DC', sunLow: '#88a7a7', sunBase: '#3c595c',
              hazeAlpha: 0.18, spurs: 4, leftSnow: 4, snowCapRatio: 0.38, spineOffset: -0.03,
            },
            rand
          );
          // Towering Dominant Central Jagged Summit
          this.drawAlpineMassif(
            uctx,
            w * 0.505, mainPeakY,
            w * (isPortrait ? 0.14 : 0.22), w * (isPortrait ? 0.86 : 0.78), waterlineY,
            {
              shadowTop: '#4d6a6d', shadowMid: '#314e52', shadowBot: '#1f383b',
              sunTop: '#F1E8CD', sunMid: '#E7E8DC', sunLow: '#8cabaa', sunBase: '#3d5c5e',
              hazeAlpha: 0.16, spurs: 6, leftSnow: 6, snowCapRatio: 0.42,
              roughness: (waterlineY - mainPeakY) * 0.082,
              spineOffset: -0.045,
              ridgeLight: 'rgba(245, 238, 215, 0.82)',
            },
            rand
          );

          // 3. DISTANT TREELINE & DENSE EVERGREEN FORESTS FRAMING BOTH SIDES OF THE LAKE
          // 3A. Distant valley foothills treeline along far shoreline across center
          const farShoreNoise = createNoise1D(911, 256);
          uctx.fillStyle = '#1f3e3b';
          uctx.beginPath();
          uctx.moveTo(0, waterlineY);
          for (let x = 0; x <= w; x += 4) {
            const centerDip = Math.exp(-Math.pow((x / w - 0.5) / 0.26, 2));
            const foothillH = waterlineY * (0.045 + (1 - centerDip) * 0.095) + farShoreNoise.fbm((x / w) * 6, 3) * waterlineY * 0.035;
            uctx.lineTo(x, waterlineY - foothillH);
          }
          uctx.lineTo(w, waterlineY);
          uctx.closePath();
          uctx.fill();

          // Tiny distant conifers dotting the far shoreline treeline
          const farTreeStep = Math.max(4, Math.round(w / 145));
          for (let x = 0; x <= w; x += farTreeStep) {
            const centerDip = Math.exp(-Math.pow((x / w - 0.5) / 0.25, 2));
            const baseElev = waterlineY * (0.032 + (1 - centerDip) * 0.078);
            const th = waterlineY * (0.024 + rand() * 0.034) * (1.15 - centerDip * 0.42);
            this.drawAlpineConifer(uctx, x + (rand() - 0.5) * 3, waterlineY - baseElev + th * 0.35, th, '#1b3834', null, rand);
          }

          // Subtle pale turquoise valley mist hovering gently at the foot of the distant treeline
          const shoreMist = uctx.createLinearGradient(0, waterlineY - waterlineY * 0.14, 0, waterlineY);
          shoreMist.addColorStop(0, 'rgba(182, 216, 212, 0)');
          shoreMist.addColorStop(1, 'rgba(182, 216, 212, 0.22)');
          uctx.fillStyle = shoreMist;
          uctx.fillRect(0, waterlineY - waterlineY * 0.14, w, waterlineY * 0.14);

          // 3B. Left & Right Midground Forested Headlands / Peninsulas framing the central lake view
          const drawForestedHeadland = (isLeft) => {
            const edgeX = isLeft ? 0 : w;
            const tipX = isLeft ? w * (isPortrait ? 0.35 : 0.32) : w * (isPortrait ? 0.65 : 0.68);
            const bankH = waterlineY * 0.14;

            // Dark pine headland terrain bank
            uctx.fillStyle = '#142F2B';
            uctx.beginPath();
            uctx.moveTo(edgeX, waterlineY);
            uctx.lineTo(edgeX, waterlineY - bankH);
            uctx.quadraticCurveTo(isLeft ? tipX * 0.55 : w - (w - tipX) * 0.55, waterlineY - bankH * 0.65, tipX, waterlineY);
            uctx.closePath();
            uctx.fill();

            // Dense multi-layered slender pine trees (deep forest green, charcoal green & dark teal)
            const startX = isLeft ? -12 : tipX;
            const endX = isLeft ? tipX : w + 12;
            const step = Math.max(5, Math.round(w / 95));
            const colors = ['#142F2B', '#172D29', '#1c3834', '#102421'];

            for (let x = startX; x <= endX; x += step) {
              const jx = x + (rand() - 0.5) * step * 0.8;
              const edgeFrac = isLeft
                ? Math.max(0, 1 - jx / Math.max(1, tipX))
                : Math.max(0, (jx - tipX) / Math.max(1, w - tipX));
              const slopeY = waterlineY - Math.pow(edgeFrac, 1.15) * bankH * 0.62;
              const baseH = waterlineY * (0.075 + Math.pow(edgeFrac, 0.82) * 0.26);
              const treeH = baseH * (0.68 + rand() * 0.58);
              const col = colors[Math.floor(rand() * colors.length)];
              const sunRim = isLeft && rand() < 0.32 ? 'rgba(241, 232, 205, 0.14)' : null;
              this.drawAlpineConifer(uctx, jx, slopeY + treeH * 0.14, treeH, col, sunRim, rand);
            }

            // Isolated taller sentinel pine trees rising organically above the canopy
            const sentinels = isLeft
              ? [0.04, 0.11, 0.18, 0.24]
              : [0.76, 0.83, 0.90, 0.96];
            for (const sx of sentinels) {
              const px = sx * w;
              const ef = isLeft ? 1 - sx / 0.35 : (sx - 0.65) / 0.35;
              const th = waterlineY * (0.20 + Math.max(0, ef) * 0.28 + rand() * 0.08);
              const sy = waterlineY - Math.max(0, ef) * bankH * 0.45;
              this.drawAlpineConifer(
                uctx,
                px,
                sy + th * 0.1,
                th,
                '#112623',
                isLeft ? 'rgba(241, 232, 205, 0.18)' : 'rgba(131, 185, 182, 0.12)',
                rand
              );
            }
          };

          drawForestedHeadland(true);
          drawForestedHeadland(false);

          // =========================================================
          // PART B: COMPOSITE UPPER LANDSCAPE + MIRROR TURQUOISE LAKE
          // =========================================================
          ctx.drawImage(upperCanvas, 0, 0);

          const lakeH = h - waterlineY;

          // 4. RICH TURQUOISE ALPINE LAKE BASE (#318F91 -> #285F61 -> deep foreground blue-green)
          const waterBase = ctx.createLinearGradient(0, waterlineY, 0, h);
          waterBase.addColorStop(0.00, '#6db5b2'); // Lighter luminous turquoise near distant shore
          waterBase.addColorStop(0.22, '#318F91'); // Rich glacial turquoise water
          waterBase.addColorStop(0.55, '#285F61'); // Deep alpine teal
          waterBase.addColorStop(0.84, '#163b3b'); // Dark blue-green approaching foreground
          waterBase.addColorStop(1.00, '#0d2525'); // Deep still foreground shadow
          ctx.fillStyle = waterBase;
          ctx.fillRect(0, waterlineY, w, lakeH);

          // 5. PERFECT INVERTED MOUNTAIN, FOREST & SKY REFLECTION
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, waterlineY, w, lakeH);
          ctx.clip();

          // Exact vertical mirror flip of the upper landscape
          ctx.save();
          ctx.translate(0, waterlineY * 2);
          ctx.scale(1, -1);
          ctx.globalAlpha = 0.78;
          ctx.drawImage(upperCanvas, 0, 0);
          ctx.restore();

          // Glacial turquoise optical depth tint layered gently over the inverted reflection
          // (Preserves crystal-clear symmetry of snow peaks & forests while tinting them naturally turquoise)
          const tintGrad = ctx.createLinearGradient(0, waterlineY, 0, h);
          tintGrad.addColorStop(0.00, 'rgba(131, 185, 182, 0.16)');
          tintGrad.addColorStop(0.28, 'rgba(49, 143, 145, 0.28)');
          tintGrad.addColorStop(0.64, 'rgba(40, 95, 97, 0.42)');
          tintGrad.addColorStop(1.00, 'rgba(16, 44, 43, 0.68)');
          ctx.fillStyle = tintGrad;
          ctx.fillRect(0, waterlineY, w, lakeH);

          // Soft static horizontal glass-like stratification lines (ultra-subtle calm water texture, 0 motion)
          for (let i = 0; i < 42; i++) {
            const frac = Math.pow(rand(), 1.35);
            const ly = waterlineY + 2 + frac * (lakeH - 6);
            const bandH = 0.7 + frac * 1.8;
            const lx = rand() * w * 0.7;
            const lw = w * (0.16 + rand() * 0.45);
            ctx.fillStyle = rand() > 0.45
              ? `rgba(218, 236, 232, ${0.035 + (1 - frac) * 0.055})`
              : `rgba(20, 58, 60, ${0.04 + frac * 0.06})`;
            ctx.fillRect(lx, ly, lw, bandH);
          }

          // Crisp yet subtle horizontal waterline separation where land meets still glass water
          const lineGrad = ctx.createLinearGradient(0, waterlineY - 1, 0, waterlineY + 3);
          lineGrad.addColorStop(0, 'rgba(18, 44, 42, 0.55)');
          lineGrad.addColorStop(0.45, 'rgba(224, 240, 235, 0.52)');
          lineGrad.addColorStop(1, 'rgba(49, 143, 145, 0)');
          ctx.fillStyle = lineGrad;
          ctx.fillRect(0, waterlineY - 1, w, 4);

          ctx.restore(); // end lake clip

          // =========================================================
          // PART C: FOREGROUND ROCKY SHORELINE, SUBMERGED STONES,
          //         FALLEN LOGS, SHRUBS & FRAMING SILHOUETTES
          // =========================================================

          // 6A. Partially Submerged Calm Shallow Stones sitting just off the shoreline
          const submergedStones = [
            { x: 0.16, y: 0.87, rx: 0.042, ry: 0.017 },
            { x: 0.25, y: 0.90, rx: 0.028, ry: 0.012 },
            { x: 0.34, y: 0.92, rx: 0.024, ry: 0.010 },
            { x: 0.68, y: 0.91, rx: 0.030, ry: 0.013 },
            { x: 0.79, y: 0.88, rx: 0.046, ry: 0.018 },
            { x: 0.87, y: 0.85, rx: 0.034, ry: 0.014 },
          ];
          for (const st of submergedStones) {
            this.drawSlateRock(ctx, st.x * w, st.y * h, st.rx * w, st.ry * h, true, rand);
          }

          // 6B. Natural Rocky Shoreline Bank curving along bottom & lower sides
          const shoreNoise = createNoise1D(641, 256);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(0, h);
          ctx.lineTo(0, h * 0.84);
          for (let x = 0; x <= w; x += 6) {
            const nx = x / w;
            // Deeper rocky coves on left & right corners, gentle low shore across center
            const bowl = Math.pow(Math.abs(nx - 0.5) * 2, 2.2) * h * 0.085;
            const n = shoreNoise.fbm(nx * 5.2, 3) * h * 0.028;
            const sy = h * 0.955 - bowl - n;
            ctx.lineTo(x, sy);
          }
          ctx.lineTo(w, h * 0.83);
          ctx.lineTo(w, h);
          ctx.closePath();

          const shoreGrad = ctx.createLinearGradient(0, h * 0.82, 0, h);
          shoreGrad.addColorStop(0.0, '#1e3232');
          shoreGrad.addColorStop(0.45, '#162626');
          shoreGrad.addColorStop(1.0, '#0c1616');
          ctx.fillStyle = shoreGrad;
          ctx.fill();
          ctx.restore();

          // Irregular Dark Slate Boulders & Stone Formations lining the foreground shore
          const shoreRocks = [
            { x: 0.03, y: 0.87, rx: 0.075, ry: 0.032 },
            { x: 0.11, y: 0.92, rx: 0.068, ry: 0.026 },
            { x: 0.21, y: 0.95, rx: 0.058, ry: 0.022 },
            { x: 0.31, y: 0.97, rx: 0.050, ry: 0.018 },
            { x: 0.44, y: 0.985, rx: 0.062, ry: 0.019 },
            { x: 0.57, y: 0.98, rx: 0.055, ry: 0.018 },
            { x: 0.69, y: 0.96, rx: 0.064, ry: 0.022 },
            { x: 0.81, y: 0.93, rx: 0.072, ry: 0.027 },
            { x: 0.92, y: 0.89, rx: 0.085, ry: 0.034 },
            { x: 0.98, y: 0.84, rx: 0.070, ry: 0.032 },
          ];
          for (const rk of shoreRocks) {
            this.drawSlateRock(ctx, rk.x * w, rk.y * h, rk.rx * w, rk.ry * h, false, rand);
          }

          // Small Scattered Shoreline Pebbles
          for (let p = 0; p < 55; p++) {
            const px = rand() * w;
            const bowl = Math.pow(Math.abs(px / w - 0.5) * 2, 2.1) * h * 0.08;
            const py = h * 0.945 - bowl + rand() * (h * 0.055 + bowl * 0.4);
            const prx = 1.8 + rand() * (w * 0.012);
            const pry = prx * (0.42 + rand() * 0.28);
            ctx.fillStyle = rand() > 0.5 ? '#354849' : '#213031';
            ctx.beginPath();
            ctx.ellipse(px, py, prx, pry, (rand() - 0.5) * 0.35, 0, Math.PI * 2);
            ctx.fill();
          }

          // 6C. Naturally Shaped Weathered Fallen Logs resting near the bottom foreground shore
          // Left weathered driftwood log angling gracefully into the calm shallows
          this.drawFallenLog(
            ctx,
            w * 0.02, h * 0.945,
            w * 0.31, h * 0.905,
            Math.max(8, h * 0.016), Math.max(4, h * 0.008),
            true,
            rand
          );
          // Smaller resting timber log tucked along the bottom-right rocky bank
          this.drawFallenLog(
            ctx,
            w * 0.96, h * 0.935,
            w * 0.72, h * 0.955,
            Math.max(9, h * 0.017), Math.max(4.5, h * 0.009),
            true,
            rand
          );
          // Secondary dark weathered branch resting on bottom-left rocks
          this.drawFallenLog(
            ctx,
            w * 0.07, h * 0.985,
            w * 0.24, h * 0.968,
            Math.max(6, h * 0.011), Math.max(3, h * 0.006),
            false,
            rand
          );

          // 6D. Subtle Lakeside Shrubs, Alpine Grasses & Extreme-Edge Foreground Framing Conifers
          const shrubClusters = [0.05, 0.13, 0.86, 0.94];
          for (const sx of shrubClusters) {
            const cx = sx * w;
            const bowl = Math.pow(Math.abs(sx - 0.5) * 2, 2.0) * h * 0.08;
            const cy = h * 0.93 - bowl;
            for (let b = 0; b < 6; b++) {
              ctx.fillStyle = b % 2 === 0 ? '#142F2B' : '#1b3a34';
              ctx.beginPath();
              ctx.arc(cx + (b - 2.5) * (w * 0.016), cy + (rand() - 0.5) * h * 0.016, w * (0.014 + rand() * 0.014), 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Delicate static alpine sedge blades near shoreline stones
          ctx.strokeStyle = '#193530';
          ctx.lineWidth = Math.max(0.9, w * 0.0022);
          ctx.lineCap = 'round';
          for (let g = 0; g < 36; g++) {
            const side = g % 2 === 0 ? rand() * 0.24 : 0.76 + rand() * 0.24;
            const gx = side * w;
            const bowl = Math.pow(Math.abs(side - 0.5) * 2, 2.0) * h * 0.08;
            const gy = h * 0.94 - bowl + rand() * h * 0.03;
            const gh = h * (0.018 + rand() * 0.025);
            const lean = (rand() - 0.5) * gh * 0.65;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.quadraticCurveTo(gx + lean * 0.4, gy - gh * 0.55, gx + lean, gy - gh);
            ctx.stroke();
          }

          // Foreground dark individual pine silhouettes framing extreme left & right corners
          this.drawAlpineConifer(ctx, -w * 0.01, h * 0.88, h * 0.36, '#0b1d1b', null, rand);
          this.drawAlpineConifer(ctx, w * 0.045, h * 0.90, h * 0.24, '#0f2421', null, rand);
          this.drawAlpineConifer(ctx, w * 1.01, h * 0.87, h * 0.38, '#0b1d1b', null, rand);
          this.drawAlpineConifer(ctx, w * 0.955, h * 0.89, h * 0.26, '#0f2421', null, rand);
        }

        // Completely STATIC render: ignores time & motion flags so the sanctuary remains perfectly still
        render(ctx, w, h) {
          if (this.w !== w || this.h !== h) this.build(w, h);
          ctx.drawImage(this.staticCanvas, 0, 0);
        }
      }

      /* ---------------------------------------------------------
         4D. THEME ENGINE 6: NEON TROPICAL GEOMETRY
             Pink Neon Hexagon – Futuristic Botanical Sanctuary
             100% STATIC procedural composition recreating the
             glowing pink hexagonal tube, fenestrated Monstera leaves,
             delicate palm/fern fronds, and glossy 3D magenta spheres.
         --------------------------------------------------------- */
      class NeonTropicalGeometryRenderer {
        constructor(seed = 9419) {
          this.seed = seed;
          this.w = 0;
          this.h = 0;
          this.staticCanvas = createCanvas();
        }

        // Helper: Computes the 6 vertices of a geometrically regular pointy-top hexagon
        getHexagonVertices(cx, cy, radius) {
          const verts = [];
          for (let i = 0; i < 6; i++) {
            const ang = -Math.PI / 2 + (i * Math.PI) / 3;
            verts.push({
              x: cx + Math.cos(ang) * radius,
              y: cy + Math.sin(ang) * radius,
            });
          }
          return verts;
        }

        // Helper: Traces a closed hexagon path
        traceHexagon(ctx, verts) {
          ctx.beginPath();
          ctx.moveTo(verts[0].x, verts[0].y);
          for (let i = 1; i < verts.length; i++) {
            ctx.lineTo(verts[i].x, verts[i].y);
          }
          ctx.closePath();
        }

        // Draws a dimensional glossy 3D floating sphere with deep black-purple shadow
        // and luminous pink/magenta crescent rim illumination
        drawGlossySphere(ctx, cx, cy, r, lightAngle, opts = {}) {
          if (r < 1) return;
          const intensity = opts.intensity !== undefined ? opts.intensity : 1.0;
          const lx = Math.cos(lightAngle);
          const ly = Math.sin(lightAngle);

          ctx.save();

          // 1. Subtle soft ambient drop shadow on dark plum surface
          const drop = ctx.createRadialGradient(
            cx - lx * r * 0.25, cy - ly * r * 0.25, r * 0.4,
            cx - lx * r * 0.25, cy - ly * r * 0.25, r * 1.45
          );
          drop.addColorStop(0, 'rgba(4, 1, 5, 0.72)');
          drop.addColorStop(1, 'rgba(4, 1, 5, 0)');
          ctx.fillStyle = drop;
          ctx.beginPath();
          ctx.arc(cx - lx * r * 0.18, cy - ly * r * 0.18, r * 1.4, 0, Math.PI * 2);
          ctx.fill();

          // 2. Main 3D Sphere Body clipped cleanly
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.closePath();
          ctx.save();
          ctx.clip();

          // Base almost-black plum shadow core
          ctx.fillStyle = '#070208';
          ctx.fillRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);

          // Primary smooth spherical lighting gradient from lit edge toward deep shadow pole
          const g = ctx.createRadialGradient(
            cx + lx * r * 0.78, cy + ly * r * 0.78, r * 0.04,
            cx + lx * r * 0.22, cy + ly * r * 0.22, r * 1.52
          );
          if (intensity >= 0.85) {
            g.addColorStop(0.00, '#fff2fc'); // Incandescent specular white-pink edge
            g.addColorStop(0.14, '#ffb2ee'); // Pale neon pink
            g.addColorStop(0.32, '#ef25b8'); // Vivid electric magenta
            g.addColorStop(0.56, '#761465'); // Rich deep plum-magenta midtone
            g.addColorStop(0.80, '#240826'); // Deep purple terminator
            g.addColorStop(1.00, '#060108'); // Black-purple shadow pole
          } else {
            g.addColorStop(0.00, `rgba(255, 168, 232, ${0.85 * intensity + 0.15})`);
            g.addColorStop(0.20, `rgba(218, 28, 162, ${0.85 * intensity + 0.1})`);
            g.addColorStop(0.50, '#5a1252');
            g.addColorStop(0.78, '#1d0720');
            g.addColorStop(1.00, '#050107');
          }
          ctx.fillStyle = g;
          ctx.fillRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);

          // Crisp glossy Fresnel rim illumination hugging the lit circumference
          const rimGrad = ctx.createRadialGradient(
            cx - lx * r * 0.16, cy - ly * r * 0.16, r * 0.72,
            cx, cy, r * 1.03
          );
          rimGrad.addColorStop(0.00, 'rgba(255, 37, 200, 0)');
          rimGrad.addColorStop(0.68, `rgba(255, 65, 208, ${0.22 * intensity})`);
          rimGrad.addColorStop(0.92, `rgba(255, 206, 245, ${0.78 * intensity})`);
          rimGrad.addColorStop(1.00, `rgba(255, 242, 252, ${0.92 * intensity})`);
          ctx.fillStyle = rimGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          // Darken opposite shadow hemisphere softly so crescent rim never bleeds around the back
          const shadowMask = ctx.createRadialGradient(
            cx - lx * r * 0.72, cy - ly * r * 0.72, r * 0.18,
            cx - lx * r * 0.42, cy - ly * r * 0.42, r * 1.18
          );
          shadowMask.addColorStop(0.0, 'rgba(5, 1, 7, 0.94)');
          shadowMask.addColorStop(0.52, 'rgba(9, 2, 12, 0.56)');
          shadowMask.addColorStop(1.0, 'rgba(9, 2, 12, 0)');
          ctx.fillStyle = shadowMask;
          ctx.fillRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);

          // Subtle glossy curved surface specular sheen
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const specX = cx + lx * r * 0.48;
          const specY = cy + ly * r * 0.48;
          const spec = ctx.createRadialGradient(specX, specY, 0, specX, specY, r * 0.55);
          spec.addColorStop(0, `rgba(255, 232, 250, ${0.42 * intensity})`);
          spec.addColorStop(0.45, `rgba(255, 72, 212, ${0.14 * intensity})`);
          spec.addColorStop(1, 'rgba(255, 37, 200, 0)');
          ctx.fillStyle = spec;
          ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
          ctx.restore();

          ctx.restore(); // end sphere clip

          // Delicate outer neon pink glow aura on strongly illuminated spheres
          if (intensity > 0.75) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = `rgba(255, 130, 228, ${0.42 * intensity})`;
            ctx.lineWidth = Math.max(1.0, r * 0.032);
            ctx.beginPath();
            ctx.arc(cx, cy, r - 0.5, lightAngle - 1.05, lightAngle + 1.05);
            ctx.stroke();
            ctx.restore();
          }

          ctx.restore();
        }

        // Draws an intricate sculptural tropical Monstera leaf using an offscreen scratch canvas
        // so deep fenestration splits and natural interior perforations cut cleanly through the blade
        drawMonsteraLeaf(ctx, opts) {
          const { x, y, size, rotation, lightLocalAngle, lightStrength = 0.95, flipX = 1, seed = 101 } = opts;
          const rand = mulberry32(seed);
          const pad = Math.ceil(size * 0.25);
          const dim = Math.ceil(size * 2.2 + pad * 2);
          const ox = dim * 0.5;
          const oy = dim * 0.54;

          const leafCanvas = createCanvas();
          leafCanvas.width = dim;
          leafCanvas.height = dim;
          const lctx = leafCanvas.getContext('2d');

          const len = size; // half-height from center to tip/base
          const wid = size * 0.86; // broad cordate Monstera silhouette

          lctx.save();
          lctx.translate(ox, oy);
          lctx.scale(flipX, 1);

          // 1. Heart-shaped organic Monstera blade contour (base at bottom +len*0.82, pointed tip at top -len*1.02)
          lctx.beginPath();
          lctx.moveTo(0, -len * 1.02); // Acuminate tip
          // Right gently undulating broad margin down to heart lobe
          lctx.bezierCurveTo(wid * 0.34, -len * 0.92, wid * 0.78, -len * 0.54, wid * 0.96, -len * 0.06);
          lctx.bezierCurveTo(wid * 1.06, len * 0.44, wid * 0.76, len * 0.92, wid * 0.34, len * 0.92);
          // Deep cordate basal sinus
          lctx.bezierCurveTo(wid * 0.14, len * 0.92, wid * 0.06, len * 0.76, 0, len * 0.62);
          // Left cordate lobe sweeping back to tip
          lctx.bezierCurveTo(-wid * 0.06, len * 0.76, -wid * 0.14, len * 0.92, -wid * 0.34, len * 0.92);
          lctx.bezierCurveTo(-wid * 0.76, len * 0.92, -wid * 1.06, len * 0.44, -wid * 0.96, -len * 0.06);
          lctx.bezierCurveTo(-wid * 0.78, -len * 0.54, -wid * 0.34, -len * 0.92, 0, -len * 1.02);
          lctx.closePath();

          // Base dark botanical shading (charcoal green, graphite blue-grey, muted violet)
          const lx = Math.cos(lightLocalAngle) * flipX;
          const ly = Math.sin(lightLocalAngle);
          const baseGrad = lctx.createLinearGradient(
            lx * wid * 0.95, ly * len * 0.95,
            -lx * wid * 0.95, -ly * len * 0.95
          );
          baseGrad.addColorStop(0.00, lightStrength > 0.7 ? '#c23ea8' : '#6c2c6d'); // Neon-bathed magenta/violet side
          baseGrad.addColorStop(0.24, '#493052'); // Muted violet midtone
          baseGrad.addColorStop(0.52, '#293448'); // Graphite blue-grey
          baseGrad.addColorStop(0.78, '#172522'); // Dark botanical charcoal green
          baseGrad.addColorStop(1.00, '#090e10'); // Deep shadow leaf edge
          lctx.fillStyle = baseGrad;
          lctx.fill();

          // Clip sculptural shading, midrib & veins strictly inside the blade
          lctx.save();
          lctx.clip();

          // Soft dimensional leaf-cup curvature shading (subtle 3D pillowing between ribs)
          const cupGrad = lctx.createRadialGradient(lx * wid * 0.45, ly * len * 0.45, wid * 0.08, 0, 0, wid * 1.35);
          cupGrad.addColorStop(0.0, `rgba(255, 138, 228, ${0.42 * lightStrength})`);
          cupGrad.addColorStop(0.35, `rgba(170, 62, 165, ${0.22 * lightStrength})`);
          cupGrad.addColorStop(0.75, 'rgba(18, 26, 36, 0.25)');
          cupGrad.addColorStop(1.0, 'rgba(6, 5, 10, 0.65)');
          lctx.fillStyle = cupGrad;
          lctx.fillRect(-wid * 1.2, -len * 1.2, wid * 2.4, len * 2.4);

          // Central Midrib (tapered dimensional botanical spine)
          lctx.strokeStyle = 'rgba(10, 14, 18, 0.72)';
          lctx.lineWidth = Math.max(2.2, size * 0.036);
          lctx.lineCap = 'round';
          lctx.beginPath();
          lctx.moveTo(0, len * 0.68);
          lctx.quadraticCurveTo(wid * 0.02, -len * 0.1, 0, -len * 0.96);
          lctx.stroke();

          // Subtle lavender/pink highlight ridge along one side of the midrib
          lctx.strokeStyle = `rgba(235, 165, 228, ${0.30 * lightStrength})`;
          lctx.lineWidth = Math.max(0.9, size * 0.013);
          lctx.beginPath();
          lctx.moveTo(lx * 1.4, len * 0.64);
          lctx.quadraticCurveTo(wid * 0.02 + lx * 1.2, -len * 0.1, lx * 0.6, -len * 0.92);
          lctx.stroke();

          // Curved Secondary Botanical Veins radiating outward into every lobe
          const veinLevels = [-0.62, -0.34, -0.05, 0.24, 0.52, 0.74];
          for (const side of [-1, 1]) {
            for (let i = 0; i < veinLevels.length; i++) {
              const vy = veinLevels[i] * len;
              const vSpan = wid * (0.55 + Math.sin(((i + 0.8) / veinLevels.length) * Math.PI) * 0.45);
              const tipY = vy - len * (0.24 - i * 0.055);
              // Dark vein groove
              lctx.strokeStyle = 'rgba(8, 12, 18, 0.55)';
              lctx.lineWidth = Math.max(1.1, size * 0.018);
              lctx.beginPath();
              lctx.moveTo(0, vy);
              lctx.quadraticCurveTo(side * vSpan * 0.52, vy - len * 0.08, side * vSpan, tipY);
              lctx.stroke();
              // Fine pale lavender specular vein ridge
              lctx.strokeStyle = `rgba(220, 162, 226, ${0.22 * lightStrength})`;
              lctx.lineWidth = Math.max(0.6, size * 0.008);
              lctx.beginPath();
              lctx.moveTo(0, vy - 1.2);
              lctx.quadraticCurveTo(side * vSpan * 0.52, vy - len * 0.08 - 1.2, side * vSpan * 0.92, tipY - 1.0);
              lctx.stroke();
            }
          }

          lctx.restore(); // end blade clip

          // 2. CARVE CHARACTERISTIC MONSTERA DEEP SPLITS & OVAL PERFORATIONS (destination-out)
          lctx.save();
          lctx.globalCompositeOperation = 'destination-out';
          lctx.fillStyle = '#000000';

          // Deep curved finger-like splits cutting inward from both margins between the veins
          const splitSpecs = [
            { side: 1, yOuter: -0.58, yInner: -0.44, depth: 0.22, w: 0.072 },
            { side: 1, yOuter: -0.26, yInner: -0.14, depth: 0.24, w: 0.088 },
            { side: 1, yOuter: 0.08, yInner: 0.14, depth: 0.25, w: 0.092 },
            { side: 1, yOuter: 0.42, yInner: 0.40, depth: 0.28, w: 0.085 },
            { side: 1, yOuter: 0.72, yInner: 0.62, depth: 0.36, w: 0.070 },

            { side: -1, yOuter: -0.50, yInner: -0.38, depth: 0.24, w: 0.072 },
            { side: -1, yOuter: -0.18, yInner: -0.07, depth: 0.23, w: 0.086 },
            { side: -1, yOuter: 0.16, yInner: 0.20, depth: 0.25, w: 0.090 },
            { side: -1, yOuter: 0.48, yInner: 0.45, depth: 0.29, w: 0.084 },
            { side: -1, yOuter: 0.74, yInner: 0.65, depth: 0.38, w: 0.068 },
          ];

          for (const sp of splitSpecs) {
            const s = sp.side;
            const jitter = (rand() - 0.5) * 0.03;
            const xOuter = s * wid * 1.18;
            const yOuter = (sp.yOuter + jitter) * len;
            const xInner = s * wid * (sp.depth + (rand() - 0.5) * 0.04);
            const yInner = (sp.yInner + jitter) * len;
            const sw = size * sp.w;

            lctx.beginPath();
            lctx.moveTo(xOuter, yOuter - sw * 0.75);
            lctx.quadraticCurveTo((xOuter + xInner) * 0.52, (yOuter + yInner) * 0.5 - sw * 0.45, xInner, yInner - sw * 0.22);
            // Smooth rounded teardrop inner end of Monstera fenestration
            lctx.arc(xInner, yInner, sw * 0.28, -Math.PI * 0.5, Math.PI * 0.5, s > 0);
            lctx.quadraticCurveTo((xOuter + xInner) * 0.52, (yOuter + yInner) * 0.5 + sw * 0.45, xOuter, yOuter + sw * 0.75);
            lctx.closePath();
            lctx.fill();
          }

          // Natural oval interior perforations (classic Monstera deliciosa holes near the midrib)
          const holes = [
            { x: 0.16, y: -0.26, rx: 0.065, ry: 0.034, rot: -0.45 },
            { x: 0.19, y: 0.02, rx: 0.075, ry: 0.038, rot: -0.18 },
            { x: 0.20, y: 0.30, rx: 0.068, ry: 0.034, rot: 0.16 },
            { x: -0.17, y: -0.18, rx: 0.066, ry: 0.035, rot: 0.42 },
            { x: -0.19, y: 0.12, rx: 0.074, ry: 0.038, rot: 0.12 },
            { x: -0.20, y: 0.38, rx: 0.062, ry: 0.032, rot: -0.18 },
          ];
          for (const hl of holes) {
            lctx.save();
            lctx.translate(hl.x * wid, hl.y * len);
            lctx.rotate(hl.rot);
            lctx.beginPath();
            lctx.ellipse(0, 0, hl.rx * wid, hl.ry * len, 0, 0, Math.PI * 2);
            lctx.fill();
            lctx.restore();
          }
          lctx.restore(); // end destination-out

          // 3. Soft Neon Magenta Rim Illumination painted across the lit side of the fenestrated blade
          lctx.save();
          lctx.globalCompositeOperation = 'source-atop';
          const neonSpill = lctx.createRadialGradient(
            lx * wid * 0.92, ly * len * 0.92, wid * 0.05,
            lx * wid * 0.55, ly * len * 0.55, wid * 1.15
          );
          neonSpill.addColorStop(0.00, `rgba(255, 198, 245, ${0.78 * lightStrength})`);
          neonSpill.addColorStop(0.28, `rgba(255, 48, 206, ${0.56 * lightStrength})`);
          neonSpill.addColorStop(0.62, `rgba(142, 34, 138, ${0.24 * lightStrength})`);
          neonSpill.addColorStop(1.00, 'rgba(30, 10, 35, 0)');
          lctx.fillStyle = neonSpill;
          lctx.fillRect(-wid * 1.2, -len * 1.2, wid * 2.4, len * 2.4);
          lctx.restore();

          // Dark botanical petiole stem extending from cordate base
          lctx.strokeStyle = '#12181c';
          lctx.lineWidth = Math.max(2.5, size * 0.042);
          lctx.lineCap = 'round';
          lctx.beginPath();
          lctx.moveTo(0, len * 0.64);
          lctx.quadraticCurveTo(wid * 0.05, len * 0.92, wid * 0.08, len * 1.15);
          lctx.stroke();

          lctx.restore();

          // Composite finished sculptural Monstera leaf onto main scene with soft depth shadow
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotation);
          ctx.shadowColor = 'rgba(4, 1, 6, 0.72)';
          ctx.shadowBlur = Math.max(8, size * 0.14);
          ctx.drawImage(leafCanvas, -ox, -oy);
          ctx.restore();
        }

        // Draws a delicate sweeping tropical palm/fern frond with long curved rachis,
        // fine tapered leaflets & localized neon pink illumination where leaflets approach the hexagon
        drawTropicalFernFrond(ctx, opts) {
          const {
            x0, y0, cx, cy, x1, y1,
            maxLeafletLen, leafletCount = 30,
            glowX, glowY, glowRadius, glowStrength = 1.0,
            seed = 303,
          } = opts;
          const rand = mulberry32(seed);

          // Helper for quadratic Bezier point & tangent
          const qPt = (t) => {
            const mt = 1 - t;
            return {
              x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
              y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
            };
          };
          const qTan = (t) => {
            const tx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
            const ty = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
            const d = Math.hypot(tx, ty) || 1;
            return { x: tx / d, y: ty / d };
          };

          ctx.save();

          // 1. Curved Central Stem (Rachis)
          const stemGrad = ctx.createLinearGradient(x0, y0, x1, y1);
          stemGrad.addColorStop(0.0, '#0d131a');
          stemGrad.addColorStop(0.55, '#243045');
          stemGrad.addColorStop(1.0, glowStrength > 0.5 ? '#c43ca8' : '#2e3650');
          ctx.strokeStyle = stemGrad;
          ctx.lineWidth = Math.max(1.4, maxLeafletLen * 0.032);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(cx, cy, x1, y1);
          ctx.stroke();

          // 2. Pairs of Slender Pointed Leaflets (Pinnae) branching organically along both sides
          for (let i = 2; i < leafletCount; i++) {
            const t = i / leafletCount;
            const p = qPt(t);
            const tan = qTan(t);
            // Smooth botanical length envelope (shorter at base & tip, lush in middle)
            const env = Math.sin(Math.pow(t, 0.85) * Math.PI);

            for (const side of [-1, 1]) {
              const jitterLen = 0.82 + rand() * 0.34;
              const lLen = maxLeafletLen * (0.28 + env * 0.85) * jitterLen;
              const lWid = Math.max(1.8, lLen * (0.075 + rand() * 0.025));

              // Branch angle sweeping gently forward along the frond + subtle outward droop
              const baseAngle = Math.atan2(tan.y, tan.x) + side * (0.92 - t * 0.42 + (rand() - 0.5) * 0.08);
              const tipAngle = baseAngle + side * (0.14 + rand() * 0.12);

              const midX = p.x + Math.cos(baseAngle) * lLen * 0.55;
              const midY = p.y + Math.sin(baseAngle) * lLen * 0.55;
              const tipX = p.x + Math.cos(tipAngle) * lLen;
              const tipY = p.y + Math.sin(tipAngle) * lLen;

              // Perpendicular for slender pointed leaflet width
              const nx = -Math.sin(baseAngle);
              const ny = Math.cos(baseAngle);

              // Compute distance from leaflet tip/mid to neon glow focus for realistic local pink spill
              const distGlow = Math.hypot(tipX - glowX, tipY - glowY);
              const prox = Math.max(0, 1 - distGlow / Math.max(1, glowRadius)) * glowStrength;

              const lg = ctx.createLinearGradient(p.x, p.y, tipX, tipY);
              if (prox > 0.12) {
                lg.addColorStop(0.0, '#141c29');
                lg.addColorStop(0.45, prox > 0.5 ? '#6b286c' : '#293448');
                lg.addColorStop(0.82, `rgba(240, 40, 185, ${Math.min(0.95, 0.35 + prox * 0.72)})`);
                lg.addColorStop(1.0, `rgba(255, 190, 242, ${Math.min(1.0, prox * 1.15)})`);
              } else {
                lg.addColorStop(0.0, '#0a0f16');
                lg.addColorStop(0.55, '#1b2434');
                lg.addColorStop(1.0, '#293448');
              }

              ctx.fillStyle = lg;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.quadraticCurveTo(midX + nx * lWid, midY + ny * lWid, tipX, tipY);
              ctx.quadraticCurveTo(midX - nx * lWid, midY - ny * lWid, p.x, p.y);
              ctx.closePath();
              ctx.fill();

              // Crisp neon pink edge highlight on leaflets bathed directly by the hexagon light
              if (prox > 0.35) {
                ctx.strokeStyle = `rgba(255, 165, 236, ${prox * 0.52})`;
                ctx.lineWidth = 0.75;
                ctx.stroke();
              }
            }
          }
          ctx.restore();
        }

        // Draws the hero multi-layered glowing Hot Pink Neon Hexagon Frame
        drawNeonHexagon(ctx, verts, radius) {
          ctx.save();
          ctx.lineJoin = 'miter';
          ctx.miterLimit = 6;
          ctx.lineCap = 'round';

          // 1. Wide diffused outer & inner magenta atmospheric light halo (additive)
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';

          const glowPasses = [
            { width: radius * 0.22, blur: radius * 0.28, color: 'rgba(240, 0, 168, 0.24)' },
            { width: radius * 0.13, blur: radius * 0.16, color: 'rgba(255, 37, 200, 0.42)' },
            { width: radius * 0.072, blur: radius * 0.085, color: 'rgba(255, 37, 200, 0.78)' },
            { width: radius * 0.044, blur: radius * 0.040, color: '#FF25C8' },
          ];

          for (const gp of glowPasses) {
            this.traceHexagon(ctx, verts);
            ctx.strokeStyle = gp.color;
            ctx.lineWidth = Math.max(2, gp.width);
            ctx.shadowColor = '#FF25C8';
            ctx.shadowBlur = gp.blur;
            ctx.stroke();
          }

          // 2. Intense luminous plasma flares at all 6 sharp hexagon corners & focal mid-edges
          for (let i = 0; i < verts.length; i++) {
            const v = verts[i];
            const flareR = radius * 0.26;
            const fg = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, flareR);
            fg.addColorStop(0.00, 'rgba(255, 240, 252, 0.62)');
            fg.addColorStop(0.24, 'rgba(255, 110, 224, 0.36)');
            fg.addColorStop(0.60, 'rgba(240, 0, 168, 0.12)');
            fg.addColorStop(1.00, 'rgba(240, 0, 168, 0)');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.arc(v.x, v.y, flareR, 0, Math.PI * 2);
            ctx.fill();
          }

          // Extra radiant light hotspots where foliage meets the upper slopes & vertical sides
          const hotspots = [
            { x: (verts[0].x + verts[5].x) * 0.5, y: (verts[0].y + verts[5].y) * 0.5, r: radius * 0.30 },
            { x: (verts[0].x + verts[1].x) * 0.5, y: (verts[0].y + verts[1].y) * 0.5, r: radius * 0.30 },
            { x: verts[4].x, y: (verts[4].y + verts[5].y) * 0.52, r: radius * 0.28 },
            { x: verts[2].x, y: (verts[1].y + verts[2].y) * 0.52, r: radius * 0.28 },
            { x: (verts[2].x + verts[3].x) * 0.52, y: (verts[2].y + verts[3].y) * 0.52, r: radius * 0.28 },
          ];
          for (const hs of hotspots) {
            const hg = ctx.createRadialGradient(hs.x, hs.y, 0, hs.x, hs.y, hs.r);
            hg.addColorStop(0.0, 'rgba(255, 225, 248, 0.45)');
            hg.addColorStop(0.35, 'rgba(255, 37, 200, 0.22)');
            hg.addColorStop(1.0, 'rgba(240, 0, 168, 0)');
            ctx.fillStyle = hg;
            ctx.beginPath();
            ctx.arc(hs.x, hs.y, hs.r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // 3. Sharply Defined Neon Glass Tube Layers (Saturated Pink -> Pale Pink -> Almost White-Pink Core)
          ctx.shadowBlur = 0;
          // Outer saturated pink tube casing
          this.traceHexagon(ctx, verts);
          ctx.strokeStyle = '#FF25C8';
          ctx.lineWidth = Math.max(3.2, radius * 0.044);
          ctx.stroke();

          // Bright pale pink inner highlight (#FFB9F0)
          this.traceHexagon(ctx, verts);
          ctx.strokeStyle = '#FFB9F0';
          ctx.lineWidth = Math.max(2.0, radius * 0.025);
          ctx.stroke();

          // Crisp incandescent core filament (#FFF0FC)
          this.traceHexagon(ctx, verts);
          ctx.strokeStyle = '#FFF0FC';
          ctx.lineWidth = Math.max(1.1, radius * 0.012);
          ctx.stroke();

          ctx.restore();
        }

        build(w, h) {
          this.w = w;
          this.h = h;
          this.staticCanvas.width = w;
          this.staticCanvas.height = h;
          const ctx = this.staticCanvas.getContext('2d');
          const isPortrait = h > w * 1.05;

          // Center & regular hexagon circumradius:
          // Portrait hits ~73% width & ~56% height exactly like the reference;
          // Landscape & gallery cards stay geometrically regular and richly framed.
          const cx = w * 0.5;
          const cy = h * 0.515;
          const hexR = isPortrait
            ? Math.min(w * 0.422, h * 0.285)
            : Math.min(h * 0.385, w * 0.34);
          const hexW = hexR * Math.sqrt(3); // horizontal span of regular pointy-top hexagon
          const verts = this.getHexagonVertices(cx, cy, hexR);

          // Reference-proportional coordinate helpers (maps cleanly across mobile & desktop)
          const unit = isPortrait ? w : Math.min(w * 0.68, h * 0.95);
          const px = (nx) => (isPortrait ? nx * w : cx + (nx - 0.5) * Math.max(w * 0.92, hexW * 1.48));
          const py = (ny) => ny * h;

          // =========================================================
          // 1. LUXURIOUS ALMOST-BLACK PLUM & DEEP BURGUNDY BACKGROUND
          // =========================================================
          const bgGrad = ctx.createRadialGradient(cx, cy, hexR * 0.2, cx, cy, Math.max(w, h) * 0.85);
          bgGrad.addColorStop(0.00, '#10060F'); // Completely dark black-plum core
          bgGrad.addColorStop(0.45, '#190A18'); // Deep burgundy mid-aura
          bgGrad.addColorStop(0.82, '#140713'); // Rich dark plum corners
          bgGrad.addColorStop(1.00, '#0a030a'); // Vignetted outer rim
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, w, h);

          // Subtle purple-magenta atmospheric regions glowing softly behind the neon frame
          const atmoHalo = ctx.createRadialGradient(cx, cy, hexR * 0.55, cx, cy, hexR * 1.65);
          atmoHalo.addColorStop(0.00, 'rgba(16, 6, 15, 0)');
          atmoHalo.addColorStop(0.42, 'rgba(115, 16, 94, 0.28)');
          atmoHalo.addColorStop(0.68, 'rgba(72, 16, 68, 0.16)');
          atmoHalo.addColorStop(1.00, 'rgba(16, 6, 15, 0)');
          ctx.fillStyle = atmoHalo;
          ctx.fillRect(0, 0, w, h);

          // =========================================================
          // 2. BACKGROUND BOTANICAL LAYER (Behind Neon Tube)
          //    Dark overlapping corner leaves & rear palm fronds
          // =========================================================

          // Subtle deep-shadow corner tropical foliage for rich layered depth
          this.drawTropicalFernFrond(ctx, {
            x0: px(0.02), y0: py(0.18), cx: px(0.18), cy: py(0.24), x1: px(0.30), y1: py(0.36),
            maxLeafletLen: unit * 0.16, leafletCount: 24,
            glowX: verts[5].x + hexW * 0.14, glowY: verts[5].y - hexR * 0.15,
            glowRadius: hexR * 0.65, glowStrength: 0.45, seed: 201,
          });
          this.drawTropicalFernFrond(ctx, {
            x0: px(0.99), y0: py(0.12), cx: px(0.84), cy: py(0.20), x1: px(0.68), y1: py(0.33),
            maxLeafletLen: unit * 0.18, leafletCount: 26,
            glowX: verts[1].x - hexW * 0.14, glowY: verts[1].y - hexR * 0.15,
            glowRadius: hexR * 0.72, glowStrength: 0.55, seed: 202,
          });

          // Prominent Upper-Left Sweeping Palm/Fern Frond approaching upper-left neon edge
          this.drawTropicalFernFrond(ctx, {
            x0: px(0.08), y0: py(0.11), cx: px(0.19), cy: py(0.22), x1: px(0.32), y1: py(0.35),
            maxLeafletLen: unit * 0.19, leafletCount: 30,
            glowX: (verts[0].x + verts[5].x) * 0.52, glowY: (verts[0].y + verts[5].y) * 0.52,
            glowRadius: hexR * 0.58, glowStrength: 1.05, seed: 301,
          });

          // Prominent Upper-Right Sweeping Palm/Fern Frond approaching upper-right neon edge
          this.drawTropicalFernFrond(ctx, {
            x0: px(0.97), y0: py(0.11), cx: px(0.80), cy: py(0.22), x1: px(0.68), y1: py(0.36),
            maxLeafletLen: unit * 0.21, leafletCount: 32,
            glowX: (verts[0].x + verts[1].x) * 0.48, glowY: (verts[0].y + verts[1].y) * 0.52,
            glowRadius: hexR * 0.62, glowStrength: 1.08, seed: 302,
          });

          // Large Prominent UPPER-CENTER Monstera Leaf hanging from top edge (partially behind upper apex)
          this.drawMonsteraLeaf(ctx, {
            x: px(0.51),
            y: py(0.095),
            size: unit * 0.195,
            rotation: 2.74, // hanging downward-right toward the hexagon apex
            lightLocalAngle: -0.95, // bright magenta illumination on lower-right lobes near hexagon
            lightStrength: 0.96,
            flipX: 1,
            seed: 401,
          });

          // Middle-Right Partially Cropped Sphere peeking from right edge behind right Monstera leaf
          this.drawGlossySphere(ctx, px(1.01), py(0.47), unit * 0.135, -2.42, { intensity: 0.80 });

          // Middle-Left Partially Cropped Large Monstera Leaf extending inward from left border
          this.drawMonsteraLeaf(ctx, {
            x: px(0.015),
            y: py(0.555),
            size: unit * 0.145,
            rotation: 1.48, // extending rightward toward left vertical neon bar
            lightLocalAngle: -0.15, // bright pink illumination along right lobes facing neon edge
            lightStrength: 1.05,
            flipX: 1,
            seed: 402,
          });

          // Middle-Right Partially Cropped Tropical Monstera Leaf near right vertical neon edge
          this.drawMonsteraLeaf(ctx, {
            x: px(0.95),
            y: py(0.555),
            size: unit * 0.148,
            rotation: -1.62, // extending leftward toward right vertical neon edge
            lightLocalAngle: -0.10, // luminous pink glow on left lobes facing neon tube
            lightStrength: 1.02,
            flipX: -1,
            seed: 403,
          });

          // Keep the central interior of the hexagon completely empty & pure almost-black plum (#10060F)
          ctx.save();
          this.traceHexagon(ctx, verts);
          const innerDark = ctx.createRadialGradient(cx, cy, 0, cx, cy, hexR * 0.96);
          innerDark.addColorStop(0.00, '#10060F');
          innerDark.addColorStop(0.76, '#120611');
          innerDark.addColorStop(1.00, '#1c081b');
          ctx.fillStyle = innerDark;
          ctx.fill();
          ctx.restore();

          // =========================================================
          // 3. HERO CENTRAL GLOWING HOT-PINK NEON HEXAGON FRAME
          // =========================================================
          this.drawNeonHexagon(ctx, verts, hexR);

          // =========================================================
          // 4. FOREGROUND BOTANICAL ELEMENTS (Overlapping Outer Frame)
          // =========================================================

          // Lower-Right Long Sweeping Tropical Fern/Palm Frond overlapping lower-right neon edge
          this.drawTropicalFernFrond(ctx, {
            x0: px(0.86), y0: py(0.97), cx: px(0.68), cy: py(0.83), x1: px(0.64), y1: py(0.65),
            maxLeafletLen: unit * 0.195, leafletCount: 34,
            glowX: (verts[2].x + verts[3].x) * 0.56, glowY: (verts[2].y + verts[3].y) * 0.54,
            glowRadius: hexR * 0.64, glowStrength: 1.15, seed: 303,
          });

          // Lower-Center-Left Sculptural Monstera Leaf below lower-left neon edge
          this.drawMonsteraLeaf(ctx, {
            x: px(0.365),
            y: py(0.82),
            size: unit * 0.145,
            rotation: 0.16, // pointing up toward the bottom-left hexagon slope
            lightLocalAngle: -1.35, // top lobes vividly lit by the neon bar right above
            lightStrength: 1.02,
            flipX: 1,
            seed: 404,
          });

          // =========================================================
          // 5. ALL FLOATING GLOSSY 3D MAGENTA-PURPLE SPHERES
          //    Positioned & lit faithfully to the reference composition
          // =========================================================

          // Upper-Left: Large partially cropped sphere (dark purple core, pink glow on lower-right edge)
          this.drawGlossySphere(ctx, px(-0.025), py(0.035), unit * 0.195, 0.72, { intensity: 0.88 });

          // Upper-Middle-Left: Medium sphere with glossy magenta upper-right rim
          this.drawGlossySphere(ctx, px(0.27), py(0.045), unit * 0.064, -1.18, { intensity: 0.86 });

          // Upper-Center-Right: Small luminous sphere sitting near top Monstera lobe (bright pink lower-left rim)
          this.drawGlossySphere(ctx, px(0.608), py(0.050), unit * 0.038, 2.28, { intensity: 0.98 });

          // Upper-Right: Large partially cropped sphere with intense pink lower-left illumination
          this.drawGlossySphere(ctx, px(0.965), py(0.022), unit * 0.112, 2.32, { intensity: 1.08 });

          // Middle-Upper: Small dark magenta sphere just above upper-left hexagon slope
          this.drawGlossySphere(ctx, px(0.402), py(0.200), unit * 0.040, 0.78, { intensity: 0.82 });

          // Middle-Right: Tiny glossy purple-pink sphere near the right edge
          this.drawGlossySphere(ctx, px(0.916), py(0.358), unit * 0.015, 2.25, { intensity: 0.95 });

          // Lower-Left: Medium glossy purple-pink sphere below lower-left hexagon corner
          this.drawGlossySphere(ctx, px(0.182), py(0.738), unit * 0.072, -1.25, { intensity: 0.96 });

          // Lower-Left Accent: Small luminous sphere with bright lower-left pink crescent
          this.drawGlossySphere(ctx, px(0.092), py(0.806), unit * 0.032, 2.35, { intensity: 0.98 });

          // Bottom-Left: Very large partially cropped dark plum-magenta sphere
          this.drawGlossySphere(ctx, px(0.105), py(0.965), unit * 0.182, -1.42, { intensity: 0.82 });

          // Lower-Right: Large bright magenta sphere outside hexagon with strong pink upper-left glow
          this.drawGlossySphere(ctx, px(0.925), py(0.828), unit * 0.180, -2.18, { intensity: 1.08 });

          // Bottom-Center-Right: Medium luminous pink sphere catching neon light from above
          this.drawGlossySphere(ctx, px(0.680), py(0.972), unit * 0.112, -1.62, { intensity: 1.04 });
        }

        // Completely STATIC render: zero animations, zero motion, zero moving lighting
        render(ctx, w, h) {
          if (this.w !== w || this.h !== h) this.build(w, h);
          ctx.drawImage(this.staticCanvas, 0, 0);
        }
      }

      /* ---------------------------------------------------------
         4E. THEME ENGINE 7: COSMIC CHAKRA MEDITATION
             Divine Energy – The Seven Chakras
             100% STATIC procedural spiritual illustration featuring:
             - Deep royal purple cosmic backdrop with static bokeh particles
             - Large 12-fold symmetrical purple lotus mandala
             - Centered meditating human figure in Padmasana (Lotus Pose)
             - Intricate cyan & magenta henna-inspired ornamental body art
             - Flowing hair & symmetrical lotus crown ornament
             - All seven vertically aligned luminous chakra energy centers
         --------------------------------------------------------- */
      class CosmicChakraMeditationRenderer {
        constructor(seed = 6709) {
          this.seed = seed;
          this.w = 0;
          this.h = 0;
          this.staticCanvas = createCanvas();
        }

        // Draws one pointed ornate ogee lotus petal along the negative Y-axis (0,0 -> 0,-len)
        traceOgeePetal(ctx, len, wid) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-wid * 0.72, -len * 0.24, -wid * 0.88, -len * 0.62, -wid * 0.24, -len * 0.86);
          ctx.quadraticCurveTo(-wid * 0.08, -len * 0.94, 0, -len);
          ctx.quadraticCurveTo(wid * 0.08, -len * 0.94, wid * 0.24, -len * 0.86);
          ctx.bezierCurveTo(wid * 0.88, -len * 0.62, wid * 0.72, -len * 0.24, 0, 0);
          ctx.closePath();
        }

        // Draws the large multi-layered 12-fold symmetrical purple lotus mandala behind the figure
        drawLotusMandala(ctx, cx, cy, R) {
          ctx.save();
          ctx.translate(cx, cy);

          // Soft violet spiritual aura glowing behind the mandala
          const aura = ctx.createRadialGradient(0, 0, R * 0.08, 0, 0, R * 1.18);
          aura.addColorStop(0.00, 'rgba(138, 64, 196, 0.34)');
          aura.addColorStop(0.55, 'rgba(84, 36, 125, 0.20)');
          aura.addColorStop(1.00, 'rgba(36, 19, 63, 0)');
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(0, 0, R * 1.18, 0, Math.PI * 2);
          ctx.fill();

          const petals = 12;

          // LAYER 1: Outermost subtle secondary alternating pointed petals
          for (let i = 0; i < petals; i++) {
            const ang = ((i + 0.5) / petals) * Math.PI * 2;
            ctx.save();
            ctx.rotate(ang);
            this.traceOgeePetal(ctx, R * 0.90, R * 0.21);
            const g1 = ctx.createLinearGradient(0, -R * 0.2, 0, -R * 0.90);
            g1.addColorStop(0.0, 'rgba(54, 24, 92, 0.82)');
            g1.addColorStop(0.7, 'rgba(84, 36, 125, 0.68)');
            g1.addColorStop(1.0, 'rgba(138, 66, 178, 0.55)');
            ctx.fillStyle = g1;
            ctx.fill();
            ctx.strokeStyle = 'rgba(165, 92, 206, 0.34)';
            ctx.lineWidth = Math.max(0.8, R * 0.004);
            ctx.stroke();
            ctx.restore();
          }

          // LAYER 2: Primary Large 12-Pointed Ornamental Lotus Petals (matches reference ogee crowns)
          for (let i = 0; i < petals; i++) {
            const ang = (i / petals) * Math.PI * 2;
            ctx.save();
            ctx.rotate(ang);

            // Outer petal silhouette
            this.traceOgeePetal(ctx, R * 1.00, R * 0.27);
            const g2 = ctx.createLinearGradient(0, -R * 0.25, 0, -R * 1.00);
            g2.addColorStop(0.00, '#3e1a66');
            g2.addColorStop(0.50, '#5a2687');
            g2.addColorStop(0.84, '#7834a6');
            g2.addColorStop(1.00, '#9948bf');
            ctx.fillStyle = g2;
            ctx.fill();
            ctx.strokeStyle = 'rgba(182, 75, 191, 0.42)';
            ctx.lineWidth = Math.max(0.9, R * 0.0045);
            ctx.stroke();

            // Nested dark-plum inner scalloped petal chamber
            ctx.save();
            ctx.translate(0, -R * 0.04);
            this.traceOgeePetal(ctx, R * 0.87, R * 0.21);
            ctx.fillStyle = '#331556';
            ctx.fill();
            ctx.strokeStyle = 'rgba(155, 72, 190, 0.52)';
            ctx.lineWidth = Math.max(0.8, R * 0.004);
            ctx.stroke();
            ctx.restore();

            // Third nested ornate royal-violet inner petal leaf with decorative tip bead
            ctx.save();
            ctx.translate(0, -R * 0.09);
            this.traceOgeePetal(ctx, R * 0.72, R * 0.145);
            const g3 = ctx.createLinearGradient(0, -R * 0.15, 0, -R * 0.72);
            g3.addColorStop(0.0, '#4a2075');
            g3.addColorStop(1.0, '#6e329e');
            ctx.fillStyle = g3;
            ctx.fill();
            ctx.strokeStyle = 'rgba(188, 108, 224, 0.44)';
            ctx.lineWidth = Math.max(0.7, R * 0.0035);
            ctx.stroke();

            // Central decorative botanical mid-vein & tiny curl motif inside each lotus petal
            ctx.strokeStyle = 'rgba(42, 16, 72, 0.78)';
            ctx.lineWidth = Math.max(0.9, R * 0.004);
            ctx.beginPath();
            ctx.moveTo(0, -R * 0.24);
            ctx.lineTo(0, -R * 0.62);
            ctx.stroke();

            // Paired small decorative spiral curls & leaf buds inside each outer petal
            for (const s of [-1, 1]) {
              ctx.strokeStyle = 'rgba(182, 95, 214, 0.48)';
              ctx.lineWidth = Math.max(0.7, R * 0.0035);
              ctx.beginPath();
              ctx.moveTo(0, -R * 0.42);
              ctx.quadraticCurveTo(s * R * 0.065, -R * 0.47, s * R * 0.055, -R * 0.55);
              ctx.arc(s * R * 0.042, -R * 0.55, R * 0.013, 0, Math.PI * 1.4, s < 0);
              ctx.stroke();
            }

            // Tiny decorative luminous dots tracing the inner ogee border
            ctx.fillStyle = 'rgba(201, 165, 240, 0.44)';
            for (let d = 0; d < 3; d++) {
              const dy = -R * (0.58 + d * 0.075);
              const dx = R * (0.078 - d * 0.025);
              ctx.beginPath();
              ctx.arc(-dx, dy, Math.max(0.9, R * 0.0055), 0, Math.PI * 2);
              ctx.arc(dx, dy, Math.max(0.9, R * 0.0055), 0, Math.PI * 2);
              ctx.fill();
            }
            // Delicate diamond dot at apex of each lotus petal
            ctx.beginPath();
            ctx.arc(0, -R * 0.94, Math.max(1.1, R * 0.007), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.restore();
          }

          // LAYER 3: Concentric Ornate Ring + 12 Inner Smaller Lotus Petals
          ctx.beginPath();
          ctx.arc(0, 0, R * 0.62, 0, Math.PI * 2);
          ctx.fillStyle = '#38175d';
          ctx.fill();
          ctx.strokeStyle = 'rgba(182, 75, 191, 0.45)';
          ctx.lineWidth = Math.max(1.0, R * 0.005);
          ctx.stroke();

          // Dotted pearl ring around inner lotus wheel
          ctx.fillStyle = 'rgba(196, 130, 232, 0.46)';
          for (let i = 0; i < 48; i++) {
            const a = (i / 48) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * R * 0.585, Math.sin(a) * R * 0.585, Math.max(0.9, R * 0.0055), 0, Math.PI * 2);
            ctx.fill();
          }

          for (let i = 0; i < petals; i++) {
            const ang = ((i + 0.5) / petals) * Math.PI * 2;
            ctx.save();
            ctx.rotate(ang);
            this.traceOgeePetal(ctx, R * 0.55, R * 0.145);
            const gi = ctx.createLinearGradient(0, -R * 0.12, 0, -R * 0.55);
            gi.addColorStop(0.0, '#4d227a');
            gi.addColorStop(1.0, '#7c38ae');
            ctx.fillStyle = gi;
            ctx.fill();
            ctx.strokeStyle = 'rgba(198, 128, 238, 0.38)';
            ctx.lineWidth = Math.max(0.75, R * 0.0035);
            ctx.stroke();

            // Inner dark carved teardrop inside inner petal
            ctx.translate(0, -R * 0.12);
            this.traceOgeePetal(ctx, R * 0.34, R * 0.075);
            ctx.fillStyle = '#2d124c';
            ctx.fill();
            ctx.restore();
          }

          // LAYER 4: Innermost Sacred Geometry Wheel & Radial Linework
          ctx.beginPath();
          ctx.arc(0, 0, R * 0.34, 0, Math.PI * 2);
          ctx.fillStyle = '#471f72';
          ctx.fill();
          ctx.strokeStyle = 'rgba(201, 165, 240, 0.34)';
          ctx.lineWidth = Math.max(0.8, R * 0.004);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(182, 75, 191, 0.28)';
          ctx.lineWidth = Math.max(0.6, R * 0.003);
          for (let i = 0; i < 24; i++) {
            const a = (i / 24) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * R * 0.10, Math.sin(a) * R * 0.10);
            ctx.lineTo(Math.cos(a) * R * 0.34, Math.sin(a) * R * 0.34);
            ctx.stroke();
          }

          ctx.restore();
        }

        // Traces the unified outer silhouette of the meditating torso, shoulders, arms & crossed legs
        // (used both for the translucent dark royal-purple body backdrop and clipping body ornaments)
        traceBodyClipSilhouette(ctx, cx, cy, S) {
          const X = (u) => cx + u * S;
          const Y = (v) => cy + v * S;

          ctx.beginPath();
          // Start at top-center of neck under chin
          ctx.moveTo(X(0), Y(-0.188));
          // Right neck -> shoulder -> outer upper arm -> elbow -> forearm -> outer wrist -> outer knee -> lotus base
          ctx.lineTo(X(0.036), Y(-0.186));
          ctx.bezierCurveTo(X(0.044), Y(-0.140), X(0.075), Y(-0.112), X(0.145), Y(-0.088));
          ctx.bezierCurveTo(X(0.195), Y(-0.068), X(0.214), Y(-0.025), X(0.218), Y(0.030));
          ctx.bezierCurveTo(X(0.222), Y(0.078), X(0.244), Y(0.125), X(0.288), Y(0.195));
          ctx.bezierCurveTo(X(0.326), Y(0.256), X(0.354), Y(0.304), X(0.378), Y(0.342));
          // Right outer knee & base of crossed leg
          ctx.bezierCurveTo(X(0.398), Y(0.376), X(0.382), Y(0.422), X(0.328), Y(0.436));
          ctx.bezierCurveTo(X(0.245), Y(0.450), X(0.122), Y(0.402), X(0.000), Y(0.362));
          // Left base of crossed leg -> left outer knee
          ctx.bezierCurveTo(X(-0.122), Y(0.402), X(-0.245), Y(0.450), X(-0.328), Y(0.436));
          ctx.bezierCurveTo(X(-0.382), Y(0.422), X(-0.398), Y(0.376), X(-0.378), Y(0.342));
          // Left outer wrist -> forearm -> elbow -> upper arm -> shoulder -> left neck
          ctx.bezierCurveTo(X(-0.354), Y(0.304), X(-0.326), Y(0.256), X(-0.288), Y(0.195));
          ctx.bezierCurveTo(X(-0.244), Y(0.125), X(-0.222), Y(0.078), X(-0.218), Y(0.030));
          ctx.bezierCurveTo(X(-0.214), Y(-0.025), X(-0.195), Y(-0.068), X(-0.145), Y(-0.088));
          ctx.bezierCurveTo(X(-0.075), Y(-0.112), X(-0.044), Y(-0.140), X(-0.036), Y(-0.186));
          ctx.closePath();
        }

        // Helper: Draws a pair of symmetrical cubic Bezier curves mirrored across cx
        drawSymBezier(ctx, cx, cy, S, p0, c1, c2, p3, color, lw) {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = lw;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx + s * p0[0] * S, cy + p0[1] * S);
            ctx.bezierCurveTo(
              cx + s * c1[0] * S, cy + c1[1] * S,
              cx + s * c2[0] * S, cy + c2[1] * S,
              cx + s * p3[0] * S, cy + p3[1] * S
            );
            ctx.stroke();
          }
          ctx.restore();
        }

        // Helper: Draws a pair of symmetrical spiral filigree curls with optional leaf bud
        drawSymSpiral(ctx, cx, cy, S, ux, vy, r, startAng, turns, color, lw) {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = lw;
          ctx.lineCap = 'round';
          const steps = 18;
          for (const s of [-1, 1]) {
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
              const t = i / steps;
              const rad = r * S * (1 - t * 0.82);
              const ang = startAng + t * Math.PI * 2 * turns;
              const px = cx + s * (ux * S + Math.cos(ang) * rad);
              const py = cy + vy * S + Math.sin(ang) * rad;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
          ctx.restore();
        }

        // Helper: Draws symmetrical henna teardrop botanical leaves
        drawSymLeaf(ctx, cx, cy, S, ux, vy, len, wid, angle, strokeColor, lw) {
          ctx.save();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lw;
          for (const s of [-1, 1]) {
            ctx.save();
            ctx.translate(cx + s * ux * S, cy + vy * S);
            ctx.scale(s, 1);
            ctx.rotate(angle);
            const L = len * S;
            const W = wid * S;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-W, -L * 0.45, 0, -L);
            ctx.quadraticCurveTo(W, -L * 0.45, 0, 0);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
          }
          ctx.restore();
        }

        // Helper: Draws symmetrical small luminous ornamental henna dots
        drawSymDot(ctx, cx, cy, S, ux, vy, r, color) {
          ctx.fillStyle = color;
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(cx + s * ux * S, cy + vy * S, Math.max(0.8, r * S), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draws elaborate symmetrical henna-inspired ornamental body linework
        // strictly inside the human silhouette (cyan #79D9E8, magenta #B64BBF, soft pink #F3B6EA, lavender #C9A5F0)
        drawBodyOrnaments(ctx, cx, cy, S) {
          const lwMain = Math.max(0.95, S * 0.0033);
          const lwFine = Math.max(0.75, S * 0.0024);
          const cyan = '#79D9E8';
          const cyanSoft = 'rgba(121, 217, 232, 0.85)';
          const pink = '#F3B6EA';
          const magenta = '#C86CE6';
          const lavender = '#C9A5F0';

          ctx.save();
          // Clip all scrollwork neatly inside the body contour (and carve out the empty armpit gaps)
          this.traceBodyClipSilhouette(ctx, cx, cy, S);
          ctx.clip();

          // --- 1. NECK & COLLARBONE ORNAMENTAL FILIGREE ---
          this.drawSymBezier(ctx, cx, cy, S, [0.008, -0.118], [0.055, -0.116], [0.112, -0.095], [0.162, -0.064], cyan, lwMain);
          this.drawSymBezier(ctx, cx, cy, S, [0.024, -0.105], [0.075, -0.095], [0.126, -0.076], [0.172, -0.036], pink, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.145, -0.062, 0.022, 0.4, 1.15, cyan, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.078, -0.104, 0.028, 0.009, 1.1, magenta, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.116, -0.088, 0.026, 0.008, 1.35, cyan, lwFine);

          // --- 2. CHEST & HEART CHAKRA SYMMETRICAL FLORAL SCROLLS ---
          this.drawSymBezier(ctx, cx, cy, S, [0.006, -0.092], [0.068, -0.096], [0.098, -0.042], [0.046, -0.012], pink, lwMain);
          this.drawSymBezier(ctx, cx, cy, S, [0.046, -0.012], [0.098, -0.022], [0.125, 0.025], [0.072, 0.052], cyan, lwMain);
          this.drawSymBezier(ctx, cx, cy, S, [0.018, -0.078], [0.085, -0.072], [0.116, -0.015], [0.085, 0.030], magenta, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.074, -0.062, 0.020, 1.2, 1.25, cyan, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.092, -0.012, 0.022, -0.6, 1.2, pink, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.054, -0.086, 0.024, 0.008, 0.55, cyanSoft, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.098, -0.042, 0.028, 0.009, 1.25, pink, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.088, 0.018, 0.026, 0.009, 2.25, cyan, lwFine);
          this.drawSymDot(ctx, cx, cy, S, 0.056, -0.046, 0.0042, pink);
          this.drawSymDot(ctx, cx, cy, S, 0.098, 0.040, 0.0038, cyan);

          // --- 3. ABDOMEN, SOLAR PLEXUS & SACRAL MANDALA VINES ---
          this.drawSymBezier(ctx, cx, cy, S, [0.012, 0.014], [0.074, 0.018], [0.096, 0.072], [0.045, 0.112], cyan, lwMain);
          this.drawSymBezier(ctx, cx, cy, S, [0.045, 0.112], [0.096, 0.116], [0.094, 0.175], [0.042, 0.212], pink, lwMain);
          this.drawSymBezier(ctx, cx, cy, S, [0.022, 0.042], [0.068, 0.055], [0.076, 0.118], [0.036, 0.145], magenta, lwFine);
          this.drawSymBezier(ctx, cx, cy, S, [0.016, 0.152], [0.078, 0.158], [0.088, 0.218], [0.046, 0.246], cyanSoft, lwMain);
          this.drawSymSpiral(ctx, cx, cy, S, 0.076, 0.078, 0.021, 0.2, 1.25, pink, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.068, 0.146, 0.019, 2.1, 1.2, cyan, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.068, 0.212, 0.018, -0.4, 1.15, magenta, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.086, 0.052, 0.024, 0.008, 1.6, cyan, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.082, 0.120, 0.026, 0.009, 2.0, pink, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.082, 0.188, 0.025, 0.008, 1.8, cyanSoft, lwFine);
          this.drawSymDot(ctx, cx, cy, S, 0.058, 0.032, 0.0038, lavender);
          this.drawSymDot(ctx, cx, cy, S, 0.064, 0.108, 0.0040, cyan);
          this.drawSymDot(ctx, cx, cy, S, 0.058, 0.180, 0.0038, pink);
          this.drawSymDot(ctx, cx, cy, S, 0.054, 0.242, 0.0036, lavender);

          // --- 4. SHOULDERS & ARMS FLOWING SCROLLWORK VINES ---
          // Primary sinuous cyan vine cascading down shoulder -> upper arm -> forearm -> wrist
          this.drawSymBezier(ctx, cx, cy, S, [0.168, -0.056], [0.205, -0.022], [0.178, 0.038], [0.218, 0.085], cyan, lwMain);
          this.drawSymBezier(ctx, cx, cy, S, [0.218, 0.085], [0.258, 0.132], [0.236, 0.175], [0.285, 0.225], cyan, lwMain);
          this.drawSymBezier(ctx, cx, cy, S, [0.285, 0.225], [0.326, 0.268], [0.318, 0.305], [0.362, 0.348], cyanSoft, lwMain);

          // Intertwined magenta-pink companion vine along both arms
          this.drawSymBezier(ctx, cx, cy, S, [0.186, -0.032], [0.164, 0.022], [0.222, 0.056], [0.202, 0.106], pink, lwFine);
          this.drawSymBezier(ctx, cx, cy, S, [0.202, 0.106], [0.228, 0.158], [0.282, 0.186], [0.268, 0.244], magenta, lwFine);
          this.drawSymBezier(ctx, cx, cy, S, [0.268, 0.244], [0.296, 0.288], [0.346, 0.312], [0.348, 0.356], pink, lwFine);

          // Arm spiral flourishes & botanical sprigs
          this.drawSymSpiral(ctx, cx, cy, S, 0.188, 0.010, 0.017, 0.5, 1.15, pink, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.212, 0.088, 0.016, 2.2, 1.15, cyan, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.252, 0.162, 0.016, 0.8, 1.15, magenta, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.294, 0.242, 0.015, 2.4, 1.15, cyan, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.336, 0.308, 0.014, 0.7, 1.15, pink, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.194, -0.018, 0.022, 0.007, 2.5, cyan, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.236, 0.125, 0.022, 0.007, 2.3, pink, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.278, 0.204, 0.022, 0.007, 2.5, cyan, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.320, 0.280, 0.020, 0.007, 2.4, magenta, lwFine);

          // --- 5. CROSSED LOTUS LEGS FLOWING BOTANICAL FILIGREE ---
          // Upper thigh sweeping cyan & pink scrolls
          this.drawSymBezier(ctx, cx, cy, S, [0.068, 0.292], [0.145, 0.268], [0.225, 0.285], [0.305, 0.335], cyan, lwMain);
          this.drawSymBezier(ctx, cx, cy, S, [0.095, 0.308], [0.175, 0.292], [0.255, 0.316], [0.322, 0.365], pink, lwFine);

          // Lower crossed shin & knee ornamental lotus vines
          this.drawSymBezier(ctx, cx, cy, S, [0.045, 0.358], [0.132, 0.334], [0.228, 0.358], [0.312, 0.402], cyan, lwMain);
          this.drawSymBezier(ctx, cx, cy, S, [0.082, 0.382], [0.172, 0.425], [0.265, 0.432], [0.338, 0.392], magenta, lwMain);
          this.drawSymBezier(ctx, cx, cy, S, [0.145, 0.368], [0.205, 0.344], [0.262, 0.388], [0.318, 0.376], pink, lwFine);

          // Leg spiral motifs, floral leaves & luminous pearls
          this.drawSymSpiral(ctx, cx, cy, S, 0.148, 0.305, 0.019, 0.4, 1.2, pink, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.226, 0.328, 0.020, 2.1, 1.2, cyan, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.288, 0.385, 0.020, 0.8, 1.2, pink, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.186, 0.394, 0.019, 2.5, 1.2, cyan, lwFine);
          this.drawSymSpiral(ctx, cx, cy, S, 0.112, 0.372, 0.016, 1.0, 1.15, magenta, lwFine);

          this.drawSymLeaf(ctx, cx, cy, S, 0.188, 0.296, 0.026, 0.009, 1.35, cyan, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.264, 0.342, 0.026, 0.009, 1.85, magenta, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.236, 0.408, 0.026, 0.009, 1.15, cyan, lwFine);
          this.drawSymLeaf(ctx, cx, cy, S, 0.144, 0.398, 0.024, 0.008, 2.35, pink, lwFine);
          this.drawSymDot(ctx, cx, cy, S, 0.168, 0.348, 0.0040, lavender);
          this.drawSymDot(ctx, cx, cy, S, 0.256, 0.368, 0.0042, cyan);
          this.drawSymDot(ctx, cx, cy, S, 0.312, 0.362, 0.0038, pink);

          ctx.restore();
        }

        // Draws one detailed hand resting gently on the knee (palm upward/outward, 5 slender relaxed fingers)
        drawMeditatingHand(ctx, cx, cy, S, side, strokeColor, lw) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(side, 1);

          const x = (u) => u * S;
          const y = (v) => v * S;

          // Subtle dark royal purple hand fill so fingers stand cleanly against background
          ctx.fillStyle = 'rgba(36, 18, 66, 0.88)';
          ctx.beginPath();
          ctx.moveTo(x(0.352), y(0.332));
          ctx.lineTo(x(0.382), y(0.326));
          ctx.quadraticCurveTo(x(0.415), y(0.352), x(0.432), y(0.388));
          ctx.quadraticCurveTo(x(0.448), y(0.422), x(0.436), y(0.432));
          ctx.quadraticCurveTo(x(0.414), y(0.436), x(0.395), y(0.424));
          ctx.quadraticCurveTo(x(0.368), y(0.406), x(0.352), y(0.376));
          ctx.closePath();
          ctx.fill();

          // Minimal delicate cyan mandala curl on back of hand
          ctx.strokeStyle = 'rgba(121, 217, 232, 0.78)';
          ctx.lineWidth = Math.max(0.75, lw * 0.55);
          ctx.beginPath();
          ctx.arc(x(0.382), y(0.368), S * 0.011, 0, Math.PI * 1.75);
          ctx.stroke();

          // Luminous pearl-white anatomical hand & 5 naturally relaxed fingers
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lw;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Outer thumb contour (upper-outer edge)
          ctx.beginPath();
          ctx.moveTo(x(0.380), y(0.326));
          ctx.quadraticCurveTo(x(0.406), y(0.336), x(0.424), y(0.354));
          ctx.quadraticCurveTo(x(0.434), y(0.366), x(0.422), y(0.370));
          ctx.quadraticCurveTo(x(0.408), y(0.368), x(0.398), y(0.360));
          ctx.stroke();

          // Four gracefully extended fingers (index, middle, ring, pinky)
          const fingers = [
            // Index finger
            [[0.404, 0.360], [0.428, 0.384], [0.444, 0.412], [0.438, 0.418], [0.416, 0.396], [0.395, 0.375]],
            // Middle finger (longest)
            [[0.395, 0.375], [0.420, 0.402], [0.436, 0.428], [0.428, 0.434], [0.406, 0.410], [0.385, 0.386]],
            // Ring finger
            [[0.385, 0.386], [0.408, 0.412], [0.420, 0.434], [0.412, 0.438], [0.392, 0.416], [0.374, 0.394]],
            // Pinky finger
            [[0.374, 0.394], [0.392, 0.416], [0.400, 0.432], [0.391, 0.435], [0.372, 0.412], [0.356, 0.384]],
          ];

          for (const f of fingers) {
            ctx.beginPath();
            ctx.moveTo(x(f[0][0]), y(f[0][1]));
            ctx.quadraticCurveTo(x(f[1][0]), y(f[1][1]), x(f[2][0]), y(f[2][1]));
            ctx.quadraticCurveTo(x(f[3][0]), y(f[3][1]), x(f[4][0]), y(f[4][1]));
            ctx.lineTo(x(f[5][0]), y(f[5][1]));
            ctx.stroke();
          }

          // Inner palm wrist connection
          ctx.beginPath();
          ctx.moveTo(x(0.344), y(0.346));
          ctx.quadraticCurveTo(x(0.350), y(0.370), x(0.358), y(0.386));
          ctx.stroke();

          ctx.restore();
        }

        // Draws the luminous anatomical line-art figure in Padmasana (Lotus Pose),
        // complete with peaceful minimal face, flowing wavy hair & crown lotus ornament
        drawMeditatingFigure(ctx, cx, cy, S) {
          const X = (u) => cx + u * S;
          const Y = (v) => cy + v * S;
          const lwMain = Math.max(1.5, S * 0.0052);
          const lwFine = Math.max(1.0, S * 0.0034);

          // -------------------------------------------------------
          // 1. TRANSLUCENT DARK PURPLE BODY SILHOUETTE BACKDROP
          //    (Softly shields body ornaments from the mandala behind)
          // -------------------------------------------------------
          ctx.save();
          this.traceBodyClipSilhouette(ctx, cx, cy, S);
          const bodyBg = ctx.createRadialGradient(cx, cy + S * 0.04, S * 0.02, cx, cy + S * 0.08, S * 0.42);
          bodyBg.addColorStop(0.0, 'rgba(38, 17, 68, 0.84)');
          bodyBg.addColorStop(0.7, 'rgba(32, 15, 58, 0.88)');
          bodyBg.addColorStop(1.0, 'rgba(26, 12, 48, 0.92)');
          ctx.fillStyle = bodyBg;
          ctx.fill();

          // Cut out the negative-space triangles between torso waist and inner arms
          ctx.globalCompositeOperation = 'source-over';
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(X(s * 0.146), Y(0.022));
            ctx.bezierCurveTo(X(s * 0.122), Y(0.085), X(s * 0.108), Y(0.165), X(s * 0.122), Y(0.242));
            ctx.quadraticCurveTo(X(s * 0.195), Y(0.236), X(s * 0.256), Y(0.258));
            ctx.bezierCurveTo(X(s * 0.228), Y(0.188), X(s * 0.190), Y(0.105), X(s * 0.146), Y(0.022));
            ctx.closePath();
            // Fill negative gap with subtle translucent cosmic purple so mandala peeks cleanly through
            ctx.fillStyle = 'rgba(46, 22, 82, 0.38)';
            ctx.fill();
          }
          ctx.restore();

          // -------------------------------------------------------
          // 2. INTRICATE HENNA-INSPIRED ORNAMENTAL BODY PATTERNS
          // -------------------------------------------------------
          this.drawBodyOrnaments(ctx, cx, cy, S);

          // Re-clean the negative-space waist-to-armpit gaps so no body ornament crosses empty air
          ctx.save();
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(X(s * 0.145), Y(0.024));
            ctx.bezierCurveTo(X(s * 0.122), Y(0.088), X(s * 0.109), Y(0.166), X(s * 0.122), Y(0.242));
            ctx.quadraticCurveTo(X(s * 0.194), Y(0.234), X(s * 0.258), Y(0.258));
            ctx.bezierCurveTo(X(s * 0.226), Y(0.186), X(s * 0.188), Y(0.104), X(s * 0.145), Y(0.024));
            ctx.closePath();
            const gapGrad = ctx.createLinearGradient(X(s * 0.12), Y(0.02), X(s * 0.24), Y(0.26));
            gapGrad.addColorStop(0, 'rgba(54, 24, 92, 0.92)');
            gapGrad.addColorStop(1, 'rgba(40, 18, 70, 0.94)');
            ctx.fillStyle = gapGrad;
            ctx.fill();
          }
          ctx.restore();

          // -------------------------------------------------------
          // 3. LUMINOUS PEARL-WHITE BODY CONTOURS & PADMASANA LEGS
          // -------------------------------------------------------
          const drawGlowingStroke = (drawPathFn, width = lwMain, color = '#F7E7FF') => {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            // Soft outer lavender aura
            ctx.strokeStyle = 'rgba(216, 181, 245, 0.42)';
            ctx.lineWidth = width * 2.15;
            ctx.shadowColor = '#D8B5F5';
            ctx.shadowBlur = Math.max(4, S * 0.015);
            drawPathFn();
            ctx.stroke();

            // Crisp bright pearl-white spiritual line art
            ctx.shadowBlur = 0;
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            drawPathFn();
            ctx.stroke();
            ctx.restore();
          };

          // Symmetrical Neck, Shoulders, Outer Arms, Inner Arms & Torso Waist
          for (const s of [-1, 1]) {
            // Neck -> Shoulder -> Outer Arm -> Wrist
            drawGlowingStroke(() => {
              ctx.beginPath();
              ctx.moveTo(X(s * 0.036), Y(-0.186));
              ctx.bezierCurveTo(X(s * 0.044), Y(-0.140), X(s * 0.075), Y(-0.112), X(s * 0.145), Y(-0.088));
              ctx.bezierCurveTo(X(s * 0.195), Y(-0.068), X(s * 0.214), Y(-0.025), X(s * 0.218), Y(0.030));
              ctx.bezierCurveTo(X(s * 0.222), Y(0.078), X(s * 0.244), Y(0.125), X(s * 0.288), Y(0.195));
              ctx.bezierCurveTo(X(s * 0.326), Y(0.256), X(s * 0.354), Y(0.300), X(s * 0.380), Y(0.328));
            });

            // Inner Armpit -> Inner Arm -> Inner Forearm -> Wrist
            drawGlowingStroke(() => {
              ctx.beginPath();
              ctx.moveTo(X(s * 0.144), Y(-0.008));
              ctx.bezierCurveTo(X(s * 0.148), Y(0.045), X(s * 0.178), Y(0.105), X(s * 0.214), Y(0.165));
              ctx.bezierCurveTo(X(s * 0.252), Y(0.228), X(s * 0.302), Y(0.292), X(s * 0.345), Y(0.348));
            });

            // Torso Side Contour (Armpit -> Natural Waist -> Hip)
            drawGlowingStroke(() => {
              ctx.beginPath();
              ctx.moveTo(X(s * 0.146), Y(0.024));
              ctx.bezierCurveTo(X(s * 0.120), Y(0.088), X(s * 0.108), Y(0.165), X(s * 0.122), Y(0.245));
            });
          }

          // CROSSED LOTUS LEGS (PADMASANA) — Symmetrical Knees, Overlapping Shins & Tucked Bare Feet
          // Upper outer thigh arches connecting hips to knees (extending behind inner forearms)
          for (const s of [-1, 1]) {
            drawGlowingStroke(() => {
              ctx.beginPath();
              ctx.moveTo(X(s * 0.122), Y(0.245));
              ctx.bezierCurveTo(X(s * 0.185), Y(0.240), X(s * 0.248), Y(0.255), X(s * 0.288), Y(0.278));
            }, lwMain * 0.92);
          }

          // Left & Right Lotus Base Silhouette Curves (sweeping from outer knees smoothly across center)
          // Right leg front-crossing shin & tucked bare foot on left thigh
          drawGlowingStroke(() => {
            ctx.beginPath();
            ctx.moveTo(X(0.376), Y(0.354));
            ctx.bezierCurveTo(X(0.392), Y(0.402), X(0.355), Y(0.436), X(0.288), Y(0.436));
            ctx.bezierCurveTo(X(0.205), Y(0.436), X(0.095), Y(0.392), X(0.000), Y(0.358));
          });
          // Left leg base curve sweeping symmetrically from left knee to center overlap
          drawGlowingStroke(() => {
            ctx.beginPath();
            ctx.moveTo(X(-0.376), Y(0.354));
            ctx.bezierCurveTo(X(-0.392), Y(0.402), X(-0.355), Y(0.436), X(-0.288), Y(0.436));
            ctx.bezierCurveTo(X(-0.205), Y(0.436), X(-0.085), Y(0.392), X(0.032), Y(0.348));
          });

          // Right crossing shin top contour & arched foot resting on left thigh
          drawGlowingStroke(() => {
            ctx.beginPath();
            ctx.moveTo(X(0.278), Y(0.326));
            ctx.bezierCurveTo(X(0.185), Y(0.302), X(0.092), Y(0.328), X(-0.015), Y(0.356));
            ctx.bezierCurveTo(X(-0.115), Y(0.382), X(-0.205), Y(0.396), X(-0.268), Y(0.382));
          }, lwMain * 0.92);

          // Left crossing shin top contour & arched foot resting on right thigh
          drawGlowingStroke(() => {
            ctx.beginPath();
            ctx.moveTo(X(-0.278), Y(0.326));
            ctx.bezierCurveTo(X(-0.185), Y(0.302), X(-0.098), Y(0.322), X(-0.010), Y(0.346));
          }, lwMain * 0.90);

          // Gentle pelvic/lotus crease curves & tucked soles resting atop opposite thighs
          for (const s of [-1, 1]) {
            drawGlowingStroke(() => {
              ctx.beginPath();
              ctx.moveTo(X(s * 0.068), Y(0.285));
              ctx.quadraticCurveTo(X(s * 0.148), Y(0.272), X(s * 0.215), Y(0.285));
              ctx.quadraticCurveTo(X(s * 0.242), Y(0.292), X(s * 0.232), Y(0.308));
            }, lwFine);
          }

          // Both Relaxed Hands resting naturally over outer knees (palms facing upward/outward)
          this.drawMeditatingHand(ctx, cx, cy, S, -1, '#F7E7FF', lwMain * 0.88);
          this.drawMeditatingHand(ctx, cx, cy, S, 1, '#F7E7FF', lwMain * 0.88);

          // -------------------------------------------------------
          // 4. HEAD, PEACEFUL MINIMAL FACE, FLOWING HAIR & LOTUS CROWN
          // -------------------------------------------------------
          // Soft dark violet head/hair backdrop so face & flowing hair read cleanly over mandala
          ctx.save();
          ctx.fillStyle = 'rgba(34, 15, 62, 0.90)';
          ctx.beginPath();
          ctx.ellipse(X(0), Y(-0.282), S * 0.088, S * 0.102, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Medium-length Flowing Wavy Hair framing both sides of the face & tucked partially back
          for (const s of [-1, 1]) {
            // Outer flowing wavy hair locks cascading around cheeks down toward neck
            drawGlowingStroke(() => {
              ctx.beginPath();
              ctx.moveTo(X(s * 0.012), Y(-0.386));
              ctx.bezierCurveTo(X(s * 0.072), Y(-0.382), X(s * 0.104), Y(-0.344), X(s * 0.098), Y(-0.292));
              ctx.bezierCurveTo(X(s * 0.094), Y(-0.258), X(s * 0.108), Y(-0.235), X(s * 0.092), Y(-0.205));
              ctx.quadraticCurveTo(X(s * 0.080), Y(-0.184), X(s * 0.056), Y(-0.175));
            }, lwMain * 0.90);

            // Second sweeping hair wave tucked behind ear & flowing downward
            drawGlowingStroke(() => {
              ctx.beginPath();
              ctx.moveTo(X(s * 0.030), Y(-0.376));
              ctx.bezierCurveTo(X(s * 0.082), Y(-0.362), X(s * 0.108), Y(-0.318), X(s * 0.092), Y(-0.272));
              ctx.bezierCurveTo(X(s * 0.082), Y(-0.244), X(s * 0.096), Y(-0.214), X(s * 0.072), Y(-0.186));
            }, lwFine, '#EBD6FF');

            // Delicate hairline waves sweeping gracefully across upper temples from center part
            drawGlowingStroke(() => {
              ctx.beginPath();
              ctx.moveTo(X(s * 0.010), Y(-0.362));
              ctx.bezierCurveTo(X(s * 0.048), Y(-0.354), X(s * 0.080), Y(-0.332), X(s * 0.084), Y(-0.298));
            }, lwFine * 0.95, '#F7E7FF');

            drawGlowingStroke(() => {
              ctx.beginPath();
              ctx.moveTo(X(s * 0.018), Y(-0.344));
              ctx.bezierCurveTo(X(s * 0.048), Y(-0.332), X(s * 0.068), Y(-0.312), X(s * 0.072), Y(-0.285));
            }, lwFine * 0.85, '#D8B5F5');

            // Soft lower hair tendrils curling gracefully near lower jawline
            drawGlowingStroke(() => {
              ctx.beginPath();
              ctx.moveTo(X(s * 0.076), Y(-0.252));
              ctx.bezierCurveTo(X(s * 0.088), Y(-0.228), X(s * 0.072), Y(-0.198), X(s * 0.048), Y(-0.184));
            }, lwFine * 0.85, '#D8B5F5');

            // Delicate symmetrical ears peeking subtly beneath hair waves
            drawGlowingStroke(() => {
              ctx.beginPath();
              ctx.moveTo(X(s * 0.070), Y(-0.292));
              ctx.bezierCurveTo(X(s * 0.085), Y(-0.294), X(s * 0.084), Y(-0.264), X(s * 0.068), Y(-0.260));
            }, lwFine * 0.85, '#EBD6FF');
          }

          // Smooth Peaceful Oval Face Contour & Graceful Chin
          drawGlowingStroke(() => {
            ctx.beginPath();
            ctx.moveTo(X(-0.068), Y(-0.296));
            ctx.bezierCurveTo(X(-0.070), Y(-0.244), X(-0.044), Y(-0.200), X(0), Y(-0.186));
            ctx.bezierCurveTo(X(0.044), Y(-0.200), X(0.070), Y(-0.244), X(0.068), Y(-0.296));
          }, lwMain * 0.95);

          // Minimal, serene facial features: softly closed meditative eyes, delicate nose & peaceful mouth hint
          ctx.save();
          ctx.strokeStyle = 'rgba(226, 198, 250, 0.44)';
          ctx.lineWidth = Math.max(0.8, S * 0.0024);
          ctx.lineCap = 'round';
          // Serene closed eyes (gentle downward-curving lashes)
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(X(s * 0.018), Y(-0.278));
            ctx.quadraticCurveTo(X(s * 0.032), Y(-0.270), X(s * 0.047), Y(-0.277));
            ctx.stroke();
          }
          // Delicate minimal nose bridge & soft serene lip contour
          ctx.strokeStyle = 'rgba(216, 181, 245, 0.30)';
          ctx.beginPath();
          ctx.moveTo(X(0), Y(-0.270));
          ctx.lineTo(X(0), Y(-0.244));
          ctx.moveTo(X(-0.008), Y(-0.242));
          ctx.quadraticCurveTo(X(0), Y(-0.238), X(0.008), Y(-0.242));
          ctx.moveTo(X(-0.015), Y(-0.218));
          ctx.quadraticCurveTo(X(0), Y(-0.214), X(0.015), Y(-0.218));
          ctx.stroke();
          ctx.restore();

          // -------------------------------------------------------
          // 5. DECORATIVE SYMMETRICAL CROWN LOTUS ORNAMENT ABOVE HEAD
          // -------------------------------------------------------
          const crownY = Y(-0.422);
          const crownR = S * 0.046;
          ctx.save();
          ctx.translate(cx, crownY);

          // Symmetrical 7-petal lotus crown halo framing the Crown Chakra jewel
          const crownPetals = [
            { ang: 0, len: crownR * 1.18, wid: crownR * 0.44 },
            { ang: -0.48, len: crownR * 1.05, wid: crownR * 0.38 },
            { ang: 0.48, len: crownR * 1.05, wid: crownR * 0.38 },
            { ang: -0.96, len: crownR * 0.90, wid: crownR * 0.34 },
            { ang: 0.96, len: crownR * 0.90, wid: crownR * 0.34 },
            { ang: -1.42, len: crownR * 0.72, wid: crownR * 0.28 },
            { ang: 1.42, len: crownR * 0.72, wid: crownR * 0.28 },
          ];

          for (const cp of crownPetals) {
            ctx.save();
            ctx.rotate(cp.ang);
            this.traceOgeePetal(ctx, cp.len, cp.wid);
            ctx.fillStyle = 'rgba(130, 68, 186, 0.45)';
            ctx.fill();
            ctx.strokeStyle = '#F7E7FF';
            ctx.lineWidth = Math.max(0.85, S * 0.0028);
            ctx.stroke();
            ctx.restore();
          }

          // Delicate tiny white-lavender pearls crowning the upper tips
          ctx.fillStyle = '#F7E7FF';
          for (const ang of [0, -0.48, 0.48, -0.96, 0.96]) {
            const dist = ang === 0 ? crownR * 1.32 : Math.abs(ang) < 0.7 ? crownR * 1.16 : crownR * 1.00;
            ctx.beginPath();
            ctx.arc(Math.sin(ang) * dist, -Math.cos(ang) * dist, Math.max(1.0, S * 0.0032), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();

          // Delicate teardrop Third-Eye ornamental frame on the forehead
          ctx.save();
          ctx.translate(cx, Y(-0.330));
          ctx.strokeStyle = '#E8CCFF';
          ctx.lineWidth = Math.max(0.9, S * 0.0028);
          ctx.beginPath();
          ctx.moveTo(0, -S * 0.044);
          ctx.bezierCurveTo(S * 0.026, -S * 0.018, S * 0.028, S * 0.020, 0, S * 0.032);
          ctx.bezierCurveTo(-S * 0.028, S * 0.020, -S * 0.026, -S * 0.018, 0, -S * 0.044);
          ctx.closePath();
          ctx.stroke();
          // Tiny delicate cyan pendant dot below Third Eye
          ctx.fillStyle = '#79D9E8';
          ctx.beginPath();
          ctx.arc(0, S * 0.041, Math.max(1.1, S * 0.0034), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draws one radiant Chakra Energy Center with multi-layer halo, concentric ornamental rings,
        // subtle sacred petal geometry, luminous glass orb core & bright pearl highlight
        drawChakraCenter(ctx, x, y, r, spec) {
          ctx.save();
          ctx.translate(x, y);

          // 1. Soft colored outer spiritual halo (balanced so it never muddies fine linework)
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const halo = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r * 2.55);
          halo.addColorStop(0.00, spec.haloInner);
          halo.addColorStop(0.42, spec.haloMid);
          halo.addColorStop(1.00, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(0, 0, r * 2.55, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // 2. Delicate symmetrical lotus-petal ring around the chakra ornament
          const pCount = spec.petals || 8;
          ctx.strokeStyle = spec.ringColor;
          ctx.lineWidth = Math.max(0.75, r * 0.06);
          for (let i = 0; i < pCount; i++) {
            const a = (i / pCount) * Math.PI * 2;
            ctx.save();
            ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(0, -r * 0.92);
            ctx.quadraticCurveTo(r * 0.24, -r * 1.18, 0, -r * 1.42);
            ctx.quadraticCurveTo(-r * 0.24, -r * 1.18, 0, -r * 0.92);
            ctx.stroke();
            ctx.restore();
          }

          // 3. Outer thin ornamental concentric rings
          ctx.strokeStyle = 'rgba(247, 231, 255, 0.72)';
          ctx.lineWidth = Math.max(0.8, r * 0.055);
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = spec.ringColor;
          ctx.lineWidth = Math.max(0.95, r * 0.075);
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
          ctx.stroke();

          // 4. Luminous Spherical Energy Core
          const orb = ctx.createRadialGradient(-r * 0.18, -r * 0.22, r * 0.04, 0, 0, r * 0.88);
          orb.addColorStop(0.00, '#ffffff');
          orb.addColorStop(0.28, spec.coreBright);
          orb.addColorStop(0.68, spec.coreMid);
          orb.addColorStop(1.00, spec.coreEdge);
          ctx.fillStyle = orb;
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
          ctx.fill();

          // Inner fine pearl ring & luminous top-left specular gleam
          ctx.strokeStyle = 'rgba(255, 248, 255, 0.88)';
          ctx.lineWidth = Math.max(0.85, r * 0.065);
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
          ctx.stroke();

          // Crisp incandescent central jewel highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.beginPath();
          ctx.arc(-r * 0.12, -r * 0.14, r * 0.24, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        // Draws static cosmic particles, tiny luminous dots & soft glowing bokeh circles
        drawCosmicParticles(ctx, w, h, cx, cy, S, rand) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';

          // 1. Soft glowing circular bokeh halos scattered around the universe
          const bokehCount = Math.max(32, Math.min(64, Math.floor((w * h) / 7500)));
          const bokehColors = [
            'rgba(243, 182, 234, 0.24)', // Soft pink
            'rgba(201, 165, 240, 0.22)', // Soft lavender
            'rgba(182, 75, 191, 0.24)',  // Cosmic magenta
            'rgba(121, 217, 232, 0.16)', // Subtle cyan glint
          ];
          for (let i = 0; i < bokehCount; i++) {
            const bx = rand() * w;
            const by = rand() * h;
            const br = Math.min(w, h) * (0.008 + rand() * 0.022);
            const col = bokehColors[Math.floor(rand() * bokehColors.length)];
            const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
            g.addColorStop(0.0, col);
            g.addColorStop(0.55, col.replace(/[\d.]+\)$/, '0.07)'));
            g.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(bx, by, br, 0, Math.PI * 2);
            ctx.fill();
          }

          // 2. Scattered tiny pink, lavender & white-purple static luminous star dots
          const dotCount = Math.max(95, Math.min(180, Math.floor((w * h) / 2600)));
          const dotPalette = ['#F3B6EA', '#C9A5F0', '#F7E7FF', '#D57AE8', '#9EE4F2'];
          for (let i = 0; i < dotCount; i++) {
            const dx = rand() * w;
            const dy = rand() * h;
            // Keep immediate central face/chakra axis uncluttered
            const distCenter = Math.hypot(dx - cx, dy - (cy - S * 0.05));
            if (distCenter < S * 0.16 && rand() < 0.75) continue;

            const isBright = rand() < 0.18;
            const dr = isBright ? (1.6 + rand() * 1.8) : (0.65 + rand() * 1.25);
            const col = dotPalette[Math.floor(rand() * dotPalette.length)];

            if (isBright) {
              const sg = ctx.createRadialGradient(dx, dy, 0, dx, dy, dr * 3.4);
              sg.addColorStop(0, 'rgba(255, 245, 255, 0.92)');
              sg.addColorStop(0.35, 'rgba(243, 182, 234, 0.45)');
              sg.addColorStop(1, 'rgba(182, 75, 191, 0)');
              ctx.fillStyle = sg;
              ctx.beginPath();
              ctx.arc(dx, dy, dr * 3.4, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.fillStyle = col;
            ctx.globalAlpha = isBright ? 0.92 : (0.35 + rand() * 0.50);
            ctx.beginPath();
            ctx.arc(dx, dy, dr, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }

        build(w, h) {
          this.w = w;
          this.h = h;
          this.staticCanvas.width = w;
          this.staticCanvas.height = h;
          const ctx = this.staticCanvas.getContext('2d');
          const rand = mulberry32(this.seed);
          const isPortrait = h > w * 1.05;

          const cx = w * 0.5;
          const cy = h * (isPortrait ? 0.525 : 0.53);
          // Scale figure to occupy ~68-74% of composition height in portrait and fit cleanly in thumbnails
          const S = isPortrait
            ? Math.min(h * 0.72, w * 0.98)
            : Math.min(h * 0.88, w * 0.76);

          // =========================================================
          // 1. COSMIC ROYAL PURPLE & DEEP VIOLET BACKGROUND
          // =========================================================
          const bg = ctx.createRadialGradient(cx, cy - S * 0.06, S * 0.04, cx, cy, Math.max(w, h) * 0.78);
          bg.addColorStop(0.00, '#4d2582'); // Slightly brighter spiritual violet glow behind figure
          bg.addColorStop(0.32, '#3a1f6b'); // Luminous royal purple aura
          bg.addColorStop(0.65, '#301B59'); // Primary Cosmic Purple (#301B59)
          bg.addColorStop(1.00, '#24133F'); // Dark Violet outer depth (#24133F)
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);

          // Subtle darker atmospheric corner vignette
          const vig = ctx.createRadialGradient(cx, cy, S * 0.28, cx, cy, Math.max(w, h) * 0.82);
          vig.addColorStop(0, 'rgba(36, 19, 63, 0)');
          vig.addColorStop(1, 'rgba(18, 8, 36, 0.45)');
          ctx.fillStyle = vig;
          ctx.fillRect(0, 0, w, h);

          // Static cosmic bokeh & scattered purple-pink particles behind mandala
          this.drawCosmicParticles(ctx, w, h, cx, cy, S, rand);

          // =========================================================
          // 2. LARGE SYMMETRICAL 12-FOLD PURPLE LOTUS MANDALA
          // =========================================================
          this.drawLotusMandala(ctx, cx, cy - S * 0.065, S * 0.435);

          // =========================================================
          // 3. CENTRAL MEDITATING HUMAN FIGURE (PADMASANA) & BODY ART
          // =========================================================
          this.drawMeditatingFigure(ctx, cx, cy, S);

          // =========================================================
          // 4. SEVEN VERTICALLY ALIGNED LUMINOUS CHAKRA ENERGY CENTERS
          //    Strictly centered along x = cx from Crown down to Root
          // =========================================================
          const chakras = [
            // 1. Crown Chakra (Sahasrara) — Above top of head
            {
              y: cy - S * 0.422,
              r: S * 0.024,
              petals: 10,
              ringColor: '#E5C6FF',
              coreBright: '#FAF0FF',
              coreMid: '#C9A5F0',
              coreEdge: '#8948C7',
              haloInner: 'rgba(247, 231, 255, 0.72)',
              haloMid: 'rgba(182, 75, 191, 0.34)',
            },
            // 2. Third Eye Chakra (Ajna) — Centre of forehead
            {
              y: cy - S * 0.330,
              r: S * 0.022,
              petals: 8,
              ringColor: '#C9A5F0',
              coreBright: '#F2ECFF',
              coreMid: '#8F82E8',
              coreEdge: '#5547A6',
              haloInner: 'rgba(220, 212, 255, 0.68)',
              haloMid: 'rgba(85, 71, 166, 0.38)',
            },
            // 3. Throat Chakra (Vishuddha) — Centre of throat
            {
              y: cy - S * 0.145,
              r: S * 0.023,
              petals: 8,
              ringColor: '#A8EAF4',
              coreBright: '#EEFCFF',
              coreMid: '#79D9E8',
              coreEdge: '#3D8CC4',
              haloInner: 'rgba(180, 244, 255, 0.70)',
              haloMid: 'rgba(121, 217, 232, 0.34)',
            },
            // 4. Heart Chakra (Anahata) — Centre of upper chest
            {
              y: cy - S * 0.056,
              r: S * 0.026,
              petals: 12,
              ringColor: '#F3B6EA',
              coreBright: '#FFF5FC',
              coreMid: '#9AE6DC',
              coreEdge: '#D67CC9',
              haloInner: 'rgba(248, 224, 245, 0.72)',
              haloMid: 'rgba(121, 217, 232, 0.32)',
            },
            // 5. Solar Plexus Chakra (Manipura) — Upper abdomen
            {
              y: cy + S * 0.072,
              r: S * 0.027,
              petals: 10,
              ringColor: '#F2D58C',
              coreBright: '#FFFBE6',
              coreMid: '#F2D58C',
              coreEdge: '#D882B6',
              haloInner: 'rgba(255, 242, 200, 0.74)',
              haloMid: 'rgba(242, 213, 140, 0.32)',
            },
            // 6. Sacral Chakra (Svadhisthana) — Lower abdomen
            {
              y: cy + S * 0.180,
              r: S * 0.024,
              petals: 8,
              ringColor: '#F7C2A6',
              coreBright: '#FFF3E8',
              coreMid: '#F2A37E',
              coreEdge: '#CE5E9E',
              haloInner: 'rgba(255, 220, 198, 0.72)',
              haloMid: 'rgba(242, 152, 128, 0.34)',
            },
            // 7. Root Chakra (Muladhara) — Base of spine / pelvic centre
            {
              y: cy + S * 0.264,
              r: S * 0.025,
              petals: 8,
              ringColor: '#F39CC8',
              coreBright: '#FFE8F4',
              coreMid: '#E65C8E',
              coreEdge: '#9E2668',
              haloInner: 'rgba(255, 196, 226, 0.72)',
              haloMid: 'rgba(218, 62, 132, 0.38)',
            },
          ];

          // Delicate vertical luminous prana energy thread connecting all 7 aligned chakras
          ctx.save();
          const axisGrad = ctx.createLinearGradient(cx, chakras[0].y, cx, chakras[6].y);
          axisGrad.addColorStop(0.0, 'rgba(247, 231, 255, 0.26)');
          axisGrad.addColorStop(0.5, 'rgba(121, 217, 232, 0.22)');
          axisGrad.addColorStop(1.0, 'rgba(243, 182, 234, 0.26)');
          ctx.strokeStyle = axisGrad;
          ctx.lineWidth = Math.max(0.8, S * 0.0022);
          ctx.beginPath();
          ctx.moveTo(cx, chakras[0].y);
          ctx.lineTo(cx, chakras[6].y);
          ctx.stroke();
          ctx.restore();

          for (const ch of chakras) {
            this.drawChakraCenter(ctx, cx, ch.y, ch.r, ch);
          }
        }

        // Completely STATIC render: zero motion, zero pulsing, zero moving particles
        render(ctx, w, h) {
          if (this.w !== w || this.h !== h) this.build(w, h);
          ctx.drawImage(this.staticCanvas, 0, 0);
        }
      }

      /* ---------------------------------------------------------
         5. THEME MANAGER & LIVE PREVIEW RENDERING
         --------------------------------------------------------- */
      const THEMES = {
        'obsidian': {
          name: 'Obsidian',
          renderer: new ObsidianRenderer(),
        },
        'cosmic-chakra-meditation': {
          name: 'Cosmic Chakra Meditation',
          renderer: new CosmicChakraMeditationRenderer(6709),
          isStatic: true,
        },
        'neon-tropical-geometry': {
          name: 'Neon Tropical Geometry',
          renderer: new NeonTropicalGeometryRenderer(9419),
          isStatic: true,
        },
        'alpine-serenity': {
          name: 'Alpine Serenity',
          renderer: new AlpineSerenityRenderer(5197),
          isStatic: true,
        },
        'cosmic-road-trip': {
          name: 'Cosmic Road Trip',
          renderer: new CosmicRoadTripRenderer(7331),
        },
        'enchanted-garden': {
          name: 'Enchanted Garden',
          renderer: new EnchantedGardenRenderer(4077),
        },
        'misty-mountain': {
          name: 'Misty Mountain',
          renderer: new MistyMountainRenderer(8821),
        },
      };

      // Dedicated thumbnail instances so gallery previews stay crisp independently
      const PREVIEW_RENDERERS = {
        'obsidian': new ObsidianRenderer(),
        'cosmic-chakra-meditation': new CosmicChakraMeditationRenderer(6709),
        'neon-tropical-geometry': new NeonTropicalGeometryRenderer(9419),
        'alpine-serenity': new AlpineSerenityRenderer(5197),
        'cosmic-road-trip': new CosmicRoadTripRenderer(7331),
        'enchanted-garden': new EnchantedGardenRenderer(4077),
        'misty-mountain': new MistyMountainRenderer(8821),
      };


module.exports = { THEMES, PREVIEW_RENDERERS };
