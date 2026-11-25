export const uniqueDice = {
  bud: { name: 'Brote', mark: '✿', faces: [1, 1, 1, 2, 2, 3], text: 'Deja una copia temporal de sí mismo en cada hueco ortogonal libre.' },
  matrix: { name: 'Matriz', mark: '═', faces: [1, 2, 2, 3, 3, 4], text: 'Los dados de su fila, incluidas las piedras, toman el número de este dado.' },
  glass: { name: 'Vitral', mark: '✧', faces: [1, 2, 3, 4, 5, 6], text: 'Tiñe de cobalto los dados activos en ambas diagonales que pasan por esta casilla, incluido el Vitral.' },
  twin: { name: 'Gemelos', mark: '◈', faces: [1, 1, 2, 2, 3, 4], text: 'Dos dados en la misma casilla. El segundo tiene un punto más. Ambos puntúan y pueden entrar en los combos.' },
  steps: { name: 'Peldaño', mark: '⇵', faces: [2, 2, 3, 3, 4, 4], text: 'Reescribe su columna en escalera. Por cada casilla hacia abajo suma 1 y hacia arriba resta 1. Del 6 vuelve al 1.' },
  seal: { name: 'Sello', mark: '✥', faces: [2, 3, 3, 4, 5, 6], text: 'Duplica los puntos del dado activo en la casilla opuesta, reflejada a través del centro del panel.' },
  kiln: { name: 'Ascua', mark: '▲', faces: [1, 2, 2, 3, 3, 4], text: 'Las piedras ortogonales vecinas recuperan su color y vuelven a puntuar durante esta jugada.' },
  compass: { name: 'Rosa de los vientos', mark: '✣', faces: [1, 2, 3, 3, 4, 5], text: 'Añade +0,1× al multiplicador por cada casilla ortogonal vecina ocupada.' },
  invert: { name: 'Reverso', mark: '↔', faces: [1, 2, 3, 4, 5, 6], text: 'Invierte el número de los vecinos ortogonales, también si son piedra. El 1 se vuelve 6, el 2 se vuelve 5 y el 3 se vuelve 4, y viceversa.' },
  bridge: { name: 'Puente', mark: '∩', faces: [1, 2, 3, 4, 5, 6], text: 'Entre dos vecinos opuestos con el mismo número, copia ese número y suma +6 base por pareja. Si se activan las dos parejas, usa el valor de la fila.' },
};

export function projectBoard(state) {
  const { rows, cols } = state;
  const sources = state.board.flatMap((die, cell) => {
    if (!die || die.fixed) return [];
    const spec = die.isUnique ? state.uniques?.[die.uniqueIndex] : state.bag?.[die.id];
    return spec?.unique ? [{ die, cell, key: spec.unique }] : [];
  });
  const numberSteps = [], colorSteps = [];
  if (!sources.length) return { board: state.board, numberSteps, colorSteps };
  const board = state.board.map(die => die ? { ...die } : null);
  const index = (row, col) => row >= 0 && row < rows && col >= 0 && col < cols ? row * cols + col : -1;
  const adjacent = (row, col) => [index(row, col - 1), index(row, col + 1), index(row - 1, col), index(row + 1, col)];
  const setNumber = (target, value) => {
    if (!target) return;
    target.value = value;
    if (target.extra != null) target.extra = (value % 6) + 1;
    target.numberChanged = true;
  };

  for (const { die, cell, key } of sources) {
    if (key === 'twin') board[cell].extra = (die.value % 6) + 1;
    if (key !== 'bud') continue;
    for (const neighbor of adjacent(Math.floor(cell / cols), cell % cols)) {
      if (neighbor >= 0 && !board[neighbor]) board[neighbor] = { ...die, echo: true };
    }
  }

  for (const { die, cell, key } of sources) {
    const row = Math.floor(cell / cols), col = cell % cols;
    switch (key) {
      case 'matrix':
        for (let x = 0; x < cols; x++) setNumber(board[index(row, x)], die.value);
        break;
      case 'steps':
        for (let y = 0; y < rows; y++) setNumber(board[index(y, col)], ((die.value - 1 + (y - row)) % 6 + 6) % 6 + 1);
        break;
      case 'invert':
        for (const neighbor of adjacent(row, col)) {
          const target = board[neighbor];
          if (!target) continue;
          target.value = 7 - target.value;
          if (target.extra != null) target.extra = 7 - target.extra;
          target.numberChanged = true;
        }
        break;
      case 'glass':
        board.forEach((target, at) => {
          if (target && Math.abs(Math.floor(at / cols) - row) === Math.abs(at % cols - col)) target.tint = 0;
        });
        break;
      case 'kiln':
        for (const neighbor of adjacent(row, col)) if (board[neighbor]?.stone) board[neighbor].stone = false;
        break;
    }
  }

  for (const { cell, key } of sources) {
    const neighbors = adjacent(Math.floor(cell / cols), cell % cols);
    if (key === 'seal') {
      const target = board[board.length - 1 - cell];
      if (target && !target.stone) target.sealed = true;
    } else if (key === 'compass') {
      const occupied = neighbors.filter(neighbor => board[neighbor]);
      if (occupied.length) colorSteps.push({ name: uniqueDice[key].name, add: occupied.length * 10, cells: [cell, ...occupied] });
    } else if (key === 'bridge') {
      const opposite = [neighbors.slice(0, 2), neighbors.slice(2)].filter(([a, b]) => board[a] && board[a].value === board[b]?.value);
      if (opposite.length) {
        setNumber(board[cell], board[opposite[0][0]].value);
        numberSteps.push({ name: uniqueDice[key].name, points: opposite.length * 6, cells: [cell, ...opposite.flat()] });
      }
    }
  }
  return { board, numberSteps, colorSteps };
}
