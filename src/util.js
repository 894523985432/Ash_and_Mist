export const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const chance = p => Math.random() < p;
let _n = 1;
export const uid = () => Date.now().toString(36) + (_n++);
