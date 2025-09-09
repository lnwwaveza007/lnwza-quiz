import { serverStore } from "./serverStore";
import { browserStore } from "./browserStore";

const isServer = typeof window === "undefined";

export const store = isServer ? serverStore : browserStore;
export type Store = typeof store;


