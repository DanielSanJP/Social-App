import React, { createContext, useState, useContext } from "react";

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  const [isNavVisible, setIsNavVisible] = useState(true);

  return (
    <NavigationContext.Provider value={{ isNavVisible, setIsNavVisible }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => useContext(NavigationContext);
