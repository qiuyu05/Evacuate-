/**
 * LOCATION CELL GRID
 * ═══════════════════════════════════════════════════════════
 * Divides floor plan into coarse geographic cells for crowd sensing.
 * Each cell is roughly 50m × 50m in real-world space.
 * Enables spatial grouping of earthquake reports.
 */

/**
 * Floor plan coordinate space:
 * - Original GeoJSON: ~3672 × 2376 px (architectural scale)
 * - SVG viewBox: 1200 × 820 px (displayed scale)
 * - Transform: scale by 0.48, offset by (870, 180)
 *
 * In real-world: UW MC Building floor ~200m × 150m
 * So 1 SVG unit ≈ 0.2m (rough approximation)
 */

export const LocationCellGrid = {
  // Define grid cells covering the floor plan
  // Each cell is identified by row, column
  cellSize: 60, // SVG units per cell (~12-15m real world)
  viewBoxWidth: 1200,
  viewBoxHeight: 820,

  getCellId: (x, y) => {
    if (x == null || y == null) return null;
    const cellX = Math.floor(x / LocationCellGrid.cellSize);
    const cellY = Math.floor(y / LocationCellGrid.cellSize);
    return `cell_${cellX}_${cellY}`;
  },

  getCellBounds: (cellId) => {
    const match = cellId.match(/cell_(-?\d+)_(-?\d+)/);
    if (!match) return null;
    const cellX = parseInt(match[1], 10);
    const cellY = parseInt(match[2], 10);
    return {
      x1: cellX * LocationCellGrid.cellSize,
      y1: cellY * LocationCellGrid.cellSize,
      x2: (cellX + 1) * LocationCellGrid.cellSize,
      y2: (cellY + 1) * LocationCellGrid.cellSize,
      x: cellX,
      y: cellY,
    };
  },

  getCellCenter: (cellId) => {
    const bounds = LocationCellGrid.getCellBounds(cellId);
    if (!bounds) return null;
    return {
      x: (bounds.x1 + bounds.x2) / 2,
      y: (bounds.y1 + bounds.y2) / 2,
    };
  },

  getNearbyCell: (cellId, direction) => {
    // direction: 'north', 'south', 'east', 'west', 'all'
    const bounds = LocationCellGrid.getCellBounds(cellId);
    if (!bounds) return [];

    const offsets = {
      north: [0, -1],
      south: [0, 1],
      east: [1, 0],
      west: [-1, 0],
      all: [
        [0, -1], [0, 1], [1, 0], [-1, 0],
        [1, -1], [1, 1], [-1, -1], [-1, 1], // diagonals
      ],
    };

    const dirs = offsets[direction] || offsets.all;
    return dirs
      .map(([dx, dy]) => `cell_${bounds.x + dx}_${bounds.y + dy}`)
      .filter((id) => {
        const b = LocationCellGrid.getCellBounds(id);
        return (
          b && b.x1 >= 0 && b.y1 >= 0 &&
          b.x2 <= LocationCellGrid.viewBoxWidth &&
          b.y2 <= LocationCellGrid.viewBoxHeight
        );
      });
  },

  // Generate all valid cells in the floor plan
  getAllCells: () => {
    const cells = [];
    const gridX = Math.ceil(LocationCellGrid.viewBoxWidth / LocationCellGrid.cellSize);
    const gridY = Math.ceil(LocationCellGrid.viewBoxHeight / LocationCellGrid.cellSize);
    for (let x = 0; x < gridX; x++) {
      for (let y = 0; y < gridY; y++) {
        cells.push(`cell_${x}_${y}`);
      }
    }
    return cells;
  },

  // For visualization: render grid on SVG
  renderGrid: (opacity = 0.05) => {
    const lines = [];
    // Vertical lines
    for (let x = 0; x <= LocationCellGrid.viewBoxWidth; x += LocationCellGrid.cellSize) {
      lines.push(
        <line
          key={`vline_${x}`}
          x1={x}
          y1="0"
          x2={x}
          y2={LocationCellGrid.viewBoxHeight}
          stroke="#00ff8844"
          strokeWidth="0.5"
          opacity={opacity}
        />
      );
    }
    // Horizontal lines
    for (let y = 0; y <= LocationCellGrid.viewBoxHeight; y += LocationCellGrid.cellSize) {
      lines.push(
        <line
          key={`hline_${y}`}
          x1="0"
          y1={y}
          x2={LocationCellGrid.viewBoxWidth}
          y2={y}
          stroke="#00ff8844"
          strokeWidth="0.5"
          opacity={opacity}
        />
      );
    }
    return lines;
  },
};
