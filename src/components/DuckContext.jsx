import { createContext, useContext, useEffect, useMemo, useState } from "react";

const DEFAULT = {
  id: "home",
  title: "Mission control",
  summary: "Choose a mission, earn XP, unlock trophies, and improve your rank. Progress saves automatically in this browser.",
  concepts: ["XP and ranks", "mission stars", "official documentation"],
};

const Context = createContext({ screen: DEFAULT, setScreen() {} });

export function DuckProvider({ children }) {
  const [screen, setScreen] = useState(DEFAULT);
  const value = useMemo(() => ({ screen, setScreen }), [screen]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useDuckScreen(screen) {
  const { setScreen } = useContext(Context);
  const serialized = JSON.stringify(screen);
  useEffect(() => {
    setScreen(screen);
  }, [setScreen, serialized]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useDuck() {
  return useContext(Context);
}

export { DEFAULT as DEFAULT_DUCK_SCREEN };
