"""Step 2 of the move: copies the photos the catalogue still uses from the old site's archive into the bundle.

The old site served photos at celinebaby.kz/image/...; the new server keeps exactly the same paths,
so old links (Google Images, Instagram posts) keep working.

Usage: python scripts/collect-old-images.py path/to/well-known.zip deploy/local/bundle
       python scripts/collect-old-images.py --download deploy/local/bundle   (no archive: fetch everything from the old site)
Reads  <bundle>/old-images.txt  (written by export-supabase.mjs)
Writes <bundle>/media/image/...  Photos missing from the archive are downloaded from the old site
while it is still online; whatever is still missing is listed in <bundle>/missing-images.txt.
"""

import os
import sys
from concurrent.futures import ThreadPoolExecutor
import urllib.parse
import urllib.request
import zipfile
import unicodedata

OLD_SITE = "https://celinebaby.kz"


def real_name(info: zipfile.ZipInfo) -> str:
    name = info.filename
    if not info.flag_bits & 0x800:  # name not flagged as UTF-8: zip tools stored raw bytes
        raw = name.encode("cp437")
        for enc in ("utf-8", "cp866", "cp1251"):
            try:
                name = raw.decode(enc)
                break
            except UnicodeDecodeError:
                continue
    return unicodedata.normalize("NFC", name)


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    archive, bundle = sys.argv[1], sys.argv[2]
    wanted = [unicodedata.normalize("NFC", l.strip()) for l in open(os.path.join(bundle, "old-images.txt"), encoding="utf-8") if l.strip()]
    index, lower = {}, {}
    if archive != "--download":
        z = zipfile.ZipFile(archive)
        for info in z.infolist():
            if info.is_dir():
                continue
            n = real_name(info)
            # The archive may hold the site root or a folder above it.
            cut = n.find("image/")
            if cut == -1:
                continue
            key = "/" + n[cut:]
            index.setdefault(key, info)
            lower.setdefault(key.lower(), info)

    copied, missing, total = 0, [], 0
    for url in wanted:
        info = index.get(url) or lower.get(url.lower())
        if not info:
            missing.append(url)
            continue
        dest = os.path.join(bundle, "media", *url.lstrip("/").split("/"))
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        if not os.path.exists(dest) or os.path.getsize(dest) != info.file_size:
            with z.open(info) as src, open(dest, "wb") as dst:
                dst.write(src.read())
        copied += 1
        total += info.file_size

    print(f"copied {copied}/{len(wanted)} photos from the archive, {total / 1e6:.0f} MB")

    def fetch(url: str):
        dest = os.path.join(bundle, "media", *url.lstrip("/").split("/"))
        if os.path.exists(dest) and os.path.getsize(dest) > 0:
            return None
        try:
            req = urllib.request.Request(OLD_SITE + urllib.parse.quote(url), headers={"User-Agent": "celinebaby-migration"})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest + ".part", "wb") as f:
                f.write(data)
            os.replace(dest + ".part", dest)
            return None
        except Exception as e:  # noqa: BLE001
            return f"{url}: {e}"

    with ThreadPoolExecutor(max_workers=8) as pool:
        errors = [e for e in pool.map(fetch, missing) if e]
    print(f"downloaded from the old site: {len(missing) - len(errors)}/{len(missing)}")
    still = [e.split(": ")[0] for e in errors]
    missing = still
    if missing:
        path = os.path.join(bundle, "missing-images.txt")
        open(path, "w", encoding="utf-8").write("\n".join(missing) + "\n")
        print(f"not found anywhere: {len(missing)} (list in {path})")


if __name__ == "__main__":
    main()
