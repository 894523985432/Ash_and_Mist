// Міст між логікою і інтерфейсом. Логіка викликає ui.*, а UI (або симулятор) підставляє реалізацію.
// Так ігрові модулі не залежать від DOM і їх можна ганяти в Node.
export const ui = {
  render() {},
  go(screen) {},
  showEvent(ev) {},
  toast(text) {},
  shake() {},
};
export function setUI(impl) { Object.assign(ui, impl); }
