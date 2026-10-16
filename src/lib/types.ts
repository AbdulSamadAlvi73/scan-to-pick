export interface PickingLine {
  id: number;
  lineNumber: number;
  productId: number;
  productSku: string;
  productName: string;
  productEan: string;
  assignedLocationId: number;
  assignedLocationCode: string;
  locationZone: string;
  requiredQty: number;
  pickedQty: number;
  isCompleted: boolean;
}

export interface AlternativeLocation {
  locationId: number;
  locationCode: string;
  zone: string;
  stockQuantity: number;
}

export interface BatchPickingState {
  batchId: number;
  batchNumber: string;
  batchStatus: "in_progress" | "completed";
  totalLines: number;
  completedLinesCount: number;
  currentLine: PickingLine | null;
  isBatchComplete: boolean;
}

export interface ScanResult {
  success: boolean;
  message: string;
  errorType?: "WRONG_EAN" | "ALREADY_COMPLETED" | "BATCH_COMPLETED" | "DB_ERROR" | "INVALID_INPUT";
  scannedEan?: string;
  updatedLine?: PickingLine;
  nextLine?: PickingLine | null;
  isBatchComplete?: boolean;
}
