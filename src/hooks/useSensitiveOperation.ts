import { useState, useCallback, createElement } from "react";
import { useAdmin2FA } from "./useAdmin2FA";

interface UseSensitiveOperationOptions {
  operationName?: string;
  description?: string;
}

interface SensitiveOperationResult {
  executeSensitiveOperation: (operation: () => Promise<void>) => Promise<void>;
  showVerifyDialog: boolean;
  setShowVerifyDialog: (show: boolean) => void;
  handleVerify: (code: string) => Promise<boolean>;
  is2FAEnabled: boolean;
  sessionValid: boolean;
  loading: boolean;
  operationName: string;
  operationDescription: string;
}

export function useSensitiveOperation(options: UseSensitiveOperationOptions = {}): SensitiveOperationResult {
  const { status, verify, loading, refreshStatus } = useAdmin2FA();
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<(() => Promise<void>) | null>(null);

  const executeSensitiveOperation = useCallback(async (operation: () => Promise<void>) => {
    // If 2FA not enabled, just execute
    if (!status?.is_enabled) {
      await operation();
      return;
    }

    // If session is valid (verified within last 15 minutes), execute
    if (status.session_valid) {
      await operation();
      return;
    }

    // Otherwise, require verification
    setPendingOperation(() => operation);
    setShowVerifyDialog(true);
  }, [status]);

  const handleVerify = async (code: string): Promise<boolean> => {
    const success = await verify(code);
    if (success && pendingOperation) {
      try {
        await pendingOperation();
      } catch (error) {
        console.error("Operation failed:", error);
      }
      setPendingOperation(null);
    }
    return success;
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setPendingOperation(null);
    }
    setShowVerifyDialog(open);
  };

  return {
    executeSensitiveOperation,
    showVerifyDialog,
    setShowVerifyDialog: handleDialogClose,
    handleVerify,
    is2FAEnabled: status?.is_enabled ?? false,
    sessionValid: status?.session_valid ?? true,
    loading,
    operationName: options.operationName || "Vérification 2FA requise",
    operationDescription: options.description || "Cette action nécessite une vérification de sécurité"
  };
}
