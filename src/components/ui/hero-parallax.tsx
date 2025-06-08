"use client";
import React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "motion/react";
import { FlipWords } from "@/components/ui/flip-words";
import { NavbarButton } from "@/components/ui/resizable-navbar";
import { cn } from "@/lib/utils";

export const HeroParallax = ({
  products,
}: {
  products: {
    title: string;
    link: string;
    thumbnail: string;
  }[];
}) => {
  const firstRow = products.slice(0, 5);
  const secondRow = products.slice(5, 10);
  const thirdRow = products.slice(10, 15);
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

  const translateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 1000]),
    springConfig
  );
  const translateXReverse = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -1000]),
    springConfig
  );
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [15, 0]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [0.2, 1]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [20, 0]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [-700, 500]),
    springConfig
  );

  // Allow interaction when rotation is nearly done (scrollYProgress > 0.18)
  const [canInteract, setCanInteract] = React.useState(false);
  React.useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      setCanInteract(v > 0.18);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  return (
    <div
      ref={ref}
      className="h-[300vh] py-40 overflow-hidden  antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d]"
    >
      <Header />
      <motion.div
        style={{
          rotateX,
          rotateZ,
          translateY,
          opacity,
        }}
        className=""
      >
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-5xl md:text-7xl font-bold font-mono tracking-tight mt-12 mb-4 text-black dark:text-white">Featured:</h2>
        </div>
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-20 mb-20">
          {firstRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.title}
              disabled={!canInteract}
            />
          ))}
        </motion.div>
        <motion.div className="flex flex-row  mb-20 space-x-20 ">
          {secondRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateXReverse}
              key={product.title}
              disabled={!canInteract}
            />
          ))}
        </motion.div>
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-20">
          {thirdRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.title}
              disabled={!canInteract}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export const Header = () => {
  const flipWords = ["SUTD", "Programmes", "Fifth Rows", "Pillars"];
  
  return (
    <div className="max-w-7xl relative mx-auto py-20 md:py-40 px-4 w-full left-0 top-0">
      <div className="mb-8 border-l-4 border-black dark:border-white pl-4">
        <h2 className="text-lg font-mono uppercase tracking-wider text-gray-600 dark:text-gray-400">
          Welcome to
        </h2>
      </div>
      <h1 className="text-5xl md:text-7xl font-bold mb-6 font-mono tracking-tight">
        <div className="flex items-baseline gap-3">
          <span>Discover</span>
          <div className="relative min-w-[300px]">
            <FlipWords 
              words={flipWords} 
              className="text-[#800000] dark:text-[#ffb3b3]"
            />
          </div>
        </div>
      </h1>
      <div className="border-t-2 border-black dark:border-white w-fit mb-6">
        <p className="text-lg font-mono mt-2">15/09/2025 - 10/10/2025</p>
      </div>
      <p className="max-w-2xl text-base md:text-xl mt-8 dark:text-neutral-200 font-mono">
        Explore the unique aspects of Singapore University of Technology and Design. 
        Discover our innovative programmes, vibrant Fifth Row activities, and the four pillars 
        that shape our educational approach.
      </p>
    </div>
  );
};

export const ProductCard = ({
  product,
  translate,
  disabled = false,
}: {
  product: {
    title: string;
    link: string;
    thumbnail: string;
  };
  translate: MotionValue<number>;
  disabled?: boolean;
}) => {
  return (
    <motion.div
      style={{
        x: translate,
      }}
      whileHover={disabled ? {} : { y: -20 }}
      key={product.title}
      className={cn(
        "group/product h-96 w-[30rem] relative shrink-0 transition-opacity duration-300",
        disabled && "pointer-events-none opacity-60 cursor-not-allowed"
      )}
    >
      <a
        href={disabled ? undefined : product.link}
        tabIndex={disabled ? -1 : 0}
        className="block group-hover/product:shadow-2xl "
        aria-disabled={disabled}
      >
        <img
          src={product.thumbnail}
          height="600"
          width="600"
          className="object-cover object-left-top absolute h-full w-full inset-0"
          alt={product.title}
        />
      </a>
      <div className="absolute inset-0 h-full w-full opacity-0 group-hover/product:opacity-80 bg-black pointer-events-none"></div>
      <h2 className="absolute bottom-4 left-4 opacity-0 group-hover/product:opacity-100 text-white">
        {product.title}
      </h2>
    </motion.div>
  );
}; 