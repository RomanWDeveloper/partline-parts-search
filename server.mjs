import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("./dist/", import.meta.url));
const send = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
};
function demo(number, brand) {
  if (number === "ERROR") return { error: "Демонстрационная ошибка API" };
  if (number !== "01089") return { goods: [{}] };
  const item = (b, price) => ({
    goodsID: b,
    brand: b,
    number,
    name: "Ролик приводного ремня",
    warehouses: [
      { id: "1", code: "МС2", price, stock: 12 },
      { id: "2", code: "СПБ", price: price + 100, stock: 0 },
    ],
  });
  return {
    goods: brand
      ? [
          {
            ...item(brand, 1200),
            analogues: [item(brand === "CAFFARO" ? "ZEN" : "CAFFARO", 950)],
          },
        ]
      : [item("CAFFARO", 1200), item("ZEN", 950)],
  };
}
createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.writeHead(405);
      res.end();
      return;
    }
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/parts") {
      const number = url.searchParams.get("number")?.trim(),
        brand = url.searchParams.get("brand")?.trim();
      if (!number || number.length > 100 || (brand && brand.length > 100)) {
        send(res, 400, {
          error: "Укажите корректный артикул и производителя (до 100 символов)",
        });
        return;
      }
      if (url.searchParams.get("demo") === "1") {
        send(res, 200, demo(number, brand));
        return;
      }
      if (!process.env.FAVORIT_API_KEY) {
        send(res, 503, {
          error:
            "Для реального поиска задайте FAVORIT_API_KEY на сервере. Можно включить деморежим.",
        });
        return;
      }
      const target = new URL("https://api.favorit-parts.ru/hs/hsprice/");
      target.search = new URLSearchParams({
        key: process.env.FAVORIT_API_KEY,
        number,
        ...(brand ? { brand, analogues: "on" } : {}),
      }).toString();
      try {
        const upstream = await fetch(target, {
          signal: AbortSignal.timeout(12000),
          redirect: "error",
        });
        if (!upstream.ok) {
          send(res, 502, {
            error: `Сервис автозапчастей ответил HTTP ${upstream.status}`,
          });
          return;
        }
        const data = await upstream.json();
        // Не возвращаем ключ даже если upstream включит его в сообщение ошибки.
        if (data?.error) {
          send(res, 502, {
            error: String(data.error)
              .split(process.env.FAVORIT_API_KEY)
              .join("[скрыто]"),
          });
          return;
        }
        send(res, 200, data);
      } catch {
        send(res, 502, {
          error:
            "Сервис недоступен, ответ некорректен или истекло время ожидания",
        });
      }
      return;
    }
    const path = resolve(
      root,
      "." +
        decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname),
    );
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const mime = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
    };
    try {
      const body = await readFile(path);
      res.writeHead(200, {
        "Content-Type": mime[extname(path)] || "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  } catch {
    send(res, 400, { error: "Некорректный запрос" });
  }
}).listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
  console.log("http://127.0.0.1:" + (process.env.PORT || 3001)),
);
