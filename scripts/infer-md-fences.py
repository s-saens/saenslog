#!/usr/bin/env python3
"""Add language tags to bare ``` fences in blog markdown. Run from repo root."""
from __future__ import annotations

import re
import sys
from pathlib import Path

BLOG = Path(__file__).resolve().parents[1] / "src" / "lib" / "blog"


def infer_lang(code: str, rel_path: str) -> str:
    c = code
    s = c.strip()
    if not s:
        return "text"

    low = rel_path.replace("\\", "/").lower()
    folder_hint = ""
    if "/flutter/" in low:
        folder_hint = "dart"
    elif "/unity/" in low or "/dots/" in low:
        folder_hint = "csharp"
    elif "/algorithm/" in low:
        folder_hint = "cpp"

    # Shaders / HLSL
    if re.search(r"\b(CGPROGRAM|HLSLPROGRAM|Shader\s*\")", c):
        return "hlsl"
    if "SubShader" in c and "Pass" in c:
        return "hlsl"
    if re.search(r"^\s*#pragma\s+(vertex|fragment|surface)", c, re.M):
        return "hlsl"

    # JSON
    st = s.lstrip()
    if (st.startswith("{") and "}" in st) or (st.startswith("[") and "]" in st):
        if re.search(r'^\s*[\[{]\s*["\w]', s, re.M) and '"' in s:
            try:
                # rough: looks like JSON
                if s.count('"') >= 2 and (":" in s or s.strip().startswith("[")):
                    return "json"
            except Exception:
                pass

    # Shell / bash
    if re.search(r"^\s*(\$|#|npm |yarn |git |cd |export |curl )", s, re.M):
        return "bash"
    if "&&" in s and "\n" not in s[:200] and len(s) < 300:
        return "bash"

    # Dart (before Python — `class Foo extends` matches both)
    if folder_hint == "dart" or "/flutter/" in low:
        if re.search(r"\b(extends|@override|ConsumerWidget|WidgetRef|StateNotifier)\b", c):
            return "dart"

    # Python
    if re.search(r"^\s*(def |from \w+ import|import \w)", c, re.M):
        return "python"
    if re.search(r"^\s*class \w+\s*:", c, re.M):
        return "python"

    # Dart / Flutter
    if "package:flutter" in c or "package:flutter/" in c:
        return "dart"
    if re.search(r"\b(Widget|StatefulWidget|StatelessWidget|runApp)\b", c):
        return "dart"
    if folder_hint == "dart":
        return "dart"

    # C++ (algorithm posts)
    if "#include" in c:
        return "cpp"
    if re.search(r"\b(std::|vector<|cout <<|cin >>|namespace std)", c):
        return "cpp"
    if re.search(r"^\s*int\s+main\s*\(", c, re.M):
        return "cpp"

    # C# / Unity
    if "using Unity" in c or "UnityEngine" in c or "Unity.Entities" in c:
        return "csharp"
    if re.search(
        r"\b(IJobEntity|SystemBase|MonoBehaviour|ScriptableObject|BurstCompile)\b", c
    ):
        return "csharp"
    if re.search(
        r"^\s*(namespace |public class |public struct |public interface |public enum )",
        c,
        re.M,
    ):
        return "csharp"
    if re.search(r"\b(var|void|string|int|bool)\s+\w+\s*\(", c) and "{" in c:
        if folder_hint == "csharp" or "/unity/" in low:
            return "csharp"

    # Fallback by folder
    if folder_hint:
        return folder_hint

    return "text"


def process_file(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    lines = raw.split("\n")
    rel = str(path.relative_to(BLOG))

    out: list[str] = []
    i = 0
    changed = False

    while i < len(lines):
        line = lines[i]
        if re.match(r"^```\s*$", line):
            # find closing fence
            j = i + 1
            while j < len(lines) and not re.match(r"^```\s*$", lines[j]):
                j += 1
            if j >= len(lines):
                out.append(line)
                i += 1
                continue
            code = "\n".join(lines[i + 1 : j])
            lang = infer_lang(code, rel)
            new_open = f"```{lang}"
            if lines[i] != new_open:
                changed = True
            out.append(new_open)
            out.extend(lines[i + 1 : j + 1])
            i = j + 1
            continue
        out.append(line)
        i += 1

    if changed:
        path.write_text("\n".join(out) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8")
    return changed


def main() -> None:
    root = BLOG
    if not root.is_dir():
        print("Blog dir not found", root, file=sys.stderr)
        sys.exit(1)
    n = 0
    for p in sorted(root.rglob("*.md")):
        if process_file(p):
            print("updated:", p.relative_to(root))
            n += 1
    print(f"Done. {n} file(s) modified.")


if __name__ == "__main__":
    main()
