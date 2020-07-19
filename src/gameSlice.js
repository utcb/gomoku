import { createSlice } from '@reduxjs/toolkit';

// reducer定义，多个reducer象slice一样（？TODO: 存疑，进一步澄清）
// redux的state只能通过reduce方法改变
export const gameSlice = createSlice({
  name: 'game',
  initialState: {
    me: 0, // me and peer, who's me，不是我的话，不能点击
    player: 1, // 当前玩家，即轮到该玩家下子。缺省为1，表示第一个玩家，页面上表示为'X'。2表示第二个玩家，表示为'O'
    stepNumber: 0, // 步数，实际下子的数量。0表示尚未开始游戏，1表示下了第一个棋子
    /**
     * 棋盘历史，每个记录是一个sqauires(Array(9)），代表棋盘某一步骤的所有状态。
     *    Array(9)里的状态记录：null表示尚未被点击；
     *    {player: 1/2, stepNumber: 步数, index: 即array索引（冗余）, inWinLine: true/false 是否在winLine内}
     */
    history: [],
    steps: Array(225).fill(null), // 记录至多9个步骤的九宫格index，表示每一步点击的是哪一个square
    winner: null,
    winLine: null
  },
  reducers: {
    // Redux toolkit使用Immer库实现全程操作中，source state的immutable，每一个reducer最终都是生成新的state对象
    // https://immerjs.github.io/immer/docs/introduction。注：我们目前项目，是用公用的deep copy方法实现其中一部分的类似功能

    markOn: (state, action) => { // 玩家成功点击某个格子（index）
      console.log("in markOn...");
      console.log(action);
      let payload = action.payload;
      let index = null;
      let socketio = false; // triggered by socketio or not
      if ((typeof payload) === "object") { // triggered by socketio
        index = payload.index;
        socketio = payload.socketio;
      } else { // true click
        index = payload;
        if (state.me === 0) {
          state.me = state.player;
        } else if (state.me !== state.player) { // 不应该me下
          console.log("Waiting for your peer to play");
          return;
        }
      }
      let player = state.player;
      if (player < 1 || player > 2) { // 玩家尚未被初始化或错误
        return;
      }
      let squares = _getSquares(state);
      if (squares && squares[index] && squares[index].player) { // 已经被点击过
        return;
      }
      // 重新设置steps, history等变量值，从stepNumber开始
      for (let i = state.stepNumber; i < 225; i++) {
        state.steps[i] = null;
      }
      state.history = state.history.slice(0, state.stepNumber);
      state.steps[state.stepNumber] = index
      // let newSquare = _getSquares(state).slice(0);
      let newSquare = _getSquares(state).map(sq => (sq === null ? null : {...sq}));
      newSquare[index] = {
          index: index,
          stepNumber: state.stepNumber + 1, // 第几步，从1开始
          player: state.player,
          inWinLine: false
      };
      state.history.push(newSquare);
      state.stepNumber += 1; // 步数++
      state.winLine = calculateWinner(_getSquares(state), state.stepNumber, state.steps);
      if (state.winLine === null) { // 尚未分出输赢，继续
        state.player = (state.player === 1 ? 2 : 1); // 交换玩家
      } else { // 结束
        state.winner = state.player;
        state.player = null;
        state.winLine.forEach(i => { // 设置inWinLine状态
          newSquare[i].inWinLine = true;
        });
      }
      // send socketio action
      if (!socketio) {
        console.log("emit markOn action");
        const data = {"index": index, "socketio": true, "player": player, "clientId": global.clientId};
        global.socket.emit("action", data);
      }
    },
    jumpTo: (state, action) => {
      let step = action.payload;
      state.stepNumber = step;
      state.player = (step % 2) + 1;
      state.winner = null;
      state.winLine = calculateWinner(_getSquares(state), state.stepNumber, state.steps);
      if (state.winLine != null) {
        state.player = (step % 2);
        state.winner = state.player;
      }
    }
  },
});

export const _getSquares = state=>{
  if (state.stepNumber === 0) {
    return Array(225).fill(null);
  }
  return state.history[state.stepNumber - 1];
};

function calculateWinner(squares, stepNumber, steps) {
  if (stepNumber <= 8) { // at least 9 steps to win game
    return null;
  }
  let ls = steps[stepNumber - 1]; // square index of last step
  let lsx = ls % 15; // 笛卡尔坐标（左上角为[0, 0]）的x轴
  let lsy = Math.floor(ls / 15); // y轴
  let mark = squares[ls].player; // mark (1/2 -> X/O)
  let leftborder = ls - lsx; // 左边界index
  let rightborder = leftborder + 14; // 右边界index

  let consecutive = 1; // 连续的（排成一排的）数量，当前算做1
  let winLine = [ls]; // winLine包含的棋子index，当前肯定属于其中
  // 横向
  let i = 1;
  while (((ls - i) >= leftborder) && squares[ls - i] !== null && squares[ls - i].player === mark ) {
    winLine.push(ls - i);
    consecutive++;
    i++;
  }
  if (consecutive >= 5) {
    return winLine;
  }
  i = 1;
  while (((ls + i) <= rightborder) && squares[ls + i] !== null && squares[ls + i].player === mark ) {
    winLine.push(ls + i);
    consecutive++;
    i++;
  }
  if (consecutive >= 5) {
    return winLine;
  }
  // 纵向
  consecutive = 1;
  winLine = [ls];
  i = 1;
  while (((ls - i * 15) >= 0) && squares[ls - i * 15] !== null && squares[ls - i * 15].player === mark ) {
    winLine.push(ls - i * 15);
    consecutive++;
    i++;
  }
  if (consecutive >= 5) {
    return winLine;
  }
  i = 1;
  while (((ls + i * 15) < 225) && squares[ls + i * 15] !== null && squares[ls + i * 15].player === mark ) {
    winLine.push(ls + i * 15);
    consecutive++;
    i++;
  }
  if (consecutive >= 5) {
    return winLine;
  }
  // '\'方向
  consecutive = 1;
  winLine = [ls];
  i = 1;
  while (((ls - i * 16) >= 0) && ((lsx - i) >= 0) && squares[ls - i * 16] !== null && squares[ls - i * 16].player === mark ) {
    winLine.push(ls - i * 16);
    consecutive++;
    i++;
  }
  if (consecutive >= 5) {
    return winLine;
  }
  i = 1;
  while (((ls + i * 16) < 225) && ((lsx + i) <= 14) && squares[ls + i * 16] !== null && squares[ls + i * 16].player === mark ) {
    winLine.push(ls + i * 16);
    consecutive++;
    i++;
  }
  if (consecutive >= 5) {
    return winLine;
  }
  // '/'方向
  consecutive = 1;
  winLine = [ls];
  i = 1;
  while (((ls - i * 14) >= 0) && ((lsx + i) <= 14) && squares[ls - i * 14] !== null && squares[ls - i * 14].player === mark ) {
    winLine.push(ls - i * 14);
    consecutive++;
    i++;
  }
  if (consecutive >= 5) {
    return winLine;
  }
  i = 1;
  while (((ls + i * 14) < 225) && ((lsx - i) >= 0) && squares[ls + i * 14] !== null && squares[ls + i * 14].player === mark ) {
    winLine.push(ls + i * 14);
    consecutive++;
    i++;
  }
  if (consecutive >= 5) {
    return winLine;
  }
  return null;
}

// 输出 actions
export const { markOn, jumpTo } = gameSlice.actions;

// 出书reducer
export default gameSlice.reducer;
