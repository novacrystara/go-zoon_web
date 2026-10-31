import { useEffect, useRef, useState, useCallback } from "react";

export function useNumberCounter(text: string, duration: number = 1500) {
  const [currentText, setCurrentText] = useState("0%");
  const elementRef = useRef<HTMLElement | null>(null);

  const animateValue = useCallback(
    (targetText: string) => {
      const stepTime = 30;
      const steps = duration / stepTime;
      let currentStep = 0;

      if (targetText.includes("-")) {
        const parts = targetText.replace("%", "").split("-");
        const end1 = parseInt(parts[0], 10);
        const end2 = parseInt(parts[1], 10);

        const timer = setInterval(() => {
          currentStep++;
          const val1 = Math.round((end1 / steps) * currentStep);
          const val2 = Math.round((end2 / steps) * currentStep);
          setCurrentText(`${val1}-${val2}%`);

          if (currentStep >= steps) {
            setCurrentText(targetText);
            clearInterval(timer);
          }
        }, stepTime);
      } else {
        const end = parseInt(targetText.replace("%", ""), 10);

        const timer = setInterval(() => {
          currentStep++;
          const val = Math.round((end / steps) * currentStep);
          setCurrentText(`${val}%`);

          if (currentStep >= steps) {
            setCurrentText(targetText);
            clearInterval(timer);
          }
        }, stepTime);
      }
    },
    [duration]
  );

  useEffect(() => {
    const target = elementRef.current;
    if (!target) return;

    const revealOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const match = text.match(/(\d+)(-\d+)?%/);
          if (match) {
            animateValue(match[0]);
          }
          observer.unobserve(target);
        }
      });
    }, revealOptions);

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [text, animateValue]);

  return { currentText, elementRef };
}
