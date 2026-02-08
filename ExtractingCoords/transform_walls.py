import json

# Load the coordinate transformation parameters
with open('coordinate_transform.json', 'r') as f:
    transform = json.load(f)

scale_x = transform['scale_x']
scale_y = transform['scale_y']
offset_x = transform['offset_x']
offset_y = transform['offset_y']

# Load the optimized walls
with open('walls_optimized.json', 'r') as f:
    data = json.load(f)
    walls = data['walls']

print(f"Transforming {len(walls)} walls...")
print(f"Transformation: x' = {scale_x} * x + {offset_x}")
print(f"                y' = {scale_y} * y + {offset_y}")

# Apply transformation to all wall coordinates
transformed_walls = []
for wall in walls:
    x1, y1, x2, y2 = wall

    # Apply affine transformation
    new_x1 = scale_x * x1 + offset_x
    new_y1 = scale_y * y1 + offset_y
    new_x2 = scale_x * x2 + offset_x
    new_y2 = scale_y * y2 + offset_y

    transformed_walls.append([
        round(new_x1, 1),
        round(new_y1, 1),
        round(new_x2, 1),
        round(new_y2, 1)
    ])

# Save transformed walls
output_data = {
    "walls": transformed_walls,
    "count": len(transformed_walls),
    "transformation": {
        "scale_x": scale_x,
        "scale_y": scale_y,
        "offset_x": offset_x,
        "offset_y": offset_y
    }
}

with open('walls_transformed.json', 'w') as f:
    json.dump(output_data, f, indent=2)

# Format for JavaScript
with open('walls_for_js.txt', 'w') as f:
    f.write('const WALLS_RAW = [\n')
    for i, wall in enumerate(transformed_walls):
        f.write(f'  [{wall[0]},{wall[1]},{wall[2]},{wall[3]}]')
        if i < len(transformed_walls) - 1:
            f.write(',')
        f.write('\n')
    f.write('];\n')

print(f"\nTransformation complete!")
print(f"Saved {len(transformed_walls)} transformed walls to walls_transformed.json")
print(f"JavaScript format saved to walls_for_js.txt")

# Show coordinate ranges
x_coords = [coord for wall in transformed_walls for coord in [wall[0], wall[2]]]
y_coords = [coord for wall in transformed_walls for coord in [wall[1], wall[3]]]
print(f"\nTransformed wall coordinate ranges:")
print(f"  X: {min(x_coords):.1f} to {max(x_coords):.1f}")
print(f"  Y: {min(y_coords):.1f} to {max(y_coords):.1f}")
print(f"\nExpected room coordinate ranges (from message.txt):")
print(f"  X: 1309.0 to 4255.5")
print(f"  Y: 330.5 to 3111.5")
