// 去掉空值與重複項目，保留第一次出現的順序
// 職能、技能會同時讀「本幫會」與「跨幫會共用」兩份設定，名稱常會重複
export const uniqueList = (list) => Array.from(new Set((list || []).filter(Boolean)))
