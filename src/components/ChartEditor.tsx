import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Settings, Expand } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRangeContext } from "@/contexts/RangeContext";
import { StoredChart, ChartButton } from "./Chart"; // Import interfaces

interface ChartEditorProps {
  isMobileMode?: boolean;
  chart: StoredChart; // Now receives full chart object
  onBackToCharts: () => void;
  onSaveChart: (updatedChart: StoredChart) => void; // Changed to save full chart
}

export const ChartEditor = ({ isMobileMode = false, chart, onBackToCharts, onSaveChart }: ChartEditorProps) => {
  const { folders } = useRangeContext();
  const allRanges = folders.flatMap(folder => folder.ranges);

  const [chartName, setChartName] = useState(chart.name);
  const [buttons, setButtons] = useState<ChartButton[]>(chart.buttons); // Initialize buttons from chart prop
  const [canvasWidth, setCanvasWidth] = useState(chart.canvasWidth || 800); // Initialize from chart or default
  const [canvasHeight, setCanvasHeight] = useState(chart.canvasHeight || 500); // Initialize from chart or default
  const [isButtonModalOpen, setIsButtonModalOpen] = useState(false);
  const [editingButton, setEditingButton] = useState<ChartButton | null>(null);

  // Drag & Resize states
  const [activeButtonId, setActiveButtonId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Update chartName, buttons, and canvas dimensions if chart prop changes (e.g., if a different chart is selected)
  useEffect(() => {
    setChartName(chart.name);
    setButtons(chart.buttons);
    setCanvasWidth(chart.canvasWidth || 800);
    setCanvasHeight(chart.canvasHeight || 500);
  }, [chart]);

  const handleAddButton = () => {
    const newButton: ChartButton = {
      id: String(Date.now()),
      name: "Новая кнопка",
      color: "#60A5FA",
      linkedItem: allRanges.length > 0 ? allRanges[0].id : "label-only", // Default to label if no ranges
      x: 50,
      y: 50,
      width: 120, // Default width
      height: 40, // Default height
      type: allRanges.length > 0 ? 'normal' : 'label', // Default type
    };
    setButtons((prev) => [...prev, newButton]);
    setEditingButton(newButton);
    setIsButtonModalOpen(true);
  };

  const handleSettingsClick = (e: React.MouseEvent, button: ChartButton) => {
    e.stopPropagation(); // Prevent drag/resize from starting
    setEditingButton(button);
    setIsButtonModalOpen(true);
  };

  const handleSaveButtonProperties = () => {
    if (editingButton) {
      setButtons((prev) =>
        prev.map((btn) => (btn.id === editingButton.id ? editingButton : btn))
      );
      setIsButtonModalOpen(false);
      setEditingButton(null);
    }
  };

  const handleCancelButtonProperties = () => {
    if (editingButton && !buttons.some(b => b.id === editingButton.id)) {
      setButtons((prev) => prev.filter(b => b.id !== editingButton.id));
    }
    setIsButtonModalOpen(false);
    setEditingButton(null);
  };

  // --- Drag & Resize Logic ---

  const getResizeDirection = useCallback((e: React.MouseEvent | React.TouchEvent, button: ChartButton) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const coords = (e as React.TouchEvent).touches?.[0] || (e as React.MouseEvent);
    const x = coords.clientX - rect.left;
    const y = coords.clientY - rect.top;
    const tolerance = 8; // Pixels from edge to detect resize

    let direction = null;
    if (x < tolerance && y < tolerance) direction = 'nw';
    else if (x > rect.width - tolerance && y < tolerance) direction = 'ne';
    else if (x < tolerance && y > rect.height - tolerance) direction = 'sw';
    else if (x > rect.width - tolerance && y > rect.height - tolerance) direction = 'se';
    else if (x < tolerance) direction = 'w';
    else if (x > rect.width - tolerance) direction = 'e';
    else if (y < tolerance) direction = 'n';
    else if (y > rect.height - tolerance) direction = 's';
    return direction;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, button: ChartButton) => {
    // Only start drag/resize if not clicking the settings icon
    if ((e.target as HTMLElement).closest('.settings-icon')) {
      return;
    }

    e.stopPropagation(); // Prevent button click from opening modal immediately
    setActiveButtonId(button.id);

    const direction = getResizeDirection(e, button);
    if (direction) {
      setIsResizing(true);
      setResizeDirection(direction);
    } else {
      setIsDragging(true);
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); // Use currentTarget for the button itself
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [getResizeDirection]);

  const handleTouchStart = useCallback((e: React.TouchEvent, button: ChartButton) => {
    if ((e.target as HTMLElement).closest('.settings-icon')) {
      return;
    }
    e.stopPropagation();
    setActiveButtonId(button.id);

    const direction = getResizeDirection(e, button);
    if (direction) {
      setIsResizing(true);
      setResizeDirection(direction);
    } else {
      setIsDragging(true);
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const touch = e.touches[0];
    setDragOffset({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    });
  }, [getResizeDirection]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!activeButtonId || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const currentButton = buttons.find(b => b.id === activeButtonId);
    if (!currentButton) return;

    if (isDragging) {
      let newX = e.clientX - dragOffset.x - canvasRect.left;
      let newY = e.clientY - dragOffset.y - canvasRect.top;

      // Boundary checks for dragging
      newX = Math.max(0, Math.min(newX, canvasRect.width - currentButton.width));
      newY = Math.max(0, Math.min(newY, canvasRect.height - currentButton.height));

      setButtons((prev) =>
        prev.map((btn) =>
          btn.id === activeButtonId ? { ...btn, x: newX, y: newY } : btn
        )
      );
    } else if (isResizing && resizeDirection) {
      let newWidth = currentButton.width;
      let newHeight = currentButton.height;
      let newX = currentButton.x;
      let newY = currentButton.y;

      const minSize = 50; // Minimum button size

      switch (resizeDirection) {
        case 'e':
          newWidth = Math.max(minSize, e.clientX - (currentButton.x + canvasRect.left));
          break;
        case 's':
          newHeight = Math.max(minSize, e.clientY - (currentButton.y + canvasRect.top));
          break;
        case 'w':
          const diffX = e.clientX - (currentButton.x + canvasRect.left);
          newWidth = Math.max(minSize, currentButton.width - diffX);
          newX = currentButton.x + diffX;
          break;
        case 'n':
          const diffY = e.clientY - (currentButton.y + canvasRect.top);
          newHeight = Math.max(minSize, currentButton.height - diffY);
          newY = currentButton.y + diffY;
          break;
        case 'se':
          newWidth = Math.max(minSize, e.clientX - (currentButton.x + canvasRect.left));
          newHeight = Math.max(minSize, e.clientY - (currentButton.y + canvasRect.top));
          break;
        case 'sw':
          const diffX_sw = e.clientX - (currentButton.x + canvasRect.left);
          newWidth = Math.max(minSize, currentButton.width - diffX_sw);
          newX = currentButton.x + diffX_sw;
          newHeight = Math.max(minSize, e.clientY - (currentButton.y + canvasRect.top));
          break;
        case 'ne':
          newWidth = Math.max(minSize, e.clientX - (currentButton.x + canvasRect.left));
          const diffY_ne = e.clientY - (currentButton.y + canvasRect.top);
          newHeight = Math.max(minSize, currentButton.height - diffY_ne);
          newY = currentButton.y + diffY_ne;
          break;
        case 'nw':
          const diffX_nw = e.clientX - (currentButton.x + canvasRect.left);
          newWidth = Math.max(minSize, currentButton.width - diffX_nw);
          newX = currentButton.x + diffX_nw;
          const diffY_nw = e.clientY - (currentButton.y + canvasRect.top);
          newHeight = Math.max(minSize, currentButton.height - diffY_nw);
          newY = currentButton.y + diffY_nw;
          break;
      }

      // Ensure button stays within canvas boundaries after resize
      newX = Math.max(0, Math.min(newX, canvasRect.width - newWidth));
      newY = Math.max(0, Math.min(newY, canvasRect.height - newHeight));
      newWidth = Math.min(newWidth, canvasRect.width - newX);
      newHeight = Math.min(newHeight, canvasRect.height - newY);


      setButtons((prev) =>
        prev.map((btn) =>
          btn.id === activeButtonId ? { ...btn, x: newX, y: newY, width: newWidth, height: newHeight } : btn
        )
      );
    }
  }, [activeButtonId, isDragging, isResizing, dragOffset, resizeDirection, buttons]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!activeButtonId || !canvasRef.current) return;
    e.preventDefault(); // Prevent scrolling on mobile

    const touch = e.touches[0];
    if (!touch) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const currentButton = buttons.find(b => b.id === activeButtonId);
    if (!currentButton) return;

    if (isDragging) {
      let newX = touch.clientX - dragOffset.x - canvasRect.left;
      let newY = touch.clientY - dragOffset.y - canvasRect.top;

      // Boundary checks for dragging
      newX = Math.max(0, Math.min(newX, canvasRect.width - currentButton.width));
      newY = Math.max(0, Math.min(newY, canvasRect.height - currentButton.height));

      setButtons((prev) =>
        prev.map((btn) =>
          btn.id === activeButtonId ? { ...btn, x: newX, y: newY } : btn
        )
      );
    } else if (isResizing && resizeDirection) {
      let newWidth = currentButton.width;
      let newHeight = currentButton.height;
      let newX = currentButton.x;
      let newY = currentButton.y;

      const minSize = 50; // Minimum button size

      switch (resizeDirection) {
        case 'e':
          newWidth = Math.max(minSize, touch.clientX - (currentButton.x + canvasRect.left));
          break;
        case 's':
          newHeight = Math.max(minSize, touch.clientY - (currentButton.y + canvasRect.top));
          break;
        case 'w':
          const diffX = touch.clientX - (currentButton.x + canvasRect.left);
          newWidth = Math.max(minSize, currentButton.width - diffX);
          newX = currentButton.x + diffX;
          break;
        case 'n':
          const diffY = touch.clientY - (currentButton.y + canvasRect.top);
          newHeight = Math.max(minSize, currentButton.height - diffY);
          newY = currentButton.y + diffY;
          break;
        case 'se':
          newWidth = Math.max(minSize, touch.clientX - (currentButton.x + canvasRect.left));
          newHeight = Math.max(minSize, touch.clientY - (currentButton.y + canvasRect.top));
          break;
        case 'sw':
          const diffX_sw = touch.clientX - (currentButton.x + canvasRect.left);
          newWidth = Math.max(minSize, currentButton.width - diffX_sw);
          newX = currentButton.x + diffX_sw;
          newHeight = Math.max(minSize, touch.clientY - (currentButton.y + canvasRect.top));
          break;
        case 'ne':
          newWidth = Math.max(minSize, touch.clientX - (currentButton.x + canvasRect.left));
          const diffY_ne = touch.clientY - (currentButton.y + canvasRect.top);
          newHeight = Math.max(minSize, currentButton.height - diffY_ne);
          newY = currentButton.y + diffY_ne;
          break;
        case 'nw':
          const diffX_nw = touch.clientX - (currentButton.x + canvasRect.left);
          newWidth = Math.max(minSize, currentButton.width - diffX_nw);
          newX = currentButton.x + diffX_nw;
          const diffY_nw = touch.clientY - (currentButton.y + canvasRect.top);
          newHeight = Math.max(minSize, currentButton.height - diffY_nw);
          newY = currentButton.y + diffY_nw;
          break;
      }

      // Ensure button stays within canvas boundaries after resize
      newX = Math.max(0, Math.min(newX, canvasRect.width - newWidth));
      newY = Math.max(0, Math.min(newY, canvasRect.height - newHeight));
      newWidth = Math.min(newWidth, canvasRect.width - newX);
      newHeight = Math.min(newHeight, canvasRect.height - newY);


      setButtons((prev) =>
        prev.map((btn) =>
          btn.id === activeButtonId ? { ...btn, x: newX, y: newY, width: newWidth, height: newHeight } : btn
        )
      );
    }
  }, [activeButtonId, isDragging, isResizing, dragOffset, resizeDirection, buttons]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setActiveButtonId(null);
    setResizeDirection(null);
  }, []);

  const handleButtonMouseMove = useCallback((e: React.MouseEvent, button: ChartButton) => {
    if (isDragging || isResizing) return; // Don't change cursor if already dragging/resizing

    const direction = getResizeDirection(e, button);
    if (direction) {
      (e.currentTarget as HTMLElement).style.cursor = `${direction}-resize`;
    } else {
      (e.currentTarget as HTMLElement).style.cursor = 'grab';
    }
  }, [isDragging, isResizing, getResizeDirection]);

  const handleButtonMouseLeave = useCallback((e: React.MouseEvent) => {
    if (isDragging || isResizing) return;
    (e.currentTarget as HTMLElement).style.cursor = 'default';
  }, [isDragging, isResizing]);


  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp, handleTouchMove]);

  // --- End Drag & Resize Logic ---

  const handleBackButtonClick = () => {
    const updatedChart: StoredChart = {
      ...chart,
      name: chartName,
      buttons: buttons,
      canvasWidth: canvasWidth,
      canvasHeight: canvasHeight,
    };
    onSaveChart(updatedChart); // Save all chart properties before navigating back
    onBackToCharts();
  };

  const handleDimensionChange = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => {
    // This allows the input to be cleared, resulting in NaN state, which is handled by the value prop
    setter(parseInt(value, 10));
  };

  const handleDimensionBlur = (
    currentValue: number,
    setter: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const minSize = 100;
    if (isNaN(currentValue) || currentValue < minSize) {
      setter(minSize);
    }
  };

  const handleLinkedItemChange = (value: string) => {
    setEditingButton(prev => {
      if (!prev) return null;
      if (value === 'label-only') {
        return { ...prev, linkedItem: 'label-only', type: 'label' };
      }
      return { ...prev, linkedItem: value, type: 'normal' };
    });
  };

  const handleMaximizeCanvas = () => {
    if (!canvasRef.current) return;

    const parentElement = canvasRef.current.parentElement;
    if (!parentElement) return;

    // Width is the full client width of the container holding the canvas
    const newWidth = parentElement.clientWidth;

    // Height is the window height minus the space above the canvas and some padding at the bottom
    const canvasTopOffset = canvasRef.current.getBoundingClientRect().top;
    const bottomPadding = 24; // Corresponds to p-6 from the main container
    const newHeight = window.innerHeight - canvasTopOffset - bottomPadding;

    setCanvasWidth(Math.floor(newWidth));
    // Ensure a minimum height
    setCanvasHeight(Math.floor(newHeight > 100 ? newHeight : 100));
  };

  const Controls = (
    <div className={cn(
      "flex items-center gap-4",
      isMobileMode ? "flex-wrap gap-y-2 p-4 border-t bg-muted" : "mb-6"
    )}>
      <Button onClick={handleAddButton} className="flex items-center gap-2 h-7">
        <Plus className="h-4 w-4" />
        Добавить кнопку
      </Button>
      
      {/* Group for dimension controls that will wrap on mobile */}
      <div className="flex items-center gap-4">
        <Label htmlFor="canvasWidth" className="text-right">
          Ширина
        </Label>
        <Input
          id="canvasWidth"
          type="number"
          value={isNaN(canvasWidth) ? '' : canvasWidth}
          onChange={(e) => handleDimensionChange(e.target.value, setCanvasWidth)}
          onBlur={() => handleDimensionBlur(canvasWidth, setCanvasWidth)}
          className="w-20 h-7"
          min="100"
          maxLength={4}
        />
        <Label htmlFor="canvasHeight" className="text-right">
          Высота
        </Label>
        <Input
          id="canvasHeight"
          type="number"
          value={isNaN(canvasHeight) ? '' : canvasHeight}
          onChange={(e) => handleDimensionChange(e.target.value, setCanvasHeight)}
          onBlur={() => handleDimensionBlur(canvasHeight, setCanvasHeight)}
          className="w-20 h-7"
          min="100"
          maxLength={4}
        />
        <Button variant="ghost" size="icon" onClick={handleMaximizeCanvas} title="Развернуть на весь экран">
          <Expand className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  const Canvas = (
    <div
      ref={canvasRef}
      className="relative border-2 border-dashed border-muted-foreground rounded-lg bg-card flex items-center justify-center overflow-hidden"
      style={{ width: canvasWidth, height: canvasHeight }} // Apply dynamic width and height
    >
      {buttons.length === 0 && (
        <p className="text-muted-foreground">Рабочая область (холст)</p>
      )}
      {buttons.map((button) => (
        <div
          key={button.id}
          style={{
            backgroundColor: button.color,
            position: 'absolute',
            left: button.x,
            top: button.y,
            width: button.width, // Apply width
            height: button.height, // Apply height
            zIndex: activeButtonId === button.id ? 100 : 1, // Bring active button to front
          }}
          className="relative flex items-center justify-center rounded-md shadow-md text-white font-semibold group" // Added group for hover effects
          onMouseDown={(e) => handleMouseDown(e, button)}
          onTouchStart={(e) => handleTouchStart(e, button)}
          onMouseMove={(e) => handleButtonMouseMove(e, button)}
          onMouseLeave={handleButtonMouseLeave}
        >
          {button.name}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity settings-icon" // Added settings-icon class
            onClick={(e) => handleSettingsClick(e, button)}
            title="Настройки кнопки"
          >
            <Settings className="h-4 w-4 text-white" />
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn(
      "p-6",
      isMobileMode ? "flex-1 overflow-y-auto" : "min-h-screen"
    )}>
      <div className={cn(
        "mx-auto", // Removed max-w-4xl to allow canvas to expand
        isMobileMode ? "w-full" : ""
      )}>
        <div className="flex justify-between items-center mb-2"> {/* Reduced margin-bottom */}
          {/* Left side: Back button, Chart Name */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBackButtonClick} title="Назад к чартам">
              <ArrowLeft className="h-6 w-6 text-foreground" />
            </Button>
            <h1 className="text-3xl font-bold text-foreground">{chartName}</h1>
          </div>
        </div>

        {isMobileMode ? (
          <>
            {Canvas}
            {Controls}
          </>
        ) : (
          <>
            {Controls}
            {Canvas}
          </>
        )}

        <Dialog open={isButtonModalOpen} onOpenChange={setIsButtonModalOpen}>
          <DialogContent mobileFullscreen={isMobileMode}>
            <DialogHeader>
              <DialogTitle>Настройка кнопки</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="buttonName" className="text-right">
                  Название
                </Label>
                <Input
                  id="buttonName"
                  value={editingButton?.name || ""}
                  onChange={(e) => setEditingButton(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="buttonColor" className="text-right">
                  Цвет
                </Label>
                <Input
                  id="buttonColor"
                  type="color"
                  value={editingButton?.color || "#000000"}
                  onChange={(e) => setEditingButton(prev => prev ? { ...prev, color: e.target.value } : null)}
                  className="col-span-3 h-10"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="linkedItem" className="text-right">
                  Привязать
                </Label>
                <Select
                  value={editingButton?.type === 'label' ? 'label-only' : editingButton?.linkedItem || ""}
                  onValueChange={handleLinkedItemChange}
                  disabled={editingButton?.type === 'exit'}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={
                      editingButton?.type === 'exit' 
                        ? "Выход из режима просмотра чарта" 
                        : editingButton?.type === 'label'
                        ? "Только текстовое обозначение"
                        : "Выберите чарт/диапазон"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {editingButton?.type === 'exit' ? (
                      <SelectItem value="exit-chart-placeholder" disabled>Выход из режима просмотра чарта</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="label-only">Только текстовое обозначение</SelectItem>
                        {allRanges.map(range => (
                          <SelectItem key={range.id} value={range.id}>
                            {range.name}
                          </SelectItem>
                        ))}
                        {allRanges.length === 0 && (
                          <SelectItem value="no-ranges-available-placeholder" disabled>Нет доступных диапазонов</SelectItem>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {/* Add width and height inputs for manual adjustment if needed, or just rely on drag/resize */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="buttonWidth" className="text-right">
                  Ширина
                </Label>
                <Input
                  id="buttonWidth"
                  type="number"
                  value={editingButton?.width || 0}
                  onChange={(e) => setEditingButton(prev => prev ? { ...prev, width: parseInt(e.target.value) || 0 } : null)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="buttonHeight" className="text-right">
                  Высота
                </Label>
                <Input
                  id="buttonHeight"
                  type="number"
                  value={editingButton?.height || 0}
                  onChange={(e) => setEditingButton(prev => prev ? { ...prev, height: parseInt(e.target.value) || 0 } : null)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelButtonProperties}>Отмена</Button>
              <Button onClick={handleSaveButtonProperties}>Сохранить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
