import { useEffect, useRef } from "react";
import { Paper, Text } from "@mantine/core";

interface GoogleImageSearchProps {
  searchQuery: string;
  onImageSelect?: (url: string) => void;
}

declare global {
  interface Window {
    google?: {
      search?: {
        cse?: {
          element: {
            render: (options: any, divId?: string) => void;
            go?: (opt_div?: string) => void;
          };
        };
      };
    };
    __gcse?: any;
  }
}

export function GoogleImageSearch({ searchQuery, onImageSelect }: GoogleImageSearchProps) {
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchIdRef = useRef<number>(0);

  useEffect(() => {
    if (!searchContainerRef.current || !searchQuery) return;

    searchIdRef.current += 1;
    const currentSearchId = `gcse-search-${searchIdRef.current}`;

    const executeSearch = () => {
      if (!searchContainerRef.current) return;

      searchContainerRef.current.innerHTML = "";

      const searchDiv = document.createElement("div");
      searchDiv.className = "gcse-search";
      searchDiv.id = currentSearchId;
      searchContainerRef.current.appendChild(searchDiv);

      if (window.google?.search?.cse?.element) {
        try {
          window.google.search.cse.element.render({
            div: currentSearchId,
            tag: "search",
            gname: currentSearchId,
            attributes: { queryParameterName: "search", enableAutoComplete: true },
          });
        } catch (e) {
          console.error("Error rendering Google CSE:", e);
        }
      }

      setTimeout(() => {
        const container = searchContainerRef.current;
        if (!container) return;

        const searchBox = container.querySelector("input.gsc-input") as HTMLInputElement | null;
        if (!searchBox) return;

        searchBox.value = searchQuery;
        const btn = container.querySelector("button.gsc-search-button") as HTMLButtonElement | null;
        if (!btn) return;

        btn.click();

        const clickImagesTab = (attempts = 0) => {
          if (!searchContainerRef.current) return;
          const tabs = searchContainerRef.current.querySelectorAll(".gsc-tabHeader");
          for (const tab of Array.from(tabs)) {
            if (/^images?$/i.test(tab.textContent?.trim() ?? "")) {
              (tab as HTMLElement).click();
              return;
            }
          }
          if (attempts < 30) setTimeout(() => clickImagesTab(attempts + 1), 200);
        };
        setTimeout(() => clickImagesTab(), 500);
      }, 500);
    };

    if (window.google?.search?.cse?.element) {
      executeSearch();
    } else {
      const interval = setInterval(() => {
        if (window.google?.search?.cse?.element) {
          clearInterval(interval);
          clearTimeout(timeout);
          executeSearch();
        }
      }, 100);
      const timeout = setTimeout(() => clearInterval(interval), 10000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!onImageSelect || !searchContainerRef.current) return;
    const container = searchContainerRef.current;

    const handleClick = (e: MouseEvent) => {
      const img = (e.target as HTMLElement).closest("img") as HTMLImageElement | null;
      if (!img) return;

      const anchor = img.closest("a") as HTMLAnchorElement | null;
      let url = "";

      if (anchor?.href) {
        try {
          const params = new URL(anchor.href).searchParams;
          const imgurl = params.get("imgurl") || params.get("url");
          if (imgurl) url = imgurl;
        } catch {}
        if (!url && /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(anchor.href)) {
          url = anchor.href;
        }
      }

      if (!url && img.src && !img.src.startsWith("data:")) {
        url = img.src;
      }

      if (url) {
        onImageSelect(url);
        const closeBtn = document.querySelector<HTMLElement>(
          ".gsc-imageResult-close, .gs-close-button, [class*='close']"
        );
        if (closeBtn) {
          closeBtn.click();
        } else {
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
        }
      }
    };

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, [onImageSelect]);

  return (
    <Paper p="lg" radius="md" withBorder mt="lg">
      <Text size="sm" c="dimmed" mb="md" fw={500}>
        Image Search Results for "{searchQuery}"
      </Text>
      <div ref={searchContainerRef} id="google-search-container" />
    </Paper>
  );
}
