import { createContext, useState } from "react";
import PropTypes from "prop-types";

const NavigationContext = createContext();

export const NavigationProvider = ({ children }) => {
  const [isNavVisible, setIsNavVisible] = useState(true);

  return (
    <NavigationContext.Provider value={{ isNavVisible, setIsNavVisible }}>
      {children}
    </NavigationContext.Provider>
  );
};

NavigationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default NavigationContext;
