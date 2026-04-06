#!/usr/bin/env python3
"""
Tistory 블로그 글 이사 스크립트
saens.tistory.com/N 에서 글을 가져와 SvelteKit 블로그 형식으로 변환
"""

import os
import sys
import re
import time
import json
from pathlib import Path
from urllib.request import urlopen, Request, urlretrieve
from urllib.parse import urlparse
from html.parser import HTMLParser
import html

BASE_URL = "https://saens.tistory.com"
BLOG_MD_DIR = Path("/Users/sanghunsong/DEV/saenslog/src/lib/blog/Dev/Unity")
BLOG_STATIC_DIR = Path("/Users/sanghunsong/DEV/saenslog/static/blog/Dev/Unity")

POST_NUMBERS = [5, 9, 12, 13, 14, 16, 18, 22, 23, 26, 28, 29, 30, 31, 32, 33, 35, 36, 39]


def fetch_page(url):
    req = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })
    with urlopen(req) as resp:
        return resp.read().decode("utf-8", errors="replace")


def download_image(img_url, save_path):
    save_path.parent.mkdir(parents=True, exist_ok=True)
    req = Request(img_url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer": BASE_URL
    })
    with urlopen(req) as resp:
        data = resp.read()
    with open(save_path, "wb") as f:
        f.write(data)


def extract_json_ld(html_content):
    """JSON-LD에서 메타 정보 추출"""
    pattern = r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>'
    matches = re.findall(pattern, html_content, re.DOTALL)
    for m in matches:
        try:
            data = json.loads(m)
            if isinstance(data, list):
                data = data[0]
            if data.get("@type") in ("BlogPosting", "Article"):
                return data
        except Exception:
            pass
    return {}


def extract_title(html_content):
    # JSON-LD
    jld = extract_json_ld(html_content)
    if jld.get("headline"):
        return jld["headline"]
    # h1
    m = re.search(r'<h1[^>]*class="[^"]*post-header[^"]*"[^>]*>(.*?)</h1>', html_content, re.DOTALL)
    if m:
        return html.unescape(re.sub(r'<[^>]+>', '', m.group(1))).strip()
    # og:title
    m = re.search(r'<meta[^>]*property=["\']og:title["\'][^>]*content=["\']([^"\']+)["\']', html_content)
    if m:
        return html.unescape(m.group(1))
    return ""


def extract_date(html_content):
    jld = extract_json_ld(html_content)
    if jld.get("datePublished"):
        d = jld["datePublished"]
        # 2024-01-05T15:45:24+09:00 -> 2024-01-05 15:45
        m = re.match(r'(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})', d)
        if m:
            return f"{m.group(1)} {m.group(2)}"
    return ""


def extract_article_html(html_content):
    """본문 HTML 추출"""
    # article 태그 내 entry-content 또는 post-content
    for pattern in [
        r'<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>(.*?)</div>\s*</div>\s*</article',
        r'<div[^>]*id="[^"]*content[^"]*"[^>]*>(.*?)</div>\s*</div>\s*</article',
        r'<div[^>]*class="[^"]*post_content[^"]*"[^>]*>(.*?)</div>\s*</section',
    ]:
        m = re.search(pattern, html_content, re.DOTALL)
        if m:
            return m.group(1)

    # fallback: <article> 전체
    m = re.search(r'<article[^>]*>(.*?)</article>', html_content, re.DOTALL)
    if m:
        return m.group(1)
    return ""


def node_to_md(tag, attrs, children_md, img_counter, post_num):
    """단일 HTML 노드를 마크다운으로"""
    tag = tag.lower()
    inner = children_md.strip()

    if tag in ('p',):
        return f"\n\n{inner}\n\n" if inner else ""
    elif tag == 'br':
        return "\n"
    elif tag in ('h1',):
        return f"\n\n# {inner}\n\n"
    elif tag in ('h2',):
        return f"\n\n## {inner}\n\n"
    elif tag in ('h3',):
        return f"\n\n### {inner}\n\n"
    elif tag in ('h4',):
        return f"\n\n#### {inner}\n\n"
    elif tag in ('h5',):
        return f"\n\n##### {inner}\n\n"
    elif tag in ('h6',):
        return f"\n\n###### {inner}\n\n"
    elif tag in ('strong', 'b'):
        return f"**{inner}**" if inner else ""
    elif tag in ('em', 'i'):
        return f"*{inner}*" if inner else ""
    elif tag in ('code',):
        if '\n' in inner:
            return f"`{inner}`"
        return f"`{inner}`"
    elif tag in ('pre',):
        # 코드 블록 - lang 감지
        lang = attrs.get('data-language') or attrs.get('class') or ''
        lang_match = re.search(r'language-(\w+)', lang)
        lang_str = lang_match.group(1) if lang_match else ''
        # inner에서 ``` 제거
        clean = inner.strip('`').strip()
        return f"\n\n```{lang_str}\n{clean}\n```\n\n"
    elif tag in ('ul',):
        return f"\n\n{inner}\n\n"
    elif tag in ('ol',):
        return f"\n\n{inner}\n\n"
    elif tag in ('li',):
        return f"- {inner}\n"
    elif tag == 'a':
        href = attrs.get('href', '')
        return f"[{inner}]({href})" if href else inner
    elif tag == 'img':
        src = attrs.get('src') or attrs.get('data-src') or ''
        alt = attrs.get('alt') or ''
        # img_counter는 mutable dict로 전달
        img_counter['n'] += 1
        n = img_counter['n']
        ext = 'gif' if 'img.gif' in src else 'png'
        filename = f"{n:02d}_img.{ext}"
        img_counter['urls'].append((src, filename))
        return f"\n\n![{alt}](/blog/Dev/Unity/t{post_num}/{filename})\n\n"
    elif tag in ('hr',):
        return "\n\n---\n\n"
    elif tag in ('blockquote',):
        lines = inner.split('\n')
        return '\n'.join(f"> {l}" for l in lines if l.strip()) + '\n\n'
    elif tag in ('table',):
        return f"\n\n{inner}\n\n"
    elif tag in ('thead', 'tbody', 'tfoot'):
        return inner
    elif tag == 'tr':
        return f"|{inner}|\n"
    elif tag in ('th', 'td'):
        return f" {inner} |"
    elif tag in ('del', 's'):
        return f"~~{inner}~~"
    elif tag in ('figure',):
        return f"\n\n{inner}\n\n"
    elif tag in ('figcaption',):
        return f"\n*{inner}*\n"
    elif tag in ('div', 'section', 'article', 'span', 'aside'):
        return f"\n{inner}\n" if inner else ""
    elif tag in ('script', 'style', 'nav', 'header', 'footer'):
        return ""
    else:
        return inner


class HTMLToMarkdown(HTMLParser):
    """스택 기반 HTML -> Markdown 변환기"""

    def __init__(self, post_num):
        super().__init__()
        self.post_num = post_num
        self.img_counter = {'n': 0, 'urls': []}
        # 스택: (tag, attrs, children_text_list)
        self.stack = [('root', {}, [])]

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in ('script', 'style'):
            self.stack.append((tag, {}, ['__SKIP__']))
            return
        attrs_dict = dict(attrs)
        self.stack.append((tag, attrs_dict, []))

    def handle_endtag(self, tag):
        tag = tag.lower()
        # 스택 최상단에서 해당 태그 찾기
        # void elements
        if tag in ('br', 'hr', 'img', 'input', 'meta', 'link'):
            return
        # 스택에서 꺼내기
        while len(self.stack) > 1:
            top_tag, top_attrs, top_children = self.stack[-1]
            self.stack.pop()
            if top_children and top_children[0] == '__SKIP__':
                # 부모에 아무것도 추가하지 않음
                break
            children_md = "".join(top_children)
            md = node_to_md(top_tag, top_attrs, children_md, self.img_counter, self.post_num)
            self.stack[-1][2].append(md)
            if top_tag == tag:
                break

    def handle_startendtag(self, tag, attrs):
        tag = tag.lower()
        attrs_dict = dict(attrs)
        if tag == 'br':
            self.stack[-1][2].append("\n")
        elif tag == 'hr':
            self.stack[-1][2].append("\n\n---\n\n")
        elif tag == 'img':
            src = attrs_dict.get('src') or attrs_dict.get('data-src') or ''
            alt = attrs_dict.get('alt') or ''
            if src:
                self.img_counter['n'] += 1
                n = self.img_counter['n']
                ext = 'gif' if 'img.gif' in src or src.endswith('.gif') else 'png'
                filename = f"{n:02d}_img.{ext}"
                self.img_counter['urls'].append((src, filename))
                self.stack[-1][2].append(f"\n\n![{alt}](/blog/Dev/Unity/t{self.post_num}/{filename})\n\n")

    def handle_data(self, data):
        if self.stack and self.stack[-1][2] and self.stack[-1][2][0] == '__SKIP__':
            return
        self.stack[-1][2].append(data)

    def handle_entityref(self, name):
        self.handle_data(html.unescape(f"&{name};"))

    def handle_charref(self, name):
        self.handle_data(html.unescape(f"&#{name};"))

    def get_markdown(self):
        # 닫히지 않은 태그들 처리
        while len(self.stack) > 1:
            top_tag, top_attrs, top_children = self.stack.pop()
            if top_children and top_children[0] == '__SKIP__':
                continue
            children_md = "".join(top_children)
            md = node_to_md(top_tag, top_attrs, children_md, self.img_counter, self.post_num)
            self.stack[-1][2].append(md)

        return "".join(self.stack[0][2])


def html_to_markdown(article_html, post_num):
    parser = HTMLToMarkdown(post_num)
    parser.feed(article_html)
    md = parser.get_markdown()
    img_urls = parser.img_counter['urls']

    # 연속 빈줄 정리
    md = re.sub(r'\n{3,}', '\n\n', md)
    return md.strip(), img_urls


def process_post(post_num):
    url = f"{BASE_URL}/{post_num}"
    print(f"[{post_num}] Fetching {url}...")

    try:
        html_content = fetch_page(url)
    except Exception as e:
        print(f"[{post_num}] ERROR fetching: {e}")
        return False

    title = extract_title(html_content)
    date = extract_date(html_content)
    article_html = extract_article_html(html_content)

    if not article_html:
        print(f"[{post_num}] WARNING: Could not extract article body")
        article_html = ""

    md_content, img_urls = html_to_markdown(article_html, post_num)

    print(f"[{post_num}] Title: {title}")
    print(f"[{post_num}] Date: {date}")
    print(f"[{post_num}] Images: {len(img_urls)}")

    # 이미지 다운로드
    static_img_dir = BLOG_STATIC_DIR / f"t{post_num}"
    static_img_dir.mkdir(parents=True, exist_ok=True)

    for img_url, filename in img_urls:
        if not img_url:
            continue
        save_path = static_img_dir / filename
        try:
            print(f"[{post_num}]   Downloading {filename} from {img_url[:60]}...")
            download_image(img_url, save_path)
        except Exception as e:
            print(f"[{post_num}]   ERROR downloading {filename}: {e}")

    # 마크다운 파일 저장
    md_file = BLOG_MD_DIR / f"t{post_num}.md"
    frontmatter = f"""---
title: "{title}"
date: {date}
tistory: {url}
---

"""
    md_file.write_text(frontmatter + md_content + "\n", encoding="utf-8")
    print(f"[{post_num}] Saved: {md_file}")
    return True


def main():
    numbers = POST_NUMBERS
    if len(sys.argv) > 1:
        numbers = [int(x) for x in sys.argv[1:]]

    BLOG_MD_DIR.mkdir(parents=True, exist_ok=True)
    BLOG_STATIC_DIR.mkdir(parents=True, exist_ok=True)

    success = 0
    fail = 0
    for n in numbers:
        ok = process_post(n)
        if ok:
            success += 1
        else:
            fail += 1
        time.sleep(0.5)  # 너무 빠르게 요청 안 하도록

    print(f"\nDone: {success} success, {fail} failed")


if __name__ == "__main__":
    main()
