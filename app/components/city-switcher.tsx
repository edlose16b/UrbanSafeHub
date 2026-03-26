"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CityOption } from "@/app/constants/cities";
import type { MapTranslations } from "./map-screen";

type CitySwitcherProps = {
  activeCity: CityOption;
  cities: readonly CityOption[];
  onSelect: (city: CityOption) => void;
  translations: MapTranslations;
  className?: string;
};

export function CitySwitcher({
  activeCity,
  cities,
  onSelect,
  translations,
  className,
}: CitySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <div ref={rootRef} className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="ghost-outline flex w-full items-center gap-3 rounded-[1rem] bg-surface-highest px-3 py-2.5 text-left text-foreground transition-colors hover:bg-surface-high"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="relative h-11 w-14 shrink-0 overflow-hidden rounded-[0.85rem]">
          <Image
            src={activeCity.imageSrc}
            alt={activeCity.label}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {translations.citySwitcherLabel}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {activeCity.label}
          </p>
          <p className="truncate text-xs text-text-secondary">
            {translations[activeCity.countryLabelKey]}
          </p>
        </div>
        <span
          aria-hidden
          className={`text-xs text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {isOpen ? (
        <div className="glass-panel ghost-outline absolute top-full left-0 right-0 z-[1001] mt-2 overflow-hidden rounded-[1rem] text-foreground">
          <div className="border-b border-outline-variant/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {translations.citySwitcherPlaceholder}
          </div>
          <ul role="listbox" className="max-h-96 overflow-y-auto p-2">
            {cities.map((city) => {
              const isActive = city.id === activeCity.id;

              return (
                <li key={city.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(city);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-[0.95rem] px-2.5 py-2.5 text-left transition-colors ${
                      isActive ? "bg-surface-high" : "hover:bg-surface-high"
                    }`}
                    aria-selected={isActive}
                  >
                    <div className="relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-[0.9rem]">
                      <Image
                        src={city.imageSrc}
                        alt={city.label}
                        fill
                        sizes="72px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {city.label}
                      </p>
                      <p className="truncate text-xs text-text-secondary">
                        {translations[city.countryLabelKey]}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-primary" : "bg-outline-variant/40"}`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
