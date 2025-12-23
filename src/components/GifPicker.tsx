import { useState, useEffect } from "react";
import { Grid } from "@giphy/react-components";
import { GiphyFetch } from "@giphy/js-fetch-api";

// Use the placeholder key if not provided
const gf = new GiphyFetch(
  process.env.NEXT_PUBLIC_GIPHY_API_KEY || "sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh"
);

interface GifPickerProps {
  onSelect: (gif: any, e: React.SyntheticEvent<HTMLElement, Event>) => void;
  searchTerm?: string;
}

export function GifPicker({ onSelect, searchTerm = "" }: GifPickerProps) {
  const [search, setSearch] = useState(searchTerm);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  const fetchGifs = (offset: number) => {
    if (debouncedSearch) {
      return gf.search(debouncedSearch, { offset, limit: 10 });
    }
    return gf.trending({ offset, limit: 10 });
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900/90 backdrop-blur-md rounded-xl overflow-hidden border border-white/10">
      <div className="p-3 border-b border-white/10">
        <input
          type="text"
          placeholder="Search GIPHY..."
          className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
        {/* Helper text if needed */}
        {debouncedSearch === "" && (
          <p className="text-xs text-slate-500 mb-2 px-1">Trending now</p>
        )}
        
        {/* Re-mount Grid when key (search term) changes to reset scroll/results */}
        <Grid
          key={debouncedSearch}
          width={300} // Approximate width of the popover
          columns={2}
          fetchGifs={fetchGifs}
          onGifClick={onSelect}
          noLink={true}
          hideAttribution={true} // Cleaner look
        />
      </div>
    </div>
  );
}

