"""Builds src/data/legacy-redirects.json: old celinebaby.kz (OpenCart) addresses -> new pages.

Old links keep working after the switch (Google results, Instagram bio, saved bookmarks) and pass
their search ranking to the new pages with a 301.

Usage: python scripts/build-legacy-redirects.py path/to/biomix_celinebaby.sql deploy/local/bundle/products.json
       (the second file is the current catalogue; data/seed/products.json is used for deleted products)
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import opencart_dump as dump  # noqa: E402

CATEGORIES = {
    "platya-i-sarafany": "/catalog/platya-i-yubki",
    "platya-i-yubki": "/catalog/platya-i-yubki",
    "dlya-malyshej-platya-yubki": "/catalog/platya-i-yubki",
    "pizhamy-i-domashnyaya-odezhda": "/catalog/toddler",
    "dlja-detej-belje": "/catalog/toddler",
    "dlya-detej": "/catalog/toddler",
    "dlya-malyshej": "/catalog/newborn",
    "novinki": "/catalog/new",
    "dzhinsy-i-leginsy": "/catalog/bryuki-i-leginsy",
    "polzunki-i-shtanishki": "/catalog/bryuki-i-leginsy",
    "verhnyaya-odezhda": "/catalog/verhnyaya-odezhda",
    "kurtki-i-vetrovki": "/catalog/verhnyaya-odezhda",
    "uteplennye-kombinezony": "/catalog/verhnyaya-odezhda",
    "bodi-i-slipy": "/catalog/bodi-i-slipy",
    "nabory-bodi": "/catalog/bodi-i-slipy",
    "pesochniki": "/catalog/rompery",
    "rompery": "/catalog/rompery",
    "chepchiki-i-anticarapki": "/catalog/shapki-i-snudy",
    "shapka-i-snudy": "/catalog/shapki-i-snudy",
    "nabory-na-vypisku": "/catalog/nabory-na-vypisku",
    "podarochnye-boksy": "/catalog/nabory-na-vypisku",
    "pledy-i-pelenki": "/catalog/pledy-i-pelenki",
    "vyazanye-pledy": "/catalog/pledy-i-pelenki",
    "muslinovye-pelenki": "/catalog/pledy-i-pelenki",
    "prazdnichnye-kostyumy": "/catalog/komplekty",
    "komplekt": "/catalog/komplekty",
    "devochki-komplekt": "/catalog/komplekty",
    "malchiki-kostyum": "/catalog/komplekty",
    "konverty-odeyala": "/catalog/konverty",
    "konvert": "/catalog/konverty",
    "kokony": "/catalog/konverty",
    "kombinezon": "/catalog/kombinezony",
    "aksessuary": "/catalog/aksessuary",
    "postel": "/catalog/aksessuary",
    "pinetki": "/catalog/aksessuary",
    "kosmetichki": "/catalog/aksessuary",
    "kardigany-1": "/catalog/kardigany-i-svitera",
    "svitshoty-i": "/catalog/kardigany-i-svitera",
    "rubashki-1": "/catalog/rubashki-i-futbolki",
}

PAGES = {
    # information pages
    "about_us": "/about",
    "kontakty": "/contacts",
    "contact-us": "/contacts",
    "podarochnye-sertifikaty": "/gift-cards",
    "publichnaya-oferta": "/offer",
    "terms": "/offer",
    "delivery": "/delivery",
    "privacy": "/privacy",
    # blog
    "blog": "/blog",
    "chasto-zadavaemye-voprosy": "/delivery",
    "pokupatelyam": "/delivery",
    "dostavlyaete-li-vy-v-drugie-goroda": "/delivery",
    "dostavka": "/delivery",
    "usloviya-oplaty": "/delivery",
    "kak-oplatit-zakaz": "/delivery",
    "kak-oformit-zakaz": "/delivery",
    "mozhno-li-primerit-pered-pokupkoj": "/delivery#returns",
    "zayavka-na-vozvrat": "/delivery#returns",
    "otzyv-o-produkte": "/contacts",
    "tablica-razmerov": "/sizes",
    "chto-nuzhno-kupit-novorozhdyonnomu-na-pervoe-vremya": "/blog/chto-nuzhno-kupit-novorozhdyonnomu-na-pervoe-vremya",
    "razmery-detskoj-odezhdy-kak-ne-oshibitsya": "/blog/razmery-detskoj-odezhdy-kak-ne-oshibitsya",
    "kak-uhazhivat-za-delikatnoj-detskoj-odezhdoj": "/blog/kak-uhazhivat-za-delikatnoj-detskoj-odezhdoj",
    "v-chyom-zabrat-malysha-iz-roddoma-chtoby-ehtot-moment-ostalsya-idealnym": "/blog/v-chyom-zabrat-malysha-iz-roddoma",
    # shop routes
    "sitemap": "/catalog",
    "specials": "/catalog/sale",
    "brands": "/catalog",
    "compare-products": "/catalog",
    "search": "/catalog",
    "cart": "/cart",
    "checkout": "/checkout",
    "wishlist": "/wishlist",
    "login": "/account/login",
    "create-account": "/account/register",
    "forgot-password": "/account/forgot",
    "logout": "/",
    "my-account": "/account",
    "order-history": "/account",
    "order-information": "/account",
    "edit-account": "/account",
    "change-password": "/account",
    "address-book": "/account",
    "edit-address": "/account",
    "add-address": "/account",
    "delete-address": "/account",
    "returns": "/delivery#returns",
    "return-add": "/delivery#returns",
    "vouchers": "/gift-cards",
}


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    sql = dump.load(sys.argv[1])
    live = {p["id"]: p for p in json.load(open(sys.argv[2], encoding="utf-8"))}
    seed_path = os.path.join(os.path.dirname(__file__), "..", "data", "seed", "products.json")
    seed = {p["id"]: p for p in json.load(open(seed_path, encoding="utf-8"))}

    products, product_ids, category_ids = {}, {}, {}
    pages = dict(PAGES)
    pages.update(CATEGORIES)
    unmapped = []
    for row in dump.rows(sql, "oc_url_alias"):
        query, keyword = row["query"].strip(), row["keyword"].strip()
        if not keyword:
            continue
        key, _, value = query.partition("=")
        if key == "product_id":
            pid = int(value)
            p = live.get(pid)
            if p and p.get("status") != "draft":
                target = f"/product/{p['slug']}"
            else:
                old = p or seed.get(pid)
                target = f"/catalog/{old['category']}" if old and old.get("category") else "/catalog"
            products[keyword] = target
            product_ids[value] = target
        elif key == "category_id":
            target = CATEGORIES.get(keyword)
            if target:
                category_ids[value] = target
            else:
                unmapped.append(keyword)
        elif keyword not in pages:
            unmapped.append(keyword)

    out = {"products": products, "pages": pages, "productIds": product_ids, "categoryIds": category_ids}
    dest = os.path.join(os.path.dirname(__file__), "..", "src", "data", "legacy-redirects.json")
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    live_count = sum(1 for t in products.values() if t.startswith("/product/"))
    print(f"products: {len(products)} ({live_count} to a product page, the rest to their category)")
    print(f"pages and categories: {len(pages)}")
    if unmapped:
        print("not mapped (go to the home page):", ", ".join(sorted(set(unmapped))))


if __name__ == "__main__":
    main()
