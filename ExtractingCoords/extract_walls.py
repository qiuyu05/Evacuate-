import fitz
import cv2
import numpy as np
import json

def extract_walls(pdf_path, output_file='walls.json'):
    """Extract wall segments from PDF floor plan"""
    doc = fitz.open(pdf_path)
    page = doc.load_page(0)

    # Same scale as room extraction (3x)
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3))
    img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
    img = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)

    print(f"Image size: {img.shape[1]}x{img.shape[0]}")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Detect edges using Canny
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)

    # Dilate to connect nearby edges
    kernel = np.ones((2, 2), np.uint8)
    dilated = cv2.dilate(edges, kernel, iterations=1)

    # Detect lines using Hough Line Transform
    lines = cv2.HoughLinesP(dilated, 1, np.pi/180, threshold=100,
                            minLineLength=20, maxLineGap=10)

    if lines is None:
        print("No lines detected!")
        return

    print(f"Detected {len(lines)} line segments")

    # Convert to wall segments format [x1, y1, x2, y2]
    walls = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        # Only keep horizontal or vertical walls (within 5 degrees)
        dx = abs(x2 - x1)
        dy = abs(y2 - y1)
        length = np.sqrt(dx**2 + dy**2)

        if length < 15:  # Skip very short segments
            continue

        # Check if mostly horizontal or vertical
        if dx > dy:  # Horizontal
            if dy / dx < 0.1:  # Within ~6 degrees of horizontal
                walls.append([int(x1), int(y1), int(x2), int(y2)])
        else:  # Vertical
            if dx / dy < 0.1:  # Within ~6 degrees of vertical
                walls.append([int(x1), int(y1), int(x2), int(y2)])

    print(f"Filtered to {len(walls)} horizontal/vertical walls")

    # Save as JSON
    with open(output_file, 'w') as f:
        json.dump({
            "walls": walls,
            "image_size": {"width": img.shape[1], "height": img.shape[0]},
            "scale": 3
        }, f, indent=2)

    # Create visualization
    vis_img = img.copy()
    for wall in walls:
        x1, y1, x2, y2 = wall
        cv2.line(vis_img, (x1, y1), (x2, y2), (0, 255, 0), 2)

    cv2.imwrite('walls_visualization.png', vis_img)
    print(f"Saved {len(walls)} walls to {output_file}")
    print("Visualization saved to walls_visualization.png")

    return walls

if __name__ == "__main__":
    walls = extract_walls('floorplan.pdf')

    # Print a sample in JavaScript array format
    if walls:
        print("\nSample JavaScript format (first 10):")
        print("const WALLS_RAW = [")
        for i, wall in enumerate(walls[:10]):
            print(f"  [{wall[0]},{wall[1]},{wall[2]},{wall[3]}],")
        print("  // ... more walls")
        print("];")
