import json
import webcolors

def closest_colour(requested_colour):
    min_colours = {}
    # Small set of primary colors for game grouping
    COLORS = {
        '#ff0000': 'red',
        '#00ff00': 'green',
        '#0000ff': 'blue',
        '#ffffff': 'white',
        '#000000': 'black',
        '#ffff00': 'yellow',
        '#ffa500': 'orange',
        '#800080': 'purple',
        '#8b4513': 'brown', # brown for some flags
    }
    for hex_val, name in COLORS.items():
        r_c, g_c, b_c = webcolors.hex_to_rgb(hex_val)
        # Weighting colors for better human perception if needed, but simple distance is okay
        rd = (r_c - requested_colour[0]) ** 2
        gd = (g_c - requested_colour[1]) ** 2
        bd = (b_c - requested_colour[2]) ** 2
        min_colours[(rd + gd + bd)] = name
    return min_colours[min(min_colours.keys())]

def get_colour_name(hex_str):
    try:
        if hex_str.startswith('#'):
            if len(hex_str) == 4:
                h = hex_str[1:]
                rgb = (int(h[0]*2, 16), int(h[1]*2, 16), int(h[2]*2, 16))
            else:
                rgb = webcolors.hex_to_rgb(hex_str)
            return closest_colour(rgb)
    except:
        pass
    return None

# Load metadata
metadata_path = r'C:\Users\Admin\.gemini\antigravity\brain\3380f97b-bba5-4203-ada5-b398891b9452\.system_generated\steps\311\content.md'
with open(metadata_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    json_str = "".join(lines[4:])
    metadata = json.loads(json_str)

# Load existing flags_data (the one in src/bin)
flags_data_path = r'c:\Users\Admin\Desktop\guesswhat\backend\src\bin\flags_data.json'
with open(flags_data_path, 'r', encoding='utf-8') as f:
    flags_data = json.load(f)

# Map codes to metadata (case insensitive)
meta_map = {v['code'].lower(): v for k, v in metadata.items()}

updated_count = 0
for country in flags_data:
    code = country['code'].lower()
    if code in meta_map:
        hex_colors = meta_map[code]['colors']
        color_names = list(set([get_colour_name(c) for c in hex_colors]))
        color_names = [c for c in color_names if c is not None]
        
        # Remove reduntant 'color' string field, add 'colors' array
        if 'color' in country:
            del country['color']
        country['colors'] = sorted(color_names)
        
        # Rename rarity to rarity_score
        if 'rarity' in country:
            country['rarity_score'] = float(country['rarity'])
            del country['rarity']
        
        # Add missing fields
        if 'continent' not in country:
            # Simple continent map based on CCA2 could be better, but "Unknown" for now
            country['continent'] = "Unknown"
        if 'flag_emoji' not in country:
            country['flag_emoji'] = ""
            
        updated_count += 1

with open(flags_data_path, 'w', encoding='utf-8') as f:
    json.dump(flags_data, f, indent=2)

# Copy to the and root folder too for consistency
with open(r'c:\Users\Admin\Desktop\guesswhat\backend\flags_data.json', 'w', encoding='utf-8') as f:
    json.dump(flags_data, f, indent=2)

print(f"Updated {updated_count} flag colors to actual arrays.")
