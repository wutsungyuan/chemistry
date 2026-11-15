// 週期表星球的小彩蛋:原子寶寶的星際飛船平常繞著星球飛;點一個元素後,那一格長出發射塔,
// 飛船沿著原本的軌道繼續飛,離軌點火後轉進下降的弧線、再入大氣、腹部朝下落下、翻身點火,最後被發射塔的兩支機械臂(「筷子」)夾住,然後才進入元素頁。
//
// 紀念的真實事件:2026-11-14,SpaceX 星艦第 15 次試飛的 Ship 42 繞地球 14 圈後飛回德州 Starbase,
// 被 2 號發射台的發射塔機械臂接住——第一次有太空船(上面級)從軌道回來被塔接住。
// 公開報導(RTÉ/AFP、SpacePolicyOnline、Teslarati、Starlust)只描述了流程,沒有公布高度、速度等遙測數字:
//   離軌點火 → 再入大氣(高熱)→ 腹部朝下落下減速(belly flop)→ 低空翻身成直立 + 降落點火 → 慢慢滑進兩支機械臂之間,掛在臂上。
//
// 這裡怎麼做:
// 另外參考了官方直播(使用者提供、並反覆看過):高度 0.9 km 時還是腹部朝下,0.5 km 時已經翻身點火;飛船從發射塔的背面(機械臂的另一側)飛回來,
//   在最後關頭越過塔頂並翻身,直立之後慢慢靠向機械臂;被夾住時掛在塔的最頂端(機械臂上方只剩一小截塔),不鏽鋼的背部朝著塔、隔熱瓦的腹部朝外。
//
//   1. 路徑:火箭不是飛機,不能急轉彎。整段路徑都在「原本的軌道面」裡:發射塔所在的那一格先被轉到軌道的正下方,
//      飛船沿軌道飛到離降落點還有 80° 的地方做離軌點火(機尾朝前、引擎逆著飛行方向噴),之後高度沿著一條平滑的弧線降下來,越接近降落點越陡,最後幾乎垂直落下。
//   2. 姿態:只在軌道面內俯仰(用機身和飛行方向的夾角 A 表示)。繞行 A=0(機頭朝前、腹部朝星球)→ 離軌點火 A=180° → 再入 A≈60°(機頭抬高、腹部迎著氣流)
//      → 飛行方向越往下掉,A 越接近 90°(垂直落下時機身打橫,腹部朝下)→ 翻身 A=180°(機頭朝上、引擎朝下)。
//   3. 比例(照真實尺寸換算,以船身長度為 1):星艦船身約 52 m;發射塔約 145 m(真實是 2.8 倍;這裡照使用者的決定用 3 : 1,2026-11-15);塔身寬約 12 m;機械臂約 36 m(0.7 倍);
//      被夾住時船的中心離塔面約 20 m。飛船模型本身比真的星艦胖(長寬比約 4,真的約 5.8),所以機械臂的間距照模型的機身寬度。
//   4. 壓縮的地方(不是真實比例):軌道高度(真的軌道比塔高一千倍以上,這裡只比塔頂高一點)、整段時間(真的從離軌到落地約一小時,這裡約 8 秒)、
//      離降落點還很遠時飛船飛得比較快(縮時);平常繞行時飛船畫得比較大(不然看不到),鏡頭靠近時才縮回和發射塔相配的大小。
//   5. 進場方向與朝向:從塔的背面來、越過塔頂、落在機械臂那一側。腹部朝下落下時機頭朝前,翻身後腹部自然朝前(離開塔的方向)、背部朝著塔,和直播一致。
//      發射塔附近的最後一段(落下、點火、翻過頭後仰、斜飛越過塔頂、靠回機械臂)照合成照片描,見下面的 WAY;高度是壓縮過的。
import * as THREE from 'three';
import { buildShip } from '../landing/ship.js';

// 飛船的大小:平常繞行時 / 降落時(船身長 1.62 × K ≈ 0.036;星球半徑是 1)。降落時要這麼小,軌道高度(0.42 ≈ 塔高的 3.9 倍)才放得下
// 「塔 + 塔頂上方翻身、斜飛 + 腹部朝下落下 + 再上面一段從平飛慢慢彎成往下掉的弧線(約一個塔高)」。高度不夠的話,那段弧線會變成一個直角(先平飛、突然垂直掉下來)。
const K_IDLE = 0.13, K = 0.022;
const LEN = 1.62 * K;                                   // 船身長度(下面的尺寸都用它換算)
const ORBIT_R = 1.42, PERIOD = 16;                      // 繞行半徑與一圈幾秒
// 發射塔(單位和場景一樣):高 3 倍船身、寬 12/52;機械臂掛在塔頂附近(上面只剩一小截塔);機械臂長約半個船身、船中心離塔面約 11/52(這兩個是照直播畫面估的)
const TOWER_H = 3 * LEN, TOWER_W = 12 / 52 * LEN, ARM_LEN = 0.5 * LEN, ARM_H = TOWER_H - 0.3 * LEN, SHIP_X = TOWER_W * 0.64 + 11 / 52 * LEN;
const BODY_R = 0.2 * K, PIN = 0.4 * K;                  // 機身半徑;掛點在機頭襟翼下緣(飛船座標 x ≈ 0.4)
const PHI_D = 1.4;                                      // 離發射塔還有 80°(弧度)時開始下降
const V0 = ORBIT_R * Math.PI * 2 / PERIOD, V_FLOP = 0.085;  // 軌道上的速度;腹部朝下落下時的速度(空氣阻力讓它慢很多;直播裡這一段從 1.9 km 掉到 0.9 km 花了約 11 秒)
// 夾住後停幾秒
const HOLD = 1.0, HATCH = 1.2;   // HATCH:夾住後「元素從飛船出來」的轉場要多久(轉場畫在網頁上,見 PeriodicTable.js)

const DEG = Math.PI / 180;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp01 = x => Math.max(0, Math.min(1, x)), smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const backOut = x => { x = clamp01(x) - 1; return 1 + x * x * (2.7 * x + 1.7); };       // 稍微衝過頭再回來(長出來的感覺)

// 軌道面(固定在場景裡,不跟著星球轉):從正面看幾乎是側面,一條 45° 斜斜穿過星球正面的細長橢圓(左下 ↔ 右上),和經線、緯線都有夾角;
// 飛船一半時間從星球前面飛過、一半時間繞到背面。軌道在畫面上的範圍(左右、上下各約 ±1.0)比星球(1.0)大一點點,不會飛出畫面。
// U:降落點的方向(軌道面裡、正前方偏上 15°;星球只要左右轉 + 上下傾就能把任何一格轉到這裡);S:軌道面裡和 U 垂直的方向。
// 飛船的位置 = r·(cos φ·U + sin φ·S),φ 隨時間變小;φ = 0 是發射塔的正上方。機械臂和掛點在 −S 那一側,所以飛船是從塔的背面(+S)飛來、越過塔頂。
const THETA = 15 * DEG, BETA = 45 * DEG, U = V(0, Math.sin(THETA), Math.cos(THETA));
const N = V(Math.cos(BETA), -Math.sin(BETA) * Math.cos(THETA), Math.sin(BETA) * Math.sin(THETA)), S = V().crossVectors(N, U);
const polar = (r, phi, out) => out.copy(U).multiplyScalar(r * Math.cos(phi)).addScaledVector(S, r * Math.sin(phi));
// ---- 最後一段(發射塔附近)的路徑:照一張把整段降落疊在一起的合成照片(John Kraus 攝)描的,用塔高當單位:[往機械臂那一側的水平距離, 離地高度] ----
//   照片裡:機身打橫、幾乎垂直落下(只微微飄向塔)→ 還打橫的時候引擎就點火 → 機尾被推下去,翻過直立再多仰 30° 左右,引擎朝前進方向噴(同時煞住下墜和橫向速度)
//   → 這樣斜斜飛過塔頂、超過掛點一點 → 擺正,靠回兩支機械臂之間。高度是壓縮過的(照片裡開始翻身約在塔高的 4 倍、越過塔頂約 2 倍,這裡是 1.95 倍與 1.4 倍)。
//   腹部朝下落下那一段從 2.85 倍塔高落到 1.95 倍(將近一個塔高),每落下 1 只往塔飄 0.23,和照片的角度差不多。
//   整段都要「一路往下」:落下時幾乎垂直;點火後才有往塔的橫向速度,但仍然是斜著往下(照片裡約 45°~60°),不能變成水平橫移。
const QC = SHIP_X / TOWER_H, HC = (ARM_H - PIN) / TOWER_H;         // 掛點(飛船中心)
const WAY = [[-0.9, 2.85], [-0.69, 1.95], [-0.38, 1.66], [0, 1.4], [0.3, 1.15], [0.2, 0.95], [QC, HC]];   // 落下的起點、點火處、翻身中、塔頂上方、超過掛點最遠處、靠回來、掛點
const local = ([q, h], out = V()) => out.copy(U).multiplyScalar(1 + h * TOWER_H).addScaledVector(S, -q * TOWER_H);
const P_TOP = local(WAY[0]), P_FIRE = local(WAY[1]), P_CATCH = local(WAY[WAY.length - 1]), R_TOP = P_TOP.length(), PHI_T = Math.atan2(P_TOP.dot(S), P_TOP.dot(U));
// 再入那一段:高度隨「離落下起點的水平距離 l」變化:高度差 = Z·(1 − e^(−l/BEND))。遠的時候貼著軌道;水平速度被空氣耗掉之後,路徑在大約一個半塔高的範圍內
// 平順地彎向下,到落下起點時已經是 60° 往下,接著落下那一段再變陡到幾乎垂直。(之前這裡是「幾乎平飛到塔旁,突然垂直掉下來」,看起來像直角。)
const BEND = 0.58 * TOWER_H;
const radiusAt = phi => R_TOP + (ORBIT_R - R_TOP) * (1 - Math.exp(-Math.max(0, phi - PHI_T) * R_TOP / BEND));

// 發射塔 Mechazilla(「機械哥吉拉」):
//   塔身是方形的鋼桁架(四根角柱 + 每一節的橫樑與交叉斜撐,共九節),不是實心的柱子;塔頂有平台和避雷針。
//   「筷子」是兩支很深的桁架臂,根部粗、尖端細,頂面有一條讓掛點滑動的軌道;兩支臂都裝在一個套住塔身、可以沿著塔上下移動的滑車(carriage)上,
//   臂的下方各有一支斜撐接回滑車。同一面比較低的地方還有一支短短的加注臂(ship quick disconnect arm),接飛船時是收到旁邊的。
//   尺寸:塔高、塔寬照真實比例;機械臂長度與飛船離塔多近,是照 2 號發射台直播畫面估的(2 號塔的臂比 1 號塔短),不是官方數字。
function buildTower() {
  const tower = new THREE.Group(), mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.35, ...o });
  const frame = mat(0x4b5268), armMat = mat(0x6d7589), railMat = mat(0xd9dee9), W = TOWER_W, H = TOWER_H, h = W / 2;
  // 所有桁架桿件用同一個方塊畫很多次(InstancedMesh):bar(a, b, 粗細) 是一根從 a 到 b 的桿
  const bars = [], Yax = V(0, 1, 0), q = new THREE.Quaternion(), dir = V(), mid = V(), scl = V();
  const bar = (a, b, t) => { dir.subVectors(b, a); const len = dir.length(); q.setFromUnitVectors(Yax, dir.normalize()); mid.addVectors(a, b).multiplyScalar(0.5); scl.set(t, len, t); bars.push(new THREE.Matrix4().compose(mid, q, scl)); };
  const corners = [[h, h], [h, -h], [-h, -h], [-h, h]], SEC = 9, sh = H / SEC, T = W * 0.11;
  for (const [x, z] of corners) bar(V(x, 0, z), V(x, H, z), T * 1.25);                                   // 四根角柱
  for (let k = 0; k <= SEC; k++) for (let i = 0; i < 4; i++) {                                           // 每一節:橫樑 + 交叉斜撐
    const [x0, z0] = corners[i], [x1, z1] = corners[(i + 1) % 4], y = k * sh;
    bar(V(x0, y, z0), V(x1, y, z1), T * 0.8);
    if (k < SEC) { bar(V(x0, y, z0), V(x1, y + sh, z1), T * 0.55); bar(V(x1, y, z1), V(x0, y + sh, z0), T * 0.55); }
  }
  bar(V(0, H, 0), V(0, H + W * 1.5, 0), T * 0.7);                                                        // 避雷針
  // 滑車:套住塔身的一圈框(上下兩圈 + 四根短柱),機械臂裝在它朝外的那一面
  const c2 = h * 1.28, cy0 = ARM_H - W * 0.95, cy1 = ARM_H + W * 0.3, ring = [[c2, c2], [c2, -c2], [-c2, -c2], [-c2, c2]];
  for (let i = 0; i < 4; i++) { const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % 4]; for (const y of [cy0, cy1]) bar(V(x0, y, z0), V(x1, y, z1), T); bar(V(x0, cy0, z0), V(x0, cy1, z0), T); }
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), frame, bars.length); bars.forEach((m, i) => inst.setMatrixAt(i, m)); tower.add(inst);
  const box = (w, hh, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), m);
  const pad = box(W * 2.4, W * 0.25, W * 2.4, frame); pad.position.y = W * 0.125; tower.add(pad);
  const cap = box(W * 1.25, W * 0.3, W * 1.25, frame); cap.position.y = H + W * 0.15; tower.add(cap);
  // 兩支「筷子」:以滑車兩側的支點水平擺動;合起來時兩支平行,貼著機身兩側。臂身根部深、尖端淺(把方塊的尖端那一頭往上收)
  const D0 = W * 0.62, D1 = W * 0.26, WD = W * 0.24, pivotZ = BODY_R + WD / 2 + 0.0008;
  const armGeo = new THREE.BoxGeometry(ARM_LEN, D0, WD), ap = armGeo.attributes.position;
  for (let i = 0; i < ap.count; i++) { const tip = ap.getX(i) > 0; ap.setX(i, ap.getX(i) + ARM_LEN / 2); if (ap.getY(i) < 0) ap.setY(i, tip ? -D1 : -D0); else ap.setY(i, 0); }      // 頂面是平的(y = 0),底面往尖端收
  armGeo.computeVertexNormals();
  const arms = [1, -1].map(side => {
    const g = new THREE.Group(); g.position.set(c2, ARM_H, side * pivotZ);
    g.add(new THREE.Mesh(armGeo, armMat));
    const rail = box(ARM_LEN, D1 * 0.25, WD * 0.5, railMat); rail.position.set(ARM_LEN / 2, D1 * 0.12, 0); g.add(rail);
    const strut = box(Math.hypot(ARM_LEN * 0.45, W * 0.9), T, T, armMat); strut.position.set(ARM_LEN * 0.225, -W * 0.5, 0); strut.rotation.z = Math.atan2(W * 0.9, ARM_LEN * 0.45); g.add(strut);   // 斜撐:從滑車下緣斜接到臂的中段
    tower.add(g); return { g, side };
  });
  // 加注臂(收在旁邊)
  const sqd = new THREE.Group(); sqd.position.set(h, H * 0.5, 0); sqd.rotation.y = 1.15;
  const sq = box(ARM_LEN * 0.6, W * 0.3, W * 0.3, armMat); sq.position.x = ARM_LEN * 0.3; sqd.add(sq); tower.add(sqd);
  tower.userData = {
    setArms(open) { arms.forEach(({ g, side }) => { g.rotation.y = -side * 0.55 * open; }); },
    dispose() { tower.traverse(o => { o.geometry?.dispose(); }); frame.dispose(); armMat.dispose(); railMat.dispose(); },
  };
  return tower;
}

/**
 * scene/camera:週期表星球的場景與鏡頭;setPose(yaw, pitch):把星球轉到某個角度;onPhase(name, 位置):'start'、'caught' 時通知(顯示說明文字);'hatch' 時通知並附上飛船在畫面上的位置(-1~1),讓元素從那裡跑出來。
 * 回傳 { update(t, dt), start({ yaw0, pitch0, yaw1, lat }, done), skip(), busy, state(), dispose() }
 */
export function mountCatch({ scene, camera, setPose, onPhase }) {
  const ship = buildShip(); ship.scale.setScalar(K_IDLE); scene.add(ship);
  // 再入大氣時腹部的高熱(橘色的光;邊緣透明、中間亮的一團,不是一塊有邊的板子)
  const heatMat = new THREE.ShaderMaterial({
    uniforms: { opacity: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 p = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; uniform float opacity; void main(){ float k = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(mix(vec3(1.0, 0.35, 0.1), vec3(1.0, 0.85, 0.55), k) * k * opacity, k * opacity); }',
  });
  const heat = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), heatMat); heat.scale.set(1.0, 0.22, 0.42); heat.position.set(0.1, -0.27, 0); ship.add(heat);
  const setHeat = v => { heatMat.uniforms.opacity.value = v; heat.visible = v > 0.01; }; setHeat(0);
  let tower = null;
  // 彩蛋進行時從鏡頭這一側補一盞燈(原本的太陽在另一側,塔和飛船朝鏡頭的那一面會太暗)
  const fill = new THREE.DirectionalLight(0xffffff, 0); scene.add(fill);

  // 姿態:速度方向 vel、軌道面內「速度左轉 90°」的方向 up90(平飛時就是朝天),機身和速度夾 A 度。A=0 機頭朝前、腹部朝星球。
  const m4 = new THREE.Matrix4(), X = V(), Y = V(), vel = V(), up90 = V(), pos = V(), tmp = V();
  function attitude(A) {
    up90.crossVectors(N, vel); const c = Math.cos(A), s = Math.sin(A);
    X.copy(vel).multiplyScalar(c).addScaledVector(up90, s); Y.copy(up90).multiplyScalar(c).addScaledVector(vel, -s);
    m4.makeBasis(X, Y, N); ship.quaternion.setFromRotationMatrix(m4);
  }
  // 發射塔附近用的姿態:直接指定機身的仰角 th(0 = 機頭水平朝著機械臂那一側、背部朝上;90° = 機頭朝天、背部朝著塔;超過 90° = 機頭往後仰)
  function attitudeAbs(th) {
    const c = Math.cos(th), s = Math.sin(th);
    X.copy(S).multiplyScalar(-c).addScaledVector(U, s); Y.copy(S).multiplyScalar(s).addScaledVector(U, c);
    m4.makeBasis(X, Y, N); ship.quaternion.setFromRotationMatrix(m4);
  }
  let phi = 2.4;                                                    // 飛船在軌道上的角度(平常一直變小)
  const wrap = a => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

  // ---- 鏡頭:先退到「看得到降落點上空一大片」的中景(塔在畫面上站直),飛船接近時再推近 ----
  const CAM_DIR = U.clone().multiplyScalar(Math.cos(50 * DEG)).addScaledVector(N, Math.sin(50 * DEG) * Math.cos(35 * DEG)).addScaledVector(S, Math.sin(50 * DEG) * Math.sin(35 * DEG)).normalize();   // 偏向飛船背部那一側,看得到舷窗裡的原子寶寶
  const A_MID = U.clone().multiplyScalar(1.22).addScaledVector(S, 0.15), A_NEAR = U.clone().multiplyScalar(1 + TOWER_H * 1.5).addScaledVector(S, TOWER_H * 0.4), A_CLOSE = U.clone().multiplyScalar(1 + TOWER_H * 0.95).addScaledVector(S, TOWER_H * 0.15);   // 近景對準塔頂、稍微偏向飛船飛來的那一側,落下 → 翻身 → 越過塔頂整段都在畫面裡
  const camPos = V(), camLook = V(), p1 = V(), p2 = V(), p3 = V(), UP0 = V(0, 1, 0);

  let egg = null;
  function reset() {
    if (!egg) return; camera.position.copy(egg.cam0); camera.up.copy(UP0); camera.lookAt(0, 0, 0);
    if (tower) tower.visible = false; setHeat(0); fill.intensity = 0; ship.scale.setScalar(K_IDLE); egg = null;
  }
  function finish() { const done = egg?.done; reset(); done?.(); }

  /** 從現在的角度到掛點的整條路徑(折線)與累積長度。軌道那一段照角度等分;下降那一段越接近掛點取得越密 */
  function buildPath(phi0) {
    const pts = [], add = a => { pts.push(polar(radiusAt(a), a, V())); };
    const top = PHI_T + PHI_D, nCoast = Math.ceil((phi0 - top) / 0.03); for (let i = 0; i < nCoast; i++) add(phi0 - (phi0 - top) * i / nCoast);
    for (let i = 0; i <= 240; i++) add(PHI_T + PHI_D * Math.pow(1 - i / 240, 3));
    const nArc = pts.length, SEG = 24, sp = new THREE.CatmullRomCurve3(WAY.map(w => local(w)), false, 'centripetal').getPoints(SEG * (WAY.length - 1));   // 最後一段:通過 WAY 每一點的平滑曲線
    for (let i = 1; i < sp.length; i++) pts.push(sp[i]);
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const total = cum[cum.length - 1];
    const dD = total - cum[nCoast];
    // 離掛點多遠 —— dD:離軌點(離塔 80°,在這裡做離軌點火);dT:落下起點;dF:引擎點火(開始翻身)的地方
    return { pts, cum, total, dD, dT: total - cum[nArc - 1], dF: total - cum[nArc - 1 + SEG], i: 0 };
  }
  function sample(P, sigma) {
    while (P.i < P.pts.length - 2 && P.cum[P.i + 1] < sigma) P.i++;
    const a = P.pts[P.i], b = P.pts[P.i + 1], seg = P.cum[P.i + 1] - P.cum[P.i] || 1e-6;
    pos.lerpVectors(a, b, clamp01((sigma - P.cum[P.i]) / seg)); vel.subVectors(b, a).normalize();
  }

  function update(t, dt) {
    let burn = false, rcs = 0;
    if (!egg) {
      phi = wrap(phi - dt * Math.PI * 2 / PERIOD); polar(ORBIT_R, phi, pos); vel.copy(U).multiplyScalar(Math.sin(phi)).addScaledVector(S, -Math.cos(phi)); attitude(0);
    } else {
      const E = egg, P = E.path; E.t += dt;
      let d = P.total - E.sigma;                                       // 離掛點還有多遠(沿著路徑)
      // 速度:還在軌道上、離離軌點還遠 → 縮時飛快一點;下降時逐漸被空氣減速;最後翻身點火,慢慢停在掛點
      const coastLeft = d - P.dD - 1.7, warpTo = coastLeft > 0 ? E.warp : 1; E.m += (warpTo - E.m) * (1 - Math.exp(-3 * dt));
      let v = V0 * E.m;
      if (d < P.dD) v = V_FLOP + (V0 - V_FLOP) * smooth((d - P.dT + 0.03) / 0.45);
      if (d < P.dF) v = Math.max(0.016, V_FLOP * Math.pow(d / P.dF, 0.35));
      if (!E.caught) { E.sigma = Math.min(P.total, E.sigma + v * dt); d = P.total - E.sigma; }
      sample(P, E.sigma);
      // 姿態(軌道面內的俯仰角 A)
      const x = d - P.dD;
      let A = 0, abs = null, gy = 0;
      const fall = clamp01(Math.asin(clamp01(-vel.dot(tmp.copy(pos).normalize()))) / (Math.PI / 2)), entryA = (60 + 30 * Math.sqrt(fall)) * DEG;   // 飛行方向往下掉了多少(0 = 平飛,1 = 垂直落下)→ 再入時機身和飛行方向的夾角
      if (x > 0.5) { A = Math.PI * smooth((1.1 - x) / 0.6); rcs = A > 0.05 && A < 3.09 ? 1 : 0; }               // 掉頭:機尾朝前
      else if (x > -0.05) { A = Math.PI; burn = 'one'; }                                                              // 離軌點火(逆著飛行方向噴,減速)
      else if (d > P.dF) {                                                                                         // 轉成再入姿態(腹部迎著氣流),落下時機身打橫
        const e = smooth((-0.05 - x) / 0.5); A = Math.PI + (entryA - Math.PI) * e; rcs = e > 0.02 && e < 0.98 ? -1 : 0;
        setHeat(smooth((P.dD - 0.5 - d) / 0.3) * smooth((d - P.dT - 0.02) / 0.3));
      } else {                                                                                                       // 引擎先點火(機身還打橫)→ 翻過直立再往後仰 → 斜飛越過塔頂 → 最後擺正靠回機械臂
        const s = 1 - d / P.dF; abs = (122 * smooth((s - 0.05) / 0.33) - 32 * smooth((s - 0.72) / 0.25)) * DEG; burn = d > 0.003 ? 'sl' : false; gy = s > 0.05 && s < 0.38 ? 0.3 : 0; setHeat(0);
      }
      if (!E.caught && d < 0.0015) { E.caught = true; E.tc = 0; onPhase?.('caught'); }
      if (E.caught) { E.tc += dt; pos.addScaledVector(U, -0.004 * Math.exp(-E.tc * 5) * Math.cos(E.tc * 16)); if (!E.hatched && E.tc > HOLD) { E.hatched = true; tmp.copy(pos).addScaledVector(U, 0.3 * K).project(camera); onPhase?.('hatch', { x: tmp.x, y: tmp.y }); } if (E.tc > HOLD + HATCH) { finish(); return; } }   // 掛在機械臂上輕輕晃一下
      if (abs != null) attitudeAbs(abs); else attitude(A);
      E.gy = gy;
      // 星球轉過去;發射塔長出來;機械臂在飛船滑進來時合起來
      const e1 = smooth(E.t / 1.5); setPose(E.yaw0 + (E.yaw1 - E.yaw0) * e1, E.pitch0 + (E.pitch1 - E.pitch0) * e1);
      const g = clamp01((E.t - 1.0) / 1.1); tower.visible = g > 0; tower.scale.set(1, Math.max(0.001, backOut(g)), 1); tower.userData.setArms(smooth((d - 0.004) / (LEN * 0.5)));
      // 鏡頭:原本的位置 → 中景 → 飛船接近時推近
      const half = Math.tan(camera.fov / 2 * DEG), eM = smooth(E.t / 2.0), eN = smooth((1.0 - d) / 0.6), eC = smooth((P.dF * 0.95 - d) / (P.dF * 0.6));   // eC:翻身之後再推近一次,看清楚靠向機械臂的那一段
      p1.copy(A_MID).addScaledVector(CAM_DIR, 0.8 / half / Math.min(1, camera.aspect * 1.1)); p2.copy(A_NEAR).addScaledVector(CAM_DIR, TOWER_H * 1.75 / half / Math.min(1, camera.aspect * 1.4)); p3.copy(A_CLOSE).addScaledVector(CAM_DIR, TOWER_H * 1.1 / half / Math.min(1, camera.aspect * 1.4));
      camPos.lerpVectors(E.cam0, p1, eM).lerp(p2, eN).lerp(p3, eC); camLook.copy(A_MID).multiplyScalar(eM).lerp(A_NEAR, eN).lerp(A_CLOSE, eC);
      camera.up.copy(UP0).lerp(U, eM).normalize(); camera.position.copy(camPos); camera.lookAt(camLook);
      fill.position.copy(CAM_DIR).addScaledVector(U, 0.6).addScaledVector(S, 0.5); fill.intensity = 1.5 * eM;
      ship.scale.setScalar(K_IDLE + (K - K_IDLE) * smooth(E.t / 2.0));
    }
    ship.position.copy(pos); ship.userData.update(t, dt, { burn, rcs, gy: egg ? egg.gy : 0 });
  }
  update(0, 0);

  return {
    update,
    /** yaw0/pitch0:星球現在的角度;yaw1:那一格轉到正前方的角度;lat:那一格的緯度(弧度) */
    start({ yaw0, pitch0, yaw1, lat }, done) {
      if (egg) return;
      if (!tower) { tower = buildTower(); X.copy(S).negate(); tmp.crossVectors(X, U); m4.makeBasis(X, U, tmp);       // 機械臂伸向 −S(飛船來的方向 +S 是塔的背面)
        tower.quaternion.setFromRotationMatrix(m4); tower.position.copy(U); scene.add(tower); }
      tower.visible = false; tower.userData.setArms(1);
      // 離離軌點太近(來不及掉頭點火)就多繞一圈
      let phi0 = phi; if (phi0 < PHI_T + PHI_D + 1.25) phi0 += Math.PI * 2;
      const path = buildPath(phi0), coast = path.total - path.dD;
      egg = { t: 0, yaw0, pitch0, yaw1, pitch1: lat - THETA, done, cam0: camera.position.clone(), path, sigma: 0, m: 1, warp: Math.min(5, Math.max(1, (coast - 1.7) / (V0 * 1.6))), caught: false, tc: 0, gy: 0 };
      onPhase?.('start');
    },
    skip() { if (egg) finish(); },
    get busy() { return !!egg; },
    /** 給測試用:飛船位置、機頭方向、離掛點多遠、是否已經夾住 */
    state() { X.set(1, 0, 0).applyQuaternion(ship.quaternion); return { busy: !!egg, caught: !!egg?.caught, left: egg ? egg.path.total - egg.sigma : -1, pos: ship.position.toArray(), nose: X.toArray(), up: U.toArray(), normal: N.toArray(), catchAt: P_CATCH.toArray(), r: ship.position.length() }; },
    dispose() { scene.remove(ship, fill); fill.dispose(); ship.userData.dispose(); if (tower) { scene.remove(tower); tower.userData.dispose(); } egg = null; },
  };
}
