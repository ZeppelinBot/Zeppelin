export default class Model {
  constructor(props) {
    for (const key in props) {
      this[key] = props[key];
    }
  }
}
