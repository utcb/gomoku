import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import {Provider} from 'react-redux';
import {useSelector, useDispatch } from 'react-redux';
import { markOn, jumpTo } from './gameSlice';
import gameStore, {getSquares, getPlayer, getWinner, getSteps, getStepNumber} from './store';

/**
 * Square: 知道自身的位置（props.index: [0-8]）。外部props传入状态(props.value)
 */
function Square(props) {
  // useDispatch, useSelector，都是react hook，只能在function类型的组件中使用
  const dispatch = useDispatch();
  const squares = useSelector(getSquares);
  const index = props.index;

  let marks = null;
  let player = null;
  let stepNumber = 0;
  let square = squares ? squares[index] : null;
  if (square) {
      stepNumber = square.stepNumber;
      player = square.player;
  }
  let subs = null;
  if (player === 1 || player === 2) { // first player
      marks = player === 1 ? 'X' : 'O';
      // 是否在赢得比赛的三个点击中。标记marks旁的小字，表示第几步，红色表示成功的步骤
      if (stepNumber > 0) {
          if (square.inWinLine) {
              subs = (
                  <sub className="win">{stepNumber}</sub>
              )
          } else {
              subs = (
                  <sub>{stepNumber}</sub>
              )
          }
      }
  } else if (player !== null) { // error
      marks = 'E';
  } else {
      marks = (
          <small><sub>{index}</sub></small>
      );
  }
  return (
      <button className="square" onClick={()=>dispatch(markOn(index))}>
          {marks}{subs}
      </button>
      );
}

class Board extends React.Component {
  render() {
    return (
      <div className="game-board">
        <div>
          {[0,1,2].map(row=>(
            <div key={row} className="board-row">
              {[0,1,2].map(col=>(
                <Square key={col} index={col + row * 3} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
}

function GameInfo() {
  const stepNumber = useSelector(getStepNumber);
  const player = useSelector(getPlayer);
  const xIsNext = (player === 1); // 当前玩家，1:X, 2:O。相当于上述xIsNext。player = xIsNext ? 1 : 2;
  const dispatch = useDispatch();
  const steps = useSelector(getSteps);
  const winner = useSelector(getWinner);

  const moves = steps.map((move, step) => {
    const desc = 'Go to move #' + move;
    return (
      <li key={step+1}>
        <button onClick={() => dispatch(jumpTo(step+1))} className={stepNumber === step + 1 ? "win" : null}>{desc}</button>
      </li>
    );
  });

  let status;
  if (winner) {
    status = "Winner: " + winner;
  } else {
    status = "Next player: " + (xIsNext ? "X" : "O");
  }
  return (
    <div className="game-info">
        <div>{status}</div>
        <ol>
          <li key={0}>
            <button onClick={() => dispatch(jumpTo(0))}>Go to game start</button>
          </li>
          {moves}</ol>
    </div>
  );
}

/**
 * 一个game由两个玩家和一个Board组成
 */
class Game extends React.Component {
  render() {
    return (
        <div className="game">
          <Board />
          <GameInfo />
        </div>
    );
  }
}

// ========================================

ReactDOM.render(
  <React.StrictMode>
    <Provider store={gameStore}>
      <Game />
    </Provider>
  </React.StrictMode>
  , document.getElementById("root"));
