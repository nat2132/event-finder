import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, cloneElement, isValidElement } from "react";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import Cookies from "js-cookie";

const csrfToken = Cookies.get("csrftoken");

export type SupportedLanguage = "en" | "am" | "om" | "ti";

interface TranslationContextProps {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  translate: (text: string) => Promise<string>;
}

const TranslationContext = createContext<TranslationContextProps>({
  language: "en",
  setLanguage: () => {},
  translate: async (text: string) => text,
});

export const useTranslation = () => useContext(TranslationContext);

// Helper component for translated text
export const T: React.FC<{ children: string }> = ({ children }) => {
  const { translate, language } = useTranslation();
  const [translated, setTranslated] = useState(children);

  useEffect(() => {
    let mounted = true;
    translate(children).then(t => {
      if (mounted) setTranslated(t);
    });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, language]);

  return <>{translated}</>;
};

// Helper component to render attributes that need translation
export const TranslatedAttributeRenderer: React.FC<{
  text: string;
  children: (translatedText: string) => React.ReactElement;
} & Omit<React.HTMLAttributes<HTMLElement>, 'children'>> = ({ text, children, ...rest }) => {
  const { translate, language } = useTranslation();
  const [translatedText, setTranslatedText] = useState(text);

  useEffect(() => {
    let mounted = true;
    translate(text).then(t => {
      if (mounted) setTranslatedText(t);
    });
    return () => { mounted = false; };
  }, [text, translate, language]);

  const elementToRender = children(translatedText);

  if (!isValidElement(elementToRender)) {
    return elementToRender; 
  }
  // Note: The "Spread types..." linter error might appear here in projects with strict linting
  // This is a common pattern for forwarding props and is generally considered safe.
  return cloneElement(elementToRender, { ...elementToRender.props, ...rest });
};

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const cacheRef = useRef<Record<string, string>>({});

  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    // Load language preference from backend on mount
    (async () => {
      if (isLoaded && isSignedIn) {
        try {
          const token = await getToken?.();
          if (token) {
            const res = await axios.get("/api/user/language", {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (["en", "am", "om", "ti"].includes(res.data.language)) {
              setLanguageState(res.data.language);
            }
          } else {
            // console.warn("TranslationProvider: No token available, skipping language fetch.");
          }
        } catch {
          // console.error("TranslationProvider: Failed to fetch language:", error); // This would now be an error as 'error' is not defined
          // ignore error for now, could set a default or handle more gracefully
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, getToken]);

  const setLanguage = async (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      const token = await getToken?.();
      await axios.post("/api/user/language", { language: lang }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // ignore error
    }
    cacheRef.current = {};
  };

  const translate = async (text: string) => {
    if (language === "en") return text;
    const cacheKey = `${language}:${text}`;
    if (cacheRef.current[cacheKey]) {
      return cacheRef.current[cacheKey];
    }
    try {
      const res = await axios.post("/api/translate/", { text, target: language },{ headers: { "X-CSRFToken": csrfToken }});
      const translated = res.data.translated || text;
      cacheRef.current[cacheKey] = translated;
      return translated;
    } catch {
      return text;
    }
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, translate }}>
      {children}
    </TranslationContext.Provider>
  );
};
