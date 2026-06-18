import re

with open('css/app.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

# Eden Map CSS: starts with /* ── Eden Map ─────────────────────────── */
# Hero Atlas CSS: starts with /* ── Hero Atlas ────────────────────────────────────── */
# Research Calculator CSS: starts with /* ── Technology / Research ───────────────────────── */

eden_start = css_content.find('/* ── Eden Map ─────────────────────────── */')
eden_end = css_content.find('/* ── Hero Atlas ────────────────────────────────────── */')
if eden_end == -1: eden_end = len(css_content)

if eden_start != -1:
    eden_css = css_content[eden_start:eden_end]
    css_content = css_content[:eden_start] + css_content[eden_end:]
    with open('css/eden-map.css', 'w', encoding='utf-8', newline='\n') as f:
        f.write(eden_css)
    css_content = "@import './eden-map.css';\n" + css_content

atlas_start = css_content.find('/* ── Hero Atlas ────────────────────────────────────── */')
atlas_end = css_content.find('/* ── Settings & Misc ────────────────────────────────── */')
if atlas_end == -1: atlas_end = len(css_content)

if atlas_start != -1:
    atlas_css = css_content[atlas_start:atlas_end]
    css_content = css_content[:atlas_start] + css_content[atlas_end:]
    with open('css/hero-atlas.css', 'w', encoding='utf-8', newline='\n') as f:
        f.write(atlas_css)
    css_content = "@import './hero-atlas.css';\n" + css_content

research_start = css_content.find('/* ── Technology / Research ───────────────────────── */')
research_end = css_content.find('/* ── Eden Map ─────────────────────────── */')
if research_end == -1: research_end = css_content.find('/* ──') # next block

if research_start != -1:
    # Just look for the end of research block
    research_end = css_content.find('/* ──', research_start + 10)
    if research_end == -1: research_end = len(css_content)
    research_css = css_content[research_start:research_end]
    css_content = css_content[:research_start] + css_content[research_end:]
    with open('css/research.css', 'w', encoding='utf-8', newline='\n') as f:
        f.write(research_css)
    css_content = "@import './research.css';\n" + css_content

with open('css/app.css', 'w', encoding='utf-8', newline='\n') as f:
    f.write(css_content)

print("CSS modules extracted.")
