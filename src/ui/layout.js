// 版面的單一來源:<html data-device="mobile|desktop">,平板橫放時再加上 data-split。
// 樣式(mobile.css、themes.css、space.css…)與各場景都只看這兩個屬性,不各自寫「手機版面」的 media query。
//  - mobile:手機與 iPad(寬度 ≤ 900px,或觸控裝置且寬度 ≤ 1400px)——3D 在上、面板在下、底部導覽列
//  - mobile + data-split:平板橫放(寬度 ≥ 1000px 且寬大於高)——3D 在左、面板在右
//  - desktop:其餘(滑鼠的寬視窗)——面板浮在 3D 上
// index.html 的 <head> 有一小段相同的判斷,在第一次畫出畫面之前先設好(否則會閃一下桌機版面);兩邊的條件要一致(tests/layout.test.mjs 會檢查)。
export const NARROW_MAX = 900;
export const PHONE_QUERY = '(max-width: 900px), (pointer: coarse) and (max-width: 1400px)';
export const SPLIT_QUERY = '(min-width: 1000px) and (orientation: landscape)';
export const isNarrow = () => window.innerWidth <= NARROW_MAX || matchMedia(PHONE_QUERY).matches;
export const isSplit = () => isNarrow() && matchMedia(SPLIT_QUERY).matches;

export const getDevice = () => (isNarrow() ? 'mobile' : 'desktop');
/** 把版面種類寫到 <html>;視窗大小或轉向改變時自動更新 */
export function initLayout() {
  const apply = () => { const d = document.documentElement; d.dataset.device = getDevice(); d.toggleAttribute('data-split', isSplit()); };
  apply();
  addEventListener('resize', apply);
  addEventListener('orientationchange', apply);
}
