import install from "./install.js";
import Store from "./store.js";

// mapState  mapGetters  mapMutations  mapActions辅助函数的实现
function mapState(stateList) {
  let obj = {};
  for (let i = 0; i < stateList.length; i++) {
    let stateName = stateList[i];
    obj[stateName] = function() {
      return this.$store.state[stateName];
    };
  }
  return obj;
}

function mapGetters(gettersList) {
  let obj = {};
  for (let i = 0; i < gettersList.length; i++) {
    let getterName = gettersList[i];
    obj[getterName] = function() {
      return this.$store.getters[getterName];
    };
  }
  return obj;
}

function mapMutations(mutationsList) {
  let obj = {};
  for (let i = 0; i < mutationsList.length; i++) {
    let mutationName = mutationsList[i];
    obj[mutationName] = function(payload) {
      return this.$store.commit(mutationName, payload);
    };
  }
  return obj;
}

function mapActions(actionsList) {
  let obj = {};
  for (let i = 0; i < actionsList.length; i++) {
    let actionName = actionsList[i];
    obj[actionName] = function(payload) {
      return this.$store.dispatch(actionName, payload);
    };
  }
  return obj;
}

export default {
  install,
  Store,
};

export {
  mapState,
  mapGetters,
  mapMutations,
  mapActions,
}