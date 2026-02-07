import fitz
import cv2
import numpy as np
import json
import pytesseract

# --- 1. THE DELETE LIST ---
EXCLUDE_LIST = [132, 131, 1, 129, 128, 127, 126, 20, 19, 17, 16, 15, 14, 140, 88, 130, 18, 53, 12, 0]

# --- 2. THE EXIT LIST ---
EXIT_IDS = [1088, 23, 133, 125, 8]

def extract_with_id_markers(pdf_path, output_file='final_rooms.geojson'):
    doc = fitz.open(pdf_path)
    page = doc.load_page(0)
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3))
    img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
    img = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
    
    vis_img = cv2.addWeighted(img, 0.8, np.full(img.shape, (204, 255, 255), np.uint8), 0.2, 0)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 230, 255, cv2.THRESH_BINARY_INV)
    kernel = np.ones((7, 7), np.uint8) 
    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(closed, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    features = []
    found_rooms = [] 
    internal_id_counter = 0
    
    contours = sorted(contours, key=lambda c: cv2.boundingRect(c)[1])

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if 800 < area < (img.shape[0] * img.shape[1] * 0.5):
            M = cv2.moments(cnt)
            if M["m00"] != 0:
                cX, cY = int(M["m10"] / M["m00"]), int(M["m01"] / M["m00"])

                # --- FIXED LINE BELOW ---
                # We use *rest to tell Python "ignore the other values in the list"
                if any(abs(cX - px) < 40 and abs(cY - py) < 40 for (px, py, *rest) in found_rooms):
                    continue

                current_id = internal_id_counter
                internal_id_counter += 1

                if current_id in EXCLUDE_LIST:
                    continue

                if current_id in EXIT_IDS:
                    label = "EXIT"
                    marker_type = "EXIT"
                    color = (255, 0, 0) # Blue for exits
                else:
                    pad = 30
                    roi = gray[max(0, cY-pad):min(img.shape[0], cY+pad), max(0, cX-pad):min(img.shape[1], cX+pad)]
                    try:
                        text = pytesseract.image_to_string(roi, config='--psm 10 -c tessedit_char_whitelist=0123456789').strip()
                        label = text if text else str(current_id)
                    except:
                        label = str(current_id)
                    marker_type = "ROOM"
                    color = (0, 0, 255) # Red for rooms

                found_rooms.append((cX, cY, label, color))

                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [float(cX), float(cY)]},
                    "properties": {
                        "id": current_id,
                        "type": marker_type,
                        "label": label
                    }
                })

    for (cX, cY, label, color) in found_rooms:
        cv2.circle(vis_img, (cX, cY), 10, (255, 255, 255), -1)
        cv2.circle(vis_img, (cX, cY), 6, color, -1)
        cv2.putText(vis_img, label, (cX + 12, cY + 12), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

    cv2.imwrite('final_verification_with_exits.png', vis_img)
    with open(output_file, 'w') as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, indent=4)

    print(f"File saved! {len(features)} points processed.")

extract_with_id_markers('floorplan.pdf')