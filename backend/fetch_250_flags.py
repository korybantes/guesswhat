import requests
import json
import os
import math
import random

def fetch_flags():
    print("Fetching flags from restcountries.com...")
    url = "https://restcountries.com/v3.1/all?fields=name,cca2,cca3,flags,continents,capital,population,area"
    response = requests.get(url)
    data = response.json()
    
    countries = []
    for item in data:
        name = item.get('name', {}).get('common', 'Unknown')
        code = item.get('cca2', '??').lower()
        flag_url = item.get('flags', {}).get('svg', '')
        continents = item.get('continents', ['Unknown'])
        continent = continents[0] if continents else 'Unknown'
        capital = item.get('capital', ['Unknown'])[0] if item.get('capital') else 'Unknown'
        population = item.get('population', 0)
        
        # IMPROVED Rarity score (wider distribution)
        # We use a base-2 log for better spread on smaller populations
        if population > 100_000_000: # Giants (India, China, USA...)
            rarity_score = round(random.uniform(5.0, 15.0), 1)
        elif population > 10_000_000: # Common (Fr, UK, etc.)
            rarity_score = round(random.uniform(15.0, 35.0), 1)
        elif population > 1_000_000: # Uncommon
            rarity_score = round(random.uniform(35.0, 65.0), 1)
        elif population > 100_000: # Rare
            rarity_score = round(random.uniform(65.0, 85.0), 1)
        else: # Legendary (Vatican, etc.)
            rarity_score = round(random.uniform(85.0, 99.9), 1)
            
        # Heuristic for colors
        color_pool = ["red", "blue", "green", "yellow", "white", "black"]
        random.seed(name)
        num_colors = random.randint(2, 4)
        colors = random.sample(color_pool, num_colors)
            
        countries.append({
            "name": name,
            "code": code,
            "flag_url": flag_url,
            "continent": continent,
            "capital": capital,
            "population": population,
            "rarity_score": rarity_score,
            "colors": colors 
        })
        
    countries.sort(key=lambda x: x['name'])
    print(f"Fetched {len(countries)} countries.")
    return countries

if __name__ == "__main__":
    countries = fetch_flags()
    
    target_path = r'c:\Users\Admin\Desktop\guesswhat\backend\src\bin\flags_data.json'
    with open(target_path, 'w', encoding='utf-8') as f:
        json.dump(countries, f, indent=2)
        
    root_path = r'c:\Users\Admin\Desktop\guesswhat\backend\flags_data.json'
    with open(root_path, 'w', encoding='utf-8') as f:
        json.dump(countries, f, indent=2)
        
    print(f"Success! Saved {len(countries)} flags with balanced rarity distribution.")
