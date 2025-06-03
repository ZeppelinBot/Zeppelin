/// <reference types="vite/client" />

declare module "*.html" {
  const value: string;
  export default value;
}

interface Window {
  API_URL: string;
}
