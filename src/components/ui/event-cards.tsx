"use client";

import React, { useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type EventCard = {
  title: string;
  src: string;
  description?: string;
  date?: string;
  location?: string;
  size?: "small" | "medium" | "large";
  type?: "special" | "recurring" | "class" | "default";
};

export const EventCard = React.memo(
  ({
    card,
    index,
    hovered,
    setHovered,
    className = "",
  }: {
    card: EventCard;
    index: number;
    hovered: number | null;
    setHovered: React.Dispatch<React.SetStateAction<number | null>>;
    className?: string;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [direction, setDirection] = useState<
      "top" | "bottom" | "left" | "right" | string
    >("left");

    const handleMouseEnter = (
      event: React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => {
      if (!ref.current) return;
      setHovered(index);

      const direction = getDirection(event, ref.current);
      switch (direction) {
        case 0:
          setDirection("top");
          break;
        case 1:
          setDirection("right");
          break;
        case 2:
          setDirection("bottom");
          break;
        case 3:
          setDirection("left");
          break;
        default:
          setDirection("left");
          break;
      }
    };

    const getDirection = (
      ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
      obj: HTMLElement
    ) => {
      const { width: w, height: h, left, top } = obj.getBoundingClientRect();
      const x = ev.clientX - left - (w / 2) * (w > h ? h / w : 1);
      const y = ev.clientY - top - (h / 2) * (h > w ? w / h : 1);
      const d = Math.round(Math.atan2(y, x) / 1.57079633 + 5) % 4;
      return d;
    };

    const getCardSize = () => {
      switch (card.size) {
        case "small":
          return "md:col-span-1 md:row-span-1";
        case "medium":
          return "md:col-span-2 md:row-span-1";
        case "large":
          return "md:col-span-2 md:row-span-2";
        default:
          return "md:col-span-1 md:row-span-1";
      }
    };

    const getCardTypeStyles = () => {
      switch (card.type) {
        case "special":
          return "border-green-500/20 bg-green-500/5";
        case "recurring":
          return "border-purple-500/20 bg-purple-500/5";
        case "class":
          return "border-blue-500/20 bg-blue-500/5";
        default:
          return "border-neutral-500/20 bg-neutral-500/5";
      }
    };

    return (
      <motion.div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHovered(null)}
        ref={ref}
        className={cn(
          "rounded-lg relative overflow-hidden transition-all duration-300 ease-out",
          getCardSize(),
          getCardTypeStyles(),
          hovered !== null && hovered !== index && "blur-sm scale-[0.98]",
          className
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            className="relative h-full w-full"
            initial="initial"
            whileHover={direction}
            exit="exit"
          >
            <motion.div
              variants={variants}
              className="h-full w-full relative"
              transition={{
                duration: 0.2,
                ease: "easeOut",
              }}
            >
              <Image
                src={card.src}
                alt={card.title}
                className="object-cover absolute inset-0 scale-[1.15]"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                style={{ objectFit: "cover" }}
              />
              <AnimatePresence>
                {hovered === index && (
                  <motion.div
                    variants={textVariants}
                    initial="initial"
                    animate={direction}
                    exit="exit"
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="absolute inset-0 flex flex-col justify-end p-6 z-40 pointer-events-none"
                  >
                    <h3 className="text-xl md:text-2xl font-medium text-white mb-2">
                      {card.title}
                    </h3>
                    {card.description && (
                      <p className="text-sm text-neutral-200 mb-2">{card.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-neutral-300">
                      {card.date && (
                        <div className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {card.date}
                        </div>
                      )}
                      {card.location && (
                        <div className="flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {card.location}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    );
  }
);

EventCard.displayName = "EventCard";

export function EventCards({ cards }: { cards: EventCard[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  // Dynamic grid layout for 1-10 events
  let gridClass = "grid gap-6";
  let cardClassFn: (index: number) => string = () => "";

  if (cards.length === 1) {
    gridClass += " grid-cols-1 md:grid-cols-2";
    cardClassFn = () => "md:col-span-2 md:row-span-2";
  } else if (cards.length === 2) {
    gridClass += " grid-cols-1 md:grid-cols-2";
    cardClassFn = () => "md:col-span-1 md:row-span-2";
  } else if (cards.length === 3) {
    gridClass += " grid-cols-1 md:grid-cols-3 grid-rows-2";
    cardClassFn = (index: number) =>
      index === 0
        ? "md:col-span-2 md:row-span-2"
        : "md:col-span-1 md:row-span-1";
  } else if (cards.length === 4) {
    gridClass += " grid-cols-1 md:grid-cols-4 grid-rows-2";
    cardClassFn = (index: number) =>
      index === 0
        ? "md:col-span-2 md:row-span-2"
        : "md:col-span-1 md:row-span-1";
  } else if (cards.length === 5) {
    gridClass += " grid-cols-1 md:grid-cols-4 grid-rows-2";
    cardClassFn = (index: number) =>
      index === 0
        ? "md:col-span-2 md:row-span-2"
        : index === 4
        ? "md:col-span-2 md:row-span-1"
        : "md:col-span-1 md:row-span-1";
  } else if (cards.length === 6) {
    gridClass += " grid-cols-1 md:grid-cols-4 grid-rows-3";
    cardClassFn = (index: number) =>
      index === 0
        ? "md:col-span-2 md:row-span-2"
        : index === 5
        ? "md:col-span-4 md:row-span-1"
        : "md:col-span-1 md:row-span-1";
  } else {
    // 7-10 events: simple grid
    gridClass += " grid-cols-1 md:grid-cols-4";
    cardClassFn = () => "md:col-span-1 md:row-span-1";
  }

  return (
    <div className={gridClass}>
      {cards.map((card, index) => (
        <EventCard
          key={card.title + index}
          card={card}
          index={index}
          hovered={hovered}
          setHovered={setHovered}
          className={cardClassFn(index)}
        />
      ))}
    </div>
  );
}

const variants = {
  initial: {
    x: 0,
  },
  exit: {
    x: 0,
    y: 0,
  },
  top: {
    y: 20,
  },
  bottom: {
    y: -20,
  },
  left: {
    x: 20,
  },
  right: {
    x: -20,
  },
};

const textVariants = {
  initial: {
    y: 0,
    x: 0,
    opacity: 0,
  },
  exit: {
    y: 0,
    x: 0,
    opacity: 0,
  },
  top: {
    y: -20,
    opacity: 1,
  },
  bottom: {
    y: 2,
    opacity: 1,
  },
  left: {
    x: -2,
    opacity: 1,
  },
  right: {
    x: 20,
    opacity: 1,
  },
}; 