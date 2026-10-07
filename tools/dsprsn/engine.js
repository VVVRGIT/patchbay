/*! DSPRSN-Engine · MIT
 * Spektrale Dispersion, portiert aus einem Brik-Tool (brik.space) für Patchbay.
 * Reine Funktion: gleiche Eingabe + gleiche Parameter = gleiches Bild (Phase und Seed statt Animation und Zufall).
 * Läuft im Browser und in Node: DSPRSN.render(srcRGBA, w, h, params) -> Uint8ClampedArray (RGBA).
 */
(function (root) {
  'use strict';

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  var GRAD3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
  var F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  var permCache = {};
  function permFor(seed) {
    var key = seed >>> 0;
    if (permCache[key]) return permCache[key];
    var rnd = mulberry32(key || 1), p = [], perm = new Uint8Array(512), i, j, tmp;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); tmp = p[i]; p[i] = p[j]; p[j] = tmp; }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    permCache[key] = perm;
    return perm;
  }
  function makeSimplex(perm) {
    return function (xin, yin) {
      var s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s), t = (i + j) * G2;
      var x0 = xin - (i - t), y0 = yin - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
      var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      var ii = i & 255, jj = j & 255, n0 = 0, n1 = 0, n2 = 0, g;
      var t0 = 0.5 - x0 * x0 - y0 * y0; if (t0 > 0) { t0 *= t0; g = GRAD3[perm[ii + perm[jj]] % 12]; n0 = t0 * t0 * (g[0] * x0 + g[1] * y0); }
      var t1 = 0.5 - x1 * x1 - y1 * y1; if (t1 > 0) { t1 *= t1; g = GRAD3[perm[ii + i1 + perm[jj + j1]] % 12]; n1 = t1 * t1 * (g[0] * x1 + g[1] * y1); }
      var t2 = 0.5 - x2 * x2 - y2 * y2; if (t2 > 0) { t2 *= t2; g = GRAD3[perm[ii + 1 + perm[jj + 1]] % 12]; n2 = t2 * t2 * (g[0] * x2 + g[1] * y2); }
      return 70 * (n0 + n1 + n2);
    };
  }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }

  function render(src, w, h, p) {
    p = p || {};
    var simplex2 = makeSimplex(permFor(num(p.seed, 7)));
    var spread = num(p.spread, 1.31), warpStr = num(p.warp_strength, 0.63), warpScale = num(p.warp_scale, 1.2);
    var grain = num(p.grain, 0), isCMY = p.mode === 'CMY', time = num(p.phase, 0);
    var SAMPLES = Math.max(2, Math.round(num(p.samples, 10)));
    var warpType = p.warp_type || 'Wave', warpComplexity = Math.max(1, Math.round(num(p.warp_complexity, 5)));
    var warpSpd = num(p.warp_speed, 3.9), warpSym = Math.max(1, Math.round(num(p.warp_symmetry, 1)));
    var warpDecay = num(p.warp_decay, 0), warpBlend = num(p.warp_blend, 1);
    var dirBiasX = num(p.dir_x, 0) * 0.15, dirBiasY = num(p.dir_y, 0) * 0.15;

    var total = w * h, aspect = w / h;
    var warpX = new Float32Array(total), warpY = new Float32Array(total);
    var rAcc = new Float32Array(total), gAcc = new Float32Array(total), bAcc = new Float32Array(total);
    var rWt = new Float32Array(total), gWt = new Float32Array(total), bWt = new Float32Array(total);
    var specR = new Float32Array(SAMPLES), specG = new Float32Array(SAMPLES), specB = new Float32Array(SAMPLES), specT = new Float32Array(SAMPLES);
    for (var s = 0; s < SAMPLES; s++) {
      var tt = s / (SAMPLES - 1); specT[s] = tt;
      var a = Math.max(0, 1 - Math.abs(tt) * 3), b = Math.max(0, 1 - Math.abs(tt - 0.5) * 3), c = Math.max(0, 1 - Math.abs(tt - 1) * 3);
      specR[s] = isCMY ? 1 - a : a; specG[s] = isCMY ? 1 - b : b; specB[s] = isCMY ? 1 - c : c;
    }

    var invRw = 1 / w, invRh = 1 / h, warpMul = warpStr * 0.1;
    var t01 = time * 0.1 * warpSpd, t007 = time * 0.07 * warpSpd, t005 = time * 0.05 * warpSpd, t003 = time * 0.03 * warpSpd;
    var x, y, ux, uy, nx, nyBase, rowOff, baseWX, baseWY, cx, cy, dist, angle, invDist, oc, freq, amp;

    for (y = 0; y < h; y++) {
      uy = y * invRh; nyBase = uy * warpScale; rowOff = y * w;
      for (x = 0; x < w; x++) {
        ux = x * invRw; nx = ux * aspect * warpScale; baseWX = 0; baseWY = 0;
        if (warpType === 'Fluid') {
          baseWX = simplex2(nx + t01, nyBase + t007) * warpMul; baseWY = simplex2(nx - t005 + 10, nyBase + t003 + 10) * warpMul;
          for (oc = 1; oc < warpComplexity; oc++) { freq = (oc + 1) * 1.7; amp = warpMul / (oc + 1);
            baseWX += simplex2(nx * freq + t01 * (oc + 1), nyBase * freq + t007) * amp; baseWY += simplex2(nx * freq - t005 + 10 * oc, nyBase * freq + t003 + 10) * amp; }
        } else if (warpType === 'Turbulence') {
          for (oc = 0; oc < warpComplexity + 1; oc++) { freq = Math.pow(2, oc); amp = warpMul / freq;
            baseWX += Math.abs(simplex2(nx * freq + t01, nyBase * freq + t007)) * amp; baseWY += Math.abs(simplex2(nx * freq - t005 + 10, nyBase * freq + t003 + 10)) * amp; }
          baseWX = baseWX * 2 - warpMul; baseWY = baseWY * 2 - warpMul;
        } else if (warpType === 'Swirl') {
          cx = ux - 0.5; cy = uy - 0.5; dist = Math.sqrt(cx * cx + cy * cy); angle = Math.atan2(cy, cx);
          var swirlAngle = angle + (1 - Math.min(dist * 2, 1)) * warpMul * 8 * warpComplexity * Math.sin(time * 0.3 * warpSpd);
          baseWX = (Math.cos(swirlAngle) * dist - cx) * 0.5 + simplex2(nx + t01, nyBase + t007) * warpMul * 0.3;
          baseWY = (Math.sin(swirlAngle) * dist - cy) * 0.5 + simplex2(nx - t005 + 10, nyBase + t003 + 10) * warpMul * 0.3;
        } else if (warpType === 'Ripple') {
          cx = ux - 0.5; cy = uy - 0.5; dist = Math.sqrt(cx * cx + cy * cy);
          var ripple = Math.sin(dist * (warpComplexity * 8 + 4) - time * 2 * warpSpd) * warpMul; invDist = dist > 0.001 ? 1 / dist : 0;
          baseWX = cx * invDist * ripple * 0.3; baseWY = cy * invDist * ripple * 0.3;
        } else if (warpType === 'Shatter') {
          var cellX = Math.floor(ux * (warpComplexity + 2) * 3), cellY = Math.floor(uy * (warpComplexity + 2) * 3);
          var shatterPhase = Math.sin(time * 0.5 * warpSpd + simplex2(cellX * 1.37, cellY * 2.41) * 6.28);
          baseWX = simplex2(cellX + t01, cellY + t007) * warpMul * shatterPhase * 2; baseWY = simplex2(cellX - t005 + 10, cellY + t003 + 10) * warpMul * shatterPhase * 2;
        } else if (warpType === 'Vortex') {
          cx = ux - 0.5; cy = uy - 0.5; dist = Math.sqrt(cx * cx + cy * cy); angle = Math.atan2(cy, cx);
          var vAngle = angle + warpMul * 6 * warpComplexity / (dist * 10 + 1) * Math.sin(time * 0.2 * warpSpd);
          baseWX = (Math.cos(vAngle) * dist - cx) * 0.4 + simplex2(nx * 2 + t01, nyBase * 2 + t007) * warpMul * 0.2;
          baseWY = (Math.sin(vAngle) * dist - cy) * 0.4 + simplex2(nx * 2 - t005 + 10, nyBase * 2 + t003 + 10) * warpMul * 0.2;
        } else if (warpType === 'Wave') {
          var waveFreq = (warpComplexity + 1) * 3;
          baseWX = Math.sin(uy * waveFreq + time * warpSpd) * warpMul * 1.5 + simplex2(nx + t01, nyBase + t007) * warpMul * 0.3;
          baseWY = Math.cos(ux * waveFreq * aspect + time * 0.7 * warpSpd) * warpMul * 1.5 + simplex2(nx - t005 + 10, nyBase + t003 + 10) * warpMul * 0.3;
        } else if (warpType === 'Pinch') {
          cx = ux - 0.5; cy = uy - 0.5; dist = Math.sqrt(cx * cx + cy * cy);
          var pinchFactor = Math.exp(-dist * 4) * Math.sin(time * 0.4 * warpSpd) * warpMul * 3 * warpComplexity;
          baseWX = -cx * pinchFactor + simplex2(nx + t01, nyBase + t007) * warpMul * 0.2; baseWY = -cy * pinchFactor + simplex2(nx - t005 + 10, nyBase + t003 + 10) * warpMul * 0.2;
        } else if (warpType === 'Kaleidoscope') {
          cx = ux - 0.5; cy = uy - 0.5; angle = Math.atan2(cy, cx); dist = Math.sqrt(cx * cx + cy * cy);
          var segAngle = 6.2832 / ((warpComplexity + 1) * 2), mirrorAngle = ((angle % segAngle) + segAngle) % segAngle;
          if (mirrorAngle > segAngle * 0.5) mirrorAngle = segAngle - mirrorAngle;
          baseWX = (Math.cos(mirrorAngle + time * 0.15 * warpSpd) * dist - cx + 0.5 - ux) * warpMul * 3;
          baseWY = (Math.sin(mirrorAngle + time * 0.15 * warpSpd) * dist - cy + 0.5 - uy) * warpMul * 3;
        } else if (warpType === 'Spiral') {
          cx = ux - 0.5; cy = uy - 0.5; dist = Math.sqrt(cx * cx + cy * cy); angle = Math.atan2(cy, cx);
          var spiralR = dist + Math.sin(dist * warpComplexity * 12 + time * warpSpd * 0.5) * warpMul * 0.4;
          var spiralA = angle + Math.cos(dist * 8 - time * warpSpd) * warpMul * 2 * warpComplexity;
          baseWX = (Math.cos(spiralA) * spiralR - cx) * 0.5; baseWY = (Math.sin(spiralA) * spiralR - cy) * 0.5;
        } else if (warpType === 'Glitch') {
          var glitchBand = Math.floor(uy * (warpComplexity + 2) * 5);
          var glitchActive = simplex2(glitchBand * 0.73, Math.floor(time * warpSpd * 3) * 1.17) > 0.1 ? 1 : 0;
          baseWX = simplex2(glitchBand * 1.5 + Math.floor(time * warpSpd * 2), 0) * warpMul * 6 * glitchActive;
          baseWY = simplex2(0, glitchBand * 2.1 + Math.floor(time * warpSpd * 2.5)) * warpMul * 1.5 * glitchActive;
          var blockSeed = simplex2(Math.floor(ux * (warpComplexity + 1) * 4) * 0.9 + Math.floor(time * warpSpd * 2), glitchBand * 0.6);
          if (blockSeed > 0.4) baseWX += blockSeed * warpMul * 3;
        } else if (warpType === 'Melt') {
          var meltPhase = simplex2(nx * 0.5, time * 0.2 * warpSpd) * 0.5 + 0.5;
          baseWX = simplex2(nx * 2 + t01, nyBase + t007) * warpMul * 0.4 + Math.sin(uy * 20 + time * warpSpd * 2) * warpMul * 0.15;
          baseWY = Math.pow(meltPhase, warpComplexity) * warpMul * 4 + simplex2(nx * 1.5, nyBase * 0.5 + time * 0.15 * warpSpd) * warpMul * 0.5;
        } else if (warpType === 'Explode') {
          cx = ux - 0.5; cy = uy - 0.5; dist = Math.sqrt(cx * cx + cy * cy); invDist = dist > 0.001 ? 1 / dist : 0;
          var explodePulse = Math.sin(time * warpSpd * 0.6) * 0.5 + 0.5, explodeForce = Math.exp(-dist * 3) * warpMul * 5 * warpComplexity * explodePulse;
          baseWX = cx * invDist * explodeForce * dist + simplex2(nx * 3 + t01, nyBase * 3 + t007) * warpMul * explodePulse * 0.5;
          baseWY = cy * invDist * explodeForce * dist + simplex2(nx * 3 - t005 + 10, nyBase * 3 + t003 + 10) * warpMul * explodePulse * 0.5;
        } else if (warpType === 'Twist') {
          cx = ux - 0.5; cy = uy - 0.5; dist = Math.sqrt(cx * cx + cy * cy); angle = Math.atan2(cy, cx);
          var tAngle = angle + (uy - 0.5) * warpMul * 15 * warpComplexity * Math.sin(time * 0.3 * warpSpd);
          baseWX = (Math.cos(tAngle) * dist - cx) * 0.6 + simplex2(nx + t01, nyBase + t007) * warpMul * 0.15;
          baseWY = (Math.sin(tAngle) * dist - cy) * 0.6 + simplex2(nx - t005 + 10, nyBase + t003 + 10) * warpMul * 0.15;
        } else if (warpType === 'Fisheye') {
          cx = ux - 0.5; cy = uy - 0.5; dist = Math.sqrt(cx * cx + cy * cy);
          var newDist = Math.pow(dist / 0.5, 1 + warpMul * 8 * warpComplexity * (Math.sin(time * 0.3 * warpSpd) * 0.5 + 0.5)) * 0.5;
          angle = Math.atan2(cy, cx);
          baseWX = (Math.cos(angle) * newDist - cx) + simplex2(nx + t01, nyBase + t007) * warpMul * 0.1;
          baseWY = (Math.sin(angle) * newDist - cy) + simplex2(nx - t005 + 10, nyBase + t003 + 10) * warpMul * 0.1;
        }
        baseWX += dirBiasX * warpMul; baseWY += dirBiasY * warpMul;
        if (warpSym > 1) {
          cx = ux - 0.5; cy = uy - 0.5; angle = Math.atan2(cy, cx);
          var symAngle = 6.2832 / warpSym, sector = Math.floor((angle + 3.1416) / symAngle), localAngle = angle - (sector * symAngle - 3.1416);
          if (sector % 2 === 1) localAngle = symAngle - localAngle;
          var symCos = Math.cos(localAngle - angle), symSin = Math.sin(localAngle - angle), swx = baseWX * symCos - baseWY * symSin;
          baseWY = baseWX * symSin + baseWY * symCos; baseWX = swx;
        }
        if (warpDecay > 0) {
          var edge = Math.min(Math.min(ux, 1 - ux) * 2, Math.min(uy, 1 - uy) * 2);
          edge = Math.pow(Math.min(edge / (1 - warpDecay + 0.01), 1), 2);
          baseWX *= edge; baseWY *= edge;
        }
        warpX[rowOff + x] = baseWX * warpBlend; warpY[rowOff + x] = baseWY * warpBlend;
      }
    }

    var wMinus1 = w - 1, hMinus1 = h - 1;
    for (s = 0; s < SAMPLES; s++) {
      var sr = specR[s], sg = specG[s], sb = specB[s], offset = (specT[s] - 0.5) * spread * 0.05;
      for (y = 0; y < h; y++) {
        uy = y * invRh; rowOff = y * w;
        for (x = 0; x < w; x++) {
          ux = x * invRw;
          var idx = rowOff + x, su = ux + warpX[idx] + (ux - 0.5) * offset, sv = uy + warpY[idx] + (uy - 0.5) * offset;
          var sx = su < 0 ? 0 : su >= 1 ? wMinus1 : (su * w) | 0, sy = sv < 0 ? 0 : sv >= 1 ? hMinus1 : (sv * h) | 0, si = (sy * w + sx) << 2;
          rAcc[idx] += src[si] * sr; gAcc[idx] += src[si + 1] * sg; bAcc[idx] += src[si + 2] * sb;
          rWt[idx] += sr; gWt[idx] += sg; bWt[idx] += sb;
        }
      }
    }

    var out = new Uint8ClampedArray(total * 4), grainAmt = grain * 255, rnd = mulberry32((num(p.seed, 7) >>> 0) ^ 0x9E3779B9);
    for (var i = 0; i < total; i++) {
      var r = rWt[i] > 0 ? rAcc[i] / rWt[i] : 0, g = gWt[i] > 0 ? gAcc[i] / gWt[i] : 0, bb = bWt[i] > 0 ? bAcc[i] / bWt[i] : 0;
      if (grain > 0) { var gr = (rnd() - 0.5) * grainAmt; r += gr; g += gr; bb += gr; }
      var oi = i << 2; out[oi] = r; out[oi + 1] = g; out[oi + 2] = bb; out[oi + 3] = 255;
    }
    return out;
  }

  var api = { render: render, version: '1.0.0' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.DSPRSN = api;
})(typeof self !== 'undefined' ? self : this);
