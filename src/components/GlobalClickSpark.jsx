import { useRef, useEffect } from "react";

const GlobalClickSpark = ({
  sparkCount = 10,
  sparkSize = 10,
  sparkRadius = 20,
  duration = 600,
}) => {
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (timestamp) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed > duration) return false;

        const progress = elapsed / duration;
        const eased = 1 - Math.pow(1 - progress, 3);
        const distance = eased * sparkRadius;
        const lineLength = sparkSize * (1 - progress);
        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.strokeStyle = spark.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        return true;
      });
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);

    const handleClick = (e) => {
      const now = performance.now();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newSparks = Array.from({ length: sparkCount }, (_, i) => ({
        x,
        y,
        angle: (2 * Math.PI * i) / sparkCount,
        startTime: now,
        color: `hsl(${Math.random() * 360}, 100%, 70%)`,
      }));
      sparksRef.current.push(...newSparks);
    };

    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("click", handleClick);
    };
  }, [sparkCount, sparkSize, sparkRadius, duration]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    />
  );
};

export default GlobalClickSpark;
