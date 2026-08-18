import os
import glob
import re

html_files = glob.glob('public/*.html')

new_icon = """<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18M9 6h6M8 10h8M8 14h8M9 18h6" />
                            </svg>"""

pattern = re.compile(r'<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">\s*<path stroke-linecap="round" stroke-linejoin="round" d="M6\.5 8c0-3\.5 1\.5-5 5\.5-5s5\.5 1\.5 5\.5 5M6\.5 11h11M6\.5 11c0 4 2 6 5\.5 6s5\.5-2 5\.5-6M9\.5 14h5M3 21c0-4\.5 3-7 5\.5-7l3\.5 2 3\.5-2c2\.5 0 5\.5 2\.5 5\.5 7" />\s*</svg>(\s*)<span class="sidebar-text truncate text-\[14\.5px\]">Opme</span>')

for filepath in html_files:
    with open(filepath, 'r') as f:
        content = f.read()
    
    new_content = pattern.sub(f'{new_icon}\\1<span class="sidebar-text truncate text-[14.5px]">Opme</span>', content)
    
    if new_content != content:
        print(f'Updated {filepath}')
        with open(filepath, 'w') as f:
            f.write(new_content)
