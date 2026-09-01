import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ASM Daily Fresh — Shop Manager",
    short_name: "ASM Shop",
    description:
      "Daily bills, expenses, wholesale purchases and credit customers for a small shop.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    /* The layouts are built for both ways round — the calculator and its price
       list sit side by side, and the tabs go two columns wide — so the app
       follows the device rather than pinning itself upright. A locked
       orientation only bites once installed, which is why it rotated in the
       browser and not on the home screen. */
    orientation: "any",
    background_color: "#f7f7f5",
    theme_color: "#f7f7f5",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops these to its own shape, so they carry extra margin.
      { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Add a bill", url: "/" },
      { name: "Stock purchases", url: "/purchases" },
      { name: "Credit customers", url: "/credits" },
    ],
  };
}
