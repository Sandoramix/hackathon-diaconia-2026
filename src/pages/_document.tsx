import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="it" suppressHydrationWarning>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <body>
        {/* Set dark class before React hydrates to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
