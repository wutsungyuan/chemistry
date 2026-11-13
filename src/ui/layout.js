// 版面斷點:
//  - 手機與 iPad(觸控裝置,寬度 ≤ 1400px)共用「手機版面」:3D 在上、面板在下、底部導覽列(見 src/mobile.css,兩邊的條件要一致)
//  - 滑鼠的視窗寬度 ≤ 900px 使用「面板上下堆疊」版面;更寬(桌面)使用左右面板版面
export const NARROW_MAX = 900;
export const PHONE_QUERY = '(max-width: 900px), (pointer: coarse) and (max-width: 1400px)';
export const isNarrow = () => window.innerWidth <= NARROW_MAX || matchMedia(PHONE_QUERY).matches;
