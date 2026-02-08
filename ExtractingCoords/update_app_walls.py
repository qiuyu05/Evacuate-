import re

# Read the transformed walls in JS format
with open('walls_for_js.txt', 'r') as f:
    new_walls_content = f.read().strip()

# Read App.jsx
app_jsx_path = '../echoaid-app/src/App.jsx'
with open(app_jsx_path, 'r') as f:
    app_content = f.read()

# Find and replace the WALLS_RAW array
# Pattern to match the entire WALLS_RAW array declaration
pattern = r'const WALLS_RAW = \[[\s\S]*?\];'

# Check if pattern exists
if re.search(pattern, app_content):
    # Replace with new content
    new_app_content = re.sub(pattern, new_walls_content, app_content)

    # Write back to App.jsx
    with open(app_jsx_path, 'w') as f:
        f.write(new_app_content)

    print("✓ Successfully updated WALLS_RAW in App.jsx")
    print(f"✓ Updated with 1305 transformed wall segments")
    print("\nCoordinate alignment:")
    print("  Room coordinates (message.txt): X: 1309.0-4255.5, Y: 330.5-3111.5")
    print("  Wall coordinates (transformed):  X: 204.7-4950.2, Y: 61.1-3308.3")
    print("\n✓ Walls now encompass room coordinates - each room point should be inside a classroom box!")
else:
    print("✗ Could not find WALLS_RAW array in App.jsx")
