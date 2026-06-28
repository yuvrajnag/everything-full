"use client";

interface CategoryNavProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryNav({ selectedCategory, onSelectCategory }: CategoryNavProps) {
  return (
    <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 py-8 px-4 bg-black">
      <button
        onClick={() => onSelectCategory("All")}
        className={`font-bold text-sm px-6 py-1 rounded-none transition-colors ${
          selectedCategory === "All"
            ? "bg-white text-black"
            : "border border-white/50 text-white hover:bg-white/10"
        }`}
      >
        All
      </button>
      
      <div className="text-white/30 text-lg font-light leading-none">|</div>
      
      <button
        onClick={() => onSelectCategory("Devices")}
        className={`font-bold text-sm px-4 py-1 rounded-none transition-colors ${
          selectedCategory === "Devices" ? "bg-white text-black" : "border border-white/50 text-white hover:bg-white/10"
        }`}
      >
        Devices
      </button>
      
      <button
        onClick={() => onSelectCategory("Audio")}
        className={`font-bold text-sm px-4 py-1 rounded-none transition-colors ${
          selectedCategory === "Audio" ? "bg-white text-black" : "border border-white/50 text-white hover:bg-white/10"
        }`}
      >
        Audio
      </button>
      
      <button
        onClick={() => onSelectCategory("Computing")}
        className={`font-bold text-sm px-4 py-1 rounded-none transition-colors ${
          selectedCategory === "Computing" ? "bg-white text-black" : "border border-white/50 text-white hover:bg-white/10"
        }`}
      >
        Computing
      </button>
      
      <button
        onClick={() => onSelectCategory("Wearables")}
        className={`font-bold text-sm px-4 py-1 rounded-none transition-colors ${
          selectedCategory === "Wearables" ? "bg-white text-black" : "border border-white/50 text-white hover:bg-white/10"
        }`}
      >
        Wearables
      </button>
    </div>
  );
}
