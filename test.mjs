import { test } from "node:test";
import assert from "node:assert/strict";
import { goodsFrom, brandsFrom, offersFrom, reducer } from "./data.js";
test("API: пустая структура, ошибки, бренды, складские цены и аналоги", () => {
  assert.deepEqual(goodsFrom({ goods: [{}] }), []);
  assert.throws(
    () => goodsFrom({ error: "Invalid key client!" }),
    /Invalid key/,
  );
  assert.throws(() => goodsFrom({}), /Некорректный/);
  assert.deepEqual(
    brandsFrom([{ brand: "B" }, { brand: "A" }, { brand: "B" }]),
    ["A", "B"],
  );
  const g = {
    brand: "A",
    number: "1",
    price: 99999,
    warehouses: [{ id: "1", price: 100, stock: 0 }],
    analogues: [
      {
        brand: "B",
        number: "2",
        warehouses: [{ id: "2", price: 150, stock: 3 }],
      },
    ],
  };
  assert.deepEqual(
    offersFrom([g, g]).map((r) => [r.brand, r.price, r.stock]),
    [
      ["A", 100, 0],
      ["B", 150, 3],
    ],
  );
  const state = reducer(
    { ...reducer(undefined, {}), offers: [1], brand: "OLD" },
    { type: "input", value: "NEW" },
  );
  assert.equal(state.brand, "");
  assert.deepEqual(state.offers, []);
});
