// 實驗動畫預覽(審稿頁用):人物是方塊風,其他物件(杯子、燒杯、蠟燭、火焰、液體、煙)都用圓滑的幾何與材質。
// three r128(cdnjs 的 UMD 版)。正式版會用專案裡的 three 0.187.0,做法相同,只是顏色空間的設定名稱不同。
(function () {
  var host = document.getElementById('proto'), T = window.THREE;
  if (!host || !T) return;
  var EXP = window.__EXP; if (!EXP) return;                  // 實驗腳本(步驟、字幕、與故事的對照)來自 exp-scripts.json
  var _setHex = T.Color.prototype.setHex; T.Color.prototype.setHex = function (h) { _setHex.call(this, h); return this.convertSRGBToLinear(); };   // r128:hex 是 sRGB,要轉線性(新版 three 會自動處理)
  var W = Math.max(300, host.clientWidth || 700), H = Math.round(W * 0.6), r;
  try { r = new T.WebGLRenderer({ antialias: true }); } catch (e) { return; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.setSize(W, H);
  r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
  host.insertBefore(r.domElement, host.firstChild); r.domElement.style.width = '100%'; r.domElement.style.height = 'auto';
  document.getElementById('p-note').textContent = '3D 預覽已載入。上方可切換兩個實驗;可以暫停、拖動進度條。';

  var BENCH = 1.75, ENV = null, LANG = 'zh';                                        // 桌面高度
  var scene = new T.Scene(), cam = new T.PerspectiveCamera(40, W / H, 0.1, 80);
  scene.fog = new T.Fog(0x1a2350, 16, 30);
  var ease = function (u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, u) { return a + (b - a) * u; };
  var seg01 = function (t, a, b) { return clamp((t - a) / (b - a), 0, 1); };
  function kf(t, keys) {                                    // 關鍵影格內插 [[秒, 值], ...](值之間用 ease)
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], ease((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
    return keys[keys.length - 1][1];
  }
  function canvasTex(w, h, draw, srgb) { var c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t; }

  // ---------------------------------------------------------------- 環境(反射用)與燈光
  (function env() {
    var es = new T.Scene();
    es.add(new T.Mesh(new T.SphereGeometry(20, 24, 16), new T.MeshBasicMaterial({ side: T.BackSide, map: canvasTex(4, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#eaf2ff'); gr.addColorStop(0.5, '#6f86c8'); gr.addColorStop(1, '#202a55'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, true) })));
    function panel(x, y, z, w, h, c) { var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); }
    panel(-9, 9, 8, 7, 4, 0xffffff); panel(10, 6, 4, 3, 8, 0xfff2dd); panel(0, 12, -2, 9, 3, 0xe8f0ff);
    var pm = new T.PMREMGenerator(r); ENV = pm.fromScene(es, 0.03).texture;
  })();
  var hemi = new T.HemisphereLight(0xdfe8ff, 0x4a3a5a, 0.85); scene.add(hemi);
  var key = new T.DirectionalLight(0xfff4e0, 2.0); key.position.set(5, 11, 7); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 8; key.shadow.camera.bottom = -4; key.shadow.camera.far = 30; key.shadow.bias = -0.0006; key.shadow.radius = 4;
  scene.add(key); scene.add(key.target); key.target.position.set(0, 1, 0);
  var rim = new T.DirectionalLight(0x8fb0ff, 0.7); rim.position.set(-6, 5, -6); scene.add(rim);

  // ---------------------------------------------------------------- 房間、桌子
  (function room() {
    var wall = new T.Mesh(new T.PlaneGeometry(40, 20), new T.MeshBasicMaterial({ map: canvasTex(4, 256, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2d3f86'); gr.addColorStop(1, '#17214d'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, true), fog: false }));
    wall.position.set(0, 6, -8); scene.add(wall);
    var floor = new T.Mesh(new T.CircleGeometry(14, 64), new T.MeshStandardMaterial({ color: 0x1d2a5c, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    var wood = canvasTex(512, 256, function (g, w, h) { g.fillStyle = '#b87a43'; g.fillRect(0, 0, w, h); for (var i = 0; i < 90; i++) { g.strokeStyle = 'rgba(' + (90 + Math.random() * 40) + ',55,20,' + (0.08 + Math.random() * 0.12) + ')'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); var y = Math.random() * h; g.moveTo(0, y); for (var x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 3); g.stroke(); } }, true);
    var top = new T.Mesh(new T.BoxGeometry(9.4, 0.2, 2.0), new T.MeshStandardMaterial({ map: wood, roughness: 0.55, metalness: 0 })); top.position.set(0, BENCH - 0.1, 0.45); top.castShadow = top.receiveShadow = true; scene.add(top);
    var body = new T.Mesh(new T.BoxGeometry(9, BENCH - 0.2, 1.8), new T.MeshStandardMaterial({ color: 0x3d5a9e, roughness: 0.75 })); body.position.set(0, (BENCH - 0.2) / 2, 0.45); body.castShadow = body.receiveShadow = true; scene.add(body);
    [-2.2, 2.2].forEach(function (x) { var d = new T.Mesh(new T.BoxGeometry(3.6, 1.05, 0.06), new T.MeshStandardMaterial({ color: 0x4a6bb3, roughness: 0.7 })); d.position.set(x, 0.75, 1.36); scene.add(d); var k = new T.Mesh(new T.SphereGeometry(0.07, 12, 8), new T.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.7, roughness: 0.3 })); k.position.set(x + (x < 0 ? 1.5 : -1.5), 0.95, 1.42); scene.add(k); });
  })();

  // ---------------------------------------------------------------- 骨架人偶 + 方塊外皮
  // 做法:先建「骨架」(骨頭、關節、活動範圍、質量),所有動作只作用在骨架上;方塊外皮只是掛在骨頭上的皮,不影響動作。
  // 關節(依解剖):肩/髖 = 球窩關節(仰角、運動面、軸向旋轉,和 ISB 肩關節的描述一樣);手肘/膝 = 單軸鉸鏈(只能向一個方向彎);
  //   脊椎與頸 = 小範圍的前屈/側彎/扭轉。每個關節都有活動範圍,超出會被限制並記錄一次「超限」。
  // 物理:重力 g = 9.8 m/s²,依比例換算(1 單位 ≈ 0.46 m);每一節有質量,算全身重心,伸手時骨盆後移、脊椎前傾來平衡;
  //   腳踩在地上不滑動(腿用反向運動);跳躍用拋物線(重力)加蹲下、蹬起、落地緩衝;手臂移動用「最小急跳」軌跡(人手的鐘形速度曲線)。
  var UNIT_M = 0.46, G = 9.8 / UNIT_M;
  var D2R = Math.PI / 180, UPV = new T.Vector3(0, 1, 0), DOWNV = new T.Vector3(0, -1, 0), AXX = new T.Vector3(1, 0, 0);
  var viol = { n: 0, last: '' }, REACH = { err: 0, what: '' };
  function jl(name, v, lo, hi) { if (v < lo - 1e-4 || v > hi + 1e-4) { viol.n++; viol.last = name + ' ' + Math.round(v / D2R) + '°'; } return clamp(v, lo, hi); }   // 弧度;超出範圍就限制並記一次
  function mj(u) { u = clamp(u, 0, 1); return u * u * u * (10 - 15 * u + 6 * u * u); }          // 最小急跳軌跡(鐘形速度)
  var ROM = {
    shEl: [0, 175 * D2R], shPl: [-60 * D2R, 135 * D2R], shRot: [-80 * D2R, 100 * D2R],            // 肩:仰角 0~175°、運動面 -60~135°(負 = 橫過身體)、軸向旋轉 -80~100°
    hipEl: [0, 120 * D2R], hipPl: [-30 * D2R, 150 * D2R], hipRot: [-45 * D2R, 45 * D2R],          // 髖:屈 120°、外展 45°、伸 20°、旋轉 ±45°
    elbow: [0, 150 * D2R], knee: [0, 140 * D2R],                                                  // 手肘、膝:只能彎(0~150° / 0~140°),不能反折
    spFlex: [-20 * D2R, 45 * D2R], spLat: [-25 * D2R, 25 * D2R], spTw: [-40 * D2R, 40 * D2R],      // 脊椎:前屈 45°、後伸 20°、側彎 ±25°、扭轉 ±40°
    nkFlex: [-45 * D2R, 45 * D2R], nkLat: [-35 * D2R, 35 * D2R], nkTw: [-70 * D2R, 70 * D2R]      // 頸
  };
  var pixCache = {};
  function pix(v) {                                          // 8×8 的像素雜訊貼圖,讓方塊有像素感(最近點取樣)
    var k = String(v); if (pixCache[k]) return pixCache[k];
    var t = canvasTex(8, 8, function (g) { for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) { var s = Math.round(255 * (1 - v * Math.random())); g.fillStyle = 'rgb(' + s + ',' + s + ',' + s + ')'; g.fillRect(x, y, 1, 1); } }, true);
    t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; return (pixCache[k] = t);
  }
  var qA = new T.Quaternion(), qB = new T.Quaternion(), qS = new T.Quaternion(), vA = new T.Vector3(), vB = new T.Vector3(), vC = new T.Vector3(), vP = new T.Vector3(), vH = new T.Vector3(), vE = new T.Vector3(), vF = new T.Vector3(), vU = new T.Vector3();
  var xa = new T.Vector3(), ya = new T.Vector3(), za = new T.Vector3(), M4 = new T.Matrix4(), EUL = new T.Euler();
  function ballQ(s, th, ph, rho) {                           // 球窩關節的朝向:先在自己的長軸上轉 rho,再把手臂擺到 (仰角 th, 運動面 ph)
    vA.set(s * Math.sin(th) * Math.sin(ph), -Math.cos(th), Math.sin(th) * Math.cos(ph));
    qS.setFromUnitVectors(DOWNV, vA); qB.setFromAxisAngle(UPV, s * rho);
    return new T.Quaternion().multiplyQuaternions(qS, qB);
  }
  var SOL = { q: null, u: null, psi: 0 };
  function twoBone(L1, L2, v0, poleDir, hingeSign) {         // 兩節肢體的反向運動:v0 = 從關節根到目標的向量;回傳上段方向、手肘/膝彎曲角、上段完整朝向(x 軸 = 鉸鏈軸)
    var d = clamp(v0.length(), 0.25, L1 + L2 - 0.002); vH.copy(v0).normalize();
    var ca = (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    vP.copy(poleDir); vP.addScaledVector(vH, -vP.dot(vH)); if (vP.lengthSq() < 1e-4) vP.set(0, -1, 0); vP.normalize();
    vE.copy(vH).multiplyScalar(ca).addScaledVector(vP, sa).multiplyScalar(L1);          // 手肘/膝的位置
    vU.copy(vE).normalize(); vF.copy(vH).multiplyScalar(d).sub(vE).normalize();
    SOL.psi = Math.acos(clamp(vU.dot(vF), -1, 1));
    xa.crossVectors(vU, vF); if (xa.lengthSq() < 1e-6) xa.crossVectors(vU, vP); xa.normalize(); if (hingeSign < 0) xa.negate();
    ya.copy(vU).negate(); za.crossVectors(xa, ya); M4.makeBasis(xa, ya, za);
    SOL.q = new T.Quaternion().setFromRotationMatrix(M4); SOL.u = vU.clone(); return SOL;
  }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function ballFromSol(s) {                                  // 把 IK 解轉成 (仰角, 運動面, 旋轉)
    var u = SOL.u, th = Math.acos(clamp(-u.y, -1, 1)), ph = Math.atan2(s * u.x, u.z);
    qA.copy(ballQ(s, th, ph, 0)).invert(); qB.multiplyQuaternions(qA, SOL.q);               // 剩下的就是繞長軸的旋轉
    var rho = s * wrap(2 * Math.atan2(qB.y, qB.w)); return { th: th, ph: ph, rho: rho };
  }
  var POLE_KNEE = new T.Vector3(0, 0, 1);

  function makeRig(o) {
    var root = new T.Group(); root.scale.setScalar(o.scale); scene.add(root);
    function node(parent, x, y, z) { var n = new T.Group(); n.position.set(x, y, z); parent.add(n); return n; }
    var pelvis = node(root, 0, 1.0, 0), spine = node(pelvis, 0, 0, 0), neck = node(spine, 0, 1.0, 0);   // 骨盆在髖關節的高度;脊椎在骨盆;頸在脊椎上端
    var arms = {}, legs = {};
    [-1, 1].forEach(function (s) {
      var ua = node(spine, s * 0.56, 0.95, 0), fa = node(ua, 0, -0.5, 0);                              // 肩 → 上臂 → 手肘 → 前臂
      var th = node(pelvis, s * 0.19, 0, 0), sh = node(th, 0, -0.5, 0), ft = node(sh, 0, -0.38, 0);    // 髖 → 大腿 → 膝 → 小腿 → 踝(離地 0.12)
      ua.userData.ang = { th: 0, ph: 0, rho: 0 }; fa.userData.ang = 0; arms[s] = { ua: ua, fa: fa }; legs[s] = { th: th, sh: sh, ft: ft };
    });
    var R = { root: root, pelvis: pelvis, spine: spine, neck: neck, arms: arms, legs: legs, lean: 0, reachLog: [], scale: o.scale };

    // ---- 關節
    R.setBall = function (kind, s, th, ph, rho) {
      var sh = kind === 'sh', el = sh ? ROM.shEl : ROM.hipEl, pl = sh ? ROM.shPl : ROM.hipPl, rt = sh ? ROM.shRot : ROM.hipRot, extPh = sh ? 115 * D2R : 100 * D2R, extTh = sh ? 50 * D2R : 20 * D2R;
      th = jl(kind + ' 仰角', th, el[0], Math.min(el[1], 178 * D2R));
      if (th > 4 * D2R) { if (ph > extPh && th > extTh) { viol.n++; viol.last = kind + ' 後伸過頭'; ph = extPh; } ph = jl(kind + ' 運動面', ph, pl[0], pl[1]); }
      rho = jl(kind + ' 旋轉', rho, rt[0], rt[1]);
      var bone = sh ? arms[s].ua : legs[s].th; bone.quaternion.copy(ballQ(s, th, ph, rho)); bone.userData.ang = { th: th, ph: ph, rho: rho };
    };
    R.setElbow = function (s, fl) { fl = jl('手肘', fl, ROM.elbow[0], ROM.elbow[1]); arms[s].fa.quaternion.setFromAxisAngle(AXX, -fl); arms[s].fa.userData.ang = fl; };   // 只能向前彎
    R.setKnee = function (s, fl) { fl = jl('膝', fl, ROM.knee[0], ROM.knee[1]); legs[s].sh.quaternion.setFromAxisAngle(AXX, fl); };                                  // 只能向後彎
    R.setSpine = function (flex, lat, tw) { spine.quaternion.setFromEuler(EUL.set(jl('脊椎前屈', flex, ROM.spFlex[0], ROM.spFlex[1]), jl('脊椎扭轉', tw, ROM.spTw[0], ROM.spTw[1]), -jl('脊椎側彎', lat, ROM.spLat[0], ROM.spLat[1]), 'ZXY')); };
    R.setNeck = function (flex, lat, tw) { neck.quaternion.setFromEuler(EUL.set(jl('頸前屈', flex, ROM.nkFlex[0], ROM.nkFlex[1]), jl('頸扭轉', tw, ROM.nkTw[0], ROM.nkTw[1]), -jl('頸側彎', lat, ROM.nkLat[0], ROM.nkLat[1]), 'ZXY')); };

    // ---- 外皮(方塊):只掛在骨頭上
    function M(c, v) { return new T.MeshStandardMaterial({ color: c, map: pix(v == null ? 0.12 : v), roughness: 0.95 }); }
    function B(w, h, d, m, x, y, z, p) { var b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.receiveShadow = true; p.add(b); return b; }
    var skin = M(o.skin, 0.06), dark = new T.MeshStandardMaterial({ color: 0x1b1b24, roughness: 0.8 }), white = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    var legM = M(o.pants), shoeM = M(o.shoe, 0.1), bodyM = M(o.shirt), sleeveM = M(o.kind === 'adult' ? 0xf7f9ff : o.shirt, 0.05);
    B(0.76, 0.3, 0.42, legM, 0, 0, 0, pelvis);
    [-1, 1].forEach(function (s) { var L = legs[s]; B(0.35, 0.5, 0.37, legM, 0, -0.25, 0, L.th); B(0.34, 0.38, 0.36, legM, 0, -0.19, 0, L.sh); B(0.38, 0.24, 0.52, shoeM, 0, 0, 0.07, L.ft); });
    R.torso = B(0.76, 0.86, 0.42, bodyM, 0, 0.58, 0, spine);
    if (o.kind === 'adult') {                                // 白色實驗袍、裡面的藍衣服、領子、口袋
      B(0.82, 1.06, 0.46, M(0xf7f9ff, 0.05), 0, 0.5, 0, spine); B(0.05, 1.0, 0.02, dark, 0, 0.5, 0.24, spine); B(0.2, 0.2, 0.02, M(0xdfe6f5, 0.05), -0.22, 0.2, 0.24, spine); B(0.2, 0.2, 0.02, M(0xdfe6f5, 0.05), 0.22, 0.2, 0.24, spine);
      B(0.28, 0.2, 0.3, M(0x3a6fd8), 0, 0.97, 0.04, spine); B(0.18, 0.1, 0.1, M(0xf7f9ff, 0.05), -0.2, 1.0, 0.24, spine); B(0.18, 0.1, 0.1, M(0xf7f9ff, 0.05), 0.2, 1.0, 0.24, spine);
    } else { B(0.5, 0.22, 0.02, M(0xc23a2a), 0, 0.25, 0.22, spine); B(0.14, 0.14, 0.14, M(0xc23a2a), 0, 1.0, -0.22, spine); }
    [-1, 1].forEach(function (s) {                           // 手臂:上臂、手肘關節(方塊)、前臂(袖子 + 手)
      var A = arms[s]; B(0.32, 0.5, 0.32, sleeveM, 0, -0.25, 0, A.ua); B(0.3, 0.3, 0.3, sleeveM, 0, 0, 0, A.fa); B(0.32, 0.3, 0.32, sleeveM, 0, -0.17, 0, A.fa); B(0.28, 0.24, 0.28, skin, 0, -0.38, 0, A.fa);
    });
    var head = neck;                                         // 頭掛在頸上(頭骨中心高 0.35)
    B(0.7, 0.7, 0.7, skin, 0, 0.35, 0, head);
    var hairM = M(o.hair, 0.1);
    B(0.76, 0.2, 0.76, hairM, 0, 0.74, 0, head); B(0.76, 0.5, 0.12, hairM, 0, 0.5, -0.32, head); B(0.1, 0.4, 0.7, hairM, -0.34, 0.55, 0, head); B(0.1, 0.4, 0.7, hairM, 0.34, 0.55, 0, head); B(0.5, 0.14, 0.06, hairM, o.kind === 'adult' ? -0.08 : 0, 0.66, 0.36, head);
    if (o.kind === 'kid') { B(0.8, 0.2, 0.8, M(0xffd23f), 0, 0.82, 0, head); B(0.62, 0.06, 0.4, M(0xe9b800), 0, 0.74, 0.55, head); }
    var ez = 0.355; R.eyes = []; R.brows = [];
    [-0.17, 0.17].forEach(function (x) {
      var e = new T.Group(); e.position.set(x, 0.38, ez); head.add(e); B(0.17, 0.15, 0.02, white, 0, 0, 0, e); B(0.08, 0.11, 0.02, dark, x < 0 ? 0.03 : -0.03, 0, 0.01, e); R.eyes.push(e);
      R.brows.push(B(0.19, 0.045, 0.02, new T.MeshStandardMaterial({ color: o.hair, roughness: 1 }), x, 0.52, ez, head));
    });
    B(0.1, 0.1, 0.04, M(o.skin, 0.2), 0, 0.27, 0.37, head);
    R.smile = new T.Group(); R.smile.position.set(0, 0.12, ez); head.add(R.smile);
    B(0.22, 0.05, 0.02, dark, 0, 0, 0, R.smile); B(0.05, 0.05, 0.02, dark, -0.13, 0.04, 0, R.smile); B(0.05, 0.05, 0.02, dark, 0.13, 0.04, 0, R.smile);
    R.oh = B(0.12, 0.14, 0.02, new T.MeshStandardMaterial({ color: 0x5a1f2a, roughness: 0.8 }), 0, 0.1, ez, head); R.oh.visible = false;
    if (o.kind === 'adult') {
      var fr = new T.MeshStandardMaterial({ color: 0x222a40, roughness: 0.4, metalness: 0.4 });
      [-0.17, 0.17].forEach(function (x) { B(0.27, 0.03, 0.03, fr, x, 0.47, 0.375, head); B(0.27, 0.03, 0.03, fr, x, 0.29, 0.375, head); B(0.03, 0.2, 0.03, fr, x - 0.12, 0.38, 0.375, head); B(0.03, 0.2, 0.03, fr, x + 0.12, 0.38, 0.375, head); });
      B(0.1, 0.03, 0.03, fr, 0, 0.42, 0.375, head);
    }
    R.mouth = function (m) { R.smile.visible = m !== 'oh'; R.oh.visible = m === 'oh'; };
    R.blink = function (time, off) { var f = ((time + off) % 3.4) / 3.4, k = f < 0.04 ? 0.1 : 1; R.eyes.forEach(function (e) { e.scale.y = k; }); };

    // ---- 站姿(每次都從這裡開始,再疊上動作)
    R.base = function (time, off) {
      var br = Math.sin(time * 1.8 + off);
      [-1, 1].forEach(function (s) { R.setBall('sh', s, (7 + 1.5 * Math.sin(time * 1.3 + off + s)) * D2R, 80 * D2R, 0); R.setElbow(s, (14 + 2 * Math.sin(time * 1.3 + off + s + 1)) * D2R); });
      R.setSpine(R.lean + 2 * D2R, 0, 0); R.setNeck(0, 0, 0); R.torso.scale.y = 1 + 0.012 * br; R.mouth('smile'); R.blink(time, off);
    };
    // ---- 動作(都只改關節角度,有範圍限制)
    R.chest = function (s) { R.setBall('sh', s, 42 * D2R, 20 * D2R, 0); R.setElbow(s, 100 * D2R); };                     // 兩手舉在胸前
    R.wave = function (s, time) {                                                                                          // 揮手:大臂(肩膀)外展約 132° 左右擺動,手肘彎 29~57°、比大臂慢半拍,前臂被帶動
      var w = time * 6.5; R.setBall('sh', s, (132 + 14 * Math.sin(w)) * D2R, 80 * D2R, 14 * Math.sin(w + 0.4) * D2R); R.setElbow(s, (43 + 14 * Math.sin(w - 0.9)) * D2R);
      R.setSpine(R.lean + 2 * D2R, -s * 2.5 * D2R * Math.sin(w), 0);
    };
    R.cheer = function (s, time) { var w = time * 9; R.setBall('sh', s, (150 + 8 * Math.sin(w)) * D2R, 72 * D2R, 0); R.setElbow(s, (35 + 14 * Math.sin(w - 0.7)) * D2R); };
    R.hand = function (s, out) { return arms[s].fa.localToWorld(out.set(0, -0.47, 0)); };                                // 手的世界座標(需先 updateMatrixWorld)
    R.shoulder = function (s, out) { return arms[s].ua.localToWorld(out.set(0, 0, 0)); };
    R.reach = function (s, target, w) {                      // 手盡量碰到世界座標 target(w = 0~1 的混合權重);手肘鉸鏈 + 肩膀旋轉決定手肘朝哪彎
      if (w <= 0.001) return; root.updateMatrixWorld(true); R.reachLog.push([s, target.clone(), w]);
      var A = arms[s]; vB.copy(target); spine.worldToLocal(vB); vB.sub(A.ua.position);
      twoBone(0.5, 0.5, vB, vC.set(s * 0.7, -1, -0.25), -1);
      var b = ballFromSol(s), cur = A.ua.userData.ang, ce = A.fa.userData.ang;
      R.setBall('sh', s, lerp(cur.th, b.th, w), lerp(cur.ph, b.ph, w), cur.rho + wrap(b.rho - cur.rho) * w); R.setElbow(s, lerp(ce, SOL.psi, w));
    };
    // ---- 腳踩地(腿 IK)、腳掌保持水平
    R.legsSolve = function (liftL, liftR) {
      [-1, 1].forEach(function (s) {
        var L = legs[s], lift = s < 0 ? liftL : liftR;
        vB.set(s * 0.19, 0.12 + lift, 0).sub(pelvis.position).sub(vC.set(s * 0.19, 0, 0));
        twoBone(0.5, 0.38, vB, POLE_KNEE, 1);
        var b = ballFromSol(s); R.setBall('hip', s, b.th, b.ph, b.rho); R.setKnee(s, SOL.psi);
        qA.copy(L.th.quaternion).multiply(L.sh.quaternion); L.ft.quaternion.copy(qA).invert();
      });
    };
    // ---- 重心(各節質量加權,在根座標)
    var COM = new T.Vector3();
    R.com = function () {
      root.updateMatrixWorld(true); COM.set(0, 0, 0); var tot = 0;
      function add(n, ox, oy, oz, m) { vA.set(ox, oy, oz); n.localToWorld(vA); root.worldToLocal(vA); COM.addScaledVector(vA, m); tot += m; }
      add(pelvis, 0, 0, 0, 0.12); add(spine, 0, 0.55, 0, 0.36); add(neck, 0, 0.35, 0, 0.08);
      [-1, 1].forEach(function (s) { add(arms[s].ua, 0, -0.25, 0, 0.028); add(arms[s].fa, 0, -0.25, 0, 0.022); add(legs[s].th, 0, -0.25, 0, 0.1); add(legs[s].sh, 0, -0.19, 0, 0.045); add(legs[s].ft, 0, 0, 0.05, 0.015); });
      return COM.multiplyScalar(1 / tot);
    };
    // ---- 解:先擺手 → 算重心 → 骨盆往反方向移、脊椎前傾平衡 → 重擺手 → 腿踩地。applyFn 負責設定所有手臂動作(會被呼叫兩次)。
    R.solve = function (applyFn, o2) {
      o2 = o2 || {}; var crouch = o2.crouch || 0, lift = o2.lift || 0;
      R.lean = 0; pelvis.position.set(0, 1.0 - crouch + lift, 0); R.reachLog.length = 0; applyFn();
      var c = R.com(), ox = clamp(-0.9 * c.x, -0.3, 0.3), oz = clamp(-0.9 * (c.z - 0.05), -0.4, 0.4);
      pelvis.position.set(ox, 1.0 - crouch + lift, oz); R.lean = clamp(-oz * 45, 0, 16) * D2R;   // 手往前伸 → 重心前移 → 骨盆後移、上身前傾
      R.reachLog.length = 0; applyFn();
      R.legsSolve(o2.footL || 0, o2.footR || 0); root.updateMatrixWorld(true);
      R.reachLog.forEach(function (rl) { if (rl[2] < 0.95) return; R.hand(rl[0], vA); var e = vA.distanceTo(rl[1]); if (e > REACH.err) { REACH.err = e; REACH.what = '手 ' + rl[0]; } });
    };
    R.look = function (target, w) {                          // 頭轉向目標(頸的活動範圍內),需先 solve
      root.updateMatrixWorld(true); vA.copy(target); neck.parent.worldToLocal(vA); vA.sub(neck.position);
      var yaw = Math.atan2(vA.x, vA.z), pit = Math.atan2(-(vA.y - 0.35), Math.sqrt(vA.x * vA.x + vA.z * vA.z));
      R.setNeck(clamp(pit, -0.5, 0.5) * w * 0.55, 0, yaw * w * 0.8);
    };
    return R;
  }
  // 跳躍(重力):蹲下 → 蹬起 → 空中拋物線 → 落地緩衝。回傳 { crouch, lift, foot }(單位:模型單位)
  function hopState(time, h) {
    var T_air = 2 * Math.sqrt(2 * h / G), tc = 0.24, tp = 0.07, tl = 0.2, per = tc + tp + T_air + tl + 0.08, p = time % per, c = 0, lift = 0, foot = 0;
    if (p < tc) c = 0.28 * mj(p / tc);
    else if (p < tc + tp) c = 0.28 * (1 - mj((p - tc) / tp));
    else if (p < tc + tp + T_air) { var a = (p - tc - tp) / T_air; lift = 4 * h * a * (1 - a); foot = lift * 0.8; }
    else if (p < tc + tp + T_air + tl) c = 0.22 * (1 - mj((p - tc - tp - T_air) / tl));
    return { crouch: c, lift: lift, foot: foot };
  }
  var adult = makeRig({ kind: 'adult', scale: 1.55, skin: 0xf0c4a0, shirt: 0xf7f9ff, pants: 0x2c3e66, hair: 0x4a3320, shoe: 0x20232e });
  var kid = makeRig({ kind: 'kid', scale: 0.95, skin: 0xf6d0b0, shirt: 0xe8523a, pants: 0x3a5bd0, hair: 0x2a1d12, shoe: 0xf5f5f5 });

  // ---------------------------------------------------------------- 圓滑的物件:杯子、燒杯、蠟燭、火焰、液體、煙
  function lathe(pts, seg) { return new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), seg || 56); }
  var glassMat = function (op) { return new T.MeshPhysicalMaterial({ color: 0xe4f4ff, metalness: 0, roughness: 0.03, transparent: true, opacity: op || 0.24, envMap: ENV, envMapIntensity: 1.6, side: T.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.05 }); };
  var streakTex = canvasTex(16, 128, function (g, w, h) { var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.85, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  function streak(rad, h, y, a0, len, op) { var m = new T.Mesh(new T.CylinderGeometry(rad, rad, h, 8, 1, true, a0, len), new T.MeshBasicMaterial({ map: streakTex, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, toneMapped: false })); m.position.y = y; return m; }
  function tumbler(h) {                                       // 玻璃杯:有厚底、杯口圓邊、反光條
    var s = h / 2.5, g = new T.Group();
    var m = new T.Mesh(lathe([[0, 0], [0.68, 0], [0.74, 0.03], [0.77, 0.09], [0.9, 2.46], [0.91, 2.5], [0.9, 2.54], [0.85, 2.55], [0.83, 2.51], [0.68, 0.3], [0.6, 0.25], [0, 0.25]].map(function (p) { return [p[0] * s * 1.0, p[1] * s]; })), glassMat(0.26)); m.renderOrder = 3; g.add(m);
    g.add(streak(0.8 * s + 0.02, h * 0.78, h * 0.5, 0.35, 0.25, 0.55)); g.add(streak(0.8 * s + 0.02, h * 0.6, h * 0.5, 0.75, 0.08, 0.7)); g.add(streak(0.8 * s + 0.02, h * 0.7, h * 0.5, 4.2, 0.12, 0.3));
    var ring = new T.Mesh(new T.TorusGeometry(0.87 * s, 0.025 * s, 8, 48), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, toneMapped: false })); ring.rotation.x = Math.PI / 2; ring.position.y = h * 1.02; g.add(ring);
    var o = new T.Group(); g.position.y = -h / 2; o.add(g); return o;      // 原點在杯子中心(翻面時繞中心轉)
  }
  var tickTex = canvasTex(64, 256, function (g, w, h) { g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = '16px sans-serif'; for (var i = 0; i < 8; i++) { var y = h - 18 - i * 28, long = i % 2 === 0; g.lineWidth = 2; g.beginPath(); g.moveTo(8, y); g.lineTo(long ? 36 : 24, y); g.stroke(); if (long) g.fillText(String((i / 2 + 1) * 100).slice(0, 3), 38, y + 5); } });
  function beaker(h, rad) {                                   // 燒杯:圓筒、捲邊、刻度
    var g = new T.Group(), s = rad;
    var m = new T.Mesh(lathe([[0, 0], [0.9, 0], [0.97, 0.04], [1.0, 0.12], [1.0, 2.9], [1.05, 2.97], [1.12, 3.0], [1.15, 3.02], [1.1, 3.04], [1.03, 3.0], [0.96, 2.93], [0.93, 2.9], [0.93, 0.16], [0.88, 0.1], [0, 0.1]].map(function (p) { return [p[0] * s, p[1] * h / 3]; })), glassMat(0.28)); m.renderOrder = 3; g.add(m);
    var tick = new T.Mesh(new T.CylinderGeometry(1.002 * s, 1.002 * s, h * 0.86, 40, 1, true, -0.2, 1.2), new T.MeshBasicMaterial({ map: tickTex, transparent: true, depthWrite: false, side: T.FrontSide, toneMapped: false, opacity: 0.8 })); tick.position.y = h * 0.5; tick.rotation.y = 0.5; g.add(tick);
    g.add(streak(1.0 * s + 0.01, h * 0.8, h * 0.5, 4.3, 0.28, 0.5)); g.add(streak(1.0 * s + 0.01, h * 0.7, h * 0.5, 5.0, 0.07, 0.65));
    g.userData = { rad: s, h: h }; return g;
  }
  function liquid(h, rad) {                                   // 液體:圓柱 + 微微凹的液面,顏色用頂點色控制(可由上往下漸變)
    var g = new T.Group(), seg = 14;
    var geo = new T.CylinderGeometry(rad * 0.93, rad * 0.88, 1, 40, seg, true); geo.translate(0, 0.5, 0);
    geo.setAttribute('color', new T.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
    var body = new T.Mesh(geo, new T.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.25, transparent: true, opacity: 0.9, envMap: ENV, envMapIntensity: 0.5, clearcoat: 0.4, side: T.DoubleSide })); body.renderOrder = 2; g.add(body);
    var topGeo = new T.CircleGeometry(rad * 0.93, 40), topM = new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, transparent: true, opacity: 0.92, envMap: ENV, envMapIntensity: 0.7, clearcoat: 0.5 });
    var top = new T.Mesh(topGeo, topM); top.rotation.x = -Math.PI / 2; top.renderOrder = 2; g.add(top);
    var rim = new T.Mesh(new T.TorusGeometry(rad * 0.93, 0.012, 6, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, toneMapped: false })); rim.rotation.x = Math.PI / 2; g.add(rim);
    var c1 = new T.Color(), c2 = new T.Color(), cm = new T.Color();
    g.userData = { geo: geo, body: body, top: top, rim: rim, level: h };
    g.setState = function (level, colA, colB, prog) {          // level:液面高度;colA 舊顏色、colB 新顏色;prog 0→1:新顏色從液面往下擴散
      level = Math.max(0.001, level); body.scale.y = level; top.position.y = level; rim.position.y = level; body.visible = top.visible = rim.visible = level > 0.01;
      c1.set(colA); c2.set(colB); var pos = geo.attributes.position, col = geo.attributes.color;
      for (var i = 0; i < pos.count; i++) { var y = pos.getY(i); var edge = 1 - prog * 1.5 + y * 0.9 + Math.sin(y * 7 + prog * 5) * 0.08 * Math.sin(prog * 3.14); var k = clamp(1 - edge, 0, 1); cm.copy(c1).lerp(c2, ease(k)); col.setXYZ(i, cm.r, cm.g, cm.b); }
      col.needsUpdate = true; topM.color.copy(c1).lerp(c2, ease(clamp(prog * 1.6, 0, 1))).multiplyScalar(1.05);
    };
    return g;
  }
  var glowTex = canvasTex(128, 128, function (g, w, h) { var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,190,90,0.8)'); gr.addColorStop(0.3, 'rgba(255,140,40,0.32)'); gr.addColorStop(1, 'rgba(255,110,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, true);
  var puffTex = canvasTex(64, 64, function (g, w, h) { var gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(210,214,230,0.75)'); gr.addColorStop(0.6, 'rgba(190,196,214,0.3)'); gr.addColorStop(1, 'rgba(180,186,205,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, true);
  var flameU = { uTime: { value: 0 }, uAmp: { value: 1 }, uAlpha: { value: 1 }, uCore: { value: 0 }, uDying: { value: 0 } };
  function flameMesh(core) {                                  // 火焰:水滴形,底部藍、中間黃白、尖端橘紅,會搖晃,加成混合
    var pts = []; for (var i = 0; i <= 28; i++) { var s = i / 28; pts.push([0.2 * Math.sin(Math.PI * Math.pow(s, 0.6)) * (1 - 0.35 * s), s * 1.0]); } pts[28][0] = 0.0005;
    var u = { uTime: flameU.uTime, uAmp: { value: 1 }, uAlpha: { value: 1 }, uCore: { value: core }, uDying: { value: 0 } };   // 每個火焰有自己的亮度、搖晃、熄滅參數
    var m = new T.Mesh(lathe(pts, 20), new T.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false,
      vertexShader: 'uniform float uTime,uAmp;varying float vH;varying vec3 vN;void main(){vH=uv.y;vN=normalize(normalMatrix*normal);vec3 p=position;float k=vH*vH;p.x+=sin(uTime*9.0+p.y*7.0)*0.05*k*uAmp+sin(uTime*17.0)*0.015*vH*uAmp;p.z+=cos(uTime*8.0+p.y*6.0)*0.05*k*uAmp;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}',
      fragmentShader: 'uniform float uAlpha,uCore,uDying;varying float vH;varying vec3 vN;void main(){vec3 c=mix(vec3(0.25,0.45,1.0),vec3(1.0,0.96,0.6),smoothstep(0.0,0.22,vH));c=mix(c,vec3(1.0,0.58,0.12),smoothstep(0.25,0.7,vH));c=mix(c,vec3(0.95,0.22,0.05),smoothstep(0.7,1.0,vH));c=mix(c,vec3(1.0,0.97,0.8),uCore*(1.0-smoothstep(0.0,0.7,vH)));c=mix(c,vec3(0.9,0.25,0.08),uDying*0.6);float a=(1.0-smoothstep(0.55,1.0,vH))*pow(abs(normalize(vN).z)+0.15,0.7);gl_FragColor=vec4(c*(1.2-0.4*uDying),a*uAlpha*(1.0-0.3*uCore));}' }));
    m.userData.u = u; return m;
  }
  function candle(h, rad) {                                   // 蠟燭 + 小碟子 + 燭芯 + 火焰 + 光暈 + 光源
    var g = new T.Group();
    var plate = new T.Mesh(lathe([[0, 0], [0.7, 0], [0.9, 0.05], [1.0, 0.14], [0.95, 0.15], [0.86, 0.09], [0.45, 0.07], [0, 0.07]].map(function (p) { return [p[0] * 0.62, p[1] * 0.62]; })), new T.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.25, envMap: ENV, envMapIntensity: 0.6 })); plate.castShadow = plate.receiveShadow = true; g.add(plate);
    var wax = new T.MeshStandardMaterial({ color: 0xfff0d2, roughness: 0.5, emissive: 0xff8a2a, emissiveIntensity: 0 });
    var body = new T.Mesh(lathe([[0, 0.07], [rad, 0.07], [rad * 1.02, 0.1], [rad * 1.02, h - 0.05], [rad * 0.95, h], [rad * 0.7, h - 0.04], [rad * 0.35, h - 0.1], [0, h - 0.11]]), wax); body.castShadow = body.receiveShadow = true; g.add(body);
    [[0.6, 0.3, 0.5], [2.4, 0.2, 0.34]].forEach(function (d) { var drip = new T.Mesh(T.CapsuleGeometry ? new T.CapsuleGeometry(0.035, d[2] * h * 0.5, 4, 8) : new T.CylinderGeometry(0.035, 0.035, d[2] * h * 0.5, 8), wax); drip.position.set(Math.cos(d[0]) * rad * 1.03, h - 0.1 - d[2] * h * 0.25, Math.sin(d[0]) * rad * 1.03); g.add(drip); });
    var wick = new T.Mesh(new T.CylinderGeometry(0.014, 0.018, 0.2, 8), new T.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 })); wick.position.set(0, h + 0.0, 0); wick.rotation.z = 0.12; g.add(wick);
    var ember = new T.Mesh(new T.SphereGeometry(0.03, 8, 8), new T.MeshBasicMaterial({ color: 0xff5a1a, toneMapped: false })); ember.position.set(0.012, h + 0.1, 0); g.add(ember);
    var flame = new T.Group(); flame.position.set(0, h + 0.07, 0); g.add(flame);
    var fo = flameMesh(0), fi = flameMesh(1); fo.scale.set(1, 0.9, 1); fi.scale.set(0.55, 0.6, 0.55); flame.add(fo); flame.add(fi);
    var glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, blending: T.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); glow.position.set(0, h + 0.3, 0); g.add(glow);
    var light = new T.PointLight(0xffa550, 0, 9, 2); light.position.set(0, h + 0.4, 0); g.add(light);
    g.userData = { h: h, fo: fo, fi: fi, flame: flame, glow: glow, light: light, ember: ember, wax: wax, top: h };
    return g;
  }
  function dropper(len) {                                     // 滴管:玻璃管(裡面有液體)、白色套環、大橡皮頭,從遠處也看得清楚
    var g = new T.Group();
    var tube = new T.Mesh(lathe([[0, 0], [0.02, 0], [0.035, 0.08], [0.06, 0.35], [0.068, len * 0.7], [0.072, len * 0.77], [0, len * 0.77]]), glassMat(0.5)); tube.renderOrder = 3; g.add(tube);
    var colM = new T.MeshStandardMaterial({ color: 0xffe9f0, roughness: 0.2, transparent: true, opacity: 0.92 });
    g.add(new T.Mesh(lathe([[0, 0.04], [0.014, 0.04], [0.028, 0.12], [0.052, 0.35], [0.057, len * 0.5], [0, len * 0.5]]), colM));
    var collar = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.07, 24), new T.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 0.5, roughness: 0.35, envMap: ENV, envMapIntensity: 0.6 })); collar.position.y = len * 0.78; g.add(collar);
    var bulbMat = new T.MeshStandardMaterial({ color: 0xd63a3a, roughness: 0.4 });
    var bulb = new T.Mesh(lathe([[0, len * 0.8], [0.105, len * 0.8], [0.14, len * 0.85], [0.155, len * 0.95], [0.125, len * 1.07], [0.06, len * 1.14], [0, len * 1.16]]), bulbMat); bulb.castShadow = true; g.add(bulb);
    g.userData = { bulbMat: bulbMat, colM: colM, len: len }; return g;
  }
  function sphereMesh(c, rad) { var m = new T.Mesh(new T.SphereGeometry(rad, 16, 12), new T.MeshStandardMaterial({ color: c, roughness: 0.35, envMap: ENV, envMapIntensity: 0.6 })); m.castShadow = true; return m; }
  function puffs(n) { var arr = []; for (var i = 0; i < n; i++) { var s = new T.Sprite(new T.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); arr.push(s); } return arr; }

  // ---------------------------------------------------------------- 場景共用
  function popS(tt) { if (tt <= 0) return 0; var x = clamp(tt / 0.45, 0, 1), c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }   // 彈出來(轉場效果,有一點回彈)
  function pop(obj, tt) { var s = popS(tt); obj.visible = s > 0.002; obj.scale.setScalar(Math.max(s, 0.0001)); }
  function ramp(t, a, b, c, d) { return mj(seg01(t, a, b)) * (1 - mj(seg01(t, c, d))); }          // a~b 由 0 升到 1(最小急跳),c~d 降回 0
  function lerp3(out, a, b, u) { return out.set(lerp(a.x, b.x, u), lerp(a.y, b.y, u), lerp(a.z, b.z, u)); }
  function segIdx(sc, t) { var k = sc.SEG.length - 1; for (; k > 0; k--) if (t >= sc.ST[k]) break; return k; }
  var V = function (x, y, z) { return new T.Vector3(x, y, z); };

  // ---------------------------------------------------------------- 場景 1:蠟燭蓋玻璃杯
  var S1 = (function () {
    var grp = new T.Group(); scene.add(grp);
    var cx = -0.15, cz = 0.2, CH = 0.7, FS = 0.5, GH = 1.65, GR = 0.69;
    var can = candle(CH, 0.2); can.position.set(cx, BENCH, cz); grp.add(can);
    var glass = tumbler(GH); grp.add(glass);                    // 玻璃杯的原點在中心(翻面時繞中心轉)
    // 打火機:握把 + 長嘴 + 火焰(火焰永遠直立)
    var lighter = new T.Group(), lbody = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.34, 14), new T.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.4, metalness: 0.3 })); lbody.position.y = -0.17; lbody.castShadow = true; lighter.add(lbody);
    var lnoz = new T.Mesh(new T.CylinderGeometry(0.018, 0.026, 0.26, 10), new T.MeshStandardMaterial({ color: 0xb9c0cc, roughness: 0.3, metalness: 0.8 })); lnoz.position.y = -0.47; lighter.add(lnoz); grp.add(lighter);
    var lfl = flameMesh(0); lfl.scale.set(0.13, 0.13, 0.13); lfl.visible = false; grp.add(lfl);
    // 分子(示意):12 個氧分子(兩顆紅球);燃燒時靠近火焰的 3 個氧分子各接上一個碳原子(灰球),變成二氧化碳(O=C=O),氧原子總數不變。
    var o2 = [], co2 = [], NCONV = 3, N_O2 = 12;
    for (var i = 0; i < N_O2; i++) { var m = new T.Group(), s1 = sphereMesh(0xb81414, 0.1), s2 = sphereMesh(0xb81414, 0.1); s1.position.x = -0.1; s2.position.x = 0.1; m.add(s1); m.add(s2); m.userData = i < NCONV ? { a: i * 2.1, b: i * 1.3, rr: 0.2 + 0.03 * i, yy: CH + 0.15 + 0.12 * i } : { a: Math.random() * 6.28, b: Math.random() * 6.28, rr: 0.14 + Math.random() * 0.3, yy: 0.25 + Math.random() * 0.95 }; m.visible = false; grp.add(m); o2.push(m); }
    for (i = 0; i < NCONV; i++) { var c = new T.Group(), cc = sphereMesh(0x2f2f36, 0.11), r1 = sphereMesh(0xb81414, 0.1), r2 = sphereMesh(0xb81414, 0.1); r1.position.x = -0.24; r2.position.x = 0.24; c.add(cc); c.add(r1); c.add(r2); c.userData = o2[i].userData; c.visible = false; grp.add(c); co2.push(c); }
    var smoke = puffs(14);
    var SEG = EXP.candle.steps.map(function (s) { return { n: s.nZh, d: s.d0, io: s.io, cap: s.capZh }; });
    var ST = []; SEG.reduce(function (a, s) { ST.push(a); return a + s.d; }, 0);
    var tip = V(cx, BENCH + CH + 0.3, cz), gStart = V(0.95, BENCH + GH / 2, cz), gUp1 = V(0.6, 3.95, cz), gUp2 = V(cx, 3.95, cz), gEnd = V(cx, BENCH + GH / 2, cz);
    var tA = V(0, 0, 0), tB = V(0, 0, 0), tC = V(0, 0, 0), gC = V(0, 0, 0), vS = V(0, 0, 0), vD = V(0, 0, 0), vTip = V(0, 0, 0), hand = V(0, 0, 0), elb = V(0, 0, 0), gOff = V(-0.82, -0.1, 0);
    function glassCenter(u, out) {                              // 玻璃杯中心的路徑:抬起 → 翻面 → 移到蠟燭上方 → 慢慢放下(每段最小急跳)
      if (u < 0.2) return out.copy(gStart);
      if (u < 0.45) return lerp3(out, gStart, gUp1, mj((u - 0.2) / 0.25));
      if (u < 0.7) return lerp3(out, gUp1, gUp2, mj((u - 0.45) / 0.25));
      if (u < 0.93) return lerp3(out, gUp2, gEnd, mj((u - 0.7) / 0.23));
      return out.copy(gEnd);
    }
    function update(t, time) {
      var k = segIdx({ SEG: SEG, ST: ST }, t), u = clamp((t - ST[k]) / SEG[k].d, 0, 1), A = adult, K = kid;
      pop(can, t - (ST[1] + 0.8));                              // 出場(影片轉場效果):蠟燭 → 玻璃杯彈出來
      // ---- 大人(骨架 + 重心平衡 + 腳踩地)
      A.root.position.set(0.3, 0, -0.8); A.root.rotation.y = 0;
      A.solve(function () {
        A.base(time, 0); A.root.updateMatrixWorld(true);
        if (k === 0) A.wave(1, time);
        if (k === 1) { tA.set(0.95, BENCH + GH + 0.3, cz - 0.1); A.reach(1, tA, ramp(u, 0.1, 0.32, 0.45, 0.62)); }
        A.chest(-1);                                             // 左手(畫面左側的手)一直拿著打火機
        if (k === 1) { tB.set(cx, BENCH + CH + 0.9, cz); A.reach(-1, tB, ramp(u, 0.5, 0.72, 0.85, 1.0)); }
        if (k === 2) {                                           // 打火機的嘴對準燭芯:手的目標 = 燭芯位置 − 手臂方向 × 打火機長度
          A.shoulder(-1, vS); tC.set(cx, BENCH + CH + 0.14, cz); vD.copy(tC).sub(vS).normalize(); tA.copy(tC).addScaledVector(vD, -0.5);
          A.reach(-1, tA, ramp(u, 0.02, 0.3, 0.62, 0.86));
        }
        if (k === 3) {                                           // 左手拿玻璃杯:握在杯子的左側
          var uu = u, w3 = ramp(uu, 0.0, 0.2, 0.93, 1.0); glassCenter(uu, gC); tA.copy(gC).add(vD.set(0.82, 0.1, 0));
          if (k === 3) A.reach(1, tA, w3);
        }
      });
      // ---- 打火機(握在右手,沿前臂方向伸出)
      A.root.updateMatrixWorld(true); A.hand(-1, hand); adult.arms[-1].fa.localToWorld(elb.set(0, 0, 0)); vD.copy(hand).sub(elb).normalize();
      lighter.position.copy(hand).addScaledVector(vD, -0.1); lighter.quaternion.setFromUnitVectors(DOWNV, vD); vTip.copy(hand).addScaledVector(vD, 0.62);
      var lOn = (k === 2 && u > 0.34 && u < 0.84); lfl.visible = lOn; lfl.position.copy(vTip); lfl.userData.u.uAlpha.value = lOn ? 1 : 0; lfl.userData.u.uAmp.value = 0.5;
      // ---- 玻璃杯:被左手握住時跟著手;握住前後在原位
      pop(glass, t - (ST[1] + 0.25));
      if (k < 3) { glass.position.copy(gStart); glass.rotation.z = 0; }
      else {
        glassCenter(u, gC);
        if (u >= 0.2 && u < 0.93) { A.hand(1, hand); glass.position.copy(hand).add(gOff); } else glass.position.copy(gC);
        glass.rotation.z = Math.PI * mj(seg01(u, 0.3, 0.58));
      }
      if (k > 3) { glass.position.copy(gEnd); glass.rotation.z = Math.PI; }
      // ---- 火焰:打火機點到燭芯後才點燃;蓋上杯子後越來越小
      var fl = 0; if (k === 2) fl = ease(clamp((u - 0.6) / 0.1, 0, 1)); else if (k === 3) fl = 1; else if (k === 4) fl = 1 - ease(u * 1.02); if (fl < 0.02) fl = 0;
      var d = can.userData, flick = 1 + 0.1 * Math.sin(time * 23) + 0.06 * Math.sin(time * 37 + 1.3);
      [d.fo, d.fi].forEach(function (f) { var q = f.userData.u; q.uAmp.value = 0.6 + (k === 4 ? u * 2.2 : 0); q.uAlpha.value = fl > 0 ? 1 : 0; q.uDying.value = k === 4 ? clamp(u * 1.2, 0, 1) : 0; });
      flameU.uTime.value = time;
      d.flame.visible = fl > 0; d.flame.scale.set((0.5 + 0.5 * fl) * FS, (0.35 + 0.65 * fl) * flick * FS, (0.5 + 0.5 * fl) * FS); d.flame.position.y = CH + 0.09;
      d.glow.visible = fl > 0.02; d.glow.scale.setScalar((0.35 + 0.8 * fl) * (0.95 + 0.05 * flick)); d.glow.position.y = CH + 0.2 + 0.08 * fl;
      d.light.intensity = 3.0 * fl * flick; d.wax.emissiveIntensity = 0.2 * fl;
      d.ember.visible = (k === 4 && u > 0.9) || k === 5; d.ember.material.color.setRGB(1, 0.35 * (k === 5 ? Math.max(0, 1 - (t - ST[5]) * 0.5) : 1), 0.1);
      // ---- 小朋友:看著實驗;結尾用重力跳躍
      K.root.position.set(2.9, 0, -0.75); K.root.rotation.y = -0.45;
      var hs = k === 5 ? hopState(time, 0.26) : { crouch: 0, lift: 0, foot: 0 };
      K.solve(function () {
        K.base(time, 1.1); if (k === 0) K.wave(1, time); if (k >= 1 && k <= 4) { K.chest(1); K.chest(-1); } if (k === 5) { K.cheer(1, time); K.cheer(-1, time); }
      }, { crouch: hs.crouch, lift: hs.lift, footL: hs.foot, footR: hs.foot });
      K.look(k === 0 || k === 5 ? cam.position : tip, 0.95); if (k >= 2 && k <= 4) K.mouth(k === 3 ? 'oh' : 'smile');
      A.look(k === 0 ? cam.position : (k === 3 ? gC : tip), 0.9);
      // ---- 氧氣分子(紅球)與煙
      var cov = (k === 3 && u > 0.93) || k >= 4;
      for (var i = 0; i < o2.length; i++) {
        var ud = o2[i].userData, tcv = ST[4] + SEG[4].d * (0.2 + 0.2 * i), conv = i < NCONV && t > tcv, grpM = conv ? co2[i] : o2[i];    // 轉換之前是氧分子,之後是二氧化碳
        o2[i].visible = cov && !conv; if (i < NCONV) co2[i].visible = cov && conv;
        grpM.position.set(cx + Math.cos(time * 0.5 + ud.a) * ud.rr, BENCH + 0.12 + ud.yy + Math.sin(time * 0.9 + ud.b) * 0.05, cz + Math.sin(time * 0.5 + ud.a) * ud.rr); grpM.rotation.set(time * 0.7 + ud.a, time * 0.9 + ud.b, 0);
        if (conv) grpM.scale.setScalar(Math.max(0.0001, popS(t - tcv)));
      }
      var t0 = ST[4] + SEG[4].d * 0.82;
      for (i = 0; i < smoke.length; i++) {
        var a = t - t0 - i * 0.28, s = smoke[i]; if (a < 0 || a > 4.5) { s.visible = false; continue; }
        s.visible = true; var life = a / 4.5; s.position.set(cx + Math.sin(a * 2 + i) * 0.1 * (1 + life * 1.5), BENCH + CH + 0.2 + Math.min(life * 0.9, 0.7) + Math.min(a * 0.1, 0.3), cz + Math.cos(a * 1.7 + i) * 0.08 * (1 + life));
        s.scale.setScalar(0.16 + life * 0.5); s.material.opacity = Math.sin(Math.min(1, life * 1.2) * Math.PI) * 0.55;
      }
      // ---- 鏡頭
      var camK = kf(t, [[0, 0], [ST[3], 0.0], [ST[4], 1], [ST[5], 1], [ST[5] + 1.5, 0.4]]);
      cam.position.set(Math.sin(t * 0.25) * 0.45, lerp(6.6, 6.0, camK), lerp(11.6, 9.6, camK)); cam.lookAt(0.3, lerp(2.3, 2.5, camK), 0.2);
      hemi.intensity = 0.85 - 0.3 * (k >= 2 && k < 5 ? 1 : 0); key.intensity = 2.0 - 0.9 * (k >= 2 && k < 5 ? 1 : 0);
    }
    return { grp: grp, SEG: SEG, ST: ST, update: update, title: EXP.candle.titleZh, leg: EXP.candle.legZh };
  })();

  // ---------------------------------------------------------------- 場景 2:紫色高麗菜酸鹼變色
  var S2 = (function () {
    var E = EXP.cabbage, grp = new T.Group(); scene.add(grp);
    var BX = [-1.45, 0, 1.45], BZ = 0.2, BH = 1.2, BR = 0.45, LV = 0.5, HZ = 0.15, HX = [-2.05, 0.65], CUP = 0.2, DL = 0.8;
    var BOWL = { x: -0.3, z: 0.15 };
    var PURPLE = 0x5a1f9c, PINK = 0xe82f7c, TEAL = 0x0c9f86, CLEAR = 0xbfe3ff;
    var iSoak = 1, iCups = 2, iVin = 3, iSoda = 4, iCmp = 5, iEnd = 6;          // 步驟編號(與 exp-scripts.json 的順序一致)
    var bks = [], liqs = [];
    BX.forEach(function (x) { var b = beaker(BH, BR); b.position.set(x, BENCH, BZ); grp.add(b); bks.push(b); var l = liquid(LV, BR); l.position.set(x, BENCH + 0.07, BZ); grp.add(l); liqs.push(l); });
    var cups = [];
    function cup(x) { var c = new T.Mesh(lathe([[0, 0], [0.16, 0], [0.18, 0.02], [0.19, CUP], [0.16, CUP], [0.14, 0.05], [0, 0.05]]), new T.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.3, envMap: ENV, envMapIntensity: 0.5 })); c.position.set(x, BENCH, HZ); c.castShadow = true; grp.add(c); cups.push(c); }
    cup(HX[0]); cup(HX[1]);
    var drp = [dropper(DL), dropper(DL)];
    drp[0].userData.bulbMat.color.setHex(0xd63a3a); drp[0].userData.colM.color.setHex(0xffe3ec); drp[1].userData.bulbMat.color.setHex(0x2f7fe0); drp[1].userData.colM.color.setHex(0xd8f3ff);
    drp.forEach(function (d) { grp.add(d); });
    var drops = [0, 1].map(function (j) { var m = new T.Mesh(new T.SphereGeometry(0.05, 14, 10), new T.MeshPhysicalMaterial({ color: j ? 0xdff6ff : 0xffe9f0, roughness: 0.05, transparent: true, opacity: 0.85 })); m.scale.set(1, 1.3, 1); m.visible = false; grp.add(m); return m; });
    var ripples = [0, 1, 2, 3].map(function () { var m = new T.Mesh(new T.RingGeometry(0.8, 1, 40), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.visible = false; grp.add(m); return m; });
    function labelTex(txt, col) { return canvasTex(384, 96, function (g, w, h) { g.fillStyle = 'rgba(14,20,50,0.82)'; var rr = 22; g.beginPath(); g.moveTo(rr, 4); g.arcTo(w - 4, 4, w - 4, h - 4, rr); g.arcTo(w - 4, h - 4, 4, h - 4, rr); g.arcTo(4, h - 4, 4, 4, rr); g.arcTo(4, 4, w - 4, 4, rr); g.fill(); g.lineWidth = 5; g.strokeStyle = col; g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 36px "Noto Sans TC",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 2); }, true); }
    function label(zh, en, col) { var tz = labelTex(zh, col), te = labelTex(en, col), s = new T.Sprite(new T.SpriteMaterial({ map: tz, transparent: true, depthWrite: false, toneMapped: false })); s.userData = { zh: tz, en: te }; s.scale.set(1.85, 0.46, 1); s.visible = false; grp.add(s); return s; }
    var labs = [label('加醋:粉紅', 'Vinegar: pink', '#ff5f9e'), label('加小蘇打水:藍綠', 'Baking soda: teal', '#2fbfa5'), label('沒加:紫色', 'Nothing: purple', '#7a3fb8')];

    // ---- 泡菜汁:玻璃碗(切碎的紫色高麗菜 + 熱水)、水壺(大人手上)、蒸氣
    var bowlG = new T.Group(); bowlG.position.set(BOWL.x, BENCH, BOWL.z); grp.add(bowlG);
    var bowl = new T.Mesh(lathe([[0, 0], [0.5, 0], [0.66, 0.08], [0.74, 0.3], [0.76, 0.5], [0.73, 0.52], [0.7, 0.48], [0.62, 0.14], [0.5, 0.09], [0, 0.09]]), glassMat(0.3)); bowl.renderOrder = 3; bowlG.add(bowl);
    var bowlL = liquid(0.4, 0.7); bowlL.position.y = 0.09; bowlG.add(bowlL);
    var pieces = []; for (var pi = 0; pi < 14; pi++) { var pm = new T.Mesh(new T.IcosahedronGeometry(0.1, 0), new T.MeshStandardMaterial({ color: 0x6b2d8f, roughness: 0.7 })); var pa = pi * 2.4, pr = 0.12 + (pi % 5) * 0.09; pm.position.set(Math.cos(pa) * pr, 0.13 + (pi % 3) * 0.03, Math.sin(pa) * pr); pm.scale.set(1, 0.35, 0.75); pm.rotation.set(pi, pi * 1.7, pi * 0.6); pm.castShadow = true; bowlG.add(pm); pieces.push(pm); }
    var kettle = new T.Group(), kin = new T.Group(); kin.position.set(-0.68, -0.32, 0); kettle.add(kin); kettle.scale.setScalar(0.65); grp.add(kettle);
    var kmat = new T.MeshStandardMaterial({ color: 0xc9ced8, metalness: 0.8, roughness: 0.3, envMap: ENV, envMapIntensity: 0.9 }), kdark = new T.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.5 });
    var kb = new T.Mesh(lathe([[0, 0], [0.34, 0], [0.4, 0.08], [0.42, 0.3], [0.34, 0.5], [0.2, 0.58], [0, 0.6]]), kmat); kb.castShadow = true; kin.add(kb);
    var knob = new T.Mesh(new T.SphereGeometry(0.05, 12, 8), kdark); knob.position.y = 0.64; kin.add(knob);
    var spout = new T.Mesh(new T.CylinderGeometry(0.035, 0.06, 0.375, 12), kmat); spout.position.set(-0.44, 0.43, 0); spout.rotation.z = 1.05; kin.add(spout);
    var hdl = new T.Mesh(new T.TorusGeometry(0.19, 0.035, 8, 24), kdark); hdl.position.set(0.5, 0.32, 0); kin.add(hdl);
    var strm = []; for (var si = 0; si < 14; si++) { var sm = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), new T.MeshPhysicalMaterial({ color: 0xdff1ff, roughness: 0.05, transparent: true, opacity: 0.8 })); sm.visible = false; grp.add(sm); strm.push(sm); }
    var steam = puffs(8), D0 = V(-0.819, 0.15, 0);                // D0:握把到壺嘴口的距離(已乘 0.65)

    var SEG = E.steps.map(function (s) { return { n: s.nZh, d: s.d0, io: s.io, cap: s.capZh }; });
    var ST = []; SEG.reduce(function (a, s) { ST.push(a); return a + s.d; }, 0);
    var TIPY = BENCH + 0.07 + LV + 0.3, SURF = BENCH + 0.07 + LV, GRIP = DL * 0.92, tA = V(0, 0, 0), tB = V(0, 0, 0), hand = V(0, 0, 0), kt = V(0, 0, 0), hit = [0, 0], tipW = V(0, 0, 0);
    var rel = [0.53, 0.69];                                    // 兩滴的釋放時間(步驟內的比例)
    var TH = Math.sqrt(2 * (TIPY - SURF) / G);                 // 水滴從滴管口掉到液面的時間(重力)
    var TH_K = 38 * D2R;
    function update(t, time) {
      var k = segIdx({ SEG: SEG, ST: ST }, t), u = clamp((t - ST[k]) / SEG[k].d, 0, 1), A = adult, K = kid;
      var uA = k === iVin ? u : (k < iVin ? 0 : 1), uB = k === iSoda ? u : (k < iSoda ? 0 : 1);
      A.root.position.set(-0.7, 0, -0.8); A.root.rotation.y = 0.3;
      var uS = k === iSoak ? u : (k < iSoak ? 0 : 1), th = TH_K * mj(seg01(uS, 0.3, 0.42)) * (1 - mj(seg01(uS, 0.7, 0.8)));    // 水壺傾斜角
      function dropperTarget(j, uj, out) {                      // 滴管手的目標:握把位置 → 燒杯上方 → 擺回
        var gx = HX[j], bx = BX[j]; tA.set(gx, BENCH + CUP + GRIP, HZ); tB.set(bx, TIPY + GRIP, BZ);
        if (uj < 0.2) return out.copy(tA); if (uj < 0.42) return lerp3(out, tA, tB, mj((uj - 0.2) / 0.22)); if (uj < 0.72) return out.copy(tB);
        if (uj < 0.92) return lerp3(out, tB, tA, mj((uj - 0.72) / 0.2)); return out.copy(tA);
      }
      A.solve(function () {
        A.base(time, 0); A.root.updateMatrixWorld(true);
        if (k === 0) A.wave(-1, time);
        if (k === iSoak) {                                      // 右手拿水壺:移到玻璃碗上方、傾斜倒熱水、擺回
          A.chest(1);
          var c = Math.cos(th), s = Math.sin(th);
          kt.set(BOWL.x - (D0.x * c - D0.y * s), BENCH + 1.0 - (D0.x * s + D0.y * c), BOWL.z); A.reach(1, kt, ramp(u, 0.08, 0.3, 0.8, 0.95));
        }
        if (k === iCups) { kt.set(BX[0], BENCH + BH + 0.55, BZ - 0.1); A.reach(-1, kt, ramp(u, 0.1, 0.32, 0.42, 0.55)); kt.set(BX[1], BENCH + BH + 0.55, BZ - 0.1); A.reach(1, kt, ramp(u, 0.5, 0.72, 0.84, 0.98)); }
        if (k === iVin) { dropperTarget(0, uA, kt); A.reach(-1, kt, ramp(u, 0, 0.2, 0.92, 1.0)); }
        if (k === iSoda) { dropperTarget(1, uB, kt); A.reach(1, kt, ramp(u, 0, 0.2, 0.92, 1.0)); }
      });
      A.root.updateMatrixWorld(true);
      // ---- 泡菜汁:碗與水壺(出場是轉場效果);熱水倒入後水位上升,紫色從菜葉慢慢溶到水裡(時間壓縮)
      var sB = popS(t - (ST[iSoak] + 0.05)) * (1 - ease((t - ST[iCups]) / 0.4)); bowlG.visible = sB > 0.002; bowlG.scale.setScalar(Math.max(sB, 0.0001));
      var pourOn = k === iSoak && th > 20 * D2R, level = 0.03 + 0.34 * ease(clamp((uS - 0.38) / 0.34, 0, 1)), prog = mj((uS - 0.45) / 0.5);
      bowlL.visible = uS > 0.37; bowlL.setState(Math.max(level, 0.001), CLEAR, PURPLE, prog);
      pieces.forEach(function (p, n) { p.material.color.setHex(0x6b2d8f).lerp(new T.Color(0xd9cfe3), prog * 0.85); });               // 菜葉的紫色被溶到水裡,葉子慢慢變淡
      var kOn = k === iSoak && u > 0.02 && u < 0.95, kS = popS(t - (ST[iSoak] + 0.1)) * (1 - ease((u - 0.93) / 0.07)); kettle.visible = kOn && kS > 0.002; kettle.scale.setScalar(Math.max(0.65 * kS, 0.0001));
      if (kettle.visible) { A.hand(1, hand); kettle.position.copy(hand); kettle.rotation.z = th; }
      var tc = Math.cos(th), ts = Math.sin(th); tipW.set(hand.x + D0.x * tc - D0.y * ts, hand.y + D0.x * ts + D0.y * tc, hand.z);
      var surfY = BENCH + 0.09 + level, vx = 0.6 * (-0.747 * tc - 0.667 * ts), vy = 0.6 * (-0.747 * ts + 0.667 * tc), hh = Math.max(0.05, tipW.y - surfY), tEnd = (vy + Math.sqrt(vy * vy + 2 * G * hh)) / G;
      strm.forEach(function (m, n) {                           // 水流:自由落體拋物線(出口速度 + 重力)
        m.visible = kettle.visible && pourOn; if (!m.visible) return; var tau = tEnd * (((n + (time * 3) % 1) / strm.length)); m.position.set(tipW.x + vx * tau, tipW.y + vy * tau - 0.5 * G * tau * tau, tipW.z);
      });
      steam.forEach(function (s, n) {                          // 熱水的蒸氣(凝結的小水珠):往上飄、擴散、變淡
        var on = bowlG.visible && level > 0.06, life = ((time * 0.35 + n / steam.length) % 1); s.visible = on; if (!on) return;
        s.position.set(BOWL.x + Math.sin(n * 2 + time) * 0.18, BENCH + 0.5 + life * 0.9, BOWL.z + Math.cos(n * 1.7) * 0.14); s.scale.setScalar(0.25 + life * 0.5); s.material.opacity = Math.sin(life * Math.PI) * 0.3;
      });
      // ---- 滴管:被握住時跟著手(垂直、管口朝下);其餘時間插在杯座裡
      [uA, uB].forEach(function (uj, j) {
        var d = drp[j], s = j ? 1 : -1, held = uj >= 0.2 && uj < 0.92 && ((j === 0 && k === iVin) || (j === 1 && k === iSoda));
        if (held) { A.hand(s, hand); d.position.set(hand.x, hand.y - GRIP, hand.z); d.visible = true; d.scale.setScalar(1); } else { d.position.set(HX[j], BENCH + CUP, HZ); pop(d, t - (ST[iCups] + 1.9)); }
        var sq = 0; [0.5, 0.66].forEach(function (c) { sq = Math.max(sq, Math.max(0, 1 - Math.abs(uj - c) / 0.04)); });
        d.children[d.children.length - 1].scale.set(1 - 0.16 * sq, 1, 1 - 0.16 * sq);    // 擠橡皮頭
        // 水滴:自由落體 y = y0 − ½ g τ²
        var st = j ? iSoda : iVin, drops_j = drops[j], tr = ST[st] + rel[0] * SEG[st].d, tr2 = ST[st] + rel[1] * SEG[st].d, shown = false;
        [tr, tr2].forEach(function (r0, n) {
          var tau = t - r0; if (tau > 0 && tau < TH) { shown = true; drops_j.position.set(BX[j], TIPY - 0.5 * G * tau * tau, BZ); }
          var rp = (tau - TH) / 0.9, rr = ripples[j * 2 + n]; rr.visible = rp > 0 && rp < 1; if (rr.visible) { rr.position.set(BX[j], SURF + 0.005, BZ); rr.scale.setScalar(0.08 + rp * 0.3); rr.material.opacity = (1 - rp) * 0.7; }
        });
        drops_j.visible = shown; hit[j] = tr + TH;
      });
      // ---- 液體:第一滴落到液面後,新顏色從液面往下擴散
      for (var i = 0; i < 3; i++) {
        var tb = ST[iCups] + 0.2 + i * 0.35; pop(bks[i], t - tb);                                   // 出場(轉場效果):燒杯依序彈出來
        var fill = ease(clamp((t - tb - 0.6) / 1.0, 0, 1)); liqs[i].visible = fill > 0.01;           // 菜汁從底部升到液面(轉場效果)
        var pg = 0, colB = PURPLE; if (i === 0) { pg = mj((t - hit[0]) / 2.8); colB = PINK; } else if (i === 1) { pg = mj((t - hit[1]) / 2.8); colB = TEAL; }
        liqs[i].setState(LV * Math.max(fill, 0.001), PURPLE, colB, pg);
      }
      cups.forEach(function (c) { pop(c, t - (ST[iCups] + 1.7)); });
      // ---- 標籤
      for (i = 0; i < 3; i++) { labs[i].visible = k >= iCmp; labs[i].material.map = labs[i].userData[LANG]; labs[i].position.set(BX[i], BENCH + BH + 0.28 + Math.sin(time * 2 + i) * 0.03, BZ + 0.55); var lu = ease(clamp((t - ST[iCmp] - 0.3 - i * 0.3) / 0.5, 0, 1)); labs[i].material.opacity = lu; labs[i].scale.set(1.85 * lu + 0.01, 0.46 * lu + 0.01, 1); }
      // ---- 小朋友
      K.root.position.set(2.9, 0, -0.75); K.root.rotation.y = -0.45;
      var hs = k === iEnd ? hopState(time, 0.26) : { crouch: 0, lift: 0, foot: 0 };
      K.solve(function () {
        K.base(time, 1.1); if (k === 0) K.wave(1, time); if (k >= 1 && k <= iSoda) { K.chest(1); K.chest(-1); } if (k === iEnd) { K.cheer(1, time); K.cheer(-1, time); }
      }, { crouch: hs.crouch, lift: hs.lift, footL: hs.foot, footR: hs.foot });
      kt.set(k === iSoak ? BOWL.x : (k === iSoda ? BX[1] : BX[0]), BENCH + 1.0, k === iSoak ? BOWL.z : BZ); K.look(k === 0 || k === iEnd ? cam.position : kt, 0.95); if (k >= iVin && k <= iSoda) K.mouth(u > 0.7 ? 'oh' : 'smile');
      kt.set(k === iSoak ? BOWL.x : (k === iSoda ? BX[1] : BX[0]), BENCH + 1.4, k === iSoak ? BOWL.z : BZ); A.look(k === 0 || k === iCmp || k === iEnd ? cam.position : kt, 0.9);
      // ---- 鏡頭(倒熱水與滴的時候拉近)
      var camK = kf(t, [[0, 0], [ST[iSoak], 0.2], [ST[iVin], 1], [ST[iCmp], 0.6], [ST[iEnd], 0.2]]);
      var zoom = kf(t, [[ST[iVin] - 0.2, 0], [ST[iVin] + 0.9, 1], [ST[iSoda] + 4.6, 1], [ST[iCmp] - 0.1, 0]]), fx = kf(t, [[ST[iVin], BX[0]], [ST[iSoda] + 0.9, BX[1]]]);
      var zb = kf(t, [[ST[iSoak] + 0.3, 0], [ST[iSoak] + 1.5, 1], [ST[iCups] - 0.5, 1], [ST[iCups] + 0.5, 0]]);
      cam.position.set(Math.sin(t * 0.25) * 0.3 + fx * 0.3 * zoom, lerp(6.6, 6.0, camK) - 0.5 * zoom - 0.3 * zb, lerp(11.8, 9.8, camK) - 1.5 * zoom - 1.4 * zb); cam.lookAt(0.2 + fx * 0.5 * zoom - 0.3 * zoom - 0.3 * zb, 2.4 + 0.15 * zoom, 0.2);
      hemi.intensity = 0.85; key.intensity = 2.0;
    }
    return { grp: grp, SEG: SEG, ST: ST, update: update, title: E.titleZh, leg: E.legZh };
  })();

  // ---------------------------------------------------------------- 英文字幕、時長(全部來自 exp-scripts.json,與審稿頁的「故事 ↔ 動畫」對照表是同一份資料)
  [[S1, EXP.candle], [S2, EXP.cabbage]].forEach(function (p) { p[0].EN = { title: p[1].titleEn, leg: p[1].legEn, n: p[1].steps.map(function (s) { return s.nEn; }), cap: p[1].steps.map(function (s) { return s.capEn; }) }; });
  [S1, S2].forEach(function (s) { s.SEG.forEach(function (g) { g.d0 = g.d; }); });
  // 每一步的長度 = max(動作需要的最短秒數, 字幕讀完需要的秒數);中文與英文各算各的,所以兩種語言的動畫長度不一樣
  function readTime(txt) { return LANG === 'en' ? txt.split(/\s+/).length * 0.3 + 0.9 : Array.from(txt).length * 0.17 + 0.9; }
  function layout(sc) { var a = 0; sc.SEG.forEach(function (g, i) { g.d = Math.max(g.d0, readTime(LANG === 'en' ? sc.EN.cap[i] : g.cap)); sc.ST[i] = a; a += g.d; }); sc.TOTAL = a; }

  // ---------------------------------------------------------------- 播放器介面
  var SC = [S1, S2], cur = S1, ci = 0, t = 0, playing = true, last = performance.now(), TOTAL = 1;
  var seek = document.getElementById('p-seek'), tm = document.getElementById('p-tm'), btn = document.getElementById('p-play'), tlEl = document.getElementById('p-tl'), cap = document.getElementById('p-cap'), ttl = document.getElementById('p-ttl'), leg = document.getElementById('p-leg'), tabs = document.querySelectorAll('[data-sc]'), langs = document.querySelectorAll('[data-lang]'), tot = document.getElementById('p-total');
  function fmt(x) { x = Math.max(0, Math.floor(x)); return Math.floor(x / 60) + ':' + ('0' + (x % 60)).slice(-2) + ' / ' + Math.floor(TOTAL / 60) + ':' + ('0' + Math.round(TOTAL % 60)).slice(-2); }
  function relayout() {
    var frac = TOTAL > 1 ? t / TOTAL : 0; layout(cur); TOTAL = cur.TOTAL; t = frac * TOTAL;
    tlEl.innerHTML = ''; cur.SEG.forEach(function (s, k) { var e = document.createElement('span'); e.textContent = (LANG === 'en' ? cur.EN.n[k] : s.n) + ' ' + (Math.round(s.d * 10) / 10) + 's'; e.style.flex = s.d; if (s.io) e.className = 'io'; tlEl.appendChild(e); });
    ttl.textContent = LANG === 'en' ? cur.EN.title : cur.title; leg.textContent = LANG === 'en' ? cur.EN.leg : cur.leg;
    for (var q = 0; q < langs.length; q++) langs[q].classList.toggle('on', langs[q].getAttribute('data-lang') === LANG);
    if (tot) tot.textContent = Math.round(TOTAL * 10) / 10;
  }
  function use(i) {
    ci = i; cur = SC[i]; SC.forEach(function (s, q) { s.grp.visible = q === i; }); TOTAL = 1; t = 0; playing = true; btn.textContent = '⏸';
    for (var q = 0; q < tabs.length; q++) tabs[q].classList.toggle('on', +tabs[q].getAttribute('data-sc') === i);
    relayout();
  }
  function setLang(l) { LANG = l; relayout(); }
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.06, (now - last) / 1000); last = now;
    if (playing) { t += dt; if (t >= TOTAL) { t = TOTAL - 0.001; playing = false; btn.textContent = '▶'; } seek.value = Math.round(t / TOTAL * 1000); }
    tm.textContent = fmt(t); cur.update(t, now / 1000);
    var k = cur.SEG.length - 1; for (; k > 0; k--) if (t >= cur.ST[k]) break; cap.textContent = LANG === 'en' ? cur.EN.cap[k] : cur.SEG[k].cap;
    r.render(scene, cam);
  }
  btn.onclick = function () { if (t >= TOTAL - 0.01) t = 0; playing = !playing; btn.textContent = playing ? '⏸' : '▶'; };
  document.getElementById('p-re').onclick = function () { t = 0; playing = true; btn.textContent = '⏸'; };
  seek.oninput = function () { t = seek.value / 1000 * TOTAL; };
  for (var q = 0; q < tabs.length; q++) tabs[q].onclick = function () { use(+this.getAttribute('data-sc')); };
  for (q = 0; q < langs.length; q++) langs[q].onclick = function () { setLang(this.getAttribute('data-lang')); };
  window.__proto = { seek: function (x, i, l) { if (l) { LANG = l; } if (i != null) use(i); else relayout(); t = x; playing = false; }, use: use, setLang: setLang, total: function () { return TOTAL; } };
  window.__proto.sweep = function () {                    // 逐格掃過兩個場景、兩種語言:最大的關節超限次數與手搆不到的誤差
    var out = [], saveL = LANG;
    [0, 1].forEach(function (i) { ['zh', 'en'].forEach(function (l) { LANG = l; var sc = SC[i]; layout(sc); var maxV = 0, maxE = 0, where = '', lastV = '', whereT = 0;
      for (var x = 0; x < sc.TOTAL; x += 0.1) { viol.n = 0; viol.last = ''; REACH.err = 0; sc.update(x, x); if (viol.n > maxV) { maxV = viol.n; lastV = viol.last; } if (REACH.err > maxE) { maxE = REACH.err; where = REACH.what; whereT = x; } }
      out.push({ scene: i, lang: l, total: Math.round(sc.TOTAL * 10) / 10, maxViolations: maxV, lastViolation: lastV, maxReachErr: Math.round(maxE * 100) / 100, where: where, at: Math.round(whereT * 10) / 10 }); }); });
    LANG = saveL; relayout(); return out;
  };
  window.__proto.dbg = function (x, i) { use(i); SC[i].update(x, x); var v = new T.Vector3(), o = []; adult.reachLog.forEach(function (rl) { adult.hand(rl[0], v); var sh = adult.shoulder(rl[0], new T.Vector3()); o.push({ s: rl[0], w: Math.round(rl[2] * 100) / 100, target: rl[1].toArray().map(function (n) { return Math.round(n * 100) / 100; }), hand: v.toArray().map(function (n) { return Math.round(n * 100) / 100; }), shoulder: sh.toArray().map(function (n) { return Math.round(n * 100) / 100; }) }); }); return o; };
  use(0); requestAnimationFrame(frame);
})();
