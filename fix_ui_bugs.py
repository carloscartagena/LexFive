import re
import os

# 1. Fix CSS variables for Chatbot
chatbot_css_path = 'css/chatbot.css'
with open(chatbot_css_path, 'r', encoding='utf-8') as f:
    chatbot_css = f.read()

chatbot_css = chatbot_css.replace('var(--color-surface)', 'var(--surface)')
chatbot_css = chatbot_css.replace('var(--color-primary-dark)', 'var(--gold)')
chatbot_css = chatbot_css.replace('var(--color-primary)', 'var(--navy)')
chatbot_css = chatbot_css.replace('var(--color-bg)', 'var(--bg)')
chatbot_css = chatbot_css.replace('var(--color-text)', 'var(--text)')
chatbot_css = chatbot_css.replace('var(--color-border)', 'var(--line)')

with open(chatbot_css_path, 'w', encoding='utf-8') as f:
    f.write(chatbot_css)

# 2. Fix Sticky Header (overflow-x: hidden -> clip)
base_css_path = 'css/components/base.css'
with open(base_css_path, 'r', encoding='utf-8') as f:
    base_css = f.read()

base_css = base_css.replace('overflow-x: hidden;', 'overflow-x: clip;')

with open(base_css_path, 'w', encoding='utf-8') as f:
    f.write(base_css)

# 3. Fix About Us and Why cards backgrounds
why_css_path = 'css/components/-por-qu-elegirnos-.css'
with open(why_css_path, 'r', encoding='utf-8', errors='ignore') as f:
    why_css = f.read()

# Replace hardcoded backgrounds with variables
why_css = why_css.replace('background: rgba(255,255,255,.9);', 'background: var(--surface);')
why_css = why_css.replace('border: 1px solid rgba(15,30,52,.08);', 'border: 1px solid var(--line);')

# Remove the dark mode override since var(--surface) handles it
why_css = re.sub(r'html\[data-theme="dark"\] \.why\.has-bg-image \.why-card,[\s\S]*?\}', '', why_css)

with open(why_css_path, 'w', encoding='utf-8') as f:
    f.write(why_css)

# 4. Fix Social Media cards background
social_css_path = 'css/components/redes-sociales-4-botones-.css'
with open(social_css_path, 'r', encoding='utf-8') as f:
    social_css = f.read()

social_css = social_css.replace('background: var(--white);', 'background: var(--surface);')
social_css = social_css.replace('color: var(--ink);', 'color: var(--text);')

with open(social_css_path, 'w', encoding='utf-8') as f:
    f.write(social_css)

# 5. Fix custom-3d.css text colors and missing 3D cards
custom_css_path = 'css/components/custom-3d.css'
with open(custom_css_path, 'r', encoding='utf-8', errors='ignore') as f:
    custom_css = f.read()

custom_css = re.sub(r'content:\s*\'[^\']+\';', "content: '✓';", custom_css)

if '.custom-front p {' not in custom_css:
    custom_css += '\n\n.custom-front p {\n    color: #ffffff !important;\n}\n'

with open(custom_css_path, 'w', encoding='utf-8') as f:
    f.write(custom_css)
