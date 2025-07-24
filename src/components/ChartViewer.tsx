import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StoredChart, ChartButton } from "./Chart"; // Import interfaces
import { Range } from "@/contexts/RangeContext"; // Import Range interface
import { PokerMatrix } from "@/components/PokerMatrix"; // Import PokerMatrix
import { useRangeContext } from "@/contexts/RangeContext"; // Import useRangeContext

interface ChartViewerProps {
  isMobileMode?: boolean;
  chart: StoredChart;
  allRanges: Range[]; // Pass allRanges to resolve linked item names
  onBackToCharts: () => void;
}

export const ChartViewer = ({ isMobileMode = false, chart, allRanges, onBackToCharts }: ChartViewerProps) => {
  const { actionButtons } = useRangeContext(); // Get actionButtons from context
  const [displayedRange, setDisplayedRange] = useState<Range | null>(null); // State to hold the range to display
  const [showMatrixView, setShowMatrixView] = useState(false); // State to control showing matrix vs buttons
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (isMobileMode) {
      const handleResize = () => {
        setViewportSize({ width: window.innerWidth, height: window.innerHeight });
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMobileMode]);

  const handleButtonClick = (button: ChartButton) => {
    if (button.type === 'exit') {
      onBackToCharts(); // Navigate back to main chart list
      return;
    }

    if (button.type === 'label') {
      return; // Do nothing for label buttons
    }

    const linkedRange = allRanges.find(range => range.id === button.linkedItem);
    if (linkedRange) {
      setDisplayedRange(linkedRange);
      setShowMatrixView(true); // Switch to matrix view
    } else {
      setDisplayedRange(null); // Clear displayed range if not found
      alert("Привязанный диапазон не найден.");
    }
  };

  const handleBackToButtons = () => {
    setDisplayedRange(null);
    setShowMatrixView(false); // Switch back to buttons view
  };

  const scale = (isMobileMode && viewportSize.width > 0 && chart.canvasWidth > 0)
    ? Math.min(
        (viewportSize.width * 0.95) / chart.canvasWidth, // Use 95% of viewport to leave some margin
        (viewportSize.height * 0.95) / chart.canvasHeight
      )
    : 1;

  return (
    <div className={cn(
      "p-6",
      isMobileMode
        ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-2"
        : "min-h-screen"
    )}>
      <div className={cn(
        "max-w-4xl mx-auto",
        isMobileMode ? "w-full h-full flex flex-col items-center justify-center" : "w-full"
      )}>

        <div
          className="relative border-2 border-solid border-muted-foreground rounded-lg bg-card flex items-center justify-center overflow-hidden"
          style={isMobileMode ? {
            width: chart.canvasWidth,
            height: chart.canvasHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          } : {
            width: '100%',
            height: '500px',
          }}
        >
          {!showMatrixView ? (
            <>
              {chart.buttons.map((button) => (
                <Button
                  key={button.id}
                  style={{
                    backgroundColor: button.color,
                    position: 'absolute',
                    left: button.x,
                    top: button.y,
                    width: button.width,
                    height: button.height,
                  }}
                  className={cn(
                    "flex items-center justify-center rounded-md shadow-md text-white font-semibold z-20",
                    button.type !== 'label' && "cursor-pointer hover:opacity-90 transition-opacity"
                  )}
                  onClick={() => handleButtonClick(button)}
                >
                  {button.name}
                </Button>
              ))}
              {chart.buttons.length === 0 && (
                <p className="text-muted-foreground z-10">В этом чарте нет кнопок.</p>
              )}
            </>
          ) : (
            displayedRange ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <PokerMatrix
                  selectedHands={displayedRange.hands}
                  onHandSelect={() => {}}
                  activeAction=""
                  actionButtons={actionButtons}
                  readOnly={true}
                  isBackgroundMode={true}
                />
              </div>
            ) : (
              <p className="text-muted-foreground z-10">Диапазон не найден.</p>
            )
          )}
        </div>

        {showMatrixView && (
          <div className={cn(
            "flex justify-center mt-6",
            isMobileMode && "absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
          )}>
            <Button onClick={handleBackToButtons} variant="outline" className="px-8 py-2">
              Назад
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
