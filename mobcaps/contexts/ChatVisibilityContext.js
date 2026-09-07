import React, { createContext, useContext, useState } from 'react';

const ChatVisibilityContext = createContext({
  chatHidden: false,
  setChatHidden: () => {},
});

export function ChatVisibilityProvider({ children }) {
  const [chatHidden, setChatHidden] = useState(false);
  return (
    <ChatVisibilityContext.Provider value={{ chatHidden, setChatHidden }}>
      {children}
    </ChatVisibilityContext.Provider>
  );
}

export function useChatVisibility() {
  return useContext(ChatVisibilityContext);
}
