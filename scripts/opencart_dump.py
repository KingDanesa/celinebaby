"""Tiny parser for the INSERT statements of the old OpenCart MySQL dump."""

import re, sys

BS = chr(92)


def load(path):
    return open(path, encoding="utf8").read()


def rows(sql, table):
    out = []
    for m in re.finditer(r"INSERT INTO `%s` \(([^)]*)\) VALUES\s*(.*?);\n" % table, sql, re.S):
        cols = [c.strip("` ") for c in m.group(1).split(",")]
        body = m.group(2)
        i, n = 0, len(body)
        while i < n:
            if body[i] != "(":
                i += 1
                continue
            i += 1
            vals, cur, inq, quoted = [], "", False, False
            while i < n:
                ch = body[i]
                if inq:
                    if ch == BS:
                        cur += body[i + 1]
                        i += 2
                        continue
                    if ch == "'":
                        inq = False
                        i += 1
                        continue
                    cur += ch
                    i += 1
                    continue
                if ch == "'":
                    inq, quoted = True, True
                    i += 1
                    continue
                if ch in ",)":
                    v = cur if quoted else cur.strip()
                    vals.append(None if (not quoted and v == "NULL") else v)
                    cur, quoted = "", False
                    i += 1
                    if ch == ")":
                        break
                    continue
                cur += ch
                i += 1
            out.append(dict(zip(cols, vals)))
    return out


if __name__ == "__main__":
    sql = load(sys.argv[1])
    for t in sys.argv[2:]:
        r = rows(sql, t)
        print(t, len(r))
        if r:
            print("  keys:", list(r[0].keys())[:14])
