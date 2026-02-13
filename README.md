# Glass Viscosity & Flow Calculator

A web-based tool for calculating the viscosity of molten glass based on its chemical composition (KCC#34 Model) and estimating flow rate through various nozzle shapes.

## Features

### 1. Viscosity Calculator
- **Model**: Based on Alexander Fluegel's 2007 statistical model.
- **Input**: Supports both **Weight %** and **Mol %** composition input for 50+ oxides.
- **Output**:
  - Iso-viscosity temperatures ($T_{1.5}, T_{6.6}, T_{12.0}$).
  - VFT Equation parameters ($A, B, T_0$).
  - Dynamic viscosity curve visualization (Log Viscosity vs. Temperature).
  - Specific calculation: Get viscosity at a given temp, or temp for a given viscosity.

### 2. Melt Flow Calculator
- **Function**: Calculates mass flow rate and velocity for molten glass through a nozzle.
- **Nozzle Shapes**: Circle, Rectangle, Ellipse, Annulus (Ring).
- **Parameters**: Custom density, viscosity, head height, and pressure.

### 3. History System
- Automatically records calculation results.
- **Recall**: Click on any history item to restore the exact inputs and state used for that calculation.
- Supports CSV export (planned).

## Usage

1. Open `index.html` in a modern web browser.
2. Select the desired tab (Flow Calculator or Viscosity Model).
3. Enter parameters and click "Calculate".

## Tech Stack
- HTML5, CSS3, Vanilla JavaScript
- Chart.js for visualization

## License
MIT License
