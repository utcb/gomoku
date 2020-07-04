import { configureStore } from '@reduxjs/toolkit';
import gameReducer, { _getSquares } from './gameSlice';

// redux toolkit的configureStore简化了redux的store配置。参考：https://redux-toolkit.js.org/api/configureStore
export default configureStore({
    reducer: {
      game: gameReducer, // 所有实际state会被封装到名为game属性值内：state.game.xxx
    },
});

// state selector输出，state.game中的"game"，来源自上述gameStore配置
// selector: 允许从state中选择一个或者多个value，可以直接返回，也可以处理，封装后再返回
// 有了selector，state本身可以很精简，复杂组合数据/统计数据等，可以在selector里实现
// 官方是将selector定义放在slice js里，但是，因为和store数据直接相关（特别是属性名如"game"），在store.js里更加恰当
// 也可以不定义selector，而是在使用的使用直接定义，譬如：`useSelector((state) => state.game.player)`

export const getSquares = state => { // 获取stepNumber步骤的“增强”squares. 全部为null的Array(9)表示第0步的结果，即初始值
  return _getSquares(state.game);
};

export const getPlayer = state => state.game.player;

export const getSteps = state => state.game.steps.slice(0, state.game.history.length);

export const getWinner = state => state.game.winner;

export const getStepNumber = state => state.game.stepNumber;
