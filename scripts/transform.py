import json, re, html, collections, sys
S = r"C:\Users\ULTRA\AppData\Local\Temp\claude\C--Users-ULTRA-Desktop-celine-baby\4b06865e-d3a7-4465-8948-e704e873da58\scratchpad\scrape"
OUT = r"C:\Users\ULTRA\Desktop\celine baby\celinebaby\data\seed\products.json"
raw = json.load(open(S + r"\raw.json", encoding="utf-8"))["products"]

# ---- category mapping (priority order: specific first) ----
CAT_RULES = [
    ("nabory-na-vypisku", ["nabory-na-vypisku/", "nabory-na-vypisku/podarochnye-boksy/"]),
    ("verhnyaya-odezhda", ["verhnyaya-odezhda/", "verhnyaya-odezhda/kurtki-i-vetrovki/", "verhnyaya-odezhda/uteplennye-kombinezony/"]),
    ("konverty", ["dlya-malyshej/konvert/"]),
    ("pledy-i-pelenki", ["dlya-malyshej/pledy-i-pelenki/"]),
    ("shapki-i-snudy", ["dlya-malyshej/shapka-i-snudy/"]),
    ("aksessuary", ["dlya-malyshej/aksessuary/"]),
    ("bodi-i-slipy", ["dlya-malyshej/bodi-i-slipy/"]),
    ("rompery", ["dlya-malyshej/rompery/"]),
    ("kombinezony", ["dlya-malyshej/kombinezon/"]),
    ("bryuki-i-leginsy", ["dlya-malyshej/polzunki-i-shtanishki/", "dlya-detej/dzhinsy-i-leginsy/"]),
    ("kardigany-i-svitera", ["dlya-malyshej/kardigany-1/"]),
    ("platya-i-yubki", ["dlya-malyshej/dlya-malyshej-platya-yubki/", "dlya-detej/platya-i-yubki/"]),
    ("rubashki-i-futbolki", ["dlya-detej/rubashki-1/", "dlya-detej/platya-i-sarafany/"]),
    ("komplekty", ["dlya-malyshej/devochki-komplekt/", "dlya-malyshej/malchiki-kostyum/", "dlya-detej/pizhamy-i-domashnyaya-odezhda/"]),
]
NAME_RULES = [
    ("nabory-na-vypisku", ["набор на выписку", "на выписку", "подарочн"]),
    ("verhnyaya-odezhda", ["куртк", "ветровк", "утепл"]),
    ("konverty", ["конверт"]),
    ("pledy-i-pelenki", ["кокон", "плед", "пеленк", "пелёнк", "одеял"]),
    ("shapki-i-snudy", ["шапк", "снуд", "чепчик", "панам"]),
    ("aksessuary", ["косметичк", "пинетк", "носк", "слюнявч", "нагрудник", "повязк", "бант", "игрушк", "сумк", "ремень"]),
    ("bodi-i-slipy", ["боди", "слип"]),
    ("rompery", ["ромпер", "песочник"]),
    ("kombinezony", ["комбинезон"]),
    ("bryuki-i-leginsy", ["брюки", "штанишк", "ползунк", "легинс", "джинс", "шорт"]),
    ("kardigany-i-svitera", ["кардиган", "свитер", "джемпер", "жилет"]),
    ("platya-i-yubki", ["плать", "юбк", "сарафан"]),
    ("rubashki-i-futbolki", ["рубашк", "футболк", "лонгслив"]),
    ("komplekty", ["комплект", "костюм", "двойка", "тройка", "набор"]),
]

def pick_category(p):
    cats = set(p["categories"])
    for slug, paths in CAT_RULES:
        if cats & set(paths): return slug
    n = p["name"].lower()
    bc = " ".join(p["breadcrumb"]).lower()
    if "аксессуары" in bc: return "aksessuary"
    for slug, kws in NAME_RULES:
        if any(k in n for k in kws): return slug
    if "dlya-detej/" in cats: return "komplekty"
    return "komplekty"

# ---- sizes ----
CM = {50:(0,1),56:(0,1),62:(1,3),68:(3,6),74:(6,9),80:(9,12),86:(12,18),90:(18,24),92:(18,24),98:(24,36),104:(36,48),110:(48,60)}
HAT = {"40/42":(0,3),"42/44":(3,6),"44/46":(6,12),"46/48":(12,24),"48/50":(24,48)}
def months_range(s):
    s = s.strip().replace("–","-").replace("—","-")
    m = re.fullmatch(r"(\d+)\s*-\s*(\d+)\s*мес\.?", s)
    if m: return int(m.group(1)), int(m.group(2))
    m = re.fullmatch(r"(\d+)\s*мес\.?", s)
    if m: a=int(m.group(1)); return a, a+6
    m = re.fullmatch(r"(\d+(?:[.,]\d+)?)\s*(?:/|-)\s*(\d+(?:[.,]\d+)?)\s*(?:год|года|лет)", s)
    if m: return int(float(m.group(1).replace(",","."))*12), int(float(m.group(2).replace(",","."))*12)
    m = re.fullmatch(r"(\d+)\s*(?:год|года|лет)", s)
    if m: a=int(m.group(1))*12; return a, a+12
    m = re.fullmatch(r"(\d+)(?:/(\d+))?", s)
    if m and int(m.group(1)) in CM:
        a = CM[int(m.group(1))]; b = CM.get(int(m.group(2)), a) if m.group(2) else a
        return a[0], b[1]
    m = re.fullmatch(r"(\d+)-(\d+)", s)
    if m and int(m.group(1)) in CM and int(m.group(2)) in CM:
        return CM[int(m.group(1))][0], CM[int(m.group(2))][1]
    if s in HAT: return HAT[s]
    return None

def norm_size(s):
    s = re.sub(r"\s+", " ", s.strip()).replace("–","-").replace("—","-")
    s = re.sub(r"(\d)\s*-\s*(\d)", r"\1-\2", s)
    s = re.sub(r"(\d)мес", r"\1 мес", s)
    s = s.replace("x", "×").replace("х", "×").replace("Х", "×")
    s = re.sub(r"(\d)\s*×\s*(\d)", r"\1×\2", s)
    return s

# ---- colors ----
HEX = {"белый":"#FFFFFF","розовый":"#F2B8C6","бежевый":"#D8C2A8","голубой":"#A9CBE8","экрю":"#F1E8DA","серый":"#B4B2B0","зеленый":"#8FB094","зелёный":"#8FB094","пудровый":"#EAC9C9","капучино":"#C8A88B","синий":"#3C5A98","красный":"#C94A4A","кремовый":"#F7EFE2","светло-серый":"#DADAD8","серо-зеленый":"#A5B6A1","молочный":"#F8F3EA","темно синий":"#27375E","темно-синий":"#27375E","топленое молоко":"#EEDDC5","топлёное молоко":"#EEDDC5","черный":"#222222","чёрный":"#222222","натуральный":"#E7DBC8","фиолетовый":"#B49BD3","мятный":"#BFE3D3","графит":"#5B5B5E","коричневый":"#7B5A3C","оливковый":"#8A8F5A","небесный":"#BBD9F0","бургунди":"#7A2E3B","мультиколор":"linear-gradient(135deg,#F2B8C6,#BBD9F0,#F7E1A1)","индиго":"#2E3A6E","шоколад":"#5A3A2A","керамит":"#C9A17A","сухая роза":"#C98E95","персиковый":"#F7C9A9","кофейный":"#9A7B5B","жемчужный":"#EFEFEA","серо-голубой":"#AEBCC9","антрацитовый":"#3E3E42","лиловый":"#C8A2C8","песочный":"#E3CFA9","хаки":"#8A8560","желтый":"#F5D76E","жёлтый":"#F5D76E","горчичный":"#D4A72C","лавандовый":"#C9B6E4","пыльная роза":"#C98E95","терракот":"#B85C38","бирюзовый":"#7CC7C0","малиновый":"#C23B6A","сиреневый":"#C8A2C8","айвори":"#F6F1E4"}
def color_hex(name):
    n = name.strip().lower()
    if n in HEX: return HEX[n]
    first = re.split(r"[-/]", n)[0].strip()
    if first in HEX: return HEX[first]
    for k, v in HEX.items():
        if k in n: return v
    return "#E5DDD8"

def clean_name(n):
    n = re.sub(r"\s+", " ", n).strip().strip("|").strip()
    out, open_q = [], True
    for ch in n:
        if ch in '«»"“”':
            out.append("«" if open_q else "»"); open_q = not open_q
        else: out.append(ch)
    n = "".join(out)
    n = re.sub(r"«\s+", "«", n); n = re.sub(r"\s+»", "»", n)
    n = re.sub(r"(\S)«", lambda m: m.group(1) + " «", n)
    n = re.sub(r"»\s*:", "»:", n)
    n = re.sub(r"\s+", " ", n).strip()
    letters = re.sub(r"[^А-Яа-яA-Za-zЁё]", "", n)
    upper_ratio = sum(ch.isupper() for ch in letters) / len(letters) if letters else 0
    if letters and upper_ratio > 0.6 and len(letters) > 4:
        n = n.lower()
        n = n[0].upper() + n[1:]
        n = re.sub(r"«(\w)", lambda m: "«" + m.group(1).upper(), n)
        n = re.sub(r"(нв|us polo|bugatti|leoking)", lambda m: {"нв":"НВ","us polo":"US Polo","bugatti":"Bugatti","leoking":"Leoking"}[m.group(1)], n)
    return n

def clean_html(h):
    h = html.unescape(h).replace("\xa0", " ")
    h = re.sub(r"<(?!/?(p|br|ul|ol|li|strong|b|em|i)\b)[^>]*>", "", h)
    h = re.sub(r"<(p|li|ul|ol|strong|b|em|i)\s+[^>]*>", r"<\1>", h)
    h = re.sub(r"<p>\s*</p>", "", h)
    h = re.sub(r"\s+", " ", h).strip()
    return h

def brand_of(p):
    b = p["spec"].get("Бренд")
    n = p["name"]
    if b: return b.strip()
    if re.search(r"\bНВ\b", n) or "«НВ»" in n or '"НВ"' in n: return "НВ"
    for k in ["US Polo", "Bugatti", "Leoking"]:
        if k.lower() in n.lower(): return k
    return None

def gender_of(p, cat):
    n = p["name"].lower()
    cats = set(p["categories"])
    if "девоч" in n or "новорожденной" in n or "новорождённой" in n: return "girl"
    if "мальч" in n or "новорожденного" in n or "новорождённого" in n: return "boy"
    if "dlya-malyshej/devochki-komplekt/" in cats: return "girl"
    if "dlya-malyshej/malchiki-kostyum/" in cats: return "boy"
    if cat == "platya-i-yubki": return "girl"
    if cat == "rubashki-i-futbolki" and "рубашк" in n: return "boy"
    return "unisex"

HITS = ["kardigan-teksturnyj-detskij-molochnyj","nabor-bodi-s-dlinnymi-rukavami","zhiletka-dlya-novorozhdyonnoj-iz-hlopka","romper-v-perforaciyu","mahrovye-noski-dlya-detej","noski-kitti","kombinezon-nv-krem","komplekt-zajka-kardigan-s-kapushonom-bruki"]
NEW = ["shtanishki-kapuchino","komplekt-dzhemper-bryuki","nabor-bodi-s-dlinnym-rukavom-v-nabore-2sht-1","shapka-detskaya-ehkryu","bryuki-detskie-sero-zelenyj","bryuki-detskie-shokolad","romper-v-perforaciyu-1","dvojka-dlya-malchika-futbolka-i-shorty-2","bodi-v-perforaciyu"]

def cache_url(orig):
    rel = orig.replace("https://celinebaby.kz/image/", "")
    if "." not in rel.rsplit("/",1)[-1]: return orig
    base, ext = rel.rsplit(".", 1)
    return f"https://celinebaby.kz/image/cache/{base}-contain-no-pad-600x732.{ext}"

seen, products = set(), []
slugs = collections.Counter()
for p in raw:
    if p["id"] in seen or not p["images"] or not p["price"]: continue
    seen.add(p["id"])
    cat = pick_category(p)
    sizes_raw = [o["value"] for o in p["options"].get("Размер", [])]
    sizes = []
    for s in sizes_raw:
        ns = norm_size(s)
        if ns not in sizes: sizes.append(ns)
    ranges = [r for r in (months_range(s) for s in sizes_raw) if r]
    ages = []
    if ranges:
        mn = min(r[0] for r in ranges); mx = max(r[1] for r in ranges)
        if mn < 18: ages.append("newborn")
        if mx > 18: ages.append("toddler")
    else:
        if any(c.startswith("dlya-detej") for c in p["categories"]): ages.append("toddler")
        else: ages.append("newborn")
    colors = []
    for o in p["options"].get("Цвет", []):
        nm = re.sub(r"\s+", " ", o["value"]).strip()
        if nm and nm not in [c["name"] for c in colors]:
            colors.append({"name": nm[0].upper()+nm[1:], "hex": color_hex(nm)})
    slug = p["slug"]
    slugs[slug] += 1
    if slugs[slug] > 1: slug = f"{slug}-{p['id']}"
    tags = []
    if p["slug"] in HITS: tags.append("hit")
    if p["slug"] in NEW: tags.append("new")
    if p.get("old_price"): tags.append("sale")
    products.append({
        "id": p["id"], "slug": slug, "sku": p["sku"] if p["sku"] and p["sku"] != p["name"] else "",
        "name": clean_name(p["name"]),
        "price": int(p["price"]), "oldPrice": int(p["old_price"]) if p.get("old_price") else None,
        "category": cat, "gender": gender_of(p, cat), "ages": ages, "brand": brand_of(p),
        "sizes": sizes, "ageMonths": [min(r[0] for r in ranges), max(r[1] for r in ranges)] if ranges else None,
        "colors": colors,
        "images": [cache_url(i) for i in p["images"]],
        "imagesFull": p["images"],
        "description": clean_html(p["description_html"]),
        "composition": p["spec"].get("Состав", "").strip() or None,
        "care": p["spec"].get("Уход", "").strip() or None,
        "lining": p["spec"].get("Подклад", "").strip() or None,
        "tags": tags, "inStock": p["in_stock"],
        "sourceUrl": p["url"],
    })

# mark newest 24 by id as 'new' too
for p in sorted(products, key=lambda x: -x["id"])[:24]:
    if "new" not in p["tags"]: p["tags"].append("new")

products.sort(key=lambda x: -x["id"])
json.dump(products, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("written", len(products))
print(collections.Counter(p["category"] for p in products))
print(collections.Counter(p["gender"] for p in products))
print(collections.Counter(tuple(p["ages"]) for p in products))
print(collections.Counter(p["brand"] for p in products))
allsizes = collections.Counter(s for p in products for s in p["sizes"]); print(allsizes.most_common(70))
print([p["name"] for p in products if "«" in p["name"]][:10])
