const socket = io();

let myTurn = true;
let symbol = 'X';

const boardCells = [
    '', '', '',
    '', '', '',
    '', '', '',
];

function handleDrawBoard() {
    const board = document.querySelector('#board');

    board.innerHTML = '';

    boardCells.forEach((value, index) => {
        board.innerHTML += `<button onclick='handleClick(${ index })' disabled>${ value }</button>`;
    });
}

function handleChangeTurn() {
    const buttons = document.querySelectorAll('#board button');
    const playerTurnMessage = document.querySelector('#game-panel p');
    const arrowTurn = document.querySelector('#players > span');

    if (myTurn) {
        playerTurnMessage.textContent = 'Sua vez de jogar.';
        
        if (symbol === 'X') {
            arrowTurn.classList.remove('circle');
        } else {
            arrowTurn.classList.add('circle');
        }

        for (const button of buttons) {
            if (button.textContent === '') {
                button.removeAttribute('disabled');
            }
        }
    } else {
        playerTurnMessage.textContent = 'Vez do adversário.';

        if (symbol === 'X') {
            arrowTurn.classList.add('circle');
        } else {
            arrowTurn.classList.remove('circle');
        }

        for (const button of buttons) {
            button.setAttribute('disabled', true);
        }
    }
}

function handleClick(index) {
    socket.emit('player move', {
        position: index,
        symbol,
    });
}

function handleCheckGameOver() {
    const matches = [
        boardCells[0] + boardCells[1] + boardCells[2],
        boardCells[3] + boardCells[4] + boardCells[5],
        boardCells[6] + boardCells[7] + boardCells[8],
        boardCells[0] + boardCells[3] + boardCells[6],
        boardCells[1] + boardCells[4] + boardCells[7],
        boardCells[2] + boardCells[5] + boardCells[8],
        boardCells[0] + boardCells[4] + boardCells[8],
        boardCells[2] + boardCells[4] + boardCells[6],
    ];

    for (const match of matches) {
        if (match === 'XXX' || match === 'OOO') {
            myTurn ? handleGameOverPanel('Você venceu!') : handleGameOverPanel('Você perdeu!');
            return;
        }
    }

    const tie = boardCells.every(cell => {
        return cell !== '';
    });

    if (tie) {
        handleGameOverPanel('Empate. Tente novamente.')
        return;
    }

    myTurn = !myTurn;
    handleChangeTurn();
}

function handleGameOverPanel(message) {
    const winPanel = document.querySelector('#win-panel');
    const winPanelText = document.querySelector('#win-panel h1');

    winPanel.classList.remove('hide');
    winPanelText.textContent = message;
}

function handleRestartGame() {
    const winPanel = document.querySelector('#win-panel');
    winPanel.classList.add('hide');

    for (const cell in boardCells) {
        boardCells[cell] = '';
    }

    handleDrawBoard();
    handleChangeTurn();
}

function game() {
    handleDrawBoard();

    socket.on('begin game', data => {
        symbol = data.symbol;
        myTurn = symbol === 'X';
        handleChangeTurn();
    });

    socket.on('move committed', data => {
        const { position, symbol } = data;

        console.log(`Move committed on position: ${ position } with symbol: ${ symbol }`);

        boardCells[position] = symbol;
        handleDrawBoard();
        handleCheckGameOver();
    });

    socket.on('opponent left', () => {
        const playerTurnMessage = document.querySelector('#game-panel p');

        playerTurnMessage.innerHTML = 'Oponente saiu. <br>Buscando por outro.';

        for (const cell in boardCells) {
            boardCells[cell] = '';
        }

        handleDrawBoard();
    });
}

window.addEventListener('load', game);