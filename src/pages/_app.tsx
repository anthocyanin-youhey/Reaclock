// src/pages/_app.tsx

import "../styles/globals.css";
import { LateCountProvider } from "../context/LateCountContext"; // 遅刻件数のコンテキストをインポート

function MyApp({ Component, pageProps }: any) {
  return (
    <LateCountProvider>
      <Component {...pageProps} />
    </LateCountProvider>
  );
}

export default MyApp;
