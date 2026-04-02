import requests
import json
import os
import math

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
        
        # Rarity score based on population (lower population = higher rarity)
        if population > 0:
            # log10(pop) from ~2 to ~9
            # Small populations (100) -> 2. Large (1B) -> 9.
            # (10 - log10(pop)) -> 8 (small) to 1 (large)
            # Map 1-8 to 0-100 or something similar
            rarity_base = max(0.0, min(1.0, (10 - math.log10(population)) / 8.0))
            rarity_score = round(rarity_base * 100.0, 1)
        else:
            rarity_score = 100.0
            
        countries.append({
            "name": name,
            "code": code,
            "flag_url": flag_url,
            "continent": continent,
            "capital": capital,
            "population": population,
            "rarity_score": rarity_score,
            "colors": [] 
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
        
    print(f"Success! Saved {len(countries)} flags.")
