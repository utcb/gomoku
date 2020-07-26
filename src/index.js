import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import {Provider} from 'react-redux';
import {useSelector, useDispatch } from 'react-redux';
import { markOn, jumpTo } from './gameSlice';
import gameStore, {getSquares, getPlayer, getWinner, getSteps, getStepNumber} from './store';
import ioClient from 'socket.io-client';
import { useBeforeunload } from 'react-beforeunload';
import { Container, Row, Col, Modal, Button, Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as jQuery from 'jquery';

global.socket = null;
global.socketio_server = 'https://socketio.labwayit.com';
// global.socketio_server = 'http://localhost:3479';
global.clientId = null;
global.peer_join = false; // peer join or not

/**
 * Square: 知道自身的位置（props.index: [0-8]）。外部props传入状态(props.value)
 */
function Square(props) {
  // useDispatch, useSelector，都是react hook，只能在function类型的组件中使用
  const dispatch = useDispatch();
  const squares = useSelector(getSquares);
  const currentStepNumber = useSelector(getStepNumber);
  const index = props.index;

  let marks = null;
  let player = null;
  let stepNumber = 0;
  let square = squares ? squares[index] : null;
  let inWinLine = false;
  if (square) {
      stepNumber = square.stepNumber;
      player = square.player;
      inWinLine = square.inWinLine;
  }
  let title = "index: " + index;
  if (player === 1 || player === 2) { // first player
      marks = player === 1 ? 'X' : 'O';
      // 是否在赢得比赛的三个点击中。标记marks旁的小字，表示第几步，红色表示成功的步骤
      if (stepNumber > 0) {
        title = title + ", step: " + stepNumber;
      }
      // 当前步骤标红
      if (currentStepNumber === stepNumber || inWinLine) {
        marks = (<font color="red">{marks}</font>);
      }
  } else if (player !== null) { // error
      marks = 'E';
  }
  return (
      <button className="square" onClick={()=>dispatch(markOn(index))} title={title}>
          {marks}
      </button>
      );
}

class Board extends React.Component {
  render() {
    return (
      <div className="game-board">
        <div>
          {Array(15).fill(null).map((v,row) => (
            <div key={row} className="board-row">
              {Array(15).fill(null).map((v2, col) => (
                <Square key={col} index={col + row * 15} />
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
    const desc = 'Go to move #' + move + " (" + (Math.floor(move / 15) + 1) + ", " + (move % 15 + 1) + ")";
    return (
      <li key={step+1}>
        <Button onClick={() => openModal(step+1)} variant={stepNumber === step + 1 ? "success" : "outline-info"} size="sm">{desc}</Button>
      </li>
    );
  });

  let status;
  if (winner) {
    status = "Winner: " + winner;
  } else {
    status = "Next player: " + (xIsNext ? "X" : "O");
  }

  const [modalIsOpen, setIsOpen] = useState(false);
  function openModal(step) {
    if (global.socket !== null) {
      global.socket.emit('tryjump', step);
    }
    dispatch(jumpTo(step));
    setIsOpen(true);
  }
  function afterOpenModal() {
  }
  function closeModal(yes) {
    if (!yes) { // cancel
      dispatch(jumpTo(steps.length));
      if (global.socket !== null) {
        global.socket.emit('canceljump');
      }
    } else {
      if (global.socket !== null) {
        global.socket.emit('jumpTo', stepNumber);
      }
    }
    setIsOpen(false);
  }

  return (
    <div className="game-info">
      <Modal
          show={modalIsOpen}
          backdrop="static"
          centered
      >
        <Modal.Header>
          <Modal.Title>悔棋</Modal.Title>
        </Modal.Header>
        <Modal.Body>你确定要撤回到这一步吗？</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => closeModal(true)}>确定一定以及肯定</Button>
          <Button variant="primary" onClick={() => closeModal(false)}>嗯，算了吧，再想想</Button>
        </Modal.Footer>
      </Modal>
        <div>{status}</div>
        <ol>
          <li key={0}>
            <Button onClick={() => openModal(0)} size="sm" variant="outline-info">Go to game start</Button>
          </li>
          {moves}</ol>
    </div>
  );
}

function appendMessage(msg) {
  jQuery("#socketmessage").append(msg + "<br/>");
}

/**
 * 一个game由两个玩家和一个Board组成
 */
function Game(props) {
  useBeforeunload(event => event.preventDefault());
  const dispatch = useDispatch();
  const [jumpAlertShow, showJumpAlert] = useState(false);
  useEffect(() => {
    if (global.socket !== null) {
      // already initialized, exit
      return;
    }
    global.socket = ioClient(`${global.socketio_server}/gomoku/play`, {
      query: "token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiR29tb2t1IFBsYXllciIsImFkbWluIjpmYWxzZSwidG9rZW4iOiJiYlYxdUhoZmVLdW0rbmdiRGdKNlNNZHYzUkgxTGRGWWVMSWp1ZEhLcVZBPSJ9.ODJVThBlGFXiGQnWTvMlpCSyBWchv6fggOaYJfgxyF8"
    });
    global.socket.on('error', err => {
        if( err.code === 'invalid_token' && err.type === 'UnauthorizedError' && err.message === 'jwt expired' ) {
            // Handle token expiration
            console.log("token expired");
        } else {
            console.log(err);
            alert("socket.io-client error: " + err.code + " : " + err.type + " : " + err.message);
        }
    });
    global.socket.on('connect', function() {
      console.log(global.socket.id, global.socket.io.engine.id, global.socket.json.id);
      if (global.clientId === null ) {
        appendMessage("我进来了");
      } else {
        appendMessage("我又进来了");
      }
      global.clientId = global.socket.io.engine.id;
      global.socket.emit('join', "玩家 " + global.clientId + " 加入棋局");
    });
    global.socket.on('broad_action', function(data) {
      console.log("receive board_action message");
      console.log(data);
      appendMessage("Peer下了一步棋");
      dispatch(markOn(data));
    });
    global.socket.on('broad_join', function(data) {
      if (global.peer_join) {
        return;
      }
      global.peer_join = true;
      global.socket.emit('welcome', "Peer欢迎你加入棋局");
      appendMessage(data);
      console.log(data);
    });
    global.socket.on('welcome', function(data) {
      global.peer_join = true;
      appendMessage(data);
      console.log(data);
    });
    global.socket.on('leave', function(data) {
      global.peer_join = false;
      appendMessage("Peer离开了棋局");
      console.log(data);
    });
    global.socket.on("tryjump", function(data) {
      console.log(data);
      showJumpAlert(true);
      appendMessage("对方准备悔棋...");
    });
    global.socket.on("canceljump", function() {
      console.log('canceljump');
      showJumpAlert(false);
      appendMessage("对方取消悔棋...");
    });
    global.socket.on("jumpTo", function(data) {
      console.log('jumpTo: ' + data);
      showJumpAlert(false);
      appendMessage("对方决定悔棋到第<" + (data + 1) + ">步");
      dispatch(jumpTo(data));
    });
  });

    return (
      <Row>
        <Col sm={12} md={8} lg={6} xl={5}>
          <Board />
        </Col>
        <Col lg={3} xl={3}>
          <GameInfo />
          <Modal variant="warning" show={jumpAlertShow} keyboard="false" backdrop="static" centered size="xl">
            对方正在悔棋ing......
          </Modal>
        </Col>
        <Col>
          messages:<br/>
          <div id="socketmessage"></div>
        </Col>
      </Row>
        
    );
}

// ========================================

ReactDOM.render(
  <React.StrictMode>
    <Provider store={gameStore}>
      <Container fluid>
        <Game />
      </Container>
    </Provider>
  </React.StrictMode>
  , document.getElementById("root"));
