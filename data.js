export function goodsFrom(data) {
  if (data?.error) throw new Error(String(data.error));
  if (!Array.isArray(data?.goods))
    throw new Error("Некорректный ответ API: ожидается массив goods");
  return data.goods.filter(
    (g) => g && typeof g.brand === "string" && g.brand.trim(),
  );
}
export function brandsFrom(goods) {
  return [...new Set(goods.map((g) => g.brand))].sort((a, b) =>
    a.localeCompare(b),
  );
}
export function offersFrom(goods) {
  const rows = [],
    seen = new Set();
  for (const root of goods) {
    for (const g of [
      root,
      ...(Array.isArray(root.analogues) ? root.analogues : []),
    ]) {
      if (!g || !g.brand) continue;
      for (const w of Array.isArray(g.warehouses) ? g.warehouses : []) {
        const row = {
          name: g.name || "Без названия",
          brand: g.brand,
          number: g.number || "",
          warehouse: w.code || w.id || "Не указан",
          price: w.price,
          stock: w.stock,
        };
        const key = JSON.stringify([
          g.goodsID,
          g.brand,
          g.number,
          w.id,
          w.code,
          w.price,
          w.stock,
        ]);
        if (!seen.has(key)) {
          seen.add(key);
          rows.push(row);
        }
      }
    }
  }
  return rows;
}
export const initial = {
  number: "",
  brand: "",
  brands: [],
  offers: [],
  status: "idle",
  error: "",
};
export function reducer(state = initial, action) {
  switch (action.type) {
    case "input":
      return { ...initial, number: action.value };
    case "loadingBrands":
      return { ...initial, number: state.number, status: "loadingBrands" };
    case "brands":
      return { ...state, brands: action.value, status: "brands" };
    case "loadingOffers":
      return {
        ...state,
        brand: action.value,
        offers: [],
        error: "",
        status: "loadingOffers",
      };
    case "offers":
      return { ...state, offers: action.value, status: "offers" };
    case "error":
      return { ...state, status: "error", error: action.value };
    default:
      return state;
  }
}
