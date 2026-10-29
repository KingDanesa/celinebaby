import re, json, sys, time, html
from concurrent.futures import ThreadPoolExecutor
import requests
from bs4 import BeautifulSoup

OUT = sys.argv[1]
BASE = "https://celinebaby.kz"
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) celinebaby-redesign-bot"}
sess = requests.Session()
sess.headers.update(H)

CATS = """verhnyaya-odezhda/
verhnyaya-odezhda/kurtki-i-vetrovki/
verhnyaya-odezhda/uteplennye-kombinezony/
dlya-detej/
dlya-detej/dzhinsy-i-leginsy/
dlya-detej/pizhamy-i-domashnyaya-odezhda/
dlya-detej/platya-i-yubki/
dlya-detej/rubashki-1/
dlya-detej/platya-i-sarafany/
dlya-malyshej/
dlya-malyshej/aksessuary/
dlya-malyshej/bodi-i-slipy/
dlya-malyshej/kardigany-1/
dlya-malyshej/kombinezon/
dlya-malyshej/konvert/
dlya-malyshej/devochki-komplekt/
dlya-malyshej/malchiki-kostyum/
dlya-malyshej/dlya-malyshej-platya-yubki/
dlya-malyshej/pledy-i-pelenki/
dlya-malyshej/polzunki-i-shtanishki/
dlya-malyshej/rompery/
dlya-malyshej/shapka-i-snudy/
nabory-na-vypisku/
nabory-na-vypisku/podarochnye-boksy/""".split()

def get(url, tries=3):
    for i in range(tries):
        try:
            r = sess.get(url, timeout=30)
            if r.status_code == 200:
                return r.text
        except Exception as e:
            time.sleep(1 + i)
    return None

# ---------- 1. discover products per category ----------
prod_cats = {}   # url -> set(cat paths)
cat_meta = {}
def crawl_cat(path):
    page = 1
    found = []
    title = None
    while True:
        h = get(f"{BASE}/{path}?limit=100&page={page}")
        if not h: break
        s = BeautifulSoup(h, "lxml")
        if title is None:
            h1 = s.find("h1"); title = h1.get_text(strip=True) if h1 else path
        links = [a["href"] for a in s.select(".product-thumb .product_name a")]
        found += links
        m = re.search(r"всего (\d+) страниц", h)
        total = int(m.group(1)) if m else 1
        if page >= total: break
        page += 1
    cat_meta[path] = {"title": title, "count": len(found)}
    return path, found

with ThreadPoolExecutor(6) as ex:
    for path, links in ex.map(crawl_cat, CATS):
        for l in links:
            prod_cats.setdefault(l, set()).add(path)
        print("cat", path, len(links), flush=True)

urls = sorted(prod_cats)
print("unique products:", len(urls), flush=True)

# ---------- 2. product pages ----------
def parse_product(url):
    h = get(url)
    if not h: return None
    s = BeautifulSoup(h, "lxml")
    d = {"url": url, "slug": url.rstrip("/").split("/")[-1]}
    h1 = s.select_one("h1.title"); d["name"] = h1.get_text(strip=True) if h1 else ""
    m = s.select_one(".prod_model"); d["sku"] = m.get_text(strip=True).replace("Артикул:", "").strip() if m else ""
    p = s.select_one(".calc-price"); d["price"] = float(p["data-price"]) if p and p.has_attr("data-price") else 0
    old = s.select_one(".price-old") or s.select_one(".old-price")
    d["old_price"] = float(re.sub(r"[^\d.]", "", old.get_text())) if old and re.sub(r"[^\d.]", "", old.get_text()) else None
    pid = s.select_one("input[name=product_id]"); d["id"] = int(pid["value"]) if pid else None
    # breadcrumbs
    d["breadcrumb"] = [a.get_text(strip=True) for a in s.select("ul.breadcrumb li a")][1:-1]
    d["breadcrumb_urls"] = [a["href"].replace(BASE + "/", "") for a in s.select("ul.breadcrumb li a")][1:-1]
    # images (original)
    imgs = []
    for a in s.select(".big_images a.big_thumb"):
        href = a.get("href", "")
        if href: imgs.append(BASE + href if href.startswith("/") else href)
    if not imgs:
        for im in s.select(".big_images img"):
            imgs.append(im["src"])
    d["images"] = imgs
    # options
    opts = {}
    for grp in s.select("#product .form-group"):
        lab = grp.select_one("label.control-label")
        if not lab: continue
        title = lab.get_text(strip=True)
        vals = []
        for r in grp.select(".radio-inline"):
            btn = r.select_one(".radio_btn")
            img = r.select_one(".radio_img img")
            if btn: vals.append({"value": btn.get_text(strip=True)})
            elif img: vals.append({"value": img.get("alt", ""), "image": img.get("src", "")})
        sel = grp.select_one("select")
        if sel:
            for o in sel.select("option"):
                if o.get("value"): vals.append({"value": o.get_text(strip=True)})
        if vals: opts[title] = vals
    d["options"] = opts
    desc = s.select_one("#tab-description"); d["description_html"] = desc.decode_contents().strip() if desc else ""
    spec = {}
    for tr in s.select("#tab-specification0 tr"):
        tds = [td.get_text(" ", strip=True) for td in tr.select("td")]
        if len(tds) == 2: spec[tds[0]] = tds[1]
    d["spec"] = spec
    d["categories"] = sorted(prod_cats.get(url, []))
    # stock
    d["in_stock"] = "Нет в наличии" not in h
    return d

products = []
with ThreadPoolExecutor(8) as ex:
    for i, p in enumerate(ex.map(parse_product, urls)):
        if p: products.append(p)
        if i % 50 == 0: print("prod", i, flush=True)

json.dump({"categories": cat_meta, "products": products}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("done", len(products))
