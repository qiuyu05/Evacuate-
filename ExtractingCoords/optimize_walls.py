import json
import numpy as np

def merge_collinear_segments(walls):
    """Merge collinear wall segments that are close together"""
    merged = []
    used = set()

    # Sort walls for consistent processing
    walls = sorted(walls, key=lambda w: (min(w[0], w[2]), min(w[1], w[3])))

    for i, wall1 in enumerate(walls):
        if i in used:
            continue

        x1, y1, x2, y2 = wall1

        # Check if horizontal or vertical
        is_horizontal = abs(y2 - y1) < abs(x2 - x1)

        # Try to find segments to merge
        candidates = [wall1]
        used.add(i)

        for j, wall2 in enumerate(walls[i+1:], i+1):
            if j in used:
                continue

            x3, y3, x4, y4 = wall2

            # Check if same orientation
            is_h2 = abs(y4 - y3) < abs(x4 - x3)
            if is_horizontal != is_h2:
                continue

            # Check if collinear and close
            if is_horizontal:
                # Same y-coordinate (within 3 pixels)
                if abs(y1 - y3) <= 3:
                    # Check if overlapping or touching on x-axis
                    min_x1, max_x1 = min(x1, x2), max(x1, x2)
                    min_x3, max_x3 = min(x3, x4), max(x3, x4)

                    if not (max_x1 < min_x3 - 5 or max_x3 < min_x1 - 5):
                        candidates.append(wall2)
                        used.add(j)
            else:
                # Same x-coordinate (within 3 pixels)
                if abs(x1 - x3) <= 3:
                    # Check if overlapping or touching on y-axis
                    min_y1, max_y1 = min(y1, y2), max(y1, y2)
                    min_y3, max_y3 = min(y3, y4), max(y3, y4)

                    if not (max_y1 < min_y3 - 5 or max_y3 < min_y1 - 5):
                        candidates.append(wall2)
                        used.add(j)

        # Merge all candidates
        if len(candidates) == 1:
            merged.append(wall1)
        else:
            if is_horizontal:
                y_avg = int(np.mean([w[1] for w in candidates] + [w[3] for w in candidates]))
                x_coords = [w[0] for w in candidates] + [w[2] for w in candidates]
                merged.append([min(x_coords), y_avg, max(x_coords), y_avg])
            else:
                x_avg = int(np.mean([w[0] for w in candidates] + [w[2] for w in candidates]))
                y_coords = [w[1] for w in candidates] + [w[3] for w in candidates]
                merged.append([x_avg, min(y_coords), x_avg, max(y_coords)])

    return merged

def remove_duplicates(walls):
    """Remove duplicate or very similar walls"""
    unique = []
    for wall in walls:
        # Normalize: make sure x1 <= x2 and y1 <= y2
        x1, y1, x2, y2 = wall
        normalized = [min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)]

        # Check if similar wall already exists
        is_duplicate = False
        for existing in unique:
            ex1, ey1, ex2, ey2 = existing
            if (abs(normalized[0] - ex1) <= 2 and abs(normalized[1] - ey1) <= 2 and
                abs(normalized[2] - ex2) <= 2 and abs(normalized[3] - ey2) <= 2):
                is_duplicate = True
                break

        if not is_duplicate:
            unique.append(normalized)

    return unique

def format_for_js(walls, output_file='walls_formatted.js'):
    """Format walls for JavaScript array"""
    with open(output_file, 'w') as f:
        f.write('const WALLS_RAW = [\n')
        for i, wall in enumerate(walls):
            f.write(f'  [{wall[0]},{wall[1]},{wall[2]},{wall[3]}]')
            if i < len(walls) - 1:
                f.write(',')
            f.write('\n')
        f.write('];\n')

    print(f"Formatted {len(walls)} walls to {output_file}")

if __name__ == "__main__":
    # Load walls
    with open('walls.json', 'r') as f:
        data = json.load(f)
        walls = data['walls']

    print(f"Original: {len(walls)} walls")

    # Remove duplicates
    walls = remove_duplicates(walls)
    print(f"After removing duplicates: {len(walls)} walls")

    # Merge collinear segments
    walls = merge_collinear_segments(walls)
    print(f"After merging collinear segments: {len(walls)} walls")

    # Save optimized walls
    with open('walls_optimized.json', 'w') as f:
        json.dump({"walls": walls, "count": len(walls)}, f, indent=2)

    # Format for JavaScript
    format_for_js(walls)

    print("\nReady to copy into App.jsx!")
