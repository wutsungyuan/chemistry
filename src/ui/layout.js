// 版面斷點:寬度 ≤ 900px(手機、iPad 直式)使用「面板上下堆疊」版面;
// 更寬(桌面、iPad 橫式)使用左右面板版面。
export const NARROW_MAX = 900;
export const isNarrow = () => window.innerWidth <= NARROW_MAX;
