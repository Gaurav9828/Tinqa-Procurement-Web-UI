import { useEffect, useState } from 'react';
import { cachedAdminLoginContent, loadAdminLoginContent, type LoginPageContent } from '../components/auth/loginPageContent';

/** The admin sign-in page's image and text from the live company profile (cached copy first, then the server's). */
export const useLoginPageContent = (): LoginPageContent => {
  const [content, setContent] = useState(cachedAdminLoginContent);
  useEffect(() => {
    let active = true;
    void loadAdminLoginContent().then((loaded) => active && setContent(loaded));
    return () => {
      active = false;
    };
  }, []);
  return content;
};
