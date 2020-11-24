export type Full<T> = {
  [P in keyof T]-?: T[P];
};
