import { useState, useEffect } from 'react';

export default function useCountUp(endValue, duration = 2000, delay = 0) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        let startTime = null;
        let animationFrameId = null;
        let timeoutId = null;

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / duration, 1);
            
            // easeOutQuart easing function for a smooth slow-down at the end
            const easeOut = 1 - Math.pow(1 - percentage, 4);
            
            setValue(endValue * easeOut);

            if (percentage < 1) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                setValue(endValue);
            }
        };

        timeoutId = setTimeout(() => {
            animationFrameId = requestAnimationFrame(animate);
        }, delay);

        return () => {
            clearTimeout(timeoutId);
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [endValue, duration, delay]);

    return value;
}
