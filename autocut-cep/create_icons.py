#!/usr/bin/env python3
"""
Create simple icons for AutoCut CEP plugin
This script generates the required icon files for the plugin
"""

import os
from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename, is_dark=False, is_hover=False):
    """Create a simple AutoCut icon"""
    
    # Colors
    if is_dark:
        bg_color = (40, 40, 40) if not is_hover else (60, 60, 60)
        icon_color = (0, 120, 212) if not is_hover else (16, 110, 190)
        text_color = (240, 240, 240)
    else:
        bg_color = (240, 240, 240) if not is_hover else (220, 220, 220)
        icon_color = (0, 120, 212) if not is_hover else (16, 110, 190)
        text_color = (40, 40, 40)
    
    # Create image
    img = Image.new('RGBA', (size, size), bg_color + (255,))
    draw = ImageDraw.Draw(img)
    
    # Draw scissors icon (simplified)
    center = size // 2
    
    # Draw cutting lines
    line_width = max(2, size // 16)
    
    # Vertical cutting line
    draw.line([(center, size//4), (center, 3*size//4)], 
              fill=icon_color, width=line_width)
    
    # Horizontal cutting lines (representing cuts)
    for i in range(3):
        y = size//4 + i * size//6
        draw.line([(size//4, y), (3*size//4, y)], 
                  fill=icon_color, width=line_width//2)
    
    # Draw waveform representation
    wave_y = 3 * size // 4 + size // 8
    wave_points = []
    for x in range(size//4, 3*size//4, 4):
        amplitude = (size // 16) * (1 if (x // 4) % 2 == 0 else -1)
        wave_points.extend([(x, wave_y), (x, wave_y + amplitude)])
    
    if wave_points:
        draw.line(wave_points, fill=icon_color, width=1)
    
    # Save the image
    img.save(filename, 'PNG')
    print(f"Created: {filename}")

def main():
    """Create all required icons"""
    
    # Create images directory
    images_dir = "images"
    os.makedirs(images_dir, exist_ok=True)
    
    # Icon specifications
    icons = [
        ("icon_normal.png", 32, False, False),
        ("icon_rollover.png", 32, False, True),
        ("icon_dark_normal.png", 32, True, False),
        ("icon_dark_rollover.png", 32, True, True),
    ]
    
    # Create each icon
    for filename, size, is_dark, is_hover in icons:
        filepath = os.path.join(images_dir, filename)
        create_icon(size, filepath, is_dark, is_hover)
    
    print(f"\nAll icons created successfully in {images_dir}/ directory!")
    print("The CEP plugin should now load properly in Premiere Pro.")

if __name__ == "__main__":
    try:
        main()
    except ImportError:
        print("PIL (Pillow) not found. Installing...")
        import subprocess
        subprocess.check_call(["pip", "install", "Pillow"])
        main()
    except Exception as e:
        print(f"Error creating icons: {e}")
        print("Creating simple placeholder files instead...")
        
        # Create empty PNG files as fallback
        import struct
        
        # Minimal PNG header for 32x32 transparent image
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00 \x00\x00\x00 \x08\x06\x00\x00\x00szz\xf4\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x07tIME\x07\xe8\x06\x1b\x14\x02\x1d\xc3\x9b\x1e\x0b\x00\x00\x00"IDATx\xdac\xf8\x0f\x00\x00\x01\x00\x01\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        
        os.makedirs("images", exist_ok=True)
        for icon_name in ["icon_normal.png", "icon_rollover.png", "icon_dark_normal.png", "icon_dark_rollover.png"]:
            with open(f"images/{icon_name}", "wb") as f:
                f.write(png_data)
            print(f"Created placeholder: images/{icon_name}")
