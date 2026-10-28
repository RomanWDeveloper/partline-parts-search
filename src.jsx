import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { legacy_createStore as createStore } from "redux";
import { Provider, useDispatch, useSelector } from "react-redux";
import "bootstrap/dist/css/bootstrap.min.css";
import "./style.css";
import { reducer, goodsFrom, brandsFrom, offersFrom } from "./data.js";
const store = createStore(reducer, {
  ...reducer(undefined, {}),
  number: "01089",
});
function App() {
  const s = useSelector((s) => s),
    dispatch = useDispatch();
  const demo = import.meta.env.VITE_DEMO !== "false";
  const active = useRef(null),
    revision = useRef(0),
    debounce = useRef(null);
  const invalidate = () => {
    revision.current++;
    active.current?.abort();
  };
  async function search(brand = "") {
    clearTimeout(debounce.current);
    invalidate();
    const id = revision.current,
      controller = new AbortController();
    active.current = controller;
    const number = s.number.trim();
    if (!number) return;
    dispatch({ type: brand ? "loadingOffers" : "loadingBrands", value: brand });
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const params = new URLSearchParams({ number });
      if (brand) {
        params.set("brand", brand);
        params.set("analogues", "on");
      }
      if (demo) params.set("demo", "1");
      const res = await fetch("/api/parts?" + params, {
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Ошибка HTTP ${res.status}`);
      }
      const goods = goodsFrom(await res.json());
      if (id === revision.current)
        dispatch({
          type: brand ? "offers" : "brands",
          value: brand ? offersFrom(goods) : brandsFrom(goods),
        });
    } catch (e) {
      if (id === revision.current)
        dispatch({
          type: "error",
          value:
            e.name === "AbortError"
              ? "Превышено время ожидания. Повторите поиск."
              : e.message,
        });
    } finally {
      clearTimeout(timer);
    }
  }
  useEffect(() => {
    if (!s.number.trim()) return;
    debounce.current = setTimeout(() => search(), 500);
    return () => {
      clearTimeout(debounce.current);
      invalidate();
    };
  }, [s.number, demo]);
  const busy = s.status.startsWith("loading");
  const [onlyStock, setOnlyStock] = useState(false),
    [sort, setSort] = useState("default");
  let rows = s.offers.filter((r) => !onlyStock || Number(r.stock) > 0);
  if (sort !== "default")
    rows = [...rows].sort(
      (a, b) => (Number(a.price) - Number(b.price)) * (sort === "asc" ? 1 : -1),
    );
  const value = (n) =>
    n !== null && n !== "" && Number.isFinite(Number(n))
      ? Number(n).toLocaleString("ru-RU")
      : "—";
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Partline — главная">
          <span className="logo-mark">p</span>partline
          <span className="logo-dot">.</span>
        </a>
        <span className="header-label">ПОИСК АВТОЗАПЧАСТЕЙ</span>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> ТОЧНЫЙ ПОДБОР. ПРОСТОЙ ВЫБОР.
            </div>
            <h1>
              Нужная деталь.
              <br />
              <span>Без лишних поисков.</span>
            </h1>
            <p>
              От артикула до подходящего предложения.
              <br />
              Производители, аналоги и остатки — в одном месте.
            </p>
            <div className="hero-bottom">
              Найти. Выбрать. Посмотреть предложения.
            </div>
          </div>
        </section>
        <section className="search-panel" aria-label="Поиск детали">
          <div className="step-label">
            <span>01</span> НАЙТИ ДЕТАЛЬ
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <label htmlFor="number">Артикул запчасти</label>
            <div className="search-field">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                aria-hidden="true"
              >
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="m16 16 5 5" />
              </svg>
              <input
                autoComplete="off"
                id="number"
                maxLength={100}
                placeholder="Введите артикул"
                value={s.number}
                onChange={(e) => {
                  invalidate();
                  dispatch({ type: "input", value: e.target.value });
                }}
              />
              {s.number && (
                <button
                  type="button"
                  className="clear-button"
                  aria-label="Очистить артикул"
                  onClick={() => {
                    invalidate();
                    dispatch({ type: "input", value: "" });
                  }}
                >
                  ×
                </button>
              )}
              <button
                className="search-button"
                disabled={!s.number.trim() || busy}
              >
                Найти <span>↗</span>
              </button>
            </div>
          </form>
          <div className="search-note">
            {demo ? (
              <>
                <span className="demo-dot" />
                Демо-каталог · цены и остатки вымышлены
              </>
            ) : (
              <>
                <span className="demo-dot live" />
                Каталог поставщика
              </>
            )}
          </div>
        </section>
        {s.brands.length > 0 && (
          <section className="brands-section">
            <div className="section-heading">
              <div>
                <div className="step-label">
                  <span>02</span> ВЫБРАТЬ ПРОИЗВОДИТЕЛЯ
                </div>
                <h2>Кто производит вашу деталь</h2>
              </div>
              <span className="count-label">{s.brands.length} найдено</span>
            </div>
            <div className="brand-grid">
              {s.brands.map((b, i) => (
                <button
                  key={b}
                  type="button"
                  aria-pressed={s.brand === b}
                  className={"brand-card " + (s.brand === b ? "selected" : "")}
                  onClick={() => search(b)}
                >
                  <span className={"brand-monogram brand-" + i}>
                    {b.slice(0, 1)}
                  </span>
                  <span className="brand-info">
                    <strong>{b}</strong>
                    <small>Артикул {s.number.trim()}</small>
                  </span>
                  <span className="brand-arrow">
                    {s.brand === b ? "✓" : "↗"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
        <div aria-live="polite" aria-atomic="true">
          {busy && (
            <div role="status" className="status-panel">
              <span
                className="spinner-border spinner-border-sm"
                aria-hidden="true"
              />
              {s.status === "loadingBrands"
                ? "Ищем производителей…"
                : "Подбираем предложения…"}
            </div>
          )}
          {s.status === "idle" && (
            <div className="empty-state">
              <span className="state-symbol">⌕</span>
              <h2>Каждая деталь начинается с номера</h2>
              <p>Введите артикул, чтобы найти производителей и аналоги.</p>
              {demo && (
                <button
                  className="secondary-button"
                  onClick={() => dispatch({ type: "input", value: "01089" })}
                >
                  Попробовать 01089 ↗
                </button>
              )}
            </div>
          )}
          {s.status === "brands" && !s.brands.length && (
            <div className="empty-state">
              <span className="state-symbol">⌕</span>
              <h2>Пока ничего не нашлось</h2>
              <p>Проверьте артикул или попробуйте другой номер.</p>
            </div>
          )}
          {s.status === "brands" && s.brands.length > 0 && (
            <p className="selection-hint">
              <span>↳</span> Выберите производителя, чтобы увидеть цены и
              аналоги
            </p>
          )}
          {s.status === "error" && (
            <div role="alert" className="error-panel">
              <span className="error-icon">!</span>
              <div>
                <h2>Не удалось получить данные</h2>
                <p>{s.error}</p>
              </div>
              <button
                className="secondary-button"
                onClick={() => search(s.brand)}
              >
                Повторить ↻
              </button>
            </div>
          )}
          {s.status === "offers" && !s.offers.length && (
            <div className="empty-state">
              <h2>Предложений пока нет</h2>
              <p>Попробуйте другого производителя.</p>
            </div>
          )}
        </div>
        {s.status === "offers" && s.offers.length > 0 && (
          <section className="offers-section">
            <div className="section-heading">
              <div>
                <div className="step-label">
                  <span>03</span> ПРЕДЛОЖЕНИЯ И АНАЛОГИ
                </div>
                <h2>
                  Ваша деталь и её аналоги{" "}
                  <span className="total-count">{s.offers.length}</span>
                </h2>
              </div>
              <span className="result-tag">
                {s.brand} / {s.number.trim()}
              </span>
            </div>
            <div className="table-card">
              <div className="table-toolbar">
                <label className="stock-filter">
                  <input
                    type="checkbox"
                    checked={onlyStock}
                    onChange={(e) => setOnlyStock(e.target.checked)}
                  />{" "}
                  Только в наличии
                </label>
                <select
                  aria-label="Сортировка предложений"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="default">Порядок поставщика</option>
                  <option value="asc">Сначала дешевле</option>
                  <option value="desc">Сначала дороже</option>
                </select>
              </div>
              <div className="table-responsive">
                <table>
                  <caption className="visually-hidden">
                    Складские предложения и аналоги
                  </caption>
                  <thead>
                    <tr>
                      {[
                        "Деталь / производитель",
                        "Артикул",
                        "Склад",
                        "Наличие",
                        "Цена",
                      ].map((x) => (
                        <th scope="col" key={x}>
                          {x}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <div className="part-name">{r.name}</div>
                          <div className="part-meta">
                            {r.brand}
                            <span
                              className={
                                "part-type " +
                                (r.brand !== s.brand ? "analogue" : "")
                              }
                            >
                              {r.brand === s.brand
                                ? "Выбранная деталь"
                                : "Аналог"}
                            </span>
                          </div>
                        </td>
                        <td className="number-cell">{r.number}</td>
                        <td>
                          <span className="warehouse-icon">▤</span>{" "}
                          {r.warehouse}
                        </td>
                        <td>
                          <span
                            className={
                              "stock-badge " +
                              (Number(r.stock) > 0
                                ? "available"
                                : "unavailable")
                            }
                          >
                            {Number(r.stock) > 0 ? (
                              <>
                                <i />
                                {value(r.stock)} шт.
                              </>
                            ) : (
                              "Нет в наличии"
                            )}
                          </span>
                        </td>
                        <td className="price-cell">{value(r.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!rows.length && (
                <p className="filtered-empty">
                  Нет предложений в наличии. Снимите фильтр, чтобы увидеть все.
                </p>
              )}
              <div className="table-foot">
                <span>
                  Показано {rows.length} из {s.offers.length} предложений
                </span>
                <span>Цена за единицу · по складам</span>
              </div>
            </div>
          </section>
        )}
      </main>
      <footer>
        <span className="footer-brand">partline.</span>
        <span>Меньше поиска. Больше движения.</span>
        <span>
          {demo ? "ДЕМОНСТРАЦИОННЫЙ КАТАЛОГ" : "КАТАЛОГ АВТОЗАПЧАСТЕЙ"}
        </span>
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <App />
  </Provider>,
);
