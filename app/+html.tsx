import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>SweetLies: Uncover Hidden Sugars in Your Food</title>
        <meta name="description" content="Scan any food label to instantly spot hidden sugars, artificial sweeteners, and misleading claims. Make healthier choices with SweetLies." />
        <meta name="keywords" content="SweetLies, food labels, hidden sugar, nutrition, health, scan labels, artificial sweeteners" />
        <meta property="og:title" content="SweetLies: Uncover Hidden Sugars in Your Food" />
        <meta property="og:description" content="SweetLies is a powerful tool that helps you decode food labels, revealing the hidden sugars and artificial sweeteners that brands try to hide. With a simple scan, you get a clear, honest breakdown of what's really in your food." />
        <meta property="og:image" content="https://sweetlies.aboutnutrition.co.in/og-image.png" />
        <meta property="og:url" content="https://sweetlies.aboutnutrition.co.in/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="SweetLies" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SweetLies: Uncover Hidden Sugars in Your Food" />
        <meta name="twitter:description" content="Scan any food label to instantly spot hidden sugars, artificial sweeteners, and misleading claims. Make healthier choices with SweetLies." />
        <meta name="twitter:image" content="https://sweetlies.aboutnutrition.co.in/og-image.png" />
        <link rel="canonical" href="https://sweetlies.aboutnutrition.co.in/" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Vercel Web Analytics - loads with initial HTML for reliable tracking */}
        <script dangerouslySetInnerHTML={{ __html: "window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };" }} />
        <script defer src="/_vercel/insights/script.js"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
