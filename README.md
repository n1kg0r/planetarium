# Planetarium 🌌

> **[Live Demo](https://nikgorbachev.github.io/planetarium_js/)** > *Click above to visit the live experience!*

Welcome to **Planetarium - JS**, a browser-based interactive night sky renderer. This project simulates the celestial sphere using real astronomical data, projecting thousands of stars and constellations onto a 2D HTML5 Canvas. 

It acts as both a scientific visualization tool and a relaxing visual experience, featuring a "Story Mode" that tours the constellations and a hidden "Make a Wish" mechanic.

---

## Main Functionalities

### 1. Interactive Sky Map
* **Navigation:** Click and drag to look around the sky (360° view). Scroll to adjust your Field of View (Zoom In/Out).
* **Star Identification:** Hover over any star to see its common name (e.g., "Sirius", "Polaris") and its Bayer designation.
* **Constellation Lines:** The engine renders lines connecting stars to visualize classic constellations (from Andromeda to Vulpecula).

### 2. Story Mode
* **Auto-Tour:** Click anywhere on the background to toggle **Story Mode**. 
* **Behavior:** The camera automatically pans to a visible constellation, zooms in to highlight it, pauses for appreciation, and then moves to the next.
* **Memory:** The system remembers the last 6 constellations visited to ensure a varied journey across the sky.

### 3. Make a Wish
* **Shooting Stars:** Every 3–5 minutes (or if you press `SPACE` while in Story Mode), a shooting star trails across the screen.
* **Wish Logic:** If you catch it, a subtle UI prompt appears inviting you to make a wish.

---

## Under the Hood: The Rendering Pipeline

The core of this engine is a transformation pipeline that takes a star's static position in the universe and draws it as a pixel on your screen. Here is the step-by-step mathematical journey of a single star:

### 1. The Source Data (Equatorial Coordinates)
Stars are stored in the catalog with **Right Ascension (RA)** and **Declination (Dec)**—the longitude and latitude of the celestial sphere.
* **Input:** Strings like `02:31:49` (RA) and `+89:15:50` (Dec).
* **Process:** These are parsed into Radians for mathematical use.

### 2. The Observer (Local Coordinates)
We calculate where the star is relative to *us* (the camera) on Earth.
1.  **Sidereal Time:** We calculate `LST` (Local Sidereal Time) based on the current timestamp and the observer's longitude.
2.  **Hour Angle ($H$):** Calculated as $H = LST - RA$.
3.  **Coordinate Transform:** We convert (RA, Dec) into **Altitude** (height above horizon) and **Azimuth** (compass direction) using spherical trigonometry:
    $$\sin(Alt) = \sin(Dec) \cdot \sin(Lat) + \cos(Dec) \cdot \cos(Lat) \cdot \cos(H)$$

### 3. The 3D Dome Projection
Once we have the Altitude and Azimuth, we project the star onto a 3D unit sphere (a dome) around the camera.
* We convert angular coordinates to a 3D vector $(x, y, z)$ following the planetarium convention:
    * $x$ = South
    * $y$ = East
    * $z$ = Up (Zenith)

### 4. Camera Rotation
We apply a rotation matrix based on where the user is looking (`camera.yaw` and `camera.pitch`). This rotates the entire universe around the camera so that the correct stars fall in front of the lens.

### 5. Perspective Projection (3D to 2D)
Finally, we map the 3D star coordinates onto the flat 2D plane of your screen using a perspective divide.
* **Formula:** $x_{screen} = \text{center}_x + (y' / z') \cdot f$
* If $z'$ (depth) is negative, the star is behind us and is clipped (not drawn).

---

## Implementation Details

### Data Retrieval & Parsing
* **Hero Stars:** A `NAMED_STARS` array manually defines high-profile stars (like Polaris, Sirius, Betelgeuse) to ensure they always have familiar labels.
* **Bulk Star Catalog:** We fetch `stars.json` (containing ~1500 stars). Stars dimmer than magnitude 6.5 (human eye limit) are filtered out to maintain performance.
* **Constellations:** `constellations.json` contains arrays of Star ID pairs (e.g., `[StarA, StarB]`) which the renderer loops through to draw connecting lines.

### The Story Loop
The `animate()` loop handles the "Director" logic for Story Mode:
1.  **Selection:** Uses `getVisibleConstellationsInView()` to find constellations currently on screen.
2.  **Filtering:** Compares against `visitedConstellations` to avoid repetition.
3.  **Tweening:** Smoothly interpolates the `camera.fov` (Field of View) to create the breathing "Zoom In / Zoom Out" effect.

### Variable Magnitude Rendering
Stars aren't just dots; they are drawn with varying opacity (`alpha`) and radius based on their astronomical **Magnitude** ($mag$). 
* **Math:** $Radius = \max(0.6, 1.5 - mag)$
* **Result:** Brighter stars are drawn larger and more opaque, while dimmer stars are smaller and transparent.
