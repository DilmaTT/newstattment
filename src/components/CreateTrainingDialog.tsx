import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useRangeContext } from "@/contexts/RangeContext";

interface CreateTrainingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTraining: (training: any) => void;
}

export const CreateTrainingDialog = ({ open, onOpenChange, onCreateTraining }: CreateTrainingDialogProps) => {
  const [name, setName] = useState("");
  const [trainingType, setTrainingType] = useState<"classic" | "border-repeat">("classic");
  const [classicSubtype, setClassicSubtype] = useState<"all-hands" | "border-check">("all-hands");
  const [selectedRanges, setSelectedRanges] = useState<string[]>([]);
  
  const { folders } = useRangeContext();

  const hasRanges = folders.some(folder => folder.ranges.length > 0);

  const handleRangeToggle = (rangeId: string) => {
    setSelectedRanges(prev => 
      prev.includes(rangeId) 
        ? prev.filter(id => id !== rangeId)
        : [...prev, rangeId]
    );
  };

  const handleCreate = () => {
    if (!name.trim() || selectedRanges.length === 0 || !hasRanges) return;

    const training = {
      id: Date.now().toString(),
      name: name.trim(),
      type: trainingType,
      subtype: trainingType === 'classic' ? classicSubtype : undefined,
      ranges: selectedRanges,
      createdAt: new Date(),
      stats: null
    };

    onCreateTraining(training);
    
    // Reset form
    setName("");
    setTrainingType("classic");
    setClassicSubtype("all-hands");
    setSelectedRanges([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать тренировку</DialogTitle>
          <DialogDescription>
            Настройте параметры новой тренировки
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Название тренировки */}
          <div className="space-y-2">
            <Label htmlFor="training-name">Название тренировки</Label>
            <Input
              id="training-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название тренировки"
            />
          </div>

          {/* Вид тренировки */}
          <div className="space-y-3">
            <Label>Вид тренировки</Label>
            <RadioGroup value={trainingType} onValueChange={(value: any) => setTrainingType(value)}>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="classic" id="classic" />
                  <Label htmlFor="classic" className="font-medium">Классическая</Label>
                </div>
                
                {trainingType === "classic" && (
                  <div className="ml-6 space-y-2">
                    <RadioGroup value={classicSubtype} onValueChange={(value: any) => setClassicSubtype(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all-hands" id="all-hands" />
                        <Label htmlFor="all-hands">Все руки</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="border-check" id="border-check" />
                        <Label htmlFor="border-check">Проверка границ</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="border-repeat" id="border-repeat" />
                  <Label htmlFor="border-repeat" className="font-medium">Повторение границ</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Выбор ренжей */}
          <div className="space-y-3">
            <Label>Выберите ренжи для тренировки</Label>
            {!hasRanges ? (
              <Card className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Создайте хотя бы 1 ренж чтобы создать тренировку
                </p>
              </Card>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {folders.map((folder) => (
                  folder.ranges.length > 0 && (
                    <Card key={folder.id} className="p-3">
                      <h4 className="font-medium mb-2">{folder.name}</h4>
                      <div className="space-y-2 ml-4">
                        {folder.ranges.map((range) => (
                          <div key={range.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={range.id}
                              checked={selectedRanges.includes(range.id)}
                              onCheckedChange={() => handleRangeToggle(range.id)}
                            />
                            <Label htmlFor={range.id} className="text-sm">
                              {range.name}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                ))}
              </div>
            )}
          </div>

          {/* Кнопки */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!name.trim() || selectedRanges.length === 0 || !hasRanges}
              variant="poker"
            >
              Создать тренировку
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
