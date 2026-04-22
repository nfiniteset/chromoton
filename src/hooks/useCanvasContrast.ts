import { useState, useEffect, useRef, type RefObject } from 'react';
import chroma from 'chroma-js';
import type { Color } from '../models/colorModel';

interface ContrastColors {
  textColor: string;
  textColorAlpha: string;
  textColorFaded: string;
  textColorHeader: string;
  borderColor: string;
  borderColorHover: string;
  sliderThumb: string;
}

/**
 * Hook to sample the canvas behind the control panel and calculate
 * appropriate UI colors for sufficient contrast
 */
export function useCanvasContrast(panelRef: RefObject<HTMLElement>): ContrastColors {
  const [colors, setColors] = useState<ContrastColors>(getDefaultColors());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!panelRef?.current) {
      return;
    }

    // Update contrast every 100ms
    intervalRef.current = setInterval(() => {
      updateContrast(panelRef.current, setColors);
    }, 100);

    // Initial update
    updateContrast(panelRef.current, setColors);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [panelRef]);

  return colors;
}

function getDefaultColors(): ContrastColors {
  return {
    textColor: '#ffffff',
    textColorAlpha: 'rgba(255, 255, 255, 0.75)',
    textColorFaded: 'rgba(255, 255, 255, 0.45)',
    textColorHeader: 'rgba(255, 255, 255, 0.35)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderColorHover: 'rgba(255, 255, 255, 0.4)',
    sliderThumb: '#eee'
  };
}

function updateContrast(
  panel: HTMLElement,
  setColors: (colors: ContrastColors) => void
): void {
  if (!panel) {
    return;
  }

  const rawColor = sampleCanvasColorBehindPanel(panel);
  if (!rawColor) {
    return;
  }

  const calculatedColors = calculateContrastColors(rawColor);
  setColors(calculatedColors);
}

function sampleCanvasColorBehindPanel(panel: HTMLElement): Color | null {
  const canvas = document.querySelector<HTMLCanvasElement>('.chromotons');
  if (!canvas) {
    return null;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }
  const canvasRect = canvas.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();

  // Calculate scale factor between display size and actual canvas size
  const scaleX = canvas.width / canvasRect.width;
  const scaleY = canvas.height / canvasRect.height;

  // Calculate sample area in canvas coordinates
  let sampleX = (panelRect.left - canvasRect.left) * scaleX;
  let sampleY = (panelRect.top - canvasRect.top) * scaleY;
  let sampleWidth = panelRect.width * scaleX;
  let sampleHeight = panelRect.height * scaleY;

  // Clamp to canvas bounds
  sampleX = Math.max(0, Math.min(sampleX, canvas.width - 1));
  sampleY = Math.max(0, Math.min(sampleY, canvas.height - 1));
  sampleWidth = Math.min(sampleWidth, canvas.width - sampleX);
  sampleHeight = Math.min(sampleHeight, canvas.height - sampleY);

  // Sample 30 points horizontally across the middle of the panel area
  const samplePoints = 30;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let validSamples = 0;

  for (let i = 0; i < samplePoints; i++) {
    const x = Math.floor(sampleX + (sampleWidth / samplePoints) * i + sampleWidth / (samplePoints * 2));
    const y = Math.floor(sampleY + sampleHeight / 2);

    try {
      const imageData = ctx.getImageData(x, y, 1, 1);
      const data = imageData.data;
      totalR += data[0];
      totalG += data[1];
      totalB += data[2];
      validSamples++;
    } catch (e) {
      // Security error or out of bounds - skip this sample
      continue;
    }
  }

  if (validSamples === 0) {
    return null;
  }

  return {
    r: Math.round(totalR / validSamples),
    g: Math.round(totalG / validSamples),
    b: Math.round(totalB / validSamples)
  };
}

function calculateContrastColors(rawColor: Color): ContrastColors {
  // Apply blur effect (simulated by slight desaturation)
  let color = chroma(rawColor.r, rawColor.g, rawColor.b);

  // Saturate the color (180%)
  const hsl = color.hsl();
  if (!isNaN(hsl[1])) {
    const newSaturation = Math.min(1, hsl[1] * 1.8);
    color = chroma.hsl(hsl[0], newSaturation, hsl[2]);
  }

  const rgb = color.rgb();

  // Blend with white overlay: rgba(255, 255, 255, 0.08)
  const overlayAlpha = 0.08;
  const bgColor = {
    r: Math.round(rgb[0] * (1 - overlayAlpha) + 255 * overlayAlpha),
    g: Math.round(rgb[1] * (1 - overlayAlpha) + 255 * overlayAlpha),
    b: Math.round(rgb[2] * (1 - overlayAlpha) + 255 * overlayAlpha)
  };

  // Calculate contrast with white vs black
  const bgChroma = chroma(bgColor.r, bgColor.g, bgColor.b);
  const contrastWithWhite = chroma.contrast(bgChroma, 'white');
  const contrastWithBlack = chroma.contrast(bgChroma, 'black');

  // Choose the color scheme with better contrast
  const useWhite = contrastWithWhite > contrastWithBlack;

  return {
    textColor: useWhite ? '#ffffff' : '#000000',
    textColorAlpha: useWhite ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.75)',
    textColorFaded: useWhite ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)',
    textColorHeader: useWhite ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)',
    borderColor: useWhite ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
    borderColorHover: useWhite ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
    sliderThumb: useWhite ? '#eee' : '#222'
  };
}
