// 場景:週期表最右邊一排(第 18 族:氦、氖、氬…)與玻爾模型的原子。寫法與契約見 .claude/skills/chem-story-to-animation/references/scene-authoring.md
// 週期表牆:118 個元素 + 2 個「57–71 / 89–103」的標示格,用「一個 InstancedMesh + 一張畫布圖集」畫(格子的符號從圖集裡依序取)。
import { ELEMENTS, CATEGORIES } from '../../data/elements.js';

export function build(ctx, E0) {
  const E = (E0 && E0.storyId === 'mendeleev') ? E0 : ctx.EXP.mendeleev;   // 引擎若傳錯實驗資料,改用自己的腳本
  const { T, scene, cam, hemi, LI, h, kid } = ctx; const keyL = ctx.key;
  const { clamp, lerp, ease, mj, kf, ramp, popS, V, canvasTex, segIdx } = h;
  ctx.room(false);
  const LANG = () => ctx.lang();
  const grp = new T.Group(); scene.add(grp);
  scene.background = new T.Color(0x141c44); scene.fog = null;
  const SEG = E.steps.map(s => ({ n: s.nZh, d: s.d0, io: s.io, cap: s.capZh }));
  const ST = []; SEG.reduce((a, s) => { ST.push(a); return a + s.d; }, 0);
  const iIntro = 0, iCount = 1, iCol = 2, iAtoms = 3, iBounce = 4, iEnd = 5;

  // ---------------------------------------------------------------- 地板
  const floor = new T.Mesh(new T.PlaneGeometry(70, 40), new T.MeshStandardMaterial({ color: 0x1f2c66, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 8); grp.add(floor);

  // ---------------------------------------------------------------- 週期表牆(圖集貼圖 + InstancedMesh)
  const P = 0.8, TS = 0.7, TD = 0.07, Y0 = 0.5, COL_X = c => (c - 9.5) * P, ROW_Y = r => Y0 + (10 - r) * P;
  const cells = ELEMENTS.map(e => ({ z: e.z, sym: e.sym, cat: e.cat, row: e.row, col: e.col, color: CATEGORIES[e.cat].color }));
  cells.push({ z: 57, sym: '57–71', cat: null, row: 6, col: 3, color: '#cdd3ee', ph: true }, { z: 89, sym: '89–103', cat: null, row: 7, col: 3, color: '#cdd3ee', ph: true });
  const NC = cells.length, AC = 16, AR = 8, CELL = 128;
  const atlas = canvasTex(AC * CELL, AR * CELL, (g, w, hh) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.textAlign = 'center'; g.textBaseline = 'middle';
    cells.forEach((c, i) => {
      const cx = (i % AC) * CELL, cy = Math.floor(i / AC) * CELL; g.fillStyle = '#1b2250';
      if (c.ph) { g.font = 'bold 30px Arial, sans-serif'; g.fillText(c.sym, cx + CELL / 2, cy + CELL / 2 + 2); return; }
      g.font = 'bold 66px Arial, "Noto Sans TC", sans-serif'; g.fillText(c.sym, cx + CELL / 2, cy + CELL / 2 + 10);
      g.font = 'bold 22px Arial, sans-serif'; g.textAlign = 'left'; g.fillText(String(c.z), cx + 12, cy + 20); g.textAlign = 'center';
    });
  }, true);
  atlas.anisotropy = 8;
  function roundRect(w, hh, r, depth, seg) {
    const s = new T.Shape(), x = -w / 2, y = -hh / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + hh - r); s.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
    s.lineTo(x + r, y + hh); s.quadraticCurveTo(x, y + hh, x, y + hh - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return new T.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: seg });
  }
  const tileGeo = roundRect(TS, TS, 0.13, TD, 5);
  { const pos = tileGeo.attributes.position, uv = tileGeo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / TS + 0.5, pos.getY(i) / TS + 0.5); uv.needsUpdate = true; }
  const offs = new Float32Array(NC * 2);
  cells.forEach((c, i) => { offs[i * 2] = (i % AC) / AC; offs[i * 2 + 1] = 1 - (Math.floor(i / AC) + 1) / AR; });
  tileGeo.setAttribute('aOff', new T.InstancedBufferAttribute(offs, 2));
  const tileMat = new T.MeshStandardMaterial({ map: atlas, roughness: 0.55, metalness: 0, transparent: true });
  tileMat.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute vec2 aOff;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = vMapUv * vec2(1.0 / ' + AC + '.0, 1.0 / ' + AR + '.0) + aOff;\n#endif');
  };
  const tiles = new T.InstancedMesh(tileGeo, tileMat, NC); tiles.frustumCulled = false; grp.add(tiles);
  const plateMat = new T.MeshStandardMaterial({ color: 0x2a3770, roughness: 0.7, transparent: true });
  const plate = new T.Mesh(roundRect(18 * P + 0.5, 9.3, 0.4, 0.1, 6), plateMat); plate.position.set(0, 0.02 + 4.65, -0.12); grp.add(plate);
  const baseCol = cells.map(c => new T.Color(c.color));
  const dummy = new T.Object3D(), tmpC = new T.Color();
  const isG18 = c => !c.ph && c.col === 18 && c.row <= 7;

  // 發光:第 18 族的光柱(柔邊),與結尾的掃描光
  const beamTex = canvasTex(64, 256, (g, w, hh) => {
    g.clearRect(0, 0, w, hh); g.shadowColor = 'rgba(255,230,130,1)'; g.shadowBlur = 18; g.fillStyle = 'rgba(255,225,120,0.9)';
    g.beginPath(); g.roundRect(20, 20, w - 40, hh - 40, 12); g.fill();
  }, true);
  function beamMesh(wd) { const m = new T.Mesh(new T.PlaneGeometry(wd, 1), new T.MeshBasicMaterial({ map: beamTex, transparent: true, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0 })); m.visible = false; grp.add(m); return m; }
  const beam = beamMesh(1.5), scan = beamMesh(1.5);

  // ---------------------------------------------------------------- 3D 標籤(中英兩張貼圖;一張動態的計數牌)
  function fitFont(g, txt, fs, maxW) { const f = n => 'bold ' + n + 'px "Noto Sans TC","Microsoft JhengHei",Arial,sans-serif'; g.font = f(fs); const wd = g.measureText(txt).width; return f(wd > maxW ? Math.floor(fs * maxW / wd) : fs); }
  function labelTex(txt, col, w, hh, fs) {
    return canvasTex(w, hh, (g) => {
      g.fillStyle = 'rgba(14,20,50,0.85)'; const rr = hh * 0.24; g.beginPath(); g.roundRect(4, 4, w - 8, hh - 8, rr); g.fill(); g.lineWidth = 5; g.strokeStyle = col; g.stroke();
      if (txt.includes('|')) { const ls = txt.split('|'); g.fillStyle = '#fff'; g.font = fitFont(g, ls[0], fs, w - 40); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ls[0], w / 2, hh * 0.32); g.fillStyle = '#cfd8ff'; g.font = fitFont(g, ls[1], Math.round(fs * 0.62), w - 40); g.fillText(ls[1], w / 2, hh * 0.72); return; }
      g.fillStyle = '#fff'; g.font = fitFont(g, txt, fs, w - 50); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, hh / 2 + 2);
    }, true);
  }
  function label(zh, en, col, sx, sy, w = 512, hh = 128, fs = 56) {
    const tz = labelTex(zh, col, w, hh, fs), te = labelTex(en, col, w, hh, fs);
    const s = new T.Sprite(new T.SpriteMaterial({ map: tz, transparent: true, depthWrite: false, toneMapped: false })); s.userData = { zh: tz, en: te, sx, sy }; s.visible = false; grp.add(s); return s;
  }
  function showLabel(s, a, x, y, z, pulse) {
    s.visible = a > 0.01; if (!s.visible) return; s.material.map = s.userData[LANG()]; s.material.opacity = a;
    const k = (0.82 + 0.18 * a) * (pulse || 1); s.scale.set(s.userData.sx * k, s.userData.sy * k, 1); s.position.set(x, y, z);
  }
  const labTitle = label('元素週期表', 'Periodic Table', '#ffe066', 5.2, 1.3, 512, 128, 62);
  const labG18 = label('第 18 族:稀有氣體', 'Group 18: noble gases', '#c9a7ff', 5.0, 1.0, 640, 128, 54);
  const labFull = label('最外層都是滿的!(氦 2 個、其他 8 個)', 'Outer shells are full! (He 2, others 8)', '#ffd23f', 8.2, 0.98, 1024, 128, 52);
  const labTag = label('示意圖:電子不是真的沿軌道跑', "Simplified: electrons don't really orbit like this", '#8fa0ff', 8.4, 0.95, 1024, 128, 54);
  const labBounce = label('彈開了,沒有結合!', 'They bounce apart: no bond!', '#7ee8a2', 6.2, 1.2, 640, 128, 56);
  const cntC = document.createElement('canvas'); cntC.width = 512; cntC.height = 128; const cntTex = new T.CanvasTexture(cntC); cntTex.colorSpace = T.SRGBColorSpace; let cntKey = '';
  const labCnt = new T.Sprite(new T.SpriteMaterial({ map: cntTex, transparent: true, depthWrite: false, toneMapped: false })); labCnt.visible = false; grp.add(labCnt);
  function drawCount(n) {
    const k = LANG() + n; if (k === cntKey) return; cntKey = k; const g = cntC.getContext('2d'); g.clearRect(0, 0, 512, 128);
    g.fillStyle = 'rgba(14,20,50,0.85)'; g.beginPath(); g.roundRect(4, 4, 504, 120, 30); g.fill(); g.lineWidth = 5; g.strokeStyle = '#ffe066'; g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 60px "Noto Sans TC","Microsoft JhengHei",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(LANG() === 'en' ? n + ' elements' : n + ' 個元素', 256, 66); cntTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- 原子(玻爾模型:原子核 + 細圓環殼層 + 小球電子,配色與 App 原子頁一致)
  const sphN = new T.SphereGeometry(1, 12, 8), sphG = new T.SphereGeometry(1, 16, 12), ringTubes = [];
  const eMat = new T.MeshStandardMaterial({ color: 0x4cc9ff, emissive: 0x1a6aa0, roughness: 0.3 }), vMat = new T.MeshStandardMaterial({ color: 0xffd23f, emissive: 0x9a7a00, roughness: 0.3 });
  const RING = 0x8fa0ff, GOLD = new T.Color(0xffd23f), ringBase = new T.Color(RING), SH0 = 0.75, SHD = 0.7, TILT = 1.0;
  function makeAtom(Z, shells) {
    const A = Math.round(Z * 2 + (Z === 11 ? 1 : (Z === 18 ? 4 : 0))), tilt = new T.Group(), root = new T.Group(); tilt.rotation.x = TILT; root.add(tilt); grp.add(root);
    const nuc = new T.InstancedMesh(sphN, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), A), d = new T.Object3D(), c = new T.Color(), rad = 0.1, packR = 0.09 * Math.cbrt(A) * 1.25;
    for (let k = 0; k < A; k++) {
      const phi = Math.acos(1 - 2 * ((k + 0.5) / A)), th = Math.PI * (1 + Math.sqrt(5)) * k, r = A === 1 ? 0 : packR * Math.cbrt((k + 0.5) / A) * (k % 2 ? 1 : 0.8);
      d.position.set(r * Math.sin(phi) * Math.cos(th), r * Math.sin(phi) * Math.sin(th), r * Math.cos(phi)); d.scale.setScalar(rad); d.updateMatrix(); nuc.setMatrixAt(k, d.matrix);
      nuc.setColorAt(k, c.set(Math.floor((k + 1) * Z / A) > Math.floor(k * Z / A) ? 0xff5a5a : 0xb0b6d0));   // 質子(紅)與中子(灰)混在一起
    }
    tilt.add(nuc);
    const rings = [], els = [];
    shells.forEach((n, i) => {
      const R = SH0 + SHD * i, sg = new T.Group(); sg.rotation.set(((i * 0.9) % 1.2 - 0.4) * 0.3, 0, ((i * 0.7) % 1.0 - 0.3) * 0.3); tilt.add(sg);
      const outer = i === shells.length - 1, rm = new T.MeshBasicMaterial({ color: RING, transparent: true, opacity: 0.55, toneMapped: false });
      const ring = new T.Mesh(new T.TorusGeometry(R, outer ? 0.028 : 0.018, 8, 96), rm); sg.add(ring); rings.push({ m: rm, outer });
      for (let k = 0; k < n; k++) { const m = new T.Mesh(sphG, outer && shells.length > 1 ? vMat : eMat); m.scale.setScalar(0.12); sg.add(m); els.push({ m, a0: (k / n) * Math.PI * 2 + i * 0.7, R, w: 1.3 / (1 + 0.55 * i) }); }
    });
    return {
      root, nuc, Z, outerR: SH0 + SHD * (shells.length - 1),
      set(x, y, z, s, time, full) {
        root.visible = s > 0.002; if (!root.visible) return; root.position.set(x, y, z); root.scale.setScalar(Math.max(s, 0.0001)); nuc.rotation.y = time * 0.4;
        els.forEach(e => { const a = e.a0 + e.w * time; e.m.position.set(Math.cos(a) * e.R, Math.sin(a) * e.R, 0); });
        rings.forEach(r => { if (r.outer && full !== undefined) { r.m.color.copy(ringBase).lerp(GOLD, full); r.m.opacity = 0.55 + 0.4 * full * (0.8 + 0.2 * Math.sin(time * 4)); } });
      },
    };
  }
  const aHe = makeAtom(2, [2]), aNe = makeAtom(10, [2, 8]), aAr = makeAtom(18, [2, 8, 8]), aNa = makeAtom(11, [2, 8, 1]);
  const AY = 5.5, AZ = 7, XHE = -4.6, XNE = -1.55, XAR = 3.0;
  const labHe = label('氦 He|電子 2', 'Helium|electrons 2', '#d9ffff', 2.3, 1.15, 440, 200, 66), labNe = label('氖 Ne|電子 2、8', 'Neon|electrons 2, 8', '#b3e3f5', 2.5, 1.2, 440, 200, 66), labAr = label('氬 Ar|電子 2、8、8', 'Argon|electrons 2, 8, 8', '#80d1e3', 2.7, 1.3, 440, 200, 66);
  const labNa = label('鈉 Na|電子 2、8、1', 'Sodium|electrons 2, 8, 1', '#ab5cf2', 2.7, 1.3, 440, 200, 66);
  const flash = new T.Sprite(new T.SpriteMaterial({ map: ctx.props.glowTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, color: 0xbfe6ff })); flash.visible = false; grp.add(flash);

  // ---------------------------------------------------------------- 小朋友指著最右邊一排
  const K = kid, sh = V(0, 0, 0), tg = V(0, 0, 0), hp = V(0, 0, 0);
  ctx.adult.root.visible = false;
  const KX = 9.2, KZ = 0.9, G18X = COL_X(18);

  // 鏡頭:每個關鍵影格 = [時間, 位置xyz, 看向xyz],之間用 ease 內插
  function camAt(t, keys) {
    const f = i => kf(t, keys.map(k => [k[0], k[i]]));
    return [f(1), f(2), f(3), f(4), f(5), f(6)];
  }

  function update(t, time) {
    const k = segIdx({ SEG, ST }, t), u = clamp((t - ST[k]) / SEG[k].d, 0, 1), D = SEG; const zf = cam.zoom || 1, tt = i => t - ST[i];
    // ---- 鏡頭
    const vWall = [1.2, 5.7, 16.6 * zf, 1.2, 5.0, 0], vCol = [6.1, 4.1, 11.4 * zf, 6.1, 4.1, 0], vAt = [0, AY + 0.8, AZ + 11 * zf, 0, AY, AZ], vBn = [6.6, AY + 0.8, AZ + 14 * zf, 6.6, AY, AZ];
    const key = (tm, v) => [tm, v[0], v[1], v[2], v[3], v[4], v[5]];
    const c = camAt(t, [key(ST[iCol], vWall), key(ST[iCol] + 1.6, vCol), key(ST[iAtoms], vCol), key(ST[iAtoms] + 1.8, vAt), key(ST[iBounce], vAt), key(ST[iBounce] + 1.4, vBn), key(ST[iEnd], vBn), key(ST[iEnd] + 1.8, vWall)]);
    const sway = Math.sin(time * 0.3) * 0.25; cam.position.set(c[0] + sway, c[1], c[2]); cam.lookAt(c[3], c[4], c[5]);
    hemi.intensity = 0.95 * LI; keyL.intensity = 1.5 * LI;

    // ---- 牆:格子依原子序一個一個彈出來(場景效果);計數牌
    const popStart = ST[iCount] + 0.3, popSpan = Math.max(1, D[iCount].d - 1.8);
    const hiCol = kf(t, [[ST[iCol], 0], [ST[iCol] + 1.1, 1], [ST[iEnd] + 0.5, 1]]);
    const dim = 0.62 * kf(t, [[ST[iCol], 0], [ST[iCol] + 1.1, 1], [ST[iEnd] + 0.2, 1], [ST[iEnd] + 2.2, 0]]);
    const wallA = kf(t, [[ST[iAtoms], 1], [ST[iAtoms] + 1.0, 0.07], [ST[iEnd], 0.07], [ST[iEnd] + 1.6, 1]]);
    let nShown = 0;
    cells.forEach((cl, i) => {
      const ts = popStart + (cl.z / 118) * popSpan, sc = popS(t - ts); if (!cl.ph && sc > 0.5) nShown++;
      const g18 = isG18(cl), hi = g18 ? hiCol : 0, bright = (1 - dim * (g18 ? 0 : 1)) * (1 + 0.45 * hi * (0.85 + 0.15 * Math.sin(time * 4)));
      dummy.position.set(COL_X(cl.col), ROW_Y(cl.row), TD * 0.0 + 0.3 * hi); dummy.scale.setScalar(Math.max(sc * (1 + 0.1 * hi), 0.0001)); dummy.updateMatrix(); tiles.setMatrixAt(i, dummy.matrix);
      tiles.setColorAt(i, tmpC.copy(baseCol[i]).multiplyScalar(bright));
    });
    tiles.instanceMatrix.needsUpdate = true; tiles.instanceColor.needsUpdate = true; floor.visible = wallA > 0.5; tileMat.opacity = wallA; plateMat.opacity = wallA; tiles.visible = plate.visible = wallA > 0.01;
    const wallOn = t < ST[iAtoms] + 1 || t > ST[iEnd];
    // 光柱:第 18 族(第 1~7 列);結尾的掃描光從最左邊掃到最右邊(提醒小朋友自己去找找看)
    beam.visible = hiCol > 0.01 && wallOn; beam.position.set(G18X, (ROW_Y(1) + ROW_Y(7)) / 2, -0.02); beam.scale.set(1, 7 * P + 0.5, 1); beam.material.opacity = hiCol * wallA * (0.85 + 0.15 * Math.sin(time * 4));
    const sx = kf(t, [[ST[iEnd] + 0.7, COL_X(1)], [ST[iEnd] + 0.7 + Math.max(1.2, D[iEnd].d * 0.55), COL_X(18)]]), sa = ramp(t, ST[iEnd] + 0.7, ST[iEnd] + 1.1, ST[iEnd] + 0.7 + Math.max(1.2, D[iEnd].d * 0.55) - 0.2, ST[iEnd] + 0.7 + Math.max(1.2, D[iEnd].d * 0.55));
    scan.visible = sa > 0.01; scan.position.set(sx, 4.8, 0.2); scan.scale.set(1, 9.6, 1); scan.material.opacity = sa * 0.55;
    // 標籤
    showLabel(labTitle, k === iIntro ? popS(t - 0.3) : 0, 0, 9.95, 0.2);
    drawCount(Math.min(nShown, 118)); labCnt.visible = k === iCount || (k === iCol && tt(iCol) < 1); { const a = k === iCount ? ease(clamp(tt(iCount) / 0.4, 0, 1)) : (1 - ease(tt(iCol) / 1.0)); labCnt.material.opacity = a; labCnt.scale.set(4.4, 1.1, 1); labCnt.position.set(0, 9.95, 0.2); if (a <= 0.01) labCnt.visible = false; }
    showLabel(labG18, k === iCol ? ease(clamp((tt(iCol) - 0.9) / 0.5, 0, 1)) : (k === iEnd ? 1 - ease(tt(iEnd) / 0.5) : 0), G18X - 1.6, ROW_Y(1) + 1.25, 0.6);

    // ---- 原子:氦、氖、氬(滿的殼層)→ 鈉撞上氬
    const aIn = i => popS(t - (ST[iAtoms] + 0.9 + i * 0.3));
    const full = kf(t, [[ST[iAtoms] + 2.8, 0], [ST[iAtoms] + 4.0, 1]]);
    const gone = ease(clamp((t - ST[iEnd] - 0.1) / 0.6, 0, 1)), left = ease(clamp((t - ST[iBounce]) / 0.5, 0, 1));
    const inAtoms = k === iAtoms || k === iBounce || (k === iEnd && gone < 1);
    const tc = 0.5 * D[iBounce].d, vAr = 1.8 / tc, vNa = vAr * 40 / 23, tb = k >= iBounce ? t - ST[iBounce] : 0;
    // 彈性碰撞(質心系靜止、動量守恆):撞前氬往右 vAr、鈉往左 vNa(23·vNa = 40·vAr);撞後兩者速度反向,動能不變
    let xAr = XAR, xNa = 9.2 + vNa * tc, nowTb = k >= iBounce ? tb : 0;
    if (k >= iBounce) { xAr = nowTb < tc ? XAR + vAr * nowTb : XAR + 1.8 - vAr * (nowTb - tc); xNa = nowTb < tc ? 9.2 + vNa * (tc - nowTb) : 9.2 + vNa * (nowTb - tc); }
    if (k === iEnd) { const te = D[iBounce].d; xAr = XAR + 1.8 - vAr * (te - tc); xNa = 9.2 + vNa * (te - tc); }
    const sEnd = inAtoms ? 1 - gone : 0;
    aHe.set(XHE, AY, AZ, aIn(0) * (1 - left) * sEnd, time, full); aNe.set(XNE, AY, AZ, aIn(1) * (1 - left) * sEnd, time, full); aAr.set(xAr, AY, AZ, aIn(2) * sEnd, time, full);
    const naS = k >= iBounce ? popS(t - (ST[iBounce] + 0.3)) * sEnd : 0; aNa.set(xNa, AY, AZ, naS, time);
    const lx = c[3];                                                   // 標籤跟著鏡頭中心
    showLabel(labTag, (k === iAtoms || k === iBounce) ? ease(clamp(tt(k) / 0.6, 0, 1)) * (k === iAtoms ? ease(clamp((t - ST[iAtoms] - 0.7) / 0.5, 0, 1)) : 1) : (k === iEnd ? 1 - gone : 0), lx, AY + 3.75, AZ);
    showLabel(labFull, k === iAtoms ? ease(clamp((t - ST[iAtoms] - 2.8) / 0.6, 0, 1)) : 0, lx, AY + 2.7, AZ, 1 + 0.03 * Math.sin(time * 5));
    const lab = (s, a, x) => showLabel(s, a, x, AY - 2.45, AZ);
    lab(labHe, k === iAtoms ? ease(clamp((t - ST[iAtoms] - 1.4) / 0.4, 0, 1)) : 0, XHE); lab(labNe, k === iAtoms ? ease(clamp((t - ST[iAtoms] - 1.7) / 0.4, 0, 1)) : 0, XNE);
    lab(labAr, k === iAtoms ? ease(clamp((t - ST[iAtoms] - 2.0) / 0.4, 0, 1)) : (k === iBounce && tb < tc + 0.1 ? 1 : 0), k === iAtoms ? XAR : xAr);
    lab(labNa, k === iBounce && tb > 0.7 && tb < tc + 0.1 ? ease(clamp((tb - 0.7) / 0.4, 0, 1)) : 0, xNa);
    showLabel(labBounce, k === iBounce ? ease(clamp((tb - tc - 0.3) / 0.5, 0, 1)) : 0, lx, AY + 2.7, AZ);
    // 撞到的瞬間:一閃(兩個原子外層電子互相排斥)
    const tf = tb - tc, fl = k === iBounce && tf > -0.05 && tf < 0.5 ? 1 - Math.abs(tf - 0.1) / 0.4 : 0; flash.visible = fl > 0.01;
    if (flash.visible) { flash.position.set(XAR + 1.8 + 2.2, AY, AZ + 0.5); flash.scale.setScalar(2.2 + 2.0 * (1 - fl)); flash.material.opacity = clamp(fl, 0, 1); }

    // ---- 小朋友:招手、看著牆、指向最右邊一排、結尾跳起來
    K.root.visible = t < ST[iAtoms] + 0.2 || t > ST[iEnd] + 0.6;
    K.root.position.set(KX, 0, KZ); K.root.rotation.y = -0.45 - 0.75 * (k === iCol ? ramp(u, 0, 0.2, 0.92, 1) : 0);
    const hs = k === iEnd ? ctx.hopState(time, 0.26) : { crouch: 0, lift: 0, foot: 0 };
    K.solve(() => {
      K.base(time, 1.1); K.root.updateMatrixWorld(true);
      if (k === iIntro) K.wave(1, time);
      if (k === iCount) K.chest(1);
      if (k === iCol) {
        const ty = lerp(ROW_Y(7), ROW_Y(5), mj(clamp((u - 0.3) / 0.6, 0, 1)));
        tg.set(G18X, ty, 0.3); K.shoulder(-1, sh); hp.copy(tg).sub(sh).normalize().multiplyScalar(0.86).add(sh); K.reach(-1, hp, ramp(u, 0.05, 0.22, 0.9, 1.0));
      }
      if (k === iEnd) { K.cheer(1, time); K.cheer(-1, time); }
    }, { crouch: hs.crouch, lift: hs.lift, footL: hs.foot, footR: hs.foot });
    tg.set(k === iCol ? G18X : 0, k === iCol ? lerp(ROW_Y(7), ROW_Y(5), mj(clamp((u - 0.3) / 0.6, 0, 1))) : 5.5, 0.3); K.look(k === iIntro || k === iEnd ? cam.position : tg, 0.9);
    if (k === iEnd) K.mouth('smile');
  }
  return { grp, SEG, ST, update, title: E.titleZh, leg: E.legZh, room: false, people: true };
}
