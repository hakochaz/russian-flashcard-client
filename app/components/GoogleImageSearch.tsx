import { useEffect, useRef } from "react";
import { Paper, Text } from "@mantine/core";

interface GoogleImageSearchProps {
  searchQuery: string;
  onImageSelect?: (url: string) => void;
}

// Extend Window interface to include Google Custom Search types
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
  const previousQueryRef = useRef<string>("");
  const searchIdRef = useRef<number>(0);

  useEffect(() => {
    // Increment search ID to create unique container for each search
    searchIdRef.current += 1;
    const currentSearchId = `gcse-search-${searchIdRef.current}`;

    // Wait for Google Custom Search to be loaded
    const executeSearch = () => {
      if (searchContainerRef.current && searchQuery) {
        // Clear the container first
        searchContainerRef.current.innerHTML = "";
        
        // Create a new div for the search element with unique ID
        const searchDiv = document.createElement("div");
        searchDiv.className = "gcse-search";
        searchDiv.id = currentSearchId;
        searchDiv.setAttribute("data-queryParameterName", "search");
        searchDiv.setAttribute("data-autoSearchOnLoad", "true");
        searchContainerRef.current.appendChild(searchDiv);
        
        // Trigger the search by rendering Google CSE
        if (window.google?.search?.cse?.element) {
          try {
            window.google.search.cse.element.render({
              div: currentSearchId,
              tag: 'search',
              gname: currentSearchId,
              attributes: {
                queryParameterName: 'search',
                enableAutoComplete: true
              }
            });
          } catch (e) {
            console.error("Error rendering Google CSE:", e);
          }
        }
        
        // Execute search after element is rendered - use a non-form approach
        setTimeout(() => {
          const searchBox = searchContainerRef.current?.querySelector('input.gsc-input') as HTMLInputElement;
          if (searchBox) {
            // Set the value
            searchBox.value = searchQuery;
            
            // Trigger the search programmatically using Google's execute method
            // Find and click the button without submitting any forms
            const searchButton = searchContainerRef.current?.querySelector('button.gsc-search-button') as HTMLButtonElement;
            if (searchButton) {
              // Prevent any default form submission
              searchButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
              }, { once: true, capture: true });
              
              // Trigger search via button click
              setTimeout(() => searchButton.click(), 100);
            }
          }
        }, 500);
      }
    };

    // Check if the query has changed
    if (searchQuery !== previousQueryRef.current) {
      previousQueryRef.current = searchQuery;
      
      // Check if Google Custom Search is already loaded
      if (window.google?.search?.cse) {
        executeSearch();
      } else {
        // Wait for it to load
        const checkInterval = setInterval(() => {
          if (window.google?.search?.cse) {
            clearInterval(checkInterval);
            executeSearch();
          }
        }, 100);
        
        // Cleanup interval after 10 seconds
        setTimeout(() => clearInterval(checkInterval), 10000);
      }
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!onImageSelect || !searchContainerRef.current) return;

    const container = searchContainerRef.current;

    const handleClick = (e: MouseEvent) => {
      const img = (e.target as HTMLElement).closest("img") as HTMLImageElement | null;
      if (!img) return;

      // Try to extract the real image URL from the surrounding anchor
      const anchor = img.closest("a") as HTMLAnchorElement | null;
      let url = "";

      if (anchor?.href) {
        // Google CSE encodes the actual image URL as an `imgurl` query param
        try {
          const params = new URL(anchor.href).searchParams;
          const imgurl = params.get("imgurl") || params.get("url");
          if (imgurl) url = imgurl;
        } catch {}

        // Or if the href itself is a direct image URL
        if (!url && /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(anchor.href)) {
          url = anchor.href;
        }
      }

      // Fall back to the img src, skipping Google proxy thumbnails
      if (!url && img.src && !img.src.startsWith("data:")) {
        url = img.src;
      }

      if (url) {
        onImageSelect(url);

        // Close the CSE preview panel
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
      <div ref={searchContainerRef} id="google-search-container"></div>
    </Paper>
  );
}

